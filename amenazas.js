const express = require('express');
const router = express.Router();
const { fetchAndTransformData, obtenerEstadosMetro, alertasGJ } = require('./amenProcessor');


const traffic = "https://www.waze.com/live-map/api/georss?top=-33.23896628638763&bottom=-33.65937371568267&left=-70.95859909057619&right=-70.328670501709&env=row&types=traffic";
const disponiblidad = "https://api.uoct.cl/api/v1/waze/routes/zone/all";
const metro = "https://www.metro.cl/api/estadoRedDetalle.php";
const alertas = "https://www.waze.com/live-map/api/georss?top=-33.23896628638763&bottom=-33.65937371568267&left=-70.95859909057619&right=-70.328670501709&env=row&types=alerts";

router.get('/trafico', async (req, res) => {
    try {
        const data = await fetchAndTransformData(traffic);

        if(data){
            console.log('OK');
            res.status(200).json(data);
        } else {
            res.status(404).json( { message: 'Datos no encontrados'} );
        }
    } catch (error) {
        console.error('Error en la importación:', error);
        res.status(500).json({ message: 'Error en la importación de datos.' });
    }
});

router.get('/metro', async (req, res) => {
    try {
        const data = await obtenerEstadosMetro(metro);

        if(data){
            console.log('OK');
            res.status(200).json(data);
        } else {
            res.status(404).json( { message: 'Datos no encontrados'} );
        }
    } catch (error) {
        console.error('Error en la importación:', error);
        res.status(500).json({ message: 'Error en la importación de datos.' });
    }
});

router.get('/alertas', async (req, res) => {
    try {
        const data = await alertasGJ(alertas);

        if(data){
            console.log('OK');
            res.status(200).json(data);
        } else {
            res.status(404).json( { message: 'Datos no encontrados'} );
        }
    } catch (error) {
        console.error('Error en la importación:', error);
        res.status(500).json({ message: 'Error en la importación de datos.' });
    }
});

module.exports = router;