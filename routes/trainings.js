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

const checkJwt = require('../auth/auth').checkJwt;

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

router.post('/', checkJwt, function(req, res, next) {
    /* All training should begin unassigned to any dog */
    if (req.body.dog) {
        /* HTTP Status - 400 Bad Request */
        res.status(400);
        res.send("Bad request - new training should be unassigned to any dog");
    } else if (req.body.trainer == undefined) {
        res.status(400);
        res.send("Bad request - new training must have 'trainer' key/value");
    } else if (req.body.title == undefined) {
        res.status(400);
        res.send("Bad request - new training must have 'title' key/value");
    } else {
        let data = Object.assign({}, req.body);
        data.created_by_name = req.user.name;
        data.created_by_id = req.user.sub.split('|').pop();
        data.created_on_date = Date.now(); // Since Unix epoch
        model.create(data, (err, training) => {
            if (err) {
                next(err);
                return;
            } else {
                /* HTTP Status - 201 Created */
                res.status(201).json({id: `${training.key.id}`});
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
        } else if (req.body.dog != undefined || req.body.dog_link != undefined) {
            res.status(400).send("Bad request - cannot change dog ID with this interface");
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
});

router.delete('/:id', function(req, res, next) {
    model.read(req.params.id, (err, targetTraining) => {
        /* Check if training is in a dog */
        // if (targetTraining != undefined && targetTraining.dog != undefined) {
        //     // TODO: No deletes if training is assigned to dog
        //     dogmodel.read(targetTraining.dog.id, (err, dog) => { // NOTE: all params are strings
        //         if (dog != undefined) {
        //             /* Find and delete targetTraining in dog.training */
        //             let trainingArray = dog.training;
        //             const index = trainingArray.findIndex(trainingElement => trainingElement.id = req.params.id);
        //             trainingArray.splice(index, 1);

        //             /* Update dog in datastore */
        //             const data = {
        //                 training: trainingArray
        //             }
        //             dogmodel.update(dog.id, data, (err) => {
        //                 if (err) {
        //                     next (err);
        //                     return;
        //                 }
        //             });
        //         }
        //     });
        // } 
        /* Assume bad request if error not spec'd */
        if (err) {
            err.resCode = err.resCode || 400;
            err.resMsg = err.resMsg || "Bad request - invalid training ID";
            next(err);
            return;
        /* If training can be found */
        } else {
            /* Delete training from datastore */
            model.delete(req.params.id, err => {
                if (err) {
                    next(err);
                    return;
                } else {
                    /* HTTP Status - 204 No Content */
                    res.status(204).send();
                }
            });
        }
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
