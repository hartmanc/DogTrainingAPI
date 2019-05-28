/* API config */
let HOST_NAME = "";
if (process.env.NODE_ENV === "production") {
    HOST_NAME = `https://hartmaco-hw7.appspot.com`;
} else {
    HOST_NAME = `http://localhost:8080`;
}

module.exports = HOST_NAME;
