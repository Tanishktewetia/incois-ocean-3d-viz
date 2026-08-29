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

## Phase 6 — Model vs Sensor RMSE

- **Status:** Complete
- **Files changed:**
  - `backend/routers/argo.py`
  - `backend/services/argo.py`
  - `backend/services/comparison.py`
  - `backend/services/metrics.py`
  - `backend/tests/test_comparison.py`
  - `frontend/src/components/ArgoOverlay.jsx`
  - `frontend/src/components/ProfileChart.jsx`
  - `PHASE_LOG.md`
- **Pure RMSE function:** Added `calculate_rmse(observed, modeled)` as a small, side-effect-free function. It computes `sqrt(mean((modeled - observed)²))` and explicitly rejects empty, unequal-length, or non-finite inputs. It was implemented and passed its isolated unit tests before model interpolation or chart integration was added.
- **Model matching:** For each selected Argo profile, the backend chooses the nearest available daily Copernicus model timestamp. It bilinearly interpolates every model depth level to the float latitude/longitude, renormalizing weights over finite ocean corners near land. It then linearly interpolates the resulting vertical model profile to every QC-accepted Argo depth inside valid model coverage. RMSE uses only these finite, colocated depth pairs.
- **API:** Extended the existing `GET /api/argo/{id}/profile` response with `model_comparison`, containing the selected model time, interpolation methods, 40-level colocated model profile, auditable observation/model pairs and residuals, paired count, and temperature RMSE. Missing model data returns HTTP 503, while unknown profile IDs retain HTTP 404 behavior.
- **Frontend:** The existing profile chart now overlays the Argo observations in solid orange and the colocated Copernicus profile in dashed blue. The panel reports RMSE in °C, pair count, selected model day, and a concise interpolation explanation.
- **Deviations from the plan:** The architecture did not prescribe interpolation details or a new endpoint. The comparison is included in the existing profile response so one float selection requires one request. No SQLite/JSON metadata store was needed because the Phase 5 cached local profile catalog remains sufficient. No Phase 7 current-particle behavior was added.
- **Manual test:**
  1. Start the backend with `backend/.venv/Scripts/python.exe -m uvicorn backend.main:app --reload` and the frontend with `npm run dev --prefix frontend`, then open `http://localhost:5173`.
  2. Click several orange Argo markers. Confirm each chart has a solid orange observed line and dashed blue Copernicus model line, and that the RMSE/pair count/model day update per float.
  3. Confirm both lines use temperature in °C on the horizontal axis and depth increasing downward, and that the original marker selection, depth slider, model-date slider, rotation, and zoom still work.
  4. To sanity-check one score, request `http://127.0.0.1:8000/api/argo/R5907180_055/profile`. Square every `model_comparison.comparison_points[].difference`, sum them, divide by `paired_count`, then take the square root. For the current data, `sqrt(5.784198172094287 / 99) = 0.241715212931600 °C`, which rounds to the displayed `0.242 °C`.
- **Automated validation:** Eight `unittest` tests pass for known/zero RMSE, invalid RMSE inputs, center-point bilinear interpolation, coastal missing-cell weight normalization, and out-of-grid rejection. Python compilation and integrated checks pass for all 38 real profiles: 25–987 finite pairs each, strict JSON, correctly selected nearest model time, sorted paired depths, and independently recomputed RMSE. The observed RMSE range is approximately 0.077–0.553 °C. Live Uvicorn and Vite proxy checks passed with identical direct/proxied RMSE, 40 returned model levels, unknown-ID HTTP 404, and frontend HTTP 200. `npm run build --prefix frontend` passed with only the existing non-fatal large-chunk warning.

## Phase 7 — Current Vector Particles

- **Status:** Complete
- **Files changed:**
  - `backend/routers/ocean.py`
  - `backend/services/slicer.py`
  - `backend/tests/test_currents.py`
  - `frontend/src/api/client.js`
  - `frontend/src/components/OceanScene3D.jsx`
  - `frontend/src/utils/currentParticles.js`
  - `PHASE_LOG.md`
