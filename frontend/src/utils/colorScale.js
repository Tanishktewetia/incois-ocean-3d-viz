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

export function transformValue(value, scale = "linear") {
  if (scale === "log") {
    return value > 0 ? Math.log10(value) : null;
  }
  return value;
}

export function interpolateColor(value, minimum, maximum, scale = "linear") {
  const transformedValue = transformValue(value, scale);
  const transformedMinimum = transformValue(minimum, scale);
  const transformedMaximum = transformValue(maximum, scale);
  if (transformedValue === null || transformedMinimum === null || transformedMaximum === null) {
    return LAND_COLOR.slice(0, 3);
  }
  const normalized = transformedMaximum === transformedMinimum
    ? 0.5
    : (transformedValue - transformedMinimum) / (transformedMaximum - transformedMinimum);
  const position = Math.min(1, Math.max(0, normalized)) * (COLOR_STOPS.length - 1);
  const lowerIndex = Math.min(Math.floor(position), COLOR_STOPS.length - 2);
  const amount = position - lowerIndex;
  const lower = COLOR_STOPS[lowerIndex];
  const upper = COLOR_STOPS[lowerIndex + 1];

  return lower.map((channel, index) =>
    Math.round(channel + (upper[index] - channel) * amount),
  );
}

export function createColorBuffer(
  values,
  minimum,
  maximum,
  { flipRows = false, scale = "linear" } = {},
) {
  const height = values.length;
  const width = values[0].length;
  const pixels = new Uint8Array(width * height * 4);

  for (let sourceRow = 0; sourceRow < height; sourceRow += 1) {
    const targetRow = flipRows ? height - sourceRow - 1 : sourceRow;

    for (let column = 0; column < width; column += 1) {
      const value = values[sourceRow][column];
      const color = value === null
        ? LAND_COLOR
        : [...interpolateColor(value, minimum, maximum, scale), 255];
      pixels.set(color, (targetRow * width + column) * 4);
    }
  }

  return pixels;
}

function cubicInterpolate(first, second, third, fourth, amount) {
  return second + 0.5 * amount * (
    third - first
    + amount * (2 * first - 5 * second + 4 * third - fourth
      + amount * (3 * (second - third) + fourth - first))
  );
}

function smoothGridValue(values, sourceX, sourceY) {
  const height = values.length;
  const width = values[0].length;
  const nearestRow = Math.max(0, Math.min(height - 1, Math.round(sourceY)));
  const nearestColumn = Math.max(0, Math.min(width - 1, Math.round(sourceX)));

  // Preserve the native ocean mask. Interpolation must never extend model
  // values into a source cell that is land/missing.
  if (!Number.isFinite(values[nearestRow][nearestColumn])) return null;

  const x1 = Math.floor(sourceX);
  const y1 = Math.floor(sourceY);
  const xAmount = sourceX - x1;
  const yAmount = sourceY - y1;
  const sample = (row, column) => values[
    Math.max(0, Math.min(height - 1, row))
  ][Math.max(0, Math.min(width - 1, column))];
  const neighborhood = Array.from({ length: 4 }, (_, rowOffset) => (
    Array.from({ length: 4 }, (_, columnOffset) => (
      sample(y1 + rowOffset - 1, x1 + columnOffset - 1)
    ))
  ));

  if (neighborhood.flat().every(Number.isFinite)) {
    const rows = neighborhood.map((row) => cubicInterpolate(...row, xAmount));
    return cubicInterpolate(...rows, yAmount);
  }

  const x2 = Math.min(width - 1, x1 + 1);
  const y2 = Math.min(height - 1, y1 + 1);
  const corners = [values[y1][x1], values[y1][x2], values[y2][x1], values[y2][x2]];
  if (corners.every(Number.isFinite)) {
    const top = corners[0] + (corners[1] - corners[0]) * xAmount;
    const bottom = corners[2] + (corners[3] - corners[2]) * xAmount;
    return top + (bottom - top) * yAmount;
  }
  return values[nearestRow][nearestColumn];
}

export function createSmoothColorBuffer(
  values,
  minimum,
  maximum,
  { scale = "linear", factor = 3 } = {},
) {
  const sourceHeight = values.length;
  const sourceWidth = values[0].length;
  const width = (sourceWidth - 1) * factor + 1;
  const height = (sourceHeight - 1) * factor + 1;
  const pixels = new Uint8Array(width * height * 4);

  for (let row = 0; row < height; row += 1) {
    const sourceY = row / factor;
    for (let column = 0; column < width; column += 1) {
      const value = smoothGridValue(values, column / factor, sourceY);
      const color = value === null
        ? [0, 0, 0, 0]
        : [...interpolateColor(value, minimum, maximum, scale), 255];
      pixels.set(color, (row * width + column) * 4);
    }
  }
  return { pixels, width, height };
}