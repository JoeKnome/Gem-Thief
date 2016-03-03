// requires
var http = require('http');
var fs = require('fs');
var socketio = require('socket.io');

// try to use node's port or default to 3000
var port = process.env.PORT || process.env.NODE_PORT || 3000;

// read html page
var index = fs.readFileSync(__dirname + "/../client/client.html");

// returns chat page on request
function onRequest(request, response) {
	// return page
	response.writeHead(200, {"Content-Type": "text/html"});
	response.write(index);
	
	// close stream
	response.end();
}

// create server and listen to port
var app = http.createServer(onRequest).listen(port);
console.log("Listening on port " + port);

// create websocket server
var io = socketio(app);

console.log("Server started");