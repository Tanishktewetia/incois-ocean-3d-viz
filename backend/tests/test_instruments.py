import unittest

import numpy as np
import xarray as xr

from backend.services.instruments import (
    SAMPLE_INSTRUMENTS,
    _bgc_series,
    request_instrument_profile,
)


class InstrumentSchemaTests(unittest.TestCase):
    def test_bgc_series_prefers_adjusted_values_and_filters_qc(self) -> None:
        dataset = xr.Dataset(
            {
                "LATITUDE": ("N_PROF", [10.0]),
                "PRES": (("N_PROF", "N_LEVELS"), [[0.0, 10.0, 20.0, 30.0]]),
                "PRES_QC": (("N_PROF", "N_LEVELS"), [[b"1", b"1", b"1", b"1"]]),
                "CHLA": (("N_PROF", "N_LEVELS"), [[9.0, 9.0, 9.0, 9.0]]),
                "CHLA_ADJUSTED": (("N_PROF", "N_LEVELS"), [[0.1, 0.2, 0.3, np.nan]]),
                "CHLA_ADJUSTED_QC": (("N_PROF", "N_LEVELS"), [[b"1", b"4", b"2", b"1"]]),
            }
        )
        dataset["CHLA_ADJUSTED"].attrs["units"] = "mg/m3"

        series = _bgc_series(dataset, "CHLA")

        self.assertIsNotNone(series)
        self.assertEqual(series["data_mode"], "adjusted")
        self.assertEqual(series["unit"], "mg/m3")
        self.assertEqual([value["value"] for value in series["measurements"]], [0.1, 0.3])

    def test_sample_instruments_are_explicitly_labelled(self) -> None:
        self.assertEqual({value["instrument_type"] for value in SAMPLE_INSTRUMENTS}, {"glider", "ctd"})
        for instrument in SAMPLE_INSTRUMENTS:
            self.assertEqual(instrument["data_status"], "sample")
            self.assertIn("Sample data", instrument["source"])
            self.assertIn("not a live feed", instrument["source"])
            self.assertGreaterEqual(len(instrument["profile"]["series"][0]["measurements"]), 2)

    def test_sample_profile_uses_normalized_series_schema(self) -> None:
        profile = request_instrument_profile("sample-glider:india-eez-01")
        self.assertEqual(profile["instrument_label"], "Glider")
        self.assertEqual(profile["profile"]["series"][0]["variable"], "temperature")
        self.assertEqual(set(profile["profile"]["series"][0]["measurements"][0]), {"depth", "value"})


if __name__ == "__main__":
    unittest.main()