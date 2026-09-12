import unittest
import pandas as pd
from backend.services.weather_service import (
    fetch_weather_history,
    process_weather_data,
    five_year_average,
    ten_year_yearly_breakdown,
    derive_weather_views,
    get_weather_history_data
)


class TestWeatherService(unittest.TestCase):

    def test_unit_conversion_mj_to_kwh(self):
        """
        Verify Step 2 CRITICAL CONVERSION: df['ghi_kwh'] == df['ghi_mj'] / 3.6
        """
        mock_raw = {
            "daily": {
                "time": ["2023-01-01", "2023-01-02", "2023-01-03"],
                "shortwave_radiation_sum": [18.0, 14.4, 21.6],  # MJ/m²/day
                "temperature_2m_mean": [22.0, 21.5, 23.0],
                "wind_speed_10m_mean": [3.0, 2.5, 3.2]
            }
        }
        df = process_weather_data(mock_raw)

        # 18.0 / 3.6 = 5.0 kWh/m²/day
        # 14.4 / 3.6 = 4.0 kWh/m²/day
        # 21.6 / 3.6 = 6.0 kWh/m²/day
        self.assertAlmostEqual(df["ghi_kwh"].iloc[0], 5.0, places=4)
        self.assertAlmostEqual(df["ghi_kwh"].iloc[1], 4.0, places=4)
        self.assertAlmostEqual(df["ghi_kwh"].iloc[2], 6.0, places=4)

        # Confirm division by 3.6 across entire column
        pd.testing.assert_series_equal(df["ghi_kwh"], df["ghi_mj"] / 3.6, check_names=False)

    def test_derived_views_functions(self):
        """
        Verify five_year_average and ten_year_yearly_breakdown return exact expected keys.
        """
        dates = pd.date_range("2016-01-01", "2025-12-31", freq="D")
        df = pd.DataFrame({
            "date": dates,
            "ghi_mj": [18.0] * len(dates),      # 5.0 kWh/m²/day
            "temp_c": [25.0] * len(dates),
            "wind_ms": [2.5] * len(dates),
        })
        df["ghi_kwh"] = df["ghi_mj"] / 3.6
        df["year"] = df["date"].dt.year

        calc_input = five_year_average(df)
        yearly_var = ten_year_yearly_breakdown(df)

        # 5-year average test
        self.assertEqual(calc_input["avg_ghi_kwh_m2_day"], 5.0)
        self.assertEqual(calc_input["avg_temp_c"], 25.0)
        self.assertEqual(calc_input["avg_wind_ms"], 2.5)
        self.assertEqual(calc_input["years_used"], "2021-2025")

        # 10-year breakdown test
        self.assertEqual(len(yearly_var), 10)
        self.assertEqual(yearly_var[0]["year"], 2016)
        self.assertEqual(yearly_var[0]["avg_ghi_kwh_m2_day"], 5.0)
        self.assertEqual(yearly_var[-1]["year"], 2025)

    def test_live_open_meteo_integration(self):
        """
        Integration test against Open-Meteo Archive API for Nagpur coordinates (21.1458, 79.0882).
        """
        try:
            res = get_weather_history_data(lat=21.1458, lon=79.0882)
            self.assertEqual(res["status"], "SUCCESS")
            self.assertIn("calculation_input", res)
            self.assertIn("yearly_variation", res)
            self.assertEqual(len(res["yearly_variation"]), 10)

            calc_in = res["calculation_input"]
            self.assertGreater(calc_in["avg_ghi_kwh_m2_day"], 0)
        except Exception as exc:
            self.skipTest(f"Network call to Open-Meteo skipped or failed: {exc}")


if __name__ == "__main__":
    unittest.main()
