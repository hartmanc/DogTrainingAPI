/* /routes/ships.js */
/* RESTful routes for ship resources */

/**********************************************************/
/* CONFIG */
/**********************************************************/
const express = require('express');
const model = require('../models/ship');
const slipModel = require('../models/slip');
const cargoModel = require('../models/cargo');
const auth = require('../auth/auth');
const checkJwt = auth.checkJwt;

const router = express.Router();

const LIST_LENGTH = 3;

let HOST_NAME = "";
if (process.env.NODE_ENV === "production") {
    HOST_NAME = `https://hartmaco-hw7.appspot.com`;
} else {
    HOST_NAME = `http://localhost:8080`;
}

/**********************************************************/
/* MIDDLEWARE */
/**********************************************************/
function notAcceptableError(req, res, next) {
    if (!req.accepts(['json','html'])) {
        res.status(406).send("Not acceptable - available representations of resources include JSON and text");
    } else {
        next();
    }
}

router.use(notAcceptableError);

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
        const nextPageLink = `${HOST_NAME}/ships?token=${cursor}`
        res.status(200);
        if (req.accepts('html')) {
            res.render('ships', {ships: ships, nextPageLink: nextPageLink});
        } else {
            res.send({
                ships: ships,
                nextPageToken: cursor,
                nextPageLink: nextPageLink
            });
        }
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

router.post('/', checkJwt, function(req, res, next) {
    /* checkJwt middleware has already checked if user is logged in */
    if (req.body.name) {
        model.find('name', '=', req.body.name, (err, ships) => {
            /* find passes an array of ships to its call back */
            if (ships[0]) { /* Presumably, if you found a ship, the name is taken */
                /* HTTP Status - 400 Bad Request */
                res.status(400);
                res.send("Bad request - ship name already exists in datastore");
            } else {
                /* Add unique user ID (email) to ship data */
                let data = Object.assign({}, req.body);
                data.owner = req.user.name;
                data.owner_id = req.user.sub.split('|').pop();
                model.create(data, (err, ship) => {
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
        /* Do not allow patch to alter cargo or self */
        } else if (req.body.cargo == undefined && req.body.self == undefined) {
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
                            /* HTTP Status - 303 See Other */
                            res.status(303).set("Location", `${HOST_NAME}/ships/${req.params.id}`).send();
                        });
                    }
                });
            } else {
                model.update(req.params.id, req.body, (err, ship) => {
                    if (err) {
                        next(err);
                        return;
                    }
                    /* HTTP Status - 303 See Other */
                    res.status(303).set("Location", `${HOST_NAME}/ships/${req.params.id}`).send();
                });
            }
        } else {
            /* HTTP Status - 400 Bad Request */
            res.status(400).send("Bad request - cargo can't be altered here");
        }
    });
});

router.delete('/:id', checkJwt, function(req, res, next) {
    /* First, check that ship exists */
    model.read(req.params.id, (err, targetShip) => {
        if (err) {
            /* Assume bad request if error not spec'd */
            err.resCode = err.resCode || 400;
            err.resMsg = err.resMsg || "Bad request - invalid ship index";
            next(err);
            return;
        /* Check that user is authorized to delete ship */
        } else if (targetShip !== undefined && targetShip.owner !== req.user.name) {
            err = {};
            err.resCode = 403;
            err.resMsg = "Forbidden - only a ship's owner can delete a ship";
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
                            /* HTTP Status - 204 No Content */
                            res.status(204).send();
                        });
                    } else {
                        /* HTTP Status - 204 No Content */
                        res.status(204).send();
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
                    res.status(403);
                    res.send("Forbidden - cargo already has carrier");
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

router.get('/:id/cargo', function(req, res, next) {
    cargoModel.filterList(LIST_LENGTH, req.query.token, "carrier", "=", req.params.id,
     (err, cargos, cursor) => {
        if (err) {
            /* Assume bad request if error not spec'd */
            /* TODO: more elegant way to handle these errors? */
            console.log(err);
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
            nextPageLink: `${HOST_NAME}/ships/${req.params.id}/cargo?token=${cursor}`
        });
    });
});

/**********************************************************/
/* SHIP ROUTES ERROR HANDLING */
/**********************************************************/
router.all('/', (req, res, next) => {
    res.status(405).set("Allow","GET, POST").send("Method not allowed");
});

router.all('/:id', (req, res, next) => {
    res.status(405).set("Allow","GET, PATCH, DELETE").send("Method not allowed");
});

module.exports = router;
