
const coap = require('coap');
const rd   = require('./rd.js');

const defaultCoAPport = 5683;

const serverOptions = {
    type:               'udp6',
//  multicastAddress:   'FF02::1',
//  multicastInterface: 'en8',
};

function handle(path, request, response) {
    console.log('CoAP RD server: Serving "/' + path + '"');

    const pathHandler = rd.handlers[path];

    if (!pathHandler) {
	console.log('CoAP RD server: path not found');
	response.code = '404'; // Not Found
	return;
    }
    const methodHandler = pathHandler[request.method];
    if (!methodHandler) {
	console.log('CoAP RD server: method not found');
	response.code = '405'; // Method Not Allowed
	return;
    }
    methodHandler(request, response);
    console.log('CoAP RD server: Serving "/' + path + '" done.');
}

function listener(request, response) {
    const path = request.options.filter(o => o.name === 'Uri-Path').map(o => o.value).join('/');
    try {
	handle(path, request, response);
    } catch (err) {
	console.log("CoAP RD server: exception " + err.stack);
	throw err;
    }
    response.end();
}

exports.startServer = function(XXX) {
    const server = coap.createServer(serverOptions, listener);
    server.listen(defaultCoAPport);
    return server;
};

    
