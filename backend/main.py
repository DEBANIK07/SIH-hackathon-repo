"""
OJAS Backend API Server (FastAPI)
Provides RESTful APIs for PVLib Solar Energy Calculation Engine, Geocoding, & Environmental Data
"""

from typing import Optional, Dict, Any, List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.config import ALMM_PANEL_CATALOG, USABLE_AREA_FACTOR
from backend.services.solar_engine import calculate_energy_estimate

app = FastAPI(
    title="OJAS Solar Energy Calculation Engine",
    description="PM Surya Ghar Rooftop Solar Assessment Platform API powered by pvlib-python",
    version="1.0.0"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class GeometryPayload(BaseModel):
    centroidLat: Optional[float] = 21.1458
    centroidLng: Optional[float] = 79.0882
    roofTilt: Optional[float] = 15.0
    solarAzimuth: Optional[float] = 180.0


class EnergyEstimateRequest(BaseModel):
    polygon_area_m2: float = Field(..., description="Rooftop polygon area in square meters", example=100.0)
    latitude: Optional[float] = Field(default=21.1458, description="Centroid latitude")
    longitude: Optional[float] = Field(default=79.0882, description="Centroid longitude")
    elevation_m: Optional[float] = Field(default=200.0, description="Terrain elevation in meters")
    roof_tilt: Optional[float] = Field(default=15.0, description="Racking tilt angle in degrees")
    solar_azimuth: Optional[float] = Field(default=180.0, description="Solar facing azimuth angle in degrees")
    bill_offset_percent: Optional[float] = Field(default=100.0, ge=10.0, le=100.0, description="User slider bill offset %")
    panel_type: Optional[str] = Field(default="monocrystalline", description="Selected ALMM panel type")
    geometry: Optional[GeometryPayload] = Field(default=None, description="Optional nested Phase 2 geometry object")


@app.get("/api/v1/health", summary="Health check endpoint")
async def health_check():
    return {
        "status": "ONLINE",
        "engine": "pvlib-python",
        "platform": "OJAS Surya Ghar Solar Assessment Platform",
        "version": "1.0.0"
    }


@app.get("/api/v1/panel-catalog", summary="Get ALMM reference panel catalog")
async def get_panel_catalog():
    return {
        "catalog": ALMM_PANEL_CATALOG,
        "usable_area_factor": USABLE_AREA_FACTOR
    }


@app.post("/api/energy-estimate", summary="Compute PVLib energy estimate")
@app.post("/api/v1/energy-estimate", summary="Compute PVLib energy estimate (v1)")
async def estimate_energy(req: EnergyEstimateRequest):
    try:
        lat = req.latitude
        lng = req.longitude
        tilt = req.roof_tilt
        azimuth = req.solar_azimuth

        # Extract nested geometry if provided from Phase 2 payload
        if req.geometry:
            if req.geometry.centroidLat is not None:
                lat = req.geometry.centroidLat
            if req.geometry.centroidLng is not None:
                lng = req.geometry.centroidLng
            if req.geometry.roofTilt is not None:
                tilt = req.geometry.roofTilt
            if req.geometry.solarAzimuth is not None:
                azimuth = req.geometry.solarAzimuth

        result = calculate_energy_estimate(
            polygon_area_m2=req.polygon_area_m2,
            latitude=lat if lat is not None else 21.1458,
            longitude=lng if lng is not None else 79.0882,
            elevation_m=req.elevation_m or 200.0,
            roof_tilt=tilt if tilt is not None else 15.0,
            solar_azimuth=azimuth if azimuth is not None else 180.0,
            bill_offset_percent=req.bill_offset_percent or 100.0,
            panel_type=req.panel_type or "monocrystalline"
        )
        return result
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Energy calculation error: {str(exc)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
