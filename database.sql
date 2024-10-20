#Extensión para GeoJson
CREATE EXTENSION IF NOT EXISTS postgis;

#Extensión para dijkstra
CREATE EXTENSION IF NOT EXISTS pgrouting;
--------------------------------------------------------------
#Recorridos
CREATE TABLE recorridos (
    paradero SERIAL PRIMARY KEY,
    descripcion VARCHAR(50),
    geom GEOMETRY(Geometry, 4326)
);
--------------------------------------------------------------
#Llegadas
CREATE TABLE espera_bus (
    id SERIAL PRIMARY KEY,
    servicio VARCHAR(10),
    bus_id VARCHAR(10),
    metros_distancia INTEGER,
    tiempo_llegada_min INTEGER,
    tiempo_llegada_max INTEGER
);
---------------------------------------------------------------
#alertas
CREATE TABLE alertas (
    id SERIAL PRIMARY KEY,
    pais VARCHAR(2),                 -- Código de país
    ciudad VARCHAR(100),             -- Ciudad
    calle VARCHAR(255),              -- Calle
    tipo_reporte VARCHAR(50),        -- Tipo de reporte (HAZARD, JAM, etc.)
    subtipo VARCHAR(100),            -- Subtipo de reporte
    valoracion INTEGER,              -- Calificación del reporte
    confiabilidad INTEGER,           -- Confiabilidad del reporte
    confianza INTEGER,               -- Confianza del reporte
    reportador VARCHAR(100),         -- Usuario que reporta
    n_pulgarres_arriba INTEGER,      -- Número de "pulgares arriba"
    n_comentarios INTEGER,           -- Número de comentarios
    descripcion TEXT,                -- Descripción del reporte
    info_adicional TEXT,             -- Información adicional
    uuid UUID,                       -- Identificador único del reporte
    geom GEOMETRY(Point, 4326)       -- Geometría espacial con el sistema de coordenadas WGS84
);
----------------------------------------------------------------
#disponibilidad / congestion
CREATE TABLE disponibilidad (
    id SERIAL PRIMARY KEY,
    inicio VARCHAR(255) NOT NULL,        -- Nombre del origen del tramo
    fin VARCHAR(255) NOT NULL,           -- Nombre del destino del tramo
    etiqueta VARCHAR(255),               -- Etiqueta personalizada para el tramo
    creado TIMESTAMP NOT NULL,           -- Fecha y hora de creación del registro
    tiempo INTEGER,                      -- Tiempo de recorrido en segundos
    congestion INTEGER,                  -- Nivel de congestión (0 a 3)
    habilitado BOOLEAN DEFAULT TRUE,     -- Si el tramo está habilitado (1) o no (0)
    longitud INTEGER                     -- Longitud del tramo en metros
);
------------------------------------------------------------------
#estaciones metro
CREATE TABLE metro (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,            -- Nombre de la estación
    codigo VARCHAR(10) NOT NULL,             -- Código único de la estación
    estado BOOLEAN NOT NULL,                 -- Estado (1: en funcionamiento, 0: fuera de servicio)
    combinacion VARCHAR(50),                 -- Línea de combinación (si la hay)
    linea VARCHAR(10) NOT NULL               -- Línea de la estación                        -- Campo para almacenar datos adicionales si es necesario
);
--------------------------------------------------------------------
#trafico
CREATE TABLE trafico (
    id SERIAL PRIMARY KEY,
    geom GEOMETRY(LineString, 4326),
    descripcion TEXT
);
---------------------------------------------------------------------
#trafico google
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
