from functools import lru_cache
import os
from pathlib import Path
from typing import Any

import numpy as np
import xarray as xr

DATA_FILE = (
    Path(__file__).resolve().parents[1]
    / "data"
    / "copernicus_thetao_india_20260818_20260824.nc"
)
SALINITY_DATA_FILE = (
    Path(__file__).resolve().parents[1]
    / "data"
    / "copernicus_so_india_20260818_20260824.nc"
)
CURRENTS_DATA_FILE = (
    Path(__file__).resolve().parents[1]
    / "data"
    / "copernicus_currents_india_20260818_20260824.nc"
)
CURRENTS_3D_DATA_FILE = (
    Path(__file__).resolve().parents[1]
    / "data"
    / "copernicus_currents_3d_india_20260818_20260824.nc"
)
SUPPORTED_VARIABLES = {"thetao", "so", "current_magnitude"}
LAYER_DEPTHS = (0, 50, 100, 200, 500, 1000, 1500, 2000)
CURRENT_GRID_STRIDE = 4
UPLOAD_DIRECTORY = Path(__file__).resolve().parents[1] / "uploads"
UPLOAD_DATA_FILE = UPLOAD_DIRECTORY / "scientist_upload.nc"
UPLOAD_TEMP_FILE = UPLOAD_DIRECTORY / "scientist_upload.part"
MAX_UPLOAD_BYTES = 100 * 1024 * 1024
DATA_SOURCES = {"demo", "upload"}


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
def get_salinity_dataset() -> xr.Dataset:
    """Open the matching Copernicus salinity subset once."""
    if not SALINITY_DATA_FILE.is_file():
        raise OceanDataUnavailableError(
            f"Copernicus salinity subset not found at {SALINITY_DATA_FILE}."
        )
    try:
        return xr.open_dataset(SALINITY_DATA_FILE)
    except (OSError, ValueError) as error:
        raise OceanDataUnavailableError(
            f"Unable to open Copernicus salinity subset at {SALINITY_DATA_FILE}."
        ) from error


@lru_cache(maxsize=1)
def get_currents_3d_dataset() -> xr.Dataset:
    """Open the full-depth Copernicus current subset once."""
    if not CURRENTS_3D_DATA_FILE.is_file():
        raise OceanDataUnavailableError(
            f"Copernicus 3D current subset not found at {CURRENTS_3D_DATA_FILE}."
        )
    try:
        dataset = xr.open_dataset(CURRENTS_3D_DATA_FILE)
    except (OSError, ValueError) as error:
        raise OceanDataUnavailableError(
            f"Unable to open Copernicus 3D current subset at {CURRENTS_3D_DATA_FILE}."
        ) from error
    if "uo" not in dataset or "vo" not in dataset:
        raise OceanDataUnavailableError(
            "Copernicus 3D current subset must contain both 'uo' and 'vo'."
        )
    return dataset


@lru_cache(maxsize=1)
def get_upload_dataset() -> xr.Dataset:
    """Open the latest validated scientist upload once."""
    if not UPLOAD_DATA_FILE.is_file():
        raise OceanDataUnavailableError(
            "No scientist dataset has been uploaded yet."
        )

    try:
        return xr.open_dataset(UPLOAD_DATA_FILE)
    except (OSError, ValueError) as error:
        raise OceanDataUnavailableError(
            "Unable to open the uploaded scientist dataset."
        ) from error


def select_dataset(source: str) -> xr.Dataset:
    if source not in DATA_SOURCES:
        raise ValueError("Invalid source. Use 'demo' or 'upload'.")
    return get_dataset() if source == "demo" else get_upload_dataset()


def select_variable(variable: str, source: str) -> xr.DataArray:
    """Resolve stored or derived model fields through one slicer contract."""
    if variable not in SUPPORTED_VARIABLES:
        supported = ", ".join(sorted(SUPPORTED_VARIABLES))
        raise ValueError(
            f"Unsupported variable '{variable}'. Supported variables: {supported}."
        )
    if source not in DATA_SOURCES:
        raise ValueError("Invalid source. Use 'demo' or 'upload'.")
    if source == "upload" and variable != "thetao":
        raise ValueError("Scientist uploads currently support only 'thetao'.")

    if source == "upload" or variable == "thetao":
        dataset = select_dataset(source)
        if variable not in dataset:
            raise OceanDataUnavailableError(
                f"Variable '{variable}' is missing from the selected dataset."
            )
        data = dataset[variable]
    elif variable == "so":
        dataset = get_salinity_dataset()
        if "so" not in dataset:
            raise OceanDataUnavailableError(
                "Variable 'so' is missing from the Copernicus salinity subset."
            )
        data = dataset["so"]
    else:
        currents = get_currents_3d_dataset()
        data = np.hypot(currents["uo"], currents["vo"])
        data.name = "current_magnitude"
        data.attrs = {
            "long_name": "sea water current speed",
            "units": currents["uo"].attrs.get("units", "m s-1"),
        }
    return data


