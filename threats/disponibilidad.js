const express = require('express');
const router = express.Router();
const axios = require('axios');
const { insertData, connect, disconnect } = require('../database');

const disponibilidad = "https://api.uoct.cl/api/v1/waze/routes/zone/all";

router.get('/disponibilidad', async (req, res) => {
  try {
    await connect();
    const response = await axios.get(disponibilidad);
    
    // Accede a la propiedad `data` del objeto que contiene los datos requeridos
    const routes = response.data.data;

    const extractedData = routes.map(route => ({
      to_name: route.to_name,
      from_name: route.from_name,
      custom_label: route.custom_label,
      created_at: route.created_at,
      time: route.time,
      jam_level: route.jam_level,
      enabled: route.enabled,
      length: route.length
    }));
    
    for (const route of extractedData) {
      await insertDisponibilidad(route);  // Insertamos cada incidente en la base de datos
    }

    res.json(extractedData);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching data', error: error.message });
  } finally {
    console.log('Datos guardados en la tabla disponibilidad');
    // await disconnect(); // Descomentar si deseas cerrar la conexión
  }
});

async function insertDisponibilidad(data) {
  try {
    const instruccion = {
      'tabla': 'disponibilidad',
      'datos': {
        'origen': data.from_name,
        'destino': data.to_name,
        'descripcion': data.custom_label,
        'fecha_creacion': data.created_at,
        'tiempo_trayecto': data.time,
        'nivel_congestion': data.jam_level,
        'habilitado': data.enabled,
        'largo_segmento': data.length,
      },
      'conflict': `ON CONFLICT (origen, destino) DO UPDATE 
                   SET descripcion = EXCLUDED.descripcion,
                       fecha_creacion = EXCLUDED.fecha_creacion,
                       tiempo_trayecto = EXCLUDED.tiempo_trayecto,
                       nivel_congestion = EXCLUDED.nivel_congestion,
                       habilitado = EXCLUDED.habilitado,
                       largo_segmento = EXCLUDED.largo_segmento`
    };
    await insertData(instruccion);
  } catch (error) {
    console.error(`Error al insertar los datos para: ${JSON.stringify(data)}`, error);
  }
}

module.exports = router;