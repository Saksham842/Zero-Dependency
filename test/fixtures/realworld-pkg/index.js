import TinyEmitter from '../tiny-emitter/index.js';
import kleur, { green, red, bold } from '../kleur-mini/index.js';
import { runCycle } from '../cyclic-app/index.js';
import { getJsonInfo } from '../json-app/index.js';
import { compute } from '../dynamic-import-app/index.js';

export async function runAllRealworldChecks() {
  // 1. Event emitter test
  const emitter = new TinyEmitter();
  const events = [];
  emitter.on('ping', (msg) => events.push('got:' + msg));
  emitter.emit('ping', 'hello-world');

  // 2. Styling library test
  const styled = green('PASS') + ' ' + bold('ALL');

  // 3. Cyclic ESM test
  const cycles = runCycle(3);

  // 4. JSON modules test
  const jsonMeta = getJsonInfo();

  // 5. Dynamic import test
  const mathResults = await compute(10, 20);

  return {
    events,
    styled,
    cycles,
    jsonMeta,
    mathResults
  };
}
