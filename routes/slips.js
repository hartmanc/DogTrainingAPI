'use strict';

/* /routes/slips.js */
/* RESTful routes for slip resources */

/**********************************************************/
/* CONFIG */
/**********************************************************/
const express = require('express');
const router = express.Router();
const model = require('../models/slip');
const LIST_LENGTH = 10;

/**********************************************************/
/* SHIP ROUTES */
/**********************************************************/
router.get('/', function(req, res, next) {
    model.list(LIST_LENGTH, req.query.token, (err, slips, cursor) => {
        if (err) {
            /* Assume bad request if error not spec'd */
            /* TODO: more elegant way to handle these errors? */
            err.resCode = err.resCode || 400;
            err.resMsg = err.resMsg || "Bad request - invalid slip index";
            next(err);
            return;
        }
        /* HTTP Status - 200 OK */
        res.status(200);
        res.send({
            slips: slips,
            nextPageToken: cursor
        });
    });
});

router.get('/:id', function(req, res, next) {
    model.read(req.params.id, (err, slip) => {
        if (err) {
            /* Assume bad request if error not spec'd */
            /* TODO: more elegant way to handle these errors? */
            err.resCode = err.resCode || 400;
            err.resMsg = err.resMsg || "Bad request - invalid slip index";
            next(err);
            return;
        }
        /* HTTP Status - 200 OK */
        res.status(200);
        res.send(slip);
    });
});

router.post('/', function(req, res, next) {
    if (req.body.number) {
        model.find('number', '=', req.body.number, (err, slips) => {
            /* find passes an array of slips to its call back */
            if (slips[0]) { /* Presumably, if you found a slip, the number is taken */
                /* HTTP Status - 400 Bad Request */
                res.status(400);
                res.send("Bad request - slip number already exists in datastore");
            } else {
                model.create(req.body, (err, slip) => {
                    if (err) {
                        next(err);
                        return;
                    }
                    /* HTTP Status - 201 Created */
                    res.status(201);
                    res.send(slip);
                });
            }
        });
    } else {
        /* HTTP Status - 400 Bad Request */
        res.status(400);
        res.send("Bad request - must include slip number");
    }
});

// TODO: This has gotten ugly - model.update parts could use refactoring
router.patch('/:id', function(req, res, next) {
    /* Check that slip to update actually exists */
    model.read(req.params.id, (err, slip) => {
        if (err) {
            /* Assume bad request if error not spec'd */
            /* TODO: more elegant way to handle these errors? */
            err.resCode = err.resCode || 400;
            err.resMsg = err.resMsg || "Bad request - invalid slip index";
            next(err);
            return;
        } else {
            /* If request has a number change, make sure number is not already in datastore */
            if (req.body.number) {
                model.find('number', '=', req.body.number, (err, slips) => {
                    /* find passes an array of slips to its call back */
                    if (slips[0] && slips[0].id !== req.params.id) { /* Presumably, if you found a slip, the number is taken */
                        /* HTTP Status - 400 Bad Request */
                        res.status(400);
                        res.send("Bad request - slip number already exists in datastore");
                    } else {
                        model.update(req.params.id, req.body, (err, slip) => {
                            if (err) {
                                next(err);
                                return;
                            }
                            /* HTTP Status - 200 OK; patch then respond */
                            res.status(200);
                            res.send(slip);
                        });
                    }
                });
            } else {
                model.update(req.params.id, req.body, (err, slip) => {
                    if (err) {
                        next(err);
                        return;
                    }
                    /* HTTP Status - 200 OK; patch then respond */
                    res.status(200);
                    res.send(slip);
                });
            }
        }
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
        res.send(`Deleted /slips/${req.params.id}`);
    })
});

/**********************************************************/
/* SLIP ROUTES ERROR HANDLING */
/**********************************************************/
// router.use((err, req, res, next) => {
//     /* Nothing specific going on here, right now */
//     console.log("Slip error handler");
//     next(err);
// })

module.exports = router;
