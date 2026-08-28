import math
import unittest

import numpy as np

from backend.services.comparison import bilinear_profile
from backend.services.metrics import calculate_rmse


class CalculateRmseTests(unittest.TestCase):
    def test_returns_known_root_mean_square_error(self) -> None:
        self.assertAlmostEqual(
            calculate_rmse([1.0, 2.0, 3.0], [1.0, 4.0, 5.0]),
            math.sqrt(8.0 / 3.0),
        )

    def test_returns_zero_for_identical_values(self) -> None:
        self.assertEqual(calculate_rmse([4.5, 8.0], [4.5, 8.0]), 0.0)

    def test_rejects_different_length_series(self) -> None:
        with self.assertRaisesRegex(ValueError, "same length"):
            calculate_rmse([1.0], [1.0, 2.0])

    def test_rejects_empty_series(self) -> None:
        with self.assertRaisesRegex(ValueError, "at least one"):
            calculate_rmse([], [])

    def test_rejects_non_finite_values(self) -> None:
        with self.assertRaisesRegex(ValueError, "finite"):
            calculate_rmse([1.0, math.nan], [1.0, 2.0])


class BilinearProfileTests(unittest.TestCase):
    def test_interpolates_each_depth_at_grid_center(self) -> None:
        values = np.asarray(
            [
                [[0.0, 2.0], [2.0, 4.0]],
                [[10.0, 12.0], [12.0, 14.0]],
            ]
        )
        result = bilinear_profile(values, [0.0, 1.0], [0.0, 1.0], 0.5, 0.5)
        np.testing.assert_allclose(result, [2.0, 12.0])

    def test_renormalizes_weights_around_missing_ocean_cell(self) -> None:
        values = np.asarray([[[0.0, 2.0], [4.0, np.nan]]])
        result = bilinear_profile(values, [0.0, 1.0], [0.0, 1.0], 0.5, 0.5)
        np.testing.assert_allclose(result, [2.0])

    def test_rejects_position_outside_grid(self) -> None:
        with self.assertRaisesRegex(ValueError, "outside"):
            bilinear_profile(np.zeros((1, 2, 2)), [0.0, 1.0], [0.0, 1.0], 2.0, 0.5)


if __name__ == "__main__":
    unittest.main()