CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE aglomeracion (
    paradero VARCHAR(255) PRIMARY KEY,
    Comuna VARCHAR(255),
    "5:30:00" INT,
    "6:00:00" INT,
    "6:30:00" INT,
    "7:00:00" INT,
    "7:30:00" INT,
    "8:00:00" INT,
    "8:30:00" INT,
    "9:00:00" INT,
    "9:30:00" INT,
    "10:00:00" INT,
    "10:30:00" INT,
    "11:00:00" INT,
    "11:30:00" INT,
    "12:00:00" INT,
    "12:30:00" INT,
    "13:00:00" INT,
    "13:30:00" INT,
    "14:00:00" INT,
    "14:30:00" INT,
    "15:00:00" INT,
    "15:30:00" INT,
    "16:00:00" INT,
    "16:30:00" INT,
    "17:00:00" INT,
    "17:30:00" INT,
    "18:00:00" INT,
    "18:30:00" INT,
    "19:00:00" INT,
    "19:30:00" INT,
    "20:00:00" INT,
    "20:30:00" INT,
    "21:00:00" INT,
    "21:30:00" INT,
    "22:00:00" INT,
    "22:30:00" INT,
    "23:00:00" INT,
    "23:30:00" INT
);

CREATE TABLE subidas (
    paradero VARCHAR(255) PRIMARY KEY,
    Comuna VARCHAR(255),
    "5:30:00" INT,
    "6:00:00" INT,
    "6:30:00" INT,
    "7:00:00" INT,
    "7:30:00" INT,
    "8:00:00" INT,
    "8:30:00" INT,
    "9:00:00" INT,
    "9:30:00" INT,
    "10:00:00" INT,
    "10:30:00" INT,
    "11:00:00" INT,
    "11:30:00" INT,
    "12:00:00" INT,
    "12:30:00" INT,
    "13:00:00" INT,
    "13:30:00" INT,
    "14:00:00" INT,
    "14:30:00" INT,
    "15:00:00" INT,
    "15:30:00" INT,
    "16:00:00" INT,
    "16:30:00" INT,
    "17:00:00" INT,
    "17:30:00" INT,
    "18:00:00" INT,
    "18:30:00" INT,
    "19:00:00" INT,
    "19:30:00" INT,
    "20:00:00" INT,
    "20:30:00" INT,
    "21:00:00" INT,
    "21:30:00" INT,
    "22:00:00" INT,
    "22:30:00" INT,
    "23:00:00" INT,
    "23:30:00" INT
);

CREATE TABLE recorridos (
    id SERIAL PRIMARY KEY,
    geojson JSONB NOT NULL
);

CREATE TABLE espera_bus (
    id SERIAL PRIMARY KEY,
    servicio VARCHAR(10) NOT NULL,
    bus_id VARCHAR(20) NOT NULL,
    metros_distancia INT NOT NULL,
    tiempo_llegada_min INT NOT NULL,
    tiempo_llegada_max INT NOT NULL
);

CREATE TABLE traficos (
    id SERIAL PRIMARY KEY,
    geojson JSONB NOT NULL
);

CREATE TABLE alertas (
    id SERIAL PRIMARY KEY,
    geojson JSONB NOT NULL
);

CREATE TABLE metro (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    codigo VARCHAR(10) NOT NULL,
    estado VARCHAR(1) NOT NULL,
    combinacion VARCHAR(10),
    linea VARCHAR(10) NOT NULL
);
