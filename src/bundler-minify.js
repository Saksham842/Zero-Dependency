/**
 * @module bundler-minify
 * @description Streaming state-machine JS minifier.
 */
import { StringDecoder } from 'node:string_decoder';

/**
 * Streaming state-machine JS minifier.
 *
 * Algorithm:
 *  - Iterates the source byte-by-byte via \`node:string_decoder\` (handles
 *    multi-byte UTF-8 sequences correctly).
 *  - Tracks \`'\`, \`"\`, \`\` \` \`\`, and \`/regex/\` boundaries so that comment-like
 *    sequences inside strings are never stripped.
 *  - Strips \`//\` single-line and \`/* ... *\\/\` multi-line comments.
 *  - Collapses consecutive whitespace to a single space, omitting the space
 *    entirely when the previous character was an operator.
 *  - Inserts synthetic \`;\` before a newline after \`return\`, \`throw\`, \`break\`,
 *    or \`continue\` to preserve ASI semantics.
 *
 * Replaces: \`terser\` / \`uglify-js\` / \`esbuild --minify\`
 * Standard library: \`node:string_decoder\` (UTF-8 decoding).
 *
 * @param {string} code  Raw JavaScript source.
 * @returns {string}     Minified JavaScript source.
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

    if (char === '\\\\' && (inSingleQuote || inDoubleQuote || inTemplateLiteral || inRegex)) {
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
    if (char === '\`' && !inSingleQuote && !inDoubleQuote && !inRegex) {
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
      let wsRun = '';
      while (i < len && /\s/.test(text[i])) {
        wsRun += text[i];
        i++;
      }
      
      const hasNewline = wsRun.includes('\n') || wsRun.includes('\r');
      const match = output.match(/(?:^|[^a-zA-Z0-9_$])([a-zA-Z0-9_$]+)$/);
      const lastWord = match ? match[1] : '';
      
      if (hasNewline && (lastWord === 'return' || lastWord === 'throw' || lastWord === 'break' || lastWord === 'continue')) {
        output += ';';
      } else {
        // Collapse multiple whitespace/newlines into a single space or omit if adjacent to operators
        const lastChar = output.slice(-1);
        if (lastChar && !/[()\[\]{},;:+\-*\/=<>!&|%?]/.test(lastChar)) {
          if (!output.endsWith(' ')) {
            output += ' ';
          }
        }
      }
      continue;
    }

    // If adding an operator, strip trailing space if safe
    if (/[()\[\]{},;:+\-*\/=<>!&|%?]/.test(char)) {
      if (output.endsWith(' ')) {
        const charBeforeSpace = output.slice(-2, -1);
        // Avoid merging ++ or -- or keyword ambiguities
        if (!(/[+\\-]/.test(char) && /[+\\-]/.test(charBeforeSpace))) {
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
