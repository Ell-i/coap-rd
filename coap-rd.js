
process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at:', p, 'reason:', reason);
});

const RD = require('./src/server.js');

// Start the server when start from the command line
if (typeof require != 'undefined' && require.main === module) {
    new RD(/* XXX: Add command line options here */);
}

module.exports = RD;
