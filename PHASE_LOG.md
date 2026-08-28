# Phase Log

## Phase 0 — Scaffolding

- **Status:** Complete
- **Files changed:**
  - `.gitignore`
  - `backend/main.py`
  - `backend/requirements.txt`
  - `backend/data/.gitkeep`
  - `backend/services/slicer.py`
  - `backend/services/argo.py`
  - `backend/routers/ocean.py`
  - `backend/routers/argo.py`
  - `frontend/index.html`
  - `frontend/package.json`
  - `frontend/package-lock.json`
  - `frontend/vite.config.js`
  - `frontend/src/main.jsx`
  - `frontend/src/App.jsx`
  - `frontend/src/api/client.js`
  - `frontend/src/components/HeatmapCanvas.jsx`
  - `frontend/src/components/OceanScene3D.jsx`
  - `frontend/src/components/DepthTimeSlider.jsx`
  - `frontend/src/components/ArgoOverlay.jsx`
  - `frontend/src/components/ProfileChart.jsx`
  - `PHASE_LOG.md`
- **Deviations from the plan:** Added the dependency manifests, Vite entry/configuration files, `.gitignore`, and `backend/data/.gitkeep` needed to install, run, build, and preserve the scaffold. Files assigned to later phases in the section 6 repository structure are empty placeholders only; no Phase 1 or later functionality was implemented.
- **Credentials/data access:** None required for Phase 0.
- **Manual test:**
  1. From the repository root, run `python -m pip install -r backend/requirements.txt`.
  2. Start the API with `python -m uvicorn backend.main:app --reload`.
  3. In another terminal, run `npm install --prefix frontend` and then `npm run dev --prefix frontend`.
  4. Open `http://localhost:5173` and confirm the page shows **Backend connected**.
  5. Optionally open `http://127.0.0.1:8000/health` and confirm it returns `{"status":"ok"}`.
- **Automated validation:** FastAPI's in-process client confirmed `GET /health` returns HTTP 200 with `{"status":"ok"}`; `npm run build --prefix frontend` completed successfully.

## Phase 1 — Data Slicing API

- **Status:** Complete
- **Files changed:**
  - `backend/main.py`
  - `backend/requirements.txt`
  - `backend/routers/ocean.py`
  - `backend/services/slicer.py`
  - `PHASE_LOG.md`
- **Dataset:** Copernicus Marine product `GLOBAL_ANALYSISFORECAST_PHY_001_024`, daily-mean dataset `cmems_mod_glo_phy-thetao_anfc_0.083deg_P1D-m`, variable `thetao`, longitude 68–90°E, latitude 5–22°N, latest seven available daily coordinates resolved at download time (`2026-08-31T00:00:00Z` through `2026-09-06T00:00:00Z`), and model depths from 0.494 m through 1941.893 m (all available levels within the requested 0–2000 m range).
- **Local data file:** `backend/data/copernicus_thetao_india_20260831_20260906.nc` (60,869,894 bytes; SHA-256 `D627CD368EE3F8C520B88FF0142D796F26D62E15900D6CF27E8F086094523D96`). The file is intentionally gitignored.
- **Deviations from the plan:** The architecture did not define a Phase 1 response schema or time query parameter. The endpoint returns separate `latitudes` and `longitudes` vectors plus a 2D `values` matrix, uses JSON `null` for land/missing cells, selects the nearest available model depth, and uses the latest time in the downloaded subset. Only `thetao` is supported in Phase 1. No `/api/layers` or later-phase behavior was implemented.
- **Credentials/data access:** Copernicus Marine authentication was configured interactively by the user. No credentials are stored in or committed to this repository.
- **Manual test:**
  1. From the repository root, install dependencies into the backend environment with `uv pip install --python backend/.venv/Scripts/python.exe -r backend/requirements.txt` (skip installation if already present).
  2. Ensure the gitignored NetCDF file named above exists in `backend/data/`.
  3. From the repository root, start the API with `python -m uvicorn backend.main:app --reload`.
  4. Open `http://127.0.0.1:8000/api/slice?depth=0&variable=thetao`.
  5. Confirm HTTP 200 and JSON containing `"variable":"thetao"`, `"unit":"degrees_C"`, `"requested_depth":0.0`, `"depth":0.49402499198913574`, `"time":"2026-09-06T00:00:00Z"`, 205 latitudes, 265 longitudes, and a 205×265 `values` matrix with realistic surface temperatures (approximately 24.71–32.07 °C in finite ocean cells).
- **Automated validation:** Python compilation and direct service assertions passed against the real NetCDF subset. Live Uvicorn requests confirmed HTTP 200 for a valid slice, HTTP 400 for unsupported variable `so`, HTTP 422 for depth above 2000 m, strict JSON serialization, and the unchanged `/health` endpoint.