import { useRef, useState } from "react";
import { uploadInstrumentDataset, uploadOceanDataset } from "../api/client.js";

const SLOTS = [
  ["thetao", "Temperature", "Optional · NetCDF (.nc)", "Required dimensions: time, depth, latitude, longitude"],
  ["so", "Salinity", "Optional · NetCDF (.nc)", "Required dimensions: time, depth, latitude, longitude"],
  ["currents", "Currents", "Optional · NetCDF (.nc)", "Required variables: uo and vo with time, depth, latitude, longitude"],
  ["instruments", "Instrument / point data", "Optional · CSV or NetCDF", "Required: latitude, longitude, depth, time + one measured value"],
];

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
    <p>Upload any subset independently. OceanScope uses your provided fields and keeps using bundled Copernicus data for the rest.</p>
    <div className="source-options">
      <label className={`source-option ${dataSource === "demo" ? "active" : ""}`}><input type="radio" name="dataset-source" checked={dataSource === "demo"} onChange={() => onDataSourceChange("demo")} /><span><strong>Copernicus Marine</strong><br />India EEZ forecast subset</span></label>
      <label className={`source-option ${dataSource === "upload" ? "active" : ""}`}><input type="radio" name="dataset-source" checked={dataSource === "upload"} disabled={!Object.keys(uploads).some((key) => key !== "instruments" && uploads[key])} onChange={() => onDataSourceChange("upload")} /><span><strong>Researcher uploads</strong><br />Use validated fields in the scene</span></label>
    </div>
    <div className="upload-slots">{SLOTS.map(([type, label, format, contract]) => <div className="upload-slot" key={type}>
      <div className="upload-slot-heading"><div><strong>{label}</strong><small>{format}</small></div><span className={uploads[type] ? "slot-status ready" : "slot-status"}>{uploads[type] ? "Ready" : "Optional"}</span></div>
      <p className="upload-slot-help">{contract}</p>
      <div className="upload-slot-row"><input ref={(node) => { inputRefs.current[type] = node; }} type="file" accept={type === "instruments" ? ".csv,.nc" : ".nc"} aria-label={`Upload ${label}`} /><button className="secondary-button" type="button" disabled={busy === type} onClick={() => handleUpload(type)}>{busy === type ? "Validating…" : "Validate"}</button></div>
    </div>)}</div>
    <p className="upload-help">Model files use the shared coordinate contract. Point data accepts CSV or NetCDF with the required fields above.</p>
    {message && <p className="upload-message" role="status">{message}</p>}
  </section>;
}
export default DatasetUpload;
