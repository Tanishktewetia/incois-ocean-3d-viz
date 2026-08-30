from functools import lru_cache
from pathlib import Path
from typing import Any

import numpy as np
import xarray as xr

BATHYMETRY_FILE = Path(__file__).resolve().parents[1] / "data" / "gebco_2026_india_eez.nc"


@lru_cache(maxsize=1)
def get_bathymetry() -> dict[str, Any]:
    if not BATHYMETRY_FILE.is_file():
        raise RuntimeError("GEBCO regional bathymetry subset is not available.")
    try:
        with xr.open_dataset(BATHYMETRY_FILE) as dataset:
            elevation = np.asarray(dataset["elevation"].values, dtype=float)
            latitudes = np.asarray(dataset["lat"].values, dtype=float)
            longitudes = np.asarray(dataset["lon"].values, dtype=float)
    except (OSError, KeyError, TypeError, ValueError) as error:
        raise RuntimeError("Unable to read the cached GEBCO regional bathymetry subset.") from error
    finite = np.isfinite(elevation)
    if not finite.any():
        raise RuntimeError("GEBCO regional bathymetry contains no finite elevations.")
    return {
        "source": "GEBCO Compilation Group (2026) GEBCO 2026 Grid (doi:10.5285/4f68d5c7-45eb-f999-e063-7086abc036fa)",
        "attribution": "GEBCO Compilation Group 2026 (2026). The GEBCO_2026 Grid - a continuous terrain model for oceans and land at 15 arc-second intervals.",
        "unit": "m",
        "latitudes": latitudes.tolist(),
        "longitudes": longitudes.tolist(),
        "elevations": np.where(finite, elevation, None).tolist(),
        "minimum": float(np.nanmin(elevation)),
        "maximum": float(np.nanmax(elevation)),
    }
