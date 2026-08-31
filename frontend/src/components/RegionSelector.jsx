import { useEffect, useRef, useState } from "react";
import { createColorBuffer } from "../utils/colorScale.js";
import { normalizeRegionSelection } from "../utils/regionSelection.js";

function RegionSelector({ payload, range, selection, onChange }) {
  const canvasRef = useRef(null);
  const dragStartRef = useRef(null);
  const [draft, setDraft] = useState(null);
  const activeSelection = draft || selection;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !payload || !range) return;
    const width = payload.longitudes.length;
    const height = payload.latitudes.length;
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    const image = context.createImageData(width, height);
    image.data.set(createColorBuffer(
      payload.layers[0].values,
      range.minimum,
      range.maximum,
      { flipRows: true },
    ));
    context.putImageData(image, 0, 0);
  }, [payload, range]);

  if (!payload || !range) return null;
  const toIndex = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      column: Math.round(((event.clientX - bounds.left) / bounds.width) * (payload.longitudes.length - 1)),
      row: Math.round((1 - (event.clientY - bounds.top) / bounds.height) * (payload.latitudes.length - 1)),
    };
  };
  const normalized = normalizeRegionSelection(
    activeSelection,
    payload.latitudes.length,
    payload.longitudes.length,
  );
  const overlayStyle = normalized ? {
    left: `${(normalized.westIndex / (payload.longitudes.length - 1)) * 100}%`,
    right: `${100 - (normalized.eastIndex / (payload.longitudes.length - 1)) * 100}%`,
    bottom: `${(normalized.southIndex / (payload.latitudes.length - 1)) * 100}%`,
    top: `${100 - (normalized.northIndex / (payload.latitudes.length - 1)) * 100}%`,
  } : null;

  return (
    <section className="control-section region-select-control" aria-labelledby="region-select-title">
      <div className="control-kicker" id="region-select-title">Region drag-select</div>
      <div
        className="region-selector-map"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          const point = toIndex(event);
          dragStartRef.current = point;
          setDraft({ westIndex: point.column, eastIndex: point.column, southIndex: point.row, northIndex: point.row });
        }}
        onPointerMove={(event) => {
          if (!dragStartRef.current) return;
          const point = toIndex(event);
          setDraft({
            westIndex: dragStartRef.current.column,
            eastIndex: point.column,
            southIndex: dragStartRef.current.row,
            northIndex: point.row,
          });
        }}
        onPointerUp={(event) => {
          if (!dragStartRef.current) return;
          const point = toIndex(event);
          const next = normalizeRegionSelection({
            westIndex: dragStartRef.current.column,
            eastIndex: point.column,
            southIndex: dragStartRef.current.row,
            northIndex: point.row,
          }, payload.latitudes.length, payload.longitudes.length);
          dragStartRef.current = null;
          setDraft(null);
          if (next) onChange(next);
        }}
      >
        <canvas ref={canvasRef} aria-label="Loaded model extent; drag to crop the 3D volume" />
        {overlayStyle && <span className="region-selection-box" style={overlayStyle} />}
      </div>
      <div className="region-selection-actions">
        <small>{normalized
          ? `${payload.longitudes[normalized.westIndex].toFixed(2)}–${payload.longitudes[normalized.eastIndex].toFixed(2)}°E · ${payload.latitudes[normalized.southIndex].toFixed(2)}–${payload.latitudes[normalized.northIndex].toFixed(2)}°N`
          : "Drag a box to crop the volume from the loaded grid."}</small>
        <button type="button" disabled={!selection} onClick={() => onChange(null)}>Reset</button>
      </div>
    </section>
  );
}

export default RegionSelector;