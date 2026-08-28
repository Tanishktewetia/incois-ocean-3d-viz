import { useEffect, useState } from "react";

const PLAY_INTERVAL_MS = 1500;

function DepthTimeSlider({
  depths,
  selectedDepthIndex,
  onDepthChange,
  times,
  selectedTimeIndex,
  onTimeChange,
  isUpdating,
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const atFinalTime = selectedTimeIndex === times.length - 1;

  useEffect(() => {
    if (!isPlaying || isUpdating) {
      return undefined;
    }

    if (atFinalTime) {
      setIsPlaying(false);
      return undefined;
    }

    const timer = window.setTimeout(() => {
      onTimeChange(selectedTimeIndex + 1);
    }, PLAY_INTERVAL_MS);

    return () => window.clearTimeout(timer);
  }, [atFinalTime, isPlaying, isUpdating, onTimeChange, selectedTimeIndex]);

  function togglePlayback() {
    if (atFinalTime) {
      onTimeChange(0);
    }
    setIsPlaying((playing) => !playing);
  }

  return (
    <div
      aria-label="Ocean depth and forecast time controls"
      style={{
        display: "grid",
        gap: "16px",
        margin: "16px 0",
        padding: "16px",
        border: "1px solid #526978",
        background: "#102430",
      }}
    >
      <label>
        <strong>Highlighted depth: {depths[selectedDepthIndex].toFixed(0)} m</strong>
        <input
          type="range"
          min="0"
          max={depths.length - 1}
          step="1"
          value={selectedDepthIndex}
          onChange={(event) => onDepthChange(Number(event.target.value))}
          style={{ display: "block", width: "100%", marginTop: "8px" }}
        />
      </label>

      <label>
        <strong>Forecast date: {times[selectedTimeIndex].slice(0, 10)}</strong>
        <input
          type="range"
          min="0"
          max={times.length - 1}
          step="1"
          value={selectedTimeIndex}
          onChange={(event) => onTimeChange(Number(event.target.value))}
          style={{ display: "block", width: "100%", marginTop: "8px" }}
        />
      </label>

      <div>
        <button type="button" onClick={togglePlayback}>
          {isPlaying ? "Stop animation" : atFinalTime ? "Replay forecast" : "Play forecast"}
        </button>
        <span aria-live="polite" style={{ marginLeft: "12px" }}>
          {isUpdating ? "Updating ocean layers…" : "Ocean layers ready"}
        </span>
      </div>
    </div>
  );
}

export default DepthTimeSlider;
