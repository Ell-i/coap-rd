
const coap = require('coap');
const RD   = require('./rd.js');

const defaultCoAPport = 5683;

const serverOptions = {
    type:               'udp6',
//  multicastAddress:   'FF02::1',
//  multicastInterface: 'en8',
};

/**
 * Basic /.well-known/core functionality
 */
returnPaths = function(incoming, outgoing) {
};

const urlRouting = {
    '.well-known/core': {
	POST  : RD.registerSimple,  // Sections 5.3.1 and 5.3.2
	GET   : returnPaths,
    },
    'rd/': {
	POST  : RD.update,          // Section 5.4.1
	DELETE: RD.remove,          // Section 5.4.2
	GET   : RD.read,            // Section 5.4.3
	PATCH : RD.patch,           // Section 5.4.4
    },
    'rd': {
	POST  : RD.register,        // Section 5.3
    },
    'rd-lookup/ep': {
	GET   : RD.lookup('ep'),
    },
    'rd-lookup/res': {
	GET   : RD.lookup('res'),
    },
    'rd-lookup/d': {
	GET   : RD.lookup('d'),
    },
    'rd-lookup': {
	GET   : RD.lookup,          // Section 7
    },
};

function handle(rd, path, request, response) {
    console.log('CoAP RD: Serving "/' + path + '"');

    const pathHandler = urlRouting[path];

    if (!pathHandler) {
	console.log('CoAP RD: Path not found');
	response.code = '404'; // Not Found
	return;
    }
    const methodHandler = pathHandler[request.method];
    if (!methodHandler) {
	console.log('CoAP RD: Method not found');
	response.code = '405'; // Method Not Allowed
	return;
    }
    methodHandler.apply(rd, [request, response]);
    console.log('CoAP RD: Serving "/' + path + '" done.');
}

/**
 * Handle requests
 *
 * Note that `this` is bound to the coap server object, not our RD server object
 */
function listener(request, response) {
    const path = request.options.filter(o => o.name === 'Uri-Path').map(o => o.value).join('/');
    try {
	handle(this.rd, path, request, response);
    } catch (err) {
	console.log("CoAP RD server: exception " + err.stack);
	throw err;
    }
    response.end();
}

exports.startServer = function(XXX) {
    this.server = coap.createServer(serverOptions, listener);
    this.server.rd = new RD();  // Since in `listener` `this` is the CoAP server, not us
    this.server.listen(defaultCoAPport);
    console.log('CoAP RD: listening');
    return this;
};

    
