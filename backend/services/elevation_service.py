"""
OJAS Elevation Service
Fetches elevation in meters for given latitude and longitude coordinates.
Uses Open-Elevation API with fallback to default elevation.
"""
import requests
from typing import Optional


def get_elevation(lat: float, lng: float) -> Optional[float]:
    """
    Fetch elevation in meters for specified lat and lng coordinates.
    """
    try:
        url = f"https://api.open-elevation.com/api/v1/lookup?locations={lat},{lng}"
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        results = response.json().get("results", [])
        if not results:
            return 15.0
        return results[0].get("elevation", 15.0)
    except Exception:
        # Fallback default elevation in meters if API call fails or times out
        return 15.0
