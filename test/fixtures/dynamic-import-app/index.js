export async function compute(a, b) {
  const math = await import('./math.js');
  return {
    sum: math.add(a, b),
    product: math.multiply(a, b),
    defaultSum: (math.default?.add || math.add)(a, b)
  };
}
