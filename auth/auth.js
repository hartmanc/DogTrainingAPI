const jwt = require('express-jwt');
const jwksRsa = require('jwks-rsa');
const request = require('request');
const config = require('../config')

/* Auth config */
const url = config.url;
const grant_type = config.grant_type; 
const client_id = config.client_id;
const client_secret = config.client_secret;

/* Function to check JWT credentials */
const checkJwt = jwt({
    secret: jwksRsa.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${url}/.well-known/jwks.json`
    }),

    // Validate the audience and the issuer
    issuer: `${url}/`,
    algorithms: ['RS256']
});

/* Function to request Auth0 API token, which is required for creating and
 * deleting users */
// TODO: Add something to check time and re-request token on expiration
const requestAuth0Token = function(req, res, next) {
    if (req.app.locals.auth0json == undefined ||
        req.app.locals.auth0json.exp < Date.now()) {
        const options = {
            method: 'POST',
            url: `${url}/oauth/token`,
            headers: {'content-type': 'application/json'},
            body: {
                client_id: client_id,
                client_secret: client_secret,
                audience: `${url}/api/v2/`,
                grant_type: "client_credentials"
            },
            json: true
        }

        request(options, (error, response, body) => {
            if (error) throw new Error(error);
            // This should fix token expiration bug
            body.exp = Date.now() + body.expires_in;
            req.app.locals.auth0json = body;
            next();
        });
    } else {
        // console.log("Don't need to get token");
        next();
    }
}

module.exports = {
    checkJwt,
    requestAuth0Token,
    url,
    grant_type,
    client_id,
    client_secret
};
