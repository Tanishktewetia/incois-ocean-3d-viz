import io
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from fastapi import HTTPException, UploadFile
import numpy as np
import xarray as xr

from backend.routers.ocean import upload_dataset
from backend.services import slicer


def make_dataset(*, variable: str = "thetao") -> xr.Dataset:
    values = np.arange(2 * 3 * 2 * 3, dtype=np.float32).reshape(2, 3, 2, 3)
    return xr.Dataset(
        {
            variable: (
                ("time", "depth", "latitude", "longitude"),
                values,
                {"units": "degrees_C"},
            )
        },
        coords={
            "time": np.asarray(["2026-08-18", "2026-08-19"], dtype="datetime64[ns]"),
            "depth": [0.5, 50.0, 100.0],
            "latitude": [5.0, 6.0],
            "longitude": [68.0, 69.0, 70.0],
        },
    )


def dataset_bytes(dataset: xr.Dataset) -> bytes:
    with TemporaryDirectory() as directory:
        path = Path(directory) / "fixture.nc"
        dataset.to_netcdf(path, engine="netcdf4")
        return path.read_bytes()


class ScientistUploadTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary_directory = TemporaryDirectory()
        directory = Path(self.temporary_directory.name)
        self.original_directory = slicer.UPLOAD_DIRECTORY
        self.original_data_file = slicer.UPLOAD_DATA_FILE
        self.original_temp_file = slicer.UPLOAD_TEMP_FILE
        slicer.UPLOAD_DIRECTORY = directory
        slicer.UPLOAD_DATA_FILE = directory / "scientist_upload.nc"
        slicer.UPLOAD_TEMP_FILE = directory / "scientist_upload.part"
        slicer.get_upload_dataset.cache_clear()

    def tearDown(self) -> None:
        if slicer.get_upload_dataset.cache_info().currsize:
            slicer.get_upload_dataset().close()
        slicer.get_upload_dataset.cache_clear()
        slicer.UPLOAD_DIRECTORY = self.original_directory
        slicer.UPLOAD_DATA_FILE = self.original_data_file
        slicer.UPLOAD_TEMP_FILE = self.original_temp_file
        self.temporary_directory.cleanup()

    def test_uploads_valid_netcdf_and_uses_shared_slicer(self) -> None:
        result = upload_dataset(
            UploadFile(
                filename="ocean.nc",
                file=io.BytesIO(dataset_bytes(make_dataset())),
            )
        )

        self.assertEqual(result["variable"], "thetao")
        self.assertEqual(result["times"], 2)
        layers = slicer.request_layers(
            variable="thetao", time="2026-08-18T00:00:00Z", source="upload"
        )
        self.assertEqual(layers["source"], "upload")
        self.assertEqual(layers["layers"][0]["values"], [[0.0, 1.0, 2.0], [3.0, 4.0, 5.0]])

    def test_rejects_wrong_extension(self) -> None:
        with self.assertRaises(HTTPException) as context:
            upload_dataset(
                UploadFile(filename="ocean.txt", file=io.BytesIO(b"not netcdf"))
            )
        self.assertEqual(context.exception.status_code, 400)
        self.assertIn(".nc extension", context.exception.detail)

    def test_rejects_missing_thetao_without_replacing_previous_upload(self) -> None:
        valid = dataset_bytes(make_dataset())
        first_result = upload_dataset(
            UploadFile(filename="valid.nc", file=io.BytesIO(valid))
        )
        with self.assertRaises(HTTPException) as context:
            upload_dataset(
                UploadFile(
                    filename="invalid.nc",
                    file=io.BytesIO(dataset_bytes(make_dataset(variable="so"))),
                )
            )

        self.assertEqual(first_result["variable"], "thetao")
        self.assertEqual(context.exception.status_code, 400)
        self.assertIn("'thetao'", context.exception.detail)
        self.assertEqual(slicer.UPLOAD_DATA_FILE.read_bytes(), valid)

    def test_rejects_invalid_source(self) -> None:
        with self.assertRaisesRegex(ValueError, "demo"):
            slicer.request_layers(variable="thetao", source="unknown")

    def test_rejects_upload_over_size_limit(self) -> None:
        original_limit = slicer.MAX_UPLOAD_BYTES
        slicer.MAX_UPLOAD_BYTES = 3
        try:
            with self.assertRaisesRegex(ValueError, "100 MiB"):
                slicer.save_upload_stream(io.BytesIO(b"four"))
        finally:
            slicer.MAX_UPLOAD_BYTES = original_limit


if __name__ == "__main__":
    unittest.main()