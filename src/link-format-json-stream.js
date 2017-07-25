/**
 * Convert RFC6690 Link Format content to draft-ietf-core-links-json-09 JSON objects
 */

const Transform = require('stream').Transform;

class LinkFormatJSON extends Transform {
    constructor(options) {
	super(options);
    }

    _transform(obj, encoding, callback) {
	try {
	    // XXX Continue here
	} catch (err) {
	    return callback(err);
	}
	this.push(obj);
	callback();
    }
}

module.exports = LinkFormatJSON;

