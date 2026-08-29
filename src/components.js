import { formatGreeting, calculateCircleArea } from './utils.js';

export function renderApp(containerId = 'app') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const area = calculateCircleArea(5).toFixed(2);
  const greeting = formatGreeting('Hackathon Innovator');

  container.innerHTML = `
    <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #f8fafc; padding: 2rem; border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5); font-family: system-ui, sans-serif; max-width: 600px; margin: 2rem auto; border: 1px solid #334155;">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 1rem;">
        <span style="font-size: 2rem;">⚡</span>
        <h1 style="margin: 0; font-size: 1.8rem; background: linear-gradient(to right, #38bdf8, #818cf8); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">ZeroPack Runtime Active</h1>
      </div>
      <p style="color: #94a3b8; line-height: 1.5;">${greeting}</p>
      <div style="background: #090d16; padding: 1rem; border-radius: 8px; border-left: 4px solid #38bdf8; margin: 1.5rem 0;">
        <p style="margin: 0; font-size: 0.95rem; color: #38bdf8;"><strong>Live Calculation:</strong> Circle Area (r=5) = ${area}</p>
      </div>
      <div style="display: flex; gap: 10px; font-size: 0.85rem; color: #64748b;">
        <span>🛡️ 0 Dependencies</span>
        <span>•</span>
        <span>🚀 RFC 6455 HMR</span>
        <span>•</span>
        <span>📦 Deterministic IIFE</span>
      </div>
    </div>
  `;
}
