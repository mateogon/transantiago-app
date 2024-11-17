// routeCalculation.js
const db = require('./database');

// Helper function to calculate the midpoint between two geographic coordinates
function calculateMidpoint(lat1, lon1, lat2, lon2) {
  const dLon = (lon2 - lon1) * (Math.PI / 180);

  // Convert to radians
  const lat1Rad = lat1 * (Math.PI / 180);
  const lat2Rad = lat2 * (Math.PI / 180);
  const lon1Rad = lon1 * (Math.PI / 180);

  const Bx = Math.cos(lat2Rad) * Math.cos(dLon);
  const By = Math.cos(lat2Rad) * Math.sin(dLon);

  const midLat = Math.atan2(
    Math.sin(lat1Rad) + Math.sin(lat2Rad),
    Math.sqrt((Math.cos(lat1Rad) + Bx) ** 2 + By ** 2)
  );

  const midLon = lon1Rad + Math.atan2(By, Math.cos(lat1Rad) + Bx);

  // Convert back to degrees
  return {
    lat: midLat * (180 / Math.PI),
    lon: midLon * (180 / Math.PI),
  };
}

// Helper function to calculate the distance between two geographic coordinates in meters using the Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Radius of the Earth in meters
  const φ1 = lat1 * (Math.PI / 180);
  const φ2 = lat2 * (Math.PI / 180);
  const Δφ = (lat2 - lat1) * (Math.PI / 180);
  const Δλ = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in meters
}

