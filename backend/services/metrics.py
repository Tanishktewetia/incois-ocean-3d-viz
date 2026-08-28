import math
from collections.abc import Sequence


def calculate_rmse(observed: Sequence[float], modeled: Sequence[float]) -> float:
    """Return root mean square error for two equally sized finite series."""
    if len(observed) != len(modeled):
        raise ValueError("Observed and modeled series must have the same length.")
    if not observed:
        raise ValueError("RMSE requires at least one paired value.")
    if not all(math.isfinite(value) for value in (*observed, *modeled)):
        raise ValueError("RMSE values must be finite.")

    mean_squared_error = sum(
        (model_value - observed_value) ** 2
        for observed_value, model_value in zip(observed, modeled, strict=True)
    ) / len(observed)
    return math.sqrt(mean_squared_error)