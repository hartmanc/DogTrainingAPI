'use strict';

const express = require('express');
const app = express();
const db = require('./db/db');

/**********************************************************/
/* ROUTES */
/**********************************************************/
const shipRoutes = require('./routes/ships');
const slipRoutes = require('./routes/slips');
app.use('/ships', shipRoutes);
app.use('/slips', slipRoutes);

app.get('/', async (req, res, next) => {
    // res.send('Hello from app engine!');
    // Create a record to store in the database
    const visit = {
        timestamp: new Date(),
    };

    try {
        await db.insertRecord(visit, 'visit');
        const results = await db.getRecords('visit');
        const entities = results[0];
        const visits = entities.map(entity => {
            return `KEY: ${entity[db.datastore.KEY].id} Time: ${entity.timestamp}`;
        });
        res
            .status(200)
            .set('Content-Type', 'text/plain')
            .send(`Last 10 visits:\n${visits.join('\n')}`)
            .end();
    } catch (error) {
        next (error);
    }
});

/* Listen to the App Engine-specified port,
 * or 8080 otherwise
 */
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}...`);
});

