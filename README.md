# OJAS

**AI-assisted satellite analysis for personalized rooftop solar potential and recommendations.**

[Live MVP](https://debanik07.github.io/SIH-hackathon-repo/)
</div>

OJAS is an India-first solar assessment platform that solves the biggest bottleneck to PM Surya Ghar adoption: no existing tool tells a homeowner if their roof *actually* qualifies. It combines AI rooftop detection, structural safety checks, and real physics-based energy modeling into one closed-loop system — from satellite scan to installer handoff.

- 🛰️ **AI Rooftop Detection** — YOLOv8 segmentation on OpenStreetMap satellite imagery to measure usable roof area.
- 🛡️ **Structural Safety First** — Checks wind load (IS 875) and structural risk (IS 456) before any recommendation.
- ☀️ **Real Energy Modeling** — pvlib-powered estimates using 10 years of historical weather data (not flat national averages).
- 💰 **Automated Subsidies** — End-to-end calculator for PM Surya Ghar and state schemes, no manual paperwork.
- 📷 **Live Terrace Scan** — Browser camera tool (`getUserMedia`) that verifies roof material, shading, tilt, and orientation in real time.
- 🌏 **Multilingual & Inclusive** — English, Hindi, Bengali + more, built for both urban and rural users.
- 🤝 **Closed Loop** — Direct handoff to verified vendors, turning an estimate into an actionable installation lead.

**Stack:** FastAPI · YOLOv8 · OpenStreetMap · pvlib · IS 875/456 · HTML5 Canvas + getUserMedia
