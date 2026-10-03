const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Encodes a signed integer to Base64 VLQ (Variable-Length Quantity).
 * Follows the Source Map Revision 3 specification.
 *
 * @param {number} value
 * @returns {string}
 */
export function encodeVlq(value) {
  let vlq = value < 0 ? ((-value) << 1) | 1 : value << 1;
  let encoded = '';
  do {
    let digit = vlq & 31;
    vlq >>>= 5;
    if (vlq > 0) {
      digit |= 32; // continuation bit set
    }
    encoded += B64_CHARS[digit];
  } while (vlq > 0);
  return encoded;
}

/**
 * Decodes a Base64 VLQ sequence into an array of integers (useful for test assertions).
 *
 * @param {string} str
 * @returns {number[]}
 */
export function decodeVlq(str) {
  const result = [];
  let shift = 0;
  let value = 0;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const index = B64_CHARS.indexOf(char);
    if (index === -1) continue;

    const hasContinuation = (index & 32) !== 0;
    const digit = index & 31;
    value += digit << shift;

    if (hasContinuation) {
      shift += 5;
    } else {
      const isNegative = (value & 1) === 1;
      const finalValue = value >>> 1;
      result.push(isNegative ? -finalValue : finalValue);
      value = 0;
      shift = 0;
    }
  }

  return result;
}

/**
 * Generates a standard Source Map v3 JSON object with delta-encoded mappings.
 *
 * @param {Object} options
 * @param {string} options.file Output bundle filename
 * @param {Array<{ path: string, content: string }>} options.sources Original source files
 * @param {Array<Array<[number, number, number, number]>>} options.lineMappings
 *   Per generated line: array of segments [genCol, sourceIdx, origLine, origCol]
 * @returns {Object} v3 SourceMap object
 */
export function generateSourceMap({ file, sources, lineMappings }) {
  let prevSourceIdx = 0;
  let prevOrigLine = 0;
  let prevOrigCol = 0;

  const mappings = lineMappings.map((segments) => {
    let prevGenCol = 0;
    return segments.map(([genCol, sourceIdx, origLine, origCol]) => {
      const segGenCol = genCol - prevGenCol;
      const segSourceIdx = sourceIdx - prevSourceIdx;
      const segOrigLine = origLine - prevOrigLine;
      const segOrigCol = origCol - prevOrigCol;

      prevGenCol = genCol;
      prevSourceIdx = sourceIdx;
      prevOrigLine = origLine;
      prevOrigCol = origCol;

      return (
        encodeVlq(segGenCol) +
        encodeVlq(segSourceIdx) +
        encodeVlq(segOrigLine) +
        encodeVlq(segOrigCol)
      );
    }).join(',');
  }).join(';');

  return {
    version: 3,
    file,
    sources: sources.map((s) => s.path.replace(/\\/g, '/')),
    sourcesContent: sources.map((s) => s.content),
    names: [],
    mappings
  };
}
