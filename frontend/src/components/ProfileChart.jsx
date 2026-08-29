import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

const COLORS = ["#ffb347", "#4fc3f7", "#56d98b", "#d47cff"];

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
          borderColor: COLORS[index % COLORS.length],
          backgroundColor: COLORS[index % COLORS.length],
          borderWidth: 2,
          borderDash: item.variable === "model_temperature" ? [6, 4] : [],
          pointRadius: 0,
          pointHitRadius: 5,
          tension: 0,
        })),
      },
      options: {
        maintainAspectRatio: false,
        parsing: false,
        animation: false,
        interaction: { mode: "nearest", intersect: false },
        scales: {
          x: {
            type: "linear",
            title: { display: true, text: `${series[0].label} (${series[0].unit})` },
          },
          y: {
            type: "linear",
            reverse: true,
            min: 0,
            title: { display: true, text: "Depth (m)" },
          },
        },
      },
    });

    return () => chart.destroy();
  }, [sample, series]);

  return (
    <div style={{ height: "420px" }}>
      <canvas
        ref={canvasRef}
        aria-label={`${sample ? "Sample " : ""}${series.map((item) => item.label).join(" and ")} depth profile`}
      />
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
