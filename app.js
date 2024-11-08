const express = require('express');
const { engine } = require('express-handlebars');
const axios = require('axios');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const { Buffer } = require('buffer');

// Importar Archivos Viejos
const old = require('./appOld')

// Importar archivos de metadata
const recorrido = require('./metadata/recorrido');
const subidas = require('./metadata/subidas');
const espera = require('./metadata/espera');
const aglomeracion = require('./metadata/aglomeracion');

// Importar archivos de amenazas
const metro = require('./threats/metro');
const alerts = require('./threats/alerts');
const traffic = require('./threats/traffic');
const disponibilidad = require('./threats/disponibilidad');
const incidentes = require('./threats/incidentes');
const trafficGoogle = require('./threats/trafficGoogle');

const app = express();
const PORT = process.env.PORT || 3000;

// Nombre del archivo CSV para guardar las ubicaciones
const outputFilePath2 = 'ubicaciones_paraderos2.csv';

// Array para almacenar los datos del CSV
let codigosParaderos = [];

const BASE_URL = "https://www.red.cl/predictor/prediccion?t=%s&codsimt=%s&codser="
const SESSION_URL = "https://www.red.cl/planifica-tu-viaje/cuando-llega/"

let session = '';

async function cargarCodigosParaderos() {
  try {
    const response = await axios.get('https://www.red.cl/restservice_v2/rest/getparadas/all');
    const data = response.data;

    // Suponiendo que el JSON es un objeto y quieres convertirlo en un array de sus valores
    codigosParaderos = Object.values(data);

    console.log(codigosParaderos);
  } catch (error) {
    console.error('Error al obtener los datos:', error);
  }
}

async function getSession(req, res, next) {
  try {
    if (!session) { // Solo obtener la sesión si no está ya obtenida
      const response = await axios.get(SESSION_URL);
      const match = response.data.match(/\$jwt = '([A-Za-z0-9=-_]+)'/);
      if (match) {
        session = Buffer.from(match[1], 'base64').toString('utf-8');
      }
    }
    next(); // Pasar al siguiente middleware
  } catch (err) {
    console.error('Error getting session:', err);
    res.status(500).json({ error: 'Error al obtener la sesión' });
  }
}

// Función para leer CSV y devolver los datos
function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (err) => reject(err));
  });
}

