const express = require('express');
const { engine } = require('express-handlebars');
const axios = require('axios');
const fs = require('fs');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const app = express();
const PORT = process.env.PORT || 3000;

// Nombre del archivo CSV que quieres leer
const inputFilePath = 'paraderos.csv';
// Nombre del archivo CSV para guardar las ubicaciones
const outputFilePath = 'ubicaciones_paraderos.csv';

// Array para almacenar los datos del CSV
let codigosParaderos = [];

// Array para almacenar todas las ubicaciones encontradas
let locations = [];

// Función para cargar los nombres de los códigos de paraderos desde el CSV
async function cargarCodigosParaderos() {
    return new Promise((resolve, reject) => {
      fs.createReadStream(inputFilePath)
        .pipe(csv())
        .on('data', (row) => {
          codigosParaderos.push(row.paradero); // Ajusta según el nombre de la columna en tu CSV
        })
        .on('end', () => {
          console.log('Códigos de paradero cargados desde el CSV:', codigosParaderos);
          resolve();
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

// Configurar Handlebars
app.engine('hbs', engine({
    extname: '.hbs',
    defaultLayout: 'main',
    layoutsDir: __dirname + '/views/layouts/',
    partialsDir: __dirname + '/views/partials/',
    helpers: {
      json: function(context) {
          return JSON.stringify(context);
      }
    }
}));
app.set('view engine', 'hbs');

// Función para obtener la ubicación de un paradero y guardar en CSV
async function obtenerUbicacionYGuardar(codigoParadero) {
    const direccionParadero = `${codigoParadero}, Santiago, Chile`;
  
    try {
      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: direccionParadero,
          format: 'json',
          addressdetails: 1,
          limit: 1
        }
      });
  
      if (response.data && response.data.length > 0) {
        const location = response.data[0];
        const csvWriter = createCsvWriter({
          path: outputFilePath,
          header: [
            { id: 'codigoParadero', title: 'codigoParadero' },
            { id: 'latitud', title: 'latitud' },
            { id: 'longitud', title: 'longitud' }
          ],
          append: fs.existsSync(outputFilePath) // Append si el archivo ya existe
        });
  
        const records = [{ codigoParadero, latitud: location.lat, longitud: location.lon }];
        await csvWriter.writeRecords(records); // Escribir el registro en el CSV
  
        return { codigoParadero, latitud: location.lat, longitud: location.lon };
      } else {
        console.error(`No se encontró información para el paradero ${codigoParadero}`);
        return { codigoParadero, error: 'No se encontró información para el paradero' };
      }
    } catch (error) {
      console.error(`Error al obtener la ubicación del paradero ${codigoParadero}:`, error);
      return { codigoParadero, error: 'Hubo un error al obtener la información del paradero' };
    }
  }

// Middleware para parsear datos del formulario
app.use(express.urlencoded({ extended: true }));

// Rutas
app.get('/', (req, res) => {
    res.render('home');
});

app.post('/buscar', async (req, res) => {
    const codigoParadero = req.body.codigoParadero;
    const direccionParadero = `${codigoParadero}, Santiago, Chile`;

    try {
        const response = await axios.get('https://nominatim.openstreetmap.org/search', {
            params: {
                q: direccionParadero,
                format: 'json',
                addressdetails: 1,
                limit: 1
            }
        });

        if (response.data && response.data.length > 0) {
            const location = response.data[0];
            res.render('result', {
                codigoParadero,
                latitud: location.lat,
                longitud: location.lon
            });
        } else {
            res.render('result', {
                codigoParadero,
                error: 'No se encontró información para el paradero'
            });
        }
    } catch (error) {
        console.error('Error al obtener la ubicación del paradero:', error);
        res.render('result', {
            codigoParadero,
            error: 'Hubo un error al obtener la información del paradero'
        });
    }
});

// Ruta GET para obtener y mostrar las ubicaciones desde el CSV
app.get('/map', async (req, res) => {
    try {
      // Verificar si existe el archivo CSV de ubicaciones
      if (!fs.existsSync(outputFilePath)) {
        return res.status(400).send('No se encontraron ubicaciones guardadas.');
      }
  
      // Leer el archivo CSV y obtener los registros
      const ubicaciones = [];
      fs.createReadStream(outputFilePath)
        .pipe(csv())
        .on('data', (row) => {
          ubicaciones.push(row);
        })
        .on('end', () => {
          // Mostrar las ubicaciones obtenidas en la consola
          console.log('Ubicaciones obtenidas:', ubicaciones);
                
          // Verificar el número de ubicaciones obtenidas
          if (ubicaciones.length === 0) {
              console.error('No se encontraron ubicaciones en el archivo CSV.');
              return res.status(400).send('No se encontraron ubicaciones en el archivo CSV.');
          }

          // Renderizar la vista con las ubicaciones encontradas
          res.render('map', { ubicaciones });
        });
  
    } catch (error) {
      console.error('Error al leer el archivo CSV de ubicaciones:', error);
      res.status(500).send('Error al leer el archivo CSV de ubicaciones.');
    }
  });

// Ruta POST para procesar la obtención de ubicaciones y guardar en CSV
app.get('/obtener-ubicaciones', async (req, res) => {
    try {
      await cargarCodigosParaderos(); // Cargar los nombres de los códigos de paradero desde el CSV
  
      if (codigosParaderos.length === 0) {
        return res.status(400).send('No se encontraron códigos de paradero.');
      }
  
      const ubicaciones = [];
  
      // Obtener y guardar la ubicación de cada paradero
      for (const codigoParadero of codigosParaderos) {
        const ubicacion = await obtenerUbicacionYGuardar(codigoParadero);
        ubicaciones.push(ubicacion);
      }
  
      res.json({ message: 'Ubicaciones obtenidas y guardadas exitosamente.' });
  
    } catch (error) {
      console.error('Error al obtener y guardar ubicaciones:', error);
      res.status(500).json({ error: 'Hubo un error al procesar la solicitud.' });
    }
  });  

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
