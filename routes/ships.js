'use strict';

/* /routes/ships.js */
/* RESTful routes for ship resources */

/**********************************************************/
/* CONFIG */
/**********************************************************/
const express = require('express');
const model = require('../models/ship');
const slipModel = require('../models/slip');
const cargoModel = require('../models/cargo');

const router = express.Router();
const LIST_LENGTH = 10;

let HOST_NAME = "";
if (process.env.NODE_ENV === "production") {
    HOST_NAME = `https://hartmaco-hw3.appspot.com`;
} else {
    HOST_NAME = `localhost:8080`;
}

/**********************************************************/
/* SHIP ROUTES */
/**********************************************************/
router.get('/', function(req, res, next) {
    model.list(LIST_LENGTH, req.query.token, (err, ships, cursor) => {
        if (err) {
            /* Assume bad request if error not spec'd */
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
    if (req.body.name) {
        model.find('name', '=', req.body.name, (err, ships) => {
            /* find passes an array of ships to its call back */
            if (ships[0]) { /* Presumably, if you found a ship, the name is taken */
                /* HTTP Status - 400 Bad Request */
                res.status(400);
                res.send("Bad request - ship name already exists in datastore");
            } else {
                model.create(req.body, (err, ship) => {
                    if (err) {
                        next(err);
                        return;
                    }
                    /* HTTP Status - 201 Created */
                    res.status(201);
                    res.send(ship);
                });
            }
        });
    } else {
        /* HTTP Status - 400 Bad Request */
        res.status(400);
        res.send("Bad request - must include ship name");
    }
});

router.patch('/:id', function(req, res, next) {
    /* Check that ship to update actually exists */
    model.read(req.params.id, (err, ship) => {
        if (err) {
            /* Assume bad request if error not spec'd */
            /* TODO: more elegant way to handle these errors? */
            err.resCode = err.resCode || 400;
            err.resMsg = err.resMsg || "Bad request - invalid ship index";
            next(err);
            return;
        /* Do not allow patch to alter cargo */
        } else if (req.body.cargo == undefined) {
            /* If request has a name change, make sure name is not already in datastore */
            if (req.body.name) {
                model.find('name', '=', req.body.name, (err, ships) => {
                    /* find passes an array of ships to its call back */
                    if (ships[0] && ships[0].id !== req.params.id) { /* Presumably, if you found a ship, the name is taken */
                        /* HTTP Status - 400 Bad Request */
                        res.status(400);
                        res.send("Bad request - ship name already exists in datastore");
                    } else {
                        model.update(req.params.id, req.body, (err, ship) => {
                            if (err) {
                                next(err);
                                return;
                            }
                            /* HTTP Status - 200 OK; patch then respond */
                            res.status(200);
                            res.send(ship);
                        });
                    }
                });
            } else {
                model.update(req.params.id, req.body, (err, ship) => {
                    if (err) {
                        next(err);
                        return;
                    }
                    /* HTTP Status - 200 OK; patch then respond */
                    res.status(200);
                    res.send(ship);
                });
            }
        } else {
            /* HTTP Status - 400 Bad Request */
            res.status(400).send("Bad request - cargo can't be altered here");
        }
    });
});

router.delete('/:id', function(req, res, next) {
    /* First, check that ship exists */
    model.read(req.params.id, (err, targetShip) => {
        if (err) {
            /* Assume bad request if error not spec'd */
            err.resCode = err.resCode || 400;
            err.resMsg = err.resMsg || "Bad request - invalid ship index";
            next(err);
            return;
        /* Then, delete all references to this ship in cargo */
        } else {
            if (targetShip !== undefined && targetShip.cargo.length > 0) {
                const cargoData = {
                    carrier: null
                }
                targetShip.cargo.forEach(element => {
                    cargoModel.update(element.id, cargoData, (err) => {
                        if (err) {
                            next (err);
                            return;
                        }
                    });
                });
            }
        }
        /* Delete ship itself */
        model.delete(req.params.id, err => {
            if (err) {
                next(err);
                return;
            } else {
                /* Check if ship is in a slip */
                slipModel.find('current_boat', '=', req.params.id, (err, slips) => { // NOTE: all params are strings
                    if (slips[0]) {
                        /* Nullify current_boat and arrival_date to remove ship from slip */
                        const data = {
                            current_boat: null,
                            arrival_date: null
                        }
                        slipModel.update(slips[0].id, data, (err, slip) => {
                            if (err) {
                                next (err);
                                return;
                            }
                            /* HTTP Status - 200 OK */
                            res.status(200);
                            res.send(`Ship deleted and removed from slip ${slips[0].id}`);
                        });
                    } else {
                        /* HTTP Status - 200 OK; delete then respond */
                        res.status(200);
                        res.send("Ship deleted, no slips modified");
                    }
                });
            } 
        });
    });
});

/**********************************************************/
/* CARGO / SHIP "COMBINED" ROUTES */
/**********************************************************/
// Add cargo / ship relationship
router.put('/:id/cargo/', function(req, res, next) {
    /* First, check that ship exists */
    model.read(req.params.id, (err, targetShip) => {
        if (err) {
            /* Assume bad request if error not spec'd */
            err.resCode = err.resCode || 400;
            err.resMsg = err.resMsg || "Bad request - invalid ship index";
            next(err);
            return;
        /* Then, check that cargo exists */
        } else {
            cargoModel.read(req.body.cargoId, (err, cargo) => {
                if (err) {
                    /* Assume bad request if error not spec'd */
                    err.resCode = err.resCode || 400;
                    err.resMsg = err.resMsg || "Bad request - invalid cargo index";
                    next(err);
                    return;
                /* Cargo exists and doesn't have carrier */
                } else if (cargo.carrier == undefined) {
                    /* Update cargo data */
                    const cargoData = {
                        carrier: {
                            id: targetShip.id,
                            name: targetShip.name,
                            self: `${HOST_NAME}/ships/${targetShip.id}`
                        }
                    };
                    cargoModel.update(req.body.cargoId, cargoData, (err) => {
                        if (err) {
                            next (err);
                            return;
                        }
                    });
                    /* Update ship data */
                    targetShip.cargo.push({
                        id: cargo.id,
                        self: `${HOST_NAME}/cargo/${cargo.id}`
                    })
                    const newCargo = targetShip.cargo;
                    const shipData = {
                        cargo: newCargo
                    };
                    model.update(req.params.id, shipData, (err, ship) => {
                        if (err) {
                            next (err);
                            return;
                        }
                        /* HTTP Status - 201 Created */
                        res.status(200);
                        res.send(ship);
                    });
                /* Cargo exists and has carrier */
                } else {
                    res.status(400);
                    res.send("Bad request - ship doesn't exist in datastore");
                }
            });
        }
    });
});

// Delete ship / ship relationship
router.delete('/:shipid/cargo/:cargoid', function(req, res, next) {
    /* First, check that ship exists */
    model.read(req.params.shipid, (err, targetShip) => {
        if (err) {
            /* Assume bad request if error not spec'd */
            err.resCode = err.resCode || 400;
            err.resMsg = err.resMsg || "Bad request - invalid ship index";
            next(err);
            return;
        } else {
            /* Find and delete targetCargo in targetShip.cargo */
            let cargoArray = targetShip.cargo;
            const index = cargoArray.findIndex(cargoElement => cargoElement.id = req.params.cargoid);
            /* If cargo is found */
            if (index != -1) {
                cargoArray.splice(index, 1);
                /* Update targetShip in datastore */
                const shipData = {
                    cargo: cargoArray
                }
                model.update(targetShip.id, shipData, (err) => {
                    if (err) {
                        next(err);
                        return;
                    }
                });
                /* Update cargo to delete ship reference */
                const cargoData = {
                    carrier: null
                }
                cargoModel.update(req.params.cargoid, cargoData, (err) => {
                    if (err) {
                        next(err);
                        return;
                    }
                });
                /* HTTP Status - 200 OK */
                res.status(200).send("Cargo removed from ship");
            } else {
                /* HTTP Status - 404 Not found */
                res.status(404).send("Cargo not found on ship");
            }
        }
    });
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
