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
