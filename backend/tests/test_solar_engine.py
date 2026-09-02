"""
Unit tests for OJAS Energy Calculation Engine backend & pvlib simulation
"""

import unittest
from backend.services.solar_engine import calculate_energy_estimate, calculate_pm_surya_ghar_subsidy
from backend.config import USABLE_AREA_FACTOR, ALMM_PANEL_CATALOG


class TestEnergyEngine(unittest.TestCase):

    def test_usable_area_calculation(self):
        # 100 m² polygon area -> 75 m² usable area with 0.75 factor
        res = calculate_energy_estimate(
            polygon_area_m2=100.0,
            latitude=21.1458,
            longitude=79.0882,
            bill_offset_percent=100.0,
            panel_type="monocrystalline"
        )
        self.assertEqual(res["status"], "SUCCESS")
        self.assertEqual(res["area_derivation"]["usable_area_m2"], 75.0)

    def test_system_capacity_sizing(self):
        # 75 m² usable / 1.7 m² panel footprint = 44 panels
        # 44 * 400 W = 17.6 kWp
        res = calculate_energy_estimate(
            polygon_area_m2=100.0,
            latitude=21.1458,
            longitude=79.0882,
            bill_offset_percent=100.0,
            panel_type="monocrystalline"
        )
        sizing = res["system_sizing"]
        self.assertEqual(sizing["num_panels"], 44)
        self.assertEqual(sizing["system_capacity_kw"], 17.6)

    def test_pm_surya_ghar_subsidy(self):
        self.assertEqual(calculate_pm_surya_ghar_subsidy(1.0), 30000.0)
        self.assertEqual(calculate_pm_surya_ghar_subsidy(2.0), 60000.0)
        self.assertEqual(calculate_pm_surya_ghar_subsidy(3.0), 78000.0)
        self.assertEqual(calculate_pm_surya_ghar_subsidy(5.0), 78000.0)

    def test_pvlib_monthly_simulation(self):
        res = calculate_energy_estimate(
            polygon_area_m2=120.0,
            latitude=28.6139, # New Delhi
            longitude=77.2090,
            roof_tilt=20.0,
            solar_azimuth=180.0,
            bill_offset_percent=90.0,
            panel_type="bifacial"
        )
        pv = res["pvlib_simulation"]
        self.assertEqual(len(pv["monthly_generation_kwh"]), 12)
        self.assertGreater(pv["annual_generation_kwh"], 0)
        self.assertGreater(res["financial_environmental_impact"]["annual_savings_inr"], 0)


if __name__ == "__main__":
    unittest.main()
