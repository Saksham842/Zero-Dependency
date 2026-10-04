export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.statusCode = 200;
  res.end(JSON.stringify({
    name: 'ZeroPack',
    version: '1.0.0',
    description: 'Zero-dependency JavaScript bundler & dev server built exclusively with Node.js built-ins.',
    status: 'online',
    dependencies: 0,
    features: [
      'Zero external dependencies (0 runtime, 0 dev)',
      'Deterministic AST parser and module bundler',
      'RFC 6455 WebSocket HMR server',
      'Zero-dependency JavaScript minifier with token compression',
      'V3 Source Maps with Base64-VLQ encoder'
    ],
    timestamp: new Date().toISOString()
  }, null, 2));
}
