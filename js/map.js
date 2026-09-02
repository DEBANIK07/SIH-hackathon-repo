/**
 * OJAS Leaflet Map Controller & Geocoding Service (Phase 1)
 * Features:
 * - High-Resolution Satellite Map Layer (Esri World Imagery + Reference Labels)
 * - Layer control to switch between 🛰️ High-Res Satellite and 🗺️ Street Map
 * - Centered on India by default (lat 22.0, lon 79.0, zoom 5)
 * - Mutually exclusive mode selector (Individual Building / Area / Solar Plant)
 * - Geocodes real Indian locations via Nominatim API with descriptive User-Agent
 * - Real-time progress feedback logging into Status Panel
 * - Enables "Continue" button linking to dashboard.html only upon successful location match
 * - Geospatial Rooftop Polygon Tracing & Turf.js Geodesic Area Calculation
 */

class OJASMapController {
  constructor() {
    this.map = null;
    this.marker = null;
    this.currentCoords = { lat: 22.0, lng: 79.0 };
    this.isLocationFound = false;
    this.activeMode = 'building';

    // Geospatial Rooftop Drawing State
    this.isDrawingMode = false;
    this.isRoofConfirmed = false;
    this.drawPoints = [];      // Array of [lng, lat] coordinates (Turf.js format)
    this.pointMarkers = [];    // Array of Leaflet point markers
    this.polylineLayer = null;  // Leaflet polyline or polygon layer
    this.calculatedArea = null; // { sqm, sqft }
  }

