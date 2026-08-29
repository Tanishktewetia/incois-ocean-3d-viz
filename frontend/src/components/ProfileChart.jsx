import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

const OBSERVATION_COLOR = "#d97706";
const MODEL_COLOR = "#1976d2";
const SERIES_COLORS = ["#07899d", "#7c3aed", "#15803d", "#be185d"];

function seriesColor(item, index) {
  if (item.variable.startsWith("model_")) return MODEL_COLOR;
  if (item.variable === "temperature") return OBSERVATION_COLOR;
  return SERIES_COLORS[index % SERIES_COLORS.length];
}

function SeriesChart({ series, sample }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) {
      return undefined;
    }

    const chart = new Chart(canvasRef.current, {
      type: "line",
      data: {
        datasets: series.map((item, index) => ({
          label: `${item.label}${sample ? " (SAMPLE DATA)" : ""}`,
          data: item.measurements.map((measurement) => ({
            x: measurement.value,
            y: measurement.depth,
          })),
          borderColor: seriesColor(item, index),
          backgroundColor: seriesColor(item, index),
          borderWidth: item.variable.startsWith("model_") ? 3 : 2,
          borderDash: item.variable.startsWith("model_") ? [8, 5] : [],
          pointRadius: item.variable.startsWith("model_") ? 0 : 2,
          pointHitRadius: 5,
          tension: 0,
        })),
      },
      options: {
        maintainAspectRatio: false,
        parsing: false,
        animation: false,
        interaction: { mode: "nearest", intersect: false },
        plugins: {
          legend: { labels: { color: "#40576d", boxWidth: 10, boxHeight: 2, font: { size: 11 } } },
          tooltip: { backgroundColor: "#102a43", borderColor: "#0f8fa3", borderWidth: 1 },
        },
        scales: {
          x: {
            type: "linear",
            grid: { color: "rgba(49, 94, 124, 0.12)" },
            ticks: { color: "#60758a", font: { size: 10 } },
            title: { display: true, color: "#40576d", text: `${series[0].label} (${series[0].unit})` },
          },
          y: {
            type: "linear",
            reverse: true,
            min: 0,
            grid: { color: "rgba(49, 94, 124, 0.12)" },
            ticks: { color: "#60758a", font: { size: 10 } },
            title: { display: true, color: "#40576d", text: "Depth (m)" },
          },
        },
      },
    });

    return () => chart.destroy();
  }, [sample, series]);

  return (
    <div className="profile-chart-group">
      <div className="profile-chart-heading">
        <strong>{series[0].unit} profile</strong>
        <span>{series.map((item) => item.label).join(" vs ")}</span>
      </div>
      <div className="chart-wrap">
        <canvas
          ref={canvasRef}
          aria-label={`${sample ? "Sample " : ""}${series.map((item) => item.label).join(" and ")} depth profile`}
        />
      </div>
    </div>
  );
}

function ProfileChart({ profile }) {
  const groups = Object.values(profile.profile.series.reduce((result, series) => ({
    ...result,
    [series.unit]: [...(result[series.unit] || []), series],
  }), {}));
  return groups.map((series) => (
    <SeriesChart
      key={`${profile.id}-${series[0].unit}`}
      series={series}
      sample={profile.data_status === "sample"}
    />
  ));
}

export default ProfileChart;
