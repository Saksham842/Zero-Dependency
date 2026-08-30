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

  const cssCode = `/* ZeroPack sample app styles — bundled natively with zero dependencies */
@import url('https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500;600;700&family=Overpass+Mono:wght@400;600&display=swap');

:root {
  /* Contemporary Design System Tokens */
  --color-primary: #38bdf8;
  --color-secondary: #818cf8;
  --color-success: #34d399;
  --color-warning: #fbbf24;
  --color-danger: #f87171;
  
  --color-surface-base: #09090b;
  --color-surface-card: #18181b;
  --color-surface-hover: #27272a;
  --color-border: #3f3f46;
  
  --color-text-base: #f4f4f5;
  --color-text-muted: #a1a1aa;
  
  --font-sans: 'Jost', system-ui, sans-serif;
  --font-mono: 'Overpass Mono', monospace;
  
  --space-2: 0.5rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  
  --radius-sm: 8px;
  --radius-md: 16px;
  --radius-lg: 24px;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background-color: var(--color-surface-base);
  color: var(--color-text-base);
  font-family: var(--font-sans);
  line-height: 1.6;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  -webkit-font-smoothing: antialiased;
}

h1, h2 {
  font-family: var(--font-sans);
  font-weight: 600;
  line-height: 1.2;
}

.text-gradient {
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  color: var(--color-primary); /* fallback */
}

/* Bento Grid Layout */
.bento-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-6);
  width: 100%;
  max-width: 900px;
  animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  opacity: 0;
}

@keyframes fadeUp {
  0% { opacity: 0; transform: translateY(20px); }
  100% { opacity: 1; transform: translateY(0); }
}

/* Components */
.bento-card {
  background-color: var(--color-surface-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  transition: transform 0.2s ease, background-color 0.2s ease, border-color 0.2s ease;
  position: relative;
  overflow: hidden;
}

.bento-card:hover {
  background-color: var(--color-surface-hover);
  border-color: var(--color-primary);
  transform: translateY(-2px);
}

.bento-card:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 4px;
}

.bento-card--featured {
  grid-column: 1 / -1;
  background: linear-gradient(145deg, var(--color-surface-card), #1e293b);
}

.card-icon {
  font-size: 2.5rem;
  margin-bottom: var(--space-4);
}

.card-title {
  font-size: 1.5rem;
  margin-bottom: var(--space-2);
}

.card-desc {
  color: var(--color-text-muted);
  font-size: 1rem;
  margin-bottom: var(--space-6);
  flex-grow: 1;
}

.metric-box {
  background-color: rgba(56, 189, 248, 0.1);
  border-left: 4px solid var(--color-primary);
  border-radius: var(--radius-sm);
  padding: var(--space-4);
  font-family: var(--font-mono);
  font-size: 0.9rem;
  color: var(--color-text-base);
}

.metric-value {
  color: var(--color-primary);
  font-weight: 600;
}

.badge-group {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: auto;
}

.badge {
  background-color: var(--color-surface-base);
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  font-size: 0.75rem;
  font-weight: 500;
  padding: 4px 12px;
  border-radius: 999px;
  font-family: var(--font-mono);
  display: inline-flex;
  align-items: center;
  min-height: 24px;
}
\`;
  fs.writeFileSync(path.join(srcDir, 'styles.css'), cssCode, 'utf8');

  // 4. UI Component Module
  const componentsCode = `import { formatGreeting, calculateCircleArea } from './utils.js';

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
        <p class="card-desc">\${greeting}</p>
        
        <div class="metric-box" aria-live="polite">
          System Status: <span class="metric-value">Online</span><br/>
          Live Calculation (r=5): <span class="metric-value">\${area}</span>
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
\`;
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
