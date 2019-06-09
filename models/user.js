'use strict'

/* /models/user.js */
/* Data model for user resources */
/* Heavily based on Google's model-datastore.js example */
/* => https://github.com/GoogleCloudPlatform/nodejs-getting-started/blob/master/2-structured-data/books/model-datastore.js */

/* [START config] */
const db = require('../db/db');
const ds = db.datastore;
const kind = 'User';
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

/* Lists all users in the datastore, in no particular order.
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

    ds.runQuery(q, (err, users, nextQuery) => {
        if (err) {
            cb(err);
            return;
        }
        const hasMore =
            nextQuery.moreResults !== db.Datastore.NO_MORE_RESULTS
                ? nextQuery.endCursor
                : false;
            cb(null, users.map(db.fromDatastore), hasMore);
    });
}

/* Lists all users in the datastore, after filtering, and
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

    ds.runQuery(q, (err, users, nextQuery) => {
        if (err) {
            cb(err);
            return;
        }
        const hasMore =
            nextQuery.moreResults !== db.Datastore.NO_MORE_RESULTS
                ? nextQuery.endCursor
                : false;
            cb(null, users.map(db.fromDatastore), hasMore);
    });
}

/* Create a new user or update an existing user with new data.
 * The provided data is translated into the appropriate format
 * for the datastore.
 * Parameters:
 * "id"   -> user's Auth0 ID. Required for updating, 
 *           otherwise new key and entry will be generated.
 * "data" -> data to save in datastore.
 * "cb"   -> callback function.
 */
function update(id, data, cb) {
    let key;
    if (id) {
        key = ds.key([kind, id]);
    } else {
        key = ds.key([kind, data.id]);
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

/* Wrapper for update to create a new user
 * Parameters:
 * "data" -> data to save in datastore.
 * "cb"   -> callback function.
 */
function create(data, cb) {
    update(null, data, cb);
}

/* Search datastore for user by "id" - on success, send
 * to callback; otherwise, return error
 * Parameters:
 * "id"   -> user's Auth0 ID.
 * "cb"   -> callback function.
 */
function read(id, cb) {
    const key = ds.key([kind, id]);
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

/* Search datastore for user by id - on success, delete
 * to callback; otherwise, do nothing.
 * Parameters:
 * "id"   -> user's id.
 * "cb"   -> callback function.
 * 
 * Note, if id to delete doesn't exist, _delete will
 * not report an error. This is similar to MySQL; if
 * there is no error - that key doesn't exist anymore.
 */
function _delete(id, cb) {
    const key = ds.key([kind, id]);
    ds.delete(key, cb);
}

/* Search datastore for user by property and value
 * Parameters:
 * "property" -> user property
 * "value"    -> target value for property
 * "op"       -> operator for comparison; e.g., '=', '>', etc.
 * "cb"       -> callback function.
 */
function find(property, op, value, cb) {
    const q = ds
        .createQuery([kind])
        .filter(property, op, value);

    ds.runQuery(q, (err, users) => {
        if (err) {
            cb(err);
            return;
        }
        cb(null, users.map(db.fromDatastore));
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
