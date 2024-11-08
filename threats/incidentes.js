const express = require('express');
const router = express.Router();
const axios = require('axios');
const qs = require('qs'); // Importar la librería para codificar los datos como un formulario

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
    const results = responses.map(response => response.data);

    // Devolvemos los resultados como JSON
    res.json(results);
  } catch (error) {
    // Manejo de errores en caso de que alguna solicitud falle
    res.status(500).json({ message: 'Error al realizar las solicitudes POST', error: error.message });
  }
});

module.exports = router;