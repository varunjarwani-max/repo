# EcoScan AI — Waste Pile Optical Segmentation & Telemetry Dashboard

EcoScan AI photographs a pile of mixed municipal and commercial waste, converting visible surface materials into real-time operational metrics: item counts, material classifications, categorical composition breakdown, secondary market scrap valuation, and hazardous lockout flags.

Built specifically for municipal waste contractors, recycling facilities, and automated MRF (Material Recovery Facility) operators.

---

## Quick Start

### Prerequisites
- Node.js 18+ and npm 9+

### Installation & Development
```bash
# Install dependencies (pinned offline packages, no CDN calls)
npm install

# Start Vite local development server
npm run dev

# Run TypeScript strict type-check
npx tsc --noEmit

# Compile production bundle
npm run build

# Preview production build locally
npm run preview
```

The application runs locally on `http://127.0.0.1:3000` (or `http://localhost:5173`).

---

## Environment Variables

Configure optional environment variables in `.env` (refer to `.env.example`):

```bash
# Optional backend API base URL (e.g., http://localhost:8000/api)
# When unset or unreachable, EcoScan AI automatically falls back to verified demo data.
VITE_API_URL=
```

---

## Architecture & Project Structure

```text
AWS-Phase-2/
├── docs/
│   └── DESIGN_SPEC.md          # Complete design and interaction specification
├── public/
│   ├── _redirects              # SPA rewrite rule for Cloudflare/Netlify/Vercel
│   └── favicon.svg             # EcoScan AI emerald brand logo
├── src/
│   ├── components/             # Reusable UI components (PascalCase, 1 component per file)
│   │   ├── BoundingBox.tsx     # Viewfinder SVG boxes, tags, polygons, and grasp targets
│   │   ├── ChatBubble.tsx      # EcoBot chat message bubbles, source chips & mini cards
│   │   ├── CompositionChart.tsx# Donut & stacked bar mass and count breakdown
│   │   ├── ControlBar.tsx      # Camera controls, confidence slider, mask toggles
│   │   ├── EcoBotDrawer.tsx    # Responsive assistant drawer (right drawer / bottom sheet)
│   │   ├── FooterBar.tsx       # Telemetry bar with interactive Demo controls popover
│   │   ├── HazardPanel.tsx     # High-priority red hazard lockout and safety panel
│   │   ├── Header.tsx          # Sticky top bar with camera pill, latency & active badges
│   │   ├── ItemCard.tsx        # Card view with bin swatches and "Why?" collapsible
│   │   ├── ItemTable.tsx       # Enterprise data grid with pinned columns and CSV export
│   │   ├── JsonViewer.tsx      # Syntax-highlighted collapsible robot telemetry viewer
│   │   ├── MobileTabBar.tsx    # Responsive mobile bottom navigation bar
│   │   ├── PickList.tsx        # Prioritized "Recover First" reclamation list
│   │   ├── PileSceneSvg.tsx    # Synthetic SVG waste pile geometry (no external images)
│   │   ├── ResultsPanel.tsx    # Cards | Table segmented view with category filters
│   │   ├── SiteSparkline.tsx   # SVG micro-trendlines for facilities sidebar
│   │   ├── TrendCharts.tsx     # Recharts multi-stream trends over time
│   │   └── Viewfinder.tsx      # Camera canvas supporting 6 discrete scan states
│   ├── context/
│   │   └── ScanContext.tsx     # Shared global state across Scan, Audit, Sites, API & Bot
│   ├── data/
│   │   └── mockData.ts         # Strictly typed mock items (all 12 items spread in scene)
│   ├── lib/
│   │   ├── constants.ts        # Pinned category colors, bin mapping & honesty strings
│   │   └── robotFormat.ts      # Machine-readable JSON telemetry serializer & schema
│   ├── pages/
│   │   ├── AuditPage.tsx       # One-page executive handover audit summary report
│   │   ├── DevTokensPage.tsx   # Design system token and typography check route (/dev/tokens)
│   │   ├── RobotApiPage.tsx    # Interactive machine-readable JSON & overlay workspace
│   │   ├── ScanPage.tsx        # Main viewfinder, bounding box and results workspace
│   │   └── SitesPage.tsx       # Multi-facility trend tracking and benchmark comparison
│   ├── services/
│   │   └── scanService.ts      # Network abstraction service with live API fallback
│   ├── types/
│   │   └── index.ts            # Core TypeScript interfaces (Item, ScanResult, Site, etc.)
│   ├── App.tsx                 # App shell with routing and EcoBot drawer integration
│   ├── index.css               # Design system base layer, focus rings, reduced motion
│   └── main.tsx                # React 18 DOM mount point
├── amplify.yml                 # AWS Amplify CI/CD build specification
├── tailwind.config.js          # Tailwind CSS v3.4 configuration (category accents, glows)
└── tsconfig.json               # Strict TypeScript configuration
```

