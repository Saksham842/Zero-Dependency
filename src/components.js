import { formatGreeting, calculateCircleArea } from './utils.js';

export function renderApp(containerId = 'app') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const area = calculateCircleArea(5).toFixed(2);
  const greeting = formatGreeting('Hackathon Innovator');

  container.innerHTML = `
    <main class="bento-container" role="main" aria-label="ZeroPack Features Dashboard">
      
      <section class="bento-card bento-card--featured" tabindex="0">
        <div class="card-icon" aria-hidden="true">⚡</div>
        <h1 class="card-title text-gradient">ZeroPack is Active</h1>
        <p class="card-desc">${greeting}</p>
        
        <div class="metric-box" aria-live="polite">
          System Status: <span class="metric-value">Online</span><br/>
          Live Calculation (r=5): <span class="metric-value">${area}</span>
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
  `;
}
