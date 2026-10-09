# EcoScan AI — Demonstration Boundaries & Disclosure Log (DEMO_LIMITS.md)

This document catalogs every simulated assumption, placeholder dataset, mathematical estimate, and unverified capability across the EcoScan AI front-end application. 

**Purpose for Judges & Evaluators:** To maintain total operational honesty and prevent any simulated demonstration feature from being misrepresented as certified production hardware during live evaluations or pitches.

---

### 1. Visible Top Layer Only (Optical Occlusion)
- **Status in Demo:** Illustrated on synthetic SVG waste pile.
- **Limitation:** Optical computer vision can only classify items that have direct line-of-sight to the camera lens. Any waste item buried beneath the top surface layer is invisible to surface segmentation.
- **Production Requirement:** Requires physical conveyor agitation, mechanical finger screening, or sequential volumetric multi-camera setups to reveal subsurface layers.
- **UI Disclosure:** Displayed persistently in the header honesty banner, footer bar, and audit reports.

---

### 2. Estimated Weights & Densities (Grams)
- **Status in Demo:** Static item weights (e.g. PET bottle = 25 g, cardboard = 120 g, glass bottle = 350 g) in `mockData.ts`.
- **Limitation:** The current client does not calculate volumetric depth or density variations. A hollow PET bottle and a water-filled PET bottle look identical on top-down 2D RGB optical frames.
- **Production Requirement:** Requires integration with real-time belt weigh-cells, continuous belt scales, or dual-energy X-ray absorptiometry (DEXA) sensors.

---

### 3. Estimated Recoverable Value Ranges (INR)
- **Status in Demo:** Mock scrap market ranges (e.g., Aluminium can = ₹4.0 – ₹6.0, Glass = ₹2.0 – ₹3.0, PET = ₹1.0 – ₹1.5). Summed to ₹11.50 – ₹18.00 INR for the demo batch.
- **Limitation:** Value calculations are illustrative secondary-market benchmarks. They do not track live commodity spot prices, freight costs, or contamination penalties from buyers.
- **Production Requirement:** Live integration with regional scrap yard broker APIs or municipal tender rate cards.

---

### 4. Synthetic Pile Scene (SVG/CSS Only)
- **Status in Demo:** Pure inline SVG vectors with CSS radial gradients, drop shadows, and procedural geometry.
- **Limitation:** Built entirely in code with no external photographs, brand logos, or real camera streaming feeds to ensure zero copyright or privacy violations.
- **Production Requirement:** Direct RTSP/GigE camera video streams or industrial GigE Vision sensors on real MRF belts.

---

### 5. Historical Facility & Multi-Site Trends
- **Status in Demo:** Historical trendpoints (7D, 30D, 90D) for Demo Yard A, Demo Yard B, and Demo Landfill Cell 3 in `mockData.ts`.
- **Limitation:** Generated synthetically to demonstrate Recharts multi-series area, line, and bar charting capabilities.
- **Production Requirement:** Integration with an enterprise time-series database (e.g., PostgreSQL/TimescaleDB, Amazon Timestream).

---

### 6. Robot API Physical Hardware Execution
- **Status in Demo:** Live machine-readable JSON generator producing normalized bounding boxes, contour polygons, and centroid grasp crosshairs (`toRobotJson`).
- **Limitation:** **Output has NOT been tested or validated on physical industrial robot arms or delta sorters.** Suction cup airflow, vacuum pressure, gripper finger clearances, and belt speed synchronization are not calibrated.
- **Production Requirement:** Calibration using robot coordinate transformation matrices (eye-in-hand calibration) and testing on physical delta robot hardware.
- **UI Disclosure:** Displayed prominently on the `/robot-api` workspace page.

---

### 7. EcoBot Canned Assistant & Location Sharing
- **Status in Demo:** Generates structured context-aware answers from active `ScanContext` items.
- **Limitation:**
  - Depot query ("Where is the nearest hazardous depot?") explicitly shows a button stating: `"Location sharing is not connected in this demo"`.
  - EcoScan AI **never outputs real or fabricated addresses, phone numbers, or facility names** to prevent misdirection of hazardous materials.
  - Worker safety directives specify standard precautionary guidance (*"Follow your local hazardous-waste handling rules. Do not compact, crush or puncture."*) and do not replace certified environmental health & safety (EHS) standard operating procedures.

---

### 8. Neural Inference Latency & Framerate Telemetry
- **Status in Demo:** Emulated at 38–50 ms latency and 30 FPS.
- **Limitation:** Simulated via `setTimeout` in `scanService.ts`.
- **Production Requirement:** Actual inference latency depends on edge hardware accelerators (e.g., NVIDIA Jetson Orin, AWS Inferentia) and segmentation resolution.

---

### Summary Checklist for Pitch Presenters
- [x] State that all values and weights are software estimates based on 2D surface imagery.
- [x] Highlight that buried waste requires mechanical turning.
- [x] Acknowledge that Robot API telemetry is an open schema ready for physical robot calibration.
- [x] Clarify that facility trends use illustrative demo history.
- [x] Emphasize that hazardous item alerts prompt manual isolation per local jurisdictional rules.
