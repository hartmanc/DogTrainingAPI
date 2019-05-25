/* /routes/ships.js */
/* RESTful routes for ship resources */

/**********************************************************/
/* CONFIG */
/**********************************************************/
const express = require('express');
const request = require('request');

const shipModel = require('../models/ship');
const auth = require('../auth/auth');
const checkJwt = auth.checkJwt;
const requestAuth0Token = auth.requestAuth0Token;

const router = express.Router();

const LIST_LENGTH = 3;

let HOST_NAME = "";
if (process.env.NODE_ENV === "production") {
    HOST_NAME = `https://hartmaco-hw6.appspot.com`;
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

/* Get a list of ships owned by a user, when authorized */
router.get('/:id/ships', checkJwt, function(req, res, next) {
    if (req.user.sub !== `auth0|${req.params.id}`) {
        /* 403 error - user not authorized to view this user's summary */
        res.status(403);
        res.send("Forbidden: user is not authorized to view this ship list");
    } else {
        shipModel.filterList(LIST_LENGTH, req.query.token, "owner_id", "=", req.params.id,
        (err, ships, cursor) => {
            if (err) {
                /* Assume bad request if error not spec'd */
                /* TODO: more elegant way to handle these errors? */
                console.log(err);
                err.resCode = err.resCode || 400;
                err.resMsg = err.resMsg || "Bad request - invalid ship index";
                next(err);
                return;
            }
            /* HTTP Status - 200 OK */
            res.status(200);
            res.send({
                ships: ships,
                nextPageToken: cursor,
                nextPageLink: `${HOST_NAME}/ships/${req.params.id}/ship?token=${cursor}`
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

router.all('/:id/ship', (req, res, next) => {
    res.status(405).set("Allow","GET").send("Method not allowed");
});

module.exports = router;
