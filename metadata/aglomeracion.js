const express = require('express');
const router = express.Router();
require('dotenv').config();
const fs = require('fs');
const csv = require('csv-parser');


const aglomeracion = "predicted_density_matrix.csv";

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
  
          // Itera sobre las columnas de tiempo y añade al objeto `horarios`
          Object.keys(data).forEach((key) => {
            if (key !== 'paradero' && key !== 'Comuna') {
              paraderoData.horarios[key] = parseFloat(data[key]) || 0;
            }
          });
  
          results.push(paraderoData);
        })
        .on('end', resolve) // Resuelve la promesa cuando se completa la lectura
        .on('error', reject); // Rechaza la promesa en caso de error
    });
  
    return results; // Retorna el JSON resultante
  }

module.exports = router;
