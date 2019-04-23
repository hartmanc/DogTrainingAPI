'use strict';

/* /routes/ships.js */
/* RESTful routes for ship resources */

/**********************************************************/
/* CONFIG */
/**********************************************************/
const express = require('express');
const router = express.Router();
const model = require('../models/ship');
const LIST_LENGTH = 10;

/**********************************************************/
/* SHIP ROUTES */
/**********************************************************/
router.get('/', function(req, res, next) {
    model.list(LIST_LENGTH, req.query.token, (err, ships, cursor) => {
        if (err) {
            /* Assume bad request if error not spec'd */
            /* TODO: more elegant way to handle these errors? */
            err.resCode = err.resCode || 400;
            err.resMsg = err.resMsg || "Bad request - invalid ship index";
            next(err);
            return;
        }
        /* HTTP Status - 200 OK */
        res.status(200);
        res.send({
            ships: ships,
            nextPageToken: cursor
        });
    });
});

router.get('/:id', function(req, res, next) {
    model.read(req.params.id, (err, ship) => {
        if (err) {
            /* Assume bad request if error not spec'd */
            /* TODO: more elegant way to handle these errors? */
            err.resCode = err.resCode || 400;
            err.resMsg = err.resMsg || "Bad request - invalid ship index";
            next(err);
            return;
        }
        /* HTTP Status - 200 OK */
        res.status(200);
        res.send(ship);
    });
});

router.post('/', function(req, res, next) {
    model.create(req.body, (err, ship) => {
        if (err) {
            next(err);
            return;
        }
        /* HTTP Status - 201 Created */
        res.status(201);
        res.send(ship);
    });
});

// FIXME: Patch deletes properties not in req.body
router.patch('/:id', function(req, res, next) {
    model.update(req.params.id, req.body, (err, ship) => {
        if (err) {
            next(err);
            return;
        }
        /* HTTP Status - 200 OK; patch then respond */
        res.status(200);
        res.send(ship);
    });
});

router.delete('/:id', function(req, res, next) {
    model.delete(req.params.id, err => {
        if (err) {
            next(err);
            return;
        }
        /* HTTP Status - 200 OK; delete then respond */
        res.status(200);
        res.send(`Deleted /ships/${req.params.id}`);
    })
});

/**********************************************************/
/* SHIP ROUTES ERROR HANDLING */
/**********************************************************/
// router.use((err, req, res, next) => {
//     /* Nothing specific going on here, right now */
//     console.log("Ship error handler");
//     next(err);
// })

module.exports = router;
