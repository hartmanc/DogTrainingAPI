'use strict';

/* /routes/slips.js */
/* RESTful routes for slip resources */

/**********************************************************/
/* CONFIG */
/**********************************************************/
const express = require('express');
const router = express.Router();
const model = require('../models/slip');
const shipmodel = require('../models/ship');
const LIST_LENGTH = 10;

let HOST_NAME = "";
if (process.env.NODE_ENV === "production") {
    HOST_NAME = `https://hartmaco-hw5.appspot.com`;
} else {
    HOST_NAME = `localhost:8080`;
}

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
        if (slip.current_boat != null)
            slip.current_boat_url = `${HOST_NAME}/ships/${slip.current_boat}`;
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
/* SLIP / SHIP "COMBINED" ROUTES */
/**********************************************************/
// Add slip / ship relationship
router.put('/:id/ship', function(req, res, next) {
    /* First, check that slip exists */
    model.read(req.params.id, (err, targetSlip) => {
        if (err) {
            /* Assume bad request if error not spec'd */
            err.resCode = err.resCode || 400;
            err.resMsg = err.resMsg || "Bad request - invalid slip index";
            next(err);
            return;
        /* Then, check that slip doesn't have ship */
        } else if (targetSlip.current_boat != null) {
            /* HTTP Status - 403 Forbidden */
            res.status(403);
            res.send("Bad request - slip with that ID already has ship");
        /* Then, check that ship exists */
        } else {
            shipmodel.read(req.body.shipid, (err, ship) => {
                if (err) {
                    /* Assume bad request if error not spec'd */
                    err.resCode = err.resCode || 400;
                    err.resMsg = err.resMsg || "Bad request - invalid ship index";
                    next(err);
                    return;
                } else if (ship) {
                    /* Then, check that ship isn't already in slip */
                    model.find('current_boat', '=', String(req.body.shipid), (err, slips) => {
                        if (slips[0]) {
                            res.status(400);
                            res.send("Bad request - ship number already exists in a slip");
                        } else {
                            /* Finally, add ship to slip with timestamp */
                            const data = {
                                current_boat: ship.id,
                                arrival_date: todaysDate()
                            }
                            model.update(req.params.id, data, (err, slip) => {
                                if (err) {
                                    next (err);
                                    return;
                                }
                                /* HTTP Status - 201 Created */
                                res.status(200);
                                res.send(slip);
                            });
                        }
                    });
                } else {
                    res.status(400);
                    res.send("Bad request - ship doesn't exist in datastore");
                }
            });
        }
    });
});

// Delete slip / ship relationship
router.delete('/:id/ship', function(req, res, next) {
    /* First, check that slip exists */
    model.read(req.params.id, (err, targetSlip) => {
        if (err) {
            /* Assume bad request if error not spec'd */
            err.resCode = err.resCode || 400;
            err.resMsg = err.resMsg || "Bad request - invalid slip index";
            next(err);
            return;
        } else {
            /* Nullify current_boat and arrival_date to remove ship from slip */
            const data = {
                current_boat: null,
                arrival_date: null
            }
            model.update(req.params.id, data, (err, slip) => {
                if (err) {
                    next (err);
                    return;
                }
                /* HTTP Status - 201 Created */
                res.status(200);
                res.send(slip);
            });
        }
    });
});

/*
 * Helper function - returns today's date as a string
 * Taken from w3resource.com
 */
function todaysDate() {
    var today = new Date();
    var dd = today.getDate();
    var mm = today.getMonth()+1; 
    var yyyy = today.getFullYear();

    if(dd<10) 
    {
        dd='0'+dd;
    } 

    if(mm<10) 
    {
        mm='0'+mm;
    }

    today = mm + '/' + dd + '/' + yyyy;

    return today;
}

/**********************************************************/
/* SLIP ROUTES ERROR HANDLING */
/**********************************************************/
// router.use((err, req, res, next) => {
//     /* Nothing specific going on here, right now */
//     console.log("Slip error handler");
//     next(err);
// })

module.exports = router;
