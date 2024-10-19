const express = require('express');
const router = express.Router();
const axios = require('axios');

const alertas = "https://www.waze.com/live-map/api/georss?top=-33.23896628638763&bottom=-33.65937371568267&left=-70.95859909057619&right=-70.328670501709&env=row&types=alerts";

router.get('/alerts', async (req, res) => {
    try {
        const data = await alertasGJ(alertas);

        if(data){
            console.log('OK');
            res.status(200).json(data);
        } else {
            res.status(404).json( { message: 'Datos no encontrados'} );
        }
    } catch (error) {
        console.error('Error en la importación:', error);
        res.status(500).json({ message: 'Error en la importación de datos.' });
    }
});

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

module.exports = router;