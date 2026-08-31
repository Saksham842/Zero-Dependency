/**
 * @module server-tui
 * @description Terminal UI (TUI) for the ZeroPack Dev Server.
 */
export const tui = {
  hide:   () => process.stdout.write('\x1b[?25l'),
  show:   () => process.stdout.write('\x1b[?25h'),
  home:   () => process.stdout.write('\x1b[H'),
  clear:  () => process.stdout.write('\x1b[2J\x1b[H'),
  up:     (n) => process.stdout.write(`\x1b[${n}A`),
  eraseLine: () => process.stdout.write('\x1b[2K\r'),

  W: 72,
  top:    (title) => `\x1b[36m\u250c${'\u2500'.repeat(4)} \x1b[1m${title}\x1b[22m ${'\u2500'.repeat(Math.max(0, 66 - title.length))}\u2510\x1b[0m`,
  mid:    () => `\x1b[36m\u251c${'\u2500'.repeat(70)}\u2524\x1b[0m`,
  bot:    () => `\x1b[36m\u2514${'\u2500'.repeat(70)}\u2518\x1b[0m`,
  row:    (text) => {
    const plain = text.replace(/\x1b\[[\d;]*m/g, '');
    const pad = Math.max(0, 68 - plain.length);
    return `\x1b[36m\u2502\x1b[0m ${text}${' '.repeat(pad)}\x1b[36m\u2502\x1b[0m`;
  }
};

const MAX_ACTIVITY = 5;
const _tuiState = { lines: 0, activity: [], url: '', wsUrl: '', dashUrl: '' };

export function _tuiPush(msg) {
  _tuiState.activity.unshift(msg);
  if (_tuiState.activity.length > MAX_ACTIVITY) _tuiState.activity.length = MAX_ACTIVITY;
}

function formatBytes(b) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(2) + ' MB';
}

export function renderTUI(stats, { url = _tuiState.url, wsUrl = _tuiState.wsUrl, dashUrl = _tuiState.dashUrl } = {}) {
  if (url) _tuiState.url = url;
  if (wsUrl) _tuiState.wsUrl = wsUrl;
  if (dashUrl) _tuiState.dashUrl = dashUrl;

  if (!process.stdout.isTTY) {
    const isFailed = stats && stats.status === 'failed';
    const statusLabel = isFailed ? 'FAILED' : 'LIVE';
    const sizeStr = stats ? formatBytes(stats.minifiedSize || 0) : '--';
    const timeStr = stats ? (stats.buildTimeMs || 0) + 'ms' : '--';
    console.log(`[ZeroPack] ${statusLabel} | Bundle: ${sizeStr} | Time: ${timeStr}`);
    return;
  }

  const isFailed = stats && stats.status === 'failed';
  const statusBadge = isFailed
    ? `\x1b[41m\x1b[37m FAILED \x1b[0m`
    : `\x1b[42m\x1b[30m LIVE \x1b[0m`;

  const moduleStr = stats ? String(stats.moduleCount || 0) : '--';
  const sizeStr   = stats ? formatBytes(stats.minifiedSize || 0) : '--';
  const timeStr   = stats ? (stats.buildTimeMs || 0) + 'ms' : '--';
  const ratioStr  = stats ? (stats.compressionRatio || '0%') : '--';

  const lines = [
    tui.top('⚡ ZeroPack Dev Server'),
    tui.row(`Status: ${statusBadge}  Modules: \x1b[96m${moduleStr}\x1b[0m   Bundle: \x1b[96m${sizeStr}\x1b[0m   Time: \x1b[96m${timeStr}\x1b[0m   Saved: \x1b[92m${ratioStr}\x1b[0m`),
    tui.mid(),
    tui.row(`\x1b[2m App:\x1b[0m  \x1b[4m\x1b[32m${_tuiState.url}\x1b[0m`),
    tui.row(`\x1b[2mDash:\x1b[0m  \x1b[4m\x1b[96m${_tuiState.dashUrl}\x1b[0m`),
    tui.row(`\x1b[2m  WS:\x1b[0m  \x1b[2m${_tuiState.wsUrl}\x1b[0m`),
    tui.mid(),
  ];

  for (let i = 0; i < MAX_ACTIVITY; i++) {
    const entry = _tuiState.activity[i] || '';
    lines.push(tui.row(entry ? `\x1b[2m${entry}\x1b[0m` : ''));
  }
  lines.push(tui.bot());

  if (_tuiState.lines > 0) {
    tui.up(_tuiState.lines);
  }
  _tuiState.lines = lines.length;

  process.stdout.write(lines.map(l => '\x1b[2K' + l).join('\n') + '\n');
}