  init(mapContainerId = 'map-view') {
    const container = document.getElementById(mapContainerId);
    if (!container) return;

    if (window.StatusLog) {
      window.StatusLog.log('Initializing Leaflet.js High-Res Satellite Map Engine...', 'INFO', 'MAP');
    }

    // Initialize Leaflet map centered on India (lat 22.0, lon 79.0, zoom 5)
    this.map = L.map(mapContainerId, {
      center: [22.0, 79.0],
      zoom: 5,
      zoomControl: true
    });

    // 1. High-Resolution Satellite Imagery Layer (Esri World Imagery)
    const satelliteLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
      }
    );

    // 2. Satellite Labels & Boundaries Overlay Layer
    const labelsLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
        attribution: ''
      }
    );

    // Combined Satellite Layer Group
    const satelliteGroup = L.layerGroup([satelliteLayer, labelsLayer]);

    // 3. OpenStreetMap Blueprint Base Layer
    const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    });

    // Add Satellite Group as default layer
    satelliteGroup.addTo(this.map);

    // Add layer switch control to top-right
    const baseMaps = {
      "🛰️ High-Res Satellite": satelliteGroup,
      "🗺️ Street / Blueprint": streetLayer
    };

    L.control.layers(baseMaps, null, { position: 'topright' }).addTo(this.map);

    // Bind Mode Selector Buttons
    this.initModeSelector();

    // Bind Draw Rooftop Panel Buttons
    this.initDrawPanel();

    // Bind Locate / Search Controls
    const searchBtn = document.getElementById('search-btn');
    const searchInput = document.getElementById('search-input');

    if (searchBtn && searchInput) {
      searchBtn.addEventListener('click', () => this.searchLocation(searchInput.value));
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.searchLocation(searchInput.value);
      });
    }

    // Map click event listener
    this.map.on('click', (e) => this.handleMapClick(e));

    if (window.StatusLog) {
      window.StatusLog.log('Satellite Map engine online. Default view: High-Res Satellite Imagery (India).', 'SUCCESS', 'MAP');
    }
  }

  initModeSelector() {
    const modes = [
      { id: 'mode-building', key: 'building', name: 'Individual Building' },
      { id: 'mode-area', key: 'area', name: 'Area / Neighborhood' },
      { id: 'mode-plant', key: 'plant', name: 'Solar Plant' }
    ];

    modes.forEach(mode => {
      const btn = document.getElementById(mode.id);
      if (btn) {
        btn.addEventListener('click', () => {
          modes.forEach(m => {
            const b = document.getElementById(m.id);
            if (b) b.classList.remove('active');
          });
          btn.classList.add('active');
          this.activeMode = mode.key;

          if (window.StatusLog) {
            window.StatusLog.log(`Assessment Mode selected: [${mode.name}]`, 'INFO', 'MODE');
          }
        });
      }
    });
  }

  initDrawPanel() {
    const drawBtn = document.getElementById('btn-draw-roof');
    const undoBtn = document.getElementById('btn-undo-point');
    const clearBtn = document.getElementById('btn-clear-roof');
    const calcBtn = document.getElementById('btn-calc-area');
    const useBtn = document.getElementById('btn-use-roof');

    if (drawBtn) drawBtn.addEventListener('click', () => this.toggleDrawMode());
    if (undoBtn) undoBtn.addEventListener('click', () => this.undoLastPoint());
    if (clearBtn) clearBtn.addEventListener('click', () => this.clearDrawing());
    if (calcBtn) calcBtn.addEventListener('click', () => this.calculateArea());
    if (useBtn) useBtn.addEventListener('click', () => this.useSelectedRoof());

    this.enableDrawPanel();
  }

  enableDrawPanel() {
    const panel = document.getElementById('draw-roof-panel');
    const drawBtn = document.getElementById('btn-draw-roof');
    if (panel) {
      panel.classList.remove('disabled-panel');
    }
    if (drawBtn && !this.isRoofConfirmed) {
      drawBtn.removeAttribute('disabled');
    }
  }

  formatCoords(lat, lng) {
    const latDir = lat >= 0 ? 'N' : 'S';
    const lngDir = lng >= 0 ? 'E' : 'W';
    return `${Math.abs(lat).toFixed(4)}°${latDir}, ${Math.abs(lng).toFixed(4)}°${lngDir}`;
  }

  setMarker(lat, lng, label = 'Selected Location') {
    this.currentCoords = { lat, lng };

    if (this.marker) {
      this.marker.setLatLng([lat, lng]);
    } else {
      // High visibility crosshair pin for satellite view
      const customIcon = L.divIcon({
        className: 'custom-blueprint-pin',
        html: `<div style="
          width: 28px;
          height: 28px;
          background: #101B2D;
          border: 2px solid #E8A33D;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 0 4px rgba(232, 163, 61, 0.4), 0 4px 12px rgba(0,0,0,0.5);
        ">
          <div style="width: 8px; height: 8px; background: #E8A33D; border-radius: 50%;"></div>
        </div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      this.marker = L.marker([lat, lng], { icon: customIcon }).addTo(this.map);
    }

    const coordEl = document.getElementById('coord-readout');
    if (coordEl) {
      coordEl.textContent = this.formatCoords(lat, lng);
    }

    const latEl = document.getElementById('selected-lat');
    const lngEl = document.getElementById('selected-lng');
    if (latEl) latEl.textContent = lat.toFixed(4) + '°';
    if (lngEl) lngEl.textContent = lng.toFixed(4) + '°';

    this.enableContinueButton();
    this.enableDrawPanel();
  }

  handleMapClick(e) {
    const { lat, lng } = e.latlng;

    if (this.isDrawingMode) {
      if (this.isRoofConfirmed) return;
      this.addDrawingPoint(lat, lng);
    } else {
      this.setMarker(lat, lng, 'Clicked Map Location');
      this.map.panTo([lat, lng]);

      if (window.StatusLog) {
        window.StatusLog.log(`✓ Satellite point selected — ${lat.toFixed(4)}, ${lng.toFixed(4)}`, 'SUCCESS', 'MAP');
      }

      this.triggerBackendCalculations(lat, lng);
    }
  }

  toggleDrawMode() {
    if (this.isRoofConfirmed) return;

    this.isDrawingMode = !this.isDrawingMode;
    const drawBtn = document.getElementById('btn-draw-roof');
    const mapContainer = document.getElementById('map-view');

    if (this.isDrawingMode) {
      if (drawBtn) drawBtn.classList.add('active');
      if (mapContainer) mapContainer.style.cursor = 'crosshair';
      logStatus('Click points on the map to trace your rooftop', 'pending');
    } else {
      if (drawBtn) drawBtn.classList.remove('active');
      if (mapContainer) mapContainer.style.cursor = '';
      logStatus('Drawing mode paused', 'info');
    }
  }

  addDrawingPoint(lat, lng) {
    // Turf.js coordinate order is [longitude, latitude]
    this.drawPoints.push([lng, lat]);

    // Render small marigold circle marker (#E8A33D)
    const dotIcon = L.divIcon({
      className: 'roof-marigold-dot',
      html: `<div style="
        width: 12px;
        height: 12px;
        background: #E8A33D;
        border: 2px solid #101B2D;
        border-radius: 50%;
        box-shadow: 0 0 8px rgba(232, 163, 61, 0.9);
      "></div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6]
    });

    const marker = L.marker([lat, lng], { icon: dotIcon }).addTo(this.map);
    this.pointMarkers.push(marker);

    // Redraw connecting line/polygon
    this.updateDrawingOverlay();

    // Log status strictly using requirement specification
    logStatus(`Point added — ${this.drawPoints.length} total`, 'success');

    // Update button states
    const undoBtn = document.getElementById('btn-undo-point');
    const clearBtn = document.getElementById('btn-clear-roof');
    const calcBtn = document.getElementById('btn-calc-area');

    if (undoBtn) undoBtn.removeAttribute('disabled');
    if (clearBtn) clearBtn.removeAttribute('disabled');
    if (calcBtn && this.drawPoints.length >= 3) {
      calcBtn.removeAttribute('disabled');
    }
  }

  updateDrawingOverlay() {
    if (this.polylineLayer) {
      this.map.removeLayer(this.polylineLayer);
      this.polylineLayer = null;
    }

    if (this.drawPoints.length >= 2) {
      // Convert Turf [lng, lat] back to Leaflet [lat, lng]
      const latLngs = this.drawPoints.map(pt => [pt[1], pt[0]]);

      if (this.calculatedArea) {
        // Render completed polygon with translucent marigold fill
        const closedLatLngs = [...latLngs, latLngs[0]];
        this.polylineLayer = L.polygon(closedLatLngs, {
          color: '#E8A33D',
          weight: 3,
          fillColor: '#E8A33D',
          fillOpacity: 0.35
        }).addTo(this.map);
      } else {
        // Render real-time connecting polyline
        this.polylineLayer = L.polyline(latLngs, {
          color: '#E8A33D',
          weight: 2.5,
          dashArray: '5, 5'
        }).addTo(this.map);
      }
    }
  }

  undoLastPoint() {
    if (this.drawPoints.length === 0 || this.isRoofConfirmed) return;

    this.drawPoints.pop();
    const marker = this.pointMarkers.pop();
    if (marker) {
      this.map.removeLayer(marker);
    }

    this.calculatedArea = null;
    this.updateDrawingOverlay();
    this.resetAreaDisplay();

    const undoBtn = document.getElementById('btn-undo-point');
    const clearBtn = document.getElementById('btn-clear-roof');
    const calcBtn = document.getElementById('btn-calc-area');
    const useBtn = document.getElementById('btn-use-roof');

    if (this.drawPoints.length === 0) {
      if (undoBtn) undoBtn.setAttribute('disabled', 'true');
      if (clearBtn) clearBtn.setAttribute('disabled', 'true');
    }

    if (calcBtn && this.drawPoints.length < 3) {
      calcBtn.setAttribute('disabled', 'true');
    }

    if (useBtn) {
      useBtn.setAttribute('disabled', 'true');
      useBtn.classList.remove('confirmed');
    }

    logStatus(`Point removed — ${this.drawPoints.length} remaining`, 'info');
  }

  clearDrawing() {
    this.pointMarkers.forEach(m => this.map.removeLayer(m));
    this.pointMarkers = [];
    this.drawPoints = [];

    if (this.polylineLayer) {
      this.map.removeLayer(this.polylineLayer);
      this.polylineLayer = null;
    }

    this.calculatedArea = null;
    this.isRoofConfirmed = false;
    this.resetAreaDisplay();

    const drawBtn = document.getElementById('btn-draw-roof');
    const undoBtn = document.getElementById('btn-undo-point');
    const clearBtn = document.getElementById('btn-clear-roof');
    const calcBtn = document.getElementById('btn-calc-area');
    const useBtn = document.getElementById('btn-use-roof');

    if (drawBtn) drawBtn.classList.remove('active');
    if (undoBtn) undoBtn.setAttribute('disabled', 'true');
    if (clearBtn) clearBtn.setAttribute('disabled', 'true');
    if (calcBtn) calcBtn.setAttribute('disabled', 'true');
    if (useBtn) {
      useBtn.setAttribute('disabled', 'true');
      useBtn.classList.remove('confirmed');
      useBtn.textContent = 'Use Selected Roof';
    }

    logStatus('Drawing cleared', 'info');
  }

  calculateArea() {
    if (this.drawPoints.length < 3) {
      logStatus('Need at least 3 points to calculate area', 'error');
      return;
    }

    try {
      let areaSqm = 0;
      const closedPoints = [...this.drawPoints, this.drawPoints[0]];

      if (typeof turf !== 'undefined' && turf.polygon && turf.area) {
        const polygon = turf.polygon([closedPoints]);
        areaSqm = turf.area(polygon);
      } else {
        areaSqm = this.calculatePlanarArea(closedPoints);
      }

      const areaSqft = areaSqm * 10.7639;
      this.calculatedArea = { sqm: areaSqm, sqft: areaSqft };

      // Render closed filled polygon
      this.updateDrawingOverlay();

      // Display area result inline
      const areaTextEl = document.getElementById('roof-area-text');
      if (areaTextEl) {
        areaTextEl.textContent = `${areaSqm.toFixed(1)} m² (${Math.round(areaSqft).toLocaleString()} ft²)`;
      }

      logStatus(`Area calculated: ${areaSqm.toFixed(1)} m²`, 'success');

      // Enable Use Selected Roof button
      const useBtn = document.getElementById('btn-use-roof');
      if (useBtn) {
        useBtn.removeAttribute('disabled');
      }

    } catch (err) {
      logStatus(`Area calculation error: ${err.message}`, 'error');
    }
  }

  calculatePlanarArea(points) {
    if (points.length < 3) return 0;
    const R = 6378137;
    let area = 0;
    const refLat = points[0][1] * Math.PI / 180;
    
    const meters = points.map(pt => [
      (pt[0] * Math.PI / 180) * R * Math.cos(refLat),
      (pt[1] * Math.PI / 180) * R
    ]);
    
    for (let i = 0; i < meters.length - 1; i++) {
      area += (meters[i][0] * meters[i+1][1]) - (meters[i+1][0] * meters[i][1]);
    }
    return Math.abs(area / 2);
  }

  useSelectedRoof() {
    if (!this.calculatedArea) return;

    this.isRoofConfirmed = true;
    this.isDrawingMode = false;

    // Lock drawing state and disable further editing
    const drawBtn = document.getElementById('btn-draw-roof');
    const undoBtn = document.getElementById('btn-undo-point');
    const clearBtn = document.getElementById('btn-clear-roof');
    const calcBtn = document.getElementById('btn-calc-area');
    const useBtn = document.getElementById('btn-use-roof');

    if (drawBtn) {
      drawBtn.classList.remove('active');
      drawBtn.setAttribute('disabled', 'true');
    }
    if (undoBtn) undoBtn.setAttribute('disabled', 'true');
    if (clearBtn) clearBtn.setAttribute('disabled', 'true');
    if (calcBtn) calcBtn.setAttribute('disabled', 'true');

    if (useBtn) {
      useBtn.setAttribute('disabled', 'true');
      useBtn.classList.add('confirmed');
      useBtn.textContent = '✓ Roof Confirmed';
    }

    logStatus('Rooftop selection confirmed', 'success');

    // Update feasibility readouts based on confirmed usable roof area
    this.updateMetricsFromRoofArea(this.calculatedArea.sqm);

    // Trigger Phase 2 Environmental Data Layer processing on confirmed polygon
    if (window.ojasEnvironmental) {
      window.ojasEnvironmental.processRoofPolygon(this.drawPoints);
    }

    // Enable Continue button
    this.enableContinueButton();
  }

  resetAreaDisplay() {
    const areaTextEl = document.getElementById('roof-area-text');
    if (areaTextEl) {
      areaTextEl.textContent = '--.- m² (-- ft²)';
    }
  }

  updateMetricsFromRoofArea(areaSqm) {
    // Sizing formula: ~7.5 m² per 1 kW solar capacity
    const estimatedCapKw = Math.max(1, Math.round((areaSqm / 7.5) * 10) / 10);
    // Estimated generation: ~1400 kWh/kW/yr in India
    const estimatedGenKwh = Math.round(estimatedCapKw * 1400);

    // PM Surya Ghar subsidy
    let subsidyInr = 0;
    if (estimatedCapKw <= 2) {
      subsidyInr = estimatedCapKw * 30000;
    } else if (estimatedCapKw <= 3) {
      subsidyInr = 60000 + (estimatedCapKw - 2) * 18000;
    } else {
      subsidyInr = 78000;
    }

    const genEl = document.getElementById('metric-generation');
    const capEl = document.getElementById('metric-capacity');
    const subEl = document.getElementById('metric-subsidy');

    if (genEl) genEl.textContent = `${estimatedGenKwh.toLocaleString()} kWh/yr`;
    if (capEl) capEl.textContent = `${estimatedCapKw} kW (${areaSqm.toFixed(1)} m²)`;
    if (subEl) subEl.textContent = `₹${Math.round(subsidyInr).toLocaleString()}`;
  }

  async searchLocation(query) {
    if (!query || query.trim() === '') {
      if (window.StatusLog) {
        window.StatusLog.log('⚠️ Please enter an address, city, area, or pincode to search.', 'WARN', 'GEOCODE');
      }
      return;
    }

    const cleanQuery = query.trim();

    if (window.StatusLog) {
      window.StatusLog.log(`⏳ Searching for location: "${cleanQuery}"...`, 'CALL', 'GEOCODE');
    }

    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanQuery)}&format=json&countrycodes=in&limit=1`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'OJAS-Solar-Assessment-Platform/1.0 (contact@ojas-surya.in)'
        }
      });

      const results = await response.json();

      if (results && results.length > 0) {
        const place = results[0];
        const lat = parseFloat(place.lat);
        const lng = parseFloat(place.lon);

        let zoomLevel = 18; // High zoom for satellite rooftop viewing
        if (this.activeMode === 'area') zoomLevel = 15;
        if (this.activeMode === 'plant') zoomLevel = 16;

        this.map.flyTo([lat, lng], zoomLevel, { duration: 1.5 });
        this.setMarker(lat, lng, place.display_name);

        const addrEl = document.getElementById('selected-address');
        if (addrEl) {
          addrEl.textContent = place.display_name.split(',').slice(0, 3).join(',');
        }

        if (window.StatusLog) {
          window.StatusLog.log(
            `✓ Location found — ${lat.toFixed(4)}, ${lng.toFixed(4)} (${place.display_name})`,
            'SUCCESS',
            'GEOCODE'
          );
        }

        this.triggerBackendCalculations(lat, lng);

      } else {
        if (window.StatusLog) {
          window.StatusLog.log(`✗ Location not found, try a different search`, 'ERROR', 'GEOCODE');
        }
        this.disableContinueButton();
        alert(`✗ Location "${cleanQuery}" not found. Please try entering a different city, landmark, or pincode in India.`);
      }
    } catch (err) {
      if (window.StatusLog) {
        window.StatusLog.log(`✗ Location search error: ${err.message}`, 'ERROR', 'GEOCODE');
      }
      this.disableContinueButton();
    }
  }

  enableContinueButton() {
    this.isLocationFound = true;
    const continueBtn = document.getElementById('continue-btn');
    if (continueBtn) {
      continueBtn.removeAttribute('disabled');
      continueBtn.classList.remove('disabled');
      continueBtn.href = 'dashboard.html';
    }
  }

  disableContinueButton() {
    this.isLocationFound = false;
    const continueBtn = document.getElementById('continue-btn');
    if (continueBtn) {
      continueBtn.setAttribute('disabled', 'true');
      continueBtn.classList.add('disabled');
      continueBtn.removeAttribute('href');
    }
  }

  async triggerBackendCalculations(lat, lng) {
    if (window.fetchAPI) {
      const response = await window.fetchAPI(`/api/v1/solar-potential?lat=${lat}&lng=${lng}&mode=${this.activeMode}`);
      if (response.success && response.data) {
        const data = response.data;
        const genEl = document.getElementById('metric-generation');
        const capEl = document.getElementById('metric-capacity');
        const subEl = document.getElementById('metric-subsidy');

        if (!this.calculatedArea) {
          if (genEl) genEl.textContent = `${data.annual_generation_kwh.toLocaleString()} kWh/yr`;
          if (capEl) capEl.textContent = `${data.estimated_capacity_kw} kW`;
          if (subEl) subEl.textContent = `₹${data.subsidy_amount_inr.toLocaleString()}`;
        }
      }
    }
  }
}

// Global Singleton Instance
window.ojasMap = new OJASMapController();

// Init when DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  window.ojasMap.init('map-view');
});
