from functools import lru_cache
from pathlib import Path
from typing import Any

import numpy as np
import xarray as xr

DATA_FILE = (
    Path(__file__).resolve().parents[1]
    / "data"
    / "copernicus_thetao_india_20260818_20260824.nc"
)
CURRENTS_DATA_FILE = (
    Path(__file__).resolve().parents[1]
    / "data"
    / "copernicus_currents_india_20260818_20260824.nc"
)
SUPPORTED_VARIABLES = {"thetao"}
LAYER_DEPTHS = (0, 50, 100, 200, 500, 1000, 1500, 2000)
CURRENT_GRID_STRIDE = 4


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


@lru_cache(maxsize=1)
def get_currents_dataset() -> xr.Dataset:
    """Open the matching Copernicus surface-current subset once."""
    if not CURRENTS_DATA_FILE.is_file():
        raise OceanDataUnavailableError(
            f"Copernicus current subset not found at {CURRENTS_DATA_FILE}."
        )

    try:
        dataset = xr.open_dataset(CURRENTS_DATA_FILE)
    except (OSError, ValueError) as error:
        raise OceanDataUnavailableError(
            f"Unable to open Copernicus current subset at {CURRENTS_DATA_FILE}."
        ) from error

    if "uo" not in dataset or "vo" not in dataset:
        raise OceanDataUnavailableError(
            "Copernicus current subset must contain both 'uo' and 'vo'."
        )
    return dataset


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


def request_layers(variable: str, time: str | None = None) -> dict[str, Any]:
    """Return representative depth grids at the requested model time."""
    if variable not in SUPPORTED_VARIABLES:
        raise ValueError(
            f"Unsupported variable '{variable}'. Supported variables: thetao."
        )

    dataset = get_dataset()
    if variable not in dataset:
        raise OceanDataUnavailableError(
            f"Variable '{variable}' is missing from the Copernicus subset."
        )

    try:
        selected = (
            dataset[variable].sel(
                time=np.datetime64(time.removesuffix("Z")), method="nearest"
            )
            if time
            else dataset[variable].isel(time=-1)
        )
    except ValueError as error:
        raise ValueError(f"Invalid time '{time}'. Use an ISO 8601 timestamp.") from error

    layers = []
    for requested_depth in LAYER_DEPTHS:
        data = selected.sel(depth=requested_depth, method="nearest")
        values = np.where(np.isfinite(data.values), data.values, None).tolist()
        layers.append(
            {
                "requested_depth": requested_depth,
                "depth": float(data["depth"].item()),
                "values": values,
            }
        )

    selected_time = np.datetime_as_string(selected["time"].values, unit="s") + "Z"
    available_times = [
        np.datetime_as_string(value, unit="s") + "Z"
        for value in dataset["time"].values
    ]

    return {
        "variable": variable,
        "unit": selected.attrs.get("units", ""),
        "time": selected_time,
        "times": available_times,
        "latitudes": selected["latitude"].values.tolist(),
        "longitudes": selected["longitude"].values.tolist(),
        "layers": layers,
    }


def request_currents(time: str | None = None) -> dict[str, Any]:
    """Return a lightweight, nearest-time surface u/v vector field."""
    dataset = get_currents_dataset()
    try:
        selected = (
            dataset[["uo", "vo"]].sel(
                time=np.datetime64(time.removesuffix("Z")), method="nearest"
            )
            if time
            else dataset[["uo", "vo"]].isel(time=-1)
        )
    except ValueError as error:
        raise ValueError(f"Invalid time '{time}'. Use an ISO 8601 timestamp.") from error

    if "depth" in selected.dims:
        selected = selected.isel(depth=0)
    selected = selected.isel(
        latitude=slice(None, None, CURRENT_GRID_STRIDE),
        longitude=slice(None, None, CURRENT_GRID_STRIDE),
    )

    eastward = np.asarray(selected["uo"].values, dtype=float)
    northward = np.asarray(selected["vo"].values, dtype=float)
    finite_pairs = np.isfinite(eastward) & np.isfinite(northward)
    eastward = np.where(finite_pairs, eastward, None).tolist()
    northward = np.where(finite_pairs, northward, None).tolist()
    selected_time = np.datetime_as_string(selected["time"].values, unit="s") + "Z"

    return {
        "time": selected_time,
        "depth": float(dataset["depth"].values[0]) if "depth" in dataset.coords else 0.0,
        "unit": selected["uo"].attrs.get("units", "m s-1"),
        "latitudes": selected["latitude"].values.tolist(),
        "longitudes": selected["longitude"].values.tolist(),
        "eastward": eastward,
        "northward": northward,
        "source": "Copernicus Marine GLOBAL_ANALYSISFORECAST_PHY_001_024",
    }