- **Dataset:** Downloaded a real Copernicus Marine `GLOBAL_ANALYSISFORECAST_PHY_001_024` daily-mean current subset from dataset `cmems_mod_glo_phy-cur_anfc_0.083deg_P1D-m`: variables `uo`/`vo`, longitude 68–90°E, latitude 5–22°N, surface depth 0.494025 m, and the same seven dates as the temperature/Argo data (`2026-08-18` through `2026-08-24`). The gitignored local file is `backend/data/copernicus_currents_india_20260818_20260824.nc` (3,069,300 bytes).
- **API:** Added `GET /api/currents?time=<ISO 8601>`. It selects the nearest real model day, returns eastward/northward velocity in m s-1, preserves paired missing values as JSON `null`, and reduces the source 205×265 grid to a lightweight 52×67 field with a fixed stride of four. Invalid timestamps return HTTP 400 and missing/invalid local current data returns HTTP 503.
- **Particle animation:** Added one reusable Three.js `Points` geometry containing 320 particles. While enabled, each particle bilinearly samples the real `uo`/`vo` field at its geographic position, moves east/west and north/south according to those signed components, and respawns over a finite ocean location when it ages out, crosses the domain/coast, or loses valid data. Coastal interpolation renormalizes over finite corners. The current points, ocean planes, camera, controls, Argo markers, renderer, and animation loop remain mounted when toggling or changing dates; only the current field/position buffer changes.
- **Frontend:** Added an **Animate real surface currents** checkbox and live loading/error/source metadata. Particles remain hidden until the selected date's field is ready, update with the existing model-date slider, and disappear immediately when disabled. The fixed 320-particle cap and single position-buffer update per frame keep the workload modest for a normal laptop.
- **Deviations from the plan:** The architecture requires real `uo`/`vo`-driven motion but does not prescribe an endpoint, depth, interpolation, or particle count. Phase 7 uses the shallowest model layer because the requested behavior is a surface-current overlay, a downsampled transport field to reduce JSON/network cost, and 320 particles to balance legibility and laptop performance. No Phase 8 or later functionality was added.
- **Manual test:**
  1. Ensure the gitignored currents file above exists, then start the backend with `backend/.venv/Scripts/python.exe -m uvicorn backend.main:app --reload` and the frontend with `npm run dev --prefix frontend`; open `http://localhost:5173`.
  2. Check **Animate real surface currents**. Confirm 320 pale particles appear just above the surface and the status reports the selected date, `0.49 m`, and that motion follows Copernicus `uo`/`vo` in `m s-1`.
  3. Watch several regions: particles in one local flow should travel coherently in the same signed east/west and north/south direction rather than random directions. Compare with `http://127.0.0.1:8000/api/currents?time=2026-08-20T00:00:00Z`; positive `eastward` moves right/east and positive `northward` moves up/north in the unrotated top view.
  4. Move the model-date slider through all seven days. Confirm particles briefly hide while loading, the displayed current date follows the temperature date, and flow patterns change without rebuilding/resetting the camera or Argo selection.
  5. Toggle particles off/on, rotate and zoom the scene, play the date animation, and click Argo markers. Confirm controls remain responsive and the existing temperature layers/profile chart still work.
- **Automated validation:** All 11 backend unit tests pass, including three new current-field tests for nearest-time/downsample selection, paired missing values, and invalid timestamps; Python compilation passes. The real 7×1×205×265 NetCDF contains both `uo` and `vo`, with observed component ranges of approximately -0.872–1.447 and -1.015–1.265 m s-1. Every date produces a strict-JSON 52×67 response with 2,432 finite paired vectors. A deterministic Node test passes for bilinear/coastal vector sampling, out-of-domain rejection, and the 320-particle cap. Live Uvicorn and Vite proxy checks return identical selected dates and grids, invalid time returns HTTP 400, frontend delivery returns HTTP 200, and the production frontend build passes with only the existing non-fatal large-chunk warning.

## Phase 8 — Scientist Data Upload

- **Status:** Complete
- **Files changed:**
  - `.gitignore`
  - `backend/main.py`
  - `backend/requirements.txt`
  - `backend/routers/ocean.py`
  - `backend/services/slicer.py`
  - `backend/tests/test_upload.py`
  - `backend/uploads/.gitkeep`
  - `frontend/src/App.jsx`
  - `frontend/src/api/client.js`
  - `frontend/src/components/DatasetUpload.jsx`
  - `frontend/src/components/HeatmapCanvas.jsx`
  - `frontend/src/components/OceanScene3D.jsx`
  - `PHASE_LOG.md`
