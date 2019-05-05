'use strict';

/* /routes/cargos.js */
/* RESTful routes for cargo resources */

/**********************************************************/
/* CONFIG */
/**********************************************************/
const express = require('express');
const router = express.Router();
const model = require('../models/cargo');
const shipmodel = require('../models/ship');
const LIST_LENGTH = 3;

let HOST_NAME = "";
if (process.env.NODE_ENV === "production") {
    HOST_NAME = `https://hartmaco-hw4.appspot.com`;
} else {
    HOST_NAME = `localhost:8080`;
}

/**********************************************************/
/* CARGO ROUTES */
/**********************************************************/
router.get('/', function(req, res, next) {
    model.list(LIST_LENGTH, req.query.token, (err, cargos, cursor) => {
        if (err) {
            /* Assume bad request if error not spec'd */
            /* TODO: more elegant way to handle these errors? */
            err.resCode = err.resCode || 400;
            err.resMsg = err.resMsg || "Bad request - invalid cargo index";
            next(err);
            return;
        }
        /* HTTP Status - 200 OK */
        res.status(200);
        res.send({
            cargos: cargos,
            nextPageToken: cursor,
            nextPageLink: `${HOST_NAME}/cargo?token=${cursor}`
        });
    });
});

router.get('/:id', function(req, res, next) {
    model.read(req.params.id, (err, cargo) => {
        if (err) {
            /* Assume bad request if error not spec'd */
            /* TODO: more elegant way to handle these errors? */
            err.resCode = err.resCode || 400;
            err.resMsg = err.resMsg || "Bad request - invalid cargo index";
            next(err);
            return;
        }
        /* HTTP Status - 200 OK */
        res.status(200);
        res.send(cargo);
    });
});

router.post('/', function(req, res, next) {
    /* All cargo should begin unassigned to any boat */
    if (req.body.carrier) {
        /* HTTP Status - 400 Bad Request */
        res.status(400);
        res.send("Bad request - new cargo should begin unassigned to any carrier");
    } else {
        model.create(req.body, (err, cargo) => {
            if (err) {
                next(err);
                return;
            } else {
                /* HTTP Status - 201 Created */
                res.status(201).send(`${cargo.key.id}`);
            }
        });
    }
});

router.patch('/:id', function(req, res, next) {
    /* Check that cargo to update actually exists */
    model.read(req.params.id, (err, cargo) => {
        if (err) {
            /* Assume bad request if error not spec'd */
            /* TODO: more elegant way to handle these errors? */
            err.resCode = err.resCode || 400;
            err.resMsg = err.resMsg || "Bad request - invalid cargo index";
            next(err);
            return;
        } else if (req.body.id != undefined || req.body.self != undefined) {
            res.status(400).send("Bad request - cannot change cargo ID");
        } else {
            /* If request has a carrier change, make sure carrier is not already assigned to cargo in datastore */
            if (req.body.carrier) {
                model.find('carrier', '=', req.body.carrier, (err, cargos) => {
                    /* find passes an array of cargos to its call back */
                    if (cargos[0] && cargos[0].id !== req.params.id) { /* Presumably, if you found a cargo, the carrier is taken */
                        /* HTTP Status - 400 Bad Request */
                        res.status(400);
                        res.send("Bad request - cargo carrier already exists in datastore");
                    } else {
                        model.update(req.params.id, req.body, (err, cargo) => {
                            if (err) {
                                next(err);
                                return;
                            }
                            /* HTTP Status - 200 OK; patch then respond */
                            res.status(200);
                            res.send(cargo);
                        });
                    }
                });
            } else {
                model.update(req.params.id, req.body, (err, cargo) => {
                    if (err) {
                        next(err);
                        return;
                    }
                    /* HTTP Status - 200 OK; patch then respond */
                    res.status(200);
                    res.send(cargo);
                });
            }
        }
    });
});

router.delete('/:id', function(req, res, next) {
    model.read(req.params.id, (err, targetCargo) => {
        /* Check if cargo is in a ship */
        if (targetCargo != undefined && targetCargo.carrier != undefined) {
            shipmodel.read(targetCargo.carrier.id, (err, ship) => { // NOTE: all params are strings
                if (ship != undefined) {
                    /* Find and delete targetCargo in ship.cargo */
                    let cargoArray = ship.cargo;
                    const index = cargoArray.findIndex(cargoElement => cargoElement.id = req.params.id);
                    cargoArray.splice(index, 1);

                    /* Update ship in datastore */
                    const data = {
                        cargo: cargoArray
                    }
                    shipmodel.update(ship.id, data, (err) => {
                        if (err) {
                            next (err);
                            return;
                        }
                    });
                }
            });
        } 
        /* Delete cargo from datastore */
        model.delete(req.params.id, err => {
            if (err) {
                next(err);
                return;
            } else {
                /* HTTP Status - 200 OK; delete then respond */
                res.status(200).send("Cargo deleted");
            }
        });
    });
});

/**********************************************************/
/* CARGO ROUTES ERROR HANDLING */
/**********************************************************/
// router.use((err, req, res, next) => {
//     /* Nothing specific going on here, right now */
//     console.log("Cargo error handler");
//     next(err);
// })

module.exports = router;
