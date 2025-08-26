const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/web',
    createProxyMiddleware({
      target: 'http://13.61.187.51:8069',
      changeOrigin: true,
      secure: false,
      onProxyReq: function(proxyReq, req, res) {
        // Log proxy requests for debugging
        console.log('Proxying request:', req.method, req.url);
      },
      onError: function(err, req, res) {
        console.error('Proxy error:', err);
        res.writeHead(500, {
          'Content-Type': 'application/json',
        });
        res.end(JSON.stringify({ error: 'Proxy error', message: err.message }));
      },
    })
  );

  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://13.61.187.51:8069',
      changeOrigin: true,
      secure: false,
      pathRewrite: {
        '^/api': '/web', // Rewrite /api to /web for Odoo endpoints
      },
      onProxyReq: function(proxyReq, req, res) {
        console.log('Proxying API request:', req.method, req.url);
      },
      onError: function(err, req, res) {
        console.error('API Proxy error:', err);
        res.writeHead(500, {
          'Content-Type': 'application/json',
        });
        res.end(JSON.stringify({ error: 'API Proxy error', message: err.message }));
      },
    })
  );
};
