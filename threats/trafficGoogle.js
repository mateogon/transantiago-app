const express = require('express');
const axios = require('axios');
const router = express.Router();
require('dotenv').config();

async function obtenerDatosDeTrafico(origen, destino) {
    const apiKey = process.env.API_KEY;
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origen}&destination=${destino}&mode=transit&departure_time=now&key=${apiKey}`;

    try {
        const respuesta = await axios.get(url);
        return respuesta.data; // Retorna los datos de tráfico
    } catch (error) {
        console.error('Error al obtener datos de tráfico:', error);
        return null; // Maneja el error devolviendo null
    }
};

// Ruta que llama a la función y renderiza la vista
router.get('/trafficGoogle', async (req, res) => {
    const datosTrafico = await obtenerDatosDeTrafico('-33.4206249,-70.60802', '-33.423407,-70.6053359');
    if (datosTrafico) {
        res.status(200).json(datosTrafico); // Envía los datos a la vista
    } else {
        res.status(500).send('Error al obtener datos de tráfico');
    }
});

module.exports = router;