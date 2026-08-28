import { useEffect, useRef, useState } from "react";
import { getOceanSlice } from "../api/client.js";

const COLOR_STOPS = [
  [0, 29, 108],
  [0, 170, 220],
  [255, 224, 92],
  [205, 38, 38],
];
const LAND_COLOR = [12, 24, 32, 255];

function interpolateColor(value, minimum, maximum) {
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

function drawHeatmap(canvas, slice) {
  const width = slice.longitudes.length;
  const height = slice.latitudes.length;
  const temperatures = slice.values.flat().filter((value) => value !== null);
  const minimum = Math.min(...temperatures);
  const maximum = Math.max(...temperatures);

  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  const image = context.createImageData(width, height);

  for (let sourceRow = 0; sourceRow < height; sourceRow += 1) {
    const targetRow = height - sourceRow - 1;

    for (let column = 0; column < width; column += 1) {
      const value = slice.values[sourceRow][column];
      const color = value === null
        ? LAND_COLOR
        : [...interpolateColor(value, minimum, maximum), 255];
      const pixel = (targetRow * width + column) * 4;
      image.data.set(color, pixel);
    }
  }

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
