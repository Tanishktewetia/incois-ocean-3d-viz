import { useEffect, useState } from "react";
import { getHealth } from "./api/client.js";

function App() {
  const [connectionStatus, setConnectionStatus] = useState("Connecting to backend…");

  useEffect(() => {
    getHealth()
      .then(() => setConnectionStatus("Backend connected"))
      .catch(() => setConnectionStatus("Backend unavailable"));
  }, []);

  return (
    <main>
      <h1>Ocean 3D Visualization</h1>
      <p>{connectionStatus}</p>
    </main>
  );
}

export default App;
