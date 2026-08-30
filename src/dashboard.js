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
    @import url('https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500;600;700&family=Overpass+Mono:wght@400;600&display=swap');

    :root {
      /* Contemporary Design System Tokens */
      --color-primary: #C800DF;
      --color-secondary: #E60076;
      --color-success: #16A34A;
      --color-warning: #D97706;
      --color-danger: #DC2626;
      
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
      --space-12: 3rem;
      
      --radius-sm: 8px;
      --radius-md: 16px;
      --radius-lg: 24px;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: var(--font-sans);
      background-color: var(--color-surface-base);
      color: var(--color-text-base);
      line-height: 1.5;
      min-height: 100vh;
      padding: var(--space-8);
      -webkit-font-smoothing: antialiased;
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
      padding-bottom: var(--space-8);
      border-bottom: 1px solid var(--color-border);
      margin-bottom: var(--space-8);
    }

    .logo-area {
      display: flex;
      align-items: center;
      gap: var(--space-4);
    }

    .logo-icon {
      font-size: 2rem;
      background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-md);
      box-shadow: 0 0 20px rgba(200, 0, 223, 0.2);
      color: white;
    }

    .logo-text h1 {
      font-size: 1.75rem;
      font-weight: 700;
      background: linear-gradient(to right, var(--color-primary), var(--color-secondary));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      letter-spacing: -0.5px;
    }

    .logo-text p {
      font-size: 0.9rem;
      color: var(--color-text-muted);
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: var(--space-4);
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(22, 163, 74, 0.1);
      color: var(--color-success);
      border: 1px solid rgba(22, 163, 74, 0.3);
      padding: 6px 16px;
      border-radius: 9999px;
      font-size: 0.85rem;
      font-weight: 600;
      font-family: var(--font-sans);
      transition: all 0.3s ease;
      min-height: 44px; /* Accessible touch target */
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--color-success);
      box-shadow: 0 0 8px var(--color-success);
    }
    
    .status-badge.building {
      color: var(--color-warning);
      border-color: rgba(217, 119, 6, 0.3);
      background: rgba(217, 119, 6, 0.1);
    }
    
    .status-badge.building .status-dot {
      background: var(--color-warning);
      box-shadow: 0 0 8px var(--color-warning);
      animation: pulse 1s infinite;
    }
    
    .status-badge.failed {
      color: var(--color-danger);
      border-color: rgba(220, 38, 38, 0.3);
      background: rgba(220, 38, 38, 0.1);
    }
    
    .status-badge.failed .status-dot {
      background: var(--color-danger);
      box-shadow: 0 0 8px var(--color-danger);
    }
    
    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.4; }
      100% { opacity: 1; }
    }

    .reload-flash {
      animation: pulse-flash 1s ease-in-out;
    }

    @keyframes pulse-flash {
      0% { transform: scale(1); background: rgba(200, 0, 223, 0.3); color: #fff; }
      50% { transform: scale(1.1); background: rgba(200, 0, 223, 0.8); color: #fff; }
      100% { transform: scale(1); }
    }

    .btn-refresh {
      background: var(--color-surface-card);
      border: 1px solid var(--color-border);
      color: var(--color-text-base);
      padding: 0 var(--space-4);
      border-radius: var(--radius-sm);
      font-size: 0.9rem;
      font-weight: 600;
      font-family: var(--font-sans);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
      min-height: 44px; /* Accessible touch target */
    }

    .btn-refresh:hover, .btn-refresh:focus-visible {
      background: var(--color-surface-hover);
      border-color: var(--color-primary);
      outline: none;
    }
    
    .btn-refresh:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 4px;
    }

    /* Error Panel */
    .error-panel {
      display: none;
      background: rgba(220, 38, 38, 0.05);
      border: 1px solid rgba(220, 38, 38, 0.3);
      border-radius: var(--radius-lg);
      padding: var(--space-6);
      margin-bottom: var(--space-8);
      border-left: 4px solid var(--color-danger);
    }
    
    .error-panel.visible {
      display: block;
    }
    
    .error-title {
      color: var(--color-danger);
      font-weight: 600;
      font-size: 1.25rem;
      margin-bottom: var(--space-2);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .error-details {
      font-family: var(--font-mono);
      font-size: 0.9rem;
      color: var(--color-text-base);
      background: rgba(0,0,0,0.2);
      padding: var(--space-4);
      border-radius: var(--radius-sm);
      margin-top: var(--space-4);
      white-space: pre-wrap;
    }

    /* Bento Grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: var(--space-6);
      margin-bottom: var(--space-8);
    }

    .metric-card {
      background: var(--color-surface-card);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: var(--space-6);
      position: relative;
      overflow: hidden;
      transition: transform 0.2s ease, border-color 0.2s ease;
      display: flex;
      flex-direction: column;
    }

    .metric-card:hover {
      transform: translateY(-2px);
      border-color: var(--color-primary);
      background: var(--color-surface-hover);
    }

    .metric-title {
      font-size: 0.9rem;
      font-weight: 500;
      color: var(--color-text-muted);
      margin-bottom: var(--space-2);
    }

    .metric-value {
      font-size: 2.25rem;
      font-weight: 700;
      color: var(--color-text-base);
      display: flex;
      align-items: baseline;
      gap: 8px;
      margin-top: auto;
    }

    .metric-subtext {
      font-size: 0.85rem;
      color: var(--color-text-muted);
      margin-top: var(--space-2);
    }

    /* Chart Section - Featured Bento */
    .panel {
      background: var(--color-surface-card);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: var(--space-6);
      margin-bottom: var(--space-8);
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--space-6);
    }

    .panel-title {
      font-size: 1.25rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .bar-chart {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }

    .bar-item {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .bar-meta {
      display: flex;
      justify-content: space-between;
      font-size: 0.9rem;
    }

    .bar-name {
      font-family: var(--font-mono);
      color: var(--color-text-base);
    }

    .bar-size {
      color: var(--color-primary);
      font-weight: 600;
      font-family: var(--font-mono);
    }

    .bar-track {
      background: var(--color-surface-base);
      border-radius: 999px;
      height: 12px;
      overflow: hidden;
      position: relative;
    }

    .bar-fill {
      background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
      height: 100%;
      border-radius: 999px;
      transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* Footer */
    footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: var(--color-text-muted);
      font-size: 0.9rem;
      padding-top: var(--space-6);
      border-top: 1px solid var(--color-border);
    }

    .live-tag {
      background: rgba(200, 0, 223, 0.1);
      border: 1px solid rgba(200, 0, 223, 0.2);
      color: var(--color-primary);
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 0.8rem;
      font-family: var(--font-mono);
      font-weight: 600;
    }
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

      const errorPanel = document.getElementById('error-panel');
      const metricsGrid = document.querySelector('.metrics-grid');
      const chartPanel = document.querySelector('.panel');

      if (stats.status === 'failed') {
        errorPanel.classList.add('visible');
        metricsGrid.style.opacity = '0.5';
        chartPanel.style.opacity = '0.5';
        
        const err = stats.error || {};
        document.getElementById('error-message').textContent = err.message || 'Unknown compilation error';
        
        let details = '';
        if (err.category) details += \`Category: \${err.category}\\n\`;
        if (err.file) details += \`File:     \${err.file}\${err.line ? ':' + err.line : ''}\${err.column ? ':' + err.column : ''}\\n\`;
        if (err.suggestion) details += \`\\nAction:   \${err.suggestion}\`;
        
        document.getElementById('error-details').textContent = details || JSON.stringify(err, null, 2);
        return;
      }
      
      // Success state
      errorPanel.classList.remove('visible');
      metricsGrid.style.opacity = '1';
      chartPanel.style.opacity = '1';

      document.getElementById('val-module-count').textContent = stats.moduleCount || 0;
      document.getElementById('val-bundle-size').textContent = formatBytes(stats.minifiedSize || 0);
      document.getElementById('val-orig-size').textContent = 'Original: ' + formatBytes(stats.originalSize || 0);
      
      const timeSpan = document.createElement('span');
      timeSpan.style.fontSize = '1rem';
      timeSpan.style.color = 'var(--color-text-muted)';
      timeSpan.textContent = 'ms';
      
      const timeContainer = document.getElementById('val-build-time');
      timeContainer.textContent = (stats.buildTimeMs || 0) + ' ';
      timeContainer.appendChild(timeSpan);
      
      document.getElementById('val-compression').textContent = stats.compressionRatio || '0%';
      document.getElementById('val-timestamp').textContent = 'Last built: ' + (stats.lastBuildTimestamp || 'Just now');

      // Render Top Modules Bar Chart
      const container = document.getElementById('module-bars');
      container.innerHTML = ''; // safe, clearing children

      const modules = stats.modules || [];
      const topModules = modules.slice(0, 6);
      const maxSize = topModules.length > 0 ? topModules[0].size : 1;

      if (topModules.length === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.style.color = 'var(--color-text-muted)';
        emptyMsg.textContent = 'No modules found.';
        container.appendChild(emptyMsg);
        return;
      }

      for (const mod of topModules) {
        const percentage = Math.max(5, Math.min(100, Math.round((mod.size / maxSize) * 100)));
        const item = document.createElement('div');
        item.className = 'bar-item';
        
        const meta = document.createElement('div');
        meta.className = 'bar-meta';
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'bar-name';
        nameSpan.textContent = mod.filePath;
        
        const sizeSpan = document.createElement('span');
        sizeSpan.className = 'bar-size';
        sizeSpan.textContent = formatBytes(mod.size);
        
        meta.appendChild(nameSpan);
        meta.appendChild(sizeSpan);
        
        const track = document.createElement('div');
        track.className = 'bar-track';
        
        const fill = document.createElement('div');
        fill.className = 'bar-fill';
        fill.style.width = percentage + '%';
        
        track.appendChild(fill);
        
        item.appendChild(meta);
        item.appendChild(track);
        
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
        badge.className = 'status-badge';
        badge.style.borderColor = 'rgba(22, 163, 74, 0.3)';
        badge.style.color = 'var(--color-success)';
        badgeText.textContent = 'Live Reload Active';
      };

      ws.onmessage = function(event) {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'reload') {
            badge.classList.add('reload-flash');
            badgeText.textContent = 'Live Reloaded!';
            setTimeout(() => {
              badge.classList.remove('reload-flash');
              badgeText.textContent = 'Live Reload Active';
            }, 1200);
            fetchMetrics();
          } else if (data.type === 'status') {
            if (data.status === 'building') {
              badge.className = 'status-badge building';
              badgeText.textContent = 'Building...';
            } else if (data.status === 'success') {
              badge.className = 'status-badge';
              badge.style.borderColor = 'rgba(22, 163, 74, 0.3)';
              badge.style.color = 'var(--color-success)';
              badgeText.textContent = 'Live Reload Active';
              if (data.stats) renderMetrics(data.stats);
            } else if (data.status === 'failed') {
              badge.className = 'status-badge failed';
              badgeText.textContent = 'Build Failed';
              if (data.error) renderMetrics({ status: 'failed', error: data.error });
            }
          }
        } catch (e) {
          console.error(e);
        }
      };

      ws.onclose = function() {
        badge.className = 'status-badge failed';
        badge.style.borderColor = 'rgba(220, 38, 38, 0.3)';
        badge.style.color = 'var(--color-danger)';
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
