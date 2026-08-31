/**
 * @module dashboard-css-components
 * @description Component styles (panels, cards, charts) for the ZeroPack Dashboard.
 */
export const DASHBOARD_CSS_COMPONENTS = `
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
      background: rgba(56, 189, 248, 0.1);
      border: 1px solid rgba(56, 189, 248, 0.2);
      color: var(--color-primary);
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 0.8rem;
      font-family: var(--font-mono);
      font-weight: 600;
    }
`;
