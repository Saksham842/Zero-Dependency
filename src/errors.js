import { colors } from './cli.js';

/**
 * Structured BuildError for compiler, module resolution, and syntax failures.
 * Captures file, line, column, offending source line, and actionable suggestions.
 */
export class BuildError extends Error {
  constructor(message, { file = null, line = null, column = null, sourceLine = null, suggestion = null } = {}) {
    super(message);
    this.name = 'BuildError';
    this.file = file;
    this.line = line;
    this.column = column;
    this.sourceLine = sourceLine;
    this.suggestion = suggestion;
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
