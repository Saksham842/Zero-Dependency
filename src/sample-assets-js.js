/**
 * @module sample-assets-js
 * @description JS/HTML/ENV assets for the ZeroPack sample app.
 */

export const mathCode = `// Math utility module
export function add(a, b) {
  return a + b;
}

export function multiply(a, b) {
  return a * b;
}

export const PI = 3.14159265359;
`;

export const utilsCode = `import { add, multiply, PI } from './math.js';

export function formatGreeting(name) {
  const timestamp = new Date().toLocaleTimeString();
  return \\\`Hello \\\${name}! Built with ZeroPack at \\\${timestamp}\\\`;
}

export function calculateCircleArea(radius) {
  return multiply(PI, multiply(radius, radius));
}

export default {
  formatGreeting,
  calculateCircleArea
};
`;

export const componentsCode = `import { formatGreeting, calculateCircleArea } from './utils.js';

export function renderApp(containerId = 'app') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const area = calculateCircleArea(5).toFixed(2);
  const greeting = formatGreeting('Hackathon Innovator');

  container.innerHTML = \\\`
    <main class="bento-container" role="main" aria-label="ZeroPack Features Dashboard">
      
      <section class="bento-card bento-card--featured" tabindex="0">
        <div class="card-icon" aria-hidden="true">⚡</div>
        <h1 class="card-title text-gradient">ZeroPack is Active</h1>
        <p class="card-desc">\\\${greeting}</p>
        
        <div class="metric-box" aria-live="polite">
          System Status: <span class="metric-value">Online</span><br/>
          Live Calculation (r=5): <span class="metric-value">\\\${area}</span>
        </div>
      </section>

      <section class="bento-card" tabindex="0">
        <div class="card-icon" aria-hidden="true">📦</div>
        <h2 class="card-title">Zero Dependencies</h2>
        <p class="card-desc">Built purely with Node.js standard libraries. No npm packages required.</p>
        <div class="badge-group">
          <span class="badge">node:fs</span>
          <span class="badge">node:http</span>
          <span class="badge">node:crypto</span>
        </div>
      </section>

      <section class="bento-card" tabindex="0">
        <div class="card-icon" aria-hidden="true">🚀</div>
        <h2 class="card-title">RFC 6455 HMR</h2>
        <p class="card-desc">Native WebSocket implementation serving blazing fast live reloads directly to the browser.</p>
        <div class="badge-group">
          <span class="badge">WebSocket</span>
          <span class="badge">SHA-1</span>
        </div>
      </section>
      
      <section class="bento-card" tabindex="0">
        <div class="card-icon" aria-hidden="true">🎨</div>
        <h2 class="card-title">CSS Bundling</h2>
        <p class="card-desc">Modern CSS is parsed, minified, and injected dynamically via the JS runtime.</p>
        <div class="badge-group">
          <span class="badge">Minified</span>
          <span class="badge">Bento Grid</span>
        </div>
      </section>

    </main>
  \\\`;
}
`;

export const indexCode = `import './styles.css';
import { renderApp } from './components.js';

console.log('[ZeroPack] Initializing application bundle...');

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    renderApp('app');
  });
  // Execute immediately if DOM is already ready
  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    renderApp('app');
  }
} else {
  console.log('[ZeroPack] Running in headless / CLI mode');
}
`;

export const htmlCode = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ZeroPack - Contemporary UI</title>
  <style>
    body {
      margin: 0;
      background: #09090b; /* Match var(--color-surface-base) */
      color: #f4f4f5;      /* Match var(--color-text-base) */
      /* Prevent FOUC before CSS injects */
      font-family: system-ui, sans-serif;
    }
  </style>
</head>
<body>
  <div id="app"></div>
  <script src="/dist/bundle.js"></script>
</body>
</html>
`;

export const envCode = `# ZeroPack Environment Variables
APP_NAME=ZeroPack
APP_ENV=development
PORT=3000
ENABLE_MINIFY=true
`;
