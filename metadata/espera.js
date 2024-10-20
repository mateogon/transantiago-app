const express = require('express');
const axios = require('axios');
const router = express.Router();

const espera = "https://api.xor.cl/red/bus-stop/";

router.get('/espera/:id', async (req, res) => {
    const paradero = req.params.id;
    const tiempoEspera = espera + paradero;

    try {
        const data = await obtenerLlegadas(tiempoEspera);

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

// Procesar llegadas
async function obtenerLlegadas(url) {
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
  
    data.services.forEach((servicio) => {
      const servicioId = servicio.id;
  
      servicio.buses.forEach((bus) => {
        const busData = {
          servicio: servicioId,
          bus_id: bus.id,
          metros_distancia: bus.meters_distance,
          tiempo_llegada_min: bus.min_arrival_time,
          tiempo_llegada_max: bus.max_arrival_time
        };
        resultado.push(busData);
      });
    });
  
    return resultado;
  }

  module.exports = router;