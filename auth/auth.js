const jwt = require('express-jwt');
const jwksRsa = require('jwks-rsa');
const request = require('request');

let HOST_NAME = "";
if (process.env.NODE_ENV === "production") {
    HOST_NAME = `https://hartmaco-hw5.appspot.com`;
} else {
    HOST_NAME = `http://localhost:8080`;
}

/* Auth config */
const url = 'https://hartmaco.auth0.com';
const grant_type = 'password';
const client_id ='sshRL1DB0cy_Wq1M_3RbUPmA8BiyuMgg';
const client_secret = '7vYUl9QEkDJzwiVbqiVwhAlnk9vQUDRob674KxUas0xzwr4zr8d0bgaZFBX8OZvA';

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
    if (req.app.locals.auth0json == undefined) {
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
            console.log("Getting token");
            req.app.locals.auth0json = body;
            next();
        });
    } else {
        console.log("Don't need to get token");
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