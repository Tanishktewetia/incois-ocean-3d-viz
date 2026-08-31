# Phase Log

## Fix - Instrument markers floating above the surface

- **Status:** Complete.
- **Cause:** The sample Glider/CTD coordinates were already valid finite ocean cells. Their apparent placement above the map came from an oversized display-only Z elevation (`0.62`) used for marker visibility, not from land coordinates.
- **Implementation:** Reduced marker elevations to the corresponding marker half-height plus a minimal clearance, so the purple triangle and cube rest on the ocean surface. Coordinates, sample labels, profiles, and the ocean/land mask are unchanged.
- **Manual verification:** Open `/explorer`, rotate the 3D scene, and confirm the purple triangle and square sit on the colored ocean surface without visibly floating above it. Confirm both remain clickable and still display `SAMPLE DATA — not live`; verify orange and green markers remain visible and selectable.

## Fix - Sample Glider/CTD Ocean Placement

- **Status:** Complete.
- **Implementation:** Moved only the labelled sample Glider and CTD coordinates to open-ocean cells within the existing India EEZ visualization region. The Glider is now at `15.0°N, 72.5°E` in the Arabian Sea, and the CTD is now at `15.0°N, 82.5°E` in the Bay of Bengal. Both locations are finite ocean cells in the same Copernicus surface mask used to distinguish ocean from land in the 2D and 3D renderers, have fully ocean-valid surrounding 9×9 model-cell neighborhoods, and are also below sea level in the existing GEBCO grid. All sample-data labels and profile values remain unchanged.
- **Files changed:** `backend/services/instruments.py`, `PHASE_LOG.md`.
- **Manual verification:** Start the backend and frontend, open `/explorer`, and locate the purple triangle and square in both the 3D scene and 2D map. Confirm the Glider appears clearly offshore in the Arabian Sea and the CTD clearly offshore in the Bay of Bengal. Click each marker and confirm the profile still displays `SAMPLE DATA — for demonstration only; this is not a live observation.`
- **Automated validation:** The backend instrument tests, Python byte-compilation, coordinate checks against the Copernicus finite-cell mask and GEBCO bathymetry, and `git diff --check` pass.


## Isotherm Contour Toggle

- **Status:** Complete.
- **Implementation:** Added an off-by-default `Isotherm contours` toggle for the temperature figures. When enabled, fixed 2 °C contour lines are generated with marching-squares-style edge interpolation from the loaded temperature grid for each volume depth and the selected-depth relief surface.
- **Scope:** No data loading, API calls, or source values changed. Contours are hidden for salinity/current selections, and existing layer highlighting, color mapping, depth exaggeration, isosurface, and figure controls remain unchanged.
- **Files changed:** `frontend/src/components/OceanScene3D.jsx`, `frontend/src/components/VisualizationControls.jsx`, `frontend/src/styles.css`, `PHASE_LOG.md`.
- **Manual verification:** Open `/explorer`, keep Temperature selected, and confirm `Isotherm contours · 2 °C interval` is off by default. Enable it in Layered ocean volume and verify thin lines appear at 2 °C intervals across loaded depths. Switch to Field relief surface and verify contours follow the selected-depth surface. Change highlighted depth, variable, date, range, and vertical exaggeration; confirm contours rebuild from the current real temperature values and disappear for salinity/current.
- **Automated validation:** Frontend production build passes with only the existing non-fatal Vite large-chunk advisory; `git diff --check` passes.

## Phase 19 - Real Satellite Imagery on Land

- **Status:** Complete.
- **Source and verification:** Verified the architecture-listed NASA GIBS WMS `GetMap` endpoint for the existing `68–90°E, 5–22°N` extent. It returned HTTP 200 with a JPEG image and required no API key. The selected layer is `MODIS_Terra_CorrectedReflectance_TrueColor`.
- **Caching:** Added a shared frontend imagery loader with a module-level cached promise. The 2D heatmap and 3D scene reuse the same single regional image request instead of fetching on every render.
- **Land-only compositing:** For null/land cells, GIBS RGB pixels are inserted into the existing heatmap/DataTexture. Finite ocean cells continue to use the existing temperature/salinity/current color mapping without modification. The existing depth highlighting, time controls, and figure controls remain unchanged.
- **Attribution:** Added `NASA GIBS` attribution wherever the imagery appears, alongside the existing GEBCO attribution in the 3D view and the source metadata in the 2D view.
- **Files changed:** `frontend/src/utils/gibsImagery.js`, `frontend/src/components/HeatmapCanvas.jsx`, `frontend/src/components/OceanScene3D.jsx`, `PHASE_LOG.md`.
- **Manual verification:** Start the backend and frontend and open `/explorer`. Confirm land cells show recognizable satellite imagery in the 2D source check and on the 3D surface, while ocean colors and values remain unchanged. Change variable, color range, depth, date, opacity, and figure/view focus; confirm ocean rendering still follows the model data. Confirm the NASA GIBS attribution is visible.
- **Automated validation:** Frontend production build and `git diff --check` pass.

## Phase 19 — Interactive real-data 3D figures

- **Status:** Complete
- **Files changed:** `frontend/src/components/OceanScene3D.jsx`, `frontend/src/components/VisualizationControls.jsx`, `frontend/src/styles.css`, `PHASE_LOG.md`.
- **Implementation:** Added three mutually exclusive interactive figures to the Explorer’s existing Three.js scene: the established layered volume, a selected-depth field-relief surface whose vertex elevation and color come from the loaded scalar grid, and a center-latitude longitude–depth section assembled from all loaded model layers. Variable, model date, selected depth, color range/scale, camera, and vertical exaggeration continue to operate on the relevant active figure. Missing section cells are omitted rather than interpolated as ocean data.
- **Performance and provenance:** Figure switching changes object visibility inside one renderer and one canvas; it does not mount parallel WebGL contexts. Figures use the existing real Copernicus/API payload (or a researcher upload where supported), and the existing GEBCO/observation/current overlays remain in the volume figure. Generated geometry and materials are disposed when rebuilt and when the component unmounts.
- **Manual test:** Start the backend and frontend, open `/explorer`, and select each item under **3D figure**. Confirm only one figure is visible, orbit/pan/zoom work, depth changes reshape the relief figure, date/variable changes update all figures, and vertical exaggeration stretches the section. Confirm volume layer focus, observations, currents, isosurface, fullscreen, and `/`, `/about`, and `/comparison` still work.
- **Automated validation:** The frontend production build passes with only the existing non-fatal Vite large-chunk advisory; all 29 backend unit tests pass; `git diff --check` passes. Static checks confirm three figure choices and exactly one `THREE.WebGLRenderer` constructor.

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

