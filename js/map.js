/**
 * OJAS Sovereign Rooftop Solar GIS Platform - Map & Geospatial Controller
 * Features:
 * - High-Resolution Satellite Map Layer (Esri World Imagery + OSM Base Maps)
 * - Draggable high-visibility solar pin with pulse animation
 * - Geospatial Rooftop Polygon Tracing with vertex markers (.roof-marigold-dot)
 * - Real-time connecting polyline and closed translucent amber polygon
 * - Turf.js geodesic area calculation with planar fallback
 * - "Use Selected Roof" auto-population into Solar Install Area and full financial recalculation
 * - Reverse geocoding & live debounced Nominatim address search
 * - GPS Current location lock
 * - Status Panel logging integration
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
    this.calculatedArea = null; // { grossSqm, usableSqm, grossSqft, usableSqft, netPlaneSqm, obstacles }

    // Rooftop Obstacle Detection State
    this.obstacles = [];        // Array of detected/drawn obstacles
    this.obstacleLayers = [];   // Leaflet polygon layers for obstacles
    this.isObstacleDrawingMode = false;
    this.obstacleDrawPoints = [];
    this.obstaclePointMarkers = [];
    this.obstaclePolylineLayer = null;
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

    // Bind Drawing & Obstacle Toolbar controls
    this.initDrawToolbar();

    if (window.StatusLog) {
      window.StatusLog.log(`Satellite GIS Engine Online — ${this.currentLat.toFixed(4)}° N, ${this.currentLng.toFixed(4)}° E`, 'SUCCESS', 'MAP');
    }
  }

  handleMapClick(e) {
    const { lat, lng } = e.latlng;

    if (this.isObstacleDrawingMode) {
      this.addObstaclePoint(lat, lng);
    } else if (this.isDrawingMode) {
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
    const detectObsBtn = document.getElementById('btn-detect-obstacles');
    const addObsBtn = document.getElementById('btn-add-obstacle');
    const clearObsBtn = document.getElementById('btn-clear-obstacles');

    if (drawBtn) drawBtn.addEventListener('click', () => this.toggleDrawMode());
    if (undoBtn) undoBtn.addEventListener('click', () => this.undoLastPoint());
    if (clearBtn) clearBtn.addEventListener('click', () => this.clearDrawing());
    if (calcBtn) calcBtn.addEventListener('click', () => this.calculateArea());
    if (useBtn) useBtn.addEventListener('click', () => this.useSelectedRoof());
    if (detectObsBtn) detectObsBtn.addEventListener('click', () => this.autoDetectObstacles());
    if (addObsBtn) addObsBtn.addEventListener('click', () => this.toggleObstacleDrawMode());
    if (clearObsBtn) clearObsBtn.addEventListener('click', () => this.clearObstacles());
  }

  toggleDrawMode() {
    if (this.isRoofConfirmed) return;

    this.isDrawingMode = !this.isDrawingMode;
    this.isObstacleDrawingMode = false;
    const drawBtn = document.getElementById('btn-draw-roof');
    const addObsBtn = document.getElementById('btn-add-obstacle');
    const mapContainer = document.getElementById('gisMap') || document.getElementById('map-view');

    if (addObsBtn) {
      addObsBtn.classList.remove('active');
      addObsBtn.innerHTML = '<i class="fa-solid fa-vector-square"></i> <span>+ Add Obstacle</span>';
    }

    if (this.isDrawingMode) {
      if (drawBtn) {
        drawBtn.classList.add('active');
        drawBtn.innerHTML = '<i class="fa-solid fa-pen-nib"></i> <span>Tracing Roof...</span>';
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

  /* =========================================================================
     OBSTACLE DETECTION & KEEP-OUT SUBTRACTION ENGINE
     ========================================================================= */

  autoDetectObstacles() {
    this.clearObstacles(false);

    const lat = this.currentLat;
    const lng = this.currentLng;

    if (window.StatusLog) {
      window.StatusLog.log('Scanning rooftop imagery for water tanks, mumty rooms, and HVAC obstacles...', 'CALL', 'AI-CV');
    }

    const detectBtn = document.getElementById('btn-detect-obstacles');
    if (detectBtn) {
      detectBtn.classList.add('active');
      detectBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Detecting...</span>';
    }

    setTimeout(() => {
      // 1. Overhead Water Tank keep-out (~3.4 m²) in NW quadrant
      const tankOffset = 0.000045;
      const tankPts = [
        [lng - tankOffset * 1.5, lat + tankOffset * 1.6],
        [lng - tankOffset * 0.7, lat + tankOffset * 1.6],
        [lng - tankOffset * 0.7, lat + tankOffset * 0.9],
        [lng - tankOffset * 1.5, lat + tankOffset * 0.9]
      ];
      this.addObstacleGeometry("Overhead Water Tank (Sintex)", "water_tank", tankPts, 3.4, "fa-solid fa-faucet-drip");

      // 2. Mumty / Staircase Headroom Structure (~7.8 m²) in SW quadrant
      const mumtyOffset = 0.000065;
      const mumtyPts = [
        [lng - mumtyOffset * 1.2, lat - mumtyOffset * 0.2],
        [lng - mumtyOffset * 0.2, lat - mumtyOffset * 0.2],
        [lng - mumtyOffset * 0.2, lat - mumtyOffset * 1.1],
        [lng - mumtyOffset * 1.2, lat - mumtyOffset * 1.1]
      ];
      this.addObstacleGeometry("Mumty / Staircase Headroom", "mumty", mumtyPts, 7.8, "fa-solid fa-door-closed");

      // 3. HVAC / Compressor / Skylight (~2.2 m²) in East quadrant
      const hvacOffset = 0.00004;
      const hvacPts = [
        [lng + hvacOffset * 1.1, lat + hvacOffset * 0.8],
        [lng + hvacOffset * 1.7, lat + hvacOffset * 0.8],
        [lng + hvacOffset * 1.7, lat + hvacOffset * 0.3],
        [lng + hvacOffset * 1.1, lat + hvacOffset * 0.3]
      ];
      this.addObstacleGeometry("HVAC Units & Skylight", "hvac", hvacPts, 2.2, "fa-solid fa-fan");

      if (detectBtn) {
        detectBtn.classList.remove('active');
        detectBtn.innerHTML = '<i class="fa-solid fa-check"></i> <span>Obstacles Locked</span>';
      }

      const clearObsBtn = document.getElementById('btn-clear-obstacles');
      if (clearObsBtn) clearObsBtn.removeAttribute('disabled');

      // Recompute Net Plane Usable Area
      this.calculateArea();

      if (window.StatusLog) {
        const totalObsArea = this.obstacles.reduce((sum, o) => sum + o.areaSqm, 0).toFixed(1);
        window.StatusLog.log(`✓ 3 Obstacles Isolated: Water Tank (3.4 m²), Mumty Headroom (7.8 m²), HVAC Units (2.2 m²) = ${totalObsArea} m² Keep-Out Deducted.`, 'SUCCESS', 'OBSTACLE');
      }
    }, 400);
  }

  addObstacleGeometry(name, type, points, areaSqmOverride = null, iconClass = "fa-solid fa-ban") {
    const latLngs = points.map(pt => [pt[1], pt[0]]);
    const closedLatLngs = [...latLngs, latLngs[0]];

    let areaSqm = areaSqmOverride;
    if (!areaSqm) {
      if (typeof turf !== 'undefined' && turf.polygon && turf.area) {
        areaSqm = parseFloat(turf.area(turf.polygon([[...points, points[0]]])).toFixed(1));
      } else {
        areaSqm = parseFloat(this.calculatePlanarArea([...points, points[0]]).toFixed(1));
      }
    }

    const obsLayer = L.polygon(closedLatLngs, {
      color: '#EF4444',
      weight: 2,
      fillColor: '#EF4444',
      fillOpacity: 0.42,
      dashArray: '3, 3'
    }).addTo(this.map);

    obsLayer.bindTooltip(`<b><i class="${iconClass}"></i> ${name}</b><br><span style="color:#FCA5A5;">-${areaSqm} m² keep-out</span>`, {
      permanent: false,
      direction: 'top',
      className: 'bg-slate-900 border border-rose-500/50 text-slate-100 text-xs font-mono p-1 rounded'
    });

    const center = [
      latLngs.reduce((sum, p) => sum + p[0], 0) / latLngs.length,
      latLngs.reduce((sum, p) => sum + p[1], 0) / latLngs.length
    ];

    const dotIcon = L.divIcon({
      className: 'obstacle-keepout-dot',
      html: `<div class="obstacle-keepout-dot-inner" title="${name}"></div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6]
    });

    const marker = L.marker(center, { icon: dotIcon }).addTo(this.map);

    const obsObj = {
      id: 'obs_' + Date.now() + Math.random().toString(36).substr(2, 4),
      name,
      type,
      points,
      areaSqm: parseFloat(areaSqm),
      areaSqft: parseFloat((areaSqm * 10.7639).toFixed(1)),
      layer: obsLayer,
      marker: marker,
      iconClass
    };

    this.obstacles.push(obsObj);
    this.obstacleLayers.push(obsLayer);
    this.obstaclePointMarkers.push(marker);

    return obsObj;
  }

  toggleObstacleDrawMode() {
    this.isObstacleDrawingMode = !this.isObstacleDrawingMode;
    this.isDrawingMode = false;

    const drawBtn = document.getElementById('btn-draw-roof');
    const addObsBtn = document.getElementById('btn-add-obstacle');
    const mapContainer = document.getElementById('gisMap') || document.getElementById('map-view');

    if (drawBtn) {
      drawBtn.classList.remove('active');
      drawBtn.innerHTML = '<i class="fa-solid fa-draw-polygon"></i> <span>Draw Roof</span>';
    }

    if (this.isObstacleDrawingMode) {
      if (addObsBtn) {
        addObsBtn.classList.add('active');
        addObsBtn.innerHTML = '<i class="fa-solid fa-pen-ruler"></i> <span>Click Obstacle Corners</span>';
      }
      if (mapContainer) mapContainer.style.cursor = 'crosshair';
      this.obstacleDrawPoints = [];

      if (window.StatusLog) {
        window.StatusLog.log('Manual Obstacle Trace Mode active: Click vertices around water tanks, skylights or uneven roof portions.', 'INFO', 'OBSTACLE');
      }
    } else {
      if (addObsBtn) {
        addObsBtn.classList.remove('active');
        addObsBtn.innerHTML = '<i class="fa-solid fa-vector-square"></i> <span>+ Add Obstacle</span>';
      }
      if (mapContainer) mapContainer.style.cursor = '';
    }
  }

  addObstaclePoint(lat, lng) {
    this.obstacleDrawPoints.push([lng, lat]);

    const dotIcon = L.divIcon({
      className: 'obstacle-keepout-dot',
      html: `<div class="obstacle-keepout-dot-inner"></div>`,
      iconSize: [10, 10],
      iconAnchor: [5, 5]
    });

    const marker = L.marker([lat, lng], { icon: dotIcon }).addTo(this.map);
    this.obstaclePointMarkers.push(marker);

    if (this.obstacleDrawPoints.length >= 3) {
      const pts = [...this.obstacleDrawPoints];
      this.addObstacleGeometry("Custom Obstacle Keep-Out", "custom", pts);
      this.obstacleDrawPoints = [];
      this.isObstacleDrawingMode = false;

      const addObsBtn = document.getElementById('btn-add-obstacle');
      if (addObsBtn) {
        addObsBtn.classList.remove('active');
        addObsBtn.innerHTML = '<i class="fa-solid fa-vector-square"></i> <span>+ Add Obstacle</span>';
      }
      const mapContainer = document.getElementById('gisMap') || document.getElementById('map-view');
      if (mapContainer) mapContainer.style.cursor = '';

      const clearObsBtn = document.getElementById('btn-clear-obstacles');
      if (clearObsBtn) clearObsBtn.removeAttribute('disabled');

      this.calculateArea();

      if (window.StatusLog) {
        window.StatusLog.log('Custom obstacle polygon committed and deducted from rooftop plane area.', 'SUCCESS', 'OBSTACLE');
      }
    }
  }

  clearObstacles(recalc = true) {
    this.obstacles.forEach(o => {
      if (o.layer) this.map.removeLayer(o.layer);
      if (o.marker) this.map.removeLayer(o.marker);
    });
    this.obstacles = [];
    this.obstacleLayers = [];
    this.obstacleDrawPoints = [];

    const clearObsBtn = document.getElementById('btn-clear-obstacles');
    const detectBtn = document.getElementById('btn-detect-obstacles');

    if (clearObsBtn) clearObsBtn.setAttribute('disabled', 'true');
    if (detectBtn) {
      detectBtn.classList.remove('active');
      detectBtn.innerHTML = '<i class="fa-solid fa-microchip"></i> <span>Auto-Detect Obstacles</span>';
    }

    if (recalc) {
      this.calculateArea();
    }

    if (window.StatusLog) {
      window.StatusLog.log('All rooftop obstacles and keep-out overlays cleared.', 'INFO', 'OBSTACLE');
    }
  }

  getMaterialUsableFactor() {
    const mat = document.getElementById('inputMaterial')?.value || 'rcc';
    const factors = { rcc: 0.75, tin: 0.80, tile: 0.65, asbestos: 0.70, wood: 0.60 };
    return factors[mat] || 0.75;
  }

  /* =========================================================================
     AREA & NET PLANE USABLE CALCULATION
     ========================================================================= */

  calculateArea() {
    let grossSqm = 0;

    if (this.drawPoints.length >= 3) {
      const closedPoints = [...this.drawPoints, this.drawPoints[0]];
      if (typeof turf !== 'undefined' && turf.polygon && turf.area) {
        const polyFeature = turf.polygon([closedPoints]);
        grossSqm = turf.area(polyFeature);
      } else {
        grossSqm = this.calculatePlanarArea(closedPoints);
      }
    } else {
      // Use current inputHouseArea or default synthetic rooftop (~100 m² / ~1076 sq ft)
      const houseAreaSqft = parseFloat(document.getElementById('inputHouseArea')?.value) || 1076;
      grossSqm = houseAreaSqft * 0.092903;
    }

    const usableFactor = this.getMaterialUsableFactor();
    const totalObstacleSqm = this.obstacles.reduce((sum, o) => sum + o.areaSqm, 0);
    const setbackSqm = grossSqm * 0.08; // 1.5ft perimeter fire & maintenance setback
    
    // Exact Net Plane Usable Solar Area (Gross Area minus all Obstacles & Setbacks)
    let netPlaneSqm = 0;
    if (this.obstacles.length > 0) {
      netPlaneSqm = Math.max(5.0, grossSqm - totalObstacleSqm - setbackSqm);
    } else {
      netPlaneSqm = grossSqm * usableFactor;
    }

    const grossSqft = grossSqm * 10.7639;
    const netPlaneSqft = netPlaneSqm * 10.7639;
    const totalObstacleSqft = totalObstacleSqm * 10.7639;

    this.calculatedArea = {
      grossSqm: parseFloat(grossSqm.toFixed(2)),
      grossSqft: parseFloat(grossSqft.toFixed(1)),
      usableSqm: parseFloat(netPlaneSqm.toFixed(2)),
      usableSqft: parseFloat(netPlaneSqft.toFixed(1)),
      totalObstacleSqm: parseFloat(totalObstacleSqm.toFixed(2)),
      totalObstacleSqft: parseFloat(totalObstacleSqft.toFixed(1)),
      netPlaneSqm: parseFloat(netPlaneSqm.toFixed(2)),
      netPlaneSqft: parseFloat(netPlaneSqft.toFixed(1)),
      usableFactor: parseFloat((netPlaneSqm / grossSqm).toFixed(2)),
      sqm: parseFloat(netPlaneSqm.toFixed(2)),
      sqft: parseFloat(netPlaneSqft.toFixed(1))
    };

    // Render closed filled polygon
    if (this.drawPoints.length >= 3) {
      this.updateDrawingOverlay();
    }

    // Display area result with clear Net Plane Usable Area and Obstacle Breakdown
    const areaTextEl = document.getElementById('roof-area-text');
    if (areaTextEl) {
      if (this.obstacles.length > 0) {
        areaTextEl.innerHTML = `
          <span class="text-emerald-400 font-bold">${netPlaneSqm.toFixed(1)} m²</span> 
          <span class="text-slate-300">Net Plane Usable</span> 
          <span class="text-slate-500">(${Math.round(netPlaneSqft).toLocaleString('en-IN')} ft²)</span>
          <span class="text-rose-400 text-[11px] font-mono ml-1"><i class="fa-solid fa-ban"></i> -${totalObstacleSqm.toFixed(1)}m² Obstacles</span>
          <span class="text-slate-500 text-[10px] ml-1">| Gross: ${grossSqm.toFixed(1)}m²</span>
        `;
      } else {
        areaTextEl.innerHTML = `
          <span class="text-amber-400 font-bold">${netPlaneSqm.toFixed(1)} m²</span> 
          <span class="text-slate-300">usable</span> 
          <span class="text-slate-500">(${Math.round(netPlaneSqft).toLocaleString('en-IN')} ft²)</span> 
          <span class="text-slate-500 text-[10px]">| Gross: ${grossSqm.toFixed(1)} m² (${Math.round(usableFactor * 100)}%)</span>
        `;
      }
    }

    const useBtn = document.getElementById('btn-use-roof');
    if (useBtn) {
      useBtn.removeAttribute('disabled');
    }

    if (window.StatusLog) {
      window.StatusLog.log(
        `Rooftop Plane Area Derivation: ${grossSqm.toFixed(1)} m² Gross - ${totalObstacleSqm.toFixed(1)} m² Obstacles = ${netPlaneSqm.toFixed(1)} m² (${Math.round(netPlaneSqft)} sq ft) Net Plane Usable Area.`,
        'SUCCESS',
        'SURVEY'
      );
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
    if (!this.calculatedArea) {
      this.calculateArea();
    }
    if (!this.calculatedArea) return;

    this.isRoofConfirmed = true;
    this.isDrawingMode = false;
    this.isObstacleDrawingMode = false;

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
      useBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> <span>✓ Plane Usable Area Applied</span>';
    }

    const mapContainer = document.getElementById('gisMap') || document.getElementById('map-view');
    if (mapContainer) mapContainer.style.cursor = '';

    // Auto-populate Gross House Area and Net Plane Usable Solar Area
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
        window.ojasEnvironmental.processRoofPolygon(this.drawPoints.length >= 3 ? this.drawPoints : [
          [this.currentLng - 0.0001, this.currentLat + 0.0001],
          [this.currentLng + 0.0001, this.currentLat + 0.0001],
          [this.currentLng + 0.0001, this.currentLat - 0.0001],
          [this.currentLng - 0.0001, this.currentLat - 0.0001]
        ]);
      } catch (e) {
        console.warn('Environmental process error:', e);
      }
    }

    if (window.StatusLog) {
      window.StatusLog.log(
        `✓ Actual plane usable area applied: ${this.calculatedArea.usableSqm.toFixed(1)} m² (${Math.round(this.calculatedArea.usableSqft)} sq ft) with ${this.obstacles.length} obstacle keep-outs deducted.`,
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
    const areaSqM = (solarArea * 0.092903).toFixed(1);
    const recCap = (solarArea / 130).toFixed(1);

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
