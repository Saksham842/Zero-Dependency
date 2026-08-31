(function(modules){var installedModules={};function __zeropack_require__(moduleId){if(installedModules[moduleId]){return installedModules[moduleId].exports;}var module=installedModules[moduleId]={id:moduleId,loaded:false,exports:{}};var fn=modules[moduleId][0];var mapping=modules[moduleId][1];function localRequire(name){if(mapping[name]===undefined){throw new Error('ZeroPack: Cannot find module \'' + name + '\' from module ID '+moduleId);}return __zeropack_require__(mapping[name]);}try{fn(localRequire,module,module.exports);}catch(e){console.error('[ZeroPack Runtime Error in Module '+moduleId+']:',e);throw e;}module.loaded=true;return module.exports;}if(typeof window!=='undefined'){window.__zeropack_modules__=modules;window.__zeropack_require__=__zeropack_require__;}return __zeropack_require__(0);})({2:[function(require,module,exports){const __mod_27c3420f=require('./utils.js');const{formatGreeting,calculateCircleArea}=__mod_27c3420f;module.exports.renderApp=renderApp;function renderApp(containerId='app'){const container=document.getElementById(containerId);if(!container)return;const area=calculateCircleArea(5).toFixed(2);const greeting=formatGreeting('Hackathon Innovator');container.innerHTML=`
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
  `;}},{"./utils.js":3}],0:[function(require,module,exports){require('./styles.css');const __mod_5d712fe8=require('./components.js');const{renderApp}=__mod_5d712fe8;console.log('[ZeroPack] Initializing application bundle...');if(typeof window!=='undefined'){window.addEventListener('DOMContentLoaded',()=>{renderApp('app');});if(document.readyState==='interactive'||document.readyState==='complete'){renderApp('app');}}else{console.log('[ZeroPack] Running in headless / CLI mode');}},{"./styles.css":1,"./components.js":2}],4:[function(require,module,exports){module.exports.add=add;function add(a,b){return a+b;}module.exports.multiply=multiply;function multiply(a,b){return a*b;}const PI=module.exports.PI=3.14159265359;},{}],1:[function(require,module,exports){const __css=`@import url('https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500;600;700&family=Overpass+Mono:wght@400;600&display=swap');:root{--color-primary:#38bdf8;--color-secondary:#818cf8;--color-success:#34d399;--color-warning:#fbbf24;--color-danger:#f87171;--color-surface-base:#09090b;--color-surface-card:#18181b;--color-surface-hover:#27272a;--color-border:#3f3f46;--color-text-base:#f4f4f5;--color-text-muted:#a1a1aa;--font-sans:'Jost',system-ui,sans-serif;--font-mono:'Overpass Mono',monospace;--space-2:0.5rem;--space-4:1rem;--space-6:1.5rem;--space-8:2rem;--radius-sm:8px;--radius-md:16px;--radius-lg:24px;}*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}body{background-color:var(--color-surface-base);color:var(--color-text-base);font-family:var(--font-sans);line-height:1.6;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:var(--space-4);-webkit-font-smoothing:antialiased;}h1,h2{font-family:var(--font-sans);font-weight:600;line-height:1.2;}.text-gradient{background:linear-gradient(135deg,var(--color-primary),var(--color-secondary));-webkit-background-clip:text;-webkit-text-fill-color:transparent;color:var(--color-primary);}.bento-container{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:var(--space-6);width:100%;max-width:900px;animation:fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) forwards;opacity:0;}@keyframes fadeUp{0%{opacity:0;transform:translateY(20px);}100%{opacity:1;transform:translateY(0);}}.bento-card{background-color:var(--color-surface-card);border:1px solid var(--color-border);border-radius:var(--radius-lg);padding:var(--space-6);display:flex;flex-direction:column;transition:transform 0.2s ease,background-color 0.2s ease,border-color 0.2s ease;position:relative;overflow:hidden;}.bento-card:hover{background-color:var(--color-surface-hover);border-color:var(--color-primary);transform:translateY(-2px);}.bento-card:focus-visible{outline:2px solid var(--color-primary);outline-offset:4px;}.bento-card--featured{grid-column:1 / -1;background:linear-gradient(145deg,var(--color-surface-card),#1e293b);}.card-icon{font-size:2.5rem;margin-bottom:var(--space-4);}.card-title{font-size:1.5rem;margin-bottom:var(--space-2);}.card-desc{color:var(--color-text-muted);font-size:1rem;margin-bottom:var(--space-6);flex-grow:1;}.metric-box{background-color:rgba(56,189,248,0.1);border-left:4px solid var(--color-primary);border-radius:var(--radius-sm);padding:var(--space-4);font-family:var(--font-mono);font-size:0.9rem;color:var(--color-text-base);}.metric-value{color:var(--color-primary);font-weight:600;}.badge-group{display:flex;flex-wrap:wrap;gap:var(--space-2);margin-top:auto;}.badge{background-color:var(--color-surface-base);border:1px solid var(--color-border);color:var(--color-text-muted);font-size:0.75rem;font-weight:500;padding:4px 12px;border-radius:999px;font-family:var(--font-mono);display:inline-flex;align-items:center;min-height:24px;}`;if(typeof document!=='undefined'){const __style=document.createElement('style');__style.setAttribute('data-zeropack',"/home/advait/dev/Zero-Dependency/src/styles.css");__style.textContent=__css;document.head.appendChild(__style);}module.exports=__css;},{}],3:[function(require,module,exports){const __mod_b0b91376=require('./math.js');const{add,multiply,PI}=__mod_b0b91376;module.exports.formatGreeting=formatGreeting;function formatGreeting(name){const timestamp=new Date().toLocaleTimeString();return `Hello ${name}! Built with ZeroPack at ${timestamp}`;}module.exports.calculateCircleArea=calculateCircleArea;function calculateCircleArea(radius){return multiply(PI,multiply(radius,radius));}const __defaultExport=({formatGreeting,calculateCircleArea});module.exports.default=__defaultExport;if(typeof __defaultExport==='object'&&__defaultExport!==null){Object.assign(module.exports,__defaultExport);}},{"./math.js":4}],});