/* /routes/dogs.js */
/* RESTful routes for dog resources */

/**********************************************************/
/* CONFIG */
/**********************************************************/
const express = require('express');

const model = require('../models/dog');
const trainingModel = require('../models/training');
const userModel = require('../models/user');

const auth = require('../auth/auth');
const checkJwt = auth.checkJwt;

const router = express.Router();

const LIST_LENGTH = 5;

const HOST_NAME = require('../config');

/**********************************************************/
/* DOG ROUTES */
/**********************************************************/
router.get('/', function(req, res, next) {
    model.list(LIST_LENGTH, req.query.token, (err, dogs, cursor) => {
        if (err) {
            /* Assume bad request if error not spec'd */
            err.resCode = err.resCode || 400;
            err.resMsg = err.resMsg || "Bad request - probably bad pagination token";
            next(err);
            return;
        }
        /* Build nextPageLink as appropriate */
        let nextPageLink = false;
        if (cursor)
            nextPageLink = `${HOST_NAME}/dogs?token=${cursor}`

        /* HTTP Status - 200 OK */
        res.status(200);
        res.send({
            dogs: dogs,
            nextPageToken: cursor,
            nextPageLink: nextPageLink
        });
    });
});

router.get('/:id', function(req, res, next) {
    model.read(req.params.id, (err, dog) => {
        if (err) {
            /* Assume bad request if error not spec'd */
            /* TODO: more elegant way to handle these errors? */
            err.resCode = err.resCode || 400;
            err.resMsg = err.resMsg || "Bad request - invalid dog ID";
            next(err);
            return;
        }
        /* HTTP Status - 200 OK */
        res.status(200);
        res.send(dog);
    });
});

router.post('/', checkJwt, function(req, res, next) {
    /* Extract usable ID */
    owner_id = req.user.sub.split('|').pop();
    if (req.body.name) {
        model.find('name', '=', req.body.name, (err, dogs) => {
            /* find passes an array of dogs to its call back */
            if (dogs[0] && dogs[0].owner_id === owner_id) { /* Presumably, if you found a dog, the name is taken */
                /* HTTP Status - 400 Bad Request */
                res.status(400);
                res.send("Bad request - dog name already exists in datastore for this user");
            } else {
                /* Create dog
                 * Add unique user ID (email) to dog data */
                let data = Object.assign({}, req.body);
                data.owner = req.user.name;
                data.owner_id = owner_id;
                model.create(data, (err, dog) => {
                    if (err) {
                        next(err);
                        return;
                    }
                    /* Update user with new dog data */
                    userModel.read(owner_id, (err, user) => {
                        if (err) {
                            /* Assume bad request if error not spec'd */
                            err.resCode = err.resCode || 500;
                            err.resMsg = err.resMsg || "Server error updating user dog collection";
                            next(err);
                            return;
                        } else {
                            user.dogs.push({
                                id: dog.key.id,
                                self: `${HOST_NAME}/dogs/${dog.key.id}`
                            });
                            userModel.update(owner_id, user, (err) => {
                                if (err) {
                                    next (err);
                                    return;
                                }
                                /* HTTP Status - 201 Created */
                                res.status(201);
                                res.send(dog);
                            });
                        }
                    });
                });
            }
        });
    } else {
        /* HTTP Status - 400 Bad Request */
        res.status(400);
        res.send("Bad request - must include dog name");
    }
});

router.patch('/:id', function(req, res, next) {
    /* Check that dog to update actually exists */
    model.read(req.params.id, (err, dog) => {
        if (err) {
            /* Assume bad request if error not spec'd */
            /* TODO: more elegant way to handle these errors? */
            err.resCode = err.resCode || 400;
            err.resMsg = err.resMsg || "Bad request - invalid dog ID";
            next(err);
            return;
        /* Do not allow patch to alter training or self */
        } else if (req.body.training == undefined && req.body.self == undefined) {
            model.update(req.params.id, req.body, (err, dog) => {
                if (err) {
                    next(err);
                    return;
                }
                /* HTTP Status - 303 See Other */
                res.status(303).set("Location", `${HOST_NAME}/dogs/${req.params.id}`).send();
            });
        } else {
            /* HTTP Status - 400 Bad Request */
            res.status(400).send("Bad request - training can't be altered here");
        }
    });
});

router.delete('/:id', checkJwt, function(req, res, next) {
    /* Extract usable ID */
    owner_id = req.user.sub.split('|').pop();
    /* First, check that dog exists */
    model.read(req.params.id, (err, targetDog) => {
        if (err) {
            /* Assume bad request if error not spec'd */
            err.resCode = err.resCode || 400;
            err.resMsg = err.resMsg || "Bad request - invalid dog ID";
            next(err);
            return;
        /* Check that user is authorized to delete dog */
        } else if (targetDog !== undefined && targetDog.owner !== req.user.name) {
            err = {};
            err.resCode = 403;
            err.resMsg = "Forbidden - only a dog's owner can delete a dog";
            next(err);
            return;
        /* Then, delete all references to this dog in training */
        } else {
            if (targetDog !== undefined && targetDog.training.length > 0) {
                const trainingData = {
                    dog: null
                }
                targetDog.training.forEach(element => {
                    trainingModel.update(element.id, trainingData, (err) => {
                        if (err) {
                            next (err);
                            return;
                        }
                    });
                });
            }
        }
        /* Delete dog itself */
        model.delete(req.params.id, err => {
            if (err) {
                next(err);
                return;
            } else {
                /* Cascade dog delete to user */
                userModel.read(owner_id, (err, user) => {
                    if (err) {
                        /* Assume bad request if error not spec'd */
                        err.resCode = err.resCode || 500;
                        err.resMsg = err.resMsg || "Server error updating user dog collection";
                        next(err);
                        return;
                    } else {
                        /* Filter out dog with deleted ID */
                        user.dogs = user.dogs.filter(dog => {
                            return dog.id !== req.params.id;
                        });
                        userModel.update(owner_id, user, (err) => {
                            if (err) {
                                next (err);
                                return;
                            }
                            /* HTTP Status - 204 No Content */
                            res.status(204).send();
                        });
                    }
                });
            } 
        });
    });
});

