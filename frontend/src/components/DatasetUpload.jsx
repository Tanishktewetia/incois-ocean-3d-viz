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
    <section
      aria-labelledby="dataset-source-title"
      style={{ padding: "12px 16px", marginBottom: "16px", border: "1px solid #526978" }}
    >
      <h2 id="dataset-source-title">Dataset source</h2>
      <label style={{ marginRight: "16px" }}>
        <input
          type="radio"
          name="dataset-source"
          value="demo"
          checked={dataSource === "demo"}
          onChange={() => onDataSourceChange("demo")}
        />{" "}
        Copernicus Marine temperature data (India EEZ)
      </label>
      <label>
        <input
          type="radio"
          name="dataset-source"
          value="upload"
          checked={dataSource === "upload"}
          disabled={!upload}
          onChange={() => onDataSourceChange("upload")}
        />{" "}
        My upload
      </label>
      <form onSubmit={handleSubmit} style={{ marginTop: "12px" }}>
        <label>
          Scientist NetCDF (`thetao`):{" "}
          <input ref={fileInputRef} type="file" accept=".nc,application/x-netcdf" />
        </label>{" "}
        <button type="submit" disabled={status === "uploading"}>
          {status === "uploading" ? "Uploading…" : "Upload and use"}
        </button>
      </form>
      <p>Maximum 100 MiB. Required dimensions: time, depth, latitude, longitude.</p>
      {message && <p role={status === "error" ? "alert" : "status"}>{message}</p>}
    </section>
  );
}

export default DatasetUpload;