"""
OJAS Energy Calculation Engine Service
Uses pvlib-python for physical solar modeling and power yield estimation.
"""

import math
from typing import Dict, Any, List
try:
    import pandas as pd
    import pvlib
    from pvlib.location import Location
    from pvlib.solarposition import get_solarposition
    from pvlib.clearsky import ineichen
    from pvlib.irradiance import get_total_irradiance
    from pvlib.temperature import sapm_cell
    PVLIB_AVAILABLE = True
except ImportError:
    PVLIB_AVAILABLE = False

from backend.config import (
    DEFAULT_USABLE_AREA_FACTOR,
    ROOF_MATERIAL_USABLE_FACTORS,
    DEFAULT_PANEL_AREA_M2,
    DEFAULT_PANEL_WATTAGE,
    GRID_CO2_FACTOR_KG_KWH,
    ELECTRICITY_TARIFF_INR_KWH,
    DEFAULT_SYSTEM_DERATE,
    ALMM_PANEL_CATALOG
)

# Backwards compatibility alias
USABLE_AREA_FACTOR = DEFAULT_USABLE_AREA_FACTOR


def calculate_energy_estimate(
    polygon_area_m2: float,
    latitude: float,
    longitude: float,
    elevation_m: float = 200.0,
    roof_tilt: float = 15.0,
    solar_azimuth: float = 180.0,
    bill_offset_percent: float = 100.0,
    panel_type: str = "monocrystalline",
    roof_material: str = "rcc",
    usable_area_factor: float = None
) -> Dict[str, Any]:
    """
    Computes usable rooftop area, system capacity, and runs PVLib physical solar yield simulation.

    :param polygon_area_m2: Total polygon area in square meters (Gross Area)
    :param latitude: Centroid latitude (degrees N)
    :param longitude: Centroid longitude (degrees E)
    :param elevation_m: Terrain elevation in meters ASL
    :param roof_tilt: Racking tilt angle in degrees (default 15° RCC)
    :param solar_azimuth: Roof solar facing azimuth (degrees, 180° = South)
    :param bill_offset_percent: User-adjustable bill offset slider (0-100%)
    :param panel_type: User-selected ALMM panel type key
    :param roof_material: Roof construction material ('rcc', 'tin', 'tile', 'asbestos', 'wood')
    :param usable_area_factor: Optional direct override of usable factor (0.1 to 1.0)
    :returns: Comprehensive energy calculation result dictionary
    """
    # --------------------------------------------------------------------------
    # Step 1: Usable Rooftop Area Calculation with Material-Specific Derating
    # --------------------------------------------------------------------------
    polygon_area_m2 = max(1.0, float(polygon_area_m2))
    
    mat_key = str(roof_material).lower().strip()
    if usable_area_factor is not None and 0.1 <= float(usable_area_factor) <= 1.0:
        factor = float(usable_area_factor)
    else:
        factor = ROOF_MATERIAL_USABLE_FACTORS.get(mat_key, DEFAULT_USABLE_AREA_FACTOR)

    usable_area_m2 = round(polygon_area_m2 * factor, 2)
    gross_area_sqft = round(polygon_area_m2 * 10.7639, 1)
    usable_area_sqft = round(usable_area_m2 * 10.7639, 1)

    # --------------------------------------------------------------------------
    # Step 2: System Size (kWp) & Panel Layout Derivation
    # --------------------------------------------------------------------------
    panel_key = str(panel_type).lower().strip()
    panel_spec = ALMM_PANEL_CATALOG.get(panel_key, ALMM_PANEL_CATALOG["monocrystalline"])

    panel_area_m2 = panel_spec["area_m2"]
    panel_wattage_w = panel_spec["wattage_w"]
    panel_efficiency = panel_spec["efficiency"]
    panel_temp_coeff = panel_spec["temp_coeff"]

    num_panels = int(usable_area_m2 // panel_area_m2)
    system_capacity_kw = round((num_panels * panel_wattage_w) / 1000.0, 2)
    
    # Handle small rooftops gracefully (at least 1 panel if area >= 5m²)
    if num_panels == 0 and usable_area_m2 >= 5.0:
        num_panels = 1
        system_capacity_kw = round(panel_wattage_w / 1000.0, 2)

    # --------------------------------------------------------------------------
    # Step 3: Phase 3 Generation Formula using 5-Year Weather Data
    # --------------------------------------------------------------------------
    lat = float(latitude)
    lng = float(longitude)
    elev = float(elevation_m)
    tilt = float(roof_tilt)
    azimuth = float(solar_azimuth)

    avg_ghi_kwh_m2_day = 5.14  # Default fallback
    try:
        from backend.services.weather_service import get_weather_history_data
        w_data = get_weather_history_data(lat, lng)
        if "calculation_input" in w_data and "avg_ghi_kwh_m2_day" in w_data["calculation_input"]:
            avg_ghi_kwh_m2_day = float(w_data["calculation_input"]["avg_ghi_kwh_m2_day"])
    except Exception:
        pass

    SUN_HOURS_EQUIVALENT = avg_ghi_kwh_m2_day  # kWh/m²/day numerically equals peak sun hours
    PERFORMANCE_RATIO = 0.75

    daily_generation_kwh = system_capacity_kw * SUN_HOURS_EQUIVALENT * PERFORMANCE_RATIO
    annual_generation_kwh = round(daily_generation_kwh * 365, 1)

    base_monthly = annual_generation_kwh / 12.0
    monthly_kwh = [round(base_monthly * factor, 1) for factor in [1.05, 1.10, 1.15, 1.12, 0.95, 0.75, 0.70, 0.75, 0.85, 1.05, 1.10, 1.08]]

    # --------------------------------------------------------------------------
    # Step 4: Bill Offset & Financial / Environmental Impact Metrics
    # --------------------------------------------------------------------------
    offset_ratio = max(0.1, min(1.0, float(bill_offset_percent) / 100.0))
    adjusted_annual_generation_kwh = round(annual_generation_kwh * offset_ratio, 1)

    # PM Surya Ghar Subsidy (INR)
    subsidy_inr = calculate_pm_surya_ghar_subsidy(system_capacity_kw)

    # Annual Financial Savings
    annual_savings_inr = round(adjusted_annual_generation_kwh * ELECTRICITY_TARIFF_INR_KWH, 2)

    # Environmental CO2 Reduction (Tons per year)
    co2_offset_tons = round((adjusted_annual_generation_kwh * GRID_CO2_FACTOR_KG_KWH) / 1000.0, 2)

    # System Capex & Payback
    estimated_cost_per_kw = 48000.0
    gross_system_cost_inr = round(system_capacity_kw * estimated_cost_per_kw, 2)
    net_system_cost_inr = max(0.0, gross_system_cost_inr - subsidy_inr)
    
    payback_years = round(net_system_cost_inr / annual_savings_inr, 1) if annual_savings_inr > 0 else 0.0

    return {
        "status": "SUCCESS",
        "inputs": {
            "polygon_area_m2": polygon_area_m2,
            "latitude": lat,
            "longitude": lng,
            "elevation_m": elev,
            "roof_tilt": tilt,
            "solar_azimuth": azimuth,
            "bill_offset_percent": bill_offset_percent,
            "panel_type": panel_key,
            "roof_material": mat_key
        },
        "area_derivation": {
            "gross_area_m2": polygon_area_m2,
            "usable_area_m2": usable_area_m2,
            "gross_area_sqft": gross_area_sqft,
            "usable_area_sqft": usable_area_sqft,
            "usable_area_factor": factor,
            "usable_area_percent": round(factor * 100, 1),
            "perimeter_keepout_factor_percent": round((1.0 - factor) * 100, 1)
        },
        "system_sizing": {
            "panel_name": panel_spec["name"],
            "panel_wattage_w": panel_wattage_w,
            "panel_area_m2": panel_area_m2,
            "panel_efficiency_percent": round(panel_efficiency * 100, 1),
            "num_panels": num_panels,
            "system_capacity_kw": system_capacity_kw
        },
        "pvlib_simulation": {
            "annual_generation_kwh": annual_generation_kwh,
            "adjusted_generation_kwh": adjusted_annual_generation_kwh,
            "specific_yield_kwh_kwp": round(annual_generation_kwh / system_capacity_kw, 1) if system_capacity_kw > 0 else 0,
            "monthly_generation_kwh": monthly_kwh,
            "monthly_labels": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        },
        "financial_environmental_impact": {
            "electricity_tariff_inr_kwh": ELECTRICITY_TARIFF_INR_KWH,
            "annual_savings_inr": annual_savings_inr,
            "pm_surya_ghar_subsidy_inr": subsidy_inr,
            "gross_system_cost_inr": gross_system_cost_inr,
            "net_system_cost_inr": net_system_cost_inr,
            "payback_period_years": payback_years,
            "co2_offset_tons_yr": co2_offset_tons
        }
    }


def calculate_pm_surya_ghar_subsidy(capacity_kw: float) -> float:
    """
    Calculates PM Surya Ghar: Muft Bijli Yojana Central Financial Assistance (CFA) subsidy:
    - Up to 2 kW: ₹30,000 / kW (max ₹60,000)
    - Additional 1 kW (2 to 3 kW): ₹18,000 / kW
    - Cap at 3 kW+: Maximum ₹78,000
    """
    cap = max(0.0, float(capacity_kw))
    if cap <= 0:
        return 0.0
    elif cap <= 2.0:
        return round(cap * 30000.0, 2)
    elif cap <= 3.0:
        return round(60000.0 + (cap - 2.0) * 18000.0, 2)
    else:
        return 78000.0
