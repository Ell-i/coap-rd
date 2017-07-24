
const coap = require('coap');
const rd   = require('./rd.js');

const defaultCoAPport = 5683;

const serverOptions = {
    type:               'udp6',
    multicastAddress:   'FF02::1',
//  multicastInterface: 'en8',
};

function listener(request, response) {
    const pathName = request.options.filter(o => o.name === 'Uri-Path').join('/');
    const pathHandler = rd.handlers[pathName];
    if (!pathHandler) {
	response.code = 404; // Not Found
	return;
    }
    const methodHandler = pathHandler[request.method];
    if (!methodHandler) {
	response.code = 405; // Method Not Allowed
    }
    methodHandler(request, response);
}

exports.startServer = function(XXX) {
    const server = coap.createServer(serverOptions, listener);
    server.listen(defaultCoAPport);
    return server;
};

    
