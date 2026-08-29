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
        plugins: {
          legend: { labels: { color: "#a9bec6", boxWidth: 10, boxHeight: 2, font: { size: 9 } } },
          tooltip: { backgroundColor: "#07131d", borderColor: "#35525e", borderWidth: 1 },
        },
        scales: {
          x: {
            type: "linear",
            grid: { color: "rgba(148, 190, 205, 0.09)" },
            ticks: { color: "#718b95", font: { size: 9 } },
            title: { display: true, color: "#a9bec6", text: `${series[0].label} (${series[0].unit})` },
          },
          y: {
            type: "linear",
            reverse: true,
            min: 0,
            grid: { color: "rgba(148, 190, 205, 0.09)" },
            ticks: { color: "#718b95", font: { size: 9 } },
            title: { display: true, color: "#a9bec6", text: "Depth (m)" },
          },
        },
      },
    });

    return () => chart.destroy();
  }, [sample, series]);

  return (
    <div className="chart-wrap">
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
