const express = require('express');
const axios = require('axios');
const router = express.Router();
require('dotenv').config();
const { insertData, connect, disconnect } = require('../database');

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

// Función para filtrar los datos que necesitamos
function filtrarDatos(datos) {
    if (!datos || datos.status !== "OK" || !datos.routes || datos.routes.length === 0) {
        return null;
    }

    // Tomamos el primer "route" y el primer "leg"
    const route = datos.routes[0];
    const leg = route.legs[0];

    // Extraemos los datos requeridos
    const datosFiltrados = {
        distance: leg.distance,
        duration: leg.duration,
        start_location: leg.start_location,
        end_location: leg.end_location,
        polyline: route.overview_polyline.points,
        steps: leg.steps.map(step => ({
            distance: step.distance,
            duration: step.duration,
            start_location: step.start_location,
            end_location: step.end_location,
            polyline: step.polyline.points
        }))
    };

    insertRuta(datosFiltrados);

    return datosFiltrados;
}

async function insertRuta(data) {
  try {
    const origen = `SRID=4326;POINT(${data.start_location.lng} ${data.start_location.lat})`;
    const destino = `SRID=4326;POINT(${data.end_location.lng} ${data.end_location.lat})`;

    const instruccion = {
      'tabla': 'rutas',
      'datos': {
        origen: origen,
        destino: destino,
        distancia: data.distance.value,
        duracion: data.duration.value,
        polyline: data.polyline,
        steps: JSON.stringify(data.steps.map(step => ({
          distancia: step.distance.value,
          duracion: step.duration.value,
          origen: `SRID=4326;POINT(${step.start_location.lng} ${step.start_location.lat})`,
          destino: `SRID=4326;POINT(${step.end_location.lng} ${step.end_location.lat})`,
          polyline: step.polyline
        })))
      }
    };

    // Primero intenta insertar sin ON CONFLICT
    await insertData(instruccion);
    console.log("Éxito en la inserción de datos en la tabla rutas");
  } catch (error) {
    console.error('Error al insertar la ruta:', error);
  }
}

// Ruta que llama a la función, guarda los datos y devuelve la respuesta
router.get('/trafficGoogle', async (req, res) => {
    const datosTrafico = await obtenerDatosDeTrafico('-33.4206249,-70.60802', '-33.423407,-70.6053359');
    if (datosTrafico) {
        await connect();
        const datosFiltrados = filtrarDatos(datosTrafico); // Filtra los datos

        if (datosFiltrados) {
            res.status(200).json(datosFiltrados); // Envía los datos a la vista
        } else {
            res.status(500).send('Error al procesar datos de tráfico');
        }
    } else {
        res.status(500).send('Error al obtener datos de tráfico');
    }
});

module.exports = router;
