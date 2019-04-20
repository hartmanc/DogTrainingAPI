'use strict';

const express = require('express');
const app = express();

/* By default, the client will authenticate using the service 
 * account file specified by the GOOGLE_APPLICATION_CREDENTIALS
 * environment variable and use the project specified by the
 * GOOGLE_CLOUD_PROJECT environment variable. These environment
 * variables are set automatically on Google App Engine.
 */
const {Datastore} = require('@google-cloud/datastore');

/* Instantiate a datastore client */
const datastore = new Datastore();

/**
 * Insert a record into the database.
 */
function insertRecord(record, recordType) {
    return datastore.save({
        key: datastore.key(recordType),
        data: record,
    });
}

/**
 * Retrieve the latest 10 records from the database
 */
function getRecords(recordType) {
    const query = datastore
        .createQuery(recordType)
        .order('timestamp', {descending: true})
        .limit(10);

    return datastore.runQuery(query);
}

app.get('/', async (req, res, next) => {
    // res.send('Hello from app engine!');
    // Create a record to store in the database
    const visit = {
        timestamp: new Date(),
    };

    try {
        await insertRecord(visit, 'visit');
        const results = await getRecords('visit');
        const entities = results[0];
        const visits = entities.map(
            entity => `Time: ${entity.timestamp}`
        );
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

