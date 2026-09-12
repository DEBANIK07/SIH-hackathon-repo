"""
OJAS Historical Weather Service
Fetches 10 years of historical solar & meteorological data from Open-Meteo Archive API,
converts units (MJ/m²/day to kWh/m²/day via /3.6), and computes derived views:
- calculation_input: 5-year average (used for generation calculation)
- yearly_variation: 10-year yearly breakdown (used for frontend variation graph)
"""

from datetime import date
from typing import Dict, Any, List, Optional
import requests
import pandas as pd


def fetch_weather_history(lat: float, lng: float = 79.0882, lon: Optional[float] = None) -> Dict[str, Any]:
    """
    Step 1 — Fetch 10 years of daily data from Open-Meteo Archive API (one API call covers both needs).
    """
    effective_lng = lng if lon is None else lon
    end_year = date.today().year - 1  # last fully completed year
    start_year = end_year - 9         # 10 years total
    url = (
        f"https://archive-api.open-meteo.com/v1/archive"
        f"?latitude={lat}&longitude={effective_lng}"
        f"&start_date={start_year}-01-01&end_date={end_year}-12-31"
        f"&daily=shortwave_radiation_sum,temperature_2m_mean,wind_speed_10m_mean"
        f"&timezone=auto"
    )
    response = requests.get(url, timeout=15)
    response.raise_for_status()
    return response.json()


def process_weather_data(raw_json: Dict[str, Any]) -> pd.DataFrame:
    """
    Step 2 — Convert units and structure into a DataFrame.
    CRITICAL CONVERSION: Open-Meteo returns MJ/m²/day for shortwave_radiation_sum, pvlib needs kWh/m²/day.
    1 kWh = 3.6 MJ -> ghi_kwh = ghi_mj / 3.6
    """
    daily = raw_json["daily"]
    df = pd.DataFrame({
        "date": pd.to_datetime(daily["time"]),
        "ghi_mj": daily["shortwave_radiation_sum"],       # MJ/m²/day from Open-Meteo
        "temp_c": daily["temperature_2m_mean"],
        "wind_ms": daily["wind_speed_10m_mean"],
    })
    df["ghi_kwh"] = df["ghi_mj"] / 3.6   # CRITICAL CONVERSION — Open-Meteo returns MJ, pvlib needs kWh
    df["year"] = df["date"].dt.year
    return df


def five_year_average(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Compute 5-year average derived view (used for generation calculation).
    """
    last_5 = df[df["year"] >= df["year"].max() - 4]
    return {
        "avg_ghi_kwh_m2_day": round(float(last_5["ghi_kwh"].mean()), 2),
        "avg_temp_c": round(float(last_5["temp_c"].mean()), 1),
        "avg_wind_ms": round(float(last_5["wind_ms"].mean()), 1),
        "years_used": f"{int(last_5['year'].min())}-{int(last_5['year'].max())}"
    }


def ten_year_yearly_breakdown(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Compute 10-year yearly breakdown derived view (for frontend variation graph).
    """
    yearly = df.groupby("year")["ghi_kwh"].mean().round(2)
    return [{"year": int(y), "avg_ghi_kwh_m2_day": float(v)} for y, v in yearly.items()]


def derive_weather_views(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Combines five_year_average and ten_year_yearly_breakdown into a standard dictionary.
    """
    calc_input = five_year_average(df)
    yearly_var = ten_year_yearly_breakdown(df)

    years_list = [str(item["year"]) for item in yearly_var]
    ghi_kwh_series = [item["avg_ghi_kwh_m2_day"] for item in yearly_var]

    return {
        "calculation_input": calc_input,
        "yearly_variation": yearly_var,
        "five_year_average": calc_input,
        "ten_year_breakdown": yearly_var,
        "years": years_list,
        "solar_radiation_ghi": ghi_kwh_series,
        "avg_annual_ghi": calc_input["avg_ghi_kwh_m2_day"],
        "mean_temp_c": calc_input["avg_temp_c"]
    }


def get_weather_history_data(lat: float, lng: float = 79.0882, lon: Optional[float] = None) -> Dict[str, Any]:
    """
    Main entry point for fetching and deriving 10-year historical weather data.
    """
    effective_lng = lng if lon is None else lon
    raw_json = fetch_weather_history(lat, effective_lng)
    df = process_weather_data(raw_json)
    derived = derive_weather_views(df)

    return {
        "status": "SUCCESS",
        "latitude": float(lat),
        "longitude": float(effective_lng),
        "data_source": "Open-Meteo Historical Archive API",
        "calculation_input": derived["calculation_input"],
        "yearly_variation": derived["yearly_variation"],
        "five_year_average": derived["five_year_average"],
        "ten_year_breakdown": derived["ten_year_breakdown"],
        "years": derived["years"],
        "solar_radiation_ghi": derived["solar_radiation_ghi"],
        "avg_annual_ghi": derived["avg_annual_ghi"],
        "mean_temp_c": derived["mean_temp_c"]
    }
