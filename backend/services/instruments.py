from functools import lru_cache
import csv
import io
import tempfile
from pathlib import Path
from typing import Any

import numpy as np
import xarray as xr

from backend.services.argo import (
    GOOD_QC_FLAGS,
    ArgoDataUnavailableError,
    _depth_from_pressure,
    _iso_time,
    _primary_value,
    _text,
    request_argo_profile,
    request_argo_profiles,
)

BGC_ARGO_DIRECTORY = (
    Path(__file__).resolve().parents[1] / "data" / "bgc_argo_20260818_20260824"
)
START_TIME = "2026-08-18T00:00:00Z"
END_TIME = "2026-08-24T23:59:59Z"


class InstrumentDataUnavailableError(RuntimeError):
    """Raised when a configured instrument dataset cannot be read."""


SAMPLE_INSTRUMENTS: tuple[dict[str, Any], ...] = (
    {
        "id": "sample-glider:india-eez-01",
        "instrument_type": "glider",
        "instrument_label": "Glider",
        "data_status": "sample",
        "source": "Sample data — for demonstration; not a live feed",
        "platform_number": "SAMPLE-GLIDER-01",
        "cycle_number": None,
        "time": "2026-08-20T06:00:00Z",
        "latitude": 15.0,
        "longitude": 72.5,
        "variables": ["temperature"],
        "profile": {
            "series": [
                {
                    "variable": "temperature",
                    "label": "Sample temperature",
                    "unit": "degree_Celsius",
                    "measurements": [
                        {"depth": depth, "value": value}
                        for depth, value in ((0, 28.7), (25, 27.9), (50, 25.8), (100, 21.4), (200, 15.2), (400, 10.1))
                    ],
                }
            ]
        },
    },
    {
        "id": "sample-ctd:india-eez-01",
        "instrument_type": "ctd",
        "instrument_label": "CTD",
        "data_status": "sample",
        "source": "Sample data — for demonstration; not a live feed",
        "platform_number": "SAMPLE-CTD-01",
        "cycle_number": None,
        "time": "2026-08-22T09:30:00Z",
        "latitude": 15.0,
        "longitude": 82.5,
        "variables": ["temperature"],
        "profile": {
            "series": [
                {
                    "variable": "temperature",
                    "label": "Sample temperature",
                    "unit": "degree_Celsius",
                    "measurements": [
                        {"depth": depth, "value": value}
                        for depth, value in ((0, 29.1), (20, 28.5), (50, 26.2), (100, 22.0), (250, 13.8), (500, 8.7))
                    ],
                }
            ]
        },
    },
)

_uploaded_instruments: dict[str, dict[str, Any]] = {}


def parse_uploaded_instrument_csv(content: bytes, filename: str) -> dict[str, Any]:
    try:
        rows = list(csv.DictReader(io.StringIO(content.decode("utf-8-sig"))))
    except (UnicodeDecodeError, csv.Error) as error:
        raise ValueError("Instrument CSV must be UTF-8 and have a header row.") from error
    required = {"latitude", "longitude", "depth", "time"}
    if not rows or not required.issubset({key.strip().lower() for key in rows[0]}):
        raise ValueError("Instrument CSV must contain latitude, longitude, depth, and time columns.")
    headers = {key.strip().lower(): key for key in rows[0]}
    value_columns = [key for key in headers if key not in required]
    if not value_columns:
        raise ValueError("Instrument CSV must contain at least one measured value column.")
    measurements: dict[str, list[dict[str, float]]] = {key: [] for key in value_columns}
    for row in rows:
        try:
            latitude = float(row[headers["latitude"]]); longitude = float(row[headers["longitude"]])
            depth = float(row[headers["depth"]]); time = row[headers["time"]]
        except (TypeError, ValueError, KeyError) as error:
            raise ValueError("Instrument CSV coordinates and depth must be numeric.") from error
        if not time:
            raise ValueError("Instrument CSV time values cannot be empty.")
        for key in value_columns:
            raw = row.get(headers[key], "")
            if raw not in (None, ""):
                try:
                    measurements[key].append({"depth": depth, "value": float(raw)})
                except ValueError as error:
                    raise ValueError(f"Measured column '{key}' must be numeric.") from error
    series = [{"variable": key, "label": key, "unit": "", "measurements": values} for key, values in measurements.items() if values]
    if not series:
        raise ValueError("Instrument CSV must contain at least one finite measured value.")
    instrument_id = f"uploaded:{filename}:{len(_uploaded_instruments) + 1}"
    instrument = {
        "id": instrument_id, "instrument_type": "uploaded", "instrument_label": "Uploaded instrument",
        "data_status": "uploaded", "source": f"Uploaded by researcher ({filename})",
        "platform_number": filename, "cycle_number": None,
        "time": rows[0][headers["time"]], "latitude": float(rows[0][headers["latitude"]]),
        "longitude": float(rows[0][headers["longitude"]]), "variables": [item["variable"] for item in series],
        "profile": {"series": series},
    }
    _uploaded_instruments[instrument_id] = instrument
    request_instrument_profile.cache_clear()
    return {key: value for key, value in instrument.items() if key != "profile"}


