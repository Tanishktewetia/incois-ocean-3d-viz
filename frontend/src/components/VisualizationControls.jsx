import { InfoButton } from "./ControlInfoModal.jsx";

const VARIABLES = [
  ["thetao", "Temperature", "°C", "T"],
  ["so", "Salinity", "PSU", "S"],
  ["current_magnitude", "Currents", "m/s", "↗"],
];
const VIEW_MODES = [["composite", "Composite"], ["bathymetry", "Bathymetry only"], ["depth", "Selected depth layer only"], ["isosurface", "Isosurface only"], ["instruments", "Instruments only"]];
const FIGURE_MODES = [
  ["volume", "Layered ocean volume", "Depth layers, seafloor, observations, and optional flows"],
  ["relief", "Field relief surface", "Selected depth shown as an interactive value-height surface"],
];

function VisualizationControls({
  variable, onVariableChange, minimum, maximum, unit, onRangeChange,
  scale, onScaleChange, opacity, onOpacityChange, verticalExaggeration,
  onVerticalExaggerationChange, isosurfaceEnabled, onIsosurfaceEnabledChange,
  isosurfaceThreshold, onIsosurfaceThresholdChange, uploadSelected, error,
  isothermContoursEnabled, onIsothermContoursChange,
  backgroundColor, onBackgroundColorChange, onInfoOpen,
  viewMode, onViewModeChange, figureMode, onFigureModeChange, temperatureOnly = false,
}) {
  return (
    <>
      <section className="control-section" aria-labelledby="variable-control-title">
        <div className="control-kicker" id="variable-control-title">Variable <InfoButton topic="variable" onOpen={onInfoOpen} /></div>
        <div className="variable-buttons">
          {VARIABLES.map(([value, label, variableUnit, icon]) => (
              <button className={`variable-button ${variable === value ? "active" : ""}`} type="button" key={value} disabled={(uploadSelected || temperatureOnly) && value !== "thetao"} onClick={() => onVariableChange(value)} title={`Render ${label.toLowerCase()} (${variableUnit})`} aria-pressed={variable === value}>
              <span className="variable-icon" aria-hidden="true">{icon}</span><span>{label}<small>{variableUnit}</small></span>
            </button>
          ))}
        </div>
        {uploadSelected && <p className="status-copy">Uploads provide temperature only; other fields use Copernicus Marine.</p>}
        {temperatureOnly && <p className="status-copy">This dedicated figure is fixed to Copernicus temperature.</p>}
      </section>

      <section className="control-section" aria-labelledby="view-control-title">
        <div className="control-kicker" id="view-control-title">3D figure</div>
        <div className="figure-buttons" role="group" aria-label="3D figure selection">
          {FIGURE_MODES.map(([value, label, description], index) => (
            <div className="figure-button-row" key={value}>
              <button className={`figure-button ${figureMode === value ? "active" : ""}`} type="button" onClick={() => onFigureModeChange(value)} aria-pressed={figureMode === value}>
                <span aria-hidden="true">0{index + 1}</span><strong>{label}</strong><small>{description}</small>
              </button>
              <InfoButton topic={value === "volume" ? "figureVolume" : "figureRelief"} onOpen={onInfoOpen} />
            </div>
          ))}
        </div>
        <label className="view-select-label" htmlFor="layer-view-mode">Volume layer focus</label>
        <select id="layer-view-mode" className="view-select" value={viewMode} disabled={figureMode !== "volume"} onChange={(event) => onViewModeChange(event.target.value)} aria-label="3D layer isolation view">
          {VIEW_MODES.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </select>
        <p className="status-copy">One figure at a time · same loaded model values and camera controls.</p>
      </section>

      <section className="control-section" aria-labelledby="color-control-title">
        <div className="control-kicker" id="color-control-title">Color range <InfoButton topic="color" onOpen={onInfoOpen} /></div>
        <div className="colorbar" aria-label={`Colorbar from ${minimum} to ${maximum} ${unit}`} />
        <div className="range-fields">
          <label className="range-field">Minimum<div className="range-input-wrap"><input aria-label="Colorbar minimum" type="number" step="any" value={minimum} onChange={(event) => onRangeChange("minimum", event.target.value)} /><span>{unit}</span></div></label>
          <label className="range-field">Maximum<div className="range-input-wrap"><input aria-label="Colorbar maximum" type="number" step="any" value={maximum} onChange={(event) => onRangeChange("maximum", event.target.value)} /><span>{unit}</span></div></label>
        </div>
        <div className="segmented" aria-label="Color scale">
          <button className={scale === "linear" ? "active" : ""} type="button" onClick={() => onScaleChange("linear")} title="Use even value intervals">Linear</button>
          <button className={scale === "log" ? "active" : ""} type="button" onClick={() => onScaleChange("log")} title="Emphasize proportional differences">Log</button>
        </div>
      </section>

      <section className="control-section" aria-labelledby="render-control-title">
        <div className="control-kicker" id="render-control-title">Rendering <InfoButton topic="rendering" onOpen={onInfoOpen} /></div>
        <label className="slider-control"><span className="slider-label">Layer opacity <output>{Math.round(opacity * 100)}%</output></span><input aria-label="Layer opacity" title="Set transparency of depth layers" type="range" min="0.05" max="1" step="0.05" value={opacity} onChange={(event) => onOpacityChange(Number(event.target.value))} /><span className="range-endpoints"><span>5%</span><span>100%</span></span></label>
        <label className="slider-control"><span className="slider-label">Vertical exaggeration <output>{verticalExaggeration.toFixed(1)}×</output></span><input aria-label="Vertical exaggeration" title="Stretch depth spacing for interpretation; values are unchanged" type="range" min="0.5" max="4" step="0.1" value={verticalExaggeration} onChange={(event) => onVerticalExaggerationChange(Number(event.target.value))} /><span className="range-endpoints"><span>0.5×</span><span>4×</span></span></label>
        <div className="background-control"><span className="slider-label"><span>3D window background</span><output>{backgroundColor.toUpperCase()}</output></span><div className="background-picker-row"><input aria-label="3D window background color" type="color" value={backgroundColor} onChange={(event) => onBackgroundColorChange(event.target.value)} /><button type="button" onClick={() => onBackgroundColorChange("#102b40")}>Default blue</button></div></div>
      </section>

      <section className="control-section" aria-labelledby="surface-control-title">
        <div className="control-kicker" id="surface-control-title">Volume analysis <InfoButton topic="volume" onOpen={onInfoOpen} /></div>
        {variable === "thetao" && <div className="toggle-row" title="Draw contours from the loaded temperature values"><span className="toggle-label-with-info"><span>Isotherm contours <small className="toggle-unit">2 °C interval</small></span><InfoButton topic="isotherm" onOpen={onInfoOpen} /></span><button className={`toggle toggle-switch ${isothermContoursEnabled ? "active" : ""}`} type="button" role="switch" aria-checked={isothermContoursEnabled} aria-label="Show 2 degree Celsius isotherm contours" onClick={() => onIsothermContoursChange(!isothermContoursEnabled)} /></div>}
        <label className="toggle-row" title="Show a marching-cubes surface extracted from the loaded volume"><span>True isosurface</span><input aria-label="Show true isosurface" type="checkbox" checked={isosurfaceEnabled} onChange={(event) => onIsosurfaceEnabledChange(event.target.checked)} /><span className="toggle" aria-hidden="true" /></label>
        <label className="slider-control"><span className="slider-label">Threshold <output>{isosurfaceThreshold.toFixed(2)} {unit}</output></span><input aria-label="Isosurface threshold" title="Choose the value represented by the extracted surface" type="range" min={minimum} max={maximum} step={(maximum - minimum) / 200} value={isosurfaceThreshold} disabled={!isosurfaceEnabled} onChange={(event) => onIsosurfaceThresholdChange(Number(event.target.value))} /></label>
        {error && <p className="control-error" role="alert">{error}</p>}
      </section>
    </>
  );
}

export default VisualizationControls;
