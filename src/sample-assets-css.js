/**
 * @module sample-assets-css
 * @description CSS assets for the ZeroPack sample app.
 */

export const cssCode = `/* ZeroPack sample app styles — bundled natively with zero dependencies */
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
`;
