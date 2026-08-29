/**
 * ZeroPack Developer Dashboard (100% Zero-Dependency Frontend)
 * Built with native HTML5, modern CSS Grid/Variables, and Vanilla JavaScript.
 */
export const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ZeroPack Dashboard & Build Metrics</title>
  <style>
    :root {
      --bg: #090d16;
      --card-bg: #111827;
      --card-hover: #172136;
      --border: #1f2937;
      --text-main: #f3f4f6;
      --text-muted: #9ca3af;
      --accent: #38bdf8;
      --accent-glow: rgba(56, 189, 248, 0.15);
      --accent-purple: #818cf8;
      --success: #34d399;
      --warning: #fbbf24;
      --danger: #f87171;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg);
      color: var(--text-main);
      line-height: 1.5;
      min-height: 100vh;
      padding: 2rem;
    }

    .container {
      max-width: 1100px;
      margin: 0 auto;
    }

    /* Header */
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 2rem;
      border-bottom: 1px solid var(--border);
      margin-bottom: 2rem;
    }

    .logo-area {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .logo-icon {
      font-size: 2rem;
      background: linear-gradient(135deg, #0284c7, #6366f1);
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
      box-shadow: 0 0 20px rgba(56, 189, 248, 0.3);
    }

    .logo-text h1 {
      font-size: 1.5rem;
      font-weight: 700;
      background: linear-gradient(to right, #38bdf8, #818cf8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      letter-spacing: -0.5px;
    }

    .logo-text p {
      font-size: 0.82rem;
      color: var(--text-muted);
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(52, 211, 153, 0.1);
      color: var(--success);
      border: 1px solid rgba(52, 211, 153, 0.3);
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 600;
      transition: all 0.3s ease;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--success);
      box-shadow: 0 0 8px var(--success);
    }

    .reload-flash {
      animation: pulse-flash 1s ease-in-out;
    }

    @keyframes pulse-flash {
      0% { transform: scale(1); background: rgba(56, 189, 248, 0.3); color: #fff; }
      50% { transform: scale(1.1); background: rgba(56, 189, 248, 0.8); color: #fff; }
      100% { transform: scale(1); }
    }

    .btn-refresh {
      background: var(--card-bg);
      border: 1px solid var(--border);
      color: var(--text-main);
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }

    .btn-refresh:hover {
      background: var(--card-hover);
      border-color: var(--accent);
    }

    /* Metrics Grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1.25rem;
      margin-bottom: 2rem;
    }

    .metric-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.5rem;
      position: relative;
      overflow: hidden;
      transition: transform 0.2s, border-color 0.2s;
    }

    .metric-card:hover {
      transform: translateY(-2px);
      border-color: var(--accent);
    }

    .metric-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, var(--accent), var(--accent-purple));
    }

    .metric-title {
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted);
      margin-bottom: 0.5rem;
    }

    .metric-value {
      font-size: 2rem;
      font-weight: 700;
      color: var(--text-main);
      display: flex;
      align-items: baseline;
      gap: 6px;
    }

    .metric-subtext {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-top: 0.5rem;
    }

    /* Chart Section */
    .panel {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.75rem;
      margin-bottom: 2rem;
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .panel-title {
      font-size: 1.15rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .bar-chart {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .bar-item {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .bar-meta {
      display: flex;
      justify-content: space-between;
      font-size: 0.85rem;
    }

    .bar-name {
      font-family: monospace;
      color: var(--text-main);
    }

    .bar-size {
      color: var(--accent);
      font-weight: 600;
    }

    .bar-track {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 6px;
      height: 10px;
      overflow: hidden;
      position: relative;
    }

    .bar-fill {
      background: linear-gradient(90deg, #38bdf8, #818cf8);
      height: 100%;
      border-radius: 6px;
      transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* Footer */
    footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: var(--text-muted);
      font-size: 0.8rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--border);
    }

    .live-tag {
      background: rgba(56, 189, 248, 0.1);
      color: var(--accent);
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-family: monospace;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="logo-area">
        <div class="logo-icon">⚡</div>
        <div class="logo-text">
          <h1>ZeroPack Dashboard</h1>
          <p>Zero-Dependency Real-Time Build Metrics & Analytics</p>
        </div>
      </div>
      <div class="header-actions">
        <span id="hmr-badge" class="status-badge">
          <span class="status-dot"></span>
          <span id="hmr-status-text">HMR Live Active</span>
        </span>
        <button id="btn-refresh" class="btn-refresh" onclick="fetchMetrics()">
          <span>🔄</span> Refresh
        </button>
      </div>
    </header>

    <!-- Metrics Cards -->
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-title">Total Modules</div>
        <div class="metric-value" id="val-module-count">--</div>
        <div class="metric-subtext">Scanned & bundled in dependency tree</div>
      </div>

      <div class="metric-card">
        <div class="metric-title">Bundle Size</div>
        <div class="metric-value" id="val-bundle-size">--</div>
        <div class="metric-subtext" id="val-orig-size">Original: -- KB</div>
      </div>

      <div class="metric-card">
        <div class="metric-title">Build Time</div>
        <div class="metric-value" id="val-build-time">-- <span style="font-size: 1rem; color: var(--text-muted);">ms</span></div>
        <div class="metric-subtext" id="val-timestamp">Last build: --</div>
      </div>

      <div class="metric-card">
        <div class="metric-title">Compression Saved</div>
        <div class="metric-value" id="val-compression" style="color: var(--success);">--</div>
        <div class="metric-subtext">Via Native State-Machine Minifier</div>
      </div>
    </div>

    <!-- Largest Modules Chart -->
    <div class="panel">
      <div class="panel-header">
        <div class="panel-title">
          <span>📊</span> Top Module Size Distribution
        </div>
        <span class="live-tag">RFC 6455 STREAM</span>
      </div>
      <div class="bar-chart" id="module-bars">
        <div style="color: var(--text-muted); font-size: 0.9rem;">Loading dependency distribution...</div>
      </div>
    </div>

    <footer>
      <span>ZeroPack v1.0.0 • 100% Native Node.js Toolchain</span>
      <span>Live Endpoint: <code>/__zeropack/stats</code></span>
    </footer>
  </div>

  <script>
    function formatBytes(bytes) {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
    }

    async function fetchMetrics() {
      try {
        const res = await fetch('/__zeropack/stats');
        if (!res.ok) return;
        const data = await res.json();
        renderMetrics(data);
      } catch (err) {
        console.error('[ZeroPack Dashboard Error]', err);
      }
    }

    function renderMetrics(stats) {
      if (!stats) return;

      document.getElementById('val-module-count').textContent = stats.moduleCount || 0;
      document.getElementById('val-bundle-size').textContent = formatBytes(stats.minifiedSize || 0);
      document.getElementById('val-orig-size').textContent = 'Original: ' + formatBytes(stats.originalSize || 0);
      document.getElementById('val-build-time').innerHTML = (stats.buildTimeMs || 0) + ' <span style="font-size: 1rem; color: var(--text-muted);">ms</span>';
      document.getElementById('val-compression').textContent = stats.compressionRatio || '0%';
      document.getElementById('val-timestamp').textContent = 'Last built: ' + (stats.lastBuildTimestamp || 'Just now');

      // Render Top Modules Bar Chart
      const container = document.getElementById('module-bars');
      container.innerHTML = '';

      const modules = stats.modules || [];
      const topModules = modules.slice(0, 6);
      const maxSize = topModules.length > 0 ? topModules[0].size : 1;

      if (topModules.length === 0) {
        container.innerHTML = '<div style="color: var(--text-muted);">No modules found.</div>';
        return;
      }

      for (const mod of topModules) {
        const percentage = Math.max(5, Math.min(100, Math.round((mod.size / maxSize) * 100)));
        const item = document.createElement('div');
        item.className = 'bar-item';
        item.innerHTML = \`
          <div class="bar-meta">
            <span class="bar-name">\${mod.filePath}</span>
            <span class="bar-size">\${formatBytes(mod.size)}</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width: \${percentage}%;"></div>
          </div>
        \`;
        container.appendChild(item);
      }
    }

    // Connect to WebSocket for Live Metric Updates
    function initWebSocket() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = protocol + '//' + window.location.host + '/__zeropack_hmr';
      const badge = document.getElementById('hmr-badge');
      const badgeText = document.getElementById('hmr-status-text');

      const ws = new WebSocket(wsUrl);

      ws.onopen = function() {
        badge.style.borderColor = 'rgba(52, 211, 153, 0.3)';
        badge.style.color = 'var(--success)';
        badgeText.textContent = 'HMR Live Active';
      };

      ws.onmessage = function(event) {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'reload') {
            // Flash badge
            badge.classList.add('reload-flash');
            badgeText.textContent = 'Live Reloaded!';
            setTimeout(() => {
              badge.classList.remove('reload-flash');
              badgeText.textContent = 'HMR Live Active';
            }, 1200);

            // Refresh stats without whole page reload
            fetchMetrics();
          }
        } catch (e) {
          console.error(e);
        }
      };

      ws.onclose = function() {
        badge.style.borderColor = 'rgba(248, 113, 113, 0.3)';
        badge.style.color = 'var(--danger)';
        badgeText.textContent = 'Disconnected';
        setTimeout(initWebSocket, 2000);
      };
    }

    // Initial load
    fetchMetrics();
    initWebSocket();
  </script>
</body>
</html>
`;
