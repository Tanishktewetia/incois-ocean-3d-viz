from collections.abc import Sequence
from typing import Any

import numpy as np

from backend.services.metrics import calculate_rmse
from backend.services.slicer import OceanDataUnavailableError, get_dataset, select_variable


def bilinear_profile(
    values: np.ndarray,
    latitudes: Sequence[float],
    longitudes: Sequence[float],
    latitude: float,
    longitude: float,
) -> np.ndarray:
    """Interpolate depth-by-latitude-by-longitude values at one position."""
    latitude_values = np.asarray(latitudes, dtype=float)
    longitude_values = np.asarray(longitudes, dtype=float)
    profile_values = np.asarray(values, dtype=float)
    expected_shape = (profile_values.shape[0], len(latitude_values), len(longitude_values))
    if profile_values.ndim != 3 or profile_values.shape != expected_shape:
        raise ValueError("Values must have depth, latitude, and longitude dimensions.")
    if len(latitude_values) < 2 or len(longitude_values) < 2:
        raise ValueError("Bilinear interpolation requires at least a 2 by 2 grid.")
    if not (
        latitude_values[0] <= latitude <= latitude_values[-1]
        and longitude_values[0] <= longitude <= longitude_values[-1]
    ):
        raise ValueError("Requested position is outside the model grid.")

    latitude_upper = min(np.searchsorted(latitude_values, latitude, side="right"), len(latitude_values) - 1)
    longitude_upper = min(
        np.searchsorted(longitude_values, longitude, side="right"),
        len(longitude_values) - 1,
    )
    latitude_lower = max(0, latitude_upper - 1)
    longitude_lower = max(0, longitude_upper - 1)
    latitude_fraction = (
        (latitude - latitude_values[latitude_lower])
        / (latitude_values[latitude_upper] - latitude_values[latitude_lower])
    )
    longitude_fraction = (
        (longitude - longitude_values[longitude_lower])
        / (longitude_values[longitude_upper] - longitude_values[longitude_lower])
    )
    corners = profile_values[
        :,
        [latitude_lower, latitude_lower, latitude_upper, latitude_upper],
        [longitude_lower, longitude_upper, longitude_lower, longitude_upper],
    ]
    weights = np.asarray(
        [
            (1 - latitude_fraction) * (1 - longitude_fraction),
            (1 - latitude_fraction) * longitude_fraction,
            latitude_fraction * (1 - longitude_fraction),
            latitude_fraction * longitude_fraction,
        ]
    )
    finite = np.isfinite(corners)
    finite_weights = finite * weights
    weight_sums = finite_weights.sum(axis=1)
    weighted_values = np.where(finite, corners, 0.0) * weights
    return np.divide(
        weighted_values.sum(axis=1),
        weight_sums,
        out=np.full(profile_values.shape[0], np.nan),
        where=weight_sums > 0,
    )


def compare_model_to_profile(profile: dict[str, Any]) -> dict[str, Any]:
    """Interpolate model temperature to an Argo profile and calculate RMSE."""
    dataset = get_dataset()
    if "thetao" not in dataset:
        raise OceanDataUnavailableError(
            "Variable 'thetao' is missing from the Copernicus subset."
        )

    try:
        selected = dataset["thetao"].sel(
            time=np.datetime64(profile["time"].removesuffix("Z")), method="nearest"
        )
        model_temperatures = bilinear_profile(
            selected.values,
            selected["latitude"].values,
            selected["longitude"].values,
            profile["latitude"],
            profile["longitude"],
        )
    except (KeyError, OSError, TypeError, ValueError) as error:
        raise OceanDataUnavailableError(
            f"Unable to interpolate the model for Argo profile '{profile.get('id', '')}'."
        ) from error

    model_depths = np.asarray(selected["depth"].values, dtype=float)
    valid_model = np.isfinite(model_depths) & np.isfinite(model_temperatures)
    model_depths = model_depths[valid_model]
    model_temperatures = model_temperatures[valid_model]
    if len(model_depths) < 2:
        raise OceanDataUnavailableError("The model profile has insufficient valid values.")

    comparison_points = []
    for measurement in profile["measurements"]:
        depth = measurement["depth"]
        if model_depths[0] <= depth <= model_depths[-1]:
            modeled = float(np.interp(depth, model_depths, model_temperatures))
            observed = measurement["temperature"]
            comparison_points.append(
                {
                    "depth": depth,
                    "observed_temperature": observed,
                    "model_temperature": modeled,
                    "difference": modeled - observed,
                }
            )
    if not comparison_points:
        raise OceanDataUnavailableError(
            "The Argo and model profiles have no overlapping valid depths."
        )

    return {
        "variable": "thetao",
        "unit": selected.attrs.get("units", "degree_Celsius"),
        "model_time": np.datetime_as_string(selected["time"].values, unit="s") + "Z",
        "time_selection": "nearest daily model time",
        "horizontal_interpolation": "bilinear; finite ocean corners renormalized",
        "vertical_interpolation": "linear to Argo observation depths",
        "latitude": profile["latitude"],
        "longitude": profile["longitude"],
        "model_profile": [
            {"depth": float(depth), "temperature": float(temperature)}
            for depth, temperature in zip(model_depths, model_temperatures, strict=True)
        ],
        "comparison_points": comparison_points,
        "paired_count": len(comparison_points),
        "rmse": calculate_rmse(
            [point["observed_temperature"] for point in comparison_points],
            [point["model_temperature"] for point in comparison_points],
        ),
    }


