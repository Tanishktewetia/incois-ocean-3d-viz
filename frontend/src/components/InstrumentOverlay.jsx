import { useEffect, useMemo, useState } from "react";
import { getInstrumentProfile, getInstruments } from "../api/client.js";
import ProfileChart from "./ProfileChart.jsx";

const LEGEND = [
  ["#ffa629", "●", "Core Argo — real GDAC temperature"],
  ["#56d98b", "◆", "BGC-Argo — real GDAC chlorophyll/oxygen"],
  ["#d47cff", "▲/■", "Glider/CTD — SAMPLE DATA, not live"],
];

function InstrumentOverlay({ selectedInstrumentId, onInstrumentsLoaded }) {
  const [catalog, setCatalog] = useState(null);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    getInstruments({ signal: controller.signal })
      .then((payload) => {
        setCatalog(payload);
        onInstrumentsLoaded(payload.instruments);
      })
      .catch((requestError) => {
        if (requestError.name !== "AbortError") {
          setError("Unable to load the multi-instrument catalog.");
        }
      });
    return () => controller.abort();
  }, [onInstrumentsLoaded]);

  useEffect(() => {
    setProfile(null);
    if (!selectedInstrumentId) {
      return undefined;
    }
    const controller = new AbortController();
    setError("");
    getInstrumentProfile(selectedInstrumentId, { signal: controller.signal })
      .then(setProfile)
      .catch((requestError) => {
        if (requestError.name !== "AbortError") {
          setError("Unable to load that instrument profile.");
        }
      });
    return () => controller.abort();
  }, [selectedInstrumentId]);

  const counts = useMemo(() => {
    if (!catalog) return {};
    return catalog.instruments.reduce((result, instrument) => ({
      ...result,
      [instrument.instrument_type]: (result[instrument.instrument_type] || 0) + 1,
    }), {});
  }, [catalog]);

  return (
    <section aria-labelledby="instrument-profile-title">
      <div>
      <p className="instrument-intro" id="instrument-profile-title">Select a marker in the 3D volume to inspect its depth profile and model agreement.</p>
      <div className="instrument-legend" aria-label="Instrument marker legend">
        {LEGEND.map(([color, symbol, label]) => (
          <span key={label}><strong style={{ color }}>{symbol}</strong> {label}</span>
        ))}
      </div>
      <p className="sample-note">
        <strong>Glider/CTD records are SAMPLE DATA — for demonstration only; not a live feed.</strong>{" "}
        A live feed can use the same instrument schema without frontend changes.
      </p>
      {!catalog && !error && <p className="instrument-status">Loading real Argo GDAC and labelled sample profiles…</p>}
      {catalog && (
        <p className="instrument-status">
          {counts.core_argo || 0} Core Argo · {counts.bgc_argo || 0} QC-usable BGC-Argo ·{" "}
          {(counts.glider || 0) + (counts.ctd || 0)} labelled sample Glider/CTD ·{" "}
          {catalog.start_time.slice(0, 10)} to {catalog.end_time.slice(0, 10)}.
        </p>
      )}
      {error && <p className="control-error" role="alert">{error}</p>}
      </div>
      {!selectedInstrumentId && <div className="empty-profile"><strong>No observation selected</strong><p>Click an orange, green, or purple marker in the volume to begin a comparison.</p></div>}
      {selectedInstrumentId && !profile && !error && <div className="empty-profile"><strong>Loading selected profile…</strong></div>}
      {profile && (
        <article className="profile-card">
          <h4>
            {profile.instrument_label} {profile.platform_number}
            {profile.cycle_number !== null && profile.cycle_number !== undefined
              ? `, cycle ${profile.cycle_number}`
              : ""}
          </h4>
          {profile.data_status === "sample" && (
            <p role="status" className="sample-note">
              <strong>SAMPLE DATA — for demonstration only; this is not a live observation.</strong>
            </p>
          )}
          <p className="profile-meta">
            {profile.time.replace("T", " ").replace("Z", " UTC")} ·{" "}
            {profile.latitude.toFixed(3)}°N, {profile.longitude.toFixed(3)}°E ·{" "}
            {profile.variables.join(", ")}
          </p>
          {profile.model_comparison && (
            <div className="rmse-card"><span>Temperature RMSE</span><small>{profile.model_comparison.paired_count} pairs · {profile.model_comparison.model_time.slice(0, 10)}</small><strong>{profile.model_comparison.rmse.toFixed(3)} °C</strong></div>
          )}
          <p className="profile-meta">Source: {profile.source}</p>
          <ProfileChart profile={profile} />
        </article>
      )}
    </section>
  );
}

export default InstrumentOverlay;
