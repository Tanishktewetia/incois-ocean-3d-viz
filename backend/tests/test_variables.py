import unittest

import numpy as np
import xarray as xr

from backend.services import slicer


def make_field(name: str, values: np.ndarray, units: str) -> xr.Dataset:
    return xr.Dataset(
        {
            name: (
                ("time", "depth", "latitude", "longitude"),
                values,
                {"units": units},
            )
        },
        coords={
            "time": np.asarray(["2026-08-18", "2026-08-19"], dtype="datetime64[ns]"),
            "depth": [0.5, 50.0],
            "latitude": [5.0, 6.0],
            "longitude": [68.0, 69.0],
        },
    )


class VariableLayerTests(unittest.TestCase):
    def setUp(self) -> None:
        shape = (2, 2, 2, 2)
        self.salinity = make_field("so", np.full(shape, 35.0), "1e-3")
        self.currents = xr.merge(
            [
                make_field("uo", np.full(shape, 3.0), "m s-1"),
                make_field("vo", np.full(shape, 4.0), "m s-1"),
            ]
        )
        self.original_salinity_loader = slicer.get_salinity_dataset
        self.original_currents_loader = slicer.get_currents_3d_dataset
        slicer.get_salinity_dataset = lambda: self.salinity
        slicer.get_currents_3d_dataset = lambda: self.currents

    def tearDown(self) -> None:
        slicer.get_salinity_dataset = self.original_salinity_loader
        slicer.get_currents_3d_dataset = self.original_currents_loader

    def test_returns_real_salinity_layers(self) -> None:
        result = slicer.request_layers("so", "2026-08-18T00:00:00Z")
        self.assertEqual(result["variable"], "so")
        self.assertEqual(result["unit"], "1e-3")
        self.assertEqual(result["layers"][0]["values"], [[35.0, 35.0], [35.0, 35.0]])

    def test_derives_current_magnitude_from_uo_and_vo(self) -> None:
        result = slicer.request_layers("current_magnitude", "2026-08-19T00:00:00Z")
        self.assertEqual(result["variable"], "current_magnitude")
        self.assertEqual(result["unit"], "m s-1")
        self.assertEqual(result["layers"][0]["values"], [[5.0, 5.0], [5.0, 5.0]])

    def test_rejects_non_temperature_variable_for_upload(self) -> None:
        with self.assertRaisesRegex(ValueError, "only 'thetao'"):
            slicer.request_layers("so", source="upload")

    def test_rejects_unknown_variable_with_complete_supported_list(self) -> None:
        with self.assertRaisesRegex(ValueError, "current_magnitude, so, thetao"):
            slicer.request_layers("oxygen")


if __name__ == "__main__":
    unittest.main()