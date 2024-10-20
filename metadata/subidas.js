const express = require('express');
const router = express.Router();
const axios = require('axios');
require('dotenv').config();
const unzipper = require('unzipper');
const xlsb = require('xlsx');
const path = require('path');
const fs = require('fs');

const subidas = "https://www.dtpm.cl/descargas/modelos_y_matrices/tablas_subidas_bajadas_abr24.zip";

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

// Procesar archivos Zip
async function downloadAndProcessZip(url) {
  // Definir rutas de archivo
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

    // Convertir a JSON y saltar las primeras dos filas
    let data = xlsb.utils.sheet_to_json(sheet, { header: 1 }).slice(2);

    // Definir las columnas que queremos conservar
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

    // Paso 4: Sumar valores y filtrar por paradero
    const resultado = data.reduce((acumulador, fila) => {
      const paradero = fila[indicesRelevantes['paradero']]; // Índice de 'paradero'
      if (paradero == "" || paradero == null) return acumulador; // Descartar filas sin paradero

      // Crear un objeto para el paradero si no existe
      if (!acumulador[paradero]) {
        acumulador[paradero] = { comuna: fila[indicesRelevantes['Comuna']], valores: {} }; // fila[0] es 'Comuna'
      }

      // Sumar valores por intervalo de tiempo
      Object.keys(indicesRelevantes).slice(2).forEach((columna) => { // Desde el tercer índice
        const valor = fila[indicesRelevantes[columna]]; // Obtener el valor
        acumulador[paradero].valores[columna] = (acumulador[paradero].valores[columna] || 0) + (valor !== undefined ? valor : 0);
      });

      return acumulador;
    }, {});

    // Paso 5: Devolver el resultado en formato JSON
    return resultado;

  } catch (error) {
    console.error('Error al procesar el archivo:', error);
  } finally {
    // Limpieza: Eliminar archivos temporales si fueron definidos
    if (zipPath && fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
    }
    if (xlsbPath && fs.existsSync(xlsbPath)) {
      fs.unlinkSync(xlsbPath);
    }
  }
}

module.exports = router;