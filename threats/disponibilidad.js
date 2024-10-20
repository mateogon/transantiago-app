const express = require('express');
const router = express.Router();
const axios = require('axios');

const disponibilidad = "https://api.uoct.cl/api/v1/waze/routes/zone/all";

router.get('/disponibilidad', async (req, res) => {
  try {
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
    
    res.json(extractedData);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching data', error: error.message });
  }
});


module.exports = router;