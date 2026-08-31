export function normalizeRegionSelection(selection, rowCount, columnCount) {
  if (!selection) return null;
  const westIndex = Math.max(0, Math.min(columnCount - 1, Math.min(selection.westIndex, selection.eastIndex)));
  const eastIndex = Math.max(0, Math.min(columnCount - 1, Math.max(selection.westIndex, selection.eastIndex)));
  const southIndex = Math.max(0, Math.min(rowCount - 1, Math.min(selection.southIndex, selection.northIndex)));
  const northIndex = Math.max(0, Math.min(rowCount - 1, Math.max(selection.southIndex, selection.northIndex)));
  if (eastIndex - westIndex < 1 || northIndex - southIndex < 1) return null;
  return { westIndex, eastIndex, southIndex, northIndex };
}

export function cropLoadedPayload(payload, selection) {
  const normalized = normalizeRegionSelection(
    selection,
    payload.latitudes.length,
    payload.longitudes.length,
  );
  if (!normalized) return payload;
  const { westIndex, eastIndex, southIndex, northIndex } = normalized;
  return {
    ...payload,
    longitudes: payload.longitudes.slice(westIndex, eastIndex + 1),
    latitudes: payload.latitudes.slice(southIndex, northIndex + 1),
    layers: payload.layers.map((layer) => ({
      ...layer,
      values: layer.values
        .slice(southIndex, northIndex + 1)
        .map((row) => row.slice(westIndex, eastIndex + 1)),
    })),
    sourceExtent: {
      west: payload.longitudes[0],
      east: payload.longitudes.at(-1),
      south: payload.latitudes[0],
      north: payload.latitudes.at(-1),
    },
  };
}

export function cropLoadedCurrentField(field, bounds) {
  if (!field || !bounds) return field;
  const longitudeIndexes = field.longitudes
    .map((value, index) => (value >= bounds.west && value <= bounds.east ? index : -1))
    .filter((index) => index >= 0);
  const latitudeIndexes = field.latitudes
    .map((value, index) => (value >= bounds.south && value <= bounds.north ? index : -1))
    .filter((index) => index >= 0);
  if (longitudeIndexes.length < 2 || latitudeIndexes.length < 2) return null;
  return {
    ...field,
    longitudes: longitudeIndexes.map((index) => field.longitudes[index]),
    latitudes: latitudeIndexes.map((index) => field.latitudes[index]),
    eastward: latitudeIndexes.map((row) => longitudeIndexes.map((column) => field.eastward[row][column])),
    northward: latitudeIndexes.map((row) => longitudeIndexes.map((column) => field.northward[row][column])),
  };
}