const handler = require("serve-handler");
const http = require("http");
const path = require("path");

(async () => {
    const server = http.createServer((request, response) => {
        return handler(request, response, {
            public: path.join(__dirname, "..", "__resources__")
        });
    });

    const url = await new Promise((resolve, reject) => {
        server.listen(0, () => {
            resolve(`http://localhost:${server.address().port}`);
        });
    });

    console.log(`${url}`);
})();