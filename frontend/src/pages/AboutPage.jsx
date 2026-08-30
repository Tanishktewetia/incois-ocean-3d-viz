const COVERAGE = [
  ["Variable intelligence", "Temperature, salinity, and current magnitude with real ranges and units."],
  ["Scientific controls", "Depth, time, opacity, scale, and vertical exaggeration in one workspace."],
  ["True isosurfaces", "Marching-cubes extraction from the model volume—not a decorative approximation."],
  ["Multi-instrument overlay", "Core Argo, BGC-Argo, and clearly labelled sample Glider/CTD profiles."],
  ["Model validation", "Click an observation to compare profiles and calculate temperature RMSE."],
  ["Researcher ingestion", "Upload a CF-style NetCDF temperature cube and inspect it immediately."],
  ["GIS interoperability", "Standards-based WMS 1.3.0 and WCS 2.0.1 endpoints for external tools."],
  ["Outreach-ready UI", "A guided, browser-based experience that makes complex ocean data legible."],
];

function AboutPage() {
  return (
    <main className="about-page">
      <section className="about-hero">
        <div>
          <p className="eyebrow">The mission</p>
          <h1>From fragmented files<br />to a <span>living ocean picture.</span></h1>
          <p className="about-problem">Ocean scientists should not need a chain of specialist tools to understand one water column.</p>
          <p className="about-lede">OceanScope unifies forecast volumes, observation profiles, validation, researcher uploads, and GIS delivery in a single browser workspace—without hiding where the data came from.</p>
          <a className="primary-link" href="/explorer">Open the 3D explorer <span aria-hidden="true">→</span></a>
        </div>
        <div className="mission-orbit" aria-label="OceanScope workflow: model, observations, and standards converge into one decision view">
          <div className="orbit-ring ring-one" /><div className="orbit-ring ring-two" />
          <span className="orbit-node node-model">Model</span>
          <span className="orbit-node node-observe">Observe</span>
          <span className="orbit-node node-share">Share</span>
          <strong>ONE<br />OCEAN<br />VIEW</strong>
        </div>
      </section>

      <section className="workflow-section" aria-labelledby="workflow-title">
        <div className="section-heading"><div><p className="eyebrow">Before / after</p><h2 id="workflow-title">One question. Far fewer barriers.</h2></div></div>
        <div className="comparison-grid">
          <article className="workflow-card before-card">
            <span className="card-index">Before</span><h3>The multi-tool workflow</h3>
            <ol><li>Download large NetCDF archives</li><li>Write scripts to subset each variable</li><li>Switch tools for maps and profiles</li><li>Manually align observations and time</li><li>Export again for GIS collaboration</li></ol>
            <p>Slow iteration · fragmented context · specialist access</p>
          </article>
          <div className="comparison-arrow" aria-hidden="true">→</div>
          <article className="workflow-card after-card">
            <span className="card-index">With OceanScope</span><h3>A connected scientific view</h3>
            <ol><li>Open a bounded India EEZ volume</li><li>Move through variable, depth, and time</li><li>Overlay and inspect observations</li><li>Compare model profiles with RMSE</li><li>Share via browser, WMS, or WCS</li></ol>
            <p>Faster insight · traceable evidence · interoperable output</p>
          </article>
        </div>
      </section>

      <section className="guided-section" aria-labelledby="guided-title">
        <div className="section-heading"><div><p className="eyebrow">Guided explorer</p><h2 id="guided-title">Built to explain itself.</h2></div><p>Every control remains close to the evidence it changes, so first-time users can move from orientation to analysis without a manual.</p></div>
        <div className="guided-frame">
          <div className="guided-sidebar"><span>01</span><strong>Choose the signal</strong><small>Variable, range, depth, time, and rendering controls.</small></div>
          <div className="guided-scene"><div className="guided-volume"><i /><i /><i /><i /></div><span className="callout callout-one">02 · Explore the real volume</span><span className="callout callout-two">03 · Select an observation</span></div>
          <div className="guided-profile"><span>04</span><strong>Validate in context</strong><small>Profile charts and RMSE sit beside the scene.</small><svg viewBox="0 0 220 120" aria-hidden="true"><polyline points="4,105 38,92 64,96 95,65 124,72 155,36 190,42 216,12" /><polyline className="secondary-line" points="4,110 38,101 64,82 95,78 124,55 155,50 190,25 216,20" /></svg></div>
        </div>
      </section>

      <section className="impact-section">
        <p className="eyebrow">Impact</p>
        <blockquote>Turn days of ocean-data preparation into minutes of visual, comparable, shareable understanding.</blockquote>
        <p>For researchers, planners, educators, and operational teams working across the Indian Ocean.</p>
      </section>

      <section className="coverage-section" aria-labelledby="coverage-title">
        <div className="section-heading"><div><p className="eyebrow">PS 26067 coverage</p><h2 id="coverage-title">The requirement is the product.</h2></div><p>Every core problem-statement capability is implemented and connected to the same data workflow.</p></div>
        <div className="coverage-grid">{COVERAGE.map(([title, text], index) => <article key={title}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{title}</h3><p>{text}</p></div><b aria-label="Implemented">✓</b></article>)}</div>
      </section>
      <section className="about-cta"><div><p className="eyebrow">Ready to explore?</p><h2>See the India EEZ as a connected system.</h2></div><a className="primary-link" href="/explorer">Launch OceanScope <span aria-hidden="true">→</span></a></section>
    </main>
  );
}

export default AboutPage;