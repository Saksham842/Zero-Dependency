(function(modules){var installedModules={};function __zeropack_require__(moduleId){if(installedModules[moduleId]){return installedModules[moduleId].exports;}
var module=installedModules[moduleId]={id:moduleId,loaded:false,exports:{}};var fn=modules[moduleId][0];var mapping=modules[moduleId][1];function localRequire(name){if(mapping[name]===undefined){throw new Error('ZeroPack: Cannot find module \''+name+'\' from module ID '+moduleId);}
return __zeropack_require__(mapping[name]);}
try{fn(localRequire,module,module.exports);}catch(e){console.error('[ZeroPack Runtime Error in Module '+moduleId+']:',e);throw e;}
module.loaded=true;return module.exports;}
if(typeof window!=='undefined'){window.__zeropack_modules__=modules;window.__zeropack_require__=__zeropack_require__;}
return __zeropack_require__(0);})({1:[function(require,module,exports){module.exports.renderApp=renderApp;const __mod_27c3420f=require('./utils.js');const{formatGreeting,calculateCircleArea}=__mod_27c3420f
module.exports.renderApp=renderApp;function renderApp(containerId='app'){const container=document.getElementById(containerId);if(!container)return;const area=calculateCircleArea(5).toFixed(2);const greeting=formatGreeting('Hackathon Innovator');container.innerHTML=`
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
  `;}},{"./utils.js":2}],0:[function(require,module,exports){const __mod_5d712fe8=require('./components.js');const{renderApp}=__mod_5d712fe8;console.log('[ZeroPack] Initializing application bundle...');if(typeof window!=='undefined'){window.addEventListener('DOMContentLoaded',()=>{renderApp('app');});if(document.readyState==='interactive'||document.readyState==='complete'){renderApp('app');}}else{console.log('[ZeroPack] Running in headless / CLI mode');}},{"./components.js":1}],3:[function(require,module,exports){module.exports.add=add;module.exports.multiply=multiply;module.exports.add=add;function add(a,b){return a+b;}
module.exports.multiply=multiply;function multiply(a,b){return a*b;}
const PI=module.exports.PI=3.14159265359;},{}],2:[function(require,module,exports){module.exports.formatGreeting=formatGreeting;module.exports.calculateCircleArea=calculateCircleArea;const __mod_b0b91376=require('./math.js');const{add,multiply,PI}=__mod_b0b91376
module.exports.formatGreeting=formatGreeting;function formatGreeting(name){const timestamp=new Date().toLocaleTimeString();return`Hello ${name}! Built with ZeroPack at ${timestamp}`;}
module.exports.calculateCircleArea=calculateCircleArea;function calculateCircleArea(radius){return multiply(PI,multiply(radius,radius));}
module.exports.default={formatGreeting,calculateCircleArea};},{"./math.js":3}],});