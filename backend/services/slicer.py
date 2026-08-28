from functools import lru_cache
from pathlib import Path
from typing import Any

import numpy as np
import xarray as xr

DATA_FILE = (
    Path(__file__).resolve().parents[1]
    / "data"
    / "copernicus_thetao_india_20260831_20260906.nc"
)
SUPPORTED_VARIABLES = {"thetao"}


class OceanDataUnavailableError(RuntimeError):
    """Raised when the local Copernicus subset cannot be opened."""


@lru_cache(maxsize=1)
def get_dataset() -> xr.Dataset:
    """Open the local Copernicus subset once and reuse it across requests."""
    if not DATA_FILE.is_file():
        raise OceanDataUnavailableError(
            f"Copernicus subset not found at {DATA_FILE}."
        )

    try:
        return xr.open_dataset(DATA_FILE)
    except (OSError, ValueError) as error:
        raise OceanDataUnavailableError(
            f"Unable to open Copernicus subset at {DATA_FILE}."
        ) from error


def request_slice(depth: float, variable: str) -> dict[str, Any]:
    """Return the nearest-depth grid at the latest available model time."""
    if variable not in SUPPORTED_VARIABLES:
        raise ValueError(
            f"Unsupported variable '{variable}'. Supported variables: thetao."
        )

    dataset = get_dataset()
    if variable not in dataset:
        raise OceanDataUnavailableError(
            f"Variable '{variable}' is missing from the Copernicus subset."
        )

    data = dataset[variable].sel(depth=depth, method="nearest").isel(time=-1)
    values = data.values
    json_values = np.where(np.isfinite(values), values, None).tolist()

    selected_depth = float(data["depth"].item())
    selected_time = np.datetime_as_string(data["time"].values, unit="s") + "Z"

    return {
        "variable": variable,
        "unit": data.attrs.get("units", ""),
        "requested_depth": depth,
        "depth": selected_depth,
        "time": selected_time,
        "latitudes": data["latitude"].values.tolist(),
        "longitudes": data["longitude"].values.tolist(),
        "values": json_values,
    }
