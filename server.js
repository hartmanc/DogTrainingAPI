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
/* ROUTES */
/**********************************************************/
const shipRoutes = require('./routes/ships');
const slipRoutes = require('./routes/slips');
const cargoRoutes = require('./routes/cargos');
const auth = require('./auth/auth');

app.use('/ships', shipRoutes.unprotected);
app.use('/ships', auth.checkJwt, shipRoutes.protected);
app.use('/slips', slipRoutes);
app.use('/cargo', cargoRoutes); // "cargos" sounds weird

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
})

/**********************************************************/
/* GENERAL ERROR HANDLING */
/**********************************************************/
/* Basic 404 handler */
app.use((req, res) => {
    res.status(404).send('Resource not found');
})

/* General error handler */
app.use((err, req, res, next) => {
    res.status(err.resCode || 500).send(err.resMsg || 'Internal server error');
});

/* Listen to the App Engine-specified port,
 * or 8080 otherwise
 */
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}...`);
});

