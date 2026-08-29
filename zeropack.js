#!/usr/bin/env node
/**
 * ZeroPack Standalone Executable
 * Zero-Dependency JavaScript Bundler, Minifier & RFC 6455 HMR Dev Server
 * Built exclusively with Node.js Native Core Libraries.
 * 
 * Auto-generated on: 2026-08-29T11:01:51.007Z
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import http from 'node:http';
import crypto from 'node:crypto';
import { parseArgs } from 'node:util';
import { StringDecoder } from 'node:string_decoder';

// ==========================================
// Module: cli.js
// ==========================================
// -----------------------------------------------------------------------------
// 1. Terminal Logger (Zero-dependency ANSI Color Utility)
// -----------------------------------------------------------------------------
export const colors = {
  reset: (text) => `\x1b[0m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[22m`,
  dim: (text) => `\x1b[2m${text}\x1b[22m`,
  italic: (text) => `\x1b[3m${text}\x1b[23m`,
  underline: (text) => `\x1b[4m${text}\x1b[24m`,
  
  // Foreground Colors
  black: (text) => `\x1b[30m${text}\x1b[39m`,
  red: (text) => `\x1b[31m${text}\x1b[39m`,
  green: (text) => `\x1b[32m${text}\x1b[39m`,
  yellow: (text) => `\x1b[33m${text}\x1b[39m`,
  blue: (text) => `\x1b[34m${text}\x1b[39m`,
  magenta: (text) => `\x1b[35m${text}\x1b[39m`,
  cyan: (text) => `\x1b[36m${text}\x1b[39m`,
  white: (text) => `\x1b[37m${text}\x1b[39m`,
  gray: (text) => `\x1b[90m${text}\x1b[39m`,
  
  // Bright colors
  brightRed: (text) => `\x1b[91m${text}\x1b[39m`,
  brightGreen: (text) => `\x1b[92m${text}\x1b[39m`,
  brightYellow: (text) => `\x1b[93m${text}\x1b[39m`,
  brightCyan: (text) => `\x1b[96m${text}\x1b[39m`,
  
  // Background Colors
  bgCyan: (text) => `\x1b[46m\x1b[30m${text}\x1b[39m\x1b[49m`,
  bgGreen: (text) => `\x1b[42m\x1b[30m${text}\x1b[39m\x1b[49m`,
  bgYellow: (text) => `\x1b[43m\x1b[30m${text}\x1b[39m\x1b[49m`,
  bgRed: (text) => `\x1b[41m\x1b[37m${text}\x1b[39m\x1b[49m`
};

export const logger = {
  info: (msg) => console.log(`${colors.cyan(colors.bold('[INFO]'))} ${msg}`),
  success: (msg) => console.log(`${colors.green(colors.bold('[SUCCESS]'))} ${msg}`),
  warn: (msg) => console.warn(`${colors.yellow(colors.bold('[WARN]'))} ${msg}`),
  error: (msg) => console.error(`${colors.red(colors.bold('[ERROR]'))} ${msg}`),
  build: (msg) => console.log(`${colors.magenta(colors.bold('[BUILD]'))} ${msg}`),
  server: (msg) => console.log(`${colors.blue(colors.bold('[SERVER]'))} ${msg}`),
  hmr: (msg) => console.log(`${colors.brightCyan(colors.bold('[HMR]'))} ${msg}`),
  raw: (msg) => console.log(msg)
};

// -----------------------------------------------------------------------------
// 2. Native Environment Loader (Zero-dependency .env reader)
// -----------------------------------------------------------------------------
export function loadEnv(envPath = '.env', baseDir = process.cwd()) {
  const resolvedPath = path.isAbsolute(envPath) ? envPath : path.resolve(baseDir, envPath);
  
  if (!fs.existsSync(resolvedPath)) {
    return { loaded: false, count: 0, path: resolvedPath };
  }

  try {
    const content = fs.readFileSync(resolvedPath, 'utf8');
    const lines = content.split(/\r?\n/);
    let count = 0;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      // Skip empty lines and comment lines
      if (!line || line.startsWith('#')) continue;

      // Handle 'export KEY=VALUE' or 'KEY=VALUE'
      const sanitizedLine = line.startsWith('export ') ? line.slice(7).trim() : line;
      const eqIdx = sanitizedLine.indexOf('=');
      if (eqIdx === -1) continue;

      const key = sanitizedLine.slice(0, eqIdx).trim();
      let value = sanitizedLine.slice(eqIdx + 1).trim();

      if (!key) continue;

      // Unquote value if wrapped with single or double quotes
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      // Handle inline comment after space and #
      const commentIdx = value.indexOf(' #');
      if (commentIdx !== -1) {
        value = value.slice(0, commentIdx).trim();
      }

      // Do not overwrite existing process.env variables unless needed
      if (process.env[key] === undefined) {
        process.env[key] = value;
        count++;
      }
    }

    return { loaded: true, count, path: resolvedPath };
  } catch (err) {
    logger.warn(`Failed to parse .env file at ${resolvedPath}: ${err.message}`);
    return { loaded: false, count: 0, error: err };
  }
}

// -----------------------------------------------------------------------------
// 3. Terminal Banner & Help Menu
// -----------------------------------------------------------------------------
export function printBanner() {
  const banner = `
${colors.cyan(colors.bold('========================================================================'))}
${colors.brightCyan(colors.bold('   ______                 ____             __   '))}
${colors.brightCyan(colors.bold('  / ____/___  _________  / __ \\____ ______/ /__ '))}
${colors.cyan(colors.bold(' / /_  / __ \\/ ___/ __ \\/ /_/ / __ `/ ___/ //_/ '))}
${colors.cyan(colors.bold('/ __/ / /_/ / /  / /_/ / ____/ /_/ / /__/ ,<    '))}
${colors.blue(colors.bold('/_/    \\____/_/   \\____/_/    \\__,_/\\___/_/|_|   '))}
${colors.gray('  ⚡ 100% Zero-Dependency JS Bundler & RFC 6455 HMR Dev Server')}
${colors.gray('  🛡️ Built exclusively with Node.js Native Core Libraries')}
${colors.cyan(colors.bold('========================================================================'))}
`;
  console.log(banner);
}

export function printHelp() {
  printBanner();
  console.log(`
${colors.bold('USAGE:')}
  ${colors.green('zeropack')} [options]
  ${colors.green('node src/cli.js')} [options]

${colors.bold('OPTIONS:')}
  ${colors.yellow('--entry <path>')}     Entry JavaScript/TypeScript file ${colors.dim('(default: src/index.js)')}
  ${colors.yellow('--out <path>')}       Output bundle path ${colors.dim('(default: dist/bundle.js)')}
  ${colors.yellow('--serve')}            Start native HTTP static dev server & RFC 6455 WebSocket HMR
  ${colors.yellow('--port <number>')}    Port for the dev server ${colors.dim('(default: 3000)')}
  ${colors.yellow('--minify')}           Minify output bundle (removes comments & whitespace)
  ${colors.yellow('--env <path>')}       Custom path to .env file ${colors.dim('(default: .env)')}
  ${colors.yellow('--help, -h')}         Display this help message

${colors.bold('EXAMPLES:')}
  ${colors.dim('# Bundle with minification')}
  ${colors.cyan('zeropack --entry src/index.js --out dist/bundle.js --minify')}

  ${colors.dim('# Start dev server with Live Reload / WebSocket HMR on port 8080')}
  ${colors.cyan('zeropack --entry src/index.js --serve --port 8080')}

  ${colors.dim('# Standalone single-file compiler & verification')}
  ${colors.cyan('npm run build-standalone')}
`);
}

// -----------------------------------------------------------------------------
// 4. Arguments Parser using `node:util.parseArgs`
// -----------------------------------------------------------------------------
export function parseCliArgs(args = process.argv.slice(2)) {
  const options = {
    entry: {
      type: 'string',
      default: 'src/index.js'
    },
    out: {
      type: 'string',
      default: 'dist/bundle.js'
    },
    serve: {
      type: 'boolean',
      default: false
    },
    port: {
      type: 'string',
      default: '3000'
    },
    minify: {
      type: 'boolean',
      default: false
    },
    env: {
      type: 'string',
      default: '.env'
    },
    help: {
      type: 'boolean',
      short: 'h',
      default: false
    }
  };

  try {
    const { values, positionals } = parseArgs({
      args,
      options,
      allowPositionals: true,
      strict: false
    });

    // Support positional entry argument if provided (e.g. `zeropack src/main.js`)
    let entry = values.entry;
    if (positionals.length > 0 && values.entry === 'src/index.js') {
      entry = positionals[0];
    }

    return {
      entry,
      out: values.out,
      serve: Boolean(values.serve),
      port: parseInt(values.port, 10) || 3000,
      minify: Boolean(values.minify),
      env: values.env,
      help: Boolean(values.help),
      positionals
    };
  } catch (err) {
    logger.error(`Argument parsing error: ${err.message}`);
    printHelp();
    process.exit(1);
  }
}

// -----------------------------------------------------------------------------
// 5. CLI Execution Lifecycle
// -----------------------------------------------------------------------------
export async function runCli(args = process.argv.slice(2)) {
  const config = parseCliArgs(args);

  if (config.help) {
    printHelp();
    return;
  }

  printBanner();

  // Load .env automatically
  const envResult = loadEnv(config.env);
  if (envResult.loaded) {
    logger.info(`Loaded ${colors.bold(envResult.count)} environment variables from ${colors.dim(envResult.path)}`);
  }

  // Dynamic import of bundler/server so CLI file can be run independently or concatenated
  
  

  const startTime = performance.now();
  logger.build(`Target Entry: ${colors.cyan(config.entry)}`);
  logger.build(`Output Path:  ${colors.cyan(config.out)}`);
  logger.build(`Minification: ${config.minify ? colors.green('ENABLED') : colors.gray('DISABLED')}`);

  try {
    const graph = buildDependencyGraph(config.entry);
    const result = bundleToFile(graph, config.out, {
      minify: config.minify,
      entryPath: config.entry
    });

    const elapsed = (performance.now() - startTime).toFixed(2);
    logger.success(`Bundle generated in ${colors.bold(elapsed + 'ms')} (${colors.cyan(result.size + ' bytes')})`);
    logger.info(`SHA-256 Hash: ${colors.gray(result.hash)}`);

    if (config.serve) {
      
      await startDevServer({
        port: config.port,
        entry: config.entry,
        out: config.out,
        minify: config.minify,
        rootDir: process.cwd()
      });
    }
  } catch (error) {
    logger.error(`Build failed: ${error.message}`);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    if (!config.serve) {
      process.exit(1);
    }
  }
}

// ==========================================
// Module: parser.js
// ==========================================
/**
 * Resolves a module specifier relative to the importing file.
 * Checks for extensions (.js, .mjs, .cjs, .ts, .json) and directory indexes.
 */
