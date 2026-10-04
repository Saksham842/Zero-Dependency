import { stepA } from './a.js';

export function stepB(n) {
  if (n <= 0) return ['B:0'];
  return ['B:' + n, ...stepA(n - 1)];
}
