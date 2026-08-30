import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

export function createSampleApp(rootDir = process.cwd()) {
  const srcDir = path.join(rootDir, 'src');
  const publicDir = path.join(rootDir, 'public');

  if (!fs.existsSync(srcDir)) fs.mkdirSync(srcDir, { recursive: true });
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

  // 1. Math Utility Module
  const mathCode = `// Math utility module
export function add(a, b) {
  return a + b;
}

export function multiply(a, b) {
  return a * b;
}

export const PI = 3.14159265359;
`;
  fs.writeFileSync(path.join(srcDir, 'math.js'), mathCode, 'utf8');

  // 2. Formatting Utility Module
  const utilsCode = `import { add, multiply, PI } from './math.js';

export function formatGreeting(name) {
  const timestamp = new Date().toLocaleTimeString();
  return \`Hello \${name}! Built with ZeroPack at \${timestamp}\`;
}

export function calculateCircleArea(radius) {
  return multiply(PI, multiply(radius, radius));
}

export default {
  formatGreeting,
  calculateCircleArea
};
`;
  fs.writeFileSync(path.join(srcDir, 'utils.js'), utilsCode, 'utf8');

  // 3. Stylesheet Module
  const cssCode = `/* ZeroPack sample app styles */
:root {
  --bg: #0b0f19;
  --card: #111827;
  --border: #1f2937;
  --accent: #38bdf8;
  --accent2: #818cf8;
  --text: #f1f5f9;
  --muted: #94a3b8;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.zp-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 2rem;
  max-width: 580px;
  width: 100%;
  box-shadow: 0 20px 40px rgba(0,0,0,0.4);
  animation: fadeUp 0.4s ease;
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

.zp-card__header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 1.25rem;
}

.zp-card__icon { font-size: 2rem; }

.zp-card__title {
  font-size: 1.75rem;
  font-weight: 700;
  background: linear-gradient(to right, var(--accent), var(--accent2));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.zp-card__subtitle { color: var(--muted); line-height: 1.6; margin-bottom: 1.25rem; }

.zp-card__metric {
  background: #090d16;
  border-left: 4px solid var(--accent);
  border-radius: 8px;
  padding: 0.875rem 1rem;
  margin-bottom: 1.25rem;
  font-size: 0.95rem;
  color: var(--accent);
}

.zp-card__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.zp-badge {
  background: rgba(56,189,248,0.08);
  border: 1px solid rgba(56,189,248,0.2);
  color: var(--accent);
  border-radius: 9999px;
  padding: 4px 12px;
  font-size: 0.8rem;
  font-weight: 600;
}
`;
  fs.writeFileSync(path.join(srcDir, 'styles.css'), cssCode, 'utf8');

  // 4. UI Component Module
  const componentsCode = `import { formatGreeting, calculateCircleArea } from './utils.js';

export function renderApp(containerId = 'app') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const area = calculateCircleArea(5).toFixed(2);
  const greeting = formatGreeting('Hackathon Innovator');

  container.innerHTML = \`
    <div class="zp-card">
      <div class="zp-card__header">
        <span class="zp-card__icon">⚡</span>
        <h1 class="zp-card__title">ZeroPack Runtime Active</h1>
      </div>
      <p class="zp-card__subtitle">\${greeting}</p>
      <div class="zp-card__metric">
        <strong>Live Calculation:</strong> Circle Area (r=5) = \${area}
      </div>
      <div class="zp-card__badges">
        <span class="zp-badge">🛡️ 0 Dependencies</span>
        <span class="zp-badge">🚀 RFC 6455 HMR</span>
        <span class="zp-badge">📦 Deterministic IIFE</span>
        <span class="zp-badge">🎨 CSS Bundling</span>
      </div>
    </div>
  \`;
}
`;
  fs.writeFileSync(path.join(srcDir, 'components.js'), componentsCode, 'utf8');

  // 5. Main Entry Point
  const indexCode = `import './styles.css';
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
  fs.writeFileSync(path.join(srcDir, 'index.js'), indexCode, 'utf8');

  // 5. Public HTML file
  const htmlCode = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ZeroPack - Zero-Dependency Bundler</title>
  <style>
    body {
      margin: 0;
      background: #0b0f19;
      color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
  </style>
</head>
<body>
  <div id="app"></div>
  <script src="/dist/bundle.js"></script>
</body>
</html>
`;
  fs.writeFileSync(path.join(publicDir, 'index.html'), htmlCode, 'utf8');

  // 6. .env sample
  const envCode = `# ZeroPack Environment Variables
APP_NAME=ZeroPack
APP_ENV=development
PORT=3000
ENABLE_MINIFY=true
`;
  fs.writeFileSync(path.join(rootDir, '.env'), envCode, 'utf8');
}
