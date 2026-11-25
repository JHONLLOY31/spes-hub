// Vercel serverless entry point — routes all /api/* requests to our SPES Hub server handler.
const server = require('../server/server');

module.exports = (req, res) => server.handler(req, res);
