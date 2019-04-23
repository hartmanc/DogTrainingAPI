'use strict';

/**********************************************************/
/* CONFIG */
/**********************************************************/
const express = require('express');
const bodyParser = require('body-parser');
const app = express();

// Parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
// Parse application/json
app.use(bodyParser.json());

/**********************************************************/
/* ROUTES */
/**********************************************************/
const shipRoutes = require('./routes/ships');
const slipRoutes = require('./routes/slips');
app.use('/ships', shipRoutes);
app.use('/slips', slipRoutes);

app.get('/', async (req, res, next) => {
    res.status(200);
    res.send('Hello from app engine!');
    // // Create a record to store in the database
    // const visit = {
    //     timestamp: new Date(),
    // };

    // try { // FIXME: This is broken now, after using Google code in db.js
    //     await db.insertRecord(visit, 'visit');
    //     const results = await db.getRecords('visit');
    //     const entities = results[0];
    //     const visits = entities.map(entity => {
    //         return `KEY: ${entity[db.datastore.KEY].id} Time: ${entity.timestamp}`;
    //     });
    //     res
    //         .status(200)
    //         .set('Content-Type', 'text/plain')
    //         .send(`Last 10 visits:\n${visits.join('\n')}`)
    //         .end();
    // } catch (error) {
    //     next (error);
    // }
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

