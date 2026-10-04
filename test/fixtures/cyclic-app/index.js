import { stepA } from './a.js';
import { stepB } from './b.js';

export function runCycle(count) {
  return {
    fromA: stepA(count),
    fromB: stepB(count)
  };
}
