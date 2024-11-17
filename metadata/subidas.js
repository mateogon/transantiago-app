const express = require('express');
const router = express.Router();
const axios = require('axios');
require('dotenv').config();
const unzipper = require('unzipper');
const xlsb = require('xlsx');
const path = require('path');
const fs = require('fs');
const { connect, disconnect, insertData } = require('../database'); // Ensure this is correctly imported

const subidas = "https://www.dtpm.cl/descargas/modelos_y_matrices/tablas_subidas_bajadas_abr24.zip";

// Ruta para manejar la subida de datos
router.get('/subidas', async (req, res) => {
    try {
        await connect(); // Connect to the database

        const data = await downloadAndProcessZip(subidas); // Process the ZIP file
        
        if (data) {
            await insertSubidasData(data); // Insert processed data into the `subidas` table
            res.status(200).json({ message: 'Datos insertados correctamente en la tabla subidas.' });
        } else {
            res.status(404).json({ message: 'No se encontraron datos para procesar.' });
        }
    } catch (error) {
        console.error('Error en la importación:', error);
        res.status(500).json({ message: 'Error en la importación de datos.', error: error.message });
    } finally {
        await disconnect(); // Disconnect from the database
    }
});

// Procesar archivos Zip
async function downloadAndProcessZip(url) {
    const zipPath = path.join(__dirname, 'tablas_subidas_bajadas_abr24.zip');
    const xlsbPath = path.join(__dirname, 'tablas_subidas_bajadas_abr24/2024.04-Matriz_sub_SS_MH.xlsb');

    try {
        // Paso 1: Descargar el archivo ZIP
        const response = await axios({
            url,
            responseType: 'stream'
        });

        // Paso 2: Extraer el archivo XLSB
        await new Promise((resolve, reject) => {
            const writer = fs.createWriteStream(zipPath);
            response.data.pipe(writer);
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        await fs.createReadStream(zipPath)
            .pipe(unzipper.Extract({ path: __dirname }))
            .promise();

        // Paso 3: Leer y procesar el archivo XLSB
        const workbook = xlsb.readFile(xlsbPath);
        const sheetName = workbook.SheetNames[1]; // Segunda hoja
        const sheet = workbook.Sheets[sheetName];

        let data = xlsb.utils.sheet_to_json(sheet, { header: 1 }).slice(2);

        const indicesRelevantes = {
            'Comuna': 1,
            'paradero': 2,
            '5:30:00': 18,
            '6:00:00': 19,
            '6:30:00': 20,
            '7:00:00': 21,
            '7:30:00': 22,
            '8:00:00': 23,
            '8:30:00': 24,
            '9:00:00': 25,
            '9:30:00': 26,
            '10:00:00': 27,
            '10:30:00': 28,
            '11:00:00': 29,
            '11:30:00': 30,
            '12:00:00': 31,
            '12:30:00': 32,
            '13:00:00': 33,
            '13:30:00': 34,
            '14:00:00': 35,
            '14:30:00': 36,
            '15:00:00': 37,
            '15:30:00': 38,
            '16:00:00': 39,
            '16:30:00': 40,
            '17:00:00': 41,
            '17:30:00': 42,
            '18:00:00': 43,
            '18:30:00': 44,
            '19:00:00': 45,
            '19:30:00': 46,
            '20:00:00': 47,
            '20:30:00': 48,
            '21:00:00': 49,
            '21:30:00': 50,
            '22:00:00': 51,
            '22:30:00': 52,
            '23:00:00': 53,
            '23:30:00': 54
        };

        const resultado = data.reduce((acumulador, fila) => {
            const paradero = fila[indicesRelevantes['paradero']];
            if (!paradero) return acumulador;

            if (!acumulador[paradero]) {
                acumulador[paradero] = { comuna: fila[indicesRelevantes['Comuna']], valores: {} };
            }

            Object.keys(indicesRelevantes).slice(2).forEach((columna) => {
                const valor = fila[indicesRelevantes[columna]];
                acumulador[paradero].valores[columna] = (acumulador[paradero].valores[columna] || 0) + (valor !== undefined ? valor : 0);
            });

            return acumulador;
        }, {});

        return resultado;

    } catch (error) {
        console.error('Error al procesar el archivo:', error);
        throw error;
    } finally {
        if (zipPath && fs.existsSync(zipPath)) {
            fs.unlinkSync(zipPath);
        }
        if (xlsbPath && fs.existsSync(xlsbPath)) {
            fs.unlinkSync(xlsbPath);
        }
    }
}

// Función para insertar datos en la tabla subidas
async function insertSubidasData(subidasData) {
  try {
    for (const paradero in subidasData) {
      const comuna = subidasData[paradero].comuna;
      const valores = subidasData[paradero].valores;

      // Prepare column names and their quoted versions
      const timeColumns = Object.keys(valores);
      const quotedColumns = timeColumns.map(col => `"${col}"`);

      // Instruction for insertion
      const instruccion = {
        tabla: 'subidas',
        datos: {
          paradero,
          comuna,
          ...valores
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
    console.log('Datos insertados correctamente en la tabla subidas.');
  } catch (error) {
    console.error('Error al insertar los datos en la tabla subidas:', error);
    throw error;
  }
}




module.exports = router;
