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
  figureVolume: {
    title: "Layered ocean volume",
    what: "The main 3D view places the loaded model field at its real available depths, so you can inspect how the variable changes through the water column. GEBCO bathymetry, observation markers, optional current particles, and the isosurface are additional traceable layers.",
    how: "Drag the scene to rotate, use the mouse wheel to zoom, and use the depth slider to highlight a model layer. Use Volume layer focus when you need to isolate bathymetry, one depth, the isosurface, or instruments. Hover a visible data layer to read its value, depth, and coordinates.",
    detail: "Colors represent the selected variable and the active color range shown in the legend. Temperature uses °C, salinity uses PSU, and current magnitude uses m/s. The vertical exaggeration changes displayed spacing only; it does not change measurements.",
  },
  figureRelief: {
    title: "Field relief surface",
    what: "This view turns the selected model depth into a continuous 3D relief surface. Surface height is derived from the loaded field value, while color uses the same scientific color mapping as the volume.",
    how: "Select a depth, rotate or zoom the surface, and change the variable, date, color range, or scale to examine a different field. Hover the surface to read the underlying value and geographic position.",
    detail: "This is a visualization transform of real model values, not terrain or invented bathymetry. Missing cells remain holes so the surface does not imply data where none was provided.",
  },
  figureSolid: {
    label: "FIGURE GUIDE",
    title: "Temperature solid volume",
    what: "A continuous 3D body generated from the loaded temperature field with dense trilinear sampling and nested temperature isosurfaces.",
    how: "Select it under 3D figure, then rotate and zoom the volume. Change variable, date, color range, opacity, and vertical exaggeration to inspect the real loaded field.",
    detail: "The body is a 3D scalar-field view, not stacked images. Nested surfaces mark progressively higher temperature bands; use the legend and hover values for exact readings.",
  },
  isotherm: {
    title: "Isotherm contours",
    what: "Thin lines marking equal temperature values across the loaded temperature field. Each line is an isotherm, and the fixed interval is 2 °C.",
    how: "Enable the toggle while Temperature is selected. In the layered volume, contours appear on the available depth layers; in the field-relief figure, they follow the selected depth surface. Change depth, date, or the temperature range to update the lines.",
    detail: "Contour positions are interpolated from the actual loaded temperature grid. They are a visual guide to temperature gradients, not additional measurements. The toggle is available only for temperature and is off by default.",
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
