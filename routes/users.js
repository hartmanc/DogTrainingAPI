/* /routes/dogs.js */
/* RESTful routes for dog resources */

/**********************************************************/
/* CONFIG */
/**********************************************************/
const express = require('express');
const request = require('request');

const model = require('../models/user');
const dogModel = require('../models/dog');

const auth = require('../auth/auth');
const checkJwt = auth.checkJwt;
const requestAuth0Token = auth.requestAuth0Token;
const router = express.Router();

const LIST_LENGTH = 5;
const HOST_NAME = require('../config').HOST_NAME;

/**********************************************************/
/* USER ROUTES */
/**********************************************************/
/* Test route, just to check requestAuth0Token w/ console.log */
router.get('/', requestAuth0Token, function(req, res, next) {
    console.log("GET '/users'");
    console.log(req.app.locals.auth0json);
    res.status(200).send("OK");
});

/* Get user with Auth0 ID */
router.get('/:id', function(req, res, next) {
    model.read(req.params.id, (err, user) => {
        if (err) {
            /* Assume bad request if error not spec'd */
            /* TODO: more elegant way to handle these errors? */
            err.resCode = err.resCode || 400;
            err.resMsg = err.resMsg || "Bad request - invalid user ID";
            next(err);
            return;
        }
        /* HTTP Status - 200 OK */
        res.status(200);
        res.send(user);
    });
});

/* Create a new user */
router.post('/', requestAuth0Token, function(req, res, next) {
    /* First check that email is not already used */
    if (req.body.email) {
        model.find('email', '=', req.body.email, (err, users) => {
            /* find passes an array of users to its callback */
            if (users[0] != undefined) {
                /* If you got a user back, then that email is taken */
                res.status(400);
                res.send("Bad request - user email already exists in datastore");
            } else {
                /* Set up options to create user with Auth0*/
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
                /* Auth0 user creation request */
                request(options, (error, response, body) => {
                    /* Create user in datastore */
                    if (error) throw new Error(error);
                    const data = {
                        id: body.identities[0].user_id,
                        email: req.body.email,
                        created: Date.now(),
                        dogs: [],
                        self: `${HOST_NAME}/users/${body.identities[0].user_id}`
                    }
                    model.create(data, err => {
                        if (err) {
                            res.status(500).send("Server error - auth database updated but local datastore encountered error");
                        } else {
                            /* Send Auth0 response with ID */
                            res.status(201).send(data);
                        }
                    });
                });
            }
        })
    }
});

/* Delete a user */ 
/* TODO: Currently, no user auth check before delete - admin func. only? */
router.delete('/:id', [requestAuth0Token, checkJwt], function(req, res, next) {
    owner_id = req.user.sub.split('|').pop();
    /* First, check user exists */
    model.read(req.params.id, (err, targetUser) => {
        if (err) {
            /* Assume bad request if not spec'd */
            err.resCode = err.resCode || 400;
            err.resMsg = err.resMsg || "Bad request - invalid user ID";
            next(err);
            return;
        } else if (targetUser.dogs.length > 0) {
            /* Assume bad request if not spec'd */
            err = {};
            err.resCode = 400;
            err.resMsg = "Bad request - user with dogs can't be deleted";
            next(err);
            return;
        } else if (targetUser.id != owner_id) {
            /* Assume bad request if not spec'd */
            err = {};
            err.resCode = 403;
            err.resMsg = "Forbidden - user doesn't have permission to delete this user";
            next(err);
            return;
        } else {
            /* Delete user from local datastore */
            model.delete(req.params.id, err => {
                if (err) {
                    next(err);
                    return;
                } else {
                    /* Delete user from Auth0 */
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
                }
            })
        }
    })
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
/* USER ROUTES ERROR HANDLING */
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
