/**
 * @module parser-css
 * @description CSS minifier for ZeroPack. Zero npm dependencies.
 *
 * Replaces: postcss, clean-css, cssnano
 * Standard library: pure string operations
 */

/**
 * Minifies a CSS string using a character-by-character state machine.
 *
 * Operations performed:
 *  - Strips block comments (honoured inside string literals).
 *  - Collapses runs of whitespace/newlines to a single space.
 *  - Removes spaces around structural tokens: { } : ; , > ~ +
 *
 * @param {string} css  Raw CSS source string.
 * @returns {string}    Minified CSS string.
 */
export function minifyCss(css) {
  let out = '';
  let inDouble = false;
  let inSingle = false;
  let isEscaped = false;
  let i = 0;
  const len = css.length;

  while (i < len) {
    const c = css[i];
    if (isEscaped) {
      out += c;
      isEscaped = false;
      i++;
      continue;
    }

    if (c === '\\') {
      out += c;
      isEscaped = true;
      i++;
      continue;
    }

    if (inSingle) {
      out += c;
      if (c === "'") inSingle = false;
      i++;
      continue;
    }

    if (inDouble) {
      out += c;
      if (c === '"') inDouble = false;
      i++;
      continue;
    }

    if (c === "'") {
      out += c;
      inSingle = true;
      i++;
      continue;
    }

    if (c === '"') {
      out += c;
      inDouble = true;
      i++;
      continue;
    }

    // Comment detection
    if (c === '/' && i + 1 < len && css[i + 1] === '*') {
      i += 2;
      while (i < len - 1 && !(css[i] === '*' && css[i + 1] === '/')) {
        i++;
      }
      i += 2;
      continue;
    }

    out += c;
    i++;
  }

  // Collapse whitespace sequences to single space
  out = out.replace(/\s+/g, ' ');
  // Remove spaces around structural tokens
  out = out.replace(/\s*([{}:;,>~+])\s*/g, '$1');
  return out.trim();
}

/**
 * Wraps minified CSS in a browser style-injection JS module.
 * @param {string} rawCss  Raw CSS source.
 * @param {string} filePath  Absolute path (used as data-zeropack attribute).
 * @returns {{ code: string, dependencies: string[] }}
 */
export function transformCssModule(rawCss, filePath) {
  const minified = minifyCss(rawCss);
  // Escape backticks and backslashes so the CSS is safe inside a template literal
  const escaped = minified.replace(/\\/g, '\\\\').replace(/`/g, '\\`');
  const code = [
    `const __css = \`${escaped}\`;`,
    `if (typeof document !== 'undefined') {`,
    `  const __style = document.createElement('style');`,
    `  __style.setAttribute('data-zeropack', ${JSON.stringify(filePath)});`,
    `  __style.textContent = __css;`,
    `  document.head.appendChild(__style);`,
    `}`,
    `module.exports = __css;`
  ].join('\n');
  return { code, dependencies: [] };
}
