const express = require('express');
const router = express.Router();
const axios = require('axios');
const qs = require('qs'); // Importar la librería para codificar los datos como un formulario
const { insertData, connect, disconnect } = require('../database');

// URL de destino para la solicitud POST
const url = "https://www.transporteinforma.cl/wp/wp-admin/admin-ajax.php";

// Ruta para el POST con las zonas
router.get('/incidentes', async (req, res) => {
  // Array de zonas a enviar
  const zones = [
    "zona-nororiente", "zona-centro", "zona-norponiente", "zona-norte", 
    "zona-sur", "zona-suroriente", "zona-surponiente"
  ];

  // Verificar si las zonas están definidas
  if (!zones || zones.length === 0) {
    return res.status(400).json({ message: 'Se requiere un array de zonas' });
  }

  // Usamos Promise.all para hacer las solicitudes de forma paralela
  try {
    await connect();
    const requests = zones.map(zone => {
      const postData = qs.stringify({
        action: 'home_incident_zone',
        zone: zone  // Enviamos una zona por solicitud
      });

      // Realizamos la solicitud POST por cada zona
      return axios.post(url, postData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded', // Especificar que estamos enviando un formulario
        }
      });
    });

    // Esperamos todas las solicitudes y las manejamos
    const responses = await Promise.all(requests);

    // Extraemos los resultados de todas las respuestas
    const results = responses.map(response => 
      response.data.data.map(incident => ({
        id: incident.ID,
        fecha: incident.post_date,
        titulo: incident.post_title,
        post_url: incident.url
      }))
    ).flat();

    // Llamamos a insertIncidente para cada incidente
    for (const incident of results) {
      await insertIncidente(incident);  // Insertamos cada incidente en la base de datos
    }

    // Devolvemos los resultados como JSON
    res.json(results);
  } catch (error) {
    // Manejo de errores en caso de que alguna solicitud falle
    res.status(500).json({ message: 'Error al realizar las solicitudes POST', error: error.message });
  } finally {
    console.log('Datos guardados en la tabla incidentes');
    // await disconnect();
  }
});

async function insertIncidente(incident) {
  try {
    // Verificar que las propiedades necesarias estén presentes
    if (!incident.id || !incident.titulo || !incident.fecha || !incident.post_url) {
      throw new Error(`Faltan datos en el incidente: ${JSON.stringify(incident)}`);
      return;
    }

    // Preparar la instrucción de inserción o actualización
    const instruccion = {
      'tabla': 'incidentes',  
      'datos': {
        'id': incident.id,
        'titulo': incident.titulo,  // Asegúrate de que esto coincida con la estructura de tu base de datos
        'fecha': incident.fecha,
        'post_url': incident.post_url,   // Cambiado a 'url' para que coincida con la propiedad correcta
      },
      'conflict': ` ON CONFLICT (id) DO UPDATE 
                   SET titulo = EXCLUDED.titulo,
                       fecha = EXCLUDED.fecha,
                       post_url = EXCLUDED.post_url`
    };

    // Llamar a la función insertData para insertar o actualizar los datos
    await insertData(instruccion);
  } catch (error) {
    console.error(`Error al insertar el incidente ${incident.id}:`, error);
  }
}

module.exports = router;