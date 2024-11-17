--Extensión para GeoJson
CREATE EXTENSION IF NOT EXISTS postgis;

--Extensión para dijkstra
CREATE EXTENSION IF NOT EXISTS pgrouting;

--Extensión para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-------------------------------------------------------------------------------------------------------------------------------------------
--Aglomeracion
CREATE TABLE aglomeracion (
    paradero VARCHAR(255) PRIMARY KEY,                          --Código paradero
    comuna VARCHAR(255),                                        --Comuna del paradero
    "5:30:00" FLOAT,
    "6:00:00" FLOAT,
    "6:30:00" FLOAT,
    "7:00:00" FLOAT,
    "7:30:00" FLOAT,
    "8:00:00" FLOAT,
    "8:30:00" FLOAT,
    "9:00:00" FLOAT,
    "9:30:00" FLOAT,
    "10:00:00" FLOAT,
    "10:30:00" FLOAT,
    "11:00:00" FLOAT,
    "11:30:00" FLOAT,
    "12:00:00" FLOAT,
    "12:30:00" FLOAT,
    "13:00:00" FLOAT,
    "13:30:00" FLOAT,
    "14:00:00" FLOAT,
    "14:30:00" FLOAT,
    "15:00:00" FLOAT,
    "15:30:00" FLOAT,
    "16:00:00" FLOAT,
    "16:30:00" FLOAT,
    "17:00:00" FLOAT,
    "17:30:00" FLOAT,
    "18:00:00" FLOAT,
    "18:30:00" FLOAT,
    "19:00:00" FLOAT,
    "19:30:00" FLOAT,
    "20:00:00" FLOAT,
    "20:30:00" FLOAT,
    "21:00:00" FLOAT,
    "21:30:00" FLOAT,
    "22:00:00" FLOAT,
    "22:30:00" FLOAT,
    "23:00:00" FLOAT,
    "23:30:00" FLOAT
);
-------------------------------------------------------------------------------------------------------------------------------------
--Subidas
CREATE TABLE subidas (
    paradero VARCHAR(255) PRIMARY KEY,                          --Código del paradero
    comuna VARCHAR(255),                                        --Comuna del paradero
    "5:30:00" FLOAT,
    "6:00:00" FLOAT,
    "6:30:00" FLOAT,
    "7:00:00" FLOAT,
    "7:30:00" FLOAT,
    "8:00:00" FLOAT,
    "8:30:00" FLOAT,
    "9:00:00" FLOAT,
    "9:30:00" FLOAT,
    "10:00:00" FLOAT,
    "10:30:00" FLOAT,
    "11:00:00" FLOAT,
    "11:30:00" FLOAT,
    "12:00:00" FLOAT,
    "12:30:00" FLOAT,
    "13:00:00" FLOAT,
    "13:30:00" FLOAT,
    "14:00:00" FLOAT,
    "14:30:00" FLOAT,
    "15:00:00" FLOAT,
    "15:30:00" FLOAT,
    "16:00:00" FLOAT,
    "16:30:00" FLOAT,
    "17:00:00" FLOAT,
    "17:30:00" FLOAT,
    "18:00:00" FLOAT,
    "18:30:00" FLOAT,
    "19:00:00" FLOAT,
    "19:30:00" FLOAT,
    "20:00:00" FLOAT,
    "20:30:00" FLOAT,
    "21:00:00" FLOAT,
    "21:30:00" FLOAT,
    "22:00:00" FLOAT,
    "22:30:00" FLOAT,
    "23:00:00" FLOAT,
    "23:30:00" FLOAT
);
------------------------------------------------------------------------------------------------------------------------------------------
--Espera
CREATE TABLE espera (
    id SERIAL PRIMARY KEY,                                      --Identificador único
    paradero VARCHAR(20) NOT NULL,                              --Código del paradero consultado
    servicio VARCHAR(10) NOT NULL,                              --Recorrido de bus en camino
    bus VARCHAR(20) NOT NULL,                                   --Identificador del bus
    distancia INT NOT NULL,                                     --Distancia (en metros) del bus al paradero consultado
    llegada_min INT NOT NULL,                                   --Tiempo mínimo estimado de llegada del bus
    llegada_max INT NOT NULL,                                   --Tiempo máximo estimado de llegada del bus
    consulta TIMESTAMP DEFAULT CURRENT_TIMESTAMP                --Tiempo en el que se realizó la consulta
);
------------------------------------------------------------------------------------------------------------------------------------------
                --Infraestructura
