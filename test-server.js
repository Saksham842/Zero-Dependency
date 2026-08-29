import http from 'node:http';
import crypto from 'node:crypto';
import { startDevServer, decodeWebSocketFrame } from './src/server.js';
import { logger, colors } from './src/cli.js';

async function testServerAndHmr() {
  logger.info('Starting dev server test on port 4321...');
  const { server, broadcast, close } = await startDevServer({
    port: 4321,
    entry: 'src/index.js',
    out: 'dist/bundle.js',
    minify: true,
    rootDir: process.cwd()
  });

  // 1. Test Static HTTP GET /
  const html = await new Promise((resolve, reject) => {
    http.get('http://localhost:4321/', (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, data }));
    }).on('error', reject);
  });

  if (html.status === 200 && html.data.includes('__zeropack_hmr')) {
    logger.success('HTTP Static Server Test Passed: 200 OK + HMR client script injected.');
  } else {
    logger.error('HTTP Static Server Test Failed!');
    process.exit(1);
  }

  // 1b. Test Built-in Dashboard UI (/__zeropack)
  const dashboard = await new Promise((resolve, reject) => {
    http.get('http://localhost:4321/__zeropack', (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, data }));
    }).on('error', reject);
  });

  if (dashboard.status === 200 && dashboard.data.includes('ZeroPack Dashboard')) {
    logger.success('Dashboard UI Test Passed: 200 OK (/__zeropack)');
  } else {
    logger.error('Dashboard UI Test Failed!');
    process.exit(1);
  }

  // 1c. Test Built-in Stats API (/__zeropack/stats)
  const statsRes = await new Promise((resolve, reject) => {
    http.get('http://localhost:4321/__zeropack/stats', (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, data }));
    }).on('error', reject);
  });

  const parsedStats = JSON.parse(statsRes.data);
  if (statsRes.status === 200 && parsedStats.moduleCount > 0 && parsedStats.minifiedSize > 0) {
    logger.success(`Dashboard Stats API Passed: 200 OK (moduleCount=${parsedStats.moduleCount}, size=${parsedStats.minifiedSize}b)`);
  } else {
    logger.error('Dashboard Stats API Failed!');
    process.exit(1);
  }

  // 2. Test RFC 6455 WebSocket Upgrade Handshake
  const clientKey = crypto.randomBytes(16).toString('base64');
  const expectedAccept = crypto
    .createHash('sha1')
    .update(clientKey + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
    .digest('base64');

  await new Promise((resolve, reject) => {
    const req = http.request({
      port: 4321,
      host: 'localhost',
      headers: {
        'Connection': 'Upgrade',
        'Upgrade': 'websocket',
        'Sec-WebSocket-Key': clientKey,
        'Sec-WebSocket-Version': '13'
      }
    });

    req.on('upgrade', (res, socket, head) => {
      const acceptHeader = res.headers['sec-websocket-accept'];
      if (acceptHeader === expectedAccept) {
        logger.success('RFC 6455 WebSocket Handshake Passed: 101 Switching Protocols + Sec-WebSocket-Accept verified.');
      } else {
        logger.error(`Handshake mismatch: expected ${expectedAccept}, got ${acceptHeader}`);
        socket.destroy();
        server.close();
        process.exit(1);
      }

      // Listen for reload frame
      socket.on('data', async (buf) => {
        const frame = decodeWebSocketFrame(buf);
        if (frame && frame.text) {
          logger.success(`RFC 6455 Frame Received from Server: ${colors.cyan(frame.text)}`);
          socket.destroy();
          await close();
          logger.success('All Server and HMR WebSocket verification tests passed cleanly!');
          resolve();
        }
      });

      // Broadcast reload event from server
      setTimeout(() => {
        broadcast({ type: 'reload', test: true });
      }, 50);
    });

    req.on('error', reject);
    req.end();
  });
}

testServerAndHmr().catch((err) => {
  logger.error(`Test failed: ${err.message}`);
  process.exit(1);
});
