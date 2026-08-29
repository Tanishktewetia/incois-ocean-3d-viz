# OceanScope Judge Demo — 5–6 Minutes

## Before the demo

1. Start the backend and frontend from the repository root.
2. Confirm the header says **Backend connected** and the initial 3D volume has loaded.
3. Keep one real Core Argo marker and one BGC-Argo marker easy to select.
4. Optionally have a compatible NetCDF upload and a GIS client ready for the final steps.

## 1. The problem — 15 seconds

Open **Mission & impact** (`/about`).

> “Ocean scientists often move between large NetCDF files, scripts, mapping tools, profile tools, and GIS exports just to answer one question about one water column. OceanScope turns that fragmented workflow into one browser-based, traceable view.”

Briefly point to the before/after workflow and return to **Explorer**.

## 2. Explore the 3D ocean — 30 seconds

> “This is a real Copernicus Marine subset over the India EEZ—not decorative terrain. The layers, geographic bounds, date, range, and units all come from the loaded model.”

- Left-drag to rotate.
- Middle-drag to pan and use the wheel to zoom.
- Use **Reset** to return to the default camera.
- Switch **Temperature → Salinity → Current magnitude** and call out the changing units and real color range.

## 3. Move through depth and time — 45 seconds

- Drag the **Depth** slider through the eight displayed model levels.
- Increase **Vertical scale** so separation through the water column is easier to inspect.
- Move the **Model date** control, then press **Play** briefly.

> “The same bounded region stays spatially stable while we move through depth and seven forecast days.”

## 4. Tune the scientific rendering — 35 seconds

- Adjust the minimum and maximum color bounds.
- Toggle **Linear** and **Log** scaling where the selected range permits it.
- Reduce and restore layer opacity.

> “These are analytical controls, not visual filters: every label retains the variable’s real unit and each invalid range is rejected inline.”

## 5. Extract a true isosurface — 30 seconds

- Enable **True isosurface**.
- Move the threshold slowly and rotate the scene.

> “This mesh is generated from the loaded 3D scalar field with marching cubes. It is not another flat layer or an invented seabed.”

Disable it before continuing if that makes the markers easier to see.

## 6. Validate against observations — 50 seconds

- Click a **Core Argo** marker.
- Point to the side-by-side observed/model profile and temperature RMSE.
- Click a **BGC-Argo** marker and mention its biogeochemical variables.
- Point out the purple Glider/CTD legend and sample warning.

> “Core Argo and BGC-Argo come from real GDAC records. Public India-EEZ live Glider and CTD feeds are not reliably available, so those demonstration records are honestly and repeatedly labelled sample data rather than presented as live observations.”

## 7. Show real current motion — 20 seconds

- Select **Current magnitude** if needed.
- Enable **Surface currents**.

> “Particle motion is driven by Copernicus eastward and northward velocity—`uo` and `vo`—for the selected model day.”

## 8. Bring researcher data — 25 seconds

Scroll to **Data lab**.

- Show the 2D source grid and its bounds, date, depth, and real temperature range.
- Choose a compatible `.nc` file and click **Upload and use**.

> “The backend validates the file size, variable, dimensions, and coordinates before the same visual workflow uses it. Uploads are never silently treated as another variable source.”

## 9. Standards interoperability — 20 seconds, optional

Open the WMS or WCS capabilities response, or a layer already loaded in a GIS client.

> “The same data is available through OGC WMS 1.3.0 for maps and WCS 2.0.1 for native NetCDF coverage subsets, so this interface does not become another data silo.”

## 10. Close with impact — 15 seconds

Return to the impact statement on `/about`.

> “OceanScope turns days of ocean-data preparation into minutes of visual, comparable, shareable understanding—for researchers, planners, educators, and operational teams across the Indian Ocean.”

## Questions to answer plainly

- **Is the terrain real?** There is no terrain or bathymetry rendering. Every scientific surface shown comes from loaded scalar data.
- **Are all instruments live?** Core Argo and BGC-Argo use real GDAC data. Glider and CTD records are clearly labelled demonstration samples.
- **Is the isosurface real?** Yes. It is extracted from a trilinearly resampled scalar volume with Three.js marching cubes.
- **Can scientists use their own files?** Yes, for validated CF-style NetCDF temperature cubes up to 100 MiB.
- **Can other software use the data?** Yes, through the WMS and WCS endpoints.