export function resolveModulePath(fromFile, specifier, rootDir = process.cwd()) {
  let candidate = '';

  if (specifier.startsWith('.') || specifier.startsWith('/')) {
    candidate = path.resolve(path.dirname(fromFile), specifier);
  } else {
    // Treat bare specifier as relative to root or node_modules-like structure
    candidate = path.resolve(rootDir, specifier);
  }

  // 1. Exact file match
  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
    return candidate;
  }

  // 2. Try file extensions
  const extensions = ['.js', '.mjs', '.cjs', '.ts', '.jsx', '.tsx', '.json'];
  for (const ext of extensions) {
    const withExt = candidate + ext;
    if (fs.existsSync(withExt) && fs.statSync(withExt).isFile()) {
      return withExt;
    }
  }

  // 3. Try directory index file
  if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
    for (const ext of extensions) {
      const indexFile = path.join(candidate, `index${ext}`);
      if (fs.existsSync(indexFile) && fs.statSync(indexFile).isFile()) {
        return indexFile;
      }
    }
  }

  throw new Error(`Cannot resolve module '${specifier}' requested by '${fromFile}'`);
}

/**
 * Extracts import/require specifiers and transforms ESM syntax into runtime CJS format.
 */
export function transformModuleCode(rawCode, filePath) {
  const dependencies = new Set();
  let code = rawCode;

  // If JSON file, wrap as module export
  if (filePath.endsWith('.json')) {
    return {
      code: `module.exports = ${rawCode.trim() || '{}'};`,
      dependencies: []
    };
  }

  // 1. Scan and collect require('...') calls
  const requireRegex = /(?:^|[^.\w])require\s*\(\s*(['"`])([^'"`]+)\1\s*\)/g;
  let reqMatch;
  while ((reqMatch = requireRegex.exec(code)) !== null) {
    dependencies.add(reqMatch[2]);
  }

  // 2. Transform `import * as name from 'specifier'`
  code = code.replace(
    /(?:^|\n)\s*import\s+\*\s+as\s+([a-zA-Z_$][0-9a-zA-Z_$]*)\s+from\s+(['"])(.*?)\2;?/g,
    (_, varName, quote, specifier) => {
      dependencies.add(specifier);
      return `\nconst ${varName} = require('${specifier}');`;
    }
  );

  // 3. Transform `import DefaultName, { a, b as c } from 'specifier'` or `import DefaultName from 'specifier'`
  // or `import { a, b as c } from 'specifier'`
  code = code.replace(
    /(?:^|\n)\s*import\s+([\s\S]*?)\s+from\s+(['"])(.*?)\2;?/g,
    (_, importClause, quote, specifier) => {
      dependencies.add(specifier);
      const clause = importClause.trim();
      const specifierHash = crypto.createHash('sha256').update(specifier).digest('hex').slice(0, 8);
      const tempVar = `__mod_${specifierHash}`;

      let lines = [`const ${tempVar} = require('${specifier}');`];

      if (clause.startsWith('{')) {
        // Named imports: `import { a, b as c } from '...'`
        const inside = clause.slice(1, -1).trim();
        const renamed = inside.split(',').map((part) => {
          const p = part.trim();
          if (!p) return '';
          if (p.includes(' as ')) {
            const [orig, alias] = p.split(' as ').map((s) => s.trim());
            return `${orig}: ${alias}`;
          }
          return p;
        }).filter(Boolean).join(', ');
        lines.push(`const { ${renamed} } = ${tempVar};`);
      } else if (clause.includes('{')) {
        // Default and named: `import DefaultName, { a, b as c } from '...'`
        const [defaultPart, namedPart] = clause.split(/,(.+)/);
        const defName = defaultPart.trim();
        const inside = namedPart.trim().slice(1, -1).trim();
        lines.push(`const ${defName} = ${tempVar}.default !== undefined ? ${tempVar}.default : ${tempVar};`);
        const renamed = inside.split(',').map((part) => {
          const p = part.trim();
          if (!p) return '';
          if (p.includes(' as ')) {
            const [orig, alias] = p.split(' as ').map((s) => s.trim());
            return `${orig}: ${alias}`;
          }
          return p;
        }).filter(Boolean).join(', ');
        lines.push(`const { ${renamed} } = ${tempVar};`);
      } else {
        // Pure default import: `import DefaultName from '...'`
        lines.push(`const ${clause} = ${tempVar}.default !== undefined ? ${tempVar}.default : ${tempVar};`);
      }

      return '\n' + lines.join('\n');
    }
  );

  // 4. Transform bare side-effect `import 'specifier'`
  code = code.replace(
    /(?:^|\n)\s*import\s+(['"])(.*?)\1;?/g,
    (_, quote, specifier) => {
      dependencies.add(specifier);
      return `\nrequire('${specifier}');`;
    }
  );

  // 5. Transform `export default function foo() {}` or `export default class Bar {}`
  code = code.replace(
    /(?:^|\n)\s*export\s+default\s+function\s+([a-zA-Z_$][0-9a-zA-Z_$]*)\s*\(([\s\S]*?)\)\s*\{/g,
    (_, funcName, params) => {
      return `\nfunction ${funcName}(${params}) {\nmodule.exports.default = ${funcName};\n`;
    }
  );

  code = code.replace(
    /(?:^|\n)\s*export\s+default\s+class\s+([a-zA-Z_$][0-9a-zA-Z_$]*)([\s\S]*?)\{/g,
    (_, className, rest) => {
      return `\nclass ${className}${rest}{\n`;
    }
  );

  // 6. Transform generic `export default ...` (handles multiline objects, expressions, anonymous functions)
  code = code.replace(
    /(?:^|\n)\s*export\s+default\s+([\s\S]+?)(?:;|\n\s*(?:export|import|\/\*|\/\/|$))/g,
    (match, expr) => {
      const trimmedExpr = expr.trim();
      if (!trimmedExpr) return match;
      if (trimmedExpr.startsWith('function') && !trimmedExpr.startsWith('function(')) {
        return match; // already handled
      }
      return `\nconst __defaultExport = (${trimmedExpr});\nmodule.exports.default = __defaultExport;\nif (typeof __defaultExport === 'object' && __defaultExport !== null) { Object.assign(module.exports, __defaultExport); }\n`;
    }
  );

  // 7. Transform `export const/let/var name = ...`
  code = code.replace(
    /(?:^|\n)\s*export\s+(const|let|var)\s+([a-zA-Z_$][0-9a-zA-Z_$]*)\s*=/g,
    (_, decl, varName) => {
      return `\n${decl} ${varName} = module.exports.${varName} =`;
    }
  );

  // 8. Transform `export function name(...) {}`
  code = code.replace(
    /(?:^|\n)\s*export\s+function\s+([a-zA-Z_$][0-9a-zA-Z_$]*)\s*\(([\s\S]*?)\)\s*\{/g,
    (_, funcName, params) => {
      return `\nfunction ${funcName}(${params}) {\nmodule.exports.${funcName} = ${funcName};\n`;
    }
  );

  // 9. Transform `export class name {}`
  code = code.replace(
    /(?:^|\n)\s*export\s+class\s+([a-zA-Z_$][0-9a-zA-Z_$]*)([\s\S]*?)\{/g,
    (_, className, rest) => {
      return `\nclass ${className}${rest}{\n`;
    }
  );

  // 10. Transform `export { a, b as c }`
  code = code.replace(
    /(?:^|\n)\s*export\s+\{([\s\S]*?)\};?/g,
    (_, inside) => {
      const exportsList = inside.split(',').map((part) => {
        const p = part.trim();
        if (!p) return '';
        if (p.includes(' as ')) {
          const [orig, alias] = p.split(' as ').map((s) => s.trim());
          return `module.exports.${alias} = ${orig};`;
        }
        return `module.exports.${p} = ${p};`;
      }).filter(Boolean).join('\n');
      return '\n' + exportsList;
    }
  );

  return {
    code,
    dependencies: Array.from(dependencies)
  };
}

/**
 * Builds the complete dependency graph starting from entry file.
 * Returns an array of module node objects.
 */
export function buildDependencyGraph(entryPath, rootDir = process.cwd()) {
  const absoluteEntry = path.isAbsolute(entryPath) ? entryPath : path.resolve(rootDir, entryPath);

  if (!fs.existsSync(absoluteEntry)) {
    throw new Error(`Entry file not found: ${absoluteEntry}`);
  }

  let nextId = 0;
  const fileToIdMap = new Map();
  const graph = [];
  const visitedFiles = new Set();
  const recursionStack = new Set();

  function createModule(absoluteFilePath) {
    const rawContent = fs.readFileSync(absoluteFilePath, 'utf8');
    const hash = crypto.createHash('sha256').update(rawContent).digest('hex');
    const { code, dependencies } = transformModuleCode(rawContent, absoluteFilePath);

    const id = nextId++;
    fileToIdMap.set(absoluteFilePath, id);

    const moduleNode = {
      id,
      filePath: absoluteFilePath,
      relativePath: path.relative(rootDir, absoluteFilePath).replace(/\\/g, '/'),
      code,
      dependencies,
      mapping: {},
      hash
    };

    return moduleNode;
  }

  function traverse(absoluteFilePath, parentFile = null) {
    if (recursionStack.has(absoluteFilePath)) {
      logger.warn(`Circular dependency detected: ${colors.yellow(path.relative(rootDir, absoluteFilePath))} (imported by ${colors.gray(parentFile ? path.relative(rootDir, parentFile) : 'root')})`);
      return fileToIdMap.get(absoluteFilePath);
    }

    if (visitedFiles.has(absoluteFilePath)) {
      return fileToIdMap.get(absoluteFilePath);
    }

    visitedFiles.add(absoluteFilePath);
    recursionStack.add(absoluteFilePath);

    const moduleNode = createModule(absoluteFilePath);
    graph.push(moduleNode);

    for (const depSpecifier of moduleNode.dependencies) {
      try {
        const resolvedDepPath = resolveModulePath(absoluteFilePath, depSpecifier, rootDir);
        const childId = traverse(resolvedDepPath, absoluteFilePath);
        moduleNode.mapping[depSpecifier] = childId;
      } catch (err) {
        logger.error(`Module resolution failed for '${depSpecifier}' in '${path.relative(rootDir, absoluteFilePath)}': ${err.message}`);
        throw err;
      }
    }

    recursionStack.delete(absoluteFilePath);
    return moduleNode.id;
  }

  traverse(absoluteEntry);

  return graph;
}

// ==========================================
// Module: bundler.js
// ==========================================
/**
 * Pure zero-dependency minifier using string scanner and state machine.
 * Correctly preserves strings ('...', "...", `...`), template literals, and regexes
 * while stripping single-line comments, multi-line comments, and extraneous whitespace.
 */
export function minifyCode(code) {
  const decoder = new StringDecoder('utf8');
  const buffer = Buffer.from(code);
  const text = decoder.write(buffer) + decoder.end();

  let output = '';
  let i = 0;
  const len = text.length;

  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inTemplateLiteral = false;
  let inRegex = false;
  let isEscaped = false;

  while (i < len) {
    const char = text[i];
    const nextChar = i + 1 < len ? text[i + 1] : '';

    // Handle escapes inside strings/regexes
    if (isEscaped) {
      output += char;
      isEscaped = false;
      i++;
      continue;
    }

    if (char === '\\' && (inSingleQuote || inDoubleQuote || inTemplateLiteral || inRegex)) {
      output += char;
      isEscaped = true;
      i++;
      continue;
    }

    // Single-quote string literal
    if (char === "'" && !inDoubleQuote && !inTemplateLiteral && !inRegex) {
      inSingleQuote = !inSingleQuote;
      output += char;
      i++;
      continue;
    }

    // Double-quote string literal
    if (char === '"' && !inSingleQuote && !inTemplateLiteral && !inRegex) {
      inDoubleQuote = !inDoubleQuote;
      output += char;
      i++;
      continue;
    }

    // Template literal (backtick)
    if (char === '`' && !inSingleQuote && !inDoubleQuote && !inRegex) {
      inTemplateLiteral = !inTemplateLiteral;
      output += char;
      i++;
      continue;
    }

    // If inside any string literal, keep characters exactly as-is
    if (inSingleQuote || inDoubleQuote || inTemplateLiteral) {
      output += char;
      i++;
      continue;
    }

    // Check for single-line comments //
    if (char === '/' && nextChar === '/' && !inRegex) {
      i += 2;
      while (i < len && text[i] !== '\n' && text[i] !== '\r') {
        i++;
      }
      continue;
    }

    // Check for multi-line comments /* ... */
    if (char === '/' && nextChar === '*' && !inRegex) {
      i += 2;
      while (i < len && !(text[i] === '*' && text[i + 1] === '/')) {
        i++;
      }
      i += 2; // skip */
      continue;
    }

    // Check for Regex literal start (heuristic: preceded by punctuation or keyword)
    if (char === '/' && !inRegex) {
      const prevNonSpace = output.trim().slice(-1);
      const isRegexStart = /[(,=:[!&|?{};]/.test(prevNonSpace) || output.trim().endsWith('return');
      if (isRegexStart) {
        inRegex = true;
        output += char;
        i++;
        continue;
      }
    } else if (char === '/' && inRegex) {
      inRegex = false;
      output += char;
      i++;
      continue;
    }

    if (inRegex) {
      output += char;
      i++;
      continue;
    }

    // Handle whitespace outside strings
    if (/\s/.test(char)) {
      // Collapse multiple whitespace/newlines into a single space or omit if adjacent to operators
      const lastChar = output.slice(-1);
      if (lastChar && !/[()\[\]{},;:+\-*\/=<>!&|%?]/.test(lastChar)) {
        if (!output.endsWith(' ')) {
          output += ' ';
        }
      }
      i++;
      continue;
    }

    // If adding an operator, strip trailing space if safe
    if (/[()\[\]{},;:+\-*\/=<>!&|%?]/.test(char)) {
      if (output.endsWith(' ')) {
        const charBeforeSpace = output.slice(-2, -1);
        // Avoid merging ++ or -- or keyword ambiguities
        if (!(/[+\-]/.test(char) && /[+\-]/.test(charBeforeSpace))) {
          output = output.slice(0, -1);
        }
      }
    }

    output += char;
    i++;
  }

  // Final cleanup of extra empty lines or spaces
  return output.trim();
}

/**
 * Bundles the dependency graph into a deterministic, single-file IIFE bundle.
 */
export function generateBundle(graph, options = {}) {
  const { minify = false, hmr = false } = options;

  // 1. Sort modules deterministically by relative path for byte-identical reproducible builds
  const sortedGraph = [...graph].sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  // 2. Build modules mapping string
  let modulesString = '{\n';
  for (const mod of sortedGraph) {
    const mappingJson = JSON.stringify(mod.mapping);
    modulesString += `  ${mod.id}: [\n`;
    modulesString += `    function(require, module, exports) {\n`;
    modulesString += `// [ZeroPack Module: ${mod.relativePath}]\n`;
    modulesString += mod.code + '\n';
    modulesString += `    },\n`;
    modulesString += `    ${mappingJson}\n`;
    modulesString += `  ],\n`;
  }
  modulesString += '}';

  // 3. Runtime bundle template (Zero-dependency custom require runtime)
  let bundleSource = `/**
 * Bundled by ZeroPack (Zero-Dependency Bundler)
 */
(function(modules) {
  // Module cache
  var installedModules = {};

  function __zeropack_require__(moduleId) {
    // Check if module is in cache
    if (installedModules[moduleId]) {
      return installedModules[moduleId].exports;
    }

    // Create a new module and put it into the cache
    var module = installedModules[moduleId] = {
      id: moduleId,
      loaded: false,
      exports: {}
    };

    var fn = modules[moduleId][0];
    var mapping = modules[moduleId][1];

    function localRequire(name) {
      if (mapping[name] === undefined) {
        throw new Error('ZeroPack: Cannot find module \\'' + name + '\\' from module ID ' + moduleId);
      }
      return __zeropack_require__(mapping[name]);
    }

    // Execute the module function
    try {
      fn(localRequire, module, module.exports);
    } catch (e) {
      console.error('[ZeroPack Runtime Error in Module ' + moduleId + ']:', e);
      throw e;
    }

    module.loaded = true;
    return module.exports;
  }

  // Expose require to window/global in dev mode if needed
  if (typeof window !== 'undefined') {
    window.__zeropack_modules__ = modules;
    window.__zeropack_require__ = __zeropack_require__;
  }

  // Load entry module (id: 0)
  return __zeropack_require__(0);
})(${modulesString});
`;

  // 4. Inject HMR Client Runtime if requested
  if (hmr) {
    const hmrClient = `
// --- ZeroPack Native HMR Client Runtime ---
(function() {
  if (typeof window === 'undefined') return;
  var protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  var host = window.location.host;
  var wsUrl = protocol + '//' + host + '/__zeropack_hmr';

  function connect() {
    var ws = new WebSocket(wsUrl);
    ws.onopen = function() {
      console.log('%c[ZeroPack HMR]%c Connected to native WebSocket server', 'color: #00bcd4; font-weight: bold;', '');
    };
    ws.onmessage = function(event) {
      try {
        var data = JSON.parse(event.data);
        if (data.type === 'reload') {
          console.log('%c[ZeroPack HMR]%c File changed. Live reloading...', 'color: #4caf50; font-weight: bold;', '');
          window.location.reload();
        }
      } catch(e) {
        console.error('[ZeroPack HMR Error]', e);
      }
    };
    ws.onclose = function() {
      console.log('%c[ZeroPack HMR]%c Disconnected. Reconnecting in 1s...', 'color: #ff9800;', '');
      setTimeout(connect, 1000);
    };
  }
  connect();
})();
`;
    bundleSource += hmrClient;
  }

  // 5. Minify if requested
  if (minify) {
    bundleSource = minifyCode(bundleSource);
  }

  const hash = crypto.createHash('sha256').update(bundleSource).digest('hex');

  return {
    code: bundleSource,
    size: Buffer.byteLength(bundleSource, 'utf8'),
    hash,
    modulesCount: graph.length
  };
}

/**
 * Bundles the graph and writes it directly to disk.
 */
export function bundleToFile(graph, outPath, options = {}) {
  const resolvedOut = path.isAbsolute(outPath) ? outPath : path.resolve(process.cwd(), outPath);
  const outDir = path.dirname(resolvedOut);

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const result = generateBundle(graph, options);
  fs.writeFileSync(resolvedOut, result.code, 'utf8');

  return {
    ...result,
    outputPath: resolvedOut
  };
}

// ==========================================
// Module: server.js
// ==========================================
// -----------------------------------------------------------------------------
// 1. Native MIME Type Lookup Table
// -----------------------------------------------------------------------------
export const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.cjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.wasm': 'application/wasm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8'
};

export function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

// -----------------------------------------------------------------------------
// 2. RFC 6455 WebSocket Frame Encoder & Parser
// -----------------------------------------------------------------------------
const WS_MAGIC_STRING = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

/**
 * Encodes a text payload into an RFC 6455 WebSocket frame (Server-to-Client unmasked)
 */
export function encodeWebSocketFrame(payload, opcode = 0x1) {
  const payloadBuffer = Buffer.isBuffer(payload) ? payload : Buffer.from(typeof payload === 'string' ? payload : JSON.stringify(payload), 'utf8');
  const payloadLength = payloadBuffer.length;

  let headerBuffer;

  if (payloadLength <= 125) {
    headerBuffer = Buffer.alloc(2);
    headerBuffer[0] = 0x80 | (opcode & 0x0f); // FIN bit = 1, Opcode
    headerBuffer[1] = payloadLength;           // Mask bit = 0
  } else if (payloadLength <= 65535) {
    headerBuffer = Buffer.alloc(4);
    headerBuffer[0] = 0x80 | (opcode & 0x0f);
    headerBuffer[1] = 126;
    headerBuffer.writeUInt16BE(payloadLength, 2);
  } else {
    headerBuffer = Buffer.alloc(10);
    headerBuffer[0] = 0x80 | (opcode & 0x0f);
    headerBuffer[1] = 127;
    headerBuffer.writeBigUInt64BE(BigInt(payloadLength), 2);
  }

  return Buffer.concat([headerBuffer, payloadBuffer]);
}

/**
 * Decodes client-to-server RFC 6455 masked WebSocket frames
 */
export function decodeWebSocketFrame(buffer) {
  if (buffer.length < 2) return null;

  const firstByte = buffer[0];
  const secondByte = buffer[1];

  const fin = (firstByte & 0x80) === 0x80;
  const opcode = firstByte & 0x0f;
  const isMasked = (secondByte & 0x80) === 0x80;
  let payloadLength = secondByte & 0x7f;
  let currentOffset = 2;

  if (payloadLength === 126) {
    if (buffer.length < 4) return null;
    payloadLength = buffer.readUInt16BE(currentOffset);
    currentOffset += 2;
  } else if (payloadLength === 127) {
    if (buffer.length < 10) return null;
    payloadLength = Number(buffer.readBigUInt64BE(currentOffset));
    currentOffset += 8;
  }

  let maskingKey = null;
  if (isMasked) {
    if (buffer.length < currentOffset + 4) return null;
    maskingKey = buffer.subarray(currentOffset, currentOffset + 4);
    currentOffset += 4;
  }

  if (buffer.length < currentOffset + payloadLength) return null;
  const rawPayload = buffer.subarray(currentOffset, currentOffset + payloadLength);
  const unmaskedPayload = Buffer.alloc(payloadLength);

  if (isMasked && maskingKey) {
    for (let i = 0; i < payloadLength; i++) {
      unmaskedPayload[i] = rawPayload[i] ^ maskingKey[i % 4];
    }
  } else {
    rawPayload.copy(unmaskedPayload);
  }

  return {
    fin,
    opcode,
    payload: unmaskedPayload,
    text: unmaskedPayload.toString('utf8'),
    totalFrameLength: currentOffset + payloadLength
  };
}

// -----------------------------------------------------------------------------
// 3. Dev Server & HMR Engine
// -----------------------------------------------------------------------------
export async function startDevServer(options = {}) {
  const {
    port = 3000,
    entry = 'src/index.js',
    out = 'dist/bundle.js',
    minify = false,
    rootDir = process.cwd()
  } = options;

  const activeSockets = new Set();

  // Helper to broadcast WebSocket message to all connected clients
  function broadcast(data) {
    const frame = encodeWebSocketFrame(data);
    for (const socket of activeSockets) {
      try {
        if (!socket.destroyed) {
          socket.write(frame);
        }
      } catch (err) {
        activeSockets.delete(socket);
      }
    }
  }

  // Initial compilation
  function compile() {
    try {
      const graph = buildDependencyGraph(entry, rootDir);
      const result = bundleToFile(graph, out, { minify, hmr: true });
      logger.hmr(`Rebuilt bundle: ${colors.green(result.size + ' bytes')} (${colors.gray(result.hash.slice(0, 10))})`);
      return true;
    } catch (err) {
      logger.error(`Rebuild error: ${err.message}`);
      return false;
    }
  }

  compile();

  // HTTP Server
  const server = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url, `http://localhost:${port}`);
    let pathname = decodeURIComponent(parsedUrl.pathname);

    // Route root to index.html
    if (pathname === '/' || pathname === '') {
      pathname = '/index.html';
    }

    let filePath = path.join(rootDir, pathname);

    // If file doesn't exist, check inside public/ or dist/
    if (!fs.existsSync(filePath)) {
      const publicPath = path.join(rootDir, 'public', pathname);
      const distPath = path.join(rootDir, 'dist', pathname);
      if (fs.existsSync(publicPath)) {
        filePath = publicPath;
      } else if (fs.existsSync(distPath)) {
        filePath = distPath;
      }
    }

    // Serve file if exists
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const mimeType = getMimeType(filePath);
      let content = fs.readFileSync(filePath);

      // Auto-inject WebSocket client script into HTML files if not already present
      if (mimeType.startsWith('text/html')) {
        let html = content.toString('utf8');
        if (!html.includes('__zeropack_hmr')) {
          const hmrScript = `
<script>
(function() {
  var protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  var ws = new WebSocket(protocol + '//' + window.location.host + '/__zeropack_hmr');
  ws.onopen = function() { console.log('[ZeroPack DevServer] Connected to live reload'); };
  ws.onmessage = function(e) {
    var data = JSON.parse(e.data);
    if (data.type === 'reload') {
      console.log('[ZeroPack DevServer] Reloading page...');
      window.location.reload();
    }
  };
})();
</script>`;
          if (html.includes('</body>')) {
            html = html.replace('</body>', `${hmrScript}</body>`);
          } else {
            html += hmrScript;
          }
          content = Buffer.from(html, 'utf8');
        }
      }

      res.writeHead(200, {
        'Content-Type': mimeType,
        'Content-Length': content.length,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
      res.end(content);
      return;
    }

    // If request is for an HTML page or root fallback
    const indexHtmlPath = path.join(rootDir, 'index.html');
    const publicIndexHtml = path.join(rootDir, 'public', 'index.html');
    const defaultHtml = fs.existsSync(indexHtmlPath) ? indexHtmlPath : (fs.existsSync(publicIndexHtml) ? publicIndexHtml : null);

    if (defaultHtml && (req.headers.accept || '').includes('text/html')) {
      const html = fs.readFileSync(defaultHtml, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end(`404 Not Found: ${pathname}`);
  });

  // RFC 6455 WebSocket Upgrade Handler
  server.on('upgrade', (req, socket, head) => {
    const secKey = req.headers['sec-websocket-key'];
    if (!secKey) {
      socket.destroy();
      return;
    }

    // RFC 6455 Handshake Acceptance Hash
    const acceptHash = crypto
      .createHash('sha1')
      .update(secKey + WS_MAGIC_STRING)
      .digest('base64');

    const headers = [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${acceptHash}`,
      '\r\n'
    ];

    socket.write(headers.join('\r\n'));
    activeSockets.add(socket);

    logger.hmr(`Client connected to HMR WebSocket. Active clients: ${colors.bold(activeSockets.size)}`);

    socket.on('data', (buffer) => {
      const frame = decodeWebSocketFrame(buffer);
      if (frame) {
        // Ping frame (0x9) -> respond with Pong (0xA)
        if (frame.opcode === 0x9) {
          socket.write(encodeWebSocketFrame(frame.payload, 0xa));
        }
        // Close frame (0x8)
        else if (frame.opcode === 0x8) {
          activeSockets.delete(socket);
          socket.end(encodeWebSocketFrame(Buffer.alloc(0), 0x8));
        }
      }
    });

    socket.on('close', () => {
      activeSockets.delete(socket);
    });

    socket.on('error', () => {
      activeSockets.delete(socket);
    });
  });

  // Native Watcher with 100ms Debounce using `node:fs.watch`
  let debounceTimer = null;
  const watchDir = path.resolve(rootDir, 'src');
  const publicDir = path.resolve(rootDir, 'public');

  function handleWatchEvent(eventType, filename) {
    if (!filename) return;
    if (filename.endsWith('bundle.js') || filename.includes('node_modules') || filename.startsWith('.')) return;

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      logger.hmr(`File change detected: ${colors.cyan(filename)}. Rebundling...`);
      const success = compile();
      if (success) {
        broadcast({ type: 'reload', file: filename, timestamp: Date.now() });
        logger.hmr(`Dispatched ${colors.green('RELOAD')} frame to ${colors.bold(activeSockets.size)} client(s)`);
      }
    }, 100);
  }

  const watchers = [];
  if (fs.existsSync(watchDir)) {
    watchers.push(fs.watch(watchDir, { recursive: true }, handleWatchEvent));
  }
  if (fs.existsSync(publicDir)) {
    watchers.push(fs.watch(publicDir, { recursive: true }, handleWatchEvent));
  }

  function closeServer() {
    for (const w of watchers) {
      try { w.close(); } catch(e) {}
    }
    for (const s of activeSockets) {
      try { s.destroy(); } catch(e) {}
    }
    return new Promise((resolve) => server.close(resolve));
  }

  return new Promise((resolve, reject) => {
    server.listen(port, () => {
      logger.server(`Development server running at: ${colors.green(colors.bold(`http://localhost:${port}/`))}`);
      logger.server(`HMR WebSocket endpoint active at: ${colors.cyan(colors.bold(`ws://localhost:${port}/__zeropack_hmr`))}`);
      logger.info(`Watching directory: ${colors.gray(watchDir)}`);
      resolve({ server, broadcast, close: closeServer });
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        logger.error(`Port ${port} is already in use. Please specify another port with --port`);
      } else {
        logger.error(`Dev server error: ${err.message}`);
      }
      reject(err);
    });
  });
}
// -----------------------------------------------------------------------------
// Auto-Run CLI when invoked directly
// -----------------------------------------------------------------------------
runCli().catch((err) => {
  logger.error('Fatal CLI Error: ' + err.message);
  process.exit(1);
});
