import OceanScene3D from "../components/OceanScene3D.jsx";

const CAPABILITIES = [
  "Temperature, salinity, and current magnitude",
  "Observation profiles and temperature RMSE",
  "True marching-cubes isosurfaces",
  "Real Copernicus current vectors",
  "GEBCO bathymetry",
  "Researcher NetCDF upload",
  "WMS 1.3.0 and WCS 2.0.1 endpoints",
];

const BEFORE_STEPS = [
  "Download large NetCDF archives",
  "Write scripts to subset each variable",
  "Switch tools for maps and profiles",
  "Manually align observations and time",
  "Export again for GIS collaboration",
];

const AFTER_STEPS = [
  "Open a bounded India EEZ volume",
  "Move through variable, depth, and time",
  "Overlay and inspect observations",
  "Compare model profiles with RMSE",
  "Share via browser, WMS, or WCS",
];

function LandingPage() {
  return (
    <main className="landing-page">
      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero-copy">
          <p className="eyebrow">The mission</p>
          <h1 id="landing-title">From fragmented files<br />to a <span>living ocean picture.</span></h1>
          <p>OceanScope unifies forecast volumes, observation profiles, validation, researcher uploads, and GIS delivery in a single browser workspace—without hiding where the data came from.</p>
          <div className="landing-actions">
            <a className="primary-link" href="/explorer">Explore OceanScope <span aria-hidden="true">→</span></a>
            <a className="secondary-link" href="/about">See how it works</a>
          </div>
        </div>
        <div className="landing-live-scene" id="live-scene">
          <OceanScene3D dataSource="demo" presentation />
        </div>
      </section>

      <section className="landing-problem" aria-labelledby="landing-problem-title">
        <div className="section-heading">
          <div><p className="eyebrow">The problem</p><h2 id="landing-problem-title">One question. Far fewer barriers.</h2></div>
        </div>
        <div className="comparison-grid">
          <article className="workflow-card before-card">
            <span className="card-index">Before</span><h3>The multi-tool workflow</h3>
            <ol>{BEFORE_STEPS.map((step) => <li key={step}>{step}</li>)}</ol>
            <p>Slow iteration · fragmented context · specialist access</p>
          </article>
          <div className="comparison-arrow" aria-hidden="true">→</div>
          <article className="workflow-card after-card">
            <span className="card-index">With OceanScope</span><h3>A connected scientific view</h3>
            <ol>{AFTER_STEPS.map((step) => <li key={step}>{step}</li>)}</ol>
            <p>Faster insight · traceable evidence · interoperable output</p>
          </article>
        </div>
      </section>

      <section className="landing-capabilities" aria-labelledby="landing-capabilities-title">
        <div className="section-heading">
          <div><p className="eyebrow">What it does</p><h2 id="landing-capabilities-title">One workspace for the water column.</h2></div>
        </div>
        <div className="landing-capability-grid">
          {CAPABILITIES.map((capability, index) => (
            <article key={capability}><span>{String(index + 1).padStart(2, "0")}</span><h3>{capability}</h3><b aria-label="Implemented">✓</b></article>
          ))}
        </div>
      </section>

      <section className="landing-proof" aria-labelledby="landing-proof-title">
        <div>
          <p className="eyebrow">Proof from the product</p>
          <h2 id="landing-proof-title">The view is live, not generated.</h2>
          <p>The hero uses the actual Explorer scene and model-layer API in a lightweight presentation mode. It is the same scientific view, with its application controls reserved for the full workspace.</p>
        </div>
        <div className="landing-proof-actions">
          <a className="secondary-link" href="#live-scene">View the live scene</a>
          <a className="primary-link" href="/explorer">Open working Explorer <span aria-hidden="true">→</span></a>
        </div>
      </section>

      <section className="landing-final-cta" aria-labelledby="landing-cta-title">
        <div><p className="eyebrow">Ready to explore?</p><h2 id="landing-cta-title">See the India EEZ as a connected system.</h2></div>
        <a className="primary-link" href="/explorer">Explore OceanScope <span aria-hidden="true">→</span></a>
      </section>
    </main>
  );
}

export default LandingPage;