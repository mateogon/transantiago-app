const axios = require('axios');
const express = require('express');

// Tráfico

// Función para transformar los datos a formato GeoJSON
async function transformToGeoJSON(jams) {
  return {
    "type": "FeatureCollection",
    "features": jams.map(jam => ({
      "type": "Feature",
      "geometry": {
        "type": "LineString",
        "coordinates": jam.line.map(point => [point.x, point.y])
      },
      "properties": {
        "blockDescription": jam.blockDescription
      }
    }))
  };
}

// Función para obtener datos de la API y transformarlos
async function fetchAndTransformData(apiUrl) {
  try {
    const response = await axios.get(apiUrl);
    const jams = response.data.jams; // Asegúrate de que esto es un array de objetos jam

    if (!Array.isArray(jams)) {
      throw new Error('La respuesta no contiene un array de jams.');
    }

    return await transformToGeoJSON(jams);
  } catch (error) {
    console.error('Error al obtener los datos:', error);
    throw error; // Re-lanzar el error para manejarlo en el archivo principal
  }
}


// Metro
async function obtenerEstadosMetro(url) {
    try {
      const response = await axios.get(url);
      const data = response.data;
  
      // Llama a la función que procesa los datos del JSON
      const datosProcesados = obtenerDatosServicios(data);
      // console.log(datosProcesados);
      return datosProcesados;
  
    } catch (error) {
      console.error("Error al obtener los datos:", error);
    }
  }
  
  function obtenerDatosServicios(data) {
    const resultado = [];

    const lineas = Object.keys(data);
  
    lineas.forEach((linea) => {
      const estaciones = data[linea].estaciones;
  
      estaciones.forEach((estacion) => {
        const estacionData = {
          nombre: estacion.nombre,
          codigo: estacion.codigo,
          estado: estacion.estado,
          combinacion: estacion.combinacion,
          linea: linea
        };
        resultado.push(estacionData);
      });
    });
  
    return resultado;
  }

// Función asincrónica para convertir el JSON a GeoJSON
async function alertaAGeoJSON(jams) {
    const features = jams.alerts.map(alert => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [alert.location.x, alert.location.y]
      },
      properties: {
        country: alert.country,
        city: alert.city,
        street: alert.street,
        type: alert.type,
        subtype: alert.subtype,
        reportRating: alert.reportRating,
        reliability: alert.reliability,
        confidence: alert.confidence,
        reportBy: alert.reportBy,
        nThumbsUp: alert.nThumbsUp,
        nComments: alert.nComments,
        reportDescription: `Road closure reported on ${alert.street}.`,
        additionalInfo: alert.additionalInfo,
        uuid: alert.uuid
      }
    }));
  
    return {
      type: "FeatureCollection",
      features
    };
  }
  
// Función principal para obtener el JSON y convertirlo a GeoJSON
function alertasGJ(url) {
    return axios.get(url)
    .then(response => {
      const inputJson = response.data; // Suponiendo que la respuesta contiene el JSON directamente

      // Convertir el JSON a GeoJSON usando la función asincrónica
      return alertaAGeoJSON(inputJson);
    })
    .catch(error => {
      console.error('Error fetching data:', error);
      throw error; // Lanzar el error para que pueda ser manejado más arriba
    });
  }

module.exports = { fetchAndTransformData, obtenerEstadosMetro, alertasGJ};
