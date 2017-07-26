
const coap         = require('coap');
const RD           = require('./rd.js');

const defaultCoAPport = 5683;

const serverOptions = {
    type: 'udp6',
};

/**
 * Basic /.well-known/core functionality
 */
returnPaths = function(incoming, outgoing) {
    // XXX TBD
};

const urlRouting = {
    '.well-known/core': {
	POST  : RD.prototype.registerSimple,  // Sections 5.3.1 and 5.3.2
	GET   : returnPaths,
    },
    'rd/': {
	POST  : RD.prototype.update,          // Section 5.4.1
	DELETE: RD.prototype.remove,          // Section 5.4.2
	GET   : RD.prototype.read,            // Section 5.4.3
	PATCH : RD.prototype.patch,           // Section 5.4.4
    },
    'rd': {
	POST  : RD.prototype.register,        // Section 5.3
    },
    'rd-lookup/ep': {
	GET   : RD.prototype.lookup('ep'),
    },
    'rd-lookup/res': {
	GET   : RD.prototype.lookup('res'),
    },
    'rd-lookup/d': {
	GET   : RD.prototype.lookup('d'),
    },
    'rd-lookup': {
	GET   : RD.prototype.lookup,          // Section 7
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

/**
 * Resource Directory server class
 */
class RDServer extends RD {
    constructor(options) {
	options = options || {};
	super(options);

	const serverOpts = Object.assign({}, serverOptions, options.coap);
	this.server = coap.createServer(serverOpts, listener);
	// In `listener` function, `this` is the CoAP server, not us.
	// Hence, we have to store the rd in server so that it is
	// available in the `listener` function.
	this.server.rd = this;
	this.server.listen(defaultCoAPport);
	console.log('CoAP RD: listening.');
	return this;
    }
};

module.exports = RDServer;
