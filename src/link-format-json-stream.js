/**
 * Convert RFC6690 Link Format content to draft-ietf-core-links-json-09 JSON objects
 */

const inherits = require('util').inherits;
const stream   = require('stream');

module.export = LinkFormatJSON;

function LinkFormatJSON(options) {
    if (! this instanceof LinkFormatJSON) {
	return new LinkFormatJSON(options);
    }

    Transform.call(this, Object.assing({}, options, { objectMode: true }));
}

inherits(LinkFormatJSON, stream.Transform);

LinkFormatJSON.prototype._transform = function(obj, encoding, callback) {
    try {
	// XXX Continue here
    } catch (err) {
	return callback(err);
    }
    this.push(obj);
    callback();
}
    