## Phase 9 — Multi-Instrument Overlay (Argo + BGC-Argo + Glider/CTD)

- **Status:** Complete
- **Files changed:**
  - `backend/main.py`
  - `backend/routers/instruments.py`
  - `backend/services/instruments.py`
  - `backend/tests/test_instruments.py`
  - `frontend/src/api/client.js`
  - `frontend/src/components/ArgoOverlay.jsx` (renamed)
  - `frontend/src/components/InstrumentOverlay.jsx`
  - `frontend/src/components/OceanScene3D.jsx`
  - `frontend/src/components/ProfileChart.jsx`
  - `PHASE_LOG.md`
- **Real BGC-Argo data:** Downloaded the official Argo GDAC `argo_bio-profile_index.txt.gz` and filtered it to longitude 68–90°E, latitude 5–22°N, and `2026-08-18` through `2026-08-24`, matching the existing model/Core-Argo window. The index returned 11 `BR*.nc` profile files containing `CHLA` and/or `DOXY`; 10 contain at least one series with two or more Argo QC-accepted values in the 0–2100 dbar range. The gitignored local directory is `backend/data/bgc_argo_20260818_20260824/` (11 files, 6,727,260 bytes). The downloaded index SHA-256 is `FCC424EBB0704CAA078A4E100696B795148514C3324438DD251DCF9A251AA863`.
- **Unified schema/API:** Added `GET /api/instruments` and `GET /api/instruments/{instrument_id}/profile`. Core Argo, BGC-Argo, sample Glider, and sample CTD records now share instrument identity, type, status, provenance, position, time, variables, and depth/value series fields. Existing `/api/argo` endpoints remain available for compatibility. BGC ingestion selects the appropriate sensor `N_PROF` row, prefers usable adjusted `CHLA`/`DOXY`, accepts Argo QC flags 1/2, converts pressure to depth with the existing UNESCO routine, and reports source units/data mode.
- **Sample-data honesty:** Added one small Glider profile and one small CTD profile to demonstrate the replaceable ingestion contract. Both are marked `data_status=sample` and use the source text **Sample data — for demonstration; not a live feed**. The frontend repeats **SAMPLE DATA — not live** in the persistent legend, marker tooltip, selected-profile warning, source, and chart legend; neither record is presented as a live observation.
- **Frontend:** Replaced the Argo-only overlay with a multi-instrument panel and variable-aware charts. The scene uses orange circles for Core Argo, green diamonds for real BGC-Argo, and purple triangle/box markers for sample Glider/CTD. Marker types have small display-only elevation offsets so co-located Core/BGC profiles remain visible; their geographic coordinates are unchanged. Hover shows instrument provenance/status and click opens the corresponding temperature, chlorophyll, or oxygen profile. Core Argo retains its Copernicus temperature comparison and RMSE.
- **Deviations from the plan:** The architecture did not prescribe a BGC index filename, normalized response fields, sample profile values, or marker geometry. With user confirmation, Phase 9 uses the official GDAC `argo_bio-profile_index.txt.gz` and the established 2026-08-18 through 2026-08-24 comparison window. BGC chlorophyll/oxygen charts do not show model RMSE because the current model subset contains temperature only; inventing a chlorophyll/oxygen model comparison would be inaccurate and variable expansion belongs to Phase 10. No Phase 10 controls or variables were added.
- **Manual test:**
  1. Ensure the existing Core Argo/model files and gitignored `backend/data/bgc_argo_20260818_20260824/` directory are present. Start the backend with `backend/.venv/Scripts/python.exe -m uvicorn backend.main:app --reload`, start the frontend with `npm run dev --prefix frontend`, and open `http://localhost:5173`.
  2. Confirm the legend reports 38 Core Argo, 10 QC-usable BGC-Argo, and 2 labelled sample Glider/CTD records for 2026-08-18 through 2026-08-24. Confirm orange circles, green diamonds, a purple triangle, and a purple box appear in the 3D scene.
  3. Hover the purple Glider and CTD markers and confirm each tooltip says **SAMPLE DATA — not live**. Click each and confirm the selected-profile warning, source, and chart also identify it as sample/demonstration data rather than live data.
  4. Click an orange Core Argo circle and confirm its observed/model temperature chart and RMSE appear. Click green BGC-Argo diamonds and confirm the selected float shows its available chlorophyll-a and/or dissolved-oxygen depth chart with Argo GDAC provenance.
  5. Rotate/zoom the scene, change model depth/date, and toggle currents. Confirm all instrument markers remain selectable and existing ocean/current controls still work.
- **Automated validation:** All 19 backend unit tests pass, including adjusted BGC-value preference, QC filtering, normalized sample schema, and explicit sample labels. Python compilation and `git diff --check` pass. The production frontend build passes with only the existing non-fatal large-chunk warning. A live Uvicorn smoke test returned HTTP 200 for health, the 50-record instrument catalog, a real BGC chlorophyll/oxygen profile, and a sample Glider profile whose API status/source explicitly identify it as sample and not live.

## Phase 10 — Variable & Colorbar Controls

- **Status:** Complete
- **Files changed:**
  - `backend/services/slicer.py`
  - `backend/tests/test_variables.py`
  - `frontend/src/components/DatasetUpload.jsx`
  - `frontend/src/components/OceanScene3D.jsx`
  - `frontend/src/components/VisualizationControls.jsx`
  - `frontend/src/utils/colorScale.js`
  - `PHASE_LOG.md`
