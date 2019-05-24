const jwt = require('express-jwt');
const jwksRsa = require('jwks-rsa');

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

// TODO: Check that these URIs actually work?
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

module.exports = {
    checkJwt,
    url,
    grant_type,
    client_id,
    client_secret,
};
