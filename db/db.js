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
const HOST_NAME = require('../config');

/* Instantiate a datastore client */
const datastore = new Datastore();

/* Global kind / route library */
routes = {
    Training: "trainings",
    Dog: "dogs",
    User: "users"
}

/* Translates datastore entity into format expected by app
 */
function fromDatastore(obj) {
    obj.id = obj[Datastore.KEY].id || obj.id;
    // obj.self = `${HOST_NAME}/${routes[obj[Datastore.KEY].kind]}/${obj.id}`;
    return obj;
}

/* Translates from app format to datastore's expected entity
 * property format. Also handles marking any specified properties
 * as non-indexed. Does NOT translate the key.
 */
function toDatastore(obj, nonIndexed) {
    nonIndexed = nonIndexed || [];
    const results = [];
    Object.keys(obj).forEach(k => {
        if (obj[k] === undefined) {
            return;
        }
        results.push({
            name: k,
            value: obj[k],
            excludeFromIndexes: nonIndexed.indexOf(k) !== -1,
        });
    });
    return results;
}

// /**
//  * Insert a record into the database.
//  */
// function insertRecord(record, recordType) {
//     return datastore.save({
//         key: datastore.key(recordType),
//         data: record,
//     });
// }

// /**
//  * Retrieve the latest 10 records from the database
//  */
// function getRecords(recordType) {
//     const query = datastore
//         .createQuery(recordType)
//         .order('timestamp', {descending: true})
//         .limit(10);

//     return datastore.runQuery(query);
// }

/* [START exports] */
// module.exports = {
//     datastore,
//     insertRecord,
//     getRecords,
// };
module.exports = {
    Datastore,
    datastore, // Must be exposed for .save, .query, etc.
    fromDatastore,
    toDatastore
}
/* [END exports] */
