const express = require('express');
const router = express.Router();
const { downloadAndProcessZip, obtenerDatosYProcesar, obtenerLlegadas, obtenerAglomeracion } = require('./metaProcessor');
require('dotenv').config();
const { Client } = require('pg');

const recorrido = "https://www.red.cl/restservice_v2/rest/conocerecorrido?codsint=";
const subidas = "https://www.dtpm.cl/descargas/modelos_y_matrices/tablas_subidas_bajadas_abr24.zip";
const espera = "https://api.xor.cl/red/bus-stop/";
const aglomeracion = "predicted_density_matrix.csv";

// Configuración de conexión a PostgreSQL usando variables de entorno
const client = new Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function insertData(data) {
    for (const row of data) {
      // Obtener las claves (nombres de las columnas) y valores
      const columns = Object.keys(row);
      const values = Object.values(row);
  
      // Crear una consulta dinámica
      const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
      const query = `INSERT INTO subidas (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`;
  
      try {
        const res = await client.query(query, values);
        console.log('Fila insertada:', res.rows[0]);
      } catch (err) {
        console.error('Error al insertar la fila:', err);
      }
    }
  }

router.get('/recorrido/:id', async (req, res) => {
    const {id} = req.params;
    const paso = recorrido + id;

    try{
        const data = await obtenerDatosYProcesar(paso);

        if(data){
            console.log('OK');
            res.status(200).json(data);
        } else {
            res.status(404).json( { message: 'Datos no encontrados'} );
        }
    }
    catch(error){
        res.status(500).json({ message: 'Error en la importación de datos.', error});
    }
    finally{

    }
});

// Ruta para manejar la subida de datos
router.get('/subidas', async (req, res) => {
    try {
        const data = await downloadAndProcessZip(subidas); // Cambia el nombre de la variable a "subidas"
    
        if (data) {
            res.status(200).json(data);
        } else {
            res.status(404).json({ message: 'No se encontraron datos.' });
        }
    } catch (error) {
        console.error('Error en la importación:', error);
        res.status(500).json({ message: 'Error en la importación de datos.' });
    }
});


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

router.get('/aglomeracion', async (req, res) => {
    try {
        const data = await obtenerAglomeracion(aglomeracion);

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

module.exports = router;

