import { add, multiply, PI } from './math.js';

export function formatGreeting(name) {
  const timestamp = new Date().toLocaleTimeString();
  return `Hello ${name}! Built with ZeroPack at ${timestamp}`;
}

export function calculateCircleArea(radius) {
  return multiply(PI, multiply(radius, radius));
}

export default {
  formatGreeting,
  calculateCircleArea
};
