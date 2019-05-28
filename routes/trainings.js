'use strict';

/* /routes/trainings.js */
/* RESTful routes for training resources */

/**********************************************************/
/* CONFIG */
/**********************************************************/
const express = require('express');
const router = express.Router();
const model = require('../models/training');
const dogmodel = require('../models/dog');

const HOST_NAME = require('../config');
const LIST_LENGTH = 5;

/**********************************************************/
/* CARGO ROUTES */
/**********************************************************/
router.get('/', function(req, res, next) {
    model.list(LIST_LENGTH, req.query.token, (err, trainings, cursor) => {
        if (err) {
            /* Assume bad request if error not spec'd */
            /* TODO: more elegant way to handle these errors? */
            err.resCode = err.resCode || 400;
            err.resMsg = err.resMsg || "Bad request - invalid training index";
            next(err);
            return;
        }
        /* HTTP Status - 200 OK */
        res.status(200);
        res.send({
            trainings: trainings,
            nextPageToken: cursor,
            nextPageLink: `${HOST_NAME}/training?token=${cursor}`
        });
    });
});

router.get('/:id', function(req, res, next) {
    model.read(req.params.id, (err, training) => {
        if (err) {
            /* Assume bad request if error not spec'd */
            /* TODO: more elegant way to handle these errors? */
            err.resCode = err.resCode || 400;
            err.resMsg = err.resMsg || "Bad request - invalid training index";
            next(err);
            return;
        }
        /* HTTP Status - 200 OK */
        res.status(200);
        res.send(training);
    });
});

router.post('/', function(req, res, next) {
    /* All training should begin unassigned to any boat */
    if (req.body.dog) {
        /* HTTP Status - 400 Bad Request */
        res.status(400);
        res.send("Bad request - new training should begin unassigned to any dog");
    } else {
        model.create(req.body, (err, training) => {
            if (err) {
                next(err);
                return;
            } else {
                /* HTTP Status - 201 Created */
                res.status(201).send(`${training.key.id}`);
            }
        });
    }
});

router.patch('/:id', function(req, res, next) {
    /* Check that training to update actually exists */
    model.read(req.params.id, (err, training) => {
        if (err) {
            /* Assume bad request if error not spec'd */
            /* TODO: more elegant way to handle these errors? */
            err.resCode = err.resCode || 400;
            err.resMsg = err.resMsg || "Bad request - invalid training index";
            next(err);
            return;
        } else if (req.body.id != undefined || req.body.self != undefined) {
            res.status(400).send("Bad request - cannot change training ID");
        } else {
            /* If request has a dog change, make sure dog is not already assigned to training in datastore */
            if (req.body.dog) {
                model.find('dog', '=', req.body.dog, (err, trainings) => {
                    /* find passes an array of trainings to its call back */
                    if (trainings[0] && trainings[0].id !== req.params.id) { /* Presumably, if you found a training, the dog is taken */
                        /* HTTP Status - 400 Bad Request */
                        res.status(400);
                        res.send("Bad request - training dog already exists in datastore");
                    } else {
                        model.update(req.params.id, req.body, (err, training) => {
                            if (err) {
                                next(err);
                                return;
                            }
                            /* HTTP Status - 200 OK; patch then respond */
                            res.status(200);
                            res.send(training);
                        });
                    }
                });
            } else {
                model.update(req.params.id, req.body, (err, training) => {
                    if (err) {
                        next(err);
                        return;
                    }
                    /* HTTP Status - 200 OK; patch then respond */
                    res.status(200);
                    res.send(training);
                });
            }
        }
    });
});

router.delete('/:id', function(req, res, next) {
    model.read(req.params.id, (err, targetTraining) => {
        /* Check if training is in a dog */
        if (targetTraining != undefined && targetTraining.dog != undefined) {
            dogmodel.read(targetTraining.dog.id, (err, dog) => { // NOTE: all params are strings
                if (dog != undefined) {
                    /* Find and delete targetTraining in dog.training */
                    let trainingArray = dog.training;
                    const index = trainingArray.findIndex(trainingElement => trainingElement.id = req.params.id);
                    trainingArray.splice(index, 1);

                    /* Update dog in datastore */
                    const data = {
                        training: trainingArray
                    }
                    dogmodel.update(dog.id, data, (err) => {
                        if (err) {
                            next (err);
                            return;
                        }
                    });
                }
            });
        } 
        /* Delete training from datastore */
        model.delete(req.params.id, err => {
            if (err) {
                next(err);
                return;
            } else {
                /* HTTP Status - 200 OK; delete then respond */
                res.status(200).send("Training deleted");
            }
        });
    });
});

/**********************************************************/
/* CARGO ROUTES ERROR HANDLING */
/**********************************************************/
// router.use((err, req, res, next) => {
//     /* Nothing specific going on here, right now */
//     console.log("Training error handler");
//     next(err);
// })

module.exports = router;
