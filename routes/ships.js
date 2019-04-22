'use strict';

/* /routes/ships.js */
/* RESTful routes for ship resources */

const express = require('express');
const router = express.Router();

router.get('/', function(req, res, next) {
    /* HTTP Status - 200 OK */
    res.status(200);
    res.send('GET /ships/')
});

router.get('/:id', function(req, res, next) {
    /* HTTP Status - 200 OK */
    res.status(200);
    res.send(`GET /ships/${req.params.id}`);
});

router.post('/', function(req, res, next) {
    /* HTTP Status - 201 Created */
    res.status(201);
    res.send('POST /ships/');
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

module.exports = router;
