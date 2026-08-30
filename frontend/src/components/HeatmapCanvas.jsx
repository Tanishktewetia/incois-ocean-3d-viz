import { useEffect, useRef, useState } from "react";
import { getOceanSlice } from "../api/client.js";
import { createColorBuffer, getFiniteRange } from "../utils/colorScale.js";
import { getGibsLandImage } from "../utils/gibsImagery.js";
import { ControlInfoModal, InfoButton } from "./ControlInfoModal.jsx";

function drawHeatmap(canvas, slice, landImage) {
  const width = slice.longitudes.length;
  const height = slice.latitudes.length;
  const { minimum, maximum } = getFiniteRange([slice.values]);

  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  const image = context.createImageData(width, height);
  const oceanPixels = createColorBuffer(slice.values, minimum, maximum, { flipRows: true });
  if (landImage) {
    const imageCanvas = document.createElement("canvas");
    imageCanvas.width = width;
    imageCanvas.height = height;
    const imageContext = imageCanvas.getContext("2d");
    imageContext.drawImage(landImage, 0, 0, width, height);
    const landPixels = imageContext.getImageData(0, 0, width, height).data;
    for (let index = 0; index < oceanPixels.length; index += 4) {
      if (oceanPixels[index + 3] === 0) {
        oceanPixels[index] = landPixels[index];
        oceanPixels[index + 1] = landPixels[index + 1];
        oceanPixels[index + 2] = landPixels[index + 2];
        oceanPixels[index + 3] = 255;
      }
    }
  }
  image.data.set(oceanPixels);

  context.putImageData(image, 0, 0);
  return { minimum, maximum };
}

function HeatmapCanvas({ dataSource, variable = "thetao", onMapClick }) {
  const canvasRef = useRef(null);
  const [slice, setSlice] = useState(null);
  const [range, setRange] = useState(null);
  const [error, setError] = useState("");
  const [infoOpen, setInfoOpen] = useState(false);
  const [landImage, setLandImage] = useState(null);

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
    getGibsLandImage().then(setLandImage).catch(() => setLandImage(null));
  }, []);

  useEffect(() => {
    if (slice && canvasRef.current) {
      setRange(drawHeatmap(canvasRef.current, slice, landImage));
    }
  }, [slice, landImage]);

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
        onClick={(event) => {
          if (!slice || !onMapClick) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          const x = (event.clientX - bounds.left) / bounds.width;
          const y = 1 - (event.clientY - bounds.top) / bounds.height;
          const latIndex = Math.max(0, Math.min(slice.latitudes.length - 1, Math.round(y * (slice.latitudes.length - 1))));
          const lonIndex = Math.max(0, Math.min(slice.longitudes.length - 1, Math.round(x * (slice.longitudes.length - 1))));
          onMapClick({ latitude: slice.latitudes[latIndex], longitude: slice.longitudes[lonIndex] });
        }}
      />
      {slice && range && (
        <p className="heatmap-meta">
          {slice.latitudes[0].toFixed(1)}–{slice.latitudes.at(-1).toFixed(1)}°N,
          {" "}{slice.longitudes[0].toFixed(1)}–{slice.longitudes.at(-1).toFixed(1)}°E
          {" · "}{slice.depth.toFixed(2)} m
          {" · "}{range.minimum.toFixed(2)}–{range.maximum.toFixed(2)} °C
          {" · "}{slice.time.slice(0, 10)}
          {" · "}{slice.source === "demo" ? "Copernicus Marine temperature data (India EEZ)" : "My upload"}
          {" · Land imagery: NASA GIBS"}
        </p>
      )}
      <ControlInfoModal topic={infoOpen ? "heatmap" : null} onClose={() => setInfoOpen(false)} />
    </section>
  );
}

export default HeatmapCanvas;
