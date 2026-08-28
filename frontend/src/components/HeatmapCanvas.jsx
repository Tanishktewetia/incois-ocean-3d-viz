import { useEffect, useRef, useState } from "react";
import { getOceanSlice } from "../api/client.js";
import { createColorBuffer, getFiniteRange } from "../utils/colorScale.js";

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

function HeatmapCanvas() {
  const canvasRef = useRef(null);
  const [slice, setSlice] = useState(null);
  const [range, setRange] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    getOceanSlice({ depth: 0, variable: "thetao", signal: controller.signal })
      .then(setSlice)
      .catch((requestError) => {
        if (requestError.name !== "AbortError") {
          setError("Unable to load the ocean temperature grid.");
        }
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (slice && canvasRef.current) {
      setRange(drawHeatmap(canvasRef.current, slice));
    }
  }, [slice]);

  if (error) {
    return <p role="alert">{error}</p>;
  }

  return (
    <section aria-labelledby="heatmap-title">
      <h2 id="heatmap-title">Surface temperature</h2>
      {!slice && <p>Loading Copernicus Marine data…</p>}
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Sea surface temperature heatmap of the India EEZ bounding box"
        style={{
          display: slice ? "block" : "none",
          width: "min(100%, 900px)",
          height: "auto",
          border: "1px solid #526978",
          background: "#0c1820",
        }}
      />
      {slice && range && (
        <p>
          {slice.latitudes[0].toFixed(1)}–{slice.latitudes.at(-1).toFixed(1)}°N,
          {" "}{slice.longitudes[0].toFixed(1)}–{slice.longitudes.at(-1).toFixed(1)}°E
          {" · "}{slice.depth.toFixed(2)} m
          {" · "}{range.minimum.toFixed(2)}–{range.maximum.toFixed(2)} °C
          {" · "}{slice.time.slice(0, 10)}
        </p>
      )}
    </section>
  );
}

export default HeatmapCanvas;
