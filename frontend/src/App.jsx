import { useEffect, useState } from "react";
import { getHealth } from "./api/client.js";
import DatasetUpload from "./components/DatasetUpload.jsx";
import HeatmapCanvas from "./components/HeatmapCanvas.jsx";
import OceanScene3D from "./components/OceanScene3D.jsx";
import AboutPage from "./pages/AboutPage.jsx";
import ComparisonPage from "./pages/ComparisonPage.jsx";

function Brand() {
  return (
    <a className="brand" href="/" aria-label="OceanScope home">
      <span className="brand-mark" aria-hidden="true">OS</span>
      <span><strong>OceanScope</strong><small>India EEZ Intelligence</small></span>
    </a>
  );
}

function AppHeader({ connectionStatus }) {
  const onAboutPage = window.location.pathname === "/about";
  const onComparisonPage = window.location.pathname === "/comparison";
  const connected = connectionStatus === "Backend connected";
  return (
    <header className="app-header">
      <Brand />
      <nav aria-label="Primary navigation">
        <a className={!onAboutPage && !onComparisonPage ? "active" : ""} href="/">Explorer</a>
        <a className={onAboutPage ? "active" : ""} href="/about">Mission & impact</a>
        <a className={onComparisonPage ? "active" : ""} href="/comparison">Comparison</a>
      </nav>
      <div className={`connection-pill ${connected ? "connected" : ""}`} role="status">
        <span aria-hidden="true" />{connectionStatus}
      </div>
    </header>
  );
}

function App() {
  const [connectionStatus, setConnectionStatus] = useState("Connecting to backend…");
  const [dataSource, setDataSource] = useState("demo");
  const [uploads, setUploads] = useState({});
  const [activeVariable, setActiveVariable] = useState("thetao");

  useEffect(() => {
    getHealth()
      .then(() => setConnectionStatus("Backend connected"))
      .catch(() => setConnectionStatus("Backend unavailable"));
  }, []);

  if (window.location.pathname === "/about") {
    return (
      <div className="app-shell">
        <AppHeader connectionStatus={connectionStatus} />
        <AboutPage />
      </div>
    );
  }

  if (window.location.pathname === "/comparison") {
    return (
      <div className="app-shell">
        <AppHeader connectionStatus={connectionStatus} />
        <ComparisonPage />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <AppHeader connectionStatus={connectionStatus} />
      <main className="explorer-page">
        <section className="page-intro" aria-labelledby="explorer-title">
          <div>
            <p className="eyebrow">Decision-ready ocean intelligence</p>
            <h1 id="explorer-title">See the water column.<br /><span>Understand the system.</span></h1>
          </div>
          <p className="intro-copy">Explore real Copernicus Marine forecasts and in-situ observations across the India EEZ in one scientifically traceable 3D workspace.</p>
        </section>
        <section className="data-lab data-lab-featured" aria-labelledby="data-lab-title">
          <div className="section-heading">
            <div><p className="eyebrow">Data lab · Primary workflow</p><h2 id="data-lab-title">Bring your own ocean model</h2></div>
            <p>Validate a scientist-supplied NetCDF dataset in the same visual workflow, or inspect the source surface grid.</p>
          </div>
          <div className="data-lab-grid">
            <DatasetUpload
              dataSource={dataSource}
              uploads={uploads}
              onDataSourceChange={setDataSource}
              onUpload={(type, metadata) => {
                setUploads((current) => ({ ...current, [type]: metadata }));
                if (type !== "instruments") setActiveVariable(type === "currents" ? "current_magnitude" : type);
              }}
            />
            <HeatmapCanvas dataSource={dataSource} variable={activeVariable} />
          </div>
        </section>
        <OceanScene3D dataSource={dataSource} initialVariable={activeVariable} uploadedInstrumentCount={uploads.instruments ? 1 : 0} />
      </main>
      <footer><span>OceanScope · SIH PS 26067</span><span>Built on traceable ocean data, not invented terrain.</span></footer>
    </div>
  );
}

export default App;
