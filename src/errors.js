import { colors } from './cli.js';

/**
 * Structured BuildError for compiler, module resolution, and syntax failures.
 * Captures file, line, column, offending source line, and actionable suggestions.
 */
/**
 * Structured BuildError for compiler, module resolution, and syntax failures.
 * Captures file, line, column, offending source line, actionable suggestions, and category.
 */
export class BuildError extends Error {
  constructor(messageOrOptions, maybeOptions = {}) {
    const isObj = typeof messageOrOptions === 'object' && messageOrOptions !== null;
    const msg = isObj ? messageOrOptions.message : messageOrOptions;
    const opts = isObj ? messageOrOptions : maybeOptions;

    super(msg || 'BuildError');
    this.name = 'BuildError';
    this.file = opts.file || null;
    this.line = opts.line || null;
    this.column = opts.column || null;
    this.sourceLine = opts.sourceLine || null;
    this.suggestion = opts.suggestion || null;
    this.category = opts.category || 'Build';
  }

  format() {
    let out = `${colors.red(colors.bold('BuildError:'))} ${this.message}`;
    if (this.file) {
      const loc = this.line ? `:${this.line}${this.column ? `:${this.column}` : ''}` : '';
      out += `\n  ${colors.dim('at')} ${colors.cyan(this.file + loc)}`;
    }
    if (this.sourceLine) {
      out += `\n\n  ${colors.gray(this.line ? `${this.line} |` : '>')} ${this.sourceLine}`;
      if (this.column) {
        out += `\n    ${' '.repeat(String(this.line || '').length + 2)}${colors.red('^')}`;
      }
    }
    if (this.suggestion) {
      out += `\n\n  ${colors.yellow(colors.bold('Suggestion:'))} ${this.suggestion}`;
    }
    return out;
  }
}

/**
 * Maps a character offset into source code to a 1-indexed line/column pair.
 */
export function getLineColumn(code, index) {
  if (index < 0) index = 0;
  if (index > code.length) index = code.length;
  const before = code.substring(0, index);
  const lines = before.split('\n');
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1
  };
}
