'use strict';

/**********************************************************/
/* CONFIG */
/**********************************************************/
const express = require('express');
const bodyParser = require('body-parser');
const app = express();

// ejs
app.set('view engine', 'ejs');
// Parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
// Parse application/json
app.use(bodyParser.json());

/**********************************************************/
/* ROUTES */
/**********************************************************/
const shipRoutes = require('./routes/ships');
const slipRoutes = require('./routes/slips');
const cargoRoutes = require('./routes/cargos');
app.use('/ships', shipRoutes);
app.use('/slips', slipRoutes);
app.use('/cargo', cargoRoutes); // "cargos" sounds weird

app.get('/', async (req, res, next) => {
    res.status(200);
    res.send('Hello from app engine!');
});

/**********************************************************/
/* GENERAL ERROR HANDLING */
/**********************************************************/
/* Basic 404 handler */
app.use((req, res) => {
    res.status(404).send('Resource not found');
})

/* General error handler */
app.use((err, req, res, next) => {
    res.status(err.resCode || 500).send(err.resMsg || 'Internal server error');
});

/* Listen to the App Engine-specified port,
 * or 8080 otherwise
 */
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}...`);
});

