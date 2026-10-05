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
const PI=module.exports.PI=3.14159265359;},{}],1:[function(require,module,exports){const __css="/* ZeroPack sample app styles — bundled natively with zero dependencies */\n@import url('https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500;600;700&family=Overpass+Mono:wght@400;600&display=swap');\n\n:root {\n  /* Contemporary Design System Tokens */\n  --color-primary: #38bdf8;\n  --color-secondary: #818cf8;\n  --color-success: #34d399;\n  --color-warning: #fbbf24;\n  --color-danger: #f87171;\n  \n  --color-surface-base: #09090b;\n  --color-surface-card: #18181b;\n  --color-surface-hover: #27272a;\n  --color-border: #3f3f46;\n  \n  --color-text-base: #f4f4f5;\n  --color-text-muted: #a1a1aa;\n  \n  --font-sans: 'Jost', system-ui, sans-serif;\n  --font-mono: 'Overpass Mono', monospace;\n  \n  --space-2: 0.5rem;\n  --space-4: 1rem;\n  --space-6: 1.5rem;\n  --space-8: 2rem;\n  \n  --radius-sm: 8px;\n  --radius-md: 16px;\n  --radius-lg: 24px;\n}\n\n*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }\n\nbody {\n  background-color: var(--color-surface-base);\n  color: var(--color-text-base);\n  font-family: var(--font-sans);\n  line-height: 1.6;\n  min-height: 100vh;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  padding: var(--space-4);\n  -webkit-font-smoothing: antialiased;\n}\n\nh1, h2 {\n  font-family: var(--font-sans);\n  font-weight: 600;\n  line-height: 1.2;\n}\n\n.text-gradient {\n  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));\n  -webkit-background-clip: text;\n  -webkit-text-fill-color: transparent;\n  color: var(--color-primary); /* fallback */\n}\n\n/* Bento Grid Layout */\n.bento-container {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));\n  gap: var(--space-6);\n  width: 100%;\n  max-width: 900px;\n  animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;\n  opacity: 0;\n}\n\n@keyframes fadeUp {\n  0% { opacity: 0; transform: translateY(20px); }\n  100% { opacity: 1; transform: translateY(0); }\n}\n\n/* Components */\n.bento-card {\n  background-color: var(--color-surface-card);\n  border: 1px solid var(--color-border);\n  border-radius: var(--radius-lg);\n  padding: var(--space-6);\n  display: flex;\n  flex-direction: column;\n  transition: transform 0.2s ease, background-color 0.2s ease, border-color 0.2s ease;\n  position: relative;\n  overflow: hidden;\n}\n\n.bento-card:hover {\n  background-color: var(--color-surface-hover);\n  border-color: var(--color-primary);\n  transform: translateY(-2px);\n}\n\n.bento-card:focus-visible {\n  outline: 2px solid var(--color-primary);\n  outline-offset: 4px;\n}\n\n.bento-card--featured {\n  grid-column: 1 / -1;\n  background: linear-gradient(145deg, var(--color-surface-card), #1e293b);\n}\n\n.card-icon {\n  font-size: 2.5rem;\n  margin-bottom: var(--space-4);\n}\n\n.card-title {\n  font-size: 1.5rem;\n  margin-bottom: var(--space-2);\n}\n\n.card-desc {\n  color: var(--color-text-muted);\n  font-size: 1rem;\n  margin-bottom: var(--space-6);\n  flex-grow: 1;\n}\n\n.metric-box {\n  background-color: rgba(56, 189, 248, 0.1);\n  border-left: 4px solid var(--color-primary);\n  border-radius: var(--radius-sm);\n  padding: var(--space-4);\n  font-family: var(--font-mono);\n  font-size: 0.9rem;\n  color: var(--color-text-base);\n}\n\n.metric-value {\n  color: var(--color-primary);\n  font-weight: 600;\n}\n\n.badge-group {\n  display: flex;\n  flex-wrap: wrap;\n  gap: var(--space-2);\n  margin-top: auto;\n}\n\n.badge {\n  background-color: var(--color-surface-base);\n  border: 1px solid var(--color-border);\n  color: var(--color-text-muted);\n  font-size: 0.75rem;\n  font-weight: 500;\n  padding: 4px 12px;\n  border-radius: 999px;\n  font-family: var(--font-mono);\n  display: inline-flex;\n  align-items: center;\n  min-height: 24px;\n}\n";if(typeof document!=='undefined'){try{var style=document.createElement('style');style.setAttribute('data-zeropack',"src/styles.css");style.textContent=__css;document.head.appendChild(style);}catch(_){}}
module.exports=__css;module.exports.default=__css;},{}],3:[function(require,module,exports){module.exports.formatGreeting=formatGreeting;module.exports.calculateCircleArea=calculateCircleArea;const __mod_b0b91376=require('./math.js');const{add,multiply,PI}=__mod_b0b91376
module.exports.formatGreeting=formatGreeting;function formatGreeting(name){const timestamp=new Date().toLocaleTimeString();return`Hello ${name}! Built with ZeroPack at ${timestamp}`;}
module.exports.calculateCircleArea=calculateCircleArea;function calculateCircleArea(radius){return multiply(PI,multiply(radius,radius));}
const __defaultExport={formatGreeting,calculateCircleArea};module.exports.default=__defaultExport;},{"./math.js":4}],});