export const COLOR_STOPS = [
  [0, 29, 108],
  [0, 170, 220],
  [255, 224, 92],
  [205, 38, 38],
];

export const LAND_COLOR = [12, 24, 32, 255];

export function getFiniteRange(grids) {
  let minimum = Number.POSITIVE_INFINITY;
  let maximum = Number.NEGATIVE_INFINITY;

  for (const grid of grids) {
    for (const row of grid) {
      for (const value of row) {
        if (value !== null) {
          minimum = Math.min(minimum, value);
          maximum = Math.max(maximum, value);
        }
      }
    }
  }

  if (!Number.isFinite(minimum) || !Number.isFinite(maximum)) {
    throw new Error("Temperature grids contain no finite values.");
  }

  return { minimum, maximum };
}

export function interpolateColor(value, minimum, maximum) {
  const normalized = maximum === minimum ? 0.5 : (value - minimum) / (maximum - minimum);
  const position = Math.min(1, Math.max(0, normalized)) * (COLOR_STOPS.length - 1);
  const lowerIndex = Math.min(Math.floor(position), COLOR_STOPS.length - 2);
  const amount = position - lowerIndex;
  const lower = COLOR_STOPS[lowerIndex];
  const upper = COLOR_STOPS[lowerIndex + 1];

  return lower.map((channel, index) =>
    Math.round(channel + (upper[index] - channel) * amount),
  );
}

export function createColorBuffer(values, minimum, maximum, { flipRows = false } = {}) {
  const height = values.length;
  const width = values[0].length;
  const pixels = new Uint8Array(width * height * 4);

  for (let sourceRow = 0; sourceRow < height; sourceRow += 1) {
    const targetRow = flipRows ? height - sourceRow - 1 : sourceRow;

    for (let column = 0; column < width; column += 1) {
      const value = values[sourceRow][column];
      const color = value === null
        ? LAND_COLOR
        : [...interpolateColor(value, minimum, maximum), 255];
      pixels.set(color, (targetRow * width + column) * 4);
    }
  }

  return pixels;
}