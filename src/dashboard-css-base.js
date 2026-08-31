/**
 * @module dashboard-css-base
 * @description Base CSS variables, resets, and layout for the ZeroPack Dashboard.
 */
export const DASHBOARD_CSS_BASE = `
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
      box-shadow: 0 0 20px rgba(56, 189, 248, 0.2);
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
      0% { transform: scale(1); background: rgba(56, 189, 248, 0.3); color: #fff; }
      50% { transform: scale(1.1); background: rgba(56, 189, 248, 0.8); color: #fff; }
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
`;
