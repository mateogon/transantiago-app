// Import the required functions from database.js
const { connect, disconnect, insertData } = require('../database');
const axios = require('axios');
require('dotenv').config();

// Función para importar los servicios
async function importarServicios() {
    const client = await connect(); // Start the connection

    try {
        await client.query('BEGIN');

        // Hacer la solicitud a la API para obtener los IDs de servicios
        const response = await axios.get('https://www.red.cl/restservice_v2/rest/getservicios/all');
        const servicios = response.data; // Esto debería ser un array de IDs

        // Verificar que los datos sean un array
        if (!Array.isArray(servicios)) {
            throw new Error('La respuesta de la API no es un array de servicios.');
        }

        // Loop through each service and insert it using insertData
        for (const id of servicios) {
            await insertData({
                tabla: 'servicios',
                datos: { id },
                conflict: 'ON CONFLICT (id) DO NOTHING'
            });
        }

        await client.query('COMMIT');
        console.log('Servicios importados exitosamente.');
        return { message: 'Servicios importados exitosamente.' };
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error al importar servicios:', err);
        throw err;
    } finally {
        await disconnect(); // Close the connection
    }
}

// Función para obtener todos los servicios desde la base de datos
async function obtenerServicios() {
    const client = await connect();
    try {
        const res = await client.query('SELECT id FROM servicios');
        return res.rows.map(row => row.id);
    } catch (error) {
        console.error('Error al obtener los servicios:', error);
        throw error;
    } finally {
        await disconnect();
    }
}

module.exports = { importarServicios, obtenerServicios };