- **API and storage:** Added multipart `POST /api/upload`. The endpoint accepts one `.nc` file, streams it in 1 MiB chunks with a 100 MiB limit, validates a temporary file, and atomically promotes only a valid dataset to gitignored `backend/uploads/scientist_upload.nc`. A rejected upload leaves the previous valid upload unchanged. CORS now permits POST from the existing local frontend origins, and `python-multipart` is an explicit backend dependency.
- **NetCDF contract:** The uploaded file must contain numeric `thetao` with dimensions ordered as `(time, depth, latitude, longitude)`, valid non-empty 1-D coordinates, parseable times, strictly increasing finite depth/latitude/longitude coordinates, at least a 2×2 spatial grid, and at least one finite temperature. These requirements match the existing variable-generic slicer and the bundled Copernicus demo schema; validation errors are returned as HTTP 400 with a specific explanation.
- **Shared slicer:** Existing `GET /api/slice` and `GET /api/layers` now accept `source=demo|upload` and call the same `request_slice`/`request_layers` implementations after selecting the active NetCDF file. Responses include their source. Missing uploaded data returns HTTP 503, while unknown sources return HTTP 400. The existing demo behavior remains the default and is backward compatible.
- **Frontend:** Added a scientist upload panel with `.nc` file selection, validation/loading status, accepted dataset dimensions, and a **Copernicus Marine temperature data (India EEZ)** / **My upload** choice. A successful upload automatically selects **My upload**; both the 3D depth stack and 2D surface heatmap reload through the source-aware slicer endpoints, and users can switch back to the real downloaded Copernicus Marine temperature data without re-uploading. The Copernicus Marine surface-current (`uo`/`vo`) control is disabled for a temperature-only scientist upload so those currents are not misrepresented as uploaded data.
- **Deviations from the plan:** The architecture does not define alternate coordinate aliases or an upload schema beyond variable validation and the same slicer. Phase 8 therefore accepts the exact established slicer contract rather than guessing aliases. Uploads support `thetao`; salinity and current-magnitude visualization remain Phase 10 work. The upload is process-global and replaces the previous upload because authentication and per-user storage are not part of Phase 8. No Phase 9 instrument work was added.
- **Manual test:**
  1. Install backend dependencies with `uv pip install --python backend/.venv/Scripts/python.exe -r backend/requirements.txt`, start the backend with `backend/.venv/Scripts/python.exe -m uvicorn backend.main:app --reload`, start the frontend with `npm run dev --prefix frontend`, and open `http://localhost:5173`.
  2. Under **Dataset source**, select `backend/data/copernicus_thetao_india_20260818_20260824.nc` and click **Upload and use**. Confirm the status reports 7 time × 40 depth × 205 latitude × 265 longitude and **My upload** becomes selected.
  3. Confirm the 3D stack and flat heatmap render the same geography, colors, depths, and dates as the downloaded Copernicus Marine temperature data. Move the date/depth controls, then switch between **Copernicus Marine temperature data (India EEZ)** and **My upload** and confirm both views reload correctly.
  4. While **My upload** is selected, confirm the surface-current checkbox is disabled with the explanation that currents use Copernicus Marine surface-current data (`uo`/`vo`). Switch back to **Copernicus Marine temperature data (India EEZ)** and confirm Phase 7 currents work normally.
  5. Try a renamed text file, a NetCDF without `thetao`, or a file larger than 100 MiB. Confirm a specific validation error appears and the previously accepted upload remains selectable and renderable.
- **Automated validation:** All 16 backend unit tests pass: the original 11 plus five upload tests covering valid ingestion/shared slicing, extension rejection, required-variable rejection with preservation of the prior upload, invalid source rejection, and size-limit enforcement. Python compilation and the frontend production build pass; the build retains only the existing non-fatal large-chunk warning. The explicit architecture acceptance test streamed the real 60,869,823-byte demo file through the upload service and confirmed exact equality between demo and upload slice responses plus all eight depth layers on three dates. A live Uvicorn multipart upload returned the expected 7×40×205×265 metadata, `source=upload` returned 7 times and 8 layers on the 205×265 grid, and an invalid extension returned HTTP 400.