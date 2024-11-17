const express = require('express');
const router = express.Router();
require('dotenv').config();
const fs = require('fs');
const csv = require('csv-parser');
const { connect, disconnect, insertData } = require('../database'); // Ensure this is correctly imported

const aglomeracionFile = "predicted_density_matrix.csv";

router.get('/aglomeracion', async (req, res) => {
    try {
        await connect(); // Connect to the database
        const data = await obtenerAglomeracion(aglomeracionFile);

        if (data) {
            await insertAglomeracionData(data); // Insert data into the database
            console.log('Datos insertados correctamente en la tabla aglomeracion.');
            res.status(200).json({ message: 'Datos insertados correctamente en la tabla aglomeracion.' });
        } else {
            res.status(404).json({ message: 'Datos no encontrados' });
        }
    } catch (error) {
        console.error('Error en la importación:', error);
        res.status(500).json({ message: 'Error en la importación de datos.' });
    } finally {
        await disconnect(); // Disconnect from the database
    }
});

async function obtenerAglomeracion(filePath) {
    const results = [];

    await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => {
                const paraderoData = {
                    paradero: data['paradero'],
                    comuna: data['Comuna'],
                    horarios: {}
                };

                // Iterate over time columns and add to `horarios`
                Object.keys(data).forEach((key) => {
                    if (key !== 'paradero' && key !== 'Comuna') {
                        paraderoData.horarios[key] = parseFloat(data[key]) || 0;
                    }
                });

                results.push(paraderoData);
            })
            .on('end', resolve) // Resolve the promise when done
            .on('error', reject); // Reject the promise on error
    });

    return results;
}

// Insert aglomeracion data into the database
async function insertAglomeracionData(aglomeracionData) {
    try {
        for (const record of aglomeracionData) {
            const paradero = record.paradero;
            const comuna = record.comuna;
            const horarios = record.horarios;

            // Prepare column names and their quoted versions
            const horarioColumns = Object.keys(horarios);
            const quotedColumns = horarioColumns.map(col => `"${col}"`);

            // Instruction for insertion
            const instruccion = {
                tabla: 'aglomeracion',
                datos: {
                    paradero,
                    comuna,
                    ...horarios
                },
                conflict: `ON CONFLICT (paradero) DO UPDATE 
                           SET comuna = EXCLUDED.comuna, 
                               ${quotedColumns
                                 .map(col => `${col} = EXCLUDED.${col}`)
                                 .join(', ')}`
            };

            // Insert the data
            await insertData(instruccion);
        }
        console.log('Datos insertados correctamente en la tabla aglomeracion.');
    } catch (error) {
        console.error('Error al insertar los datos en la tabla aglomeracion:', error);
        throw error;
    }
}

module.exports = router;
