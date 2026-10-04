/**
 * @module parser-errors
 * @description BuildError class and line/column utilities for ZeroPack.
 */
import path from 'node:path';

/**
 * Structured build-time diagnostic error.
 * Categories: `'Build'` | `'Resolution'` | `'Syntax'` | `'FileSystem'`
 */
export class BuildError extends Error {
  constructor({ message, file, line, column, suggestion, category }) {
    super(message);
    this.name = 'BuildError';
    this.file = file;
    this.line = line;
    this.column = column;
    this.suggestion = suggestion;
    this.category = category || 'Build';
  }
}

/**
 * Maps a character offset into source code to a 1-indexed line/column pair.
 * @param {string} code   Full source text.
 * @param {number} index  Character offset.
 * @returns {{ line: number, column: number }}
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

/**
 * Throws a BuildError when filePath has an unsupported extension (.ts, .tsx, .jsx).
 * @param {string} filePath
 */
export function checkUnsupportedExtension(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.ts' || ext === '.tsx' || ext === '.jsx') {
    throw new BuildError({
      message: `Unsupported syntax`,
      file: filePath,
      suggestion: `ZeroPack currently resolves ${ext} files but does not transform TypeScript or JSX.`,
      category: 'Syntax'
    });
  }
}
