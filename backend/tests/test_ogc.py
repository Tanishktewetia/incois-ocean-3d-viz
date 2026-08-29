from io import BytesIO
import unittest
from unittest.mock import patch
from xml.etree import ElementTree as ET

from netCDF4 import Dataset
import numpy as np
from PIL import Image
import xarray as xr

from backend.services import ogc


def make_field(variable: str) -> xr.DataArray:
    values = np.arange(2 * 2 * 3 * 4, dtype=np.float32).reshape(2, 2, 3, 4)
    values[0, 0, 0, 0] = np.nan
    return xr.DataArray(
        values,
        dims=("time", "depth", "latitude", "longitude"),
        coords={
            "time": np.asarray(["2026-08-18", "2026-08-19"], dtype="datetime64[ns]"),
            "depth": [0.5, 50.0],
            "latitude": [5.0, 6.0, 7.0],
            "longitude": [68.0, 69.0, 70.0, 71.0],
        },
        name=variable,
        attrs={"units": "degrees_C" if variable == "thetao" else "1"},
    )


class OgcEndpointTests(unittest.TestCase):
    def setUp(self) -> None:
        self.patcher = patch("backend.services.ogc.select_variable", side_effect=lambda variable, source: make_field(variable))
        self.patcher.start()

    def tearDown(self) -> None:
        self.patcher.stop()

    def test_wms_capabilities_describes_layers_and_dimensions(self) -> None:
        content = ogc.wms_capabilities("http://testserver/wms")
        root = ET.fromstring(content)
        self.assertTrue(root.tag.endswith("WMS_Capabilities"))
        text = content.decode()
        self.assertIn("thetao", text)
        self.assertIn('name="time"', text)
        self.assertIn('name="elevation"', text)

    def test_wms_get_map_returns_requested_png_size(self) -> None:
        content = ogc.render_wms_map(
            "thetao", (68, 5, 71, 7), 32, 16,
            "2026-08-18T00:00:00Z", 0.5, True,
        )
        with Image.open(BytesIO(content)) as image:
            self.assertEqual(image.size, (32, 16))
            self.assertEqual(image.format, "PNG")

    def test_wms_rejects_unknown_layer(self) -> None:
        with self.assertRaisesRegex(ValueError, "oxygen"):
            ogc.render_wms_map("oxygen", (68, 5, 71, 7), 8, 8, None, None, True)

    def test_wcs_describe_coverage_has_domain_and_range(self) -> None:
        text = ogc.describe_coverage("so").decode()
        self.assertIn("CoverageDescription", text)
        self.assertIn("grid-so", text)
        self.assertIn("Quantity", text)
        self.assertIn("application/x-netcdf", text)

    def test_wcs_capabilities_advertises_coverages_and_netcdf(self) -> None:
        content = ogc.wcs_capabilities("http://testserver/wcs")
        root = ET.fromstring(content)
        self.assertTrue(root.tag.endswith("Capabilities"))
        text = content.decode()
        self.assertIn("current_magnitude", text)
        self.assertIn("application/x-netcdf", text)

    def test_wcs_get_coverage_returns_subset_netcdf(self) -> None:
        content = ogc.get_coverage(
            "thetao",
            [
                "Long(69,71)", "Lat(6,7)", "depth(0,1)",
                "time(2026-08-18T06:00:00Z)",
            ],
        )
        with Dataset("coverage.nc", memory=content) as dataset:
            self.assertEqual(dataset.dimensions["longitude"].size, 3)
            self.assertEqual(dataset.dimensions["latitude"].size, 2)
            self.assertEqual(dataset.dimensions["depth"].size, 1)
            self.assertEqual(dataset.dimensions["time"].size, 1)
            self.assertIn("crs", dataset.variables)


if __name__ == "__main__":
    unittest.main()