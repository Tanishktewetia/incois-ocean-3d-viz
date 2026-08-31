import OceanScene3D from "../components/OceanScene3D.jsx";

function TemperatureVolumeExplorerPage() {
  return (
    <main className="temperature-volume-page">
      <section className="page-intro" aria-labelledby="temperature-volume-title">
        <div>
          <p className="eyebrow">Dedicated scientific figure</p>
          <h1 id="temperature-volume-title">Temperature Volume Explorer</h1>
        </div>
        <p className="intro-copy">Drag-select a loaded sub-region, clip from the top or west, and inspect smoothly interpolated rendering of the real Copernicus temperature grid.</p>
      </section>
      <OceanScene3D dataSource="demo" initialVariable="thetao" temperatureOnly />
    </main>
  );
}

export default TemperatureVolumeExplorerPage;