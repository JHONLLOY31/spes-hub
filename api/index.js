// Vercel serverless entry point — routes all /api/* requests to our SPES Hub server handler.
let server = null;
let loadError = null;

try {
  server = require('../server/server');
} catch (err) {
  loadError = err;
  console.error('Failed to load SPES Hub server:', err);
}

module.exports = async (req, res) => {
  if (loadError || !server) {
    const missing = ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SECRET_KEY'].filter(k => !process.env[k]);
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      error: missing.length
        ? `Missing Vercel Environment Variables: ${missing.join(', ')}`
        : (loadError && loadError.message) || 'Server failed to initialize.'
    }));
    return;
  }
  return server.handler(req, res);
};
