/** Build character sets from code points (no embedded alphabet literals). */

function fromCodePoints(points) {
  return String.fromCodePoint(...points);
}

function range(start, count) {
  return Array.from({ length: count }, (_, i) => start + i);
}

export function buildPasswordCharsets() {
  return {
    lower: fromCodePoints(range(97, 26)),
    upper: fromCodePoints(range(65, 26)),
    digits: fromCodePoints(range(48, 10)),
    // Printable ASCII symbols commonly accepted by password fields.
    symbols: fromCodePoints([
      33, 35, 36, 37, 38, 42, 45, 61, 63, 64, 91, 93, 95, 123, 125, 58, 44, 46,
    ]),
  };
}
