import { formatGreeting, calculateCircleArea } from './utils.js';

export function renderApp(containerId = 'app') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const area = calculateCircleArea(5).toFixed(2);
  const greeting = formatGreeting('Hackathon Innovator');

  container.innerHTML = `
    <div class="zp-card">
      <div class="zp-card__header">
        <span class="zp-card__icon">⚡</span>
        <h1 class="zp-card__title">ZeroPack Runtime Active</h1>
      </div>
      <p class="zp-card__subtitle">${greeting}</p>
      <div class="zp-card__metric">
        <strong>Live Calculation:</strong> Circle Area (r=5) = ${area}
      </div>
      <div class="zp-card__badges">
        <span class="zp-badge">🛡️ 0 Dependencies</span>
        <span class="zp-badge">🚀 RFC 6455 HMR</span>
        <span class="zp-badge">📦 Deterministic IIFE</span>
        <span class="zp-badge">🎨 CSS Bundling</span>
      </div>
    </div>
  `;
}
