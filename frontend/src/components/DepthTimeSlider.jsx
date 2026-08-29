import { useEffect, useState } from "react";

const PLAY_INTERVAL_MS = 1500;

function DepthTimeSlider({ depths, selectedDepthIndex, onDepthChange, times, selectedTimeIndex, onTimeChange, isUpdating }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const atFinalTime = selectedTimeIndex === times.length - 1;

  useEffect(() => {
    if (!isPlaying || isUpdating) return undefined;
    if (atFinalTime) { setIsPlaying(false); return undefined; }
    const timer = window.setTimeout(() => onTimeChange(selectedTimeIndex + 1), PLAY_INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [atFinalTime, isPlaying, isUpdating, onTimeChange, selectedTimeIndex]);

  function togglePlayback() {
    if (atFinalTime) onTimeChange(0);
    setIsPlaying((playing) => !playing);
  }

  return (
    <section className="control-section" aria-label="Ocean depth and model time controls">
      <div className="control-kicker">Navigate data <span className="info-tip" title="Highlight a model depth or move through forecast dates." aria-label="Highlight a model depth or move through forecast dates.">i</span></div>
      <label className="slider-control"><span className="slider-label">Highlighted depth <output>{depths[selectedDepthIndex].toFixed(0)} m</output></span><input aria-label="Highlighted depth" title="Select the emphasized model depth layer" type="range" min="0" max={depths.length - 1} step="1" value={selectedDepthIndex} onChange={(event) => onDepthChange(Number(event.target.value))} /><span className="range-endpoints"><span>{depths[0].toFixed(0)} m</span><span>{depths.at(-1).toFixed(0)} m</span></span></label>
      <label className="slider-control"><span className="slider-label">Model date <output>{times[selectedTimeIndex].slice(5, 10)}</output></span><input aria-label="Model date" title="Select the forecast day" type="range" min="0" max={times.length - 1} step="1" value={selectedTimeIndex} onChange={(event) => onTimeChange(Number(event.target.value))} /><span className="range-endpoints"><span>{times[0].slice(5, 10)}</span><span>{times.at(-1).slice(5, 10)}</span></span></label>
      <button className="variable-button" type="button" onClick={togglePlayback} title="Animate the available forecast dates"><span className="variable-icon" aria-hidden="true">{isPlaying ? "Ⅱ" : "▶"}</span><span>{isPlaying ? "Pause timeline" : atFinalTime ? "Replay timeline" : "Play timeline"}<small>{isUpdating ? "Updating layers…" : "Forecast layers ready"}</small></span></button>
    </section>
  );
}

export default DepthTimeSlider;