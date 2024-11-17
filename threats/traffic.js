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
            // Map all relevant properties to be passed to insertTrafico
            await insertTrafico(data.features.map(feature => ({
                line: feature.geometry.coordinates.map(coord => ({ x: coord[0], y: coord[1] })),
                blockDescription: feature.properties.blockDescription || '',  // Handle empty descriptions
                severity: feature.properties.severity || null,                // Include severity
                delay: feature.properties.delay || null,                      // Include delay
                blockType: feature.properties.blockType || null,              // Include block type
                roadType: feature.properties.roadType || null,                // Include road type
                blockStartTime: feature.properties.blockStartTime             // Include block start time
                    ? new Date(feature.properties.blockStartTime).toISOString()
                    : null,
                blockExpiration: feature.properties.blockExpiration           // Include block expiration
                    ? new Date(feature.properties.blockExpiration).toISOString()
                    : null
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
            console.log(jam);
            if (jam.line && jam.line.length > 0) {
                // Crear un objeto GeoJSON para la geometría de la línea
                const geojsonLine = {
                    type: "LineString",
                    coordinates: jam.line.map(point => [point.x, point.y]) // Asegúrate de que sea [longitud, latitud]
                };

                // Verifica y extrae las propiedades correctamente
                const descripcion = jam.blockDescription || '';
                const severity = jam.severity !== undefined ? jam.severity : null;
                const delay = jam.delay !== undefined ? jam.delay : null;
                const blockType = jam.blockType || null;
                const roadType = jam.roadType || null;
                const blockStartTime = jam.blockStartTime
                    ? new Date(jam.blockStartTime).toISOString()
                    : null;
                const blockExpiration = jam.blockExpiration
                    ? new Date(jam.blockExpiration).toISOString()
                    : null;

                // Configurar la instrucción para la inserción en la tabla trafico
                const instruccion = {
                    'tabla': 'trafico',
                    'datos': {
                        'geom': JSON.stringify(geojsonLine),        // Geometría como cadena GeoJSON
                        'descripcion': descripcion,                // Manejo de descripciones vacías
                        'severity': severity,                      // Severidad
                        'delay': delay,                            // Retraso
                        'block_type': blockType,                   // Tipo de bloqueo
                        'road_type': roadType,                     // Tipo de carretera
                        'block_start_time': blockStartTime,        // Tiempo de inicio del bloqueo
                        'block_expiration': blockExpiration        // Tiempo de expiración del bloqueo
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
                "blockDescription": jam.blockDescription,
                "severity": jam.severity,
                "delay": jam.delay,
                "blockType": jam.blockType,
                "roadType": jam.roadType,
                "blockStartTime": jam.blockStartTime,
                "blockExpiration": jam.blockExpiration
            }
        }))
    };
}

async function fetchAndTransformData(apiUrl) {
    try {
        const response = await axios.get(apiUrl);
        const jams = response.data.jams; // Verifica que esto es un array de objetos jam

        if (!Array.isArray(jams)) {
            throw new Error('La respuesta no contiene un array de jams.');
        }

        return {
            "type": "FeatureCollection",
            "features": jams.map(jam => ({
                "type": "Feature",
                "geometry": {
                    "type": "LineString",
                    "coordinates": jam.line.map(point => [point.x, point.y]) // Asegúrate del formato correcto
                },
                "properties": {
                    "blockDescription": jam.blockDescription || '', // Descripción del bloqueo
                    "severity": jam.severity !== undefined ? jam.severity : null, // Severidad
                    "delay": jam.delay !== undefined ? jam.delay : null,         // Retraso
                    "blockType": jam.blockType || null,                          // Tipo de bloqueo
                    "roadType": jam.roadType || null,                            // Tipo de carretera
                    "blockStartTime": jam.blockStartTime || null,                // Tiempo de inicio del bloqueo
                    "blockExpiration": jam.blockExpiration || null               // Tiempo de expiración del bloqueo
                }
            }))
        };
    } catch (error) {
        console.error('Error al obtener los datos:', error);
        throw error;
    }
}

module.exports = router;