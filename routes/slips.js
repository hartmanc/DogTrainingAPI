'use strict';

/* /routes/slips.js */
/* RESTful routes for slip resources */

const express = require('express');
const router = express.Router();

router.get('/', function(req, res, next) {
    /* HTTP Status - 200 OK */
    res.status(200);
    res.send('GET /slips/')
});

router.get('/:id', function(req, res, next) {
    /* HTTP Status - 200 OK */
    res.status(200);
    res.send(`GET /slips/${req.params.id}`);
});

router.post('/', function(req, res, next) {
    /* HTTP Status - 201 Created */
    res.status(201);
    res.send('POST /slips/');
});

router.patch('/:id', function(req, res, next) {
    /* HTTP Status - 200 OK; patch then respond */
    res.status(200);
    res.send(`PATCH /slips/${req.params.id}`);
});

router.delete('/:id', function(req, res, next) {
    /* HTTP Status - 200 OK; delete then respond */
    res.status(200);
    res.send(`DELETE /slips/${req.params.id}`);
});

module.exports = router;
