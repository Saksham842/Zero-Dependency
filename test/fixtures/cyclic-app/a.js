import { stepB } from './b.js';

export function stepA(n) {
  if (n <= 0) return ['A:0'];
  return ['A:' + n, ...stepB(n - 1)];
}
