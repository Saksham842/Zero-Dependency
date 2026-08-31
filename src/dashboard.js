/**
 * @module dashboard
 * @description ZeroPack Developer Dashboard (100% Zero-Dependency Frontend)
 * Built with native HTML5, modern CSS Grid/Variables, and Vanilla JavaScript.
 *
 * Responsibilities:
 *  1. Provides the `DASHBOARD_HTML` constant containing the inline TUI string.
 *  2. Contains all CSS styling and frontend JavaScript for Live Reload metrics.
 */
import { DASHBOARD_CSS } from './dashboard-css.js';
import { DASHBOARD_JS } from './dashboard-js.js';

export const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ZeroPack Dashboard & Build Metrics</title>
  <style>
${DASHBOARD_CSS}
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="logo-area">
        <div class="logo-icon" aria-hidden="true">⚡</div>
        <div class="logo-text">
          <h1>ZeroPack Dashboard</h1>
          <p>Zero-Dependency Real-Time Build Metrics & Analytics</p>
        </div>
      </div>
      <div class="header-actions">
        <span id="hmr-badge" class="status-badge" role="status" aria-live="polite">
          <span class="status-dot"></span>
          <span id="hmr-status-text">Live Reload Active</span>
        </span>
        <button id="btn-refresh" class="btn-refresh" onclick="fetchMetrics()" aria-label="Refresh Metrics">
          <span aria-hidden="true">🔄</span> Refresh
        </button>
      </div>
    </header>
    
    <!-- Error Panel -->
    <div id="error-panel" class="error-panel" role="alert" aria-live="assertive">
      <div class="error-title">
        <span aria-hidden="true">❌</span> Build Failed
      </div>
      <div id="error-message" style="margin-top: 0.5rem;"></div>
      <div id="error-details" class="error-details"></div>
    </div>

    <!-- Bento Grid for Metrics -->
    <main class="metrics-grid">
      <section class="metric-card">
        <h2 class="metric-title">Total Modules</h2>
        <div class="metric-value" id="val-module-count">--</div>
        <p class="metric-subtext">Scanned & bundled in dependency tree</p>
      </section>

      <section class="metric-card">
        <h2 class="metric-title">Bundle Size</h2>
        <div class="metric-value" id="val-bundle-size">--</div>
        <p class="metric-subtext" id="val-orig-size">Original: -- KB</p>
      </section>

      <section class="metric-card">
        <h2 class="metric-title">Build Time</h2>
        <div class="metric-value" id="val-build-time">-- <span style="font-size: 1rem; color: var(--color-text-muted);">ms</span></div>
        <p class="metric-subtext" id="val-timestamp">Last build: --</p>
      </section>

      <section class="metric-card">
        <h2 class="metric-title">Compression Saved</h2>
        <div class="metric-value" id="val-compression" style="color: var(--color-success);">--</div>
        <p class="metric-subtext">Via Native State-Machine Minifier</p>
      </section>
    </main>

    <!-- Largest Modules Chart -->
    <section class="panel">
      <div class="panel-header">
        <h2 class="panel-title">
          <span aria-hidden="true">📊</span> Top Module Size Distribution
        </h2>
        <span class="live-tag">RFC 6455 STREAM</span>
      </div>
      <div class="bar-chart" id="module-bars">
        <div style="color: var(--color-text-muted); font-size: 0.9rem;">Loading dependency distribution...</div>
      </div>
    </section>

    <footer>
      <span>ZeroPack v1.0.0 • 100% Native Node.js Toolchain</span>
      <span>Live Endpoint: <code>/__zeropack/stats</code></span>
    </footer>
  </div>

  <script>
${DASHBOARD_JS}
  </script>
</body>
</html>
`;
