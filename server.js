'use strict';

/**********************************************************/
/* CONFIG */
/**********************************************************/
const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const app = express();

// ejs
app.set('view engine', 'ejs');
// Parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
// Parse application/json
app.use(bodyParser.json());

/**********************************************************/
/* MIDDLEWARE */
/**********************************************************/
function notAcceptableError(req, res, next) {
    if (!req.accepts('json')) {
        res.status(406).send("Not acceptable - only available representation of resources is JSON");
    } else {
        next();
    }
}

app.use(notAcceptableError);

/**********************************************************/
/* ROUTES */
/**********************************************************/
const dogRoutes = require('./routes/dogs');
const trainingRoutes = require('./routes/trainings');
const userRoutes = require('./routes/users');
const auth = require('./auth/auth');

app.use('/dogs', dogRoutes);
app.use('/trainings', trainingRoutes); // "trainings" sounds weird
app.use('/users', userRoutes);

app.get('/', async (req, res, next) => {
    res.status(200);
    res.send('Hello from app engine!');
});

app.post('/login', function(req, res, next) {
    const username = req.body.username;
    const password = req.body.password;
    const options = {
        method: 'POST',
        url: `${auth.url}/oauth/token`,
        headers: { 'content-type': 'application/json'},
        body: {
            grant_type: auth.grant_type,
            username: username,
            password: password,
            client_id: auth.client_id,
            client_secret: auth.client_secret,
            audience: auth.audience
        },
        json: true
    }
    /* POST to Auth0 api to get id_token */
    request(options, (error, response, body) => {
        if (error) {
            next(error);
        } else {
            res.send(body);
        }
    })
});

/**********************************************************/
/* GENERAL ERROR HANDLING */
/**********************************************************/
/* Basic 404 handler */
app.use((req, res) => {
    res.status(404).send('Resource not found');
})

/* General error handler */
app.use((err, req, res, next) => {
    res.status(err.resCode || err.status || 500);
    res.send(err.resMsg || err.message || 'Internal server error');
});

/* Listen to the App Engine-specified port,
 * or 8080 otherwise
 */
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}...`);
});

