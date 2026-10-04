/**
 * @module cli-logger
 * @description Zero-dependency ANSI terminal logger for ZeroPack.
 */

/**
 * Lightweight ANSI styling helpers.
 * @namespace colors
 */
export const colors = {
  reset:        (text) => `\x1b[0m${text}\x1b[0m`,
  bold:         (text) => `\x1b[1m${text}\x1b[22m`,
  dim:          (text) => `\x1b[2m${text}\x1b[22m`,
  italic:       (text) => `\x1b[3m${text}\x1b[23m`,
  underline:    (text) => `\x1b[4m${text}\x1b[24m`,
  black:        (text) => `\x1b[30m${text}\x1b[39m`,
  red:          (text) => `\x1b[31m${text}\x1b[39m`,
  green:        (text) => `\x1b[32m${text}\x1b[39m`,
  yellow:       (text) => `\x1b[33m${text}\x1b[39m`,
  blue:         (text) => `\x1b[34m${text}\x1b[39m`,
  magenta:      (text) => `\x1b[35m${text}\x1b[39m`,
  cyan:         (text) => `\x1b[36m${text}\x1b[39m`,
  white:        (text) => `\x1b[37m${text}\x1b[39m`,
  gray:         (text) => `\x1b[90m${text}\x1b[39m`,
  brightRed:    (text) => `\x1b[91m${text}\x1b[39m`,
  brightGreen:  (text) => `\x1b[92m${text}\x1b[39m`,
  brightYellow: (text) => `\x1b[93m${text}\x1b[39m`,
  brightCyan:   (text) => `\x1b[96m${text}\x1b[39m`,
  bgCyan:       (text) => `\x1b[46m\x1b[30m${text}\x1b[39m\x1b[49m`,
  bgGreen:      (text) => `\x1b[42m\x1b[30m${text}\x1b[39m\x1b[49m`,
  bgYellow:     (text) => `\x1b[43m\x1b[30m${text}\x1b[39m\x1b[49m`,
  bgRed:        (text) => `\x1b[41m\x1b[37m${text}\x1b[39m\x1b[49m`
};

/**
 * Structured logger with semantic severity levels.
 * @namespace logger
 */
export const logger = {
  info:    (msg) => console.log(`${colors.cyan(colors.bold('[INFO]'))} ${msg}`),
  success: (msg) => console.log(`${colors.green(colors.bold('[SUCCESS]'))} ${msg}`),
  warn:    (msg) => console.warn(`${colors.yellow(colors.bold('[WARN]'))} ${msg}`),
  error:   (msg) => console.error(`${colors.red(colors.bold('[ERROR]'))} ${msg}`),
  build:   (msg) => console.log(`${colors.magenta(colors.bold('[BUILD]'))} ${msg}`),
  server:  (msg) => console.log(`${colors.blue(colors.bold('[SERVER]'))} ${msg}`),
  hmr:     (msg) => console.log(`${colors.brightCyan(colors.bold('[HMR]'))} ${msg}`),
  raw:     (msg) => console.log(msg)
};
