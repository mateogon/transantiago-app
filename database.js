const { Client } = require('pg');
require('dotenv').config();

// Configuración de conexión a PostgreSQL usando variables de entorno
const client = new Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Función para iniciar la conexión
async function connect() {
  try {
      await client.connect();
      console.log('Conexión a PostgreSQL exitosa');
  } catch (err) {
      console.error('Error al conectar a PostgreSQL:', err);
      throw err;
  }
}

// Función para cerrar la conexión
async function disconnect() {
  try {
      await client.end();
      console.log('Conexión a PostgreSQL cerrada');
  } catch (err) {
      console.error('Error al cerrar la conexión de PostgreSQL:', err);
      throw err;
  }
}

async function insertData(instruccion) {
  const { tabla, datos, conflict = "" } = instruccion;

  // Verifica que haya datos y tabla definidos
  if (!tabla || !datos || Object.keys(datos).length === 0) {
    throw new Error('La tabla o los datos no están definidos correctamente.');
  }

  // Armar dinámicamente las columnas y los valores
  const columnas = Object.keys(datos).map(col => `"${col}"`);; // Asumimos que todas las entradas tienen las mismas columnas
  const valores = Object.values(datos);

  // Crear la consulta dinámica
  //const placeholders = columnas.map((_, i) => `$${i + 1}`).join(', ');
  const placeholders = valores.map((_, i) => `$${i + 1}`);
  const query = `
    INSERT INTO ${tabla} (${columnas.join(', ')})
    VALUES (${placeholders}) ${conflict}
  `;

  try {
    const res = await client.query(query, valores);
    return res.rows;
  } catch (err) {

    console.error('Error al almacenar los datos:', err);
    
    console.log(query);
    console.log(valores);
    throw err;
  }
}

module.exports = { connect, disconnect, insertData };