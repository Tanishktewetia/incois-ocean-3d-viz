from functools import lru_cache
from pathlib import Path
from typing import Any

import numpy as np
import xarray as xr

ARGO_DIRECTORY = (
    Path(__file__).resolve().parents[1] / "data" / "argo_20260818_20260824"
)
GOOD_QC_FLAGS = {"1", "2"}


class ArgoDataUnavailableError(RuntimeError):
    """Raised when the local Argo GDAC subset cannot be read."""


def _text(value: Any) -> str:
    if isinstance(value, bytes):
        return value.decode("ascii", errors="ignore").strip()
    return str(value).strip()


def _primary_value(dataset: xr.Dataset, name: str) -> Any:
    values = np.asarray(dataset[name].values)
    return values[0] if values.ndim else values.item()


def _iso_time(value: Any) -> str:
    return np.datetime_as_string(np.datetime64(value), unit="s") + "Z"


def _depth_from_pressure(pressure: np.ndarray, latitude: float) -> np.ndarray:
    """Convert pressure (dbar) to depth (m) with the UNESCO 1983 formula."""
    sin_squared = np.sin(np.deg2rad(latitude)) ** 2
    gravity = (
        9.780318 * (1 + (5.2788e-3 + 2.36e-5 * sin_squared) * sin_squared)
        + 1.092e-6 * pressure
    )
    numerator = (
        ((-1.82e-15 * pressure + 2.279e-10) * pressure - 2.2512e-5)
        * pressure
        + 9.72659
    ) * pressure
    return numerator / gravity


def _profile_fields(dataset: xr.Dataset, data_mode: str) -> tuple[str, str]:
    use_adjusted = data_mode in {"A", "D"}
    adjusted_available = all(
        name in dataset and np.isfinite(dataset[name].isel(N_PROF=0).values).any()
        for name in ("TEMP_ADJUSTED", "PRES_ADJUSTED")
    )
    suffix = "_ADJUSTED" if use_adjusted and adjusted_available else ""
    return f"TEMP{suffix}", f"PRES{suffix}"


def _good_values(dataset: xr.Dataset, name: str) -> tuple[np.ndarray, np.ndarray]:
    values = np.asarray(dataset[name].isel(N_PROF=0).values, dtype=float).reshape(-1)
    qc_name = f"{name}_QC"
    if qc_name not in dataset:
        return values, np.isfinite(values)
    qc = np.asarray(dataset[qc_name].isel(N_PROF=0).values).reshape(-1)
    good = np.array([_text(value) in GOOD_QC_FLAGS for value in qc])
    return values, np.isfinite(values) & good


def _read_profile(path: Path, include_measurements: bool) -> dict[str, Any] | None:
    try:
        with xr.open_dataset(path) as dataset:
            for qc_name in ("POSITION_QC", "JULD_QC"):
                if qc_name in dataset and _text(_primary_value(dataset, qc_name)) not in GOOD_QC_FLAGS:
                    return None
            latitude = float(_primary_value(dataset, "LATITUDE"))
            longitude = float(_primary_value(dataset, "LONGITUDE"))
            platform = _text(_primary_value(dataset, "PLATFORM_NUMBER"))
            cycle = int(_primary_value(dataset, "CYCLE_NUMBER"))
            direction = _text(_primary_value(dataset, "DIRECTION"))
            data_mode = _text(_primary_value(dataset, "DATA_MODE"))
            temperature_name, pressure_name = _profile_fields(dataset, data_mode)
            temperature, good_temperature = _good_values(dataset, temperature_name)
            pressure, good_pressure = _good_values(dataset, pressure_name)
            good = good_temperature & good_pressure & (pressure >= 0) & (pressure <= 2100)
            if np.count_nonzero(good) < 2:
                return None

            good_pressure_values = pressure[good]
            depth = _depth_from_pressure(good_pressure_values, latitude)
            result: dict[str, Any] = {
                "id": path.stem,
                "platform_number": platform,
                "cycle_number": cycle,
                "direction": direction,
                "data_mode": data_mode,
                "time": _iso_time(_primary_value(dataset, "JULD")),
                "latitude": latitude,
                "longitude": longitude,
                "levels": int(np.count_nonzero(good)),
                "maximum_depth": float(np.max(depth)),
            }
            if include_measurements:
                measurements = [
                    {
                        "depth": float(depth_value),
                        "pressure": float(pressure_value),
                        "temperature": float(temperature_value),
                    }
                    for depth_value, pressure_value, temperature_value in zip(
                        depth, good_pressure_values, temperature[good], strict=True
                    )
                ]
                measurements.sort(key=lambda value: value["depth"])
                result.update(
                    {
                        "temperature_unit": "degree_Celsius",
                        "depth_unit": "m",
                        "pressure_unit": "dbar",
                        "measurements": measurements,
                    }
                )
            return result
    except (KeyError, OSError, ValueError) as error:
        raise ArgoDataUnavailableError(f"Unable to read Argo profile {path.name}.") from error


@lru_cache(maxsize=1)
def _catalog() -> tuple[dict[str, Any], ...]:
    if not ARGO_DIRECTORY.is_dir():
        raise ArgoDataUnavailableError(
            f"Argo GDAC subset not found at {ARGO_DIRECTORY}."
        )
    profiles = [
        profile
        for path in sorted(ARGO_DIRECTORY.glob("*.nc"))
        if (profile := _read_profile(path, include_measurements=False)) is not None
    ]
    if not profiles:
        raise ArgoDataUnavailableError("The Argo GDAC subset contains no usable profiles.")
    return tuple(sorted(profiles, key=lambda profile: profile["time"]))


def request_argo_profiles() -> dict[str, Any]:
    return {
        "source": "Argo GDAC (https://data-argo.ifremer.fr)",
        "start_time": "2026-08-18T00:00:00Z",
        "end_time": "2026-08-24T23:59:59Z",
        "profiles": list(_catalog()),
    }


@lru_cache(maxsize=64)
def request_argo_profile(profile_id: str) -> dict[str, Any]:
    metadata = next(
        (profile for profile in _catalog() if profile["id"] == profile_id), None
    )
    if metadata is None:
        raise KeyError(profile_id)
    profile = _read_profile(ARGO_DIRECTORY / f"{profile_id}.nc", True)
    if profile is None:
        raise ArgoDataUnavailableError(f"Argo profile '{profile_id}' has no usable data.")
    return profile
