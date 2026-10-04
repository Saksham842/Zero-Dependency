const init = (open, close) => (str) => `\x1b[${open}m${str}\x1b[${close}m`;

export const red = init(31, 39);
export const green = init(32, 39);
export const yellow = init(33, 39);
export const bold = init(1, 22);

export default {
  red,
  green,
  yellow,
  bold
};
