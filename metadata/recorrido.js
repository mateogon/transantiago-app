const express = require('express');
const router = express.Router();
const axios = require('axios');
const {pool} = require('../database');
require('dotenv').config();

const recorrido = "https://www.red.cl/restservice_v2/rest/conocerecorrido?codsint=";

router.get('/recorrido/:id', async (req, res) => {
    const {id} = req.params;
    const paso = recorrido + id;

    try{
        const data = await obtenerDatosYProcesar(paso);

        if(data){
            //console.log(data);
            res.status(200).json(data);
            const puntos = data.features.filter(f => f.geometry.type === 'Point');
            //res.render('rutas', { puntos , geoJson: JSON.stringify(data), latitud: puntos[0].geometry.coordinates[1], longitud: puntos[0].geometry.coordinates[0]  });
        } else {
            res.status(404).json( { message: 'Datos no encontrados'} );
        }
    }
    catch(error){
        res.status(500).json({ message: 'Error en la importación de datos.', error});
    }
    finally{

    }
});

// Procesar Recorridos
async function obtenerDatosYProcesar(url) {
  try {
      // Hacer la solicitud para obtener el JSON
      const response = await axios.get(url);
      console.log(url)
      console.log(response);
      const data = response.data;
      console.log(data);
      // Extraemos el path y los códigos de paraderos
      const path = data.ida.path;
      const paraderosCodigos = data.ida.paraderos.map(p => p.cod);

      // Obtener los paraderos desde la base de datos
      const client = await pool.connect();
      const paraderos = [];

      for (const codigoParadero of paraderosCodigos) {
          const resParadero = await client.query(
              'SELECT paradero, ST_X(geom) AS longitud, ST_Y(geom) AS latitud FROM paraderos WHERE paradero = $1',
              [codigoParadero]
          );
          if (resParadero.rows.length > 0) {
              const paradero = resParadero.rows[0];
              paraderos.push({
                  cod: paradero.paradero,
                  pos: [paradero.latitud, paradero.longitud]
              });
          } else {
              console.warn(`Paradero ${codigoParadero} no encontrado en la base de datos.`);
          }
      }

      client.release();

      // Ahora paraderos es un array con la información necesaria

      // Función para encontrar el índice más cercano en el path
      function encontrarIndiceMasCercano(coordenadas, path) {
          let indiceMasCercano = 0;
          let distanciaMinima = Infinity;
          for (let i = 0; i < path.length; i++) {
              const [lat, lon] = path[i];
              const distancia = Math.sqrt(
                  Math.pow(coordenadas[0] - lat, 2) + Math.pow(coordenadas[1] - lon, 2)
              );
              if (distancia < distanciaMinima) {
                  distanciaMinima = distancia;
                  indiceMasCercano = i;
              }
          }
          return indiceMasCercano;
      }

      // Crear el array de GeoJSON Features
      const geoJsonFeatures = [];

      for (let i = 0; i < paraderos.length - 1; i++) {
          const inicio = encontrarIndiceMasCercano(paraderos[i].pos, path);
          const fin = encontrarIndiceMasCercano(paraderos[i + 1].pos, path);
          const segmentoPath = path.slice(inicio, fin + 1);

          // Agregar Point del paradero
          geoJsonFeatures.push({
              type: "Feature",
              geometry: {
                  type: "Point",
                  coordinates: [paraderos[i].pos[1], paraderos[i].pos[0]] // long, lat
              },
              properties: {
                  description: `${paraderos[i].cod}`
              }
          });

          // Agregar LineString
          geoJsonFeatures.push({
              type: "Feature",
              geometry: {
                  type: "LineString",
                  coordinates: segmentoPath.map(([lat, lon]) => [lon, lat])
              },
              properties: {
                  description: `${paraderos[i].cod} ${paraderos[i + 1].cod}`
              }
          });

          // Agregar Point del siguiente paradero
          geoJsonFeatures.push({
              type: "Feature",
              geometry: {
                  type: "Point",
                  coordinates: [paraderos[i + 1].pos[1], paraderos[i + 1].pos[0]] // long, lat
              },
              properties: {
                  description: `${paraderos[i + 1].cod}`
              }
          });
      }

      // Construir el GeoJSON
      const geoJson = {
          type: "FeatureCollection",
          features: geoJsonFeatures
      };

      return geoJson;

  } catch (error) {
      console.error('Error al obtener los datos:', error);
  }
}
async function insertarRecorridos(geoJson) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const recorridosFeatures = geoJson.features.filter(
      (feature) => feature.geometry.type === 'LineString'
    );

    for (const feature of recorridosFeatures) {
      const description = feature.properties.description;
      const [origen, destino] = description.split(' ');

      const coordinates = feature.geometry.coordinates;
      const lineStringWKT = `LINESTRING(${coordinates
        .map((coord) => `${coord[0]} ${coord[1]}`)
        .join(', ')})`;

      // Calcular la distancia en metros usando ST_Length
      const distanciaResult = await client.query(
        `SELECT ST_Length(ST_Transform(ST_GeomFromText($1, 4326), 3857)) AS distancia`,
        [lineStringWKT]
      );
      const distancia = distanciaResult.rows[0].distancia;

      // Insertar en la base de datos
      await client.query(
        `INSERT INTO recorridos (origen, destino, distancia, geom)
         VALUES ($1, $2, $3, ST_GeomFromText($4, 4326))`,
        [origen, destino, distancia, lineStringWKT]
      );
    }

    await client.query('COMMIT');
    console.log('Recorridos insertados exitosamente.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al insertar recorridos:', err);
  } finally {
    client.release();
  }
}


  module.exports = router;