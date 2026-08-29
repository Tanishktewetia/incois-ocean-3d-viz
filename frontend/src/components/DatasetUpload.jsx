import { useRef, useState } from "react";
import { uploadOceanDataset } from "../api/client.js";

function DatasetUpload({ dataSource, upload, onDataSourceChange, onUpload }) {
  const fileInputRef = useRef(null);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setStatus("error");
      setMessage("Choose a .nc file first.");
      return;
    }

    setStatus("uploading");
    setMessage("Validating and loading NetCDF data…");
    try {
      const metadata = await uploadOceanDataset(file);
      onUpload(metadata);
      setStatus("ready");
      setMessage(
        `Loaded ${metadata.filename}: ${metadata.times} time × ${metadata.depths} depth × ${metadata.latitudes} latitude × ${metadata.longitudes} longitude.`,
      );
    } catch (error) {
      setStatus("error");
      setMessage(error.message);
    }
  }

  return (
    <section className="data-card" aria-labelledby="dataset-source-title">
      <p className="eyebrow">Source control</p>
      <h3 id="dataset-source-title">Dataset source</h3>
      <p>Switch between the bundled model and a validated researcher dataset.</p>
      <div className="source-options">
      <label className="source-option" title="Use the local Copernicus Marine India EEZ subset">
        <input
          type="radio"
          name="dataset-source"
          value="demo"
          aria-label="Use Copernicus Marine India EEZ forecast subset"
          checked={dataSource === "demo"}
          onChange={() => onDataSourceChange("demo")}
        />
        <span><strong>Copernicus Marine</strong><br />India EEZ forecast subset</span>
      </label>
      <label className="source-option" title="Use the most recently validated NetCDF upload">
        <input
          type="radio"
          name="dataset-source"
          value="upload"
          aria-label="Use the most recently validated NetCDF upload"
          checked={dataSource === "upload"}
          disabled={!upload}
          onChange={() => onDataSourceChange("upload")}
        />
        <span><strong>My upload</strong><br />{upload ? upload.filename : "Upload a file to enable"}</span>
      </label>
      </div>
      <form className="upload-form" onSubmit={handleSubmit}>
        <input className="file-input" ref={fileInputRef} aria-label="Scientist NetCDF file containing thetao" title="Choose a CF-style NetCDF file containing thetao" type="file" accept=".nc,application/x-netcdf" />
        <button className="primary-button" type="submit" disabled={status === "uploading"} title="Validate and use this NetCDF dataset">
          {status === "uploading" ? "Uploading…" : "Upload and use"}
        </button>
      </form>
      <p className="upload-help">Maximum 100 MiB · `thetao` · time, depth, latitude, longitude.</p>
      {message && <p className="upload-message" role={status === "error" ? "alert" : "status"}>{message}</p>}
    </section>
  );
}

export default DatasetUpload;