- **Model data:** Added real Copernicus Marine `GLOBAL_ANALYSISFORECAST_PHY_001_024` daily-mean salinity (` and full-depth current (`uo`/`vo`) subsets for the established India EEZ box (68–90°E, 5–22°N), 2026-08-18 through 2026-08-24, and all 40 model levels from 0.494 m through 1941.893 m. Current magnitude is derived as `sqrt(uo² + vo²)` and is not fabricated. The files are intentionally gitignored:
  - `backend/data/copernicus_so_india_20260818_20260824.nc` — 60,869,823 bytes; SHA-256 `FCF8C0B4B081B4D8A74B7577E2F07DA58D53C34E2C6B6B08AC6BE2AC8EEC581E`.
  - `backend/data/copernicus_currents_3d_india_20260818_20260824.nc` — 121,717,148 bytes; SHA-256 `12A0E56CE8D7BEAB0CA3EE8D23DDB4D4357AE0601FD9C40B29A99ECE267FE2D8`.
- **Backend:** Generalized the existing `/api/slice` and `/api/layers` contracts to support `thetao`, `so`, and `current_magnitude`. Temperature and salinity use their scalar model files; current speed is calculated from paired finite `uo`/`vo` fields. The existing lightweight surface-current endpoint remains unchanged for particle animation.
- **Frontend:** Added a variable selector, labelled colorbar with editable minimum/maximum, linear/logarithmic scale selector, layer-opacity slider, and 0.5×–4× vertical-exaggeration slider. Range and scale changes recolor the existing Three.js textures immediately; opacity preserves selected-depth emphasis; exaggeration stretches model depth while keeping the sea surface and instrument markers fixed. Labels, units, scene heading, accessibility text, and provenance update with the selected variable.
- **Deviations from the plan:** The architecture names “current magnitude” but does not prescribe an API identifier, so the implementation uses `current_magnitude`. Log mode rejects a non-positive colorbar minimum because logarithms are undefined there. Phase 8’s upload contract remains deliberately temperature-only; salinity/current options are disabled for **My upload** rather than implying unavailable variables exist. The salinity API preserves the source CF unit `1e-3`, while the UI displays its human-readable Copernicus unit as PSU. No Phase 11 isosurface work was added.
- **Manual test:**
  1. Ensure the three gitignored full-depth files for `thetao`, `so`, and `uo`/`vo` exist in `backend/data/`. Start the backend with `backend/.venv/Scripts/python.exe -m uvicorn backend.main:app --reload`, start the frontend with `npm run dev --prefix frontend`, and open `http://localhost:5173`.
  2. Select **Temperature**, **Salinity**, and **Current magnitude** in turn. Confirm the heading, units/colorbar, values, and layer colors change; salinity is labelled PSU and current speed `m s-1`.
  3. Edit the color minimum and maximum and confirm clipping/contrast changes immediately. Select **Logarithmic** and confirm the color distribution changes; confirm a zero/negative minimum is rejected with an inline explanation.
  4. Move **Layer opacity** from 5% to 100% and confirm all layers fade/strengthen while the selected layer remains emphasized. Move **Vertical exaggeration** from 0.5× to 4× and confirm the depth stack/frame visibly compresses/stretches while surface instrument markers remain at the surface.
  5. Change depth and date for each variable, rotate/zoom the scene, and enable current particles. Confirm existing depth/time, instrument selection, and real current animation controls still work.
  6. Select **My upload** after uploading a valid Phase 8 temperature NetCDF. Confirm the variable returns to **Temperature** and salinity/current-magnitude choices are disabled and explained.
- **Automated validation:** All 23 backend unit tests pass, including real-variable routing, exact 3-4-5 current-magnitude derivation, unsupported-variable errors, and temperature-only upload enforcement. Python compilation and `git diff --check` pass. The frontend production build passes with only the existing non-fatal large-chunk warning. Direct real-file smoke checks returned eight layers for all three variables with plausible ranges. A live Uvicorn smoke test returned HTTP 200 for `thetao`, `so`, and `current_magnitude` at the requested date, and HTTP 400 for unsupported upload salinity.

## Phase 11 — True Isosurface Extraction

- **Status:** Complete
- **Files changed:**
  - `frontend/src/utils/isosurface.js`
  - `frontend/src/components/OceanScene3D.jsx`
  - `frontend/src/components/VisualizationControls.jsx`
  - `PHASE_LOG.md`
- **Implementation:** Added a real Three.js `MarchingCubes` mesh imported from `three/examples/jsm/objects/MarchingCubes.js`. The eight API depth layers are resampled into a 32×32×32 scalar volume with trilinear interpolation across longitude, latitude, and the layers' nonuniform model depths. Cells touching missing/land values receive a finite below-range sentinel so coastlines do not create invalid vertices. The generated cube is scaled to the displayed geographic rectangle and model-depth stack, with depth directed downward.
- **Controls and lifecycle:** Added a **True isosurface** toggle and variable-unit threshold slider. The threshold defaults to the selected field's midpoint, remains inside edited color bounds, and invokes `MarchingCubes.update()` as it moves. The volume and geometry regenerate when variable, source, or time changes; the mesh follows vertical exaggeration and uses a threshold-colored, lit, semitransparent material. Geometry and material resources are disposed with the existing scene. Existing layers, particles, markers, uploads, and APIs are unchanged.
- **Deviations from the plan:** None. Resolution is fixed at 32³ as an implementation choice that provides true extraction while keeping interactive slider updates practical in the browser. No Phase 12 or later functionality was added.
- **Manual test:**
  1. Ensure the required gitignored model files exist, start the backend with `backend/.venv/Scripts/python.exe -m uvicorn backend.main:app --reload`, start the frontend with `npm run dev --prefix frontend`, and open `http://localhost:5173`.
  2. Enable **True isosurface**. Confirm a smooth, semitransparent 3D mesh appears inside the depth stack rather than another flat layer.
  3. Drag **Isosurface threshold** slowly from low to high. Confirm the mesh regenerates continuously and its shape/extent changes; for temperature, warmer regions should generally contract as the threshold rises.
  4. Switch among **Temperature**, **Salinity**, and **Current magnitude** and change the model date. Confirm the threshold resets to a valid midpoint with the correct unit and the mesh changes to the newly loaded volume.
  5. Change vertical exaggeration and rotate/zoom the scene. Confirm the isosurface stretches with the depth frame and remains spatially aligned with the layer stack.
  6. Toggle the isosurface off and confirm the existing depth layers, instrument markers, current particles, and upload behavior continue unchanged.
- **Automated validation:** All 23 backend `unittest` tests pass and Python byte-compilation succeeds. The frontend production build passes with only the existing non-fatal large-chunk warning. A synthetic Node validation confirmed trilinear midpoint interpolation (`6.5`), verified the object is Three.js `MarchingCubes`, generated 6,582 vertices, and regenerated to 6,576 vertices after replacing the scalar volume. `git diff --check` passes.

## Phase 12 — OGC WMS/WCS-Compliant Endpoints

- **Status:** Complete
- **Files changed:**
  - `backend/main.py`
  - `backend/requirements.txt`
  - `backend/routers/ogc.py`
  - `backend/services/ogc.py`
  - `backend/tests/test_ogc.py`
  - `PHASE_LOG.md`
- **WMS implementation:** Added a WMS 1.3.0 `/wms` KVP endpoint with `GetCapabilities` and `GetMap`. Capabilities advertise the real `thetao`, `so`, and derived `current_magnitude` fields, their geographic bounds, available model times/depths, PNG format, and `EPSG:4326`/`CRS:84`. `GetMap` selects the nearest requested time and elevation, samples the requested bounding box to a bounded output size, applies the platform's blue-to-red ocean color scale, preserves missing/land cells as transparent pixels when requested, and correctly handles WMS 1.3.0 latitude/longitude axis order for `EPSG:4326`.
- **WCS implementation:** Added a WCS 2.0.1 `/wcs` KVP endpoint with `GetCapabilities`, `DescribeCoverage`, and `GetCoverage`. Coverage metadata includes WGS 84 bounds, four-dimensional grid/range information, variable units, and the native NetCDF format. `GetCoverage` supports repeatable standard `SUBSET` expressions for longitude, latitude, depth/elevation, and time, returning a CF-1.8 NetCDF file with EPSG:4326 grid-mapping metadata. Single-coordinate subsets use the nearest available model coordinate; trim subsets retain all intersecting coordinates.
- **Errors and dependencies:** Invalid operations, layers/coverage IDs, formats, coordinate systems, dimensions, bounds, times, and subsets return OGC XML exception reports rather than FastAPI JSON errors. Added Pillow for dependency-light PNG encoding; WCS output reuses the existing xarray/netCDF4 stack.
- **Deviations from the plan:** The required standards subset is intentionally read-only and publishes the bundled Copernicus demo fields, not process-global scientist uploads. WMS supports one layer per `GetMap`, PNG output, and `EPSG:4326`/`CRS:84`; WCS supports NetCDF rather than GeoTIFF. These limits follow the architecture's instruction to support the parameters this application uses rather than every OGC edge case. No Phase 13 work was added.
- **Manual test:**
  1. Ensure the required gitignored Copernicus model files exist, install dependencies with `uv pip install --python backend/.venv/Scripts/python.exe -r backend/requirements.txt`, and start the API from the repository root with `backend/.venv/Scripts/python.exe -m uvicorn backend.main:app --reload`.
  2. Open `http://127.0.0.1:8000/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities` and confirm valid XML lists `thetao`, `so`, and `current_magnitude`, including `time` and `elevation` dimensions.
  3. Open `http://127.0.0.1:8000/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=thetao&STYLES=ocean&CRS=EPSG:4326&BBOX=5,68,22,90&WIDTH=800&HEIGHT=600&FORMAT=image/png&TRANSPARENT=TRUE&TIME=2026-08-20T00:00:00Z&ELEVATION=50` and confirm a temperature PNG renders. In WMS 1.3.0, the `EPSG:4326` BBOX is latitude/longitude order; use `CRS=CRS:84&BBOX=68,5,90,22` for longitude/latitude order.
  4. In QGIS, choose **Layer → Add Layer → Add WMS/WMTS Layer → New**, set the URL to `http://127.0.0.1:8000/wms`, connect, select one or more of the three advertised layers, and click **Add**. Use the layer's **Temporal** or WMS dimensions controls where available to test model time/elevation changes. If QGIS runs on another computer, bind Uvicorn to `0.0.0.0` and replace `127.0.0.1` with the API computer's reachable IP address.
  5. Open `http://127.0.0.1:8000/wcs?SERVICE=WCS&VERSION=2.0.1&REQUEST=DescribeCoverage&COVERAGEID=so` and confirm the coverage description XML includes its four-dimensional domain and range unit.
  6. Download a small coverage with `http://127.0.0.1:8000/wcs?SERVICE=WCS&VERSION=2.0.1&REQUEST=GetCoverage&COVERAGEID=thetao&FORMAT=application/x-netcdf&SUBSET=Long(70,71)&SUBSET=Lat(10,11)&SUBSET=depth(50)&SUBSET=time(2026-08-20T00:00:00Z)`, then open the resulting `thetao.nc` in QGIS, Panoply, or xarray and confirm its coordinates and values are subsetted.
- **Automated validation:** All 29 backend `unittest` tests pass, including WMS/WCS capabilities metadata, PNG dimensions, unknown-layer rejection, coverage description, and four-axis NetCDF subsetting. Python byte-compilation and `git diff --check` pass. A live Uvicorn test against the real Copernicus files returned valid capabilities/description XML, a 128×96 RGBA WMS PNG, a CF-NetCDF current-magnitude subset with the expected dimensions and variables, and an OGC XML service exception for an invalid layer. The frontend production build passes with only the existing non-fatal large-chunk warning.

## Phase 13 — Visual Polish and Context Page

- **Status:** Complete
- **Files changed:**
  - `frontend/index.html`
  - `frontend/src/main.jsx`
  - `frontend/src/App.jsx`
  - `frontend/src/styles.css`
  - `frontend/src/pages/AboutPage.jsx`
  - `frontend/src/components/OceanScene3D.jsx`
  - `frontend/src/components/VisualizationControls.jsx`
  - `frontend/src/components/DepthTimeSlider.jsx`
  - `frontend/src/components/ProfileChart.jsx`
  - `frontend/src/components/InstrumentOverlay.jsx`
  - `frontend/src/components/DatasetUpload.jsx`
  - `frontend/src/components/HeatmapCanvas.jsx`
  - `README.md`
  - `DEMO_SCRIPT.md`
  - `PHASE_LOG.md`
- **Visual workspace:** Added a cohesive responsive dark application shell with sticky navigation, connection status, branded explorer introduction, consistent panels, real color-range labels, inline control guidance, loading/error states, keyboard focus treatment, reduced-motion behavior, a Data Lab, and a project footer. The wide-screen workspace now places controls, the responsive centered 3D scene, and observation profiles side by side, then collapses cleanly for tablets and phones.
- **3D interaction:** Mapped left mouse to rotate, middle and right mouse to pan, and the wheel to zoom through the existing `OrbitControls`. Added visible rotate, pan, zoom, and reset actions; scene metadata; a guided marker hint; and a mini-map that reports only the actual loaded latitude/longitude extent. No coastline, bathymetry, terrain, or other untraceable geometry was introduced.
- **Context and requirement coverage:** Added `/about` with a one-line problem statement, before/after workflow, guided workspace callouts, impact statement, and explicit PS 26067 coverage for variables, scientific controls, true isosurfaces, multi-instrument observations, RMSE, uploads, OGC services, and outreach usability. Glider/CTD sample status remains prominent.
- **Documentation:** Added a complete setup, provenance, capability, usage, upload, OGC, and validation guide in `README.md`, plus a timed 5–6 minute judge walkthrough and direct data-honesty answers in `DEMO_SCRIPT.md`.
- **Deviations from the plan:** No frontend dependency or routing package was added; the two static application routes use `window.location.pathname`. The mini-map intentionally visualizes only model bounds rather than fabricating a coastline. Remote Google font loading has system-font fallbacks, so the interface remains usable if fonts are unavailable.
- **Manual test:**
  1. Start the backend with `backend/.venv/Scripts/python.exe -m uvicorn backend.main:app --reload`, start the frontend with `npm run dev --prefix frontend`, and open `http://localhost:5173`.
  2. At desktop width, confirm the control rail, responsive 3D scene, and profile panel sit side by side. Resize below 900 px and 640 px and confirm panels stack without horizontal overflow and camera buttons remain usable.
  3. Confirm all variable, range, scale, opacity, vertical-exaggeration, isosurface, depth, time, particle, upload, and source controls have visible labels or tooltips and clear keyboard focus.
  4. Left-drag to rotate, middle-drag to pan, and wheel-scroll to zoom. Exercise the four camera toolbar actions and confirm **Reset** restores the initial view.
  5. Confirm the region mini-map coordinates match the loaded payload, loading overlays appear during date/variable updates, and no invented terrain or bathymetry appears.
  6. Select Core Argo, BGC-Argo, and sample Glider/CTD markers. Confirm profiles remain legible on the dark background, RMSE appears when available, and sample data is clearly labelled.
  7. Test the Data Lab with the bundled source and a valid upload, then visit `http://localhost:5173/about` and verify the workflow, guided callouts, impact statement, coverage list, navigation, and return links.
- **Automated validation:** All 29 backend `unittest` tests pass and Python byte-compilation succeeds. The frontend production build passes with only Vite's existing non-fatal large-chunk advisory. `git diff --check` passes.

## Phase 13 — Focused Visual/UX Correction

- **Status:** Complete
- **Files changed:**
  - `frontend/src/styles.css`
  - `frontend/src/components/OceanScene3D.jsx`
  - `frontend/src/components/ProfileChart.jsx`
  - `PHASE_LOG.md`
- **Light visual system:** Replaced the dark application chrome with white and pale-blue surfaces, clear blue-grey borders, teal interactive states, softer shadows, and higher-contrast scientific typography across the Explorer, Data Lab, profile UI, and About page. The WebGL plotting viewport intentionally remains deep navy so the real ocean color scale and instrument markers retain contrast. Existing labels, values, provenance, and sample-data warnings are unchanged.
- **Workspace layout:** Kept visual controls in a viewport-bounded sticky sidebar beside a scene that consumes the remaining desktop width. The observation panel remains a third column on very wide screens and moves below the controls/scene pair at common desktop widths; the established stacked layout remains below 900 px. The earlier fluid 16–20 px root typography and equal Data Lab card proportions are retained, with the heatmap width capped but its intrinsic aspect ratio unrestricted.
- **Fullscreen and camera interaction:** Added accessible native Fullscreen API controls to the 3D scene and observation-profile panels, including synchronized collapse labels and Escape-key compatibility. Rotate and Pan are now true mutually exclusive interaction modes: selecting either maps left-click drag to the corresponding existing `OrbitControls` action, while middle/right drag continues to pan and the wheel continues to zoom. Pan mode exposes grab/grabbing cursor feedback. Zoom and Reset retain their existing camera behavior.
- **Scope/deviations:** No data loading, API calls, source labels, Three.js scene rendering, camera position math, or scientific computations were changed. `ProfileChart.jsx` only changes Chart.js presentation colors and label sizes for the light surface. No dependencies were added.
- **Manual test:**
  1. Start the backend with `backend/.venv/Scripts/python.exe -m uvicorn backend.main:app --reload`, start the frontend with `npm run dev --prefix frontend`, and open `http://localhost:5173`.
  2. At desktop widths above 900 px, confirm the sticky controls and 3D scene remain visible together while scrolling within long controls; at very wide widths confirm the profile is a third column, and at narrower widths confirm panels stack without horizontal overflow.
  3. Confirm the Explorer, Data Lab, observation panel, and `/about` use light surfaces, crisp borders, readable dark text, and teal/blue controls, while the plotting viewport remains dark for data contrast. Check at 125%, 150%, and 200% browser zoom.
  4. Select **Rotate** and confirm left-drag orbits the camera. Select **Pan** and confirm the active state and grab cursor appear and left-drag pans. Confirm wheel zoom works in both modes, middle/right drag still pans, and **Reset** restores the default view.
  5. Use **Enlarge** on the scene, confirm it fills the viewport and resizes correctly, then use **Collapse** or Escape. Select an instrument, repeat for the observation profile, and confirm its chart grows to the available viewport.
  6. Recheck Core Argo, BGC-Argo, and Glider/CTD profiles to confirm all real labels and the existing **SAMPLE DATA** warnings remain exactly visible.
- **Automated validation:** All 29 backend `unittest` tests pass and Python byte-compilation succeeds. The frontend production build passes with only Vite's existing non-fatal large-chunk advisory. `git diff --check` passes.

## Phase 13 — 3D Viewport and Profile Window UX Correction

- **Status:** Complete
- **Files changed:**
  - `frontend/src/components/OceanScene3D.jsx`
  - `frontend/src/components/ProfileChart.jsx`
  - `frontend/src/styles.css`
  - `PHASE_LOG.md`
- **Scene interaction:** Kept one mounted WebGL canvas and the same single `OrbitControls` instance in normal and enlarged views. The active Rotate/Pan left-button mapping is now explicitly reapplied on native fullscreen transitions, while the existing container `ResizeObserver` continues to resize that same renderer. Pan retains grab/grabbing feedback; wheel zoom and the existing camera actions are unchanged.
- **Viewport presentation:** Replaced the flat dark clear color with a transparent WebGL clear over a layered dark-navy CSS gradient, then added a rounded blue-grey frame and restrained inset/drop shadows. This remains intentionally dark for the existing scientific color scales and marker colors; scene objects, materials, geometry, lighting, and camera math were not changed.
- **Profile enlargement and chart separation:** Observation profiles now enlarge into a bounded in-app window rather than browser fullscreen. The window closes through Collapse, its backdrop, or Escape. Each unit group is presented in its own bordered chart card, with observed temperature shown as a solid amber line with points and model temperature as a thicker dashed blue line; no measurements, grouping, labels, units, or comparison computations changed.
- **Extent and tooltip clarity:** Replaced the decorative but non-informative region box with a chrome-free single-line model-extent caption. Instrument hover details now use a solid near-white surface, dark high-contrast text, and a stronger shadow while preserving the sample-data warning and marker-specific border accent.
- **Manual test:**
  1. Select **Rotate**, left-drag in the normal 3D view, enlarge it, and left-drag again; confirm both orbit the same camera. Repeat with **Pan** and confirm left-drag pans with grab/grabbing cursors in both views. Confirm wheel zoom, Reset, Collapse, and browser Escape still work.
  2. Confirm the scene viewport has a rounded navy gradient frame rather than a flat black rectangle, while temperature, salinity, currents, isosurfaces, and orange/green/purple markers remain legible.
  3. Select profiles that produce one and multiple unit charts, click profile **Enlarge**, and confirm a bounded window appears without browser fullscreen. Verify chart cards remain separate, observed/model temperature lines are visually distinct, scrolling works, and Collapse, backdrop click, and Escape close the window.
  4. Confirm the top-right overlay is a concise `Model extent` coordinate caption with no empty map box. Hover Core Argo, BGC-Argo, and sample Glider/CTD markers and confirm the top-left tooltip is readable and sample records still say `SAMPLE DATA — not live`.
- **Scope/deviations:** The request allowed either an actual regional graphic or a simplified caption, so the caption option was used to avoid introducing a misleading schematic. No data loading, API calls, scientific calculations, camera-position math, or data-object rendering behavior changed. The renderer's alpha option only exposes the CSS viewport gradient behind the unchanged Three.js scene.
- **Automated validation:** All 29 backend `unittest` tests pass and Python byte-compilation succeeds. The frontend production build passes with only Vite's existing non-fatal large-chunk advisory. `git diff --check` passes.

## Phase 13 — Standard Pan and Workspace Priority Correction

- **Status:** Complete
- **Files changed:**
  - `frontend/src/components/OceanScene3D.jsx`
  - `frontend/src/App.jsx`
  - `frontend/src/styles.css`
  - `PHASE_LOG.md`
- **Standard scene interaction:** Removed the Rotate/Pan left-click mode state and restored the established `OrbitControls` mapping: left drag rotates, middle drag pans, and the wheel zooms. Rotate and Pan remain available as one-click camera nudges rather than persistent modes. Canvas-scoped non-passive middle-button handlers prevent browser autoscroll/default middle-click behavior, while scene-only overscroll containment avoids affecting normal scrolling elsewhere on the page.
- **Single scene frame:** Removed the inner scene-stage margin, border, radius, and shadow so the scene panel provides one clean outer frame. The dark navy viewport gradient remains directly inside that frame; no WebGL scene objects, geometry, materials, lighting, or renderer data behavior changed.
- **Balanced workspace:** Increased the Explorer width ceiling and rebalanced the wide three-column grid to approximately 18% controls, 51% 3D scene, and 31% observation profile, with a 390 px profile minimum. Existing two-column behavior at 1500 px and stacked mobile behavior remain intact.
- **Prominent Data Lab:** Moved the existing upload and source-grid workflow directly below the Explorer introduction and before the main workspace. Added a clearly elevated, primary-workflow visual container without changing upload state, API calls, validation, or heatmap behavior.
- **Scope/deviations:** No data loading, scientific computations, API contracts/calls, Three.js scene-object rendering, or camera math changed. No dependencies were added.
- **Manual test:**
  1. In the 3D canvas, confirm left drag rotates, middle-button drag pans without triggering the browser autoscroll icon or moving the page, and wheel input zooms. Move outside the canvas and confirm the page still scrolls normally. Confirm Rotate/Pan buttons perform one camera nudge and Reset restores the default view.
  2. Confirm the scene has one clean outer panel border with no inset second frame around the navy viewport, in both normal and enlarged views.
  3. At widths above 1500 px, confirm the profile panel is a substantial third column and its charts are readily readable beside controls and scene. At 1500 px and below, confirm the profile moves below the control/scene pair; below 900 px, confirm all panels stack without horizontal overflow.
  4. Confirm Data Lab appears immediately below the page introduction, reads as a primary workflow, and still switches between demo and uploaded NetCDF sources, uploads a valid file, reports validation feedback, and updates the source-grid preview.
- **Automated validation:** Frontend production build, backend test suite, Python byte-compilation, and `git diff --check` pass. Vite's existing non-fatal large-chunk advisory remains.

## Phase 14 - Comparison and Justification Page

- **Status:** Complete
- **Files changed:**
  - `frontend/src/App.jsx`
  - `frontend/src/pages/ComparisonPage.jsx`
  - `frontend/src/styles.css`
  - `PHASE_LOG.md`
- **Page:** Added a dedicated `/comparison` route and navigation item. The page contains a source-linked comparison table for Ferret, Ocean Data View, and MATLAB ocean toolboxes; a narrowly-scoped explanation of what the already-built OceanScope Explorer adds; and an OceanScope-owned proof panel that references the working Explorer and OGC routes without reproducing third-party interfaces.
- **Factual-source policy:** The page uses only the Phase 14 research already recorded in `ARCHITECTURE.md`. No new external claim, statistic, or feature comparison was added. OceanScope statements are limited to features implemented in this repository: browser-native 3D, Argo/BGC-Argo overlays, profile/RMSE comparison, NetCDF upload ingestion, and WMS/WCS routes.
- **Every external source cited on the page:**
  - Ferret history: `https://ferret.pmel.noaa.gov/static/Documentation/rostock_paper/paper.html`
  - Ferret NetCDF documentation: `https://ferret.pmel.noaa.gov/Ferret/documentation/users-guide/data-set-basics/NETCDF-DATA`
  - Ferret overview: `https://en.wikipedia.org/wiki/Ferret_Data_Visualization_and_Analysis`
  - Ocean Data View: `https://odv.awi.de/`
  - ODV format documentation: `https://www.bodc.ac.uk/resources/delivery_formats/odv_format/`
  - MATLAB Argo Toolbox: `https://www.mathworks.com/matlabcentral/fileexchange/54503-argo-toolbox`
  - SEA-MAT: `https://sea-mat.github.io/sea-mat/`
  - MATLAB NetCDF/OPeNDAP/GRIB example: `https://polar.ncep.noaa.gov/global/examples/usingmatlab2.shtml`
  - `ocean_data_tools`: `https://github.com/lnferris/ocean_data_tools`
- **Manual test:**
  1. Start the backend with `backend/.venv/Scripts/python.exe -m uvicorn backend.main:app --reload`, start the frontend with `npm run dev --prefix frontend`, and open `http://localhost:5173/comparison`.
  2. Confirm the Comparison navigation item is active and the page follows the existing light Explorer/Mission & Impact visual system.
  3. Check every comparison-table row: each external statement has one or more linked sources, and the table remains horizontally scrollable at narrow widths.
  4. Open the Explorer proof link and verify the working 3D scene, instrument markers, profile/RMSE flow, and upload workflow. Open the WMS API reference and verify the capabilities XML from the running backend.
  5. Resize below 800 px and 520 px and confirm the hero, feature cards, proof panel, table, and CTA remain readable without breaking the page layout.
- **Automated validation:** Frontend production build passes. `git diff --check` passes. Vite reports only the existing non-fatal large-chunk advisory.

## Focused Fix - Bathymetry Mesh Rendering and Upload Clarity

- **Status:** Complete.
- **Bathymetry rendering fix:** Kept the GEBCO source/cache and API unchanged. The floor now uses a moderate mesh sampled from the cached regional grid, with a small local elevation average per vertex to remove high-frequency jaggedness. Positive land elevations are treated as zero ocean depth for floor placement, bathymetry is offset below the volume bottom to avoid wireframe z-fighting, depth relief is scaled from the real GEBCO minimum, and smooth vertex normals are explicitly retained for continuous lighting.
- **Upload clarity fix:** Added a clear Data Lab explanation that any subset may be uploaded independently and missing fields continue to use bundled Copernicus data. Each slot now states its optional status, format, and exact required variables/dimensions.
- **Files changed:** `frontend/src/components/OceanScene3D.jsx`, `frontend/src/components/DatasetUpload.jsx`, `frontend/src/styles.css`, `PHASE_LOG.md`.
- **Manual verification:** Restart the app, rotate and zoom the 3D scene, and confirm GEBCO relief is continuous, smooth-lit, and free of dark fragmented patches or bottom-edge flicker. Confirm existing volume layers, markers, particles, isosurface, and controls remain unchanged. In Data Lab, verify the intro explains partial uploads and each Temperature, Salinity, Currents, and Instrument slot visibly lists Optional, accepted format, and required fields.
- **Automated validation:** Frontend production build passes with only Vite's existing non-fatal large-chunk advisory. `git diff --check` passes.

## Phase 15 - Multi-Dataset Upload and External Hazard Overlays

- **Status:** Complete for 15a and GDACS 15b; PFZ intentionally skipped after endpoint verification.
- **15a multi-dataset upload:** Added independent optional NetCDF slots for temperature (`thetao`), salinity (`so`), and currents (`uo`/`vo`). Each slot validates the shared `(time, depth, latitude, longitude)` contract independently and stores its own upload. Added CSV or NetCDF instrument/point-data ingestion with required latitude, longitude, depth, and time fields, one or more measured values, unified profile metadata, and `data_status=uploaded`. The selected uploaded field drives the slice/layer extent, so the scene does not require every field or a fixed India EEZ grid.
- **15b GDACS:** Added a backend proxy for `https://www.gdacs.org/gdacsapi/api/Events/geteventlist/EVENTS4APP`, with no credential required by the documented integration. Tropical-cyclone events are normalized, filtered to the active model extent plus a 5-degree display margin, and rendered as a red track and latest-position marker in the 3D scene. The control reports loading, active-near-extent, no-active-cyclone, and unavailable states.
- **PFZ endpoint verification:** Checked the architecture-listed `https://incois.gov.in/geoportal/MFASPFZ/index.html` (reachable HTTP 200) and `https://incois.gov.in/gisserver/PFZ/index.html` (HTTP 404). The reachable WebGIS is a Leaflet page whose inspected layer requests use WMS paths such as `/geoserver/PFZ-TUNA-SST-CHL/wms`; no reachable public REST/ArcGIS `FeatureServer`/`MapServer` endpoint was exposed at the listed URLs. PFZ is therefore not integrated, with no placeholder or approximated advisory added.
- **Files changed:** `backend/main.py`, `backend/routers/hazards.py`, `backend/routers/instruments.py`, `backend/routers/ocean.py`, `backend/services/hazards.py`, `backend/services/instruments.py`, `backend/services/slicer.py`, `frontend/src/api/client.js`, `frontend/src/components/DatasetUpload.jsx`, `frontend/src/components/HeatmapCanvas.jsx`, `frontend/src/components/OceanScene3D.jsx`, `frontend/src/App.jsx`, `frontend/src/styles.css`, `PHASE_LOG.md`.
- **Manual verification:** Upload each model slot independently and confirm its Ready state, selected field, 2D preview, 3D layers, and extent update without uploading the other fields. Upload a CSV/NetCDF point file and confirm the instrument catalog shows `uploaded` provenance. Open the Explorer with backend running, confirm the hazard status is honest, and when GDACS returns an in-extent active cyclone confirm its red track/marker appears; otherwise confirm the no-active or unavailable message. Confirm no PFZ layer or fabricated fishing-zone shape appears.
- **Automated validation:** Backend byte-compilation and all 29 existing `unittest` tests pass. Frontend production build passes with only Vite's existing non-fatal large-chunk advisory. `git diff --check` passes.

## Phase 17 - Layer Isolation View Mode

- **Status:** Complete.
- **Implementation:** Added a Composite/Bathymetry only/Selected depth layer only/Isosurface only/Instruments only selector. Every mode reuses the existing Three.js scene, camera, controls, and renderer; it changes only visibility on the existing planes, GEBCO mesh, isosurface, instrument group, current particles, cyclone group, and wireframe.
- **Behavior:** Composite remains the default. Camera position, rotation, zoom, data requests, and layer data remain unchanged when switching focus modes. The selected-depth mode follows the currently highlighted depth layer, including after the depth slider changes.
- **Files changed:** `frontend/src/components/VisualizationControls.jsx`, `frontend/src/components/OceanScene3D.jsx`, `frontend/src/styles.css`, `PHASE_LOG.md`.
- **Manual verification:** In Explorer, switch through each View option and confirm only the requested existing objects are visible. Confirm Bathymetry only shows the GEBCO floor, Selected depth layer only shows one plane, Isosurface only shows the isosurface, and Instruments only shows markers. Return to Composite and confirm all layers return. Rotate, pan, zoom, change depth, and change variables before and after switching; confirm the same camera and data behavior remain.
- **Automated validation:** Frontend production build passes and `git diff --check` passes.

## Phase 16 - Real GEBCO Seafloor Bathymetry

- **Status:** Complete.
- **Source and access:** Used the public GEBCO 2026 gridded bathymetry source documented at `https://www.gebco.net/data-products/gridded-bathymetry-data` and its public CEDA THREDDS/OPeNDAP dataset URL: `https://dap.ceda.ac.uk/thredds/dodsC/bodc/gebco/global/gebco_2026/ice_surface_elevation/netcdf/GEBCO_2026.nc`. Access was reachable without credentials or additional setup.
- **Regional cache:** Downloaded and cached only the `68–90°E, 5–22°N` India EEZ subset, downsampled by a factor of eight for a performant scene mesh. The committed NetCDF cache is `backend/data/gebco_2026_india_eez.nc` (510 latitude cells × 660 longitude cells, approximately 706 KB); the global grid was not downloaded.
- **3D rendering:** Added `/api/bathymetry` and a Three.js displaced floor mesh beneath the unchanged temperature, salinity, current, isosurface, particle, and instrument layers. Elevations remain sourced from the cached GEBCO values; the mesh is a restrained scientific surface rather than decorative terrain. Added the required GEBCO 2026 attribution caption in the scene.
- **Files changed:** `backend/data/gebco_2026_india_eez.nc`, `backend/services/bathymetry.py`, `backend/routers/ocean.py`, `frontend/src/api/client.js`, `frontend/src/components/OceanScene3D.jsx`, `frontend/src/styles.css`, `PHASE_LOG.md`.
- **Manual verification:** Start the backend and frontend, open Explorer, rotate and zoom the 3D scene, and confirm the floor shows measured relief beneath the water-column planes. Check that the `Seafloor: GEBCO 2026 bathymetry` caption is visible. Switch temperature, salinity, currents, isosurface, particles, markers, and uploaded datasets to confirm they still work unchanged. Compare the demo region with an uploaded dataset covering the same India EEZ bounds.
- **Automated validation:** GEBCO cache read successfully (`510 × 660`, elevations `-5235 m` to `2573 m`), Python byte-compilation passes, and frontend production build passes with only Vite's existing non-fatal large-chunk advisory. `git diff --check` passes.

## Phase 18 - Landing Page

- **Status:** Complete.
- **Implementation:** Replaced the previous landing experience with the five sections specified in Architecture section 7: Hero, The problem, What it does, Proof, and Final CTA. Hero and problem wording is reused verbatim from Mission & Impact; capability labels describe only implemented variables, RMSE comparison, true isosurfaces, real currents, GEBCO bathymetry, upload, and OGC endpoints.
- **Live scene and performance:** The hero mounts the existing `OceanScene3D` once in an additive presentation mode. It uses the real model-layer, current-vector, and bathymetry paths, allocates 96 rather than 320 current particles, omits the Explorer controls/profile UI, and slowly idle-rotates. The Proof section links back to that same live view instead of mounting a second WebGL context. Existing renderer, geometry, material, texture, control, observer, listener, and animation-frame cleanup runs when the component unmounts.
- **Theme and accessibility:** Removed the separate dark cinematic landing system and reused the site's existing light tokens, typography, cards, workflow comparison, buttons, spacing, and responsive patterns. `prefers-reduced-motion: reduce` disables idle rotation and current-particle animation. Semantic section headings and keyboard-focusable CTA links are retained.
- **Scope:** `/explorer`, `/about`, and `/comparison` route source and content were not changed. The shared scene's default props preserve existing Explorer behavior; only the explicit landing presentation prop enables the lightweight mode. No image-generation service, generated image, scroll listener, or scroll-jacked animation engine was added.
- **Files changed:** `ARCHITECTURE.md` (updated Phase 17/18 specification supplied before implementation), `frontend/src/pages/LandingPage.jsx`, `frontend/src/components/OceanScene3D.jsx`, `frontend/src/utils/currentParticles.js`, `frontend/src/styles.css`, `PHASE_LOG.md`.
- **Manual verification:** Start the backend and frontend, then open `/`. Confirm the page contains the five sections in order, the hero shows the real live ocean scene, and only one canvas/WebGL context is present. Confirm **Explore OceanScope** opens `/explorer`, **See how it works** opens `/about`, and the Proof links work. Test desktop, tablet, and mobile widths. Enable reduced motion at OS/browser level, reload `/`, and confirm the scene does not idle-rotate or animate current particles. Navigate to `/explorer`, `/about`, and `/comparison` and confirm each remains unchanged.
- **Automated validation:** Frontend production build passes with only Vite's existing non-fatal large-chunk advisory. Static checks confirm exactly five landing sections and one `OceanScene3D` mount; `git diff --check` passes; protected page source diffs are empty.
