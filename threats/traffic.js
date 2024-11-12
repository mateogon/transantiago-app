const express = require('express');
const router = express.Router();
const axios = require('axios');
const { insertData, connect, disconnect } = require('../database');

const traffic = "https://www.waze.com/live-map/api/georss?top=-33.23896628638763&bottom=-33.65937371568267&left=-70.95859909057619&right=-70.328670501709&env=row&types=traffic";

router.get('/trafico', async (req, res) => {
    try {
        const data = await fetchAndTransformData(traffic);
        await connect();

        if (data) {
            await insertTrafico(data.features.map(feature => ({
                line: feature.geometry.coordinates.map(coord => ({ x: coord[0], y: coord[1] })),
                blockDescription: feature.properties.blockDescription
            })));
            console.log('OK');
            res.status(200).json(data);
        } else {
            res.status(404).json({ message: 'Datos no encontrados' });
        }
    } catch (error) {
        console.error('Error en la importación:', error);
        res.status(500).json({ message: 'Error en la importación de datos.' });
    } finally {
        console.log('Datos guardados en la tabla trafico');
        // await disconnect(); // Puedes descomentar esto si deseas desconectar después de cada solicitud
    }
});

async function insertTrafico(jams) {
    try {
        for (const jam of jams) {
            if (jam.line && jam.line.length > 0) {
                // Crear un objeto GeoJSON para la geometría de la línea
                const geojsonLine = {
                    type: "LineString",
                    coordinates: jam.line.map(point => [point.x, point.y]) // Asegúrate de que sea [longitud, latitud]
                };

                // Configurar la instrucción para la inserción en la tabla trafico
                const instruccion = {
                    'tabla': 'trafico',
                    'datos': {
                        'geom': JSON.stringify(geojsonLine),  // Solo el GeoJSON como cadena
                        'descripcion': jam.blockDescription || '' // Manejo de propiedades vacías
                    }
                };

                // Llamada a la función de inserción de datos
                await insertData(instruccion);
            } else {
                console.warn(`Jam sin geometría válida:`, jam);
            }
        }
    } catch (error) {
        console.error(`Error al insertar datos de tráfico:`, error);
    }
}

// Función para transformar los datos a formato GeoJSON
async function transformToGeoJSON(jams) {
    return {
        "type": "FeatureCollection",
        "features": jams.map(jam => ({
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": jam.line.map(point => [point.x, point.y])
            },
            "properties": {
                "blockDescription": jam.blockDescription
            }
        }))
    };
}

// Función para obtener datos de la API y transformarlos
async function fetchAndTransformData(apiUrl) {
    try {
        const response = await axios.get(apiUrl);
        const jams = response.data.jams; // Asegúrate de que esto es un array de objetos jam

        if (!Array.isArray(jams)) {
            throw new Error('La respuesta no contiene un array de jams.');
        }

        return await transformToGeoJSON(jams);
    } catch (error) {
        console.error('Error al obtener los datos:', error);
        throw error; // Re-lanzar el error para manejarlo en el archivo principal
    }
}

module.exports = router;