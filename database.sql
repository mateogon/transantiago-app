-- Extensión para GeoJson
CREATE EXTENSION IF NOT EXISTS postgis;

-- Extensión para dijkstra
CREATE EXTENSION IF NOT EXISTS pgrouting;

-- Extensión para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
--------------------------------------------------------------
-- Paraderos
CREATE TABLE paraderos (
    paradero VARCHAR(10) PRIMARY KEY,
    geom GEOMETRY(Point, 4326)
);
--------------------------------------------------------------
-- Recorridos
CREATE TABLE recorridos (
    id SERIAL PRIMARY KEY,
    origen VARCHAR(10) REFERENCES paraderos(paradero),
    destino VARCHAR(10) REFERENCES paraderos(paradero),
    distancia DOUBLE PRECISION,  -- Peso de la arista, puede ser la distancia entre los paraderos
    geom GEOMETRY(LineString, 4326)
);
--------------------------------------------------------------
-- Aglomeracion
CREATE TABLE aglomeracion (
    paradero VARCHAR(255) PRIMARY KEY,
    Comuna VARCHAR(255),
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
--------------------------------------------------------------
-- Subidas
CREATE TABLE subidas (
    paradero VARCHAR(255) PRIMARY KEY,
    Comuna VARCHAR(255),
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
--------------------------------------------------------------
-- Llegadas
CREATE TABLE espera_bus (
    id SERIAL PRIMARY KEY,
    servicio VARCHAR(10),
    bus_id VARCHAR(10),
    metros_distancia INTEGER,
    tiempo_llegada_min INTEGER,
    tiempo_llegada_max INTEGER
);
---------------------------------------------------------------
-- Alertas
CREATE TABLE alertas (
    id SERIAL PRIMARY KEY,
    country VARCHAR(2),                 -- Código de país
    city VARCHAR(100),             -- Ciudad
    street VARCHAR(255),              -- Calle
    type VARCHAR(50),        -- Tipo de reporte (HAZARD, JAM, etc.)
    subtype VARCHAR(100),            -- Subtipo de reporte
    reportRating INTEGER,              -- Calificación del reporte
    reliability INTEGER,           -- Confiabilidad del reporte
    confidence INTEGER,               -- Confianza del reporte
    reportBy VARCHAR(100),         -- Usuario que reporta
    nThumbsUp INTEGER,      -- Número de "pulgares arriba"
    nComments INTEGER,           -- Número de comentarios
    reportDescription TEXT,                -- Descripción del reporte
    additionalInfodisp TEXT,             -- Información adicional
    uuid UUID,                       -- Identificador único del reporte
    geom GEOMETRY(Point, 4326)       -- Geometría espacial con el sistema de coordenadas WGS84
);
----------------------------------------------------------------
-- Disponibilidad / Congestión
CREATE TABLE disponibilidad (
    id SERIAL PRIMARY KEY,
    to_name VARCHAR(255) NOT NULL,        -- Nombre del origen del tramo
    from_name VARCHAR(255) NOT NULL,           -- Nombre del destino del tramo
    custom_label VARCHAR(255),               -- Etiqueta personalizada para el tramo
    created_at TIMESTAMP NOT NULL,           -- Fecha y hora de creación del registro
    time INTEGER,                      -- Tiempo de recorrido en segundos
    jam_level INTEGER,                  -- Nivel de congestión (0 a 3)
    enabled BOOLEAN DEFAULT TRUE,     -- Si el tramo está habilitado (1) o no (0)
    length INTEGER                     -- Longitud del tramo en metros
);
------------------------------------------------------------------
-- estaciones metro
CREATE TABLE metro (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,            -- Nombre de la estación
    codigo VARCHAR(10) NOT NULL,             -- Código único de la estación
    estado BOOLEAN NOT NULL,                 -- Estado (1: en funcionamiento, 0: fuera de servicio)
    combinacion VARCHAR(50),                 -- Línea de combinación (si la hay)
    linea VARCHAR(10) NOT NULL               -- Línea de la estación
);
--------------------------------------------------------------------
-- trafico
CREATE TABLE trafico (
    id SERIAL PRIMARY KEY,
    geom GEOMETRY(LineString, 4326),
    descripcion TEXT
);
---------------------------------------------------------------------
-- trafico google
CREATE TABLE rutas_transporte (
    id SERIAL PRIMARY KEY,
    lugar_inicio VARCHAR(255),                      -- Dirección de inicio
    lugar_fin VARCHAR(255),                         -- Dirección de destino
    inicio_geom GEOGRAPHY(POINT, 4326),             -- Coordenadas de inicio (geométrica geográfica)
    fin_geom GEOGRAPHY(POINT, 4326),                -- Coordenadas de fin (geométrica geográfica)
    distancia INTEGER,                              -- Distancia en metros
    duracion INTEGER,                               -- Duración en segundos
    hora_salida TIMESTAMP,                          -- Hora de salida
    hora_llegada TIMESTAMP,                         -- Hora de llegada
    linea_transporte VARCHAR(50),                   -- Nombre o número de la línea de bus
    paradas INTEGER,                                -- Número de paradas
    ruta GEOGRAPHY(LINESTRING, 4326)                -- Línea poligonal de la ruta completa (Polyline)
);
