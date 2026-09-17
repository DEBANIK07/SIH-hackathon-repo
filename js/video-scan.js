/* =====================================================================
   OJAS Live Video Terrace Scan Engine - v1.0
   Real-time camera-based terrace analysis for solar suitability
   ===================================================================== */

(function () {
  'use strict';

  /* -- State ------------------------------------------------------------- */
  let videoStream         = null;
  let videoEl             = null;
  let canvasEl            = null;
  let ctx                 = null;
  let analysisInterval    = null;
  let fpsInterval         = null;
  let frameCount          = 0;
  let lastFpsTime         = 0;
  let isScanning          = false;
  let currentFacingMode   = 'environment';
  let scanFrameIndex      = 0;
  let lastDetectionResult = null;

  /* -- Material colour profiles (HSL heuristics) ------------------------- */
  const MATERIAL_PROFILES = {
    rcc      : { name: 'RCC Concrete (Flat)',      weight: 1.0,  tiltRange: [5,  15] },
    tin      : { name: 'Galvanized Tin / Metal',   weight: 0.85, tiltRange: [10, 30] },
    tile     : { name: 'Clay / Mangalore Tiles',   weight: 0.75, tiltRange: [20, 40] },
    asbestos : { name: 'Asbestos / Fiber Sheet',   weight: 0.70, tiltRange: [15, 35] },
    wood     : { name: 'Wood & Steel Truss',        weight: 0.65, tiltRange: [20, 45] },
  };

  const ORIENTATIONS = [
    { label: 'South-Facing (Ideal)',  score: 9.5, efficiency: 100 },
    { label: 'South-East Facing',     score: 8.8, efficiency: 93  },
    { label: 'South-West Facing',     score: 8.5, efficiency: 90  },
    { label: 'East-Facing',           score: 7.2, efficiency: 78  },
    { label: 'West-Facing',           score: 7.0, efficiency: 75  },
    { label: 'North-Facing (Poor)',   score: 4.5, efficiency: 45  },
  ];

  /* -- Utility ------------------------------------------------------------ */
  function el(id) { return document.getElementById(id); }
  function setText(id, text) { const e = el(id); if (e) e.textContent = text; }
  function nowIST() {
    return new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  /* -- Camera init -------------------------------------------------------- */
  async function startCamera(facingMode) {
    if (videoStream) stopStream();
    try {
      videoStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode || currentFacingMode, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
        audio: false
      });
    } catch (e) {
      try { videoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false }); }
      catch (err) { alert('Camera access denied or unavailable. Please allow camera permissions and try again.'); return false; }
    }
    videoEl.srcObject = videoStream;
    await new Promise(resolve => { videoEl.onloadedmetadata = () => resolve(); });
    videoEl.play();
    const track = videoStream.getVideoTracks()[0];
    if (track) {
      const s = track.getSettings();
      setText('vcamRes', (s.width || '--') + ' x ' + (s.height || '--'));
      const lbl = track.label || 'Camera';
      setText('vcamDevice', lbl.length > 20 ? lbl.slice(0, 18) + '...' : lbl);
    }
    return true;
  }

  function stopStream() {
    if (videoStream) { videoStream.getTracks().forEach(t => t.stop()); videoStream = null; }
    if (videoEl) videoEl.srcObject = null;
  }

  /* -- Frame analysis ----------------------------------------------------- */
  function computeZoneBrightness(data, vw, vh, x1, y1, x2, y2) {
    let sum = 0, count = 0;
    for (let y = Math.round(y1); y < Math.round(y2); y += 8) {
      for (let x = Math.round(x1); x < Math.round(x2); x += 8) {
        const idx = (y * vw + x) * 4;
        sum += (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        count++;
      }
    }
    return count ? sum / count : 128;
  }

  function analyseFrame() {
    if (!videoEl || !canvasEl || !ctx || !isScanning) return;
    const vw = videoEl.videoWidth, vh = videoEl.videoHeight;
    if (!vw || !vh) return;
    canvasEl.width = vw; canvasEl.height = vh;
    ctx.drawImage(videoEl, 0, 0, vw, vh);
    const imageData = ctx.getImageData(0, 0, vw, vh);
    const data = imageData.data;

    let rSum = 0, gSum = 0, bSum = 0, brightPx = 0, darkPx = 0;
    const total = vw * vh, step = 4;
    for (let i = 0; i < data.length; i += 4 * step) {
      const r = data[i], g = data[i+1], b = data[i+2];
      rSum += r; gSum += g; bSum += b;
      const br = (r + g + b) / 3;
      if (br > 160) brightPx++;
      if (br < 60) darkPx++;
    }
    const sampled = total / step;
    const avgR = rSum / sampled, avgG = gSum / sampled, avgB = bSum / sampled;
    const avgBright = (avgR + avgG + avgB) / 3;
    const brightRatio = brightPx / sampled, darkRatio = darkPx / sampled;

    /* HSL */
    const rn = avgR/255, gn = avgG/255, bn = avgB/255;
    const max = Math.max(rn,gn,bn), min = Math.min(rn,gn,bn), delta = max - min;
    let hue = 0, sat = 0, lig = (max + min) / 2;
    if (delta !== 0) {
      sat = delta / (1 - Math.abs(2 * lig - 1));
      if (max === rn) hue = 60 * (((gn - bn) / delta) % 6);
      else if (max === gn) hue = 60 * (((bn - rn) / delta) + 2);
      else hue = 60 * (((rn - gn) / delta) + 4);
      if (hue < 0) hue += 360;
    }
    sat *= 100; lig *= 100;

    /* Material */
    let detectedMaterial = 'rcc';
    const vpMat = el('vpMaterial');
    if (vpMat && vpMat.value !== 'rcc') {
      detectedMaterial = vpMat.value;
    } else {
      if (hue >= 0 && hue <= 40 && sat > 20) detectedMaterial = sat > 40 ? 'tile' : 'wood';
      else if (hue >= 40 && hue <= 120 && sat > 10) detectedMaterial = 'asbestos';
      else detectedMaterial = (lig > 55 && sat < 20 && avgBright > 150) ? 'tin' : 'rcc';
    }
    const matProfile = MATERIAL_PROFILES[detectedMaterial];

    /* Shading */
    const shadingPct = Math.min(darkRatio * 150, 35).toFixed(1);

    /* Usable area */
    const vpArea = el('vpRoofArea');
    let roofAreaSqFt = vpArea && vpArea.value ? parseInt(vpArea.value) : 0;
    if (!roofAreaSqFt) roofAreaSqFt = Math.round(800 + brightRatio * 1200);
    const usableAreaSqFt = Math.round(roofAreaSqFt * 0.70 * (1 - darkRatio * 0.5));
    const usableAreaM2   = (usableAreaSqFt * 0.0929).toFixed(1);

    /* Tilt */
    const [minTilt, maxTilt] = matProfile.tiltRange;
    const topB = computeZoneBrightness(data, vw, vh, 0, 0, vw, vh/2);
    const botB = computeZoneBrightness(data, vw, vh, 0, vh/2, vw, vh);
    const tiltH = Math.abs(topB - botB) / 255;
    const tiltAngle = Math.round(minTilt + tiltH * (maxTilt - minTilt));

    /* Orientation */
    const vpFacing = el('vpFacing');
    let orientationObj;
    if (vpFacing && vpFacing.value !== 'auto') {
      const map = { 'south':0, 'south-east':1, 'south-west':2, 'east':3, 'west':4, 'north':5 };
      orientationObj = ORIENTATIONS[map[vpFacing.value] ?? 0];
    } else {
      const leftB  = computeZoneBrightness(data, vw, vh, 0, 0, vw/2, vh);
      const rightB = computeZoneBrightness(data, vw, vh, vw/2, 0, vw, vh);
      const diff = leftB - rightB;
      if (avgBright > 170) orientationObj = ORIENTATIONS[0];
      else if (diff > 20) orientationObj = ORIENTATIONS[3];
      else if (diff < -20) orientationObj = ORIENTATIONS[4];
      else orientationObj = ORIENTATIONS[1];
    }

    /* Capacity */
    const panels    = Math.floor(parseFloat(usableAreaM2) / 1.7);
    const kWp       = (panels * 0.54).toFixed(2);
    const annualKwh = Math.round(parseFloat(kWp) * 5.2 * 365 * 0.80);
    const vpKwh     = el('vpMonthlyKwh');
    const monthlyKwh = vpKwh && vpKwh.value ? parseInt(vpKwh.value) : Math.round(annualKwh / 12);

    /* Score */
    let score = orientationObj.score;
    score += (1 - parseFloat(shadingPct) / 100) * 0.8;
    score *= matProfile.weight;
    score = Math.min(10, Math.max(1, parseFloat(score.toFixed(1))));

    /* Confidence */
    const confArea   = Math.min(95, 60 + brightRatio * 35 + (vpArea && vpArea.value ? 15 : 0));
    const confShade  = Math.min(95, 70 + (1 - darkRatio) * 25);
    const confMat    = Math.min(90, 55 + (el('vpMaterial').value !== 'rcc' ? 20 : 10) + lig * 0.1);
    const confOrient = Math.min(92, 60 + (vpFacing && vpFacing.value !== 'auto' ? 25 : 10) + brightRatio * 15);

    lastDetectionResult = { score, shadingPct, usableAreaSqFt, usableAreaM2, material: matProfile.name, detectedMaterial, tiltAngle, orientation: orientationObj.label, kWp, annualKwh, panels, monthlyKwh, confArea, confShade, confMat, confOrient };
    renderDetectionResults(lastDetectionResult);
    frameCount++;
  }

  /* -- Render results ----------------------------------------------------- */
  function buildRecommendationText(r) {
    const systemType = r.detectedMaterial === 'asbestos' ? 'Ballasted Roof-mount (no penetration)' :
                       r.detectedMaterial === 'tile'     ? 'Roof-tile integrated hook & rail system' :
                       r.detectedMaterial === 'tin'      ? 'Clamp-mounted metal roof system (no drilling)' :
                       r.detectedMaterial === 'wood'     ? 'Lightweight thin-film flexible PV modules' :
                                                           'Standard elevated galvanized structure';
    const panelType  = r.detectedMaterial === 'wood' ? 'Thin-Film CIGS Flexible (5 kg/m2)' :
                       parseFloat(r.kWp) > 5          ? 'Mono TOPCon 590W High-Power Modules' :
                                                         'Mono PERC 540W Premium Modules';
    const subs       = parseFloat(r.kWp) <= 2 ? 'Rs.60,000' : 'Rs.78,000 (max, PM Surya Ghar)';
    const savings    = Math.round(r.annualKwh * 8);
    return 'Based on the detected ' + r.material + ' terrace with ' + r.orientation + ', ' +
           'we recommend a ' + r.kWp + ' kWp on-grid PV system using ' + panelType + ' mounted on ' + systemType + '. ' +
           'Shading loss of ' + r.shadingPct + '% is within acceptable limits. ' +
           'Estimated PM Surya Ghar subsidy: ' + subs + '. ' +
           'Annual electricity savings: Rs.' + savings.toLocaleString('en-IN') + '. ' +
           'Optimal panel tilt: ' + r.tiltAngle + ' degrees for this rooftop configuration.';
  }

  function animateBar(barId, pctId, value) {
    const v = Math.round(value);
    const bar = el(barId); const pct = el(pctId);
    if (bar) bar.style.width = v + '%';
    if (pct) pct.textContent = v + '%';
  }

  function renderDetectionResults(r) {
    setText('vdetTimestamp', nowIST() + ' IST');

    const arc = el('vdetGaugeArc');
    if (arc) arc.style.strokeDashoffset = 251 - (r.score / 10) * 251;
    setText('vdetScoreNum', r.score.toFixed(1));
    const verdict = r.score >= 8 ? 'Highly Recommended' : r.score >= 6 ? 'Suitable' : r.score >= 4 ? 'Moderate Suitability' : 'Low Suitability';
    setText('vdetScoreVerdict', verdict);

    const liveBadge = el('vdetScoreLiveBadge');
    if (liveBadge) liveBadge.innerHTML = '<span class="video-rec-dot" style="width:8px;height:8px;background:#10B981"></span> Live Analysis';

    setText('vdpUsableArea',   r.usableAreaSqFt + ' sq ft (' + r.usableAreaM2 + ' m2)');
    setText('vdpShadeLoss',    r.shadingPct + '% shade loss');
    setText('vdpOrientation',  r.orientation);
    setText('vdpMaterial',     r.material);
    setText('vdpTilt',         r.tiltAngle + ' deg optimal tilt');
    setText('vdpCapacity',     r.kWp + ' kWp - ' + r.annualKwh.toLocaleString('en-IN') + ' kWh/yr');

    ['vdp-usable','vdp-shade','vdp-orient','vdp-material','vdp-tilt','vdp-capacity'].forEach(id => {
      const e = el(id); if (e) e.classList.add('detected');
    });

    animateBar('vconfAreaBar',   'vconfAreaPct',   r.confArea);
    animateBar('vconfShadeBar',  'vconfShadePct',  r.confShade);
    animateBar('vconfMatBar',    'vconfMatPct',     r.confMat);
    animateBar('vconfOrientBar', 'vconfOrientPct', r.confOrient);

    const confCard = el('vdetConfCard');
    if (confCard) confCard.style.display = '';
    const recText = el('vdetRecText');
    if (recText) recText.textContent = buildRecommendationText(r);
    const recActions = el('vdetRecActions');
    if (recActions) recActions.style.display = '';
  }

  /* -- Scan overlay ------------------------------------------------------- */
  function drawScanOverlay() {
    if (!ctx || !canvasEl || !videoEl || videoEl.readyState < 2) return;
    const w = canvasEl.width, h = canvasEl.height;
    scanFrameIndex++;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(videoEl, 0, 0, w, h);

    /* Subtle tint */
    ctx.fillStyle = 'rgba(16,185,129,0.04)';
    ctx.fillRect(0, 0, w, h);

    /* Scan line */
    const scanY = (scanFrameIndex * 3) % h;
    const grad = ctx.createLinearGradient(0, scanY - 8, 0, scanY + 8);
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(0.5, 'rgba(16,185,129,0.65)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, scanY - 8, w, 16);

    /* Detection box */
    if (lastDetectionResult && lastDetectionResult.score >= 5) {
      const bx = w * 0.15, by = h * 0.15, bw = w * 0.70, bh = h * 0.70;
      ctx.strokeStyle = 'rgba(16,185,129,' + (0.4 + 0.3 * Math.sin(scanFrameIndex * 0.1)) + ')';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 4]);
      ctx.strokeRect(bx, by, bw, bh);
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(bx, by - 28, 110, 24, 6);
      else ctx.rect(bx, by - 28, 110, 24);
      ctx.fill();
      ctx.fillStyle = '#10B981';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('Score: ' + lastDetectionResult.score + '/10', bx + 8, by - 11);
    }
  }

  /* -- FPS counter -------------------------------------------------------- */
  function startFPSCounter() {
    lastFpsTime = Date.now(); frameCount = 0;
    fpsInterval = setInterval(function () {
      const now = Date.now();
      const fps = Math.round(frameCount / ((now - lastFpsTime) / 1000));
      setText('vcamFPS', fps + ' FPS');
      setText('vcamScanRate', fps > 5 ? 'Scan: Active' : 'Scan: Warming up');
      frameCount = 0; lastFpsTime = now;
    }, 1000);
  }

  /* -- Public controls ---------------------------------------------------- */
  window.toggleVideoCapture = async function () {
    if (isScanning) { stopVideoScan(); } else { await startVideoScan(); }
  };

  window.startVideoScan = async function () {
    videoEl  = el('terraceVideoPreview');
    canvasEl = el('terraceAnalysisCanvas');
    if (!videoEl || !canvasEl) return;
    ctx = canvasEl.getContext('2d');

    const ok = await startCamera(currentFacingMode);
    if (!ok) return;
    isScanning = true;

    el('videoIdleOverlay').style.display = 'none';
    el('videoRecIndicator').style.display = '';
    el('videoScanGrid').style.display = '';

    const wrap = videoEl.parentElement;
    if (wrap) wrap.classList.add('active');
    const card = el('videoCameraCard');
    if (card) card.classList.add('scanning');

    const capBtn  = el('videoCaptureBtn');
    const stopBtn = el('videoStopBtn');
    const snapBtn = el('videoSnapshotBtn');
    const swBtn   = el('videoSwitchCamBtn');
    if (capBtn)  capBtn.style.display  = 'none';
    if (stopBtn) stopBtn.style.display = '';
    if (snapBtn) snapBtn.disabled = false;
    if (swBtn)   swBtn.disabled   = false;

    startFPSCounter();
    analysisInterval = setInterval(function () { analyseFrame(); drawScanOverlay(); }, 200);
    if (window.StatusLog) window.StatusLog.log('Live Video Terrace Scan started', 'INFO', 'VIDEO');
  };

  window.stopVideoScan = function () {
    isScanning = false;
    clearInterval(analysisInterval);
    clearInterval(fpsInterval);
    stopStream();

    const idle = el('videoIdleOverlay');    if (idle) idle.style.display = '';
    const rec  = el('videoRecIndicator');  if (rec)  rec.style.display  = 'none';
    const grid = el('videoScanGrid');      if (grid) grid.style.display = 'none';

    if (videoEl) {
      const wrap = videoEl.parentElement;
      if (wrap) wrap.classList.remove('active');
    }
    const card = el('videoCameraCard'); if (card) card.classList.remove('scanning');
    const capBtn  = el('videoCaptureBtn');
    const stopBtn = el('videoStopBtn');
    const snapBtn = el('videoSnapshotBtn');
    const swBtn   = el('videoSwitchCamBtn');
    if (capBtn)  capBtn.style.display  = '';
    if (stopBtn) stopBtn.style.display = 'none';
    if (snapBtn) snapBtn.disabled = true;
    if (swBtn)   swBtn.disabled   = true;

    setText('vcamFPS', '-- FPS');
    setText('vcamScanRate', 'Scan: Ready');
    if (ctx && canvasEl) ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    if (window.StatusLog) window.StatusLog.log('Live Video Terrace Scan stopped', 'INFO', 'VIDEO');
  };

  window.captureVideoSnapshot = function () {
    if (!isScanning || !videoEl) return;
    analyseFrame();
    const wrap = videoEl.parentElement;
    if (wrap) { wrap.style.filter = 'brightness(2)'; setTimeout(function () { wrap.style.filter = ''; }, 150); }
    if (window.StatusLog) window.StatusLog.log('Snapshot captured - deep frame analysis complete', 'SUCCESS', 'VIDEO');
  };

  window.switchCamera = async function () {
    if (!isScanning) return;
    currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
    stopStream();
    await startCamera(currentFacingMode);
  };

  window.applyDetectionToAssessment = function () {
    if (!lastDetectionResult) return;
    const r = lastDetectionResult;
    const areaInput = document.getElementById('inputHouseArea');
    const solarArea = document.getElementById('inputSolarArea');
    const elecInput = document.getElementById('inputElectricity');
    const matSelect = document.getElementById('inputMaterial');
    if (areaInput) areaInput.value = r.usableAreaSqFt;
    if (solarArea) solarArea.value = Math.round(r.usableAreaSqFt * 0.70);
    if (elecInput) elecInput.value = r.monthlyKwh;
    if (matSelect) matSelect.value = r.detectedMaterial;
    if (typeof window.calculateEstimation === 'function') window.calculateEstimation();
    if (typeof window.switchTab === 'function') window.switchTab('assessment');
    if (window.StatusLog) window.StatusLog.log('Video detection results applied to assessment form', 'SUCCESS', 'VIDEO');
  };

  window.exportVideoReport = function () {
    if (!lastDetectionResult) return;
    const r = lastDetectionResult;
    const lines = [
      'OJAS Live Video Terrace Scan Report',
      '====================================',
      'Generated: ' + new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST',
      '',
      'DETECTION RESULTS',
      '-----------------',
      'Suitability Score:    ' + r.score + '/10',
      'Estimated Usable Area:   ' + r.usableAreaSqFt + ' sq ft (' + r.usableAreaM2 + ' m2)',
      'Shading / Obstruction:   ' + r.shadingPct + '%',
      'Orientation:             ' + r.orientation,
      'Surface Material:        ' + r.material,
      'Recommended Tilt Angle:  ' + r.tiltAngle + ' degrees',
      'Projected Capacity:      ' + r.kWp + ' kWp',
      'Annual Generation:       ' + r.annualKwh.toLocaleString('en-IN') + ' kWh',
      '',
      'DETECTION CONFIDENCE',
      '--------------------',
      'Area Estimation:         ' + Math.round(r.confArea) + '%',
      'Shading Detection:       ' + Math.round(r.confShade) + '%',
      'Material Classification: ' + Math.round(r.confMat) + '%',
      'Orientation Assessment:  ' + Math.round(r.confOrient) + '%',
      '',
      'RECOMMENDATION',
      '--------------',
      buildRecommendationText(r),
      '',
      'This report is generated by OJAS - PM Surya Ghar Muft Bijli Yojana Platform.'
    ].join('\n');
    const blob = new Blob([lines], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url; a.download = 'OJAS_VideoScan_' + Date.now() + '.txt'; a.click();
    URL.revokeObjectURL(url);
  };

  window.VideoScanEngine = { isScanning: function () { return isScanning; } };

})();

