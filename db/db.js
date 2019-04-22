/**********************************************************/
/* DATASTORE and associated functions */
/**********************************************************/
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

/* [START exports] */
module.exports = {
    datastore,
    insertRecord,
    getRecords,
};
/* [END exports] */