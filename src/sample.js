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

  // 3. UI Component Module
  const componentsCode = `import { formatGreeting, calculateCircleArea } from './utils.js';

export function renderApp(containerId = 'app') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const area = calculateCircleArea(5).toFixed(2);
  const greeting = formatGreeting('Hackathon Innovator');

  container.innerHTML = \`
    <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #f8fafc; padding: 2rem; border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5); font-family: system-ui, sans-serif; max-width: 600px; margin: 2rem auto; border: 1px solid #334155;">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 1rem;">
        <span style="font-size: 2rem;">⚡</span>
        <h1 style="margin: 0; font-size: 1.8rem; background: linear-gradient(to right, #38bdf8, #818cf8); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">ZeroPack Runtime Active</h1>
      </div>
      <p style="color: #94a3b8; line-height: 1.5;">\${greeting}</p>
      <div style="background: #090d16; padding: 1rem; border-radius: 8px; border-left: 4px solid #38bdf8; margin: 1.5rem 0;">
        <p style="margin: 0; font-size: 0.95rem; color: #38bdf8;"><strong>Live Calculation:</strong> Circle Area (r=5) = \${area}</p>
      </div>
      <div style="display: flex; gap: 10px; font-size: 0.85rem; color: #64748b;">
        <span>🛡️ 0 Dependencies</span>
        <span>•</span>
        <span>🚀 RFC 6455 HMR</span>
        <span>•</span>
        <span>📦 Deterministic IIFE</span>
      </div>
    </div>
  \`;
}
`;
  fs.writeFileSync(path.join(srcDir, 'components.js'), componentsCode, 'utf8');

  // 4. Main Entry Point
  const indexCode = `import { renderApp } from './components.js';

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
