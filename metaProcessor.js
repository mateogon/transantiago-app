const axios = require('axios');
const unzipper = require('unzipper');
const fs = require('fs');
const xlsb = require('xlsx');
const path = require('path');
const csv = require('csv-parser');

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

// Procesar Recorridos
async function obtenerDatosYProcesar(url) {
  try {
    // Hacer la solicitud para obtener el JSON
    const response = await axios.get(url);
    const data = response.data;

    // Extraemos el path y los paraderos
    const path = data.ida.path;
    const paraderos = data.ida.paraderos.map(p => p.pos);

    // Función para encontrar el índice más cercano en el path
    function encontrarIndiceMasCercano(coordenadas, path) {
      let indiceMasCercano = 0;
      let distanciaMinima = Infinity;
      for (let i = 0; i < path.length; i++) {
        const [lat, lon] = path[i];
        const distancia = Math.sqrt(
          Math.pow(coordenadas[0] - lat, 2) + Math.pow(coordenadas[1] - lon, 2)
        );
        if (distancia < distanciaMinima) {
          distanciaMinima = distancia;
          indiceMasCercano = i;
        }
      }
      return indiceMasCercano;
    }

    // Crear el array de GeoJSON Features
    const geoJsonFeatures = [];
    
    for (let i = 0; i < paraderos.length - 1; i++) {
      const inicio = encontrarIndiceMasCercano(paraderos[i], path);
      const fin = encontrarIndiceMasCercano(paraderos[i + 1], path);
      const segmentoPath = path.slice(inicio, fin + 1);

      // Agregar Point del paradero
      geoJsonFeatures.push({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [paraderos[i][1], paraderos[i][0]] // long, lat
        },
        properties: {
          description: `${data.ida.paraderos[i].cod}`
        }
      });

      // Agregar LineString
      geoJsonFeatures.push({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: segmentoPath.map(([lat, lon]) => [lon, lat])
        },
        properties: {
          description: `${data.ida.paraderos[i].cod} ${data.ida.paraderos[i + 1].cod}`
        }
      });

      // Agregar Point del siguiente paradero
      geoJsonFeatures.push({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [paraderos[i + 1][1], paraderos[i + 1][0]] // long, lat
        },
        properties: {
          description: `${data.ida.paraderos[i+1].cod}`
        }
      });
    }

    // Imprimir los Features de GeoJSON generados
    const geoJson = {
      type: "FeatureCollection",
      features: geoJsonFeatures
    };

    //console.log(JSON.stringify(geoJson, null, 2));
    return geoJson;

  } catch (error) {
    console.error('Error al obtener los datos:', error);
  }
}

// Procesar llegadas
async function obtenerLlegadas(url) {
  try {
    const response = await axios.get(url);
    const data = response.data;

    // Llama a la función que procesa los datos del JSON
    const datosProcesados = obtenerDatosServicios(data);
    // console.log(datosProcesados);
    return datosProcesados;

  } catch (error) {
    console.error("Error al obtener los datos:", error);
  }
}

function obtenerDatosServicios(data) {
  const resultado = [];

  data.services.forEach((servicio) => {
    const servicioId = servicio.id;

    servicio.buses.forEach((bus) => {
      const busData = {
        servicio: servicioId,
        bus_id: bus.id,
        metros_distancia: bus.meters_distance,
        tiempo_llegada_min: bus.min_arrival_time,
        tiempo_llegada_max: bus.max_arrival_time
      };
      resultado.push(busData);
    });
  });

  return resultado;
}

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

module.exports = { downloadAndProcessZip, obtenerDatosYProcesar, obtenerLlegadas, obtenerAglomeracion };

