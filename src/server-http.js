/**
 * @module server-http
 * @description HTTP request handler for the ZeroPack Dev Server.
 */
import fs from 'node:fs';
import path from 'node:path';
import { DASHBOARD_HTML } from './dashboard.js';
import { resolveStaticFilePath, getMimeType } from './server-static.js';
import { colors } from './cli.js';

export function handleHttpRequest(req, res, { port, rootDir, currentStats, logActivity }) {
  let pathname;
  try {
    const parsedUrl = new URL(req.url, `http://localhost:${port}`);
    pathname = decodeURIComponent(parsedUrl.pathname);
  } catch (err) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('400 Bad Request');
    return;
  }

  // Route 1: Dashboard UI
  if (pathname === '/__zeropack' || pathname === '/__zeropack/') {
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    res.end(DASHBOARD_HTML);
    return;
  }

  // Route 2: Stats API
  if (pathname === '/__zeropack/stats') {
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    res.end(JSON.stringify(currentStats || {}));
    return;
  }

  const filePath = resolveStaticFilePath(rootDir, pathname);

  // Serve file if exists
  if (filePath) {
    const mimeType = getMimeType(filePath);
    let content = fs.readFileSync(filePath);

    // Auto-inject WebSocket client script into HTML files
    if (mimeType.startsWith('text/html')) {
      let html = content.toString('utf8');
      if (!html.includes('__zeropack_hmr')) {
        const hmrScript = `
<script>
(function() {
  var protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  var ws = new WebSocket(protocol + '//' + window.location.host + '/__zeropack_hmr');
  ws.onopen = function() { console.log('[ZeroPack DevServer] Connected to live reload'); };
  ws.onmessage = function(e) {
    var data = JSON.parse(e.data);
    if (data.type === 'reload') {
      console.log('[ZeroPack DevServer] Reloading page...');
      window.location.reload();
    }
  };
})();
</script>`;
        if (html.includes('</body>')) {
          html = html.replace('</body>', `${hmrScript}</body>`);
        } else {
          html += hmrScript;
        }
        content = Buffer.from(html, 'utf8');
      }
    }

    res.writeHead(200, {
      'Content-Type': mimeType,
      'Content-Length': content.length,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    res.end(content);
    logActivity(`GET ${pathname}  ${colors.gray(mimeType.split(';')[0])}`);
    return;
  }

  // HTML page or root fallback
  const indexHtmlPath = path.join(rootDir, 'index.html');
  const publicIndexHtml = path.join(rootDir, 'public', 'index.html');
  const defaultHtml = fs.existsSync(indexHtmlPath) ? indexHtmlPath : (fs.existsSync(publicIndexHtml) ? publicIndexHtml : null);

  if (defaultHtml && (req.headers.accept || '').includes('text/html')) {
    const html = fs.readFileSync(defaultHtml, 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end(`404 Not Found: ${pathname}`);
}
