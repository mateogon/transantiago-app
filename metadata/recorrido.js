const express = require('express');
const router = express.Router();
const axios = require('axios');
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
      const data = response.data;
  
      // Extraemos el path y los paraderos
      const path = data.ida.path;
      const paraderos = data.ida.paraderos.map(p => p.pos);
  
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
        const inicio = encontrarIndiceMasCercano(paraderos[i], path);
        const fin = encontrarIndiceMasCercano(paraderos[i + 1], path);
        const segmentoPath = path.slice(inicio, fin + 1);
  
        // Agregar Point del paradero
        geoJsonFeatures.push({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [paraderos[i][1], paraderos[i][0]] // long, lat
          },
          properties: {
            description: `${data.ida.paraderos[i].cod}`
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
            description: `${data.ida.paraderos[i].cod} ${data.ida.paraderos[i + 1].cod}`
          }
        });
  
        // Agregar Point del siguiente paradero
        geoJsonFeatures.push({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [paraderos[i + 1][1], paraderos[i + 1][0]] // long, lat
          },
          properties: {
            description: `${data.ida.paraderos[i+1].cod}`
          }
        });
      }
  
      // Imprimir los Features de GeoJSON generados
      const geoJson = {
        type: "FeatureCollection",
        features: geoJsonFeatures
      };
  
      //console.log(JSON.stringify(geoJson, null, 2));
      return geoJson;
  
    } catch (error) {
      console.error('Error al obtener los datos:', error);
    }
  }

  module.exports = router;