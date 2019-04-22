'use strict';

/* /routes/ships.js */
/* RESTful routes for ship resources */

/**********************************************************/
/* CONFIG */
/**********************************************************/
const express = require('express');
const router = express.Router();
const model = require('../models/ship');

/**********************************************************/
/* SHIP ROUTES */
/**********************************************************/
router.get('/', function(req, res, next) {
    /* HTTP Status - 200 OK */
    res.status(200);
    res.send('GET /ships/')
});

router.get('/:id', function(req, res, next) {
    model.read(req.params.id, (err, entity) => {
        if (err) {
            console.log("Datastore read error");
            next(err);
            return;
        }
        /* HTTP Status - 200 OK */
        res.status(200);
        res.send(entity);
    });
});

router.post('/', function(req, res, next) {
    model.create(req.body, (err, entity) => {
        if (err) {
            next(err);
            return;
        }
        /* HTTP Status - 201 Created */
        res.status(201);
        res.send(entity);
    });
});

router.patch('/:id', function(req, res, next) {
    /* HTTP Status - 200 OK; patch then respond */
    res.status(200);
    res.send(`PATCH /ships/${req.params.id}`);
});

router.delete('/:id', function(req, res, next) {
    /* HTTP Status - 200 OK; delete then respond */
    res.status(200);
    res.send(`DELETE /ships/${req.params.id}`);
});

/**********************************************************/
/* SHIP ROUTES ERROR HANDLING */
/**********************************************************/
router.use((err, req, res, next) => {
    /* Nothing specific going on here, right now */
    console.log("Ship error handler");
    next(err);
})

module.exports = router;
