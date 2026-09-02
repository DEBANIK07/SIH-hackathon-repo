"""
OJAS Backend Configuration & Engineering Constants
PM Surya Ghar Rooftop Solar Assessment Platform
"""

# Step 1: Usable Roof Area Utilization Factor
# Fire-safety keep-out zones (1.5-3 ft perimeter setbacks) & installation walkways
USABLE_AREA_FACTOR: float = 0.75

# Step 2: Standard Module Specifications (ALMM Reference Table)
DEFAULT_PANEL_AREA_M2: float = 1.7   # m² per standard panel
DEFAULT_PANEL_WATTAGE: int = 400     # Watts per panel

# Environmental & Financial Constants (India Grid Context)
GRID_CO2_FACTOR_KG_KWH: float = 0.82    # kg CO2 reduction per solar kWh generated in India
ELECTRICITY_TARIFF_INR_KWH: float = 7.0   # Average residential electricity tariff (₹/kWh)
DEFAULT_SYSTEM_DERATE: float = 0.84       # Total system efficiency factor (inverter, wiring, dirt)

# ALMM Panel Reference Catalog
ALMM_PANEL_CATALOG = {
    "monocrystalline": {
        "name": "Mono-PERC High Efficiency (ALMM Approved)",
        "wattage_w": 400,
        "area_m2": 1.7,
        "efficiency": 0.205,
        "temp_coeff": -0.0035,  # %/°C
    },
    "polycrystalline": {
        "name": "Polycrystalline Standard (ALMM Approved)",
        "wattage_w": 335,
        "area_m2": 1.7,
        "efficiency": 0.175,
        "temp_coeff": -0.0039,
    },
    "bifacial": {
        "name": "Bifacial N-Type TOPCon Dual-Glass",
        "wattage_w": 440,
        "area_m2": 1.8,
        "efficiency": 0.220,
        "temp_coeff": -0.0030,
    }
}
