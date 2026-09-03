/**
 * OJAS — Satellite GIS Rooftop Tracing & Geospatial Area Engine
 * Leaflet.js + Turf.js High-Precision Boundary Measurement
 * Sovereign Rooftop Solar Assessment Platform (PM Surya Ghar)
 */

class OJASMapController {
  constructor() {
    this.map = null;
    this.marker = null;
    this.polygon = null;
    this.currentLat = 22.5529;
    this.currentLng = 88.3524;
    this.activeMode = 'building';

    // Geospatial Rooftop Drawing State
    this.isDrawingMode = false;
    this.isRoofConfirmed = false;
    this.drawPoints = [];       // Array of [lng, lat] coordinates (Turf format)
    this.pointMarkers = [];     // Array of Leaflet point markers
    this.polylineLayer = null;  // Leaflet polyline or polygon layer
    this.calculatedArea = null; // { grossSqm, usableSqm, grossSqft, usableSqft, usableFactor }
  }

  init(mapContainerId = 'gisMap') {
    const container = document.getElementById(mapContainerId) || document.getElementById('map-view');
    if (!container) return;

    const targetId = container.id;

    if (window.StatusLog) {
      window.StatusLog.log('Initializing Leaflet.js High-Res Satellite GIS Engine...', 'INFO', 'MAP');
    }

    // Initialize Leaflet map centered at current coordinates (zoom 19 for rooftop detail)
    this.map = L.map(targetId, {
      center: [this.currentLat, this.currentLng],
      zoom: 19,
      zoomControl: true
    });

    // 1. High-Resolution Satellite Imagery Layer (Esri World Imagery)
    const esriSatellite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics',
        maxZoom: 19
      }
    );

    // 2. OpenStreetMap Street Layer
    const osmStreet = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{y}/{x}.png',
      {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
      }
    );

    // Default to Satellite view
    esriSatellite.addTo(this.map);

    // Layer toggle control
    const baseMaps = {
      "Satellite View (HD)": esriSatellite,
      "Street Map": osmStreet
    };
    L.control.layers(baseMaps, null, { position: 'topright' }).addTo(this.map);

    // Custom SVG Solar Pin
    const customIcon = L.divIcon({
      className: 'custom-solar-pin',
      html: `<div class="custom-solar-pin-inner"><div class="custom-solar-pin-dot"></div></div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    this.marker = L.marker([this.currentLat, this.currentLng], { icon: customIcon, draggable: true }).addTo(this.map);

    // Initial synthetic footprint box
    this.updateMapPolygon(this.currentLat, this.currentLng);

    // Marker drag handler
    this.marker.on('dragend', (e) => {
      const coord = e.target.getLatLng();
      this.currentLat = coord.lat;
      this.currentLng = coord.lng;
      if (!this.isDrawingMode && !this.isRoofConfirmed) {
        this.updateMapPolygon(this.currentLat, this.currentLng);
      }
      this.reverseGeocodeCoordinates(this.currentLat, this.currentLng);
      this.updateTelemetry();
    });

    // Map click handler
    this.map.on('click', (e) => this.handleMapClick(e));

    // Invalidate map size after rendering
    setTimeout(() => {
      if (this.map) this.map.invalidateSize();
    }, 300);

    // Bind Drawing Toolbar controls
    this.initDrawToolbar();

    if (window.StatusLog) {
      window.StatusLog.log(`Satellite GIS Engine Online — ${this.currentLat.toFixed(4)}° N, ${this.currentLng.toFixed(4)}° E`, 'SUCCESS', 'MAP');
    }
  }

  handleMapClick(e) {
    const { lat, lng } = e.latlng;

    if (this.isDrawingMode) {
      if (this.isRoofConfirmed) return;
      this.addDrawingPoint(lat, lng);
    } else {
      this.currentLat = lat;
      this.currentLng = lng;
      this.marker.setLatLng([lat, lng]);
      if (!this.isRoofConfirmed) {
        this.updateMapPolygon(lat, lng);
      }
      this.reverseGeocodeCoordinates(lat, lng);
      this.updateTelemetry();

      if (window.StatusLog) {
        window.StatusLog.log(`Satellite pin repositioned: ${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`, 'INFO', 'MAP');
      }
    }
  }

  updateMapPolygon(lat, lng) {
    if (this.drawPoints.length > 0) return; // Don't overwrite user drawn polygon

    if (this.polygon) this.map.removeLayer(this.polygon);

    // Synthetic terrace boundary box (~15-20m)
    const offset = 0.00015;
    const latlngs = [
      [lat + offset, lng - offset],
      [lat + offset, lng + offset * 1.2],
      [lat - offset * 0.9, lng + offset * 1.1],
      [lat - offset, lng - offset]
    ];

    this.polygon = L.polygon(latlngs, {
      color: '#F59E0B',
      weight: 2,
      fillColor: '#F59E0B',
      fillOpacity: 0.25,
      dashArray: '4, 4'
    }).addTo(this.map);

    const coordEl = document.getElementById('scanCoordText');
    if (coordEl) {
      coordEl.innerText = `GEO-SAT / LAT: ${lat.toFixed(4)}° N, LON: ${lng.toFixed(4)}° E`;
    }
  }

  /* =========================================================================
     ROOFTOP MARKER TRACING & AREA CALCULATION
     ========================================================================= */

  initDrawToolbar() {
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
  }

  toggleDrawMode() {
    if (this.isRoofConfirmed) return;

    this.isDrawingMode = !this.isDrawingMode;
    const drawBtn = document.getElementById('btn-draw-roof');
    const mapContainer = document.getElementById('gisMap') || document.getElementById('map-view');

    if (this.isDrawingMode) {
      if (drawBtn) {
        drawBtn.classList.add('active');
        drawBtn.innerHTML = '<i class="fa-solid fa-pen-nib"></i> <span>Tracing Active</span>';
      }
      if (mapContainer) mapContainer.style.cursor = 'crosshair';

      // Clear synthetic polygon when user begins custom tracing
      if (this.polygon) {
        this.map.removeLayer(this.polygon);
        this.polygon = null;
      }

      if (window.StatusLog) {
        window.StatusLog.log('Rooftop Tracing Mode active: Click terrace boundary points on satellite imagery.', 'INFO', 'DRAW');
      }
    } else {
      if (drawBtn) {
        drawBtn.classList.remove('active');
        drawBtn.innerHTML = '<i class="fa-solid fa-draw-polygon"></i> <span>Draw Roof</span>';
      }
      if (mapContainer) mapContainer.style.cursor = '';

      if (window.StatusLog) {
        window.StatusLog.log('Rooftop Tracing Mode paused.', 'INFO', 'DRAW');
      }
    }
  }

  addDrawingPoint(lat, lng) {
    // Turf uses [lng, lat] coordinate order
    this.drawPoints.push([lng, lat]);

    // High-visibility marigold vertex dot marker
    const dotIcon = L.divIcon({
      className: 'roof-marigold-dot',
      html: `<div class="roof-marigold-dot-inner"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });

    const marker = L.marker([lat, lng], { icon: dotIcon }).addTo(this.map);
    this.pointMarkers.push(marker);

    // Redraw polyline connecting points
    this.updateDrawingOverlay();

    if (window.StatusLog) {
      window.StatusLog.log(`Vertex added (${this.drawPoints.length} total) at ${lat.toFixed(5)}, ${lng.toFixed(5)}`, 'INFO', 'DRAW');
    }

    // Update buttons
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
      const latLngs = this.drawPoints.map(pt => [pt[1], pt[0]]);

      if (this.calculatedArea) {
        // Closed filled polygon
        const closedLatLngs = [...latLngs, latLngs[0]];
        this.polylineLayer = L.polygon(closedLatLngs, {
          color: '#F59E0B',
          weight: 3,
          fillColor: '#F59E0B',
          fillOpacity: 0.38
        }).addTo(this.map);
      } else {
        // Connecting dashed polyline during trace
        this.polylineLayer = L.polyline(latLngs, {
          color: '#F59E0B',
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
    if (marker) this.map.removeLayer(marker);

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

    if (drawBtn) {
      drawBtn.classList.remove('active');
      drawBtn.removeAttribute('disabled');
      drawBtn.innerHTML = '<i class="fa-solid fa-draw-polygon"></i> <span>Draw Roof</span>';
    }
    if (undoBtn) undoBtn.setAttribute('disabled', 'true');
    if (clearBtn) clearBtn.setAttribute('disabled', 'true');
    if (calcBtn) calcBtn.setAttribute('disabled', 'true');
    if (useBtn) {
      useBtn.setAttribute('disabled', 'true');
      useBtn.classList.remove('confirmed');
      useBtn.innerHTML = '<i class="fa-solid fa-check-double"></i> <span>Use Selected Roof</span>';
    }

    const mapContainer = document.getElementById('gisMap') || document.getElementById('map-view');
    if (mapContainer) mapContainer.style.cursor = '';
    this.isDrawingMode = false;

    // Restore synthetic polygon around pin
    this.updateMapPolygon(this.currentLat, this.currentLng);

    if (window.StatusLog) {
      window.StatusLog.log('Rooftop polygon trace cleared.', 'INFO', 'DRAW');
    }
  }

  getMaterialUsableFactor() {
    const mat = document.getElementById('inputMaterial')?.value || 'rcc';
    const factors = { rcc: 0.75, tin: 0.80, tile: 0.65, asbestos: 0.70, wood: 0.60 };
    return factors[mat] || 0.75;
  }

  calculateArea() {
    if (this.drawPoints.length < 3) {
      alert('Please place at least 3 points on the map to define a roof polygon.');
      return;
    }

    try {
      let grossSqm = 0;
      const closedPoints = [...this.drawPoints, this.drawPoints[0]];

      if (typeof turf !== 'undefined' && turf.polygon && turf.area) {
        const polyFeature = turf.polygon([closedPoints]);
        grossSqm = turf.area(polyFeature);
      } else {
        grossSqm = this.calculatePlanarArea(closedPoints);
      }

      const usableFactor = this.getMaterialUsableFactor();
      const usableSqm = grossSqm * usableFactor;
      const grossSqft = grossSqm * 10.7639;
      const usableSqft = usableSqm * 10.7639;

      this.calculatedArea = {
        grossSqm: parseFloat(grossSqm.toFixed(2)),
        usableSqm: parseFloat(usableSqm.toFixed(2)),
        grossSqft: parseFloat(grossSqft.toFixed(1)),
        usableSqft: parseFloat(usableSqft.toFixed(1)),
        usableFactor: usableFactor,
        sqm: parseFloat(usableSqm.toFixed(2)),
        sqft: parseFloat(usableSqft.toFixed(1))
      };

      // Render closed filled polygon
      this.updateDrawingOverlay();

      // Display area result with clear usable vs gross distinction
      const areaTextEl = document.getElementById('roof-area-text');
      if (areaTextEl) {
        areaTextEl.innerHTML = `<span class="text-amber-400 font-bold">${usableSqm.toFixed(1)} m²</span> <span class="text-slate-300">usable</span> <span class="text-slate-500">(${Math.round(usableSqft).toLocaleString('en-IN')} ft²)</span> <span class="text-slate-500 text-[10px]">| Gross: ${grossSqm.toFixed(1)} m² (${Math.round(usableFactor * 100)}%)</span>`;
      }

      const useBtn = document.getElementById('btn-use-roof');
      if (useBtn) {
        useBtn.removeAttribute('disabled');
      }

      if (window.StatusLog) {
        window.StatusLog.log(`Geodesic Roof Area: ${grossSqm.toFixed(1)} m² Gross → ${usableSqm.toFixed(1)} m² Usable (${Math.round(usableSqft)} sq ft @ ${Math.round(usableFactor * 100)}% utilization)`, 'SUCCESS', 'TURF');
      }

    } catch (err) {
      console.error('Area calculation error:', err);
      alert(`Error calculating area: ${err.message}`);
    }
  }

  calculatePlanarArea(points) {
    if (points.length < 3) return 0;
    const R = 6378137;
    let area = 0;
    const refLat = (points[0][1] * Math.PI) / 180;

    const meters = points.map(pt => [
      ((pt[0] * Math.PI) / 180) * R * Math.cos(refLat),
      ((pt[1] * Math.PI) / 180) * R
    ]);

    for (let i = 0; i < meters.length - 1; i++) {
      area += meters[i][0] * meters[i + 1][1] - meters[i + 1][0] * meters[i][1];
    }
    return Math.abs(area / 2);
  }

  useSelectedRoof() {
    if (!this.calculatedArea) return;

    this.isRoofConfirmed = true;
    this.isDrawingMode = false;

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
    if (calcBtn) calcBtn.setAttribute('disabled', 'true');

    if (useBtn) {
      useBtn.setAttribute('disabled', 'true');
      useBtn.classList.add('confirmed');
      useBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> <span>✓ Usable Roof Applied</span>';
    }

    const mapContainer = document.getElementById('gisMap') || document.getElementById('map-view');
    if (mapContainer) mapContainer.style.cursor = '';

    // Auto-populate both Gross Rooftop Area and Usable Solar Installation Area
    const houseAreaInput = document.getElementById('inputHouseArea');
    if (houseAreaInput && this.calculatedArea.grossSqft) {
      houseAreaInput.value = Math.round(this.calculatedArea.grossSqft);
    }

    const solarAreaInput = document.getElementById('inputSolarArea');
    if (solarAreaInput) {
      solarAreaInput.value = Math.round(this.calculatedArea.usableSqft);
    }

    // Update telemetry bar usable area
    const teleArea = document.getElementById('teleArea');
    if (teleArea) {
      teleArea.innerText = `${this.calculatedArea.usableSqm.toFixed(1)} m²`;
    }

    // Trigger full financial & system estimation update
    if (typeof calculateEstimation === 'function') {
      calculateEstimation();
    }

    // Trigger Phase 2 Environmental calculation if available
    if (window.ojasEnvironmental) {
      try {
        window.ojasEnvironmental.processRoofPolygon(this.drawPoints);
      } catch (e) {
        console.warn('Environmental process error:', e);
      }
    }

    if (window.StatusLog) {
      window.StatusLog.log(
        `✓ Usable area applied: ${this.calculatedArea.usableSqm.toFixed(1)} m² (${Math.round(this.calculatedArea.usableSqft)} sq ft). Gross: ${this.calculatedArea.grossSqm.toFixed(1)} m². Solar recalculation complete.`,
        'SUCCESS',
        'SURVEY'
      );
    }
  }

  resetAreaDisplay() {
    const areaTextEl = document.getElementById('roof-area-text');
    if (areaTextEl) {
      areaTextEl.innerText = '--.- m² (-- ft²)';
    }
  }

  updateTelemetry() {
    const solarArea = parseFloat(document.getElementById('inputSolarArea')?.value) || 650;
    const mat = document.getElementById('inputMaterial')?.value || 'rcc';
    const areaSqM = (solarArea * 0.092903).toFixed(1);
    const recCap = (solarArea / 130).toFixed(1); // Standard ~130 sq ft of usable area per kWp

    const teleArea = document.getElementById('teleArea');
    const teleCap = document.getElementById('teleCap');

    if (teleArea) teleArea.innerText = `${areaSqM} m²`;
    if (teleCap) teleCap.innerText = `${Math.max(1.0, parseFloat(recCap))} kWp`;

    const coordEl = document.getElementById('scanCoordText');
    if (coordEl) {
      coordEl.innerText = `GEO-SAT / LAT: ${this.currentLat.toFixed(4)}° N, LON: ${this.currentLng.toFixed(4)}° E`;
    }
  }

  reverseGeocodeCoordinates(lat, lng) {
    const coordEl = document.getElementById('scanCoordText');
    if (coordEl) {
      coordEl.innerText = `GEO-SAT / LAT: ${lat.toFixed(4)}° N, LON: ${lng.toFixed(4)}° E`;
    }

    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.display_name) {
          const input = document.getElementById('inputLocation') || document.getElementById('search-input');
          if (input) {
            input.value = data.display_name.split(',').slice(0, 4).join(',');
          }

          // Extract District / City / County name
          const addr = data.address || {};
          const districtName = addr.state_district || addr.district || addr.county || addr.city || addr.town || addr.state || 'Kolkata';

          // Update district 10-year weather telemetry & ward heatmap
          if (typeof updateDistrictWeather === 'function') {
            updateDistrictWeather(lat, lng, districtName);
          }
        }
      })
      .catch(() => {
        if (typeof updateDistrictWeather === 'function') {
          updateDistrictWeather(lat, lng);
        }
      });
  }
}

// Global Singleton Instance
window.ojasMap = new OJASMapController();
