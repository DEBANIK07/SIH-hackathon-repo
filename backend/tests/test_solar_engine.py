import unittest
from backend.services.solar_engine import calculate_energy_estimate, calculate_pm_surya_ghar_subsidy
from backend.config import (
    USABLE_AREA_FACTOR,
    DEFAULT_USABLE_AREA_FACTOR,
    ROOF_MATERIAL_USABLE_FACTORS,
    DISTRICT_CLIMATE_DATA,
    ALMM_PANEL_CATALOG
)
from backend.main import find_closest_district, get_weather_history


class TestEnergyEngine(unittest.TestCase):

    def test_usable_area_calculation(self):
        # 100 m² polygon area -> 75 m² usable area with 0.75 factor
        res = calculate_energy_estimate(
            polygon_area_m2=100.0,
            latitude=21.1458,
            longitude=79.0882,
            bill_offset_percent=100.0,
            panel_type="monocrystalline",
            roof_material="rcc"
        )
        self.assertEqual(res["status"], "SUCCESS")
        self.assertEqual(res["area_derivation"]["usable_area_m2"], 75.0)
        self.assertEqual(res["area_derivation"]["gross_area_m2"], 100.0)

    def test_material_specific_usable_factors(self):
        # Tin roof has 0.80 factor -> 80 m² usable for 100 m² gross
        res_tin = calculate_energy_estimate(100.0, 21.1458, 79.0882, roof_material="tin")
        self.assertEqual(res_tin["area_derivation"]["usable_area_m2"], 80.0)

        # Tile roof has 0.65 factor -> 65 m² usable for 100 m² gross
        res_tile = calculate_energy_estimate(100.0, 21.1458, 79.0882, roof_material="tile")
        self.assertEqual(res_tile["area_derivation"]["usable_area_m2"], 65.0)

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

    def test_district_climate_lookup(self):
        kolkata = find_closest_district(22.5726, 88.3639, "Kolkata")
        self.assertEqual(kolkata["name"], "Kolkata")
        self.assertEqual(len(kolkata["ghi"]), 10)

        delhi = find_closest_district(28.6139, 77.2090, "New Delhi")
        self.assertEqual(delhi["name"], "New Delhi")
    def test_obstacle_deduction(self):
        # 100 m² gross roof with 15 m² obstacle (water tank + mumty)
        # Net usable = 100 - 15 - 8 (setback) = 77.0 m²
        res = calculate_energy_estimate(
            polygon_area_m2=100.0,
            latitude=21.1458,
            longitude=79.0882,
            obstacle_area_m2=15.0
        )
        self.assertEqual(res["status"], "SUCCESS")
        self.assertEqual(res["area_derivation"]["obstacle_area_m2"], 15.0)
        self.assertEqual(res["area_derivation"]["usable_area_m2"], 77.0)
        self.assertEqual(res["area_derivation"]["net_plane_usable_m2"], 77.0)


if __name__ == "__main__":
    unittest.main()

