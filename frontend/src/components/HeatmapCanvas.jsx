import { useEffect, useRef, useState } from "react";
import { getOceanSlice } from "../api/client.js";
import { createColorBuffer, getFiniteRange } from "../utils/colorScale.js";
import { ControlInfoModal, InfoButton } from "./ControlInfoModal.jsx";

function drawHeatmap(canvas, slice) {
  const width = slice.longitudes.length;
  const height = slice.latitudes.length;
  const { minimum, maximum } = getFiniteRange([slice.values]);

  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  const image = context.createImageData(width, height);
  image.data.set(createColorBuffer(slice.values, minimum, maximum, { flipRows: true }));

  context.putImageData(image, 0, 0);
  return { minimum, maximum };
}

function HeatmapCanvas({ dataSource, variable = "thetao" }) {
  const canvasRef = useRef(null);
  const [slice, setSlice] = useState(null);
  const [range, setRange] = useState(null);
  const [error, setError] = useState("");
  const [infoOpen, setInfoOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    setSlice(null);
    setError("");
    getOceanSlice({
      depth: 0,
      variable,
      source: dataSource,
      signal: controller.signal,
    })
      .then(setSlice)
      .catch((requestError) => {
        if (requestError.name !== "AbortError") {
          setError("Unable to load the ocean temperature grid.");
        }
      });

    return () => controller.abort();
  }, [dataSource, variable]);

  useEffect(() => {
    if (slice && canvasRef.current) {
      setRange(drawHeatmap(canvasRef.current, slice));
    }
  }, [slice]);

  if (error) {
    return <section className="data-card"><p className="control-error" role="alert">{error}</p></section>;
  }

  return (
    <section className="data-card" aria-labelledby="heatmap-title">
      <div className="data-card-heading"><div><p className="eyebrow">2D source check</p><h3 id="heatmap-title">Surface temperature grid</h3></div><InfoButton topic="heatmap" onOpen={() => setInfoOpen(true)} /></div>
      {!slice && <p>Loading {dataSource === "demo" ? "Copernicus Marine" : "uploaded"} data…</p>}
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Sea surface temperature heatmap of the India EEZ bounding box"
        className={`heatmap-canvas ${slice ? "" : "hidden"}`}
      />
      {slice && range && (
        <p className="heatmap-meta">
          {slice.latitudes[0].toFixed(1)}–{slice.latitudes.at(-1).toFixed(1)}°N,
          {" "}{slice.longitudes[0].toFixed(1)}–{slice.longitudes.at(-1).toFixed(1)}°E
          {" · "}{slice.depth.toFixed(2)} m
          {" · "}{range.minimum.toFixed(2)}–{range.maximum.toFixed(2)} °C
          {" · "}{slice.time.slice(0, 10)}
          {" · "}{slice.source === "demo" ? "Copernicus Marine temperature data (India EEZ)" : "My upload"}
        </p>
      )}
      <ControlInfoModal topic={infoOpen ? "heatmap" : null} onClose={() => setInfoOpen(false)} />
    </section>
  );
}

export default HeatmapCanvas;
