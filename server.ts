import appInit from "./express_server";
import wsInit from "./websocket_server";

const config = require('config');
const http = require('http');
const express = require('express');
const port = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);

let socketFuncts = wsInit(server, config.ws_server);
appInit(app, config.http_server, socketFuncts);

server.listen(port, ()=>{
    console.log("To view your app, open this link in your browser: http://localhost:" + port);
});