import { useEffect, useMemo, useState } from "react";
import HeatmapCanvas from "../components/HeatmapCanvas.jsx";
import OceanScene3D from "../components/OceanScene3D.jsx";
import { getTemperatureProfile, getTemperatureTransect, getOceanLayers } from "../api/client.js";

function ProfileChart({ profile }) {
  if (!profile) return <p className="empty-state">Click the volume or minimap to pin a model column.</p>;
  const finite = profile.temperatures.filter(Number.isFinite);
  const min = Math.min(...finite); const max = Math.max(...finite);
  const width = 420; const height = 230;
  const points = profile.temperatures.map((value, index) => `${40 + ((value - min) / Math.max(max - min, 0.01)) * 350},${18 + (index / Math.max(profile.depths.length - 1, 1)) * 190}`).join(" ");
  return <svg className="scientific-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Temperature against depth profile"><line x1="40" y1="18" x2="40" y2="208" /><line x1="40" y1="208" x2="400" y2="208" /><polyline points={points} fill="none" stroke="#087f99" strokeWidth="3" /><text x="42" y="224">{min.toFixed(1)} °C</text><text x="350" y="224">{max.toFixed(1)} °C</text><text x="5" y="24">0 m</text><text x="2" y="207">{Math.max(...profile.depths).toFixed(0)} m</text></svg>;
}

function TransectChart({ transect }) {
  if (!transect) return <p className="empty-state">Choose two points on the minimap to sample a transect.</p>;
  const values = transect.temperatures.flat().filter(Number.isFinite);
  const min = Math.min(...values); const max = Math.max(...values);
  const width = 620; const height = 250;
  const rects = transect.temperatures.flatMap((row, depthIndex) => row.map((value, pointIndex) => {
    if (!Number.isFinite(value)) return null;
    const color = `hsl(${210 - ((value - min) / Math.max(max - min, 0.01)) * 190} 78% 45%)`;
    return <rect key={`${depthIndex}-${pointIndex}`} x={48 + pointIndex * (540 / Math.max(transect.distances_km.length - 1, 1))} y={18 + depthIndex * (210 / Math.max(transect.depths.length - 1, 1))} width={Math.max(2, 540 / Math.max(transect.distances_km.length - 1, 1) + 1)} height={Math.max(2, 210 / Math.max(transect.depths.length - 1, 1) + 1)} fill={color} />;
  }));
  return <div><svg className="scientific-chart transect-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Temperature transect cross-section"><rect x="48" y="18" width="540" height="210" fill="#eef7f8" />{rects}<text x="48" y="244">0 km</text><text x="540" y="244">{transect.distances_km.at(-1).toFixed(0)} km</text><text x="4" y="25">0 m</text><text x="0" y="225">{Math.max(...transect.depths).toFixed(0)} m</text></svg><small>Temperature range {min.toFixed(2)}–{max.toFixed(2)} °C · bilinear line sampling</small></div>;
}

function TemperatureVolumeExplorerPage() {
  const [profile, setProfile] = useState(null);
  const [transect, setTransect] = useState(null);
  const [points, setPoints] = useState([]);
  const [sliceDepth, setSliceDepth] = useState(null);
  const [depths, setDepths] = useState([]);
  const [error, setError] = useState("");
  const source = "demo";

  useEffect(() => { getOceanLayers({ variable: "thetao", source }).then((payload) => setDepths(payload.layers.map((layer) => layer.depth))).catch(() => setError("Unable to read model levels.")); }, []);
  const selectPoint = async ({ latitude, longitude }) => {
    setError("");
    try { setProfile(await getTemperatureProfile({ latitude, longitude, source })); } catch (requestError) { setError(requestError.message); }
  };
  const selectMapPoint = ({ latitude, longitude }) => {
    if (points.length === 1) {
      const next = [...points, { latitude, longitude }]; setPoints(next);
      getTemperatureTransect({ startLatitude: next[0].latitude, startLongitude: next[0].longitude, endLatitude: latitude, endLongitude: longitude, source }).then(setTransect).catch((requestError) => setError(requestError.message));
    } else { setPoints([{ latitude, longitude }]); selectPoint({ latitude, longitude }); }
  };
  const selectedLabel = useMemo(() => points.length === 2 ? "Transect ready — click the minimap to start a new line" : points.length === 1 ? "Start point set — click an end point" : "Click the minimap to choose a profile or transect start", [points]);
  return <main className="temperature-explorer-page"><section className="page-intro"><div><p className="eyebrow">Dedicated figure · Phase 20</p><h1>Temperature Volume Explorer</h1></div><p className="intro-copy">A focused view of the Copernicus temperature field: locate a point, inspect its vertical profile, and sample a real cross-section through the water column.</p></section><div className="temperature-explorer-grid"><aside className="temperature-minimap"><div className="dedicated-heading"><div><p className="eyebrow">Map view</p><h2>India EEZ locator</h2></div><span className="map-instruction">{selectedLabel}</span></div><HeatmapCanvas dataSource={source} variable="thetao" onMapClick={selectMapPoint} /><div className="section-controls"><label htmlFor="slice-depth">Slice from top</label><select id="slice-depth" value={sliceDepth ?? ""} onChange={(event) => setSliceDepth(event.target.value === "" ? null : Number(event.target.value))}><option value="">Full water column</option>{depths.map((depth) => <option key={depth} value={depth}>{depth.toFixed(0)} m</option>)}</select><small>Snapped to real loaded model levels. Vertical exaggeration and isotherms remain in the 3D figure controls.</small></div></aside><section className="temperature-profile-panel"><div className="dedicated-heading"><div><p className="eyebrow">Point profile</p><h2>Temperature vs depth</h2></div>{profile && <span>{profile.latitude.toFixed(2)}°N · {profile.longitude.toFixed(2)}°E</span>}</div><ProfileChart profile={profile} /></section><section className="temperature-transect-panel"><div className="dedicated-heading"><div><p className="eyebrow">Transect panel</p><h2>Temperature cross-section</h2></div><span>Click two map points</span></div><TransectChart transect={transect} /></section></div>{error && <p className="control-error" role="alert">{error}</p>}<OceanScene3D dataSource={source} initialVariable="thetao" onDataSelect={selectPoint} sliceDepth={sliceDepth} /></main>;
}

export default TemperatureVolumeExplorerPage;