async function computeRoute(start_lat, start_lon, end_lat, end_lon, time, search_radius) {
  console.log('Starting computeRoute function');
  try {
    // Calculate midpoint and distance
    const midpoint = calculateMidpoint(parseFloat(start_lat), parseFloat(start_lon), parseFloat(end_lat), parseFloat(end_lon));
    const distance = calculateDistance(parseFloat(start_lat), parseFloat(start_lon), parseFloat(end_lat), parseFloat(end_lon));
    console.log(`Midpoint calculated at (${midpoint.lat}, ${midpoint.lon})`);
    console.log(`Distance between start and end: ${distance.toFixed(2)} meters`);

    // Define a buffer (e.g., 500 meters) to ensure coverage
    const buffer = 500; // meters

    const centralSearchRadius = 0.08

    // Iniciar una transacción
    console.log('Attempting to begin transaction...');
    await db.client.query('BEGIN');
    console.log('Transaction started');

    // Paso 1: Eliminar tablas temporales si existen
    console.log('Dropping existing temporary tables if any');
    await db.client.query(`
      DROP TABLE IF EXISTS paraderos_centrales CASCADE;
      DROP TABLE IF EXISTS paradero_ids CASCADE;
      DROP TABLE IF EXISTS paraderos_recorridos CASCADE;
      DROP TABLE IF EXISTS conexiones_cercanas CASCADE;
      DROP TABLE IF EXISTS coordenadas CASCADE;
      DROP TABLE IF EXISTS paraderos_cercanos CASCADE;
      DROP TABLE IF EXISTS paradero_pairs CASCADE;
      DROP TABLE IF EXISTS mejor_ruta CASCADE;
      DROP TABLE IF EXISTS ruta_mas_corta CASCADE;
      DROP TABLE IF EXISTS puntos_inicio_fin CASCADE;
    `);
    console.log('Temporary tables dropped');

    // Paso 2: Seleccionar un subconjunto de paraderos dentro de un radio específico desde el punto medio
    console.log('Creating paraderos_centrales table based on midpoint');
    await db.client.query(`
      CREATE TABLE paraderos_centrales AS
      SELECT p.*
      FROM paraderos p
      WHERE ST_DWithin(
          p.geom,
          ST_SetSRID(ST_MakePoint($1, $2), 4326),  -- Punto central (midpoint)
          $3
      );
    `, [midpoint.lon, midpoint.lat, centralSearchRadius]);
    console.log('paraderos_centrales table created');

    // Verificar que paraderos_centrales no esté vacío
    const paraderosCentralesCount = await db.client.query('SELECT COUNT(*) FROM paraderos_centrales');
    console.log(`paraderos_centrales contains ${paraderosCentralesCount.rows[0].count} records`);
    if (paraderosCentralesCount.rows[0].count === '0') {
      throw new Error('No se encontraron paraderos centrales dentro del radio de búsqueda especificado.');
    }

    // Crear índices en paraderos centrales
    console.log('Creating indexes on paraderos_centrales');
    await db.client.query(`
      CREATE INDEX IF NOT EXISTS idx_paraderos_centrales_geom ON paraderos_centrales USING GIST (geom);
      CREATE INDEX IF NOT EXISTS idx_paraderos_centrales_codigo ON paraderos_centrales (codigo);
    `);
    console.log('Indexes on paraderos_centrales created');

    // Paso 3: Crear una tabla de IDs únicos de paraderos centrales
    console.log('Creating paradero_ids table');
    await db.client.query(`
      CREATE TABLE paradero_ids AS
      SELECT DISTINCT
          codigo,
          row_number() OVER () AS id
      FROM paraderos_centrales;
    `);
    console.log('paradero_ids table created');

    // Verificar que paradero_ids no esté vacío
    const paraderoIdsCount = await db.client.query('SELECT COUNT(*) FROM paradero_ids');
    console.log(`paradero_ids contains ${paraderoIdsCount.rows[0].count} records`);
    if (paraderoIdsCount.rows[0].count === '0') {
      throw new Error('No se pudieron asignar IDs únicos a los paraderos centrales.');
    }

    // Crear índice en paradero_ids
    console.log('Creating index on paradero_ids');
    await db.client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_paradero_ids_codigo ON paradero_ids (codigo);
    `);
    console.log('Index on paradero_ids created');

    // Paso 4: Crear la tabla de mapeo paraderos_recorridos para los paraderos centrales
    console.log('Creating paraderos_recorridos table');
    await db.client.query(`
      CREATE TABLE paraderos_recorridos AS
      SELECT
          p.codigo AS paradero_codigo,
          r.codigo AS recorrido_codigo,
          ST_LineLocatePoint(r.geom, p.geom) AS position_along_recorrido
      FROM paraderos_centrales p
      JOIN LATERAL jsonb_array_elements(p.servicios) AS s ON true
      JOIN recorridos r ON r.codigo = s->>'name';
    `);
    console.log('paraderos_recorridos table created');

    // Verificar que paraderos_recorridos no esté vacío
    const paraderosRecorridosCount = await db.client.query('SELECT COUNT(*) FROM paraderos_recorridos');
    console.log(`paraderos_recorridos contains ${paraderosRecorridosCount.rows[0].count} records`);
    if (paraderosRecorridosCount.rows[0].count === '0') {
      throw new Error('No se encontraron recorridos asociados a los paraderos centrales.');
    }

    // Crear índices en paraderos_recorridos
    console.log('Creating indexes on paraderos_recorridos');
    await db.client.query(`
      CREATE INDEX IF NOT EXISTS paraderos_recorridos_paradero_idx ON paraderos_recorridos (paradero_codigo);
      CREATE INDEX IF NOT EXISTS paraderos_recorridos_recorrido_idx ON paraderos_recorridos (recorrido_codigo);
    `);
    console.log('Indexes on paraderos_recorridos created');

// Paso 5: Crear la tabla conexiones_cercanas con conexiones entre paraderos
console.log('Creating conexiones_cercanas table');
await db.client.query(`
  CREATE TABLE conexiones_cercanas AS
  SELECT DISTINCT
      p1.codigo AS paradero_origen,
      p2.codigo AS paradero_destino,
      pid1.id AS source_id,
      pid2.id AS target_id,
      ST_Distance(p1.geom::geography, p2.geom::geography) AS distancia,
      NULL::geometry(LineString, 4326) AS geom,
      pr1.recorrido_codigo,
      'route' AS edge_type
  FROM paraderos_centrales p1
  JOIN paraderos_centrales p2 ON p1.codigo != p2.codigo
  JOIN paradero_ids pid1 ON p1.codigo = pid1.codigo
  JOIN paradero_ids pid2 ON p2.codigo = pid2.codigo
  JOIN paraderos_recorridos pr1 ON pr1.paradero_codigo = p1.codigo
  JOIN paraderos_recorridos pr2 ON pr2.paradero_codigo = p2.codigo
  WHERE pr1.recorrido_codigo = pr2.recorrido_codigo
    AND pr1.position_along_recorrido < pr2.position_along_recorrido;
`);
console.log('conexiones_cercanas table created');



    // Verificar que conexiones_cercanas no esté vacío
    const conexionesCercanasCount = await db.client.query('SELECT COUNT(*) FROM conexiones_cercanas');
    console.log(`conexiones_cercanas contains ${conexionesCercanasCount.rows[0].count} records`);
    if (conexionesCercanasCount.rows[0].count === '0') {
      throw new Error('No se encontraron conexiones cercanas entre los paraderos centrales.');
    }

    // Crear índices en conexiones_cercanas
    console.log('Creating indexes on conexiones_cercanas');
    await db.client.query(`
      CREATE INDEX IF NOT EXISTS idx_conexiones_cercanas_source_target ON conexiones_cercanas (source_id, target_id);
      CREATE INDEX IF NOT EXISTS idx_conexiones_cercanas_geom ON conexiones_cercanas USING GIST (geom);
    `);
    console.log('Indexes on conexiones_cercanas created');

    // Paso 6: Actualizar conexiones_cercanas con geometrías de recorridos limitados a paraderos centrales
    console.log('Updating conexiones_cercanas with geometry data');
    await db.client.query(`
      UPDATE conexiones_cercanas cc
      SET geom = ST_LineSubstring(
          r.geom,
          pr1.position_along_recorrido,
          pr2.position_along_recorrido
      )
      FROM paraderos_recorridos pr1
      JOIN paraderos_recorridos pr2 ON pr1.recorrido_codigo = pr2.recorrido_codigo
      JOIN recorridos r ON r.codigo = pr1.recorrido_codigo
      WHERE cc.paradero_origen = pr1.paradero_codigo
        AND cc.paradero_destino = pr2.paradero_codigo
        AND pr1.position_along_recorrido < pr2.position_along_recorrido
        AND cc.recorrido_codigo = pr1.recorrido_codigo;
    `);
    console.log('conexiones_cercanas updated with geometry data');

    // Paso 7: Añadir columna 'id' a conexiones_cercanas como clave primaria
    console.log('Adding id column to conexiones_cercanas');
    await db.client.query(`
      ALTER TABLE conexiones_cercanas ADD COLUMN id SERIAL PRIMARY KEY;
    `);
    console.log('id column added to conexiones_cercanas');

    // Paso 8: Incorporar los datos de aglomeración y subidas en las conexiones
    console.log('Incorporating aglomeracion and subidas data into conexiones_cercanas');

    // Crear índices en aglomeracion y subidas
    await db.client.query(`
      CREATE INDEX IF NOT EXISTS idx_aglomeracion_paradero ON aglomeracion (paradero);
      CREATE INDEX IF NOT EXISTS idx_subidas_paradero ON subidas (paradero);
    `);
    console.log('Indexes on aglomeracion and subidas created');

    // Agregar columnas de aglomeracion y subidas a conexiones_cercanas
    await db.client.query(`
      ALTER TABLE conexiones_cercanas
      ADD COLUMN aglomeracion_origen FLOAT,
      ADD COLUMN aglomeracion_destino FLOAT,
      ADD COLUMN subidas_origen FLOAT,
      ADD COLUMN subidas_destino FLOAT;
    `);
    console.log('Added aglomeracion and subidas columns to conexiones_cercanas');

    console.log('Duplicate edges removed from conexiones_cercanas');

    // Definir la hora (ejemplo: '15:00:00')
    const timeColumn = `"${time}"`;
    console.log(`Using time column: ${timeColumn}`);

    // Verificar que las columnas de tiempo existen en aglomeracion y subidas
    const columnCheck = await db.client.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'aglomeracion' AND column_name = $1
        UNION ALL
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'subidas' AND column_name = $1
    `, [time]);
    console.log(`Found ${columnCheck.rows.length} columns matching time ${time}`);
    if (columnCheck.rows.length < 2) { // Should find in both tables
        throw new Error(`La columna de tiempo "${time}" no existe en las tablas aglomeracion y/o subidas.`);
    }
  

    // Actualizar conexiones_cercanas con datos de aglomeracion y subidas
    console.log('Updating conexiones_cercanas with aglomeracion and subidas data');
    await db.client.query(`
      WITH data_to_update AS (
          SELECT
              cc.paradero_origen,
              cc.paradero_destino,
              ag.${timeColumn} AS aglomeracion_origen,
              ag_dest.${timeColumn} AS aglomeracion_destino,
              su.${timeColumn} AS subidas_origen,
              su_dest.${timeColumn} AS subidas_destino
          FROM conexiones_cercanas cc
          JOIN aglomeracion ag ON ag.paradero = cc.paradero_origen
          JOIN aglomeracion ag_dest ON ag_dest.paradero = cc.paradero_destino
          JOIN subidas su ON su.paradero = cc.paradero_origen
          JOIN subidas su_dest ON su_dest.paradero = cc.paradero_destino
      )
      UPDATE conexiones_cercanas cc
      SET
          aglomeracion_origen = d.aglomeracion_origen,
          aglomeracion_destino = d.aglomeracion_destino,
          subidas_origen = d.subidas_origen,
          subidas_destino = d.subidas_destino
      FROM data_to_update d
      WHERE
          cc.paradero_origen = d.paradero_origen
          AND cc.paradero_destino = d.paradero_destino;
    `);
    console.log('conexiones_cercanas updated with aglomeracion and subidas data');

    // Verificar que las columnas se actualizaron correctamente
    const aglomeracionCheck = await db.client.query(`
      SELECT COUNT(*) FROM conexiones_cercanas WHERE aglomeracion_origen IS NULL OR aglomeracion_destino IS NULL;
    `);
    console.log(`Number of conexiones_cercanas with NULL aglomeracion: ${aglomeracionCheck.rows[0].count}`);
    if (aglomeracionCheck.rows[0].count > 0) {
      console.warn('Algunas conexiones_cercanas tienen valores NULL en aglomeracion_origen o aglomeracion_destino.');
    }

    // Paso 9: Incorporar datos de amenazas de tráfico
    console.log('Incorporating traffic data into conexiones_cercanas');

    // Agregar columnas de tráfico
    await db.client.query(`
      ALTER TABLE conexiones_cercanas
      ADD COLUMN traffic_delay DOUBLE PRECISION,
      ADD COLUMN traffic_severity INT;
    `);
    console.log('Added traffic_delay and traffic_severity columns to conexiones_cercanas');

    // Actualizar conexiones_cercanas con datos de tráfico
    await db.client.query(`
      WITH traffic_data AS (
          SELECT
              cc.id AS conexion_id,
              AVG(t.delay) AS avg_delay,
              MAX(t.severity) AS max_severity
          FROM conexiones_cercanas cc
          JOIN trafico t ON ST_Intersects(cc.geom, t.geom)
          WHERE t.block_start_time <= NOW()
            AND t.block_expiration >= NOW()
          GROUP BY cc.id
      )
      UPDATE conexiones_cercanas cc
      SET
          traffic_delay = td.avg_delay,
          traffic_severity = td.max_severity
      FROM traffic_data td
      WHERE cc.id = td.conexion_id;
    `);
    console.log('conexiones_cercanas updated with traffic data');

    // Verificar que las columnas de tráfico se actualizaron correctamente
    const trafficCheck = await db.client.query(`
      SELECT COUNT(*) FROM conexiones_cercanas WHERE traffic_delay IS NULL OR traffic_severity IS NULL;
    `);
    console.log(`Number of conexiones_cercanas with NULL traffic data: ${trafficCheck.rows[0].count}`);
    if (trafficCheck.rows[0].count > 0) {
      console.warn('Algunas conexiones_cercanas tienen valores NULL en traffic_delay o traffic_severity.');
    }

    // Paso 10: Calcular el costo ajustado considerando aglomeracion, subidas y tráfico
    console.log('Calculating adjusted cost for conexiones_cercanas');
    await db.client.query(`
      ALTER TABLE conexiones_cercanas ADD COLUMN cost DOUBLE PRECISION;
    `);
    console.log('Added cost column to conexiones_cercanas');

    await db.client.query(`
      UPDATE conexiones_cercanas
    SET cost = COALESCE(distancia, 0)
        + 0.005 * COALESCE(aglomeracion_origen, 0) + COALESCE(aglomeracion_destino, 0)
        + 0.003 * COALESCE(subidas_origen, 0) + COALESCE(subidas_destino, 0)
        + COALESCE(0.001 * traffic_delay, 0)
        + COALESCE(0.05 * traffic_severity, 0);

    `);
    console.log('Cost calculated and updated in conexiones_cercanas');

    // Verificar que los costos se calcularon correctamente
    const costCheck = await db.client.query(`
      SELECT COUNT(*) FROM conexiones_cercanas WHERE cost IS NULL;
    `);
    console.log(`Number of conexiones_cercanas with NULL cost: ${costCheck.rows[0].count}`);
    if (costCheck.rows[0].count > 0) {
      console.warn('Algunas conexiones_cercanas tienen valores NULL en cost.');
    }


    // Paso 12: Crear la tabla coordenadas (definir puntos de inicio y fin)
    console.log('Creating coordenadas table');
    await db.client.query(`
      CREATE TABLE coordenadas AS
      SELECT
          ST_SetSRID(ST_MakePoint($1, $2), 4326) AS geom_inicio,  -- Inicio
          ST_SetSRID(ST_MakePoint($3, $4), 4326) AS geom_fin;       -- Fin
    `, [start_lon, start_lat, end_lon, end_lat]);
    console.log('coordenadas table created');


    console.log('Creating paraderos_cercanos table with KNN');
    await db.client.query(`
    CREATE TABLE paraderos_cercanos AS
    (
        SELECT
            'origin' AS tipo,
            pid.id AS paradero_id,
            p.geom,
            ST_Distance(p.geom::geography, c.geom_inicio::geography) AS distance
        FROM paradero_ids pid
        JOIN paraderos_centrales p ON pid.codigo = p.codigo
        CROSS JOIN coordenadas c
        ORDER BY p.geom <-> c.geom_inicio
        LIMIT 10
    )
    UNION ALL
    (
        SELECT
            'destination' AS tipo,
            pid.id AS paradero_id,
            p.geom,
            ST_Distance(p.geom::geography, c.geom_fin::geography) AS distance
        FROM paradero_ids pid
        JOIN paraderos_centrales p ON pid.codigo = p.codigo
        CROSS JOIN coordenadas c
        ORDER BY p.geom <-> c.geom_fin
        LIMIT 10
    );
    `);
console.log('paraderos_cercanos table created');

    console.log('paraderos_cercanos table created with KNN');

    // Verificar que paraderos_cercanos no esté vacío
    const paraderosCercanosCount = await db.client.query('SELECT COUNT(*) FROM paraderos_cercanos');
    console.log(`paraderos_cercanos contains ${paraderosCercanosCount.rows[0].count} records`);
    if (paraderosCercanosCount.rows[0].count === '0') {
    throw new Error('No se encontraron paraderos cercanos al inicio o destino.');
    }

    // Indexar 'paraderos_cercanos'
    console.log('Creating index on paraderos_cercanos');
    await db.client.query(`
    CREATE INDEX IF NOT EXISTS idx_paraderos_cercanos_tipo ON paraderos_cercanos (tipo, paradero_id);
    `);
    console.log('Index on paraderos_cercanos created');

    // Paso 14: Crear 'paradero_pairs' (combinaciones de paraderos origen-destino)
    console.log('Creating paradero_pairs table');
    await db.client.query(`
    CREATE TABLE paradero_pairs AS
    SELECT
        origin.paradero_id AS origin_id,
        destination.paradero_id AS destination_id
    FROM
        (SELECT paradero_id FROM paraderos_cercanos WHERE tipo = 'origin') AS origin,
        (SELECT paradero_id FROM paraderos_cercanos WHERE tipo = 'destination') AS destination;
    `);
    console.log('paradero_pairs table created');

    // Verificar que paradero_pairs no esté vacío
    const paraderoPairsCount = await db.client.query('SELECT COUNT(*) FROM paradero_pairs');
    console.log(`paradero_pairs contains ${paraderoPairsCount.rows[0].count} records`);
    if (paraderoPairsCount.rows[0].count === '0') {
    throw new Error('No se pudieron crear pares de paraderos para calcular la ruta.');
    }

    // Indexar 'paradero_pairs'
    console.log('Creating index on paradero_pairs');
    await db.client.query(`
      CREATE INDEX IF NOT EXISTS idx_paradero_pairs_origin_dest ON paradero_pairs (origin_id, destination_id);
    `);
    console.log('Index on paradero_pairs created');

    // Paso 15: Ejecutar pgr_dijkstra para encontrar la ruta más corta
console.log('Executing pgr_dijkstra to find the shortest route');
const routeQuery = `
  WITH ruta AS (
    SELECT
      pair.origin_id,
      pair.destination_id,
      pgr.path_seq,
      pgr.edge,
      pgr.cost
    FROM paradero_pairs pair
    JOIN pgr_dijkstra(
      'SELECT id, source_id AS source, target_id AS target, cost FROM conexiones_cercanas WHERE cost IS NOT NULL',
      pair.origin_id,
      pair.destination_id,
      true
    ) AS pgr
      ON true
    WHERE pgr.edge <> -1  -- Exclude artificial edges
  )
  SELECT
    ruta.*,
    cc.paradero_origen,
    cc.paradero_destino,
    cc.recorrido_codigo,
    cc.geom,
    ST_AsText(cc.geom) AS geom_wkt,
    cc.aglomeracion_origen,
    cc.aglomeracion_destino,
    cc.subidas_origen,
    cc.subidas_destino
  FROM ruta
  JOIN conexiones_cercanas cc ON ruta.edge = cc.id
  ORDER BY ruta.path_seq;
`;

const routeResult = await db.client.query(routeQuery);
console.log('pgr_dijkstra executed');


    // Verificar si se encontraron rutas
    if (routeResult.rows.length === 0) {
      throw new Error('No se pudo encontrar una ruta entre los puntos seleccionados.');
    }
    console.log(`Found ${routeResult.rows.length} route segments`);
    console.log('Raw route result:', routeResult.rows);

    // Procesar los datos de la ruta
    const routeData = routeResult.rows.map((row) => ({
        seq: row.path_seq ?? 0, // Use path_seq from pgr_dijkstra
        edge: row.edge ?? null,
        cost: parseFloat(row.cost) || 0, // Ensure numeric cost
        paradero_origen: row.paradero_origen ?? 'Desconocido',
        paradero_destino: row.paradero_destino ?? 'Desconocido',
        recorrido_codigo: row.recorrido_codigo ?? 'Sin Código',
        geom_wkt: row.geom_wkt ?? null,
        aglomeracion_origen: row.aglomeracion_origen ?? 0,
        aglomeracion_destino: row.aglomeracion_destino ?? 0,
        subidas_origen: row.subidas_origen ?? 0,
        subidas_destino: row.subidas_destino ?? 0,
    }));
    console.log('Route data processed:', routeData);
    
      

    // Verificar que routeData tenga contenido
    if (routeData.length === 0) {
      throw new Error('La ruta calculada no contiene segmentos.');
    }

    // Commit the transaction
    await db.client.query('COMMIT');
    console.log('Transaction committed');

    return routeData;
  } catch (error) {
    // Rollback in case of error
    try {
      await db.client.query('ROLLBACK');
      console.log('Transaction rolled back');
    } catch (rollbackError) {
      console.error('Error during transaction rollback:', rollbackError.message);
    }
    console.error('Error in computeRoute:', error.message);
    throw error;
  }
}

module.exports = { computeRoute };