def _temperature_field(source: str = "demo", time: str | None = None):
    field = select_variable("thetao", source)
    try:
        return field.sel(time=np.datetime64(time.removesuffix("Z")), method="nearest") if time else field.isel(time=-1)
    except (KeyError, OSError, TypeError, ValueError) as error:
        raise OceanDataUnavailableError("Unable to select the Copernicus temperature time.") from error


def extract_temperature_profile(latitude: float, longitude: float, source: str = "demo", time: str | None = None) -> dict[str, Any]:
    """Return a bilinearly interpolated vertical temperature column at one point."""
    selected = _temperature_field(source, time)
    try:
        values = bilinear_profile(selected.values, selected.latitude.values, selected.longitude.values, latitude, longitude)
    except (AttributeError, TypeError, ValueError) as error:
        raise OceanDataUnavailableError("Requested profile point is outside the model grid.") from error
    depths = np.asarray(selected.depth.values, dtype=float)
    valid = np.isfinite(depths) & np.isfinite(values)
    return {
        "variable": "thetao", "source": source, "unit": selected.attrs.get("units", "degree_Celsius"),
        "time": np.datetime_as_string(selected.time.values, unit="s") + "Z",
        "latitude": latitude, "longitude": longitude,
        "depths": depths[valid].tolist(), "temperatures": values[valid].tolist(),
        "horizontal_interpolation": "bilinear; finite ocean corners renormalized",
    }


def sample_temperature_transect(start_latitude: float, start_longitude: float, end_latitude: float, end_longitude: float,
                                samples: int = 32, source: str = "demo", time: str | None = None) -> dict[str, Any]:
    """Sample a straight lat/lon path using the same bilinear column interpolation."""
    if samples < 2 or samples > 256:
        raise ValueError("samples must be between 2 and 256.")
    selected = _temperature_field(source, time)
    latitudes = np.linspace(start_latitude, end_latitude, samples)
    longitudes = np.linspace(start_longitude, end_longitude, samples)
    columns = []
    try:
        for latitude, longitude in zip(latitudes, longitudes, strict=True):
            columns.append(bilinear_profile(selected.values, selected.latitude.values, selected.longitude.values, float(latitude), float(longitude)))
    except (AttributeError, TypeError, ValueError) as error:
        raise OceanDataUnavailableError("Transect endpoints must be inside the model grid.") from error
    depths = np.asarray(selected.depth.values, dtype=float)
    matrix = np.asarray(columns, dtype=float).T
    valid_depth = np.isfinite(depths)
    distances = np.sqrt(((latitudes - start_latitude) * 111.32) ** 2 + ((longitudes - start_longitude) * 111.32 * np.cos(np.radians((start_latitude + end_latitude) / 2))) ** 2)
    matrix = np.where(np.isfinite(matrix), matrix, np.nan)
    return {
        "variable": "thetao", "source": source, "unit": selected.attrs.get("units", "degree_Celsius"),
        "time": np.datetime_as_string(selected.time.values, unit="s") + "Z",
        "start": {"latitude": start_latitude, "longitude": start_longitude},
        "end": {"latitude": end_latitude, "longitude": end_longitude},
        "distances_km": distances.tolist(), "depths": depths[valid_depth].tolist(),
        "temperatures": matrix[valid_depth].tolist(), "horizontal_interpolation": "bilinear; finite ocean corners renormalized",
    }
