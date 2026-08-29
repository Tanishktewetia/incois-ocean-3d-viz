import { useEffect, useState } from "react";
import { getHealth } from "./api/client.js";
import DatasetUpload from "./components/DatasetUpload.jsx";
import HeatmapCanvas from "./components/HeatmapCanvas.jsx";
import OceanScene3D from "./components/OceanScene3D.jsx";

function App() {
  const [connectionStatus, setConnectionStatus] = useState("Connecting to backend…");
  const [dataSource, setDataSource] = useState("demo");
  const [upload, setUpload] = useState(null);

  useEffect(() => {
    getHealth()
      .then(() => setConnectionStatus("Backend connected"))
      .catch(() => setConnectionStatus("Backend unavailable"));
  }, []);

  return (
    <main style={{ maxWidth: "960px", margin: "0 auto", padding: "24px" }}>
      <h1>Ocean 3D Visualization</h1>
      <p>{connectionStatus}</p>
      <DatasetUpload
        dataSource={dataSource}
        upload={upload}
        onDataSourceChange={setDataSource}
        onUpload={(metadata) => {
          setUpload(metadata);
          setDataSource("upload");
        }}
      />
      <OceanScene3D dataSource={dataSource} />
      <HeatmapCanvas dataSource={dataSource} />
    </main>
  );
}

export default App;