def validate_upload(path: Path) -> dict[str, Any]:
    """Validate the NetCDF contract consumed by the existing slicer."""
    try:
        with xr.open_dataset(path) as dataset:
            if "thetao" not in dataset:
                raise ValueError("NetCDF must contain a 'thetao' variable.")

            variable = dataset["thetao"]
            required_dimensions = ("time", "depth", "latitude", "longitude")
            if variable.dims != required_dimensions:
                raise ValueError(
                    "'thetao' dimensions must be ordered as "
                    "(time, depth, latitude, longitude)."
                )

            for coordinate_name in required_dimensions:
                if coordinate_name not in dataset.coords:
                    raise ValueError(
                        f"NetCDF must contain a '{coordinate_name}' coordinate."
                    )
                coordinate = dataset[coordinate_name]
                if coordinate.ndim != 1 or coordinate.size == 0:
                    raise ValueError(
                        f"Coordinate '{coordinate_name}' must be a non-empty 1-D array."
                    )

            try:
                times = np.asarray(dataset["time"].values, dtype="datetime64[ns]")
            except (TypeError, ValueError) as error:
                raise ValueError("Coordinate 'time' must contain valid datetimes.") from error
            if np.isnat(times).any():
                raise ValueError("Coordinate 'time' must contain valid datetimes.")

            for coordinate_name in ("depth", "latitude", "longitude"):
                try:
                    values = np.asarray(dataset[coordinate_name].values, dtype=float)
                except (TypeError, ValueError) as error:
                    raise ValueError(
                        f"Coordinate '{coordinate_name}' must be numeric."
                    ) from error
                if not np.isfinite(values).all():
                    raise ValueError(
                        f"Coordinate '{coordinate_name}' must contain only finite values."
                    )
                if values.size > 1 and not np.all(np.diff(values) > 0):
                    raise ValueError(
                        f"Coordinate '{coordinate_name}' must be strictly increasing."
                    )

            if dataset.sizes["latitude"] < 2 or dataset.sizes["longitude"] < 2:
                raise ValueError(
                    "Coordinates 'latitude' and 'longitude' must each contain at least two values."
                )
            if not bool(np.isfinite(variable).any().compute().item()):
                raise ValueError("Variable 'thetao' must contain at least one finite value.")

            return {
                "variable": "thetao",
                "unit": variable.attrs.get("units", ""),
                "times": dataset.sizes["time"],
                "depths": dataset.sizes["depth"],
                "latitudes": dataset.sizes["latitude"],
                "longitudes": dataset.sizes["longitude"],
            }
    except ValueError:
        raise
    except (OSError, TypeError) as error:
        raise ValueError("File is not a readable NetCDF dataset.") from error


def promote_upload(path: Path) -> dict[str, Any]:
    """Validate and atomically install a temporary uploaded NetCDF file."""
    metadata = validate_upload(path)
    if get_upload_dataset.cache_info().currsize:
        get_upload_dataset().close()
        get_upload_dataset.cache_clear()
    os.replace(path, UPLOAD_DATA_FILE)
    return metadata


def save_upload_stream(file_object: Any) -> dict[str, Any]:
    """Persist a bounded stream, then validate and promote it."""
    UPLOAD_DIRECTORY.mkdir(parents=True, exist_ok=True)
    total_bytes = 0
    try:
        with UPLOAD_TEMP_FILE.open("wb") as destination:
            while chunk := file_object.read(1024 * 1024):
                total_bytes += len(chunk)
                if total_bytes > MAX_UPLOAD_BYTES:
                    raise ValueError("NetCDF upload exceeds the 100 MiB limit.")
                destination.write(chunk)
        metadata = promote_upload(UPLOAD_TEMP_FILE)
        return {**metadata, "size_bytes": total_bytes, "source": "upload"}
    finally:
        UPLOAD_TEMP_FILE.unlink(missing_ok=True)


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


def request_slice(depth: float, variable: str, source: str = "demo") -> dict[str, Any]:
    """Return the nearest-depth grid at the latest available model time."""
    field = select_variable(variable, source)
    data = field.sel(depth=depth, method="nearest").isel(time=-1)
    values = data.values
    json_values = np.where(np.isfinite(values), values, None).tolist()

    selected_depth = float(data["depth"].item())
    selected_time = np.datetime_as_string(data["time"].values, unit="s") + "Z"

    return {
        "variable": variable,
        "source": source,
        "unit": data.attrs.get("units", ""),
        "requested_depth": depth,
        "depth": selected_depth,
        "time": selected_time,
        "latitudes": data["latitude"].values.tolist(),
        "longitudes": data["longitude"].values.tolist(),
        "values": json_values,
    }


def request_layers(
    variable: str, time: str | None = None, source: str = "demo"
) -> dict[str, Any]:
    """Return representative depth grids at the requested model time."""
    field = select_variable(variable, source)

    try:
        selected = (
            field.sel(
                time=np.datetime64(time.removesuffix("Z")), method="nearest"
            )
            if time
            else field.isel(time=-1)
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
        for value in field["time"].values
    ]

    return {
        "variable": variable,
        "source": source,
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