// Configurar Handlebars
app.engine('hbs', engine({
    extname: '.hbs',
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, 'views', 'layouts'),
    partialsDir: path.join(__dirname, 'views', 'partials'),
    helpers: {
      json: function(context) {
          return JSON.stringify(context);
      },
      baseUrl: () => {
        return ''; // Aquí podrías agregar la base URL si es necesario
      }
    }
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// Función para obtener la ubicación de un paradero y lo almacena
async function obtenerUbicacionYGuardar(codigoParadero) {
  try {
    const stopID = codigoParadero;
    const url1 = BASE_URL.replace('%s', session).replace('%s', stopID);

    // Realizar la primera solicitud
    const resp = await axios.get(url1);
    const { x: lat, y: lon } = resp.data;

    const csvWriter = createCsvWriter({
      path: outputFilePath2,
      header: [
        { id: 'codigoParadero', title: 'codigoParadero' },
        { id: 'latitud', title: 'latitud' },
        { id: 'longitud', title: 'longitud' }
      ],
      append: fs.existsSync(outputFilePath2) // Append si el archivo ya existe
    });

    const records = [{ codigoParadero, latitud: lat, longitud: lon }];
    await csvWriter.writeRecords(records); // Escribir el registro en el CSV

    return { codigoParadero, latitud: lat, longitud: lon };
    
  } catch (error) {
    console.error(`Error al obtener la ubicación del paradero ${codigoParadero}:`, error);
    return { codigoParadero, error: 'Hubo un error al obtener la información del paradero' };
  }
}

// Función para obtener la ubicación de un paradero y lo imprime
async function obtenerUbicacion(req, res, next) {
  try {
    const stopID = req.params.stopid || req.body.codigoParadero;
    const url1 = BASE_URL.replace('%s', session).replace('%s', stopID);

    // Realizar la primera solicitud
    const resp = await axios.get(url1);
    const { x: lat, y: lon } = resp.data;

    // Construir la consulta Overpass
    // const query = `[out:json];node(around:100,${lat},${lon})[highway=bus_stop];out;`;
    // const url = 'https://overpass-api.de/api/interpreter';

    // Realizar la solicitud a Overpass API
    // const response = await axios.post(url, `data=${query}`);
    // const { elements: busStops } = response.data;

    let latitud = '', longitud = '', ref = '';

    /*if (busStops.length > 0) {
      // Buscar el bus stop que coincida con el stopID
      const closestBusStop = busStops.find(stop => stop.tags && stop.tags.ref === stopID);

      if (closestBusStop) {
        latitud = closestBusStop.lat;
        longitud = closestBusStop.lon;
        ref = closestBusStop.tags.ref;
      } else {
        console.log('No se encontró un nodo de parada de bus con el ID proporcionado.');
      }
    }*/
   if(resp.data){
     latitud = lat;
     longitud = lon;
     ref = stopID;
   } else {
      console.log('No se encontraron nodos de paradas de bus cercanos.');
    }

    req.ubicacion = { latitud, longitud, ref };
    
    next();
    
  } catch (error) {
    console.error(`Error al obtener la ubicación del paradero ${req.params.stopid}:`, error);
    res.status(400).json({ error: 'Hubo un error al obtener la información del paradero' });
  }
}

// Middleware para parsear datos del formulario
app.use(express.urlencoded({ extended: true }));

// Middleware estático para servir archivos estáticos desde la carpeta 'assets'
app.use(express.static(path.join(__dirname, 'assets')));

// Rutas
app.get('/', (req, res) => {
    res.render('home');
});

app.post('/buscar', getSession , obtenerUbicacion, async (req, res) => {
  const codigoParadero = req.body.codigoParadero ? req.body.codigoParadero : req.ubicacion.ref;
  // Capturar el parámetro GET horaSeleccionada, si existe
  const horaSeleccionada = req.body.time;
  
  let formattedTimeInit, formattedTimeFinal;

    if (horaSeleccionada) {
      const date = horaSeleccionada.split(":");
      const hora = date[0];
      const minuto = date[1];
      // Utilizar la hora seleccionada en formato "HH:mm:00"
      formattedTimeInit = `${horaSeleccionada}`;
      formattedTimeFinal = `${hora}:${parseInt(minuto) + 29}:59`;
    } else {
      // Utilizar la hora actual en formato "HH:mm:00"
      const currentTime = new Date();
      const currentHour = currentTime.getHours();
      const currentMinutes = currentTime.getMinutes();

      formattedTimeInit = `${currentHour.toString().padStart(2, '0')}:${(Math.floor(currentMinutes / 30) * 30).toString().padStart(2, '0')}:00`;
      formattedTimeFinal = `${currentHour.toString().padStart(2, '0')}:${(Math.floor(currentMinutes / 30) * 30 + 29).toString().padStart(2, '0')}:59`;
    }

  const data = await readCSV('predicted_density_matrix.csv');

  // Buscar el paradero y el valor correspondiente a la hora actual
  const paraderoData = data.find(row => row.paradero === codigoParadero);
  const densidadActual = paraderoData ? (paraderoData[formattedTimeInit] || 0) : 0;
  const comuna = paraderoData ? (paraderoData['Comuna'] || 0) : 0;

  try {
    res.render('result', {
      codigoParadero,
      latitud: req.ubicacion.latitud,
      longitud: req.ubicacion.longitud,
      hora: `${formattedTimeInit} a ${formattedTimeFinal}`,
      densidad: densidadActual,
      comuna: comuna
    });
  }catch (error) {
    console.error('Error al obtener la ubicación del paradero:', error);
    res.render('result', {
          codigoParadero,
          error: 'Hubo un error al obtener la información del paradero'
      });
  }

});

// Ruta GET para obtener y mostrar las ubicaciones desde el CSV
app.get('/map', async (req, res) => {
    // Capturar el parámetro GET horaSeleccionada, si existe
    const horaSeleccionada = req.query.time;

    let formattedTimeInit, formattedTimeFinal;

    if (horaSeleccionada) {
      const date = horaSeleccionada.split(":");
      const hora = date[0];
      const minuto = date[1];
      // Utilizar la hora seleccionada en formato "HH:mm:00"
      formattedTimeInit = `${horaSeleccionada}`;
      formattedTimeFinal = `${hora}:${parseInt(minuto) + 29}:59`;
    } else {
      // Utilizar la hora actual en formato "HH:mm:00"
      const currentTime = new Date();
      const currentHour = currentTime.getHours();
      const currentMinutes = currentTime.getMinutes();

      formattedTimeInit = `${currentHour.toString().padStart(2, '0')}:${(Math.floor(currentMinutes / 30) * 30).toString().padStart(2, '0')}:00`;
      formattedTimeFinal = `${currentHour.toString().padStart(2, '0')}:${(Math.floor(currentMinutes / 30) * 30 + 29).toString().padStart(2, '0')}:59`;
    }
    const dataPredicha = await readCSV('predicted_density_matrix.csv');
    try {
      // Verificar si existe el archivo CSV de ubicaciones
      if (!fs.existsSync(outputFilePath2)) {
        return res.status(400).send('No se encontraron ubicaciones guardadas.');
      }
  
      // Leer el archivo CSV y obtener los registros
      const ubicaciones = [];
      fs.createReadStream(outputFilePath2)
        .pipe(csv())
        .on('data', (row) => {
          // Buscar el paradero y el valor correspondiente a la hora actual
          let paradero = row.codigoParadero
          const paraderoData = dataPredicha.find(row => row.paradero === paradero);
          const densidadActual = paraderoData ? (paraderoData[formattedTimeInit] || 0) : 0;
          const comuna = paraderoData ? (paraderoData['Comuna'] || 0) : 0;
          let ubicacion = {
              codigoParadero: row.codigoParadero,
              latitud: parseFloat(row.latitud),
              longitud: parseFloat(row.longitud),
              densidad: densidadActual,
              comuna: comuna
          };
          ubicaciones.push(ubicacion);
        })
        .on('end', () => {
          // Mostrar las ubicaciones obtenidas en la consola
          //console.log('Ubicaciones obtenidas:', ubicaciones);
          console.log("OK");      
          // Verificar el número de ubicaciones obtenidas
          if (ubicaciones.length === 0) {
              console.error('No se encontraron ubicaciones en el archivo CSV.');
              return res.status(400).send('No se encontraron ubicaciones en el archivo CSV.');
          }

          // Renderizar la vista con las ubicaciones encontradas
          res.render('map', { ubicaciones, hora: `${formattedTimeInit} a ${formattedTimeFinal}`});
        });
  
    } catch (error) {
      console.error('Error al leer el archivo CSV de ubicaciones:', error);
      res.status(500).send('Error al leer el archivo CSV de ubicaciones.');
    }
  });
  
// Ruta GET para procesar la obtención de ubicaciones y guardar en CSV
app.get('/obtener-ubicaciones', getSession ,async (req, res) => {
  try{
    await cargarCodigosParaderos(); // Cargar los nombres de los códigos de paradero desde la API de red
    
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
    
  }
  catch (error){
    console.error('Error al obtener y guardar paraderos:', error);
    res.status(500).json({ error: 'Hubo un error al procesar la solicitud.' });
  }
});

app.get('/paradero/:stopid', getSession, obtenerUbicacion, (req, res) => {
  res.json({lat: req.ubicacion.latitud, lon: req.ubicacion.longitud})
});

// Usar rutas

app.use('/old', old);

// Metadata
app.use('/metadata', recorrido);
app.use('/metadata', subidas);
app.use('/metadata', espera);
app.use('/metadata', aglomeracion);


// Amenazas
app.use('/threats', metro);
app.use('/threats', alerts);
app.use('/threats', traffic);
app.use('/threats', disponibilidad);
app.use('/threats', incidentes);
app.use('/threats', trafficGoogle);

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
