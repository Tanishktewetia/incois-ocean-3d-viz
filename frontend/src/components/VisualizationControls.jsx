const VARIABLES = [
  ["thetao", "Temperature"],
  ["so", "Salinity"],
  ["current_magnitude", "Current magnitude"],
];

function VisualizationControls({
  variable,
  onVariableChange,
  minimum,
  maximum,
  unit,
  onRangeChange,
  scale,
  onScaleChange,
  opacity,
  onOpacityChange,
  verticalExaggeration,
  onVerticalExaggerationChange,
  uploadSelected,
  error,
}) {
  return (
    <fieldset style={{ margin: "0 0 16px", padding: "12px 16px", border: "1px solid #526978" }}>
      <legend><strong>Variable and colorbar controls</strong></legend>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px 20px", alignItems: "end" }}>
        <label>
          Variable<br />
          <select value={variable} onChange={(event) => onVariableChange(event.target.value)}>
            {VARIABLES.map(([value, label]) => (
              <option key={value} value={value} disabled={uploadSelected && value !== "thetao"}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Color minimum<br />
          <input
            aria-label="Colorbar minimum"
            type="number"
            step="any"
            value={minimum}
            onChange={(event) => onRangeChange("minimum", event.target.value)}
          />
        </label>
        <label>
          Color maximum<br />
          <input
            aria-label="Colorbar maximum"
            type="number"
            step="any"
            value={maximum}
            onChange={(event) => onRangeChange("maximum", event.target.value)}
          />
        </label>
        <label>
          Scale<br />
          <select value={scale} onChange={(event) => onScaleChange(event.target.value)}>
            <option value="linear">Linear</option>
            <option value="log">Logarithmic</option>
          </select>
        </label>
        <label>
          Layer opacity: {Math.round(opacity * 100)}%<br />
          <input
            aria-label="Layer opacity"
            type="range"
            min="0.05"
            max="1"
            step="0.05"
            value={opacity}
            onChange={(event) => onOpacityChange(Number(event.target.value))}
          />
        </label>
        <label>
          Vertical exaggeration: {verticalExaggeration.toFixed(1)}×<br />
          <input
            aria-label="Vertical exaggeration"
            type="range"
            min="0.5"
            max="4"
            step="0.1"
            value={verticalExaggeration}
            onChange={(event) => onVerticalExaggerationChange(Number(event.target.value))}
          />
        </label>
      </div>
      <div style={{ marginTop: "12px", maxWidth: "420px" }} aria-label={`Colorbar from ${minimum} to ${maximum} ${unit}`}>
        <div
          style={{
            height: "14px",
            background: "linear-gradient(90deg, rgb(0, 29, 108), rgb(0, 170, 220), rgb(255, 224, 92), rgb(205, 38, 38))",
            border: "1px solid #8fb4c8",
          }}
        />
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>{minimum} {unit}</span>
          <span>{maximum} {unit}</span>
        </div>
      </div>
      {uploadSelected && <p>Salinity and current magnitude require the bundled Copernicus dataset.</p>}
      {error && <p role="alert" style={{ color: "#ffb3b3" }}>{error}</p>}
    </fieldset>
  );
}

export default VisualizationControls;