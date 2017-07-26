
const EventEmitter         = require('events');
const crypto               = require('crypto');

const toArray              = require('stream-to-array');
const ldJSONstream         = require('jsonld-stream');
const linkFormatJSONstream = require('./link-format-json-stream');
const URI                  = require('uri-js');
const coap                 = require('coap');

const defaultDomain        = 'local';
const defaultEndpointType  = 'thing';
const defaultLifetime      = 86400;

/**
 * Validate that a string is non-empty and less than 63 characters long
 */
function validate63(string) {
    return string != '' && string.length < 64;
}

/**
 * Validate that a given lifetime is valid
 */
function validatelt(lt) {
    return lt >= 60 && lt <= 4294967295;
}

/**
 * Validate that a given context is valid
 */
function validateContext(con) {
}

/**
 * Description of the allowed parameters in registrations and updates
 */
const parameters = {
    ep:  { dflt: null,                validate: validate63      },
    d:   { dflt: defaultDomain,       validate: validate63      },
    et:  { dflt: defaultEndpointType, validate: validate63      },
    lt:  { dflt: defaultLifetime,     validate: validatelt      },
    con: { dflt: null,                validate: validateContext },
};

/**
 * Extract non-null default parameters.
 */
const defaultParameters =
      Object.keys(parameters).reduce(function(defaults, key) {
	  if (parameters[key].dflt) {
	      defaults[key] = parameters[key].dflt;
	  }
	  return defaults;
      }, {});

/**
 * Create an Endpoint object out of a request
 */
function makeEndpoint(incoming) {
    // Convert CoAP options into { name: value } pairs
    const parameters = incoming.options

	  .filter(option => option.name === 'Uri-Query')

          // Convert query options into { name: value } pairs
	  .map(function(option) {
	      // Split the option and destructure the resulting array
	      [name, ...values] = option.value.toString('ASCII').split('=');
	      return { name: name, value: values.join('=') };
	  })

          // Convert con parameters (if any) into structured ones
	  .map(function(option) {
	      if (option.name === 'con') {
		  return { [option.name]: URI.parse(option.value) };
	      }
	      return option;
	  })

          // Convert the array of { name: value } pairs into an object
	  .reduce(function(object, option) {
	      object[option.name] = option.value;
	      return object;
	  }, {});

    // Create a default context object
    const endpoint = {
	con: {
	    scheme: 'coap',
	    family: incoming.rsinfo.family,
            host:   incoming.rsinfo.address,
	    port:   incoming.rsinfo.port,
	}
    };

    // Assing the endpoint from defaultParameters, overwritten by parameters
    return Object.assign(endpoint, defaultParameters, parameters);
}

/**
 * Create an Array of EP resources from a payload stream
 *
 * XXX: Convert to return a stream, so that we can handle observed cores.
 */
async function makeResources(incoming) {
    const contentFormats = incoming.options.filter(o => o.name === 'Content-Format');
    if (!contentFormats[0]) {
	return new Promise(() => undefined);
    }
    const contentFormat = contentFormats[0].value.toString();

    try {
	switch (contentFormat) {
	case 'application/link-format':
	    return (await toArray(incoming.pipe(new linkFormatJSONstream())));
	case 'application/link-format+json':
	    return (await toArray(incoming.pipe(new ldJSONstream())));
	case 'application/link-format+cbor':
	    return (await toArray(incoming.pipe(new CBORxxx())));
	default:
	    throw new Error('Unknown content format ' + contentFormat);
	}
    } catch (err) {
	console.log("makeResources: Error: " + err);
	throw err;
    }
}

/**
 * Create an identifier for an Endpoint
 */
function makeEpIdentifier(ep) {
    return crypto
	.createHash('sha256')
	.update(ep.ep, 'ascii')
	.update(ep.d, 'ascii')
	.digest('hex')
	.slice(0, 16);
}

/**
 * The actual resource directory
 */
class RD extends EventEmitter {
    constructor(options) {
	super();
	this._endpoints = {};
	this._options   = options = options || {};

	// If the domain is set in the options, make that the default
	// when handling incoming resources
	if (options.domain) {
	    console.log('CoAP RD: Setting default domain to "' + options.domain + '".');
	    defaultParameters.d = options.domain;
	}
    }

    /**
     * Register or update an endpoint
     */
    _registerOrUpdate(ep) {
	if (this._endpoints[ep.ep]) {
	    Object.assign(this._endpoints[ep.ep], ep);
	    this.emit('update', ep);
	    console.log('CoAP RD: Updated endpoint ' + ep.ep);
	} else {
	    ep.id = makeEpIdentifier(ep);
	    this._endpoints[ep.ep] = ep;
	    this.emit('register', ep);
	    console.log('CoAP RD: Registered endpoint ' + ep.ep);
	}

	return this._endpoints[ep.ep].id.toString();
    };

    /**
     * Trigger a /.well-known/core query to a Endpoint
     */
    _triggerCoreQuery(ep) {
	const url = Object.assign(
	    {
		method:   'GET',
		pathname: '/.well-known/core',
	    },
	    ep.con
	);

	const req = coap.request(url);

	req.on('response', function(res) {
	    // Override any old resources
	    const promise = makeResources(res);
	    promise.then(function (value) {
		ep.resources = value;
		console.log("Resources = " + JSON.stringify(ep.resources));
	    });
	});

	req.on('error', function(err) {
	    throw new Error(err);
	});

	req.end();
    }

    /**
     * Implementation of Sections 5.3.1 and 5.3.2
     */
    registerSimple(incoming, outgoing) {
	const ep = makeEndpoint(incoming);

	// Handle the old -07 Section 4 functionality with non-empty payload
	// Also see the mailing list discussion in June 13-21, 2016
	if (incoming.payload.length != 0) {
	    const promise = makeResources(incoming);
	    outgoing.code = 201; // Created
	    promise.then(value => {
		ep.resources = value;
		console.log("Resources = " + JSON.stringify(ep.resources));
		this._registerOrUpdate(ep);
	    });
	} else {
	    this._registerOrUpdate(ep);
	    outgoing.code = 204; // Changed
	    this._triggerCoreQuery(ep);
	}
    }

    /**
     * Implementation of Section 5.3 introduction part
     */
    register(incoming, outgoing) {
	const ep = makeEndpoint(incoming);

	const id = this._registerOrUpdate(ep);

	makeResources(incoming)
	    .then(value => {
		ep.resources = value;
		console.log("Resources = " + JSON.stringify(ep.resources));

		this._registerOrUpdate(ep);
	    });

	outgoing.setOption('Location-Path', ['rd', id]);
	outgoing.code = 201; // Created
    }

    /**
     * Implementation of Section 7
     */
    lookup(incoming, outgoing) {
	if (outgoing === undefined) {
	    return function(incoming, outgoing) { return 'XXX'; }
	}
    };
}

/* XXX: Following is very much work in progress and will disappear/transform */

/**
 * Resource paths used by this RD
 */
RD.prototype._rp = {
    core: {
	'rd'           : '</rd>',
	'rd-lookup-ep' : '</rd-lookup/ep>',
	'rd-lookup-res': '</rd-lookup/res>',
	'rd-lookup-d'  : '</rd-lookup/d>',
    },
};

const XXX = 0;

const resourceTypes = {
    'core.rd-lookup-d'  : XXX,
    'core.rd-lookup-res': XXX,
    'core.rd-lookup-ep' : XXX,
    'core.rd-lookup-gp' : XXX,
    'core.rd-lookup*'   : XXX,
    'core.rd-group'     : XXX,
    'core.rd*'          : XXX,
    'core.rd'           : XXX,
};

module.exports = RD;