/**********************************************************/
/* TRAINING / DOG "COMBINED" ROUTES */
/**********************************************************/
// Add training / dog relationship
// TODO: Add auth requirement
router.put('/:id/trainings', function(req, res, next) {
    /* First, check that dog exists */
    model.read(req.params.id, (err, targetDog) => {
        if (err) {
            /* Assume bad request if error not spec'd */
            err.resCode = 400;
            err.resMsg = "Bad request - invalid dog ID";
            next(err);
            return;
        /* Then, check that training exists */
        } else {
            trainingModel.read(req.body.training_id, (err, training) => {
                if (err) {
                    /* Assume bad request if error not spec'd */
                    err.resCode = 400;
                    err.resMsg = "Bad request - invalid training ID";
                    next(err);
                    return;
                /* Training exists and doesn't have dog */
                } else if (training.dog == undefined) {
                    /* Update training data */
                    const trainingData = {
                        dog: {
                            id: targetDog.id,
                            name: targetDog.name,
                            self: `${HOST_NAME}/dogs/${targetDog.id}`
                        }
                    };
                    trainingModel.update(req.body.training_id, trainingData, (err) => {
                        if (err) {
                            next (err);
                            return;
                        }
                    });
                    /* Update dog data */
                    targetDog.training.push({
                        id: training.id,
                        self: `${HOST_NAME}/trainings/${training.id}`
                    })
                    const newTraining = targetDog.training;
                    const dogData = {
                        training: newTraining
                    };
                    model.update(req.params.id, dogData, (err, dog) => {
                        if (err) {
                            next (err);
                            return;
                        }
                        /* HTTP Status - 200 OK */
                        res.status(200);
                        res.send(dog);
                    });
                /* Training exists and has dog */
                } else {
                    res.status(403);
                    res.send("Forbidden - training already has dog");
                }
            });
        }
    });
});

// Delete dog / relationship
router.delete('/:dogid/trainings/:trainingid', function(req, res, next) {
    /* First, check that dog exists */
    model.read(req.params.dogid, (err, targetDog) => {
        if (err) {
            /* Assume bad request if error not spec'd */
            err.resCode = resCode || 400;
            err.resMsg = err.resMsg || "Bad request - invalid dog ID";
            next(err);
            return;
        } else {
            /* Find and delete targetTraining in targetDog.training */
            let trainingArray = targetDog.training;
            const index = trainingArray.findIndex(trainingElement => trainingElement.id = req.params.trainingid);
            /* If training is found */
            if (index != -1) {
                trainingArray.splice(index, 1);
                /* Update targetDog in datastore */
                const dogData = {
                    training: trainingArray
                }
                model.update(targetDog.id, dogData, (err) => {
                    if (err) {
                        next(err);
                        return;
                    }
                });
                /* Update training to delete dog reference */
                const trainingData = {
                    dog: null
                }
                trainingModel.update(req.params.trainingid, trainingData, (err) => {
                    if (err) {
                        next(err);
                        return;
                    }
                });
                /* HTTP Status - 200 OK */
                res.status(204).send();
            } else {
                /* HTTP Status - 404 Not found */
                res.status(404).send("Training not found on dog");
            }
        }
    });
});

router.get('/:id/training', function(req, res, next) {
    trainingModel.filterList(LIST_LENGTH, req.query.token, "dog", "=", req.params.id,
     (err, trainings, cursor) => {
        if (err) {
            /* Assume bad request if error not spec'd */
            /* TODO: more elegant way to handle these errors? */
            console.log(err);
            err.resCode = err.resCode || 400;
            err.resMsg = err.resMsg || "Bad request - invalid training ID";
            next(err);
            return;
        }
        /* HTTP Status - 200 OK */
        res.status(200);
        res.send({
            trainings: trainings,
            nextPageToken: cursor,
            nextPageLink: `${HOST_NAME}/dogs/${req.params.id}/training?token=${cursor}`
        });
    });
});

/**********************************************************/
/* DOG ROUTES ERROR HANDLING */
/**********************************************************/
router.all('/', (req, res, next) => {
    res.status(405).set("Allow","GET, POST").send("Method not allowed");
});

router.all('/:id', (req, res, next) => {
    res.status(405).set("Allow","GET, PATCH, DELETE").send("Method not allowed");
});

module.exports = router;
