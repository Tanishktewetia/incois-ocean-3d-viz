import { useEffect } from "react";

export const CONTROL_INFO = {
  heatmap: {
    title: "2D source check",
    what: "A quick surface slice of the same temperature dataset used by the 3D workspace.",
    how: "Use it to confirm that the selected source loaded correctly and to inspect the geographic surface pattern before moving into depth or changing the view.",
    detail: "The map is a diagnostic overview, not a replacement for the 3D volume. Its caption reports the loaded latitude/longitude extent, depth, value range, date, and source so the preview stays traceable.",
  },
  variable: {
    title: "Variable",
    what: "Selects the model field rendered through the water-column layers.",
    how: "Choose Temperature, Salinity, or Currents. The scene, range labels, threshold unit, and profile context update to match the selected field.",
    detail: "Temperature is shown in degrees Celsius, salinity in PSU, and derived current magnitude in m/s. The color range is recalculated from the loaded field; changing the range only changes the visual mapping, not the source values.",
  },
  color: {
    title: "Color range",
    what: "Maps numeric data values to the blue-to-red color scale.",
    how: "Edit Minimum and Maximum to focus the visual contrast on a meaningful interval. Use Linear for equal numeric intervals or Log when proportional differences are more useful.",
    detail: "Values outside the selected range are clamped to the end colors. Missing or land cells remain transparent in the data surface. The range affects color mapping and the isosurface threshold limits, not the underlying dataset.",
  },
  rendering: {
    title: "Rendering",
    what: "Controls how the model layers are presented in the 3D window.",
    how: "Use Layer opacity to reveal deeper layers. Increase Vertical exaggeration when depth separation is difficult to see in the volume.",
    detail: "Opacity changes material visibility. Vertical exaggeration changes displayed spacing along the depth axis only; geographic coordinates and source measurements are unchanged.",
  },
  volume: {
    title: "Volume analysis",
    what: "Extracts a true three-dimensional surface from the loaded scalar volume.",
    how: "Enable True isosurface, then move Threshold to choose the value whose boundary should be shown as a mesh.",
    detail: "The surface is generated with marching cubes across the interpolated model layers. It is a derived view of the loaded data, not a decorative shape. Turn it off when comparing the individual depth layers.",
  },
  navigate: {
    title: "Navigate data",
    what: "Moves the visual emphasis through model depth and available model dates.",
    how: "Drag Highlighted depth to emphasize a layer. Drag Model date to load another available forecast time, or use Replay timeline to step through the dates.",
    detail: "Depth uses the nearest available model layer. Date changes request the corresponding model payload from the backend; the loading state indicates when the scene is updating.",
  },
  currents: {
    title: "Flow overlay",
    what: "Adds animated particles driven by the loaded Copernicus surface current vectors.",
    how: "Enable Surface currents after selecting a demo model date. Disable it to return to a static volume view.",
    detail: "Particles use the backend's uo/vo field for direction and speed. They are unavailable for researcher uploads because uploads are validated as temperature datasets in the current workflow.",
  },
  background: {
    title: "3D window background",
    what: "Changes the presentation color behind the data volume in the WebGL viewport.",
    how: "Choose a color that gives enough contrast for the active color scale and instrument markers. Reset returns to the default deep blue.",
    detail: "This is a display-only setting. It does not change model values, transparency, lighting, layers, markers, or the geographic extent.",
  },
};

export function InfoButton({ topic, onOpen }) {
  const label = CONTROL_INFO[topic]?.title || "More information";
  return <button className="info-tip" type="button" aria-label={`More information about ${label}`} title={`Learn about ${label}`} onClick={(event) => { event.stopPropagation(); onOpen(topic); }}>i</button>;
}

export function ControlInfoModal({ topic, onClose }) {
  const info = topic ? CONTROL_INFO[topic] : null;

  useEffect(() => {
    if (!info) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [info, onClose]);

  if (!info) return null;

  return (
    <div className="control-info-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="control-info-modal" role="dialog" aria-modal="true" aria-labelledby="control-info-title">
        <div className="control-info-header"><div><p className="eyebrow">Control guide</p><h2 id="control-info-title">{info.title}</h2></div><button className="control-info-close" type="button" onClick={onClose} aria-label="Close information">×</button></div>
        <div className="control-info-body"><div><h3>What it is</h3><p>{info.what}</p></div><div><h3>How to use it</h3><p>{info.how}</p></div><div className="control-info-detail"><h3>Interpretation</h3><p>{info.detail}</p></div></div>
      </section>
    </div>
  );
}
