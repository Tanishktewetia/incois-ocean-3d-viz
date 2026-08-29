import unittest

import numpy as np
import xarray as xr

from backend.services import slicer


class CurrentFieldTests(unittest.TestCase):
    def setUp(self) -> None:
        times = np.asarray(["2026-08-18", "2026-08-20"], dtype="datetime64[ns]")
        shape = (2, 1, 8, 8)
        eastward = np.arange(np.prod(shape), dtype=float).reshape(shape)
        northward = eastward + 1.0
        eastward[1, 0, 4, 4] = np.nan
        self.dataset = xr.Dataset(
            {
                "uo": (("time", "depth", "latitude", "longitude"), eastward, {"units": "m s-1"}),
                "vo": (("time", "depth", "latitude", "longitude"), northward, {"units": "m s-1"}),
            },
            coords={
                "time": times,
                "depth": [0.494],
                "latitude": np.arange(8, dtype=float),
                "longitude": np.arange(8, dtype=float) + 68,
            },
        )
        self.original_loader = slicer.get_currents_dataset
        slicer.get_currents_dataset = lambda: self.dataset

    def tearDown(self) -> None:
        slicer.get_currents_dataset = self.original_loader

    def test_selects_nearest_time_and_downsamples_grid(self) -> None:
        result = slicer.request_currents("2026-08-19T18:00:00Z")
        self.assertEqual(result["time"], "2026-08-20T00:00:00Z")
        self.assertEqual(result["depth"], 0.494)
        self.assertEqual(result["unit"], "m s-1")
        self.assertEqual(result["latitudes"], [0.0, 4.0])
        self.assertEqual(result["longitudes"], [68.0, 72.0])

    def test_nulls_both_components_when_either_is_missing(self) -> None:
        result = slicer.request_currents("2026-08-20T00:00:00Z")
        self.assertIsNone(result["eastward"][1][1])
        self.assertIsNone(result["northward"][1][1])

    def test_rejects_invalid_time(self) -> None:
        with self.assertRaisesRegex(ValueError, "Invalid time"):
            slicer.request_currents("not-a-date")


if __name__ == "__main__":
    unittest.main()