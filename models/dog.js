'use strict'

/* /models/dog.js */
/* Data model for dog resources */
/* Heavily based on Google's model-datastore.js example */
/* => https://github.com/GoogleCloudPlatform/nodejs-getting-started/blob/master/2-structured-data/books/model-datastore.js */

/* [START config] */
const db = require('../db/db');
const ds = db.datastore;
const kind = 'Dog';
const nonIndexedProps = [];
/* [START config] */

/** NOTE - general formats used below: ********************/
//
/* Application format */
// {
//     id: id,
//     property: value,
//     unindexedProperty: value
// }
//
/* Datastore "extended" format */
// [
//     {
//         name: property,
//         value: value
//     },
//     {
//         name: unindexedProperty,
//         value: value,
//         excludeFromIndexes: true
//     }
// ]
/**********************************************************/

/* Lists all boats in the datastore, in no particular order.
 * Parameters:
 * "limit" -> max. amount of results to return per page.
 * "token" -> starting point for list. (TODO - Integer?).
 * "cb" -> callback function.
 */
function list(limit, token, cb) {
    if (token != undefined) token = token.replace(/ /g,"+");
    const q = ds
        .createQuery([kind])
        .limit(limit)
        .start(token);

    ds.runQuery(q, (err, dogs, nextQuery) => {
        if (err) {
            cb(err);
            return;
        }
        const hasMore =
            nextQuery.moreResults !== db.Datastore.NO_MORE_RESULTS
                ? nextQuery.endCursor
                : false;
            cb(null, dogs.map(db.fromDatastore), hasMore);
    });
}

/* Lists all dogs in the datastore, after filtering, and
 * it provides a token.
 * Parameters:
 * "limit" -> max. amount of results to return per page.
 * "token" -> starting point for list. (TODO - Integer?).
 * "cb" -> callback function.
 * "property" -> training property
 * "value"    -> target value for property
 * "op"       -> operator for comparison; e.g., '=', '>', etc.
 */
function filterList(limit, token, property, op, value, cb) {
    if (token != undefined) token = token.replace(/ /g,"+");
    const q = ds
        .createQuery([kind])
        .filter(property, op, value)
        .limit(limit)
        .start(token);

    ds.runQuery(q, (err, dogs, nextQuery) => {
        if (err) {
            cb(err);
            return;
        }
        const hasMore =
            nextQuery.moreResults !== db.Datastore.NO_MORE_RESULTS
                ? nextQuery.endCursor
                : false;
            cb(null, dogs.map(db.fromDatastore), hasMore);
    });
}

/* Create a new dog or update an existing dog with new data.
 * The provided data is translated into the appropriate format
 * for the datastore.
 * Parameters:
 * "id"   -> dog's ID. Required for updating, 
 *           otherwise new key and entry will be generated.
 * "data" -> data to save in datastore.
 * "cb"   -> callback function.
 */
function update(id, data, cb) {
    let key;
    if (id) {
        key = ds.key([kind, parseInt(id, 10)]);
    } else {
        key = ds.key(kind);
    }

    /* Check if there is already an entry */
    let target = {};
    read(id, (err, source) => {
        /* Merge if so */
        if (!err && source != null) {
            Object.assign(target, data);
            Object.assign(source, target);
            Object.assign(target, source); // What is happening here
        /* Otherwise, build target from scratch */
        } else {
            target = {
                key: key,
                data: db.toDatastore(data, nonIndexedProps),
            }
        }
        /* Save to datastore */
        ds.save(target, err => {
            // data.id = target.key.id;
            cb(err, err ? null : target);
        });
    });
}

/* Wrapper for update to create a new dog
 * Parameters:
 * "data" -> data to save in datastore.
 * "cb"   -> callback function.
 */
function create(data, cb) {
    data.training = []; /* No training assignment at dog creation */
    update(null, data, cb);
}

/* Search datastore for dog by id - on success, send
 * to callback; otherwise, return error
 * Parameters:
 * "id"   -> dog's ID.
 * "cb"   -> callback function.
 */
function read(id, cb) {
    const key = ds.key([kind, parseInt(id, 10)]);
    ds.get(key, (err, entity) => {
        if (!err && !entity) {
            err = {
                resCode: 404,
                resMsg: 'Not found',
            };
        }
        if (err) {
            cb(err);
            return;
        }
        cb(null, db.fromDatastore(entity));
    });
}

/* Search datastore for dog by id - on success, delete
 * to callback; otherwise, do nothing.
 * Parameters:
 * "id"   -> dog's ID.
 * "cb"   -> callback function.
 * 
 * Note, if ID to delete doesn't exist, _delete will
 * not report an error. This is similar to MySQL; if
 * there is no error - that key doesn't exist anymore.
 */
function _delete(id, cb) {
    const key = ds.key([kind, parseInt(id, 10)]);
    ds.delete(key, cb);
}

/* Search datastore for dog by property and value
 * Parameters:
 * "property" -> dog property
 * "value"    -> target value for property
 * "op"       -> operator for comparison; e.g., '=', '>', etc.
 * "cb"       -> callback function.
 */
function find(property, op, value, cb) {
    const q = ds
        .createQuery([kind])
        .filter(property, op, value);

    ds.runQuery(q, (err, dogs) => {
        if (err) {
            cb(err);
            return;
        }
        cb(null, dogs.map(db.fromDatastore));
    });
}

/* [START exports] */
module.exports = {
    create,
    read,
    update,
    delete: _delete,
    list,
    filterList,
    find,
};
/* [END exports] */
