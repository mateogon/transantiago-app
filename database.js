// Configuración de conexión a PostgreSQL usando variables de entorno
const client = new Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function insertData(data) {
    for (const row of data) {
      // Obtener las claves (nombres de las columnas) y valores
      const columns = Object.keys(row);
      const values = Object.values(row);
  
      // Crear una consulta dinámica
      const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
      const query = `INSERT INTO subidas (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`;
  
      try {
        const res = await client.query(query, values);
        console.log('Fila insertada:', res.rows[0]);
      } catch (err) {
        console.error('Error al insertar la fila:', err);
      }
    }
  }
