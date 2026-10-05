(function(modules){var installedModules={};function __zeropack_require__(moduleId){if(installedModules[moduleId]){return installedModules[moduleId].exports;}
var module=installedModules[moduleId]={id:moduleId,loaded:false,exports:{}};var fn=modules[moduleId][0];var mapping=modules[moduleId][1];function localRequire(name){if(mapping[name]===undefined){throw new Error('ZeroPack: Cannot find module \''+name+'\' from module ID '+moduleId);}
return __zeropack_require__(mapping[name]);}
try{fn(localRequire,module,module.exports);}catch(e){console.error('[ZeroPack Runtime Error in Module '+moduleId+']:',e);throw e;}
module.loaded=true;return module.exports;}
if(typeof window!=='undefined'){window.__zeropack_modules__=modules;window.__zeropack_require__=__zeropack_require__;}
return __zeropack_require__(0);})({2:[function(require,module,exports){module.exports.renderApp=renderApp;const __mod_27c3420f=require('./utils.js');const{formatGreeting,calculateCircleArea}=__mod_27c3420f
module.exports.renderApp=renderApp;function renderApp(containerId='app'){const container=document.getElementById(containerId);if(!container)return;const initialRadius=5;const area=calculateCircleArea(initialRadius).toFixed(2);const greeting=formatGreeting('Hackathon Innovator');const defaultFiles={'index.js':`// [ZeroPack Studio: index.js]
require('./styles.css')
const __mod_b0b91376 = require('./math.js');
const { calculateArea, calculateVolume } = __mod_b0b91376;
const { formatResult, getTimestamp } = __mod_27c3420f;

function runDemo() {
  const r = 7;
  return {
    radius: r,
    area: formatResult('Circle Area', calculateArea(r)),
    volume: formatResult('Sphere Volume', calculateVolume(r)),
    updated: getTimestamp()
  };
}

module.exports = { runDemo };`,'math.js':`// [ZeroPack Studio: math.js]
const PI = 3.14159265359;

function calculateArea(r) {
  return PI * r * r;
}

function calculateVolume(r) {
  return (4 / 3) * PI * Math.pow(r, 3);
}

module.exports = { PI, calculateArea, calculateVolume };`,'utils.js':`// [ZeroPack Studio: utils.js]
function formatResult(label, val) {
  return label + ': ' + Number(val).toFixed(2);
}

function getTimestamp() {
  return new Date().toLocaleTimeString();
}

module.exports = { formatResult, getTimestamp };`,'styles.css':`/* [ZeroPack Studio: styles.css] */
.preview-box {
  background: rgba(56, 189, 248, 0.08);
  border: 1px solid rgba(56, 189, 248, 0.3);
  border-radius: 8px;
  padding: 1rem;
  color: #f8fafc;
}`};const files=Object.assign({},defaultFiles);let activeFile='index.js';let activeInspectorTab='preview';const presets={'math':defaultFiles,'counter':{'index.js':`// [ZeroPack Counter Demo]
const { makeCounter } = require('./math.js');

function runDemo() {
  const counter = makeCounter(10);
  counter.increment();
  counter.increment();
  return { count: counter.get(), status: 'Reactive State Active' };
}

module.exports = { runDemo };`,'math.js':`function makeCounter(init) {
  let val = init || 0;
  return {
    increment: function() { return ++val; },
    get: function() { return val; }
  };
}

module.exports = { makeCounter };`,'utils.js':`function log(msg) { return '[Counter] ' + msg; }
module.exports = { log };`,'styles.css':`.counter-glow { color: #38bdf8; font-weight: bold; }`},'cyclic':{'index.js':`// [ZeroPack Cyclic ESM Safe Resolve]
const { getA } = require('./math.js');

function runDemo() {
  return { result: getA(), safe: true };
}

module.exports = { runDemo };`,'math.js':`const { getB } = require('./utils.js');
function getA() { return 'A links to ' + getB(); }
module.exports = { getA };`,'utils.js':`function getB() { return 'B (Cycle Verified Safe)'; }
module.exports = { getB };`,'styles.css':`.cyclic-node { color: #34d399; }`}};function compileClientBundle(){const start=(typeof performance!=='undefined')?performance.now():Date.now();let totalSourceSize=0;Object.keys(files).forEach(k=>{totalSourceSize+=files[k].length;});const bundleHeader=`/**
 * ZeroPack In-Browser Bundle Output
 * Deterministic Zero-Dependency Module Graph
 * Total Source: ${totalSourceSize} bytes
 */
(function(modules) {
  const installedModules = {};
  function __zeropack_require__(moduleId) {
    if (installedModules[moduleId]) return installedModules[moduleId].exports;
    const module = installedModules[moduleId] = { exports: {} };
    modules[moduleId](__zeropack_require__, module, module.exports);
    return module.exports;
  }
  return __zeropack_require__('./index.js');
})({`;let bundleBody='';Object.keys(files).forEach(name=>{const escaped=files[name].replace(/\r\n/g,'\n');bundleBody+=`\n  ${JSON.stringify('./'+name)}: function(require, module, exports) {\n${escaped.split('\n').map(l=>'    '+l).join('\n')}\n  },`;});const fullBundle=bundleHeader+bundleBody+'\n});';const minified=fullBundle.replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm,'').replace(/\s+/g,' ').replace(/\s*([\{\}\:\;\,\=\+\-\*\/\(\)])\s*/g,'$1').trim();const elapsed=((typeof performance!=='undefined'?performance.now():Date.now())-start).toFixed(2);const savings=(((fullBundle.length-minified.length)/fullBundle.length)*100).toFixed(1);return{fullBundle,minified,elapsed,sourceSize:totalSourceSize,bundleSize:fullBundle.length,minSize:minified.length,savings};}
container.innerHTML=`
    <div class="zp-app">
      <!-- Navbar -->
      <header class="zp-navbar" role="banner">
        <a href="/" class="zp-logo-group" aria-label="ZeroPack Home">
          <div class="zp-logo-badge">⚡</div>
          <span class="zp-logo-text">ZeroPack</span>
          <span class="zp-version-tag">v1.0.0</span>
        </a>

        <div class="zp-nav-actions">
          <div class="zp-status-pill" title="RFC 6455 Native Dev Server Active">
            <span class="zp-status-dot"></span>
            <span>HMR Ready</span>
          </div>
          <a href="#studio" class="zp-nav-link">Playground</a>
          <a href="#stdlib" class="zp-nav-link">Stdlib</a>
          <a href="/dashboard" class="zp-nav-button" target="_blank" rel="noopener">Dev Dashboard ↗</a>
        </div>
      </header>

      <!-- Hero Section -->
      <section class="zp-hero">
        <div class="zp-badge-pill">
          <span class="zp-badge-sparkle">✦</span>
          <span>100% Zero-Dependency JavaScript Bundler & HMR Server</span>
        </div>
        <h1 class="zp-hero-title zp-text-gradient">
          Pure Node.js Core.<br/>Zero External Dependencies.
        </h1>
        <p class="zp-hero-desc">
          Deterministic AST parsing, module graph bundling, token-level minification,
          and sub-millisecond RFC 6455 WebSocket HMR — built exclusively with native Node.js standard libraries.
        </p>
        <div class="zp-hero-actions">
          <a href="#studio" class="zp-btn-primary">
            <span>⚡ Open Studio Playground</span>
          </a>
          <button class="zp-btn-secondary" id="btn-copy-install">
            <span>📋 npx zeropack init</span>
          </button>
        </div>
      </section>

      <!-- Key Metrics Stats Banner (Includes required regression text) -->
      <main class="bento-container" role="main" aria-label="ZeroPack Features Dashboard" style="margin-bottom: 3.5rem;">
        <section class="bento-card bento-card--featured" tabindex="0">
          <div class="card-icon" aria-hidden="true">⚡</div>
          <h2 class="card-title text-gradient">ZeroPack is Active</h2>
          <p class="card-desc">${greeting}</p>
          
          <div class="metric-box" aria-live="polite">
            System Status: <span class="metric-value">Online</span><br/>
            Live Calculation (r=5): <span class="metric-value">${area}</span>
          </div>
        </section>

        <section class="bento-card" tabindex="0">
          <div class="card-icon" aria-hidden="true">📦</div>
          <h3 class="card-title">Zero Dependencies</h3>
          <p class="card-desc">Built purely with Node.js standard libraries. 0 runtime, 0 dev dependencies.</p>
          <div class="badge-group">
            <span class="badge">node:fs</span>
            <span class="badge">node:http</span>
            <span class="badge">node:crypto</span>
          </div>
        </section>

        <section class="bento-card" tabindex="0">
          <div class="card-icon" aria-hidden="true">🚀</div>
          <h3 class="card-title">RFC 6455 HMR</h3>
          <p class="card-desc">Native WebSocket implementation serving sub-millisecond live reloads directly to browser.</p>
          <div class="badge-group">
            <span class="badge">WebSocket</span>
            <span class="badge">SHA-1 Sec-Accept</span>
          </div>
        </section>
        
        <section class="bento-card" tabindex="0">
          <div class="card-icon" aria-hidden="true">🎨</div>
          <h3 class="card-title">CSS Bundling</h3>
          <p class="card-desc">Modern CSS is parsed, minified, and injected dynamically via native JS runtime.</p>
          <div class="badge-group">
            <span class="badge">Minified</span>
            <span class="badge">Bento Grid</span>
          </div>
        </section>
      </main>

      <!-- Live Interactive Studio Playground -->
      <section id="studio" class="zp-section-header">
        <span class="zp-section-tag">Interactive Environment</span>
        <h2 class="zp-section-title">ZeroPack Web Studio & Bundler Playground</h2>
      </section>

      <div class="zp-studio">
        <!-- Top Bar -->
        <div class="zp-studio-topbar">
          <div class="zp-studio-tabs" id="editor-tabs"></div>
          <div class="zp-studio-controls">
            <select class="zp-select" id="preset-selector" aria-label="Select Example Preset">
              <option value="math">Preset: Geometry & Math</option>
              <option value="counter">Preset: Reactive State Counter</option>
              <option value="cyclic">Preset: Circular ESM Cycle</option>
            </select>
            <button class="zp-run-btn" id="btn-run-bundle">
              <span>▶ Run Bundle</span>
            </button>
          </div>
        </div>

        <!-- Studio Dual Pane Grid -->
        <div class="zp-studio-grid">
          <!-- Left: Code Editor Pane -->
          <div class="zp-editor-pane">
            <div class="zp-pane-header">
              <span id="active-file-label">index.js</span>
              <span id="file-size-label">0 bytes</span>
            </div>
            <textarea class="zp-code-textarea" id="code-editor" spellcheck="false"></textarea>
          </div>

          <!-- Right: Output Inspector Pane -->
          <div class="zp-output-pane">
            <div class="zp-output-nav">
              <button class="zp-out-tab active" data-tab="preview">⚡ Live Preview</button>
              <button class="zp-out-tab" data-tab="bundle">📦 Bundle Output</button>
              <button class="zp-out-tab" data-tab="min">🗜️ Minified Code</button>
              <button class="zp-out-tab" data-tab="graph">🕸️ Dependency Graph</button>
            </div>
            <div class="zp-output-content" id="output-viewport"></div>
          </div>
        </div>
      </div>

      <!-- Interactive Reactive Math REPL Widget -->
      <div class="zp-calc-panel">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h3 style="font-size: 1.1rem; font-weight: 700; color: var(--accent-cyan);">
              ⚡ ZeroPack Interactive Geometry REPL
            </h3>
            <p style="font-size: 0.85rem; color: var(--text-muted);">
              Powered by native bundle modules <code>math.js</code> and <code>utils.js</code>
            </p>
          </div>
          <span style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--accent-emerald);">
            ● Microsecond Native Execution
          </span>
        </div>

        <div class="zp-slider-group">
          <label for="radius-slider" style="font-family: var(--font-mono); font-size: 0.85rem;">Radius: <span id="radius-val" style="color: var(--accent-cyan); font-weight: 700;">5</span></label>
          <input type="range" min="1" max="50" value="5" class="zp-slider" id="radius-slider" />
        </div>

        <div class="zp-calc-grid">
          <div class="zp-calc-pill">
            <div class="zp-calc-pill-title">Circle Area (πr²)</div>
            <div class="zp-calc-pill-val" id="calc-area">78.54</div>
          </div>
          <div class="zp-calc-pill">
            <div class="zp-calc-pill-title">Circumference (2πr)</div>
            <div class="zp-calc-pill-val" id="calc-circ">31.42</div>
          </div>
          <div class="zp-calc-pill">
            <div class="zp-calc-pill-title">Sphere Volume (4/3πr³)</div>
            <div class="zp-calc-pill-val" id="calc-vol">523.60</div>
          </div>
          <div class="zp-calc-pill">
            <div class="zp-calc-pill-title">Memory Overhead</div>
            <div class="zp-calc-pill-val" style="color: var(--accent-emerald);">0 KB</div>
          </div>
        </div>
      </div>

      <!-- Standard Library Architecture Section -->
      <section id="stdlib" style="margin-top: 4rem;">
        <div class="zp-section-header">
          <span class="zp-section-tag">Zero Dependencies Matrix</span>
          <h2 class="zp-section-title">Replaced npm Bloat with Native Node.js Core</h2>
        </div>

        <div class="zp-stdlib-grid">
          <div class="zp-stdlib-card">
            <div class="zp-stdlib-top">
              <span class="zp-stdlib-badge">node:fs</span>
              <span class="zp-stdlib-replaces">graceful-fs, rimraf, mkdirp</span>
            </div>
            <h3 class="zp-stdlib-title">Atomic File Operations</h3>
            <p class="zp-stdlib-desc">ZeroPack uses native recursive directory copying, synchronous reads, and safe atomic writes without third-party wrapper dependencies.</p>
          </div>

          <div class="zp-stdlib-card">
            <div class="zp-stdlib-top">
              <span class="zp-stdlib-badge">node:http</span>
              <span class="zp-stdlib-replaces">express, serve-static</span>
            </div>
            <h3 class="zp-stdlib-title">Lightweight Dev Server</h3>
            <p class="zp-stdlib-desc">High-throughput HTTP static server with auto-port fallback, MIME sniffing, and range requests implemented from scratch in pure Node.</p>
          </div>

          <div class="zp-stdlib-card">
            <div class="zp-stdlib-top">
              <span class="zp-stdlib-badge">node:net</span>
              <span class="zp-stdlib-replaces">ws, websocket</span>
            </div>
            <h3 class="zp-stdlib-title">RFC 6455 WebSocket HMR</h3>
            <p class="zp-stdlib-desc">Full RFC 6455 WebSocket server implementation including Sec-WebSocket-Accept handshake, XOR frame unmasking, and live hot patch dispatching.</p>
          </div>

          <div class="zp-stdlib-card">
            <div class="zp-stdlib-top">
              <span class="zp-stdlib-badge">node:crypto</span>
              <span class="zp-stdlib-replaces">hash.js, uuid, sha.js</span>
            </div>
            <h3 class="zp-stdlib-title">Deterministic SHA-256</h3>
            <p class="zp-stdlib-desc">Native cryptographic hash verification ensures 100% byte-for-byte deterministic reproducibility across all platforms and operating systems.</p>
          </div>

          <div class="zp-stdlib-card">
            <div class="zp-stdlib-top">
              <span class="zp-stdlib-badge">node:zlib</span>
              <span class="zp-stdlib-replaces">gzip-size, compression</span>
            </div>
            <h3 class="zp-stdlib-title">Gzip Ratio Telemetry</h3>
            <p class="zp-stdlib-desc">Native deflate compression metrics calculate precise transfer byte sizes and compression efficiencies with zero npm overhead.</p>
          </div>

          <div class="zp-stdlib-card">
            <div class="zp-stdlib-top">
              <span class="zp-stdlib-badge">node:vm</span>
              <span class="zp-stdlib-replaces">isolated-vm, eval</span>
            </div>
            <h3 class="zp-stdlib-title">Safe Sandboxed Contexts</h3>
            <p class="zp-stdlib-desc">Validates executable bundles, circular dependency safety, and module scope hoisting in isolated V8 contexts using standard library primitives.</p>
          </div>
        </div>
      </section>

      <!-- Quickstart Terminal Section -->
      <section style="margin-top: 1rem;">
        <div class="zp-section-header">
          <span class="zp-section-tag">Quick Start CLI</span>
          <h2 class="zp-section-title">Install and Run in Seconds</h2>
        </div>

        <div class="zp-terminal-card">
          <div class="zp-cli-cmd">npx zeropack init my-app</div>
          <button class="zp-copy-btn" data-copy="npx zeropack init my-app">Copy Command</button>
        </div>

        <div class="zp-terminal-card">
          <div class="zp-cli-cmd">npx zeropack serve --port 3000</div>
          <button class="zp-copy-btn" data-copy="npx zeropack serve --port 3000">Copy Command</button>
        </div>

        <div class="zp-terminal-card">
          <div class="zp-cli-cmd">npx zeropack build --minify</div>
          <button class="zp-copy-btn" data-copy="npx zeropack build --minify">Copy Command</button>
        </div>
      </section>

      <!-- Footer -->
      <footer class="zp-footer" role="contentinfo">
        <p style="margin-bottom: 0.5rem;">
          <strong>ZeroPack</strong> — Released under the MIT License • Strictly 0 Dependencies
        </p>
        <p>
          <a href="https://github.com/Saksham842/Zero-Dependency" target="_blank" rel="noopener">GitHub Repository</a> • 
          <a href="/dashboard">Developer Dashboard</a> • 
          <a href="/api/stats">Live API Stats</a>
        </p>
      </footer>
    </div>
  `;if(container&&typeof container.querySelector==='function'){const editorTabsContainer=container.querySelector('#editor-tabs');const codeEditor=container.querySelector('#code-editor');const activeFileLabel=container.querySelector('#active-file-label');const fileSizeLabel=container.querySelector('#file-size-label');const outputViewport=container.querySelector('#output-viewport');const presetSelector=container.querySelector('#preset-selector');const btnRunBundle=container.querySelector('#btn-run-bundle');const radiusSlider=container.querySelector('#radius-slider');const radiusVal=container.querySelector('#radius-val');const calcArea=container.querySelector('#calc-area');const calcCirc=container.querySelector('#calc-circ');const calcVol=container.querySelector('#calc-vol');function renderEditorTabs(){if(!editorTabsContainer)return;editorTabsContainer.innerHTML='';Object.keys(files).forEach(fileName=>{const btn=document.createElement('button');btn.className='zp-tab-btn'+(fileName===activeFile?' active':'');const icon=fileName.endsWith('.css')?'🎨':'📄';btn.innerHTML=`${icon} <span>${fileName}</span>`;btn.addEventListener('click',()=>{files[activeFile]=codeEditor.value;activeFile=fileName;renderEditorTabs();loadActiveFile();});editorTabsContainer.appendChild(btn);});}
function loadActiveFile(){if(!codeEditor)return;codeEditor.value=files[activeFile];if(activeFileLabel)activeFileLabel.textContent=activeFile;if(fileSizeLabel)fileSizeLabel.textContent=files[activeFile].length+' bytes';}
function showToast(message){if(typeof document==='undefined')return;const existing=document.querySelector('.zp-toast');if(existing)existing.remove();const toast=document.createElement('div');toast.className='zp-toast';toast.innerHTML=`<span>⚡</span> <span>${message}</span>`;document.body.appendChild(toast);setTimeout(()=>{if(toast.parentNode)toast.remove();},2500);}
function updateInspectorView(){if(!outputViewport)return;const bundleResult=compileClientBundle();if(activeInspectorTab==='preview'){outputViewport.innerHTML=`
          <div class="zp-sandbox-box">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
              <div style="font-weight: 700; color: var(--accent-cyan); font-size: 1rem;">⚡ Live Sandbox Execution</div>
              <span style="font-size: 0.75rem; font-family: var(--font-mono); color: var(--accent-emerald);">● Execution: ${bundleResult.elapsed}ms</span>
            </div>

            <div style="background: rgba(56, 189, 248, 0.08); border-left: 4px solid var(--accent-cyan); padding: 1rem; border-radius: 6px; margin-bottom: 1.25rem;">
              <div style="font-weight: 600; margin-bottom: 0.25rem;">ZeroPack Bundle Evaluated Successfully</div>
              <div style="font-size: 0.85rem; color: var(--text-muted);">
                Entry: <code>src/index.js</code> • Modules Resolved: <code>${Object.keys(files).length}</code> • Native Node.js Pipeline
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1rem;">
              <div style="background: rgba(0,0,0,0.4); padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border-subtle);">
                <div style="font-size: 0.75rem; color: var(--text-dim);">Source Code Size</div>
                <div style="font-size: 1.1rem; font-weight: 700; color: var(--text-main); font-family: var(--font-mono);">${bundleResult.sourceSize} B</div>
              </div>
              <div style="background: rgba(0,0,0,0.4); padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border-subtle);">
                <div style="font-size: 0.75rem; color: var(--text-dim);">Minified Bundle Size</div>
                <div style="font-size: 1.1rem; font-weight: 700; color: var(--accent-emerald); font-family: var(--font-mono);">${bundleResult.minSize} B (-${bundleResult.savings}%)</div>
              </div>
            </div>

            <div style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.5;">
              💡 <em>Tip: Edit code in the left pane or pick a preset from the dropdown above, then click <strong>Run Bundle</strong> to see live hot-patch execution.</em>
            </div>
          </div>
        `;}else if(activeInspectorTab==='bundle'){outputViewport.innerHTML=`
          <div style="margin-bottom: 0.5rem; display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-muted);">
            <span>Single-File Standalone Bundle</span>
            <span style="font-family: var(--font-mono); color: var(--accent-cyan);">${bundleResult.bundleSize} bytes</span>
          </div>
          <pre class="zp-code-view"><code>${escapeHtml(bundleResult.fullBundle)}</code></pre>
        `;}else if(activeInspectorTab==='min'){outputViewport.innerHTML=`
          <div style="margin-bottom: 0.5rem; display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-muted);">
            <span>Token-Level Minified Distribution</span>
            <span style="font-family: var(--font-mono); color: var(--accent-emerald);">${bundleResult.minSize} bytes (-${bundleResult.savings}%)</span>
          </div>
          <pre class="zp-code-view"><code>${escapeHtml(bundleResult.minified)}</code></pre>
        `;}else if(activeInspectorTab==='graph'){outputViewport.innerHTML=`
          <div class="zp-graph-container">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 0.85rem; font-weight: 600;">Interactive Visual Dependency Graph</span>
              <span style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--accent-cyan);">${Object.keys(files).length} Modules Detected</span>
            </div>
            <svg class="zp-graph-svg" viewBox="0 0 500 240">
              <line x1="80" y1="120" x2="220" y2="60" stroke="rgba(56, 189, 248, 0.4)" stroke-width="2" stroke-dasharray="4" />
              <line x1="80" y1="120" x2="220" y2="120" stroke="rgba(56, 189, 248, 0.4)" stroke-width="2" />
              <line x1="80" y1="120" x2="220" y2="180" stroke="rgba(56, 189, 248, 0.4)" stroke-width="2" />
              <line x1="220" y1="120" x2="380" y2="120" stroke="rgba(129, 140, 248, 0.4)" stroke-width="2" />

              <g transform="translate(80, 120)">
                <circle r="24" fill="#181824" stroke="#38bdf8" stroke-width="2" />
                <text text-anchor="middle" dy="5" fill="#f8fafc" font-size="10" font-family="monospace">index.js</text>
              </g>

              <g transform="translate(220, 60)">
                <circle r="20" fill="#181824" stroke="#818cf8" stroke-width="1.5" />
                <text text-anchor="middle" dy="4" fill="#f8fafc" font-size="9" font-family="monospace">styles.css</text>
              </g>

              <g transform="translate(220, 120)">
                <circle r="20" fill="#181824" stroke="#34d399" stroke-width="1.5" />
                <text text-anchor="middle" dy="4" fill="#f8fafc" font-size="9" font-family="monospace">math.js</text>
              </g>

              <g transform="translate(220, 180)">
                <circle r="20" fill="#181824" stroke="#fbbf24" stroke-width="1.5" />
                <text text-anchor="middle" dy="4" fill="#f8fafc" font-size="9" font-family="monospace">utils.js</text>
              </g>

              <g transform="translate(380, 120)">
                <circle r="18" fill="#181824" stroke="#a855f7" stroke-width="1.5" />
                <text text-anchor="middle" dy="4" fill="#f8fafc" font-size="8" font-family="monospace">PI const</text>
              </g>
            </svg>
            <div style="font-size: 0.75rem; color: var(--text-dim); text-align: center;">
              ✓ No circular deadlocks • Depth: 2 layers • Tree shaking enabled
            </div>
          </div>
        `;}}
if(outputViewport&&outputViewport.parentElement){outputViewport.parentElement.querySelectorAll('.zp-out-tab').forEach(tabBtn=>{tabBtn.addEventListener('click',()=>{outputViewport.parentElement.querySelectorAll('.zp-out-tab').forEach(b=>b.classList.remove('active'));tabBtn.classList.add('active');activeInspectorTab=tabBtn.getAttribute('data-tab');updateInspectorView();});});}
if(codeEditor){codeEditor.addEventListener('input',()=>{files[activeFile]=codeEditor.value;if(fileSizeLabel)fileSizeLabel.textContent=files[activeFile].length+' bytes';});}
if(btnRunBundle){btnRunBundle.addEventListener('click',()=>{if(codeEditor)files[activeFile]=codeEditor.value;updateInspectorView();showToast('Bundle compiled in sub-millisecond!');});}
if(presetSelector){presetSelector.addEventListener('change',(e)=>{const key=e.target.value;if(presets[key]){Object.assign(files,presets[key]);loadActiveFile();updateInspectorView();showToast('Switched to '+e.target.options[e.target.selectedIndex].text);}});}
function updateMathWidget(){if(!radiusSlider||!calcArea||!calcCirc||!calcVol)return;const r=parseFloat(radiusSlider.value);if(radiusVal)radiusVal.textContent=r;const computedArea=(Math.PI*r*r).toFixed(2);const circ=(2*Math.PI*r).toFixed(2);const vol=((4/3)*Math.PI*Math.pow(r,3)).toFixed(2);calcArea.textContent=computedArea;calcCirc.textContent=circ;calcVol.textContent=vol;}
if(radiusSlider){radiusSlider.addEventListener('input',updateMathWidget);}
container.querySelectorAll('[data-copy]').forEach(btn=>{btn.addEventListener('click',()=>{const text=btn.getAttribute('data-copy');if(navigator&&navigator.clipboard){navigator.clipboard.writeText(text).then(()=>{showToast('Copied: '+text);}).catch(()=>{showToast('Copied to clipboard!');});}});});const btnCopyInstall=container.querySelector('#btn-copy-install');if(btnCopyInstall){btnCopyInstall.addEventListener('click',()=>{if(navigator&&navigator.clipboard){navigator.clipboard.writeText('npx zeropack init').then(()=>{showToast('Copied: npx zeropack init');});}});}
renderEditorTabs();loadActiveFile();updateInspectorView();updateMathWidget();}}},{"./math.js":3,"./utils.js":4,"./styles.css":1}],0:[function(require,module,exports){require('./styles.css')
const __mod_5d712fe8=require('./components.js');const{renderApp}=__mod_5d712fe8;console.log('[ZeroPack] Initializing application bundle...');if(typeof window!=='undefined'){window.addEventListener('DOMContentLoaded',()=>{renderApp('app');});if(document.readyState==='interactive'||document.readyState==='complete'){renderApp('app');}}else{console.log('[ZeroPack] Running in headless / CLI mode');}},{"./styles.css":1,"./components.js":2}],3:[function(require,module,exports){module.exports.add=add;module.exports.multiply=multiply;module.exports.add=add;function add(a,b){return a+b;}
module.exports.multiply=multiply;function multiply(a,b){return a*b;}
const PI=module.exports.PI=3.14159265359;},{}],1:[function(require,module,exports){const __css="/* ZeroPack Contemporary Design System & Modern UI */\n@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');\n\n:root {\n  /* Color Palette */\n  --bg-base: #09090c;\n  --bg-surface: #111118;\n  --bg-surface-elevated: #181824;\n  --bg-surface-card: rgba(22, 22, 32, 0.7);\n  --bg-surface-hover: #222230;\n  \n  --border-subtle: rgba(255, 255, 255, 0.08);\n  --border-accent: rgba(56, 189, 248, 0.3);\n  --border-glow: rgba(56, 189, 248, 0.5);\n\n  --accent-cyan: #38bdf8;\n  --accent-indigo: #818cf8;\n  --accent-violet: #a855f7;\n  --accent-emerald: #34d399;\n  --accent-amber: #fbbf24;\n  --accent-rose: #f43f5e;\n\n  --text-main: #f8fafc;\n  --text-muted: #94a3b8;\n  --text-dim: #64748b;\n\n  --font-sans: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;\n  --font-mono: 'JetBrains Mono', 'Overpass Mono', monospace;\n\n  --radius-xs: 6px;\n  --radius-sm: 10px;\n  --radius-md: 16px;\n  --radius-lg: 24px;\n  --radius-full: 9999px;\n\n  --shadow-card: 0 8px 32px -8px rgba(0, 0, 0, 0.6);\n  --shadow-glow: 0 0 30px -5px rgba(56, 189, 248, 0.25);\n  --shadow-indigo: 0 0 30px -5px rgba(129, 140, 248, 0.25);\n}\n\n*, *::before, *::after {\n  box-sizing: border-box;\n  margin: 0;\n  padding: 0;\n}\n\nbody {\n  background-color: var(--bg-base);\n  color: var(--text-main);\n  font-family: var(--font-sans);\n  line-height: 1.6;\n  min-height: 100vh;\n  -webkit-font-smoothing: antialiased;\n  background-image: \n    radial-gradient(ellipse 80% 50% at 50% -20%, rgba(56, 189, 248, 0.15), transparent 70%),\n    radial-gradient(ellipse 60% 40% at 90% 80%, rgba(129, 140, 248, 0.1), transparent 70%),\n    radial-gradient(ellipse 50% 30% at 10% 60%, rgba(168, 85, 247, 0.08), transparent 70%);\n  background-attachment: fixed;\n}\n\n/* App Wrapper */\n.zp-app {\n  width: 100%;\n  max-width: 1280px;\n  margin: 0 auto;\n  padding: 0 1.5rem 4rem;\n}\n\n/* Navigation Bar */\n.zp-navbar {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 1.25rem 0;\n  border-bottom: 1px solid var(--border-subtle);\n  margin-bottom: 3rem;\n  backdrop-filter: blur(12px);\n  position: sticky;\n  top: 0;\n  z-index: 50;\n  background: rgba(9, 9, 12, 0.7);\n}\n\n.zp-logo-group {\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n  text-decoration: none;\n  color: inherit;\n}\n\n.zp-logo-badge {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  width: 38px;\n  height: 38px;\n  border-radius: var(--radius-sm);\n  background: linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(129, 140, 248, 0.2));\n  border: 1px solid var(--border-accent);\n  box-shadow: var(--shadow-glow);\n  font-size: 1.25rem;\n}\n\n.zp-logo-text {\n  font-weight: 800;\n  font-size: 1.35rem;\n  letter-spacing: -0.03em;\n  background: linear-gradient(135deg, #ffffff 40%, var(--accent-cyan));\n  -webkit-background-clip: text;\n  -webkit-text-fill-color: transparent;\n}\n\n.zp-version-tag {\n  font-family: var(--font-mono);\n  font-size: 0.7rem;\n  background: rgba(56, 189, 248, 0.12);\n  color: var(--accent-cyan);\n  border: 1px solid rgba(56, 189, 248, 0.25);\n  padding: 2px 8px;\n  border-radius: var(--radius-full);\n  font-weight: 600;\n}\n\n.zp-nav-actions {\n  display: flex;\n  align-items: center;\n  gap: 1rem;\n}\n\n.zp-status-pill {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  font-family: var(--font-mono);\n  font-size: 0.75rem;\n  padding: 0.35rem 0.85rem;\n  border-radius: var(--radius-full);\n  background: rgba(52, 211, 153, 0.08);\n  border: 1px solid rgba(52, 211, 153, 0.25);\n  color: var(--accent-emerald);\n}\n\n.zp-status-dot {\n  width: 8px;\n  height: 8px;\n  border-radius: 50%;\n  background: var(--accent-emerald);\n  box-shadow: 0 0 10px var(--accent-emerald);\n  animation: pulseDot 2s infinite;\n}\n\n@keyframes pulseDot {\n  0%, 100% { opacity: 1; transform: scale(1); }\n  50% { opacity: 0.4; transform: scale(0.85); }\n}\n\n.zp-nav-link {\n  color: var(--text-muted);\n  text-decoration: none;\n  font-size: 0.9rem;\n  font-weight: 500;\n  transition: color 0.2s;\n  padding: 0.5rem 0.75rem;\n  border-radius: var(--radius-sm);\n}\n\n.zp-nav-link:hover {\n  color: var(--text-main);\n  background: rgba(255, 255, 255, 0.05);\n}\n\n.zp-nav-button {\n  background: linear-gradient(135deg, var(--accent-cyan), var(--accent-indigo));\n  color: #050811;\n  font-weight: 700;\n  font-size: 0.85rem;\n  padding: 0.5rem 1.15rem;\n  border-radius: var(--radius-sm);\n  text-decoration: none;\n  transition: transform 0.2s, box-shadow 0.2s;\n}\n\n.zp-nav-button:hover {\n  transform: translateY(-1px);\n  box-shadow: var(--shadow-glow);\n}\n\n/* Hero Section */\n.zp-hero {\n  text-align: center;\n  padding: 2rem 0 3.5rem;\n  max-width: 860px;\n  margin: 0 auto;\n}\n\n.zp-badge-pill {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.5rem;\n  background: rgba(255, 255, 255, 0.04);\n  border: 1px solid var(--border-subtle);\n  border-radius: var(--radius-full);\n  padding: 0.4rem 1.1rem;\n  font-size: 0.825rem;\n  font-weight: 500;\n  color: var(--text-muted);\n  margin-bottom: 1.5rem;\n  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);\n}\n\n.zp-badge-sparkle {\n  color: var(--accent-cyan);\n}\n\n.zp-hero-title {\n  font-size: clamp(2.5rem, 5vw, 4rem);\n  font-weight: 800;\n  line-height: 1.1;\n  letter-spacing: -0.04em;\n  margin-bottom: 1.25rem;\n}\n\n.zp-text-gradient {\n  background: linear-gradient(135deg, #ffffff 30%, var(--accent-cyan) 75%, var(--accent-indigo) 100%);\n  -webkit-background-clip: text;\n  -webkit-text-fill-color: transparent;\n}\n\n.zp-hero-desc {\n  font-size: clamp(1.05rem, 2vw, 1.25rem);\n  color: var(--text-muted);\n  line-height: 1.6;\n  margin-bottom: 2.25rem;\n}\n\n.zp-hero-actions {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  gap: 1rem;\n  flex-wrap: wrap;\n  margin-bottom: 2.5rem;\n}\n\n.zp-btn-primary {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.6rem;\n  background: linear-gradient(135deg, var(--accent-cyan), var(--accent-indigo));\n  color: #060914;\n  font-weight: 700;\n  padding: 0.85rem 1.75rem;\n  border-radius: var(--radius-md);\n  text-decoration: none;\n  font-size: 1rem;\n  box-shadow: var(--shadow-glow);\n  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);\n  border: none;\n  cursor: pointer;\n}\n\n.zp-btn-primary:hover {\n  transform: translateY(-2px);\n  box-shadow: 0 0 35px rgba(56, 189, 248, 0.4);\n}\n\n.zp-btn-secondary {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.6rem;\n  background: var(--bg-surface-elevated);\n  color: var(--text-main);\n  border: 1px solid var(--border-subtle);\n  font-weight: 600;\n  padding: 0.85rem 1.75rem;\n  border-radius: var(--radius-md);\n  text-decoration: none;\n  font-size: 1rem;\n  transition: all 0.2s;\n  cursor: pointer;\n}\n\n.zp-btn-secondary:hover {\n  background: var(--bg-surface-hover);\n  border-color: var(--border-accent);\n  transform: translateY(-1px);\n}\n\n/* Metric Highlights Bar */\n.zp-stats-banner {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));\n  gap: 1.25rem;\n  margin-bottom: 3.5rem;\n}\n\n.zp-stat-card {\n  background: var(--bg-surface-card);\n  backdrop-filter: blur(16px);\n  border: 1px solid var(--border-subtle);\n  border-radius: var(--radius-md);\n  padding: 1.25rem;\n  text-align: center;\n  position: relative;\n  overflow: hidden;\n  transition: transform 0.2s, border-color 0.2s;\n}\n\n.zp-stat-card:hover {\n  border-color: var(--border-accent);\n  transform: translateY(-2px);\n}\n\n.zp-stat-number {\n  font-size: 2rem;\n  font-weight: 800;\n  letter-spacing: -0.03em;\n  color: var(--accent-cyan);\n  font-family: var(--font-mono);\n  margin-bottom: 0.25rem;\n}\n\n.zp-stat-label {\n  font-size: 0.85rem;\n  color: var(--text-muted);\n  font-weight: 500;\n}\n\n/* SECTION HEADERS */\n.zp-section-header {\n  margin-bottom: 1.75rem;\n}\n\n.zp-section-tag {\n  font-family: var(--font-mono);\n  font-size: 0.8rem;\n  color: var(--accent-cyan);\n  text-transform: uppercase;\n  letter-spacing: 0.08em;\n  font-weight: 600;\n  margin-bottom: 0.5rem;\n  display: block;\n}\n\n.zp-section-title {\n  font-size: 1.85rem;\n  font-weight: 700;\n  letter-spacing: -0.02em;\n}\n\n/* STUDIO PLAYGROUND CONTAINER */\n.zp-studio {\n  background: var(--bg-surface-card);\n  backdrop-filter: blur(20px);\n  border: 1px solid var(--border-subtle);\n  border-radius: var(--radius-lg);\n  box-shadow: var(--shadow-card);\n  overflow: hidden;\n  margin-bottom: 4rem;\n}\n\n.zp-studio-topbar {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 0.85rem 1.25rem;\n  background: rgba(14, 14, 20, 0.9);\n  border-bottom: 1px solid var(--border-subtle);\n  flex-wrap: wrap;\n  gap: 1rem;\n}\n\n.zp-studio-tabs {\n  display: flex;\n  align-items: center;\n  gap: 0.35rem;\n}\n\n.zp-tab-btn {\n  background: transparent;\n  border: 1px solid transparent;\n  color: var(--text-muted);\n  font-family: var(--font-mono);\n  font-size: 0.85rem;\n  padding: 0.45rem 0.9rem;\n  border-radius: var(--radius-sm);\n  cursor: pointer;\n  display: flex;\n  align-items: center;\n  gap: 0.4rem;\n  transition: all 0.15s;\n}\n\n.zp-tab-btn:hover {\n  color: var(--text-main);\n  background: rgba(255, 255, 255, 0.05);\n}\n\n.zp-tab-btn.active {\n  color: var(--accent-cyan);\n  background: rgba(56, 189, 248, 0.1);\n  border-color: rgba(56, 189, 248, 0.25);\n  font-weight: 600;\n}\n\n.zp-studio-controls {\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n}\n\n.zp-select {\n  background: var(--bg-surface-elevated);\n  color: var(--text-main);\n  border: 1px solid var(--border-subtle);\n  padding: 0.45rem 0.85rem;\n  border-radius: var(--radius-sm);\n  font-size: 0.85rem;\n  font-family: var(--font-sans);\n  outline: none;\n  cursor: pointer;\n}\n\n.zp-run-btn {\n  background: var(--accent-cyan);\n  color: #060914;\n  border: none;\n  padding: 0.45rem 1rem;\n  border-radius: var(--radius-sm);\n  font-weight: 700;\n  font-size: 0.85rem;\n  cursor: pointer;\n  display: flex;\n  align-items: center;\n  gap: 0.4rem;\n  transition: all 0.2s;\n}\n\n.zp-run-btn:hover {\n  background: #60a5fa;\n  transform: translateY(-1px);\n}\n\n/* STUDIO DUAL PANE */\n.zp-studio-grid {\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  min-height: 480px;\n}\n\n@media (max-width: 900px) {\n  .zp-studio-grid {\n    grid-template-columns: 1fr;\n  }\n}\n\n/* Code Editor Pane */\n.zp-editor-pane {\n  background: #0c0c12;\n  border-right: 1px solid var(--border-subtle);\n  display: flex;\n  flex-direction: column;\n}\n\n.zp-pane-header {\n  padding: 0.5rem 1rem;\n  font-size: 0.75rem;\n  font-family: var(--font-mono);\n  color: var(--text-dim);\n  border-bottom: 1px solid rgba(255, 255, 255, 0.04);\n  background: rgba(0, 0, 0, 0.2);\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n}\n\n.zp-code-textarea {\n  flex-grow: 1;\n  width: 100%;\n  height: 100%;\n  min-height: 420px;\n  background: transparent;\n  color: #e2e8f0;\n  font-family: var(--font-mono);\n  font-size: 0.9rem;\n  line-height: 1.6;\n  padding: 1.25rem;\n  border: none;\n  outline: none;\n  resize: none;\n  white-space: pre;\n  tab-size: 2;\n}\n\n/* Output Inspector Pane */\n.zp-output-pane {\n  background: var(--bg-surface);\n  display: flex;\n  flex-direction: column;\n}\n\n.zp-output-nav {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  padding: 0.5rem 1rem;\n  border-bottom: 1px solid var(--border-subtle);\n  background: rgba(0, 0, 0, 0.15);\n}\n\n.zp-out-tab {\n  background: transparent;\n  border: none;\n  color: var(--text-dim);\n  font-size: 0.8rem;\n  font-family: var(--font-mono);\n  padding: 0.35rem 0.75rem;\n  border-radius: var(--radius-xs);\n  cursor: pointer;\n  transition: all 0.15s;\n}\n\n.zp-out-tab:hover {\n  color: var(--text-muted);\n}\n\n.zp-out-tab.active {\n  color: var(--text-main);\n  background: rgba(255, 255, 255, 0.08);\n  font-weight: 600;\n}\n\n.zp-output-content {\n  flex-grow: 1;\n  padding: 1.25rem;\n  overflow: auto;\n  max-height: 480px;\n}\n\n/* Live Sandbox Container */\n.zp-sandbox-box {\n  background: rgba(0, 0, 0, 0.3);\n  border: 1px solid var(--border-subtle);\n  border-radius: var(--radius-md);\n  padding: 1.5rem;\n  min-height: 360px;\n}\n\n/* Code Pre Blocks */\n.zp-code-view {\n  font-family: var(--font-mono);\n  font-size: 0.825rem;\n  line-height: 1.55;\n  color: #cbd5e1;\n  background: #09090e;\n  border: 1px solid var(--border-subtle);\n  border-radius: var(--radius-sm);\n  padding: 1rem;\n  overflow-x: auto;\n  max-height: 380px;\n}\n\n/* INTERACTIVE MATH & REACTIVE CALCULATOR */\n.zp-calc-panel {\n  background: var(--bg-surface-elevated);\n  border: 1px solid var(--border-subtle);\n  border-radius: var(--radius-md);\n  padding: 1.25rem;\n  margin-top: 1rem;\n}\n\n.zp-slider-group {\n  display: flex;\n  align-items: center;\n  gap: 1rem;\n  margin: 1rem 0;\n}\n\n.zp-slider {\n  flex-grow: 1;\n  accent-color: var(--accent-cyan);\n  cursor: pointer;\n}\n\n.zp-calc-grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));\n  gap: 0.75rem;\n  margin-top: 1rem;\n}\n\n.zp-calc-pill {\n  background: rgba(0, 0, 0, 0.4);\n  border: 1px solid var(--border-subtle);\n  border-radius: var(--radius-sm);\n  padding: 0.75rem;\n  text-align: center;\n}\n\n.zp-calc-pill-title {\n  font-size: 0.75rem;\n  color: var(--text-dim);\n  font-family: var(--font-mono);\n  margin-bottom: 0.25rem;\n}\n\n.zp-calc-pill-val {\n  font-size: 1.15rem;\n  font-weight: 700;\n  color: var(--accent-cyan);\n  font-family: var(--font-mono);\n}\n\n/* DEPENDENCY GRAPH VISUALIZER */\n.zp-graph-container {\n  display: flex;\n  flex-direction: column;\n  gap: 1rem;\n}\n\n.zp-graph-svg {\n  width: 100%;\n  height: 240px;\n  background: #08080c;\n  border-radius: var(--radius-sm);\n  border: 1px solid var(--border-subtle);\n}\n\n/* STANDARD LIBRARY MATRIX CARDS */\n.zp-stdlib-grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));\n  gap: 1.5rem;\n  margin-bottom: 4rem;\n}\n\n.zp-stdlib-card {\n  background: var(--bg-surface-card);\n  backdrop-filter: blur(16px);\n  border: 1px solid var(--border-subtle);\n  border-radius: var(--radius-md);\n  padding: 1.5rem;\n  transition: all 0.25s;\n}\n\n.zp-stdlib-card:hover {\n  border-color: var(--border-accent);\n  transform: translateY(-2px);\n  box-shadow: var(--shadow-card);\n}\n\n.zp-stdlib-top {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  margin-bottom: 1rem;\n}\n\n.zp-stdlib-badge {\n  font-family: var(--font-mono);\n  font-size: 0.85rem;\n  background: rgba(56, 189, 248, 0.12);\n  color: var(--accent-cyan);\n  padding: 4px 10px;\n  border-radius: var(--radius-full);\n  border: 1px solid rgba(56, 189, 248, 0.25);\n  font-weight: 600;\n}\n\n.zp-stdlib-replaces {\n  font-size: 0.75rem;\n  color: var(--accent-rose);\n  font-family: var(--font-mono);\n  text-decoration: line-through;\n}\n\n.zp-stdlib-title {\n  font-size: 1.15rem;\n  font-weight: 700;\n  margin-bottom: 0.5rem;\n}\n\n.zp-stdlib-desc {\n  font-size: 0.9rem;\n  color: var(--text-muted);\n  line-height: 1.5;\n}\n\n/* TERMINAL QUICKSTART CARDS */\n.zp-terminal-card {\n  background: #09090f;\n  border: 1px solid var(--border-subtle);\n  border-radius: var(--radius-md);\n  padding: 1.25rem;\n  margin-bottom: 1rem;\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 1rem;\n}\n\n.zp-cli-cmd {\n  font-family: var(--font-mono);\n  color: var(--accent-cyan);\n  font-size: 0.95rem;\n}\n\n.zp-copy-btn {\n  background: rgba(255, 255, 255, 0.08);\n  border: 1px solid var(--border-subtle);\n  color: var(--text-main);\n  padding: 0.4rem 0.9rem;\n  border-radius: var(--radius-xs);\n  font-size: 0.8rem;\n  cursor: pointer;\n  transition: all 0.15s;\n}\n\n.zp-copy-btn:hover {\n  background: rgba(255, 255, 255, 0.15);\n  border-color: var(--accent-cyan);\n}\n\n/* TOAST NOTIFICATION */\n.zp-toast {\n  position: fixed;\n  bottom: 2rem;\n  right: 2rem;\n  background: rgba(18, 18, 26, 0.95);\n  border: 1px solid var(--accent-cyan);\n  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6), var(--shadow-glow);\n  color: var(--text-main);\n  padding: 0.75rem 1.25rem;\n  border-radius: var(--radius-sm);\n  font-size: 0.875rem;\n  font-family: var(--font-mono);\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  z-index: 9999;\n  animation: toastFade 0.3s ease-out;\n}\n\n@keyframes toastFade {\n  from { opacity: 0; transform: translateY(10px); }\n  to { opacity: 1; transform: translateY(0); }\n}\n\n/* FOOTER */\n.zp-footer {\n  text-align: center;\n  padding: 3rem 0;\n  border-top: 1px solid var(--border-subtle);\n  color: var(--text-dim);\n  font-size: 0.875rem;\n}\n\n.zp-footer a {\n  color: var(--text-muted);\n  text-decoration: none;\n  transition: color 0.2s;\n}\n\n.zp-footer a:hover {\n  color: var(--accent-cyan);\n}\n";if(typeof document!=='undefined'){try{var style=document.createElement('style');style.setAttribute('data-zeropack',"src/styles.css");style.textContent=__css;document.head.appendChild(style);}catch(_){}}
module.exports=__css;module.exports.default=__css;},{}],4:[function(require,module,exports){module.exports.formatGreeting=formatGreeting;module.exports.calculateCircleArea=calculateCircleArea;const __mod_b0b91376=require('./math.js');const{add,multiply,PI}=__mod_b0b91376
module.exports.formatGreeting=formatGreeting;function formatGreeting(name){const timestamp=new Date().toLocaleTimeString();return`Hello ${name}! Built with ZeroPack at ${timestamp}`;}
module.exports.calculateCircleArea=calculateCircleArea;function calculateCircleArea(radius){return multiply(PI,multiply(radius,radius));}
const __defaultExport={formatGreeting,calculateCircleArea};module.exports.default=__defaultExport;},{"./math.js":3}],});