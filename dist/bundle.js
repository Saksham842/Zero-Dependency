(function(modules){var installedModules={};function __zeropack_require__(moduleId){if(installedModules[moduleId]){return installedModules[moduleId].exports;}
var module=installedModules[moduleId]={id:moduleId,loaded:false,exports:{}};var fn=modules[moduleId][0];var mapping=modules[moduleId][1];function localRequire(name){if(mapping[name]===undefined){throw new Error('ZeroPack: Cannot find module \''+name+'\' from module ID '+moduleId);}
return __zeropack_require__(mapping[name]);}
try{fn(localRequire,module,module.exports);}catch(e){console.error('[ZeroPack Runtime Error in Module '+moduleId+']:',e);throw e;}
module.loaded=true;return module.exports;}
if(typeof window!=='undefined'){window.__zeropack_modules__=modules;window.__zeropack_require__=__zeropack_require__;}
return __zeropack_require__(0);})({2:[function(require,module,exports){module.exports.renderApp=renderApp;const __mod_27c3420f=require('./utils.js');const{formatGreeting,calculateCircleArea}=__mod_27c3420f
module.exports.renderApp=renderApp;function renderApp(containerId='app'){const container=document.getElementById(containerId);if(!container)return;const area=calculateCircleArea(5).toFixed(2);const greeting=formatGreeting('Hackathon Innovator');container.innerHTML=`
    <main class="bento-container" role="main" aria-label="ZeroPack Features Dashboard">
      
      <section class="bento-card bento-card--featured" tabindex="0">
        <div class="card-icon" aria-hidden="true">⚡</div>
        <h1 class="card-title text-gradient">ZeroPack is Active</h1>
        <p class="card-desc">${greeting}</p>
        
        <div class="metric-box" aria-live="polite">
          System Status: <span class="metric-value">Online</span><br/>
          Live Calculation (r=5): <span class="metric-value">${area}</span>
        </div>
      </section>

      <section class="bento-card" tabindex="0">
        <div class="card-icon" aria-hidden="true">📦</div>
        <h2 class="card-title">Zero Dependencies</h2>
        <p class="card-desc">Built purely with Node.js standard libraries. No npm packages required.</p>
        <div class="badge-group">
          <span class="badge">node:fs</span>
          <span class="badge">node:http</span>
          <span class="badge">node:crypto</span>
        </div>
      </section>

      <section class="bento-card" tabindex="0">
        <div class="card-icon" aria-hidden="true">🚀</div>
        <h2 class="card-title">RFC 6455 HMR</h2>
        <p class="card-desc">Native WebSocket implementation serving blazing fast live reloads directly to the browser.</p>
        <div class="badge-group">
          <span class="badge">WebSocket</span>
          <span class="badge">SHA-1</span>
        </div>
      </section>
      
      <section class="bento-card" tabindex="0">
        <div class="card-icon" aria-hidden="true">🎨</div>
        <h2 class="card-title">CSS Bundling</h2>
        <p class="card-desc">Modern CSS is parsed, minified, and injected dynamically via the JS runtime.</p>
        <div class="badge-group">
          <span class="badge">Minified</span>
          <span class="badge">Bento Grid</span>
        </div>
      </section>

    </main>
  `;}},{"./utils.js":3}],0:[function(require,module,exports){require('./styles.css')
const __mod_5d712fe8=require('./components.js');const{renderApp}=__mod_5d712fe8;console.log('[ZeroPack] Initializing application bundle...');if(typeof window!=='undefined'){window.addEventListener('DOMContentLoaded',()=>{renderApp('app');});if(document.readyState==='interactive'||document.readyState==='complete'){renderApp('app');}}else{console.log('[ZeroPack] Running in headless / CLI mode');}},{"./styles.css":1,"./components.js":2}],4:[function(require,module,exports){module.exports.add=add;module.exports.multiply=multiply;module.exports.add=add;function add(a,b){return a+b;}
module.exports.multiply=multiply;function multiply(a,b){return a*b;}
const PI=module.exports.PI=3.14159265359;},{}],1:[function(require,module,exports){const __css="/* ZeroPack sample app styles — bundled natively with zero dependencies */\r\n@import url('https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500;600;700&family=Overpass+Mono:wght@400;600&display=swap');\r\n\r\n:root {\r\n  /* Contemporary Design System Tokens */\r\n  --color-primary: #38bdf8;\r\n  --color-secondary: #818cf8;\r\n  --color-success: #34d399;\r\n  --color-warning: #fbbf24;\r\n  --color-danger: #f87171;\r\n  \r\n  --color-surface-base: #09090b;\r\n  --color-surface-card: #18181b;\r\n  --color-surface-hover: #27272a;\r\n  --color-border: #3f3f46;\r\n  \r\n  --color-text-base: #f4f4f5;\r\n  --color-text-muted: #a1a1aa;\r\n  \r\n  --font-sans: 'Jost', system-ui, sans-serif;\r\n  --font-mono: 'Overpass Mono', monospace;\r\n  \r\n  --space-2: 0.5rem;\r\n  --space-4: 1rem;\r\n  --space-6: 1.5rem;\r\n  --space-8: 2rem;\r\n  \r\n  --radius-sm: 8px;\r\n  --radius-md: 16px;\r\n  --radius-lg: 24px;\r\n}\r\n\r\n*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }\r\n\r\nbody {\r\n  background-color: var(--color-surface-base);\r\n  color: var(--color-text-base);\r\n  font-family: var(--font-sans);\r\n  line-height: 1.6;\r\n  min-height: 100vh;\r\n  display: flex;\r\n  align-items: center;\r\n  justify-content: center;\r\n  padding: var(--space-4);\r\n  -webkit-font-smoothing: antialiased;\r\n}\r\n\r\nh1, h2 {\r\n  font-family: var(--font-sans);\r\n  font-weight: 600;\r\n  line-height: 1.2;\r\n}\r\n\r\n.text-gradient {\r\n  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));\r\n  -webkit-background-clip: text;\r\n  -webkit-text-fill-color: transparent;\r\n  color: var(--color-primary); /* fallback */\r\n}\r\n\r\n/* Bento Grid Layout */\r\n.bento-container {\r\n  display: grid;\r\n  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));\r\n  gap: var(--space-6);\r\n  width: 100%;\r\n  max-width: 900px;\r\n  animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;\r\n  opacity: 0;\r\n}\r\n\r\n@keyframes fadeUp {\r\n  0% { opacity: 0; transform: translateY(20px); }\r\n  100% { opacity: 1; transform: translateY(0); }\r\n}\r\n\r\n/* Components */\r\n.bento-card {\r\n  background-color: var(--color-surface-card);\r\n  border: 1px solid var(--color-border);\r\n  border-radius: var(--radius-lg);\r\n  padding: var(--space-6);\r\n  display: flex;\r\n  flex-direction: column;\r\n  transition: transform 0.2s ease, background-color 0.2s ease, border-color 0.2s ease;\r\n  position: relative;\r\n  overflow: hidden;\r\n}\r\n\r\n.bento-card:hover {\r\n  background-color: var(--color-surface-hover);\r\n  border-color: var(--color-primary);\r\n  transform: translateY(-2px);\r\n}\r\n\r\n.bento-card:focus-visible {\r\n  outline: 2px solid var(--color-primary);\r\n  outline-offset: 4px;\r\n}\r\n\r\n.bento-card--featured {\r\n  grid-column: 1 / -1;\r\n  background: linear-gradient(145deg, var(--color-surface-card), #1e293b);\r\n}\r\n\r\n.card-icon {\r\n  font-size: 2.5rem;\r\n  margin-bottom: var(--space-4);\r\n}\r\n\r\n.card-title {\r\n  font-size: 1.5rem;\r\n  margin-bottom: var(--space-2);\r\n}\r\n\r\n.card-desc {\r\n  color: var(--color-text-muted);\r\n  font-size: 1rem;\r\n  margin-bottom: var(--space-6);\r\n  flex-grow: 1;\r\n}\r\n\r\n.metric-box {\r\n  background-color: rgba(56, 189, 248, 0.1);\r\n  border-left: 4px solid var(--color-primary);\r\n  border-radius: var(--radius-sm);\r\n  padding: var(--space-4);\r\n  font-family: var(--font-mono);\r\n  font-size: 0.9rem;\r\n  color: var(--color-text-base);\r\n}\r\n\r\n.metric-value {\r\n  color: var(--color-primary);\r\n  font-weight: 600;\r\n}\r\n\r\n.badge-group {\r\n  display: flex;\r\n  flex-wrap: wrap;\r\n  gap: var(--space-2);\r\n  margin-top: auto;\r\n}\r\n\r\n.badge {\r\n  background-color: var(--color-surface-base);\r\n  border: 1px solid var(--color-border);\r\n  color: var(--color-text-muted);\r\n  font-size: 0.75rem;\r\n  font-weight: 500;\r\n  padding: 4px 12px;\r\n  border-radius: 999px;\r\n  font-family: var(--font-mono);\r\n  display: inline-flex;\r\n  align-items: center;\r\n  min-height: 24px;\r\n}\r\n";if(typeof document!=='undefined'){try{var style=document.createElement('style');style.setAttribute('data-zeropack',"src/styles.css");style.textContent=__css;document.head.appendChild(style);}catch(_){}}
module.exports=__css;module.exports.default=__css;},{}],3:[function(require,module,exports){module.exports.formatGreeting=formatGreeting;module.exports.calculateCircleArea=calculateCircleArea;const __mod_b0b91376=require('./math.js');const{add,multiply,PI}=__mod_b0b91376
module.exports.formatGreeting=formatGreeting;function formatGreeting(name){const timestamp=new Date().toLocaleTimeString();return`Hello ${name}! Built with ZeroPack at ${timestamp}`;}
module.exports.calculateCircleArea=calculateCircleArea;function calculateCircleArea(radius){return multiply(PI,multiply(radius,radius));}
const __defaultExport={formatGreeting,calculateCircleArea};module.exports.default=__defaultExport;},{"./math.js":4}],});