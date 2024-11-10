const express = require('express');
const router = express.Router();
const fs = require('fs').promises; // Usamos la versión basada en promesas de fs
const path = require('path'); // Para manejar rutas de forma segura
require('dotenv').config();
const { insertData, connect, disconnect } = require('../database');

const rutas = [
    'RutasPorServicio/U2_-_SuBus.geojson',
    'RutasPorServicio/U3_-_Buses_Vule.geojson',
    'RutasPorServicio/U4_-_Voy_Santiago.geojson',
    'RutasPorServicio/U5_-_Metbus.geojson',
    'RutasPorServicio/U7_-_STP.geojson',
    'RutasPorServicio/U8_-_Metropol.geojson',
    'RutasPorServicio/U9_-_Metropol.geojson',
    'RutasPorServicio/U10_-_STU.geojson',
    'RutasPorServicio/U11_-_RBU.geojson',
    'RutasPorServicio/U12_-_STU.geojson',
    'RutasPorServicio/U13_-_RBU.geojson'
];

// Función para insertar un recorrido en la base de datos PostgreSQL como LineString
async function insertRecorrido(data) {
    try {
        // Inserta o actualiza los datos en la tabla paraderos
        const instruccion = {
            'tabla': 'recorridos',
            'datos': {
                'codigo': data.Name,
                'geom': `LINESTRING(${data.geometryCoordinates.map(coord => `${coord[0]} ${coord[1]}`).join(', ')})`
            }
        };

        await insertData(instruccion);

    } catch (err) {
        console.error('Error al insertar en la base de datos:', err);
    }
}

// Ruta para obtener los datos del GeoJSON
router.get('/recorridos', async (req, res) => {
    try {
        await connect();
        // Recopila los datos de todos los archivos GeoJSON en el array 'rutas'
        const allFeaturesData = [];

        for (let ruta of rutas) {
            const featuresData = await leerGeoJSON(ruta); // Llama a la función asincrónica para cada archivo
            allFeaturesData.push(...featuresData); // Agrega los datos al array final
        }

        // Insertar los datos en la base de datos
        for (let data of allFeaturesData) {
            await insertRecorrido(data);
        }

        res.json(allFeaturesData); // Devuelve todos los datos como JSON
    } catch (error) {
        console.log(error);
        res.status(500).json(error); // Si hay un error, responde con un código de error
    } finally {
        console.log('Datos guardados en la tabla recorridos')
        // await disconnect();
    }
});


// Función asincrónica para leer el archivo GeoJSON y extraer los datos
async function leerGeoJSON(ruta) {
    try {
        // Resuelve la ruta absoluta utilizando path.join
        const filePath = path.join(__dirname, '..', ruta); // Asegúrate de que la ruta sea correcta

        // Lee el archivo GeoJSON
        const data = await fs.readFile(filePath, 'utf8');

        // Parsea el contenido del archivo
        const geojson = JSON.parse(data);

        // Extrae los datos relevantes de los features
        const featuresData = geojson.features.map(feature => {
            return {
                Name: feature.properties.Name, // Asumiendo que 'Name' está en las propiedades
                geometryCoordinates: feature.geometry.coordinates
            };
        });

        // Devuelve los datos extraídos
        return featuresData;
    } catch (err) {
        // Si hay algún error, lanza un error con un mensaje
        throw { error: 'Error al leer o procesar el archivo GeoJSON', details: err };
    }
};

module.exports = router;
