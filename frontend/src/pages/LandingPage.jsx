import { useEffect, useRef } from "react";

const SIGNALS = [
  ["01", "Temperature", "Trace thermal structure from the surface to the deep ocean."],
  ["02", "Salinity", "Reveal water masses, fronts, and mixing across the India EEZ."],
  ["03", "Currents", "Read direction and intensity through animated vector fields."],
  ["04", "Observations", "Compare model layers with Argo and BGC-Argo profiles."],
];

const WORKFLOW = [
  ["Ingest", "Copernicus forecasts, researcher NetCDF, and in-situ profiles enter one traceable pipeline."],
  ["Explore", "Move through variable, depth, and time inside a responsive three-dimensional volume."],
  ["Validate", "Select observations, inspect profiles, and quantify model agreement with RMSE."],
  ["Deliver", "Share analysis through the browser or standards-based WMS and WCS services."],
];

function OceanDepthScene() {
  const sceneRef = useRef(null);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    let frame;
    const update = () => {
      const rect = scene.getBoundingClientRect();
      const progress = Math.max(-1, Math.min(1, (window.innerHeight / 2 - rect.top) / window.innerHeight));
      scene.style.setProperty("--scroll-depth", progress.toFixed(3));
      frame = undefined;
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="landing-ocean-scene" ref={sceneRef} aria-label="Abstract three-dimensional ocean data volume">
      <div className="ocean-glow" />
      <div className="ocean-particles" aria-hidden="true">
        {Array.from({ length: 18 }, (_, index) => <i key={index} />)}
      </div>
      <div className="data-volume" aria-hidden="true">
        <div className="volume-grid volume-top" />
        <div className="volume-grid volume-side" />
        <div className="volume-grid volume-front" />
        <div className="depth-plane plane-one"><span>0 m</span></div>
        <div className="depth-plane plane-two"><span>200 m</span></div>
        <div className="depth-plane plane-three"><span>1,000 m</span></div>
        <div className="current-path path-one" />
        <div className="current-path path-two" />
        <div className="float-marker marker-one"><b /><span>ARGO 2903457</span></div>
        <div className="float-marker marker-two"><b /><span>BGC PROFILE</span></div>
      </div>
      <div className="scene-readout readout-top"><span>LIVE MODEL</span><strong>16 depth layers</strong></div>
      <div className="scene-readout readout-bottom"><span>INDIA EEZ</span><strong>68ΓÇô90┬░E ┬╖ 5ΓÇô22┬░N</strong></div>
      <div className="depth-scale" aria-hidden="true"><span>Surface</span><i /><span>5,000 m</span></div>
    </div>
  );
}

function LandingPage() {
  return (
    <main className="landing-page">
      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="hero-copy">
          <p className="landing-kicker"><span /> Ocean intelligence, in depth</p>
          <h1 id="landing-title">The ocean is not flat.<br /><em>Your data shouldnΓÇÖt be either.</em></h1>
          <p className="hero-lede">Explore forecasts, observations, and the full water column across IndiaΓÇÖs Exclusive Economic Zone in one scientifically traceable 3D workspace.</p>
          <div className="hero-actions">
            <a className="landing-primary" href="/explorer">Enter the 3D Explorer <span aria-hidden="true">Γåù</span></a>
            <a className="landing-secondary" href="#platform">Discover the platform <span aria-hidden="true">Γåô</span></a>
          </div>
          <div className="hero-proof" aria-label="Platform highlights">
            <span><strong>3D</strong> volumetric analysis</span>
            <span><strong>OGC</strong> interoperable</span>
            <span><strong>CF</strong> NetCDF ready</span>
          </div>
        </div>
        <OceanDepthScene />
        <a className="scroll-cue" href="#platform"><span>Scroll to descend</span><i /></a>
      </section>

      <section className="landing-manifesto" id="platform" aria-labelledby="manifesto-title">
        <p className="landing-section-index">01 / THE CHALLENGE</p>
        <div>
          <h2 id="manifesto-title">Ocean data has depth.<br />Most tools leave it behind.</h2>
          <p>Critical relationships between the surface, thermocline, seafloor, and moving observations are fragmented across files and specialist software. OceanScope brings them into one continuous viewΓÇöwithout compromising scientific provenance.</p>
        </div>
      </section>

      <section className="signal-section" aria-labelledby="signals-title">
        <div className="landing-section-heading">
          <p className="landing-section-index">02 / SIGNALS</p>
          <h2 id="signals-title">One ocean.<br /><span>Every dimension.</span></h2>
        </div>
        <div className="signal-grid">
          {SIGNALS.map(([number, title, copy]) => (
            <article key={title}>
              <span>{number}</span><div className={`signal-icon signal-${number}`} aria-hidden="true"><i /><i /><i /></div>
              <h3>{title}</h3><p>{copy}</p><a href="/explorer">Explore signal <b aria-hidden="true">ΓåÆ</b></a>
            </article>
          ))}
        </div>
      </section>

      <section className="depth-story" aria-labelledby="depth-title">
        <div className="depth-story-copy">
          <p className="landing-section-index">03 / THE WATER COLUMN</p>
          <h2 id="depth-title">Descend through<br /><span>the living system.</span></h2>
          <p>Move beyond surface maps. Slice through sixteen representative model depths, isolate variables, extract true isosurfaces, and see measured bathymetry beneath the water column.</p>
          <a className="landing-text-link" href="/about">Why this matters <span aria-hidden="true">ΓåÆ</span></a>
        </div>
        <div className="depth-diagram" aria-label="Water column from surface to abyssal depth">
          <div className="depth-zone zone-surface"><span><b>0 m</b> Surface</span><p>AirΓÇôsea exchange ┬╖ solar heating</p></div>
          <div className="depth-zone zone-mesopelagic"><span><b>200 m</b> Thermocline</span><p>Rapid gradients ┬╖ biological activity</p></div>
          <div className="depth-zone zone-deep"><span><b>1,000 m</b> Deep ocean</span><p>Water masses ┬╖ long-term circulation</p></div>
          <div className="depth-zone zone-floor"><span><b>5,000 m</b> GEBCO seafloor</span><p>Measured regional bathymetry</p></div>
        </div>
      </section>

      <section className="workflow-strip" aria-labelledby="workflow-landing-title">
        <div className="landing-section-heading compact">
          <p className="landing-section-index">04 / WORKFLOW</p>
          <h2 id="workflow-landing-title">From source to insight.</h2>
        </div>
        <div className="landing-workflow-grid">
          {WORKFLOW.map(([title, copy], index) => <article key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{copy}</p></article>)}
        </div>
      </section>

      <section className="landing-cta" aria-labelledby="landing-cta-title">
        <div className="cta-rings" aria-hidden="true"><i /><i /><i /></div>
        <p className="landing-section-index">THE OCEAN, CONNECTED</p>
        <h2 id="landing-cta-title">See what the surface<br />has been hiding.</h2>
        <p>Open the live workspace and explore the India EEZ as a volumeΓÇönot a flat map.</p>
        <a className="landing-primary" href="/explorer">Launch OceanScope <span aria-hidden="true">Γåù</span></a>
      </section>
    </main>
  );
}

export default LandingPage;
