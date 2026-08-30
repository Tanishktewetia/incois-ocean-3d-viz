const COMPARISON_ROWS = [
  {
    tool: "Ferret",
    primaryUse: "Command-line/scriptable scientific analysis and plotting.",
    formats: "NetCDF; ASCII and binary input",
    interface: "Command-line / scripts",
    coVisualization: "No persistent interactive 3D co-visualization",
    sources: [
      ["NOAA PMEL history", "https://ferret.pmel.noaa.gov/static/Documentation/rostock_paper/paper.html"],
      ["Ferret NetCDF guide", "https://ferret.pmel.noaa.gov/Ferret/documentation/users-guide/data-set-basics/NETCDF-DATA"],
      ["Ferret overview", "https://en.wikipedia.org/wiki/Ferret_Data_Visualization_and_Analysis"],
    ],
  },
  {
    tool: "Ocean Data View",
    primaryUse: "Point/profile, time-series, trajectory, and gridded ocean-data analysis.",
    formats: "NetCDF CF/COARDS/GDT/CDC; ODV spreadsheet ASCII",
    interface: "Desktop application",
    coVisualization: "No built-in 3D volumetric model-field rendering",
    sources: [
      ["ODV", "https://odv.awi.de/"],
      ["BODC ODV format", "https://www.bodc.ac.uk/resources/delivery_formats/odv_format/"],
    ],
  },
  {
    tool: "MATLAB ocean toolboxes",
    primaryUse: "Programmatic workflows assembled from community Argo, mapping, seawater, NetCDF, and ocean-data toolboxes.",
    formats: "Argo NetCDF; NetCDF/OPeNDAP/GRIB; toolbox-specific structures",
    interface: "Programming workspace / scripts",
    coVisualization: "No out-of-the-box model/instrument co-display",
    sources: [
      ["Argo Toolbox", "https://www.mathworks.com/matlabcentral/fileexchange/54503-argo-toolbox"],
      ["SEA-MAT", "https://sea-mat.github.io/sea-mat/"],
      ["NCTOOLBOX example", "https://polar.ncep.noaa.gov/global/examples/usingmatlab2.shtml"],
      ["ocean_data_tools", "https://github.com/lnferris/ocean_data_tools"],
    ],
  },
];

const OCEANSCOPE_FEATURES = [
  ["Browser-native 3D", "Open the Explorer to rotate a Copernicus model volume and move through its real variables, depths, and times.", "/explorer"],
  ["Observation comparison", "Select the real Core Argo or BGC-Argo markers to inspect profiles beside the model and view the implemented temperature RMSE comparison.", "/explorer"],
  ["Researcher ingestion", "Use the Data Lab in the Explorer to upload a NetCDF dataset into the existing visualization workflow.", "/explorer"],
  ["OGC delivery", "Open the implemented WMS capabilities or WCS description routes exposed by this application.", "http://127.0.0.1:8000/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities"],
];

function SourceLinks({ sources }) {
  return (
    <span className="comparison-sources">
      {sources.map(([label, href], index) => (
        <span key={href}>
          {index > 0 && ", "}
          <a href={href} target="_blank" rel="noreferrer">{label}</a>
        </span>
      ))}
    </span>
  );
}

function ComparisonPage() {
  return (
    <main className="comparison-page">
      <section className="comparison-hero" aria-labelledby="comparison-title">
        <div>
          <p className="eyebrow">Phase 14 · comparison & justification</p>
          <h1 id="comparison-title">The case for a connected ocean view.</h1>
          <p className="comparison-lede">OceanScope is designed around one specific gap: bringing model fields and in-situ observations into the same browser-native 3D workspace, with the evidence and provenance visible beside the scene.</p>
        </div>
        <aside className="comparison-hero-note">
          <span>Evidence standard</span>
          <strong>Every external comparison below links to the research sources recorded in the architecture.</strong>
          <small>OceanScope capabilities are shown through references to this app's working Explorer and API routes.</small>
        </aside>
      </section>

      <section className="comparison-table-section" aria-labelledby="comparison-table-title">
        <div className="section-heading">
          <div><p className="eyebrow">The documented landscape</p><h2 id="comparison-table-title">Different tools, different surfaces</h2></div>
          <p>The table keeps the comparison narrow: primary use, formats, interface, and whether the research describes native 3D co-visualization.</p>
        </div>
        <div className="comparison-table-wrap">
          <table className="comparison-table">
            <caption>Source-linked comparison of established ocean-data tools</caption>
            <thead><tr><th scope="col">Tool</th><th scope="col">Primary use</th><th scope="col">Data format(s)</th><th scope="col">Interface</th><th scope="col">3D co-visualization</th><th scope="col">Sources</th></tr></thead>
            <tbody>
              {COMPARISON_ROWS.map((row) => (
                <tr key={row.tool}>
                  <th scope="row">{row.tool}</th>
                  <td>{row.primaryUse}</td>
                  <td>{row.formats}</td>
                  <td>{row.interface}</td>
                  <td><span className="comparison-status">{row.coVisualization}</span></td>
                  <td><SourceLinks sources={row.sources} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="adds-section" aria-labelledby="adds-title">
        <div className="section-heading"><div><p className="eyebrow">What OceanScope adds</p><h2 id="adds-title">A working bridge between the views</h2></div><p>This is a product-level description of features already connected in the repository, not a claim that the other tools cannot do anything else.</p></div>
        <div className="adds-grid">
          {OCEANSCOPE_FEATURES.map(([title, text, href], index) => (
            <article className="adds-card" key={title}>
              <span className="adds-index">0{index + 1}</span>
              <h3>{title}</h3>
              <p>{text}</p>
              <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noreferrer" : undefined}>
                {href.startsWith("http") ? "Open API reference" : "Open Explorer"} <span aria-hidden="true">→</span>
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="proof-section" aria-labelledby="proof-title">
        <div className="section-heading"><div><p className="eyebrow">Proof from the product</p><h2 id="proof-title">References, not reproduced interfaces</h2></div><p>We do not reproduce screenshots of the other tools. Use these working OceanScope surfaces as the evidence for what this project actually implements.</p></div>
        <div className="proof-layout">
          <div className="proof-browser-card">
            <div className="proof-browser-bar"><span /><span /><span /><strong>oceanscope / explorer</strong></div>
            <div className="proof-browser-content"><div className="proof-map"><i /><i /><i /><i /></div><div className="proof-side"><b>Model volume</b><span>Variable · depth · time</span><span>Observation markers</span><span>Profile + RMSE</span></div></div>
            <p>Reference view: the live Explorer combines the scene, controls, and observation profile in this app.</p>
            <a className="primary-link" href="/explorer">Open working Explorer <span aria-hidden="true">→</span></a>
          </div>
          <div className="proof-checklist">
            <article><span>01</span><div><h3>Open the Explorer</h3><p>Verify the browser-native volume, variable controls, depth/time controls, and markers.</p></div></article>
            <article><span>02</span><div><h3>Select an observation</h3><p>Verify the profile view and the implemented model comparison flow.</p></div></article>
            <article><span>03</span><div><h3>Check the standards routes</h3><p>Verify the WMS capabilities response and the WCS coverage description from the running backend.</p></div></article>
          </div>
        </div>
      </section>

      <section className="comparison-cta"><div><p className="eyebrow">Keep the evidence close</p><h2>Compare the sources. Then inspect the working view.</h2></div><div className="comparison-cta-actions"><a className="primary-link" href="/explorer">Launch Explorer <span aria-hidden="true">→</span></a><a className="secondary-link" href="/about">Read Mission & impact</a></div></section>
    </main>
  );
}

export default ComparisonPage;
