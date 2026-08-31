/**
 * @module dashboard-js
 * @description Frontend JS for the ZeroPack Dashboard.
 */
export const DASHBOARD_JS = `
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
`;