---

## Backend Contract

When `VITE_API_URL` is set, `scanService.ts` makes real HTTP calls to the backend endpoints documented below. If the server is unreachable or responds with an invalid payload structure, the UI automatically falls back to local demo data and surfaces a visible `"Using demo data (backend unreachable)"` badge on the Scan page.

### 1. `POST /scan` (Computer Vision Inference)

#### Request
- **Headers:** `Content-Type: multipart/form-data` (when uploading an image) OR `Content-Type: application/json`
- **Body:**
  - File upload: Form field `image` containing image binary (`image/jpeg` or `image/png`).
  - Headless/Camera trigger: JSON `{ "sceneType": "full" }`.

#### Expected Response (`ScanResult`)
- **Status:** `200 OK`
- **Content-Type:** `application/json`

```json
{
  "scanId": "SCAN-2026-8491",
  "siteId": "SITE-YARD-A",
  "siteName": "Demo Yard A",
  "timestamp": "2026-10-09 05:28:14 UTC",
  "imageWidth": 1920,
  "imageHeight": 1200,
  "modelVersion": "ecoscan-seg-v0 (demo)",
  "latencyMs": 42,
  "items": [
    {
      "id": "REC-0001",
      "itemNumber": 1,
      "label": "Plastic bottle",
      "category": "recyclable",
      "material": "PET",
      "confidence": 0.96,
      "weightGrams": 25,
      "estimatedValueInr": {
        "min": 1.0,
        "max": 1.5
      },
      "targetBin": "Blue dry bin",
      "actionRequired": "Rinse and remove cap",
      "whyReason": "Clear Polyethylene Terephthalate is high-demand thermoplastic easily pelletised for polyester fiber.",
      "isHazardous": false,
      "bbox": {
        "x": 0.12,
        "y": 0.18,
        "width": 0.18,
        "height": 0.32
      },
      "polygon": [
        [0.16, 0.18],
        [0.24, 0.18],
        [0.29, 0.24],
        [0.30, 0.44],
        [0.26, 0.50],
        [0.15, 0.50],
        [0.12, 0.43],
        [0.13, 0.25]
      ],
      "graspPoint": {
        "x": 0.21,
        "y": 0.34
      }
    },
    {
      "id": "REC-0003",
      "itemNumber": 3,
      "label": "AA battery",
      "category": "hazardous",
      "material": "Alkaline battery",
      "confidence": 0.91,
      "weightGrams": 24,
      "estimatedValueInr": null,
      "targetBin": "Red hazardous container",
      "actionRequired": "Do not bin. Take to a battery drop-off",
      "whyReason": "Contains zinc, manganese dioxide, and potassium hydroxide electrolyte which can leak and corrode sorting equipment.",
      "isHazardous": true,
      "bbox": {
        "x": 0.58,
        "y": 0.22,
        "width": 0.11,
        "height": 0.16
      },
      "polygon": [
        [0.61, 0.22],
        [0.68, 0.23],
        [0.69, 0.35],
        [0.66, 0.38],
        [0.59, 0.38],
        [0.58, 0.33],
        [0.59, 0.25]
      ],
      "graspPoint": {
        "x": 0.635,
        "y": 0.30
      }
    }
  ]
}
```

---

### 2. `POST /chat` (EcoBot Assistant)

#### Request
- **Headers:** `Content-Type: application/json`
- **Body:**
```json
{
  "question": "What should I do with the battery?",
  "items": [
    {
      "id": "REC-0003",
      "itemNumber": 3,
      "label": "AA battery",
      "category": "hazardous",
      "material": "Alkaline battery",
      "targetBin": "Red hazardous container",
      "actionRequired": "Do not bin. Take to a battery drop-off",
      "isHazardous": true
    }
  ]
}
```

#### Expected Response
- **Status:** `200 OK`
- **Content-Type:** `application/json`
```json
{
  "answer": "Flagged 1 hazardous item: #3 AA battery. Follow your local hazardous-waste handling rules. Do not compact, crush or puncture. Transfer immediately to a dedicated red container and take to an authorized drop-off depot."
}
```
*(Plain string text responses are also parsed validly by `scanService.ts`)*.

---

## Deployment (AWS Amplify)

The repository includes an [`amplify.yml`](amplify.yml) build specification:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

SPA routing rewrites (`/* -> /index.html 200`) are supplied via [`public/_redirects`](public/_redirects).
