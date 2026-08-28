import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

function ProfileChart({ profile }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !profile) {
      return undefined;
    }

    const chart = new Chart(canvasRef.current, {
      type: "line",
      data: {
        datasets: [
          {
            label: "Argo observed temperature",
            data: profile.measurements.map((measurement) => ({
              x: measurement.temperature,
              y: measurement.depth,
            })),
            borderColor: "#ffb347",
            backgroundColor: "#ffb347",
            borderWidth: 2,
            pointRadius: 0,
            pointHitRadius: 5,
            tension: 0,
          },
          {
            label: "Copernicus model temperature",
            data: profile.model_comparison.model_profile.map((measurement) => ({
              x: measurement.temperature,
              y: measurement.depth,
            })),
            borderColor: "#4fc3f7",
            backgroundColor: "#4fc3f7",
            borderWidth: 2,
            borderDash: [6, 4],
            pointRadius: 0,
            pointHitRadius: 5,
            tension: 0,
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
        parsing: false,
        animation: false,
        interaction: { mode: "nearest", intersect: false },
        scales: {
          x: {
            type: "linear",
            title: { display: true, text: "Temperature (°C)" },
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
  }, [profile]);

  return (
    <div style={{ height: "420px" }}>
      <canvas
        ref={canvasRef}
        aria-label="Argo and Copernicus model depth versus temperature profiles"
      />
    </div>
  );
}

export default ProfileChart;
