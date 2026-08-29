# OceanScope — India EEZ Ocean Intelligence

OceanScope is a browser-based 3D ocean-data workspace built for **SIH Problem Statement 26067**. It brings Copernicus Marine forecast volumes, in-situ observations, model validation, scientist uploads, and standards-based GIS delivery into one traceable interface.

The application prioritizes scientific clarity over decorative realism: every rendered layer, current vector, profile, and isosurface is derived from real or user-supplied data. Glider and CTD demonstration records are explicitly labelled as sample data.

## What is implemented

- Responsive 3D depth stack for temperature, salinity, and current magnitude
- Real value ranges and units, linear/log color scaling, opacity, depth, time, and vertical-exaggeration controls
- True marching-cubes isosurface extraction from the loaded scalar volume
- Animated particles driven by Copernicus Marine `uo`/`vo` vectors
- Core Argo and BGC-Argo overlays plus clearly labelled sample Glider/CTD records
- Clickable observation profiles with model comparison and temperature RMSE
- Validated CF-style NetCDF `thetao` upload workflow
- OGC WMS 1.3.0 and WCS 2.0.1 endpoints
- Dedicated mission, workflow, impact, and requirement-coverage page at `/about`
- Responsive dark UI with keyboard focus states, control guidance, loading states, and reduced-motion support

## Data provenance

The bundled model subset comes from Copernicus Marine product `GLOBAL_ANALYSISFORECAST_PHY_001_024` for the India EEZ bounding box (68–90°E, 5–22°N). Model variables are `thetao`, `so`, `uo`, and `vo`. Real Argo and BGC-Argo records come from Argo GDAC.

Large data files, uploads, and credentials are intentionally gitignored. The repository does not fabricate coastlines, bathymetry, or terrain. The scene mini-map reports only the geographic bounds of the loaded model data.

## Technology

- **Frontend:** React 19, Three.js, Chart.js, Vite
- **Backend:** FastAPI, xarray, netCDF4, Pillow
- **Formats and standards:** NetCDF/CF, WMS 1.3.0, WCS 2.0.1

## Local setup

Prerequisites: Python 3.11+ and Node.js 20+.

```powershell
git clone https://github.com/Tanishktewetia/incois-ocean-3d-viz.git
cd incois-ocean-3d-viz

python -m venv backend/.venv
backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.txt
npm install --prefix frontend
```

Place the required Copernicus Marine NetCDF subsets and downloaded Argo indexes under `backend/data/`. These files are not committed because of their size. Copernicus credentials are used only for data acquisition and must not be stored in the repository.

Run the API and frontend in separate terminals from the repository root:

```powershell
backend/.venv/Scripts/python.exe -m uvicorn backend.main:app --reload
```

```powershell
npm run dev --prefix frontend
```

Open:

- Explorer: <http://localhost:5173/>
- Mission and impact: <http://localhost:5173/about>
- FastAPI documentation: <http://127.0.0.1:8000/docs>

The Vite development server proxies API, WMS, and WCS requests to the backend.

## Using the workspace

1. Choose temperature, salinity, or current magnitude in the left control rail.
2. Adjust color bounds, scaling, opacity, vertical exaggeration, depth, or model date.
3. Rotate with left-drag, pan with middle-drag, and zoom with the wheel. The scene toolbar provides rotate, pan, zoom, and reset actions.
4. Enable a true isosurface and move its threshold to inspect a data-derived 3D boundary.
5. Enable surface currents to animate real `uo`/`vo` vectors.
6. Click an instrument marker to inspect its profile and, where available, model RMSE.
7. Use the Data Lab to validate and visualize a compatible NetCDF file.

## NetCDF uploads

Uploads are limited to 100 MiB and must contain `thetao` with time, depth, latitude, and longitude coordinates. Uploaded data enables the temperature workflow; salinity and current overlays remain tied to the bundled model unless corresponding ingestion support is added.

## OGC services

With the backend running:

- WMS endpoint: `http://127.0.0.1:8000/wms`
- WCS endpoint: `http://127.0.0.1:8000/wcs`

Use `REQUEST=GetCapabilities` with the appropriate `SERVICE` and supported version to discover layers, coverages, formats, and query parameters.

## Validation

```powershell
backend/.venv/Scripts/python.exe -m unittest discover -s backend/tests -v
backend/.venv/Scripts/python.exe -m compileall -q backend
npm run build --prefix frontend
git diff --check
```

## Demonstration

See [`DEMO_SCRIPT.md`](DEMO_SCRIPT.md) for a focused 5–6 minute judge walkthrough.