def parse_uploaded_instrument_netcdf(content: bytes, filename: str) -> dict[str, Any]:
    aliases = {"latitude": ("latitude", "lat", "LATITUDE"), "longitude": ("longitude", "lon", "LONGITUDE"), "depth": ("depth", "DEPTH", "pres", "PRES"), "time": ("time", "TIME", "JULD")}
    with tempfile.NamedTemporaryFile(suffix=".nc") as temporary:
        temporary.write(content); temporary.flush()
        try:
            with xr.open_dataset(temporary.name) as dataset:
                names = {key: next((name for name in options if name in dataset), None) for key, options in aliases.items()}
                if any(value is None for value in names.values()):
                    raise ValueError("Instrument NetCDF must contain latitude, longitude, depth, and time variables.")
                coordinate_names = set(names.values())
                length = max(dataset[name].size for name in names.values())
                rows = []
                value_names = [name for name in dataset.data_vars if name not in coordinate_names and dataset[name].size == length]
                if not value_names:
                    raise ValueError("Instrument NetCDF must contain at least one measured value variable.")
                for index in range(length):
                    row = {}
                    for key, name in names.items():
                        value = dataset[name].values.reshape(-1)[index if dataset[name].size > 1 else 0]
                        row[key] = np.datetime_as_string(value, unit="s") if key == "time" and np.issubdtype(dataset[name].dtype, np.datetime64) else str(value)
                    for name in value_names:
                        row[name] = str(dataset[name].values.reshape(-1)[index])
                    rows.append(row)
        except (OSError, TypeError, ValueError) as error:
            if isinstance(error, ValueError): raise
            raise ValueError("Instrument upload is not a readable NetCDF dataset.") from error
    fieldnames = list(rows[0])
    output = io.StringIO(); writer = csv.DictWriter(output, fieldnames=fieldnames); writer.writeheader(); writer.writerows(rows)
    return parse_uploaded_instrument_csv(output.getvalue().encode("utf-8"), filename)


def _profile_variable(dataset: xr.Dataset, variable: str) -> tuple[int, str, str] | None:
    """Return the sensor row and best raw/adjusted variable for one parameter."""
    candidates: list[tuple[int, int, str, str]] = []
    for profile_index in range(dataset.sizes.get("N_PROF", 1)):
        for name, mode in ((f"{variable}_ADJUSTED", "adjusted"), (variable, "raw")):
            if name not in dataset:
                continue
            values = np.asarray(dataset[name].isel(N_PROF=profile_index).values, dtype=float).reshape(-1)
            valid_count = int(np.count_nonzero(np.isfinite(values)))
            if valid_count:
                candidates.append((valid_count, profile_index, name, mode))
    if not candidates:
        return None
    _, profile_index, name, mode = max(
        candidates,
        key=lambda candidate: (candidate[3] == "adjusted", candidate[0]),
    )
    return profile_index, name, mode


def _qc_values(dataset: xr.Dataset, name: str, profile_index: int) -> tuple[np.ndarray, np.ndarray]:
    values = np.asarray(dataset[name].isel(N_PROF=profile_index).values, dtype=float).reshape(-1)
    qc_name = f"{name}_QC"
    valid = np.isfinite(values)
    if qc_name in dataset:
        qc = np.asarray(dataset[qc_name].isel(N_PROF=profile_index).values).reshape(-1)
        valid &= np.asarray([_text(value) in GOOD_QC_FLAGS for value in qc])
    return values, valid


def _bgc_series(dataset: xr.Dataset, variable: str) -> dict[str, Any] | None:
    selected = _profile_variable(dataset, variable)
    if selected is None:
        return None
    profile_index, value_name, mode = selected
    pressure_name = "PRES_ADJUSTED" if "PRES_ADJUSTED" in dataset else "PRES"
    values, valid_values = _qc_values(dataset, value_name, profile_index)
    pressure, valid_pressure = _qc_values(dataset, pressure_name, profile_index)
    valid = valid_values & valid_pressure & (pressure >= 0) & (pressure <= 2100)
    if np.count_nonzero(valid) < 2:
        return None
    latitude = float(np.asarray(dataset["LATITUDE"].isel(N_PROF=profile_index).values))
    depths = _depth_from_pressure(pressure[valid], latitude)
    label = "Chlorophyll-a" if variable == "CHLA" else "Dissolved oxygen"
    return {
        "variable": variable.lower(),
        "label": label,
        "unit": dataset[value_name].attrs.get("units", ""),
        "data_mode": mode,
        "measurements": [
            {"depth": float(depth), "value": float(value)}
            for depth, value in sorted(zip(depths, values[valid], strict=True))
        ],
    }


def _read_bgc_profile(path: Path, include_series: bool) -> dict[str, Any] | None:
    try:
        with xr.open_dataset(path) as dataset:
            series = [
                value
                for variable in ("CHLA", "DOXY")
                if (value := _bgc_series(dataset, variable)) is not None
            ]
            if not series:
                return None
            latitude = float(_primary_value(dataset, "LATITUDE"))
            longitude = float(_primary_value(dataset, "LONGITUDE"))
            result = {
                "id": f"bgc-argo:{path.stem}",
                "instrument_type": "bgc_argo",
                "instrument_label": "BGC-Argo",
                "data_status": "real",
                "source": "Argo GDAC (https://data-argo.ifremer.fr)",
                "platform_number": _text(_primary_value(dataset, "PLATFORM_NUMBER")),
                "cycle_number": int(_primary_value(dataset, "CYCLE_NUMBER")),
                "time": _iso_time(_primary_value(dataset, "JULD")),
                "latitude": latitude,
                "longitude": longitude,
                "variables": [value["variable"] for value in series],
            }
            if include_series:
                result["profile"] = {"series": series}
            return result
    except (KeyError, OSError, TypeError, ValueError) as error:
        raise InstrumentDataUnavailableError(
            f"Unable to read BGC-Argo profile {path.name}."
        ) from error


@lru_cache(maxsize=1)
def _bgc_catalog() -> tuple[dict[str, Any], ...]:
    if not BGC_ARGO_DIRECTORY.is_dir():
        raise InstrumentDataUnavailableError(
            f"BGC-Argo GDAC subset not found at {BGC_ARGO_DIRECTORY}."
        )
    profiles = [
        profile
        for path in sorted(BGC_ARGO_DIRECTORY.glob("BR*.nc"))
        if (profile := _read_bgc_profile(path, False)) is not None
    ]
    if not profiles:
        raise InstrumentDataUnavailableError("The BGC-Argo subset contains no usable profiles.")
    return tuple(profiles)


def _core_catalog() -> list[dict[str, Any]]:
    return [
        {
            **profile,
            "id": f"core-argo:{profile['id']}",
            "instrument_type": "core_argo",
            "instrument_label": "Core Argo",
            "data_status": "real",
            "source": "Argo GDAC (https://data-argo.ifremer.fr)",
            "variables": ["temperature"],
        }
        for profile in request_argo_profiles()["profiles"]
    ]


def _public_metadata(instrument: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in instrument.items() if key != "profile"}


def request_instruments() -> dict[str, Any]:
    instruments = list(_uploaded_instruments.values()) + _core_catalog() + list(_bgc_catalog()) + [
        _public_metadata(instrument) for instrument in SAMPLE_INSTRUMENTS
    ]
    return {
        "schema_version": 1,
        "start_time": START_TIME,
        "end_time": END_TIME,
        "instruments": instruments,
    }


@lru_cache(maxsize=128)
def request_instrument_profile(instrument_id: str) -> dict[str, Any]:
    if instrument_id in _uploaded_instruments:
        return _uploaded_instruments[instrument_id]
    if instrument_id.startswith("core-argo:"):
        profile = request_argo_profile(instrument_id.split(":", 1)[1])
        return {
            **profile,
            "id": instrument_id,
            "instrument_type": "core_argo",
            "instrument_label": "Core Argo",
            "data_status": "real",
            "source": "Argo GDAC (https://data-argo.ifremer.fr)",
            "variables": ["temperature"],
            "profile": {
                "series": [
                    {
                        "variable": "temperature",
                        "label": "Argo observed temperature",
                        "unit": profile["temperature_unit"],
                        "measurements": [
                            {"depth": value["depth"], "value": value["temperature"]}
                            for value in profile["measurements"]
                        ],
                    },
                    {
                        "variable": "model_temperature",
                        "label": "Copernicus model temperature",
                        "unit": profile["model_comparison"]["unit"],
                        "measurements": [
                            {"depth": value["depth"], "value": value["temperature"]}
                            for value in profile["model_comparison"]["model_profile"]
                        ],
                    },
                ]
            },
        }
    if instrument_id.startswith("bgc-argo:"):
        stem = instrument_id.split(":", 1)[1]
        path = BGC_ARGO_DIRECTORY / f"{stem}.nc"
        if not path.is_file():
            raise KeyError(instrument_id)
        profile = _read_bgc_profile(path, True)
        if profile is None:
            raise KeyError(instrument_id)
        return profile
    sample = next((value for value in SAMPLE_INSTRUMENTS if value["id"] == instrument_id), None)
    if sample is None:
        raise KeyError(instrument_id)
    return sample