--Recorridos
CREATE TABLE recorridos (
    codigo VARCHAR(50) PRIMARY KEY,
    geom geometry(LINESTRING, 4326) -- Usamos el tipo LINESTRING con SRID 4326 (WGS 84)
);
--Paraderos
CREATE TABLE paraderos (
    codigo VARCHAR(50) PRIMARY KEY,                             --Código del paradero
    geom GEOMETRY(Point, 4326),                          --Coordenadas del paradero         
    servicios JSONB            
);
--Calles
CREATE TABLE calles (
    id SERIAL PRIMARY KEY,                                      --Identificador único
    origen VARCHAR(10) REFERENCES paraderos(codigo),            --Paradero de origen
    destino VARCHAR(10) REFERENCES paraderos(codigo),           --Paradero de destino
    distancia DOUBLE PRECISION,                                 --Peso de la arista, puede ser la distancia entre los paraderos
    geom GEOMETRY(LineString, 4326)                             --Coordenadas que unen los paraderos
);
----------------------------------------------------------------------------------------------------------------------------------------
--Alertas
CREATE TABLE alertas (
    uuid UUID PRIMARY KEY,                                      --ID único del reporte
    calle VARCHAR(100),                                         --Calle donde se origina el incidente
    tipo VARCHAR(50),                                           --Tipo de alerta (policia, tráfico, calle cerrada)
    subtipo VARCHAR(50),                                        --Subtipo (alta congestión)
    geom GEOGRAPHY(POINT, 4326)                                 --Coordenadas del reporte
);
------------------------------------------------------------------------------------------------------------------------------------------
--Metro
CREATE TABLE metro (
    id SERIAL PRIMARY KEY,                                      --Identificador único
    nombre VARCHAR(255) NOT NULL,                               --Nombre de la estación
    codigo VARCHAR(10) NOT NULL UNIQUE,                         --Código único para la estación (siglas)
    estado VARCHAR(1) NOT NULL,                                 --Estado de la estación
    combinacion VARCHAR(10),                                    --Línea con la que se combina (puede ser NULL)
    linea VARCHAR(10) NOT NULL                                  --Línea a la que pertenece la estación
);
------------------------------------------------------------------------------------------------------------------------------------------
CREATE TABLE trafico (
    id SERIAL PRIMARY KEY,                                      -- Identificador único para cada evento de tráfico
    geom GEOMETRY(LineString, 4326),                            -- Geometría del evento de tráfico (línea representando el incidente)
    descripcion VARCHAR(255),                                   -- Descripción del evento o bloqueo (ejemplo: trabajos, cierre de carretera)
    severity INTEGER,                                           -- Nivel de severidad (1-5, donde 5 es el más severo)
    delay INTEGER,                                              -- Retraso causado por el evento de tráfico (en segundos)
    block_type VARCHAR(255),                                    -- Tipo de evento (ejemplo: ROAD_CLOSED_EVENT, CONGESTION)
    road_type INTEGER,                                          -- Tipo de carretera (ejemplo: autopista, arteria principal)
    block_start_time TIMESTAMP,                                 -- Hora en que comenzó el evento
    block_expiration TIMESTAMP,                                 -- Hora en que se espera que finalice el evento
    creation_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP           -- Hora de creación del registro en la base de datos
);
CREATE INDEX IF NOT EXISTS idx_threat_geom ON threat USING GIST (geom);
------------------------------------------------------------------------------------------------------------------------------------------
--Incidentes
CREATE TABLE incidentes(
    id INT PRIMARY KEY,                                         -- ID único para cada incidente
    fecha TIMESTAMP,                                            -- Fecha de publicación del post
    titulo TEXT,                                                -- Título del incidente
    post_url VARCHAR(255)                                       -- URL del post para acceso directo
);
-------------------------------------------------------------------------------------------------------------------------------------------
--Disponibilidad UOCT
CREATE TABLE disponibilidad (
    id SERIAL PRIMARY KEY,                                      -- Identificador único
    origen VARCHAR(255) NOT NULL,                               -- Lugar de origen
    destino VARCHAR(255) NOT NULL,                              -- Lugar de término
    descripcion VARCHAR(255),                                   -- Descripción del incidente
    fecha_creacion TIMESTAMP,                                   -- Fecha de creación 
    tiempo_trayecto INTEGER,                                    -- Tiempo que se demora en recorrer el trayecto
    nivel_congestion INTEGER,                                   -- Nivel de congestión del segmento
    habilitado BOOLEAN,                                         -- Si el segmento se encuentra habilitado para la circulación
    largo_segmento INTEGER,                                      -- Largo del segmento del incidente
    UNIQUE (origen, destino)                                    -- Restricción única para la combinación de origen y destino
);
-----------------------------------------------------------------------------------------------------------------------------------------------
        --Trafico Google
--Rutas
CREATE TABLE rutas (
  id SERIAL PRIMARY KEY,
  origen GEOGRAPHY(Point),
  destino GEOGRAPHY(Point),
  distancia NUMERIC,
  duracion INTERVAL,
  polyline TEXT,
  steps JSONB
);
