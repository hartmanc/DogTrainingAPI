/* API config */
let HOST_NAME = "";
if (process.env.NODE_ENV === "production") {
    HOST_NAME = `https://hartmaco-final-proj.appspot.com`;
} else {
    HOST_NAME = `http://localhost:8080`;
}

const url = ''; /* Unique identifier for the Auth0 API; e.g., "https://unique.auth0.com"
const grant_type = 'password';
const client_id = ''; /* Client ID provided by the Auth0 API */
const client_secret = ''; /* Client secret provided by the Auth0 API */

module.exports = {
    HOST_NAME,
    url,
    grant_type,
    client_id,
    client_secret
}
