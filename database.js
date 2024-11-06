const { Pool } = require('pg');
const express = require("express");
const router = express.Router();
require('dotenv').config();
require('dotenv').config();
const { Buffer } = require('buffer');

// Configurar el pool de conexiones a PostgreSQL usando variables de entorno
const pool = new Pool({
  user: process.env.DB_USER,         // Usuario de la base de datos
  host: process.env.DB_HOST,         // Host de la base de datos
  database: process.env.DB_DATABASE, // Nombre de la base de datos
  password: process.env.DB_PASSWORD, // Contraseña de la base de datos
  port: process.env.DB_PORT,         // Puerto de la base de datos
});


async function insertData(instruccion) {
  const { tabla, datos } = instruccion;

  // Verifica que haya datos y tabla definidos
  if (!tabla || !datos || datos.length === 0) {
    throw new Error('La tabla o los datos no están definidos correctamente.');
  }

  // Armar dinámicamente las columnas y los valores
  const columnas = Object.keys(datos[0]); // Asumimos que todas las entradas tienen las mismas columnas
  const valores = datos.map((dato) => Object.values(dato));

  // Crear la consulta dinámica
  const placeholders = valores.map(
    (valor, i) => `(${valor.map((_, j) => `$${i * valor.length + j + 1}`).join(', ')})`
  ).join(', ');

  const query = `
    INSERT INTO ${tabla} (${columnas.join(', ')})
    VALUES ${placeholders}
    RETURNING id;
  `;

  const flatValues = valores.flat(); // Aplanar el array de valores para pasarlo al query

  try {
    const res = await pool.query(query, flatValues);
    console.log('Datos almacenados con éxito en la tabla', tabla, 'con IDs:', res.rows.map(row => row.id));
    return res.rows;
  } catch (err) {
    console.error('Error al almacenar los datos:', err);
    throw err;
  }
}

module.exports = { router, pool };