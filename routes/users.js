/* /routes/dogs.js */
/* RESTful routes for dog resources */

/**********************************************************/
/* CONFIG */
/**********************************************************/
const express = require('express');
const request = require('request');

const dogModel = require('../models/dog');
const auth = require('../auth/auth');
const checkJwt = auth.checkJwt;
const requestAuth0Token = auth.requestAuth0Token;
const router = express.Router();

const LIST_LENGTH = 5;
const HOST_NAME = require('../config');

/**********************************************************/
/* USER ROUTES */
/**********************************************************/
/* Test route, just to check requestAuth0Token w/ console.log */
router.get('/', requestAuth0Token, function(req, res, next) {
    console.log("GET '/users'");
    console.log(req.app.locals.auth0json);
    res.status(200).send("OK");
});

/* Create a new user */
router.post('/', requestAuth0Token, function(req, res, next) {
    const options = {
        method: 'POST',
        url: `${auth.url}/api/v2/users`,
        headers: {
            'content-type': 'application/json',
            'authorization': `Bearer ${req.app.locals.auth0json.access_token}`
        },
        body: {
            email: req.body.email,
            connection: "Username-Password-Authentication",
            password: req.body.password
        },
        json: true
    };
    request(options, (error, response, body) => {
        if (error) throw new Error(error);
        res.status(201).send(body);
    });
});

/* Delete a user */
router.delete('/:id', requestAuth0Token, function(req, res, next) {
    const options = {
        method: 'DELETE',
        url: `${auth.url}/api/v2/users/auth0|${req.params.id}`,
        headers: {
            'authorization': `Bearer ${req.app.locals.auth0json.access_token}`
        }
    }
    request(options, (error, response, body) => {
        if (error) throw new Error(error)
        else if (body !== "") {
            body = JSON.parse(body);
            res.status(body.statusCode).send(body.message);
        } else res.status(204).send();
    });
});

/* Get a list of dogs owned by a user, when authorized */
router.get('/:id/dogs', checkJwt, function(req, res, next) {
    if (req.user.sub !== `auth0|${req.params.id}`) {
        /* 403 error - user not authorized to view this user's summary */
        res.status(403);
        res.send("Forbidden: user is not authorized to view this dog list");
    } else {
        dogModel.filterList(LIST_LENGTH, req.query.token, "owner_id", "=", req.params.id,
        (err, dogs, cursor) => {
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
                nextPageLink = `${HOST_NAME}/users/${req.params.id}/dogs?token=${cursor}`

            /* HTTP Status - 200 OK */
            res.status(200);
            res.send({
                dogs: dogs,
                nextPageToken: cursor,
                nextPageLink: nextPageLink
            });
        });
    }
});

/**********************************************************/
/* SHIP ROUTES ERROR HANDLING */
/**********************************************************/
router.all('/', (req, res, next) => {
    res.status(405).set("Allow","n/a").send("Method not allowed");
});

router.all('/:id', (req, res, next) => {
    res.status(405).set("Allow","n/a").send("Method not allowed");
});

router.all('/:id/dog', (req, res, next) => {
    res.status(405).set("Allow","GET").send("Method not allowed");
});

module.exports = router;
