"""
OJAS Backend Configuration & Engineering Constants
PM Surya Ghar Rooftop Solar Assessment Platform
"""

# Step 1: Usable Roof Area Utilization Factors by Construction Material
# Factors account for 1.5-3 ft fire/perimeter setbacks, maintenance walkways, mumty/water tanks, and roof geometry
DEFAULT_USABLE_AREA_FACTOR: float = 0.75
USABLE_AREA_FACTOR: float = DEFAULT_USABLE_AREA_FACTOR

ROOF_MATERIAL_USABLE_FACTORS = {
    "rcc": 0.75,       # RCC flat terrace (perimeter setbacks, mumty, water tanks)
    "tin": 0.80,       # Galvanized tin/metal sheet (high continuous usable surface)
    "tile": 0.65,      # Clay/Mangalore tiles (pitch, ridges, valleys, fragile mounting)
    "asbestos": 0.70,  # Asbestos/fiber sheet (purlin mounting spacing constraints)
    "wood": 0.60       # Wood/truss framing (structural load limits)
}

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

# 10-Year Historical Climate Datasets (2016-2025) for Representative Indian Districts
# GHI values in kWh/m²/day, Temperatures in °C
HISTORICAL_YEARS = ["2016", "2017", "2018", "2019", "2020", "2021", "2022", "2023", "2024", "2025"]

DISTRICT_CLIMATE_DATA = {
    "kolkata": {
        "name": "Kolkata",
        "state": "West Bengal",
        "lat": 22.5726,
        "lng": 88.3639,
        "ghi": [4.95, 5.08, 5.12, 4.90, 5.02, 5.15, 5.05, 5.18, 5.14, 5.21],
        "temp": [26.8, 27.1, 27.4, 27.0, 27.3, 27.6, 27.5, 27.8, 27.7, 28.0],
        "sunny_days": 284,
        "dust_index": "Moderate",
        "panel_temp_loss_pct": 3.9
    },
    "delhi": {
        "name": "New Delhi",
        "state": "Delhi NCR",
        "lat": 28.6139,
        "lng": 77.2090,
        "ghi": [5.25, 5.34, 5.40, 5.20, 5.30, 5.38, 5.35, 5.42, 5.40, 5.46],
        "temp": [25.1, 25.4, 25.8, 25.3, 25.6, 26.0, 25.9, 26.3, 26.2, 26.5],
        "sunny_days": 305,
        "dust_index": "High (Seasonal)",
        "panel_temp_loss_pct": 4.2
    },
    "jaipur": {
        "name": "Jaipur",
        "state": "Rajasthan",
        "lat": 26.9124,
        "lng": 75.7873,
        "ghi": [5.68, 5.75, 5.82, 5.62, 5.70, 5.80, 5.78, 5.86, 5.83, 5.90],
        "temp": [25.8, 26.1, 26.5, 26.0, 26.4, 26.8, 26.7, 27.1, 27.0, 27.3],
        "sunny_days": 322,
        "dust_index": "High",
        "panel_temp_loss_pct": 4.5
    },
    "nagpur": {
        "name": "Nagpur",
        "state": "Maharashtra",
        "lat": 21.1458,
        "lng": 79.0882,
        "ghi": [5.38, 5.46, 5.52, 5.32, 5.42, 5.50, 5.48, 5.56, 5.52, 5.58],
        "temp": [27.0, 27.3, 27.7, 27.2, 27.5, 27.9, 27.8, 28.2, 28.1, 28.4],
        "sunny_days": 308,
        "dust_index": "Low-Moderate",
        "panel_temp_loss_pct": 4.4
    },
    "bengaluru": {
        "name": "Bengaluru",
        "state": "Karnataka",
        "lat": 12.9716,
        "lng": 77.5946,
        "ghi": [5.42, 5.48, 5.55, 5.36, 5.45, 5.52, 5.50, 5.58, 5.54, 5.60],
        "temp": [24.0, 24.3, 24.6, 24.2, 24.5, 24.8, 24.7, 25.1, 25.0, 25.3],
        "sunny_days": 298,
        "dust_index": "Low",
        "panel_temp_loss_pct": 3.1
    },
    "mumbai": {
        "name": "Mumbai",
        "state": "Maharashtra",
        "lat": 19.0760,
        "lng": 72.8777,
        "ghi": [5.05, 5.12, 5.18, 4.98, 5.08, 5.16, 5.12, 5.20, 5.18, 5.24],
        "temp": [27.5, 27.8, 28.1, 27.7, 28.0, 28.3, 28.2, 28.6, 28.5, 28.8],
        "sunny_days": 288,
        "dust_index": "Low (Coastal)",
        "panel_temp_loss_pct": 3.8
    },
    "ahmedabad": {
        "name": "Ahmedabad",
        "state": "Gujarat",
        "lat": 23.0225,
        "lng": 72.5714,
        "ghi": [5.55, 5.62, 5.70, 5.50, 5.58, 5.68, 5.65, 5.74, 5.70, 5.78],
        "temp": [27.2, 27.5, 27.9, 27.4, 27.7, 28.1, 28.0, 28.4, 28.3, 28.6],
        "sunny_days": 315,
        "dust_index": "Moderate",
        "panel_temp_loss_pct": 4.3
    },
    "hyderabad": {
        "name": "Hyderabad",
        "state": "Telangana",
        "lat": 17.3850,
        "lng": 78.4867,
        "ghi": [5.32, 5.40, 5.48, 5.28, 5.36, 5.45, 5.42, 5.50, 5.46, 5.52],
        "temp": [26.6, 26.9, 27.3, 26.8, 27.1, 27.5, 27.4, 27.8, 27.7, 28.0],
        "sunny_days": 302,
        "dust_index": "Moderate",
        "panel_temp_loss_pct": 4.0
    },
    "chennai": {
        "name": "Chennai",
        "state": "Tamil Nadu",
        "lat": 13.0827,
        "lng": 80.2707,
        "ghi": [5.28, 5.35, 5.42, 5.22, 5.30, 5.38, 5.35, 5.44, 5.40, 5.46],
        "temp": [28.8, 29.1, 29.5, 29.0, 29.3, 29.7, 29.6, 30.0, 29.9, 30.2],
        "sunny_days": 290,
        "dust_index": "Low (Coastal)",
        "panel_temp_loss_pct": 4.6
    },
    "lucknow": {
        "name": "Lucknow",
        "state": "Uttar Pradesh",
        "lat": 26.8467,
        "lng": 80.9462,
        "ghi": [5.18, 5.25, 5.32, 5.12, 5.22, 5.30, 5.28, 5.36, 5.32, 5.38],
        "temp": [25.6, 25.9, 26.3, 25.8, 26.1, 26.5, 26.4, 26.8, 26.7, 27.0],
        "sunny_days": 296,
        "dust_index": "Moderate-High",
        "panel_temp_loss_pct": 4.1
    },
    "patna": {
        "name": "Patna",
        "state": "Bihar",
        "lat": 25.5941,
        "lng": 85.1376,
        "ghi": [5.08, 5.15, 5.22, 5.02, 5.12, 5.20, 5.18, 5.26, 5.22, 5.28],
        "temp": [25.9, 26.2, 26.6, 26.1, 26.4, 26.8, 26.7, 27.1, 27.0, 27.3],
        "sunny_days": 292,
        "dust_index": "Moderate",
        "panel_temp_loss_pct": 4.0
    }
}

