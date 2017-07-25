/**
 * Convert RFC6690 CoRE Link Format content to draft-ietf-core-links-json-09 JSON objects
 *
 * Copyright (c) 2017 Ell-i open source co-operative
 */

const Transform = require('stream').Transform;
const assert    = require('assert');
const URIJS     = require('uri-js');

/**
 * Regular expression to match an URI
 *
 * See Appendix B of RFC 3986 and the listed RFCs
 */
const UNRESERVED    = '[\\w\\d\\.\\~\\!\\$\\&\\\'\\(\\)\\*\\+\\,\\;\\=\\-]';  // RFC 3986
const ATTR_CHAR     = '[\\w\\d\\!\\#\\$\\&\\+\\-\\.\\^\\`\\|\\~]';            // RFC 5987 attr-char
const PARMNAME      = '(?:' + ATTR_CHAR + '+)';                               // RFC 6690 parmname
const QUOTED_STRING = '(?:"(?:[^"]|(?:\\\\[\\0-~]))*")';                      // RFC 2616

const PTOKEN        = '[\\w\\d\\!\\#\\$\\%\\&\\\'\\(\\)\\*\\+\\-\\.\\/\\:\\<'
                    + '\\=\\>\\?\\@\\[\\]\\^\\`\\{\\|\\}\\~]+';               // RFC 6690 ptoken

const URI
      = '(?:([\\w][\\w\\d\\+\\.\\-]+):)?'                                 // $1: RFC 3986 scheme
      + '(?:'
         + '\\/\\/('                                                      // $2: RFC 3986 authorisation
           + '(?:('                +UNRESERVED+ '*)@)?'                   // $3: RFC 3986 userinfo
           + '(\\[[\\dA-F:.]+\\]|' +UNRESERVED+ '*)(?:\\:(\\d*))?'        // $4: RFC 3986 host, $5: port
         + ')'
      + ')?'
      + '([^?#<>]*)'                                                      // $6: RFC 3986 path
      + '(?:\\?([^#<>]*))?'                                               // $7: RFC 3986 query
      + '(?:#((?:.|\\n|\\r)*))?';                                         // $8: RFC 3986 fragment


/**
 * Regular expression to match RFC 6690 CoRE Link parameters
 */
const PARAM = PARMNAME + '=' + PTOKEN + '|' + QUOTED_STRING;
const PARAMS = '(?:\\;(' + PARAM + '))*';                                 // $9: RFC 6690 link-params
const PARAM_RE = new RegExp("^(" + PARAM + ")$");

/**
 * Regular expression to match RFC 6690 CoRE Link Format
 */
const LINK = '<' + URI + '>' + PARAMS;
const LINK_RE = new RegExp("^" + LINK + '(?:,|$)');

/**
 * Nodejs Transform Stream to convert an RFC 6690 CoRE Link Format string(s) to a stream JSON objects
 */
class LinkFormatJSON extends Transform {
    constructor(options) {
	options = options || {};
	options['objectMode'] = true;
	super(options);
    }

    /**
     * Transform RFC 6690 CoRE Link Format to JSON objects
     *
     * See draft-ietf-core-links-json-09.txt
     */
    _transform(buffer, encoding, callback) {
	try {
	    var string = buffer.toString();
	    do {
		const [
		    match,
		    scheme,
		    authorisation,
		    userinfo,
		    host,
		    port,
		    path,
		    query,
		    fragment,
		    linkParams
		] = string.match(LINK_RE);

		if (!match || match.length <= 0) { // Be robust...
		    break;
		}
		assert(string.startsWith(match));
		string = string.slice(match.length);

		// Generate back the URI from the parsed componets
		const uri = URIJS.serialize(
		    {
			scheme:   scheme,
			userinfo: userinfo,
			host:     host,
			port:     port,
			path:     path,
			query:    query,
			fragment: fragment,
		    }
		);

		// Split the params, if any
		var params = {};
		if (linkParams) {
		    const parArr = linkParams.split(';');
		    parArr.shift(); // Remove the first empty element
		    parArr.forEach(function (param) {
			const [match, name, value] = param.match(PARAM_RE);
			params[name] = value;
		    });
		}

		const resource = Object.assign({ href: uri }, params);

		this.push(resource);

	    } while (string.length);
	} catch (err) {
	    return callback(err);
	}
	callback();
    }
}

module.exports = LinkFormatJSON;

