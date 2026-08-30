import { useRef, useState } from "react";
import { uploadInstrumentDataset, uploadOceanDataset } from "../api/client.js";

const SLOTS = [["thetao", "Temperature", "thetao", ".nc"], ["so", "Salinity", "so", ".nc"], ["currents", "Currents", "uo + vo", ".nc"], ["instruments", "Instrument / point data", "latitude · longitude · depth · time", ".csv,.nc"]];

function DatasetUpload({ dataSource, uploads = {}, onDataSourceChange, onUpload }) {
  const inputRefs = useRef({});
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  async function handleUpload(type) {
    const file = inputRefs.current[type]?.files?.[0];
    if (!file) { setMessage(`Choose a ${type === "instruments" ? ".csv or .nc" : ".nc"} file first.`); return; }
    setBusy(type); setMessage("");
    try {
      const metadata = type === "instruments" ? await uploadInstrumentDataset(file) : await uploadOceanDataset(file, type);
      onUpload(type, metadata);
      if (type !== "instruments") onDataSourceChange("upload");
      setMessage(`${metadata.filename || file.name} validated and ready.`);
    } catch (error) { setMessage(error.message); } finally { setBusy(""); }
  }
  return <section className="data-card dataset-upload-card" aria-labelledby="dataset-source-title">
    <p className="eyebrow">Source control</p><h3 id="dataset-source-title">Dataset source</h3>
    <p>Load optional model fields independently; a shared grid is not required.</p>
    <div className="source-options">
      <label className={`source-option ${dataSource === "demo" ? "active" : ""}`}><input type="radio" name="dataset-source" checked={dataSource === "demo"} onChange={() => onDataSourceChange("demo")} /><span><strong>Copernicus Marine</strong><br />India EEZ forecast subset</span></label>
      <label className={`source-option ${dataSource === "upload" ? "active" : ""}`}><input type="radio" name="dataset-source" checked={dataSource === "upload"} disabled={!Object.keys(uploads).some((key) => key !== "instruments" && uploads[key])} onChange={() => onDataSourceChange("upload")} /><span><strong>Researcher uploads</strong><br />Use validated fields in the scene</span></label>
    </div>
    <div className="upload-slots">{SLOTS.map(([type, label, contract, accept]) => <div className="upload-slot" key={type}>
      <div className="upload-slot-heading"><div><strong>{label}</strong><small>{contract}</small></div><span className={uploads[type] ? "slot-status ready" : "slot-status"}>{uploads[type] ? "Ready" : "Optional"}</span></div>
      <div className="upload-slot-row"><input ref={(node) => { inputRefs.current[type] = node; }} type="file" accept={accept} aria-label={`Upload ${label}`} /><button className="secondary-button" type="button" disabled={busy === type} onClick={() => handleUpload(type)}>{busy === type ? "Validating…" : "Validate"}</button></div>
    </div>)}</div>
    <p className="upload-help">NetCDF model fields require time, depth, latitude, longitude. Point data accepts CSV with those columns and one or more measured values.</p>
    {message && <p className="upload-message" role="status">{message}</p>}
  </section>;
}
export default DatasetUpload;
