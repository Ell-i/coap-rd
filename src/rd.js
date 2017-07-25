
const toArray              = require('stream-to-array');
const ldJSONstream         = require('jsonld-stream');
const linkFormatJSONstream = require('./link-format-json-stream');
const URI                  = require('uri-js');

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
	    path:   null,
	}
    };

    // Assing the endpoint from defaultParameters, overwritten by parameters
    return Object.assign(endpoint, defaultParameters, parameters);
}

/**
 * Create an Array of EP resources from a payload stream
 */
async function makeResources(incoming) {
    const contentFormat = incoming.options.filter(o => o.name === 'Content-Format');
    switch (contentFormat) {
    case 'application/link-format':
	return (await toArray(incoming.pipe(linkFormatJSONstream)));
    case 'application/link-format+json':
	return (await toArray(incoming.pipe(ldJSONstream)));
    case 'application/link-format+cbor':
	return (await toArray(incoming.pipe(CBORxxx)));
    default:
	throw new Error('Unknown content format ' + contentFormat);
    }
}

/**
 * The actual resource directory functions
 */
const rd = {

    _idCounter: 0,

    _endpoints: {},

    _registerOrUpdate: function(ep) {
	if (rd._endpoints[ep.ep]) {
	    Object.assign(rd._endpoints[ep.ep], ep);
	    console.log('CoAP RD server: Updated endpoint ' + ep.ep + ": "
			+ JSON.stringify(rd._endpoints[ep.ep]));
	} else {
	    ep.id = rd._idCounter++;
	    rd._endpoints[ep.ep] = ep;
	    console.log('CoAP RD server: Registered endpoint ' + ep.ep + ": "
			+ JSON.stringify(ep));
	}

	return ep.id;
    },

    /**
     * Implementation of Sections 5.3.1 and 5.3.2
     */
    registerSimple: function(incoming, outgoing) {
	const ep = makeEndpoint(incoming);

	// Handle the old -07 Section 4 functionality with non-empty payload
	// Also see the mailing list discussion in June 13-21, 2016
	if (incoming.payload.length != 0) {
	    ep.resources = makeResources(incoming);
	    outgoing.code = 201; // Created
	} else {
	    outgoing.code = 204; // Changed
	    // XXX triggerQuery(XXX);
	}

	rd._registerOrUpdate(ep);
    },

    /**
     * Implementation of Section 5.3 introduction part
     */
    register: function(incoming, outgoing) {
	const ep = makeEndpoint(incoming);
	ep.resources = makeResources(incoming);

	const id = rd._registerOrUpdate(ep);

	outgoing.setOption('Content-Format', 'application/link-format');
	outgoing.setOption('Location-Path', '/rd/' + id);
	outgoing.code = 201; // Created
    },

    /**
     * Implementation of Section 7
     */
    lookup: function(incoming, outgoing) {
    },

    
};

/**
 * Basic /.well-known/core functionality
 */
const core = {
    returnPaths : function(incoming, outgoing) {
    }
};

/**
 * Resource paths used by this RD
 */
const rp = {
    core: {
	'rd'           : '</rd>',
	'rd-lookup-ep' : '</rd-lookup/ep>',
	'rd-lookup-res': '</rd-lookup/res>',
	'rd-lookup-d'  : '</rd-lookup/d>',
    },
};

const urlRouting = {
    '.well-known/core': {
	POST  : rd.registerSimple,  // Sections 5.3.1 and 5.3.2
	GET   : core.returnPaths,
    },
    'rd/': {
	POST  : rd.update,          // Section 5.4.1
	DELETE: rd.remove,          // Section 5.4.2
	GET   : rd.read,            // Section 5.4.3
	PATCH : rd.patch,           // Section 5.4.4
    },
    'rd': {
	POST  : rd.register,        // Section 5.3
    },
    'rd-lookup/ep': {
	GET   : rd.lookup('ep'),
    },
    'rd-lookup/res': {
	GET   : rd.lookup('res'),
    },
    'rd-lookup/d': {
	GET   : rd.lookup('d'),
    },
    'rd-lookup': {
	GET   : rd.lookup,          // Section 7
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

exports.handlers = urlRouting;
