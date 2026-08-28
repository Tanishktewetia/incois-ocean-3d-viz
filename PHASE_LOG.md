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

## Phase 2 — Flat 2D Heatmap

- **Status:** Complete
- **Files changed:**
  - `frontend/src/App.jsx`
  - `frontend/src/api/client.js`
  - `frontend/src/components/HeatmapCanvas.jsx`
  - `frontend/vite.config.js`
  - `PHASE_LOG.md`
- **Implementation:** The React app requests `GET /api/slice?depth=0&variable=thetao` and renders the returned 205×265 surface-temperature grid into an HTML canvas. Finite ocean temperatures use a blue-to-cyan-to-yellow-to-red scale derived from the slice range; missing land cells use a dark background. Latitude rows are flipped during drawing so north is at the top and east is to the right.
- **Deviations from the plan:** Added an `/api` Vite development proxy so the frontend can reuse the Phase 1 endpoint through its own origin. The view also displays the geographic bounds, selected model depth, temperature range, and data date beneath the canvas. No backend changes, depth/time controls, formal colorbar legend, 3D rendering, or later-phase functionality were added.
- **Credentials/data access:** No new credentials or dataset access were required; Phase 2 reuses the local Phase 1 subset through the existing API.
- **Manual test:**
  1. Ensure `backend/data/copernicus_thetao_india_20260831_20260906.nc` exists and frontend dependencies are installed with `npm install --prefix frontend`.
  2. From the repository root, start the backend with `backend/.venv/Scripts/python.exe -m uvicorn backend.main:app --reload`.
  3. In another terminal, start the frontend with `npm run dev --prefix frontend`.
  4. Open `http://localhost:5173` and confirm **Backend connected** appears above a flat **Surface temperature** heatmap.
  5. Confirm the map shows recognizable Indian Ocean land/ocean boundaries, cooler areas in blue/cyan, warmer areas in yellow/red, dark land cells, and metadata reading approximately `5.0–22.0°N, 68.0–90.0°E · 0.49 m · 24.71–32.07 °C · 2026-09-06`.
- **Automated validation:** `npm run build --prefix frontend` completed successfully. Running Uvicorn and Vite together confirmed the page loads and Vite proxies both `/health` and the unchanged `/api/slice` endpoint, returning the expected 205×265 grid.

## Phase 3 — 3D Depth Stack

- **Status:** Complete
- **Files changed:**
  - `backend/routers/ocean.py`
  - `backend/services/slicer.py`
  - `frontend/package.json`
  - `frontend/package-lock.json`
  - `frontend/src/App.jsx`
  - `frontend/src/api/client.js`
  - `frontend/src/components/HeatmapCanvas.jsx`
  - `frontend/src/components/OceanScene3D.jsx`
  - `frontend/src/utils/colorScale.js`
  - `PHASE_LOG.md`
- **Implementation:** Added `GET /api/layers?variable=thetao`, which returns shared coordinates/time metadata and eight 205×265 temperature grids for requested depths 0, 50, 100, 200, 500, 1000, 1500, and 2000 m. Their nearest available model levels are approximately 0.49, 47.37, 92.33, 186.13, 541.09, 1062.44, 1452.25, and 1941.89 m. The React app renders these grids as eight geographically proportioned Three.js planes stacked by model depth inside a wireframe volume. OrbitControls provides drag rotation and wheel zoom. The renderer, controls, textures, materials, geometries, resize observer, and animation frame are cleaned up when the component unmounts.
- **Colormap:** Moved the Phase 2 blue-to-cyan-to-yellow-to-red interpolation and dark missing-cell color into `frontend/src/utils/colorScale.js` and reused it in both views. The 3D textures use one finite temperature range across all eight layers so the cold deep layers remain visually comparable with the warm surface; the Phase 2 heatmap retains its per-slice range and north-up row flip.
- **Deviations from the plan:** The architecture did not specify the number or exact selection of depth layers. The user selected the eight representative requested depths listed above, with nearest-level selection. `/api/layers` factors shared latitude, longitude, variable, unit, and time metadata out of individual layers to avoid repeating it eight times. Three.js `0.185.1` was added as the only new package. No depth/time slider or Phase 4+ behavior was implemented.
- **Credentials/data access:** No new credentials or dataset access were required; Phase 3 reuses the gitignored Phase 1 Copernicus subset.
- **Manual test:**
  1. Ensure `backend/data/copernicus_thetao_india_20260831_20260906.nc` exists and install frontend dependencies with `npm install --prefix frontend`.
  2. From the repository root, start the backend with `backend/.venv/Scripts/python.exe -m uvicorn backend.main:app --reload`.
  3. In another terminal, start the frontend with `npm run dev --prefix frontend`.
  4. Open `http://localhost:5173` and confirm **Backend connected** and the **3D temperature depth stack** appear.
  5. Drag the scene to rotate it and use the mouse wheel to zoom. Confirm eight separated planes are visible inside the wireframe, land remains dark, and deeper planes are predominantly colder blue shades than the warm surface.
  6. Confirm the metadata lists depths approximately `0, 47, 92, 186, 541, 1062, 1452, 1942 m`, a cross-layer range of approximately `2.24–32.07 °C`, and date `2026-09-06`. The Phase 2 surface heatmap should remain visible below the scene.
  7. Optionally open `http://127.0.0.1:8000/api/layers?variable=thetao` and confirm HTTP 200 with eight layers, 205 latitudes, and 265 longitudes.
- **Automated validation:** Python compilation and direct real-NetCDF service assertions passed, including strict JSON serialization, exact eight-layer depth selection, 205×265 grid dimensions, and unchanged `/api/slice` surface values. Layer means cool from approximately 29.10 °C at 0.49 m to 2.78 °C at 1941.89 m. `npm run build --prefix frontend` completed successfully with Three.js and OrbitControls. Live Uvicorn plus Vite validation confirmed proxied `/health`, `/api/layers`, and `/api/slice` responses, HTTP 400 for unsupported `/api/layers?variable=so`, and an HTTP 200 frontend entry page.