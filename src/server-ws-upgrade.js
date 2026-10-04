/**
 * @module server-ws-upgrade
 * @description WebSocket upgrade handler for ZeroPack HMR.
 */
import crypto from 'node:crypto';
import { encodeWebSocketFrame, decodeWebSocketFrame } from './server-ws.js';
import { logger, colors } from './cli.js';

const WS_MAGIC_STRING = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

export function handleWsUpgrade(req, socket, head, { activeSockets }) {
  // Check HTTP method and valid URL
  if (req.method !== 'GET') {
    socket.write('HTTP/1.1 405 Method Not Allowed\r\n\r\n');
    socket.destroy();
    return;
  }
  if (req.url !== '/__zeropack_hmr') {
    socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
    socket.destroy();
    return;
  }
  // Check required upgrade headers
  if (!req.headers.upgrade || req.headers.upgrade.toLowerCase() !== 'websocket') {
    socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
    socket.destroy();
    return;
  }
  const secKey = req.headers['sec-websocket-key'];
  if (!secKey) {
    socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
    socket.destroy();
    return;
  }

  // RFC 6455 Handshake Acceptance Hash
  const acceptHash = crypto
    .createHash('sha1')
    .update(secKey + WS_MAGIC_STRING)
    .digest('base64');

  const headers = [
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${acceptHash}`,
    '\r\n'
  ];

  socket.write(headers.join('\r\n'));
  activeSockets.add(socket);

  logger.hmr(`Client connected to HMR WebSocket. Active clients: ${colors.bold(activeSockets.size)}`);

  socket.on('data', (buffer) => {
    try {
      const frame = decodeWebSocketFrame(buffer);
      if (frame) {
        // Ping frame (0x9) -> respond with Pong (0xA)
        if (frame.opcode === 0x9) {
          socket.write(encodeWebSocketFrame(frame.payload, 0xa));
        }
        // Close frame (0x8)
        else if (frame.opcode === 0x8) {
          activeSockets.delete(socket);
          socket.end(encodeWebSocketFrame(Buffer.alloc(0), 0x8));
        }
      }
    } catch (err) {
      // Malformed frame or decoding error -> destroy socket securely
      activeSockets.delete(socket);
      socket.destroy();
    }
  });

  socket.on('close', () => {
    activeSockets.delete(socket);
  });

  socket.on('error', () => {
    activeSockets.delete(socket);
    socket.destroy();
  });
}
