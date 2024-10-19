const express = require('express');
const router = express.Router();
const axios = require('axios');

const metro = "https://www.metro.cl/api/estadoRedDetalle.php";

router.get('/metro', async (req, res) => {
    try {
        const data = await obtenerEstadosMetro(metro);

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

module.exports = router;