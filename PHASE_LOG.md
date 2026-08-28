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

## Phase 4 — Depth / Time Slider

- **Status:** Complete
- **Files changed:**
  - `backend/routers/ocean.py`
  - `backend/services/slicer.py`
  - `frontend/src/api/client.js`
  - `frontend/src/components/DepthTimeSlider.jsx`
  - `frontend/src/components/OceanScene3D.jsx`
  - `PHASE_LOG.md`
- **Implementation:** Added discrete depth and forecast-date range controls to the existing Phase 3 scene. The depth slider moves through the same eight representative model levels and emphasizes the selected plane at 96% opacity while retaining the other seven planes at 28% opacity. The date slider spans all seven daily model coordinates from 2026-08-31 through 2026-09-06. A play/stop button advances chronologically every 1.5 seconds, waits for each layer request to complete, stops on the final forecast day, and offers replay from the first day.
- **Scene integration:** The Phase 3 Three.js renderer, camera, OrbitControls, geometry, meshes, and textures remain mounted during slider interaction. Changing depth updates only existing material emphasis. Changing time calls the existing `/api/layers` route and replaces each existing `DataTexture` pixel buffer in place, then recalculates that day's shared cross-depth color range. It does not rebuild the 3D scene.
- **API:** Extended `GET /api/layers` with optional `time=<ISO 8601 timestamp>` nearest-time selection and a `times` array containing all available model times. Omitting `time` still returns the latest model day, preserving Phase 3 behavior. Invalid timestamps return HTTP 400, and `/api/slice` remains unchanged.
- **Deviations from the plan:** The architecture did not define how a depth control should affect the eight-plane stack. The user chose to keep all eight planes visible and highlight one representative plane while time changes refresh all eight. Playback does not loop because the demo script specifies real forecast days, not a loop. No Phase 5+ behavior or new dependency was added.
- **Credentials/data access:** No new credentials or downloads were required; Phase 4 reuses the gitignored seven-day Copernicus subset.
- **Manual test:**
  1. Ensure `backend/data/copernicus_thetao_india_20260831_20260906.nc` exists and install existing dependencies if needed.
  2. From the repository root, start the API with `backend/.venv/Scripts/python.exe -m uvicorn backend.main:app --reload`.
  3. In another terminal, start Vite with `npm run dev --prefix frontend`, then open `http://localhost:5173`.
  4. Drag the depth slider through all eight positions. Confirm the label moves from approximately `0 m` to `1942 m`, the selected plane becomes prominent, the other seven remain visible, and rotation/zoom continue to work without the camera resetting.
  5. Drag the date slider from `2026-08-31` through `2026-09-06`. Confirm the status briefly reads **Updating ocean layers…**, then **Ocean layers ready**, and plane textures/temperature metadata update without resetting the camera.
  6. Select an earlier day and click **Play forecast**. Confirm the dates advance in order, each request completes before the next advance, **Stop animation** pauses playback, and playback stops on `2026-09-06`. Click **Replay forecast** to restart at `2026-08-31`.
  7. Confirm the Phase 2 surface heatmap still appears below the scene and continues showing the latest model day.
- **Automated validation:** Python compilation and direct service checks passed for seven available times, eight layers per date, latest-time backward compatibility, nearest-time selection, invalid-time rejection, strict JSON, time-varying surface values, and unchanged `/api/slice` values. `npm run build --prefix frontend` passed. Live Uvicorn plus Vite proxy checks confirmed first/latest/nearest date requests, eight layers per day, HTTP 400 for an invalid time, the preserved slice endpoint, and HTTP 200 frontend delivery.

## Phase 5 — Argo Overlay + Profile Chart

- **Status:** Complete
- **Files changed:**
  - `backend/main.py`
  - `backend/routers/argo.py`
  - `backend/services/argo.py`
  - `backend/services/slicer.py`
  - `frontend/package.json`
  - `frontend/package-lock.json`
  - `frontend/src/api/client.js`
  - `frontend/src/components/ArgoOverlay.jsx`
  - `frontend/src/components/DepthTimeSlider.jsx`
  - `frontend/src/components/OceanScene3D.jsx`
  - `frontend/src/components/ProfileChart.jsx`
  - `PHASE_LOG.md`
- **Dataset:** Selected the newest fully completed seven-day interval at implementation time, `2026-08-18` through `2026-08-24`, with both model and sensor coverage in 68–90°E, 5–22°N. Downloaded 38 individual core-profile NetCDF files listed by the official Argo GDAC global profile index from `https://data-argo.ifremer.fr/dac/`, plus the matching Copernicus Marine `thetao` subset from `cmems_mod_glo_phy-thetao_anfc_0.083deg_P1D-m` at 0–2000 m.
- **Local data:** `backend/data/argo_20260818_20260824/` contains 38 Argo files (2,288,204 bytes total), and `backend/data/copernicus_thetao_india_20260818_20260824.nc` contains seven model days (60,869,823 bytes). Both are intentionally gitignored. The Copernicus file SHA-256 is `68DEACF8C41B86A1DFFB0777ED64D9AEFBAEABB5ABD498AEC7B9F4F3C16DE87D`.
- **Backend:** Added `GET /api/argo` catalog metadata and `GET /api/argo/{id}/profile` measurements. The parser uses the primary physical profile row, requires good position/time QC, accepts Argo pressure/temperature QC flags 1 and 2, prefers adjusted values in adjusted/delayed mode when available, converts dbar to metres with the latitude-aware UNESCO 1983 formula, and returns HTTP 404 for unknown IDs or HTTP 503 when local data is unavailable.
- **Frontend:** Added 38 orange geographic markers to the existing Three.js scene without rebuilding its renderer, camera, controls, planes, or textures. Raycasting selects and highlights a marker. The selected real sensor profile is fetched on demand and displayed in a Chart.js temperature-vs-depth line chart with depth increasing downward.
- **Deviations from the plan:** The prior model subset (`2026-08-31` through `2026-09-06`) was in the future, so no real Argo data could match it. With user approval, both datasets were moved to the recent completed interval above to preserve the architecture's required region/date match for Phase 6. Existing UI wording was changed from “forecast date” to “model date.” Phase 5 exposes sensor data only; no model-profile interpolation, RMSE, currents, or later-phase behavior was added.
- **Credentials/data access:** Reused the user's existing local Copernicus Marine authentication. Argo GDAC access is public. No credentials, NetCDF data, index files, or generated output are tracked by Git.
- **Manual test:**
  1. Ensure the matching Copernicus file and 38-file Argo directory named above exist under `backend/data/`.
  2. From the repository root, start the API with `backend/.venv/Scripts/python.exe -m uvicorn backend.main:app --reload`.
  3. In another terminal, run `npm install --prefix frontend`, then `npm run dev --prefix frontend`, and open `http://localhost:5173`.
  4. Confirm 38 orange dots appear across the 3D ocean surface and the Argo text reports `2026-08-18` through `2026-08-24`.
  5. Rotate/zoom the scene, click an orange dot, and confirm it turns white and grows while the camera and ocean stack remain in place.
  6. Confirm the panel identifies the float/cycle, observation time and coordinates, then shows a sensible orange temperature profile with **Temperature (°C)** horizontally and **Depth (m)** increasing downward.
  7. Click several dots, including shallow and approximately 2000 m profiles, and confirm the metadata/chart changes. Move model dates and depths afterward and confirm marker selection and scene controls continue to work.
- **Automated validation:** Python compilation and direct service validation passed for all 38 real profiles, including bounding box/date membership, accepted QC data, depth ordering, physical sanity limits, strict JSON serialization, and seven matching model dates. Live Uvicorn and Vite proxy checks passed for both Argo routes, unknown-ID HTTP 404 behavior, model dates, and frontend HTTP 200 delivery. `npm run build --prefix frontend` passed; Vite reports only its non-fatal large-chunk warning after adding the architecture-mandated Chart.js dependency.