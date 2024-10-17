const express = require('express');
const router = express.Router();

const traffic = "https://www.waze.com/live-map/api/georss?top=-33.23896628638763&bottom=-33.65937371568267&left=-70.95859909057619&right=-70.328670501709&env=row&types=traffic";
const disponiblidad = "https://api.uoct.cl/api/v1/waze/routes/zone/all";
const metro = "https://api.uoct.cl/api/v1/waze/routes/zone/all/";
const alertas = "https://www.waze.com/live-map/api/georss?top=-33.23896628638763&bottom=-33.65937371568267&left=-70.95859909057619&right=-70.328670501709&env=row&types=alerts";

router.post('/trafico', (req, res) => {

});

module.exports = router;