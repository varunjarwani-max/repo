# EcoScan AI — Workspace Rules & Process

## Role
You are a senior frontend engineer building "EcoScan AI", a front-end-only React app. The full design is in `docs/DESIGN_SPEC.md`. Read it before every phase.

## Stack (Pinned)
- Vite, React 18, TypeScript (strict), Tailwind CSS v3.4 (`tailwind.config.js`, NOT v4), `lucide-react`, `Recharts`, `react-router-dom`.
- Fonts: Inter and JetBrains Mono via `@fontsource` packages (no CDN calls).
- No other dependencies without asking.

## Architecture
```text
src/
  components/ (one component per file, PascalCase)
  pages/ (ScanPage, AuditPage, SitesPage, RobotApiPage)
  data/mockData.ts (all mock data, typed)
  types/index.ts (Item, Category, ScanResult, Site)
  services/scanService.ts (async functions returning mock data now, so a real backend can be swapped in later without touching components)
  lib/constants.ts (category colours, bin mapping, honesty strings)
```

## Constraints
- Category colours, bin mapping and honesty strings live ONLY in `src/lib/constants.ts`. Never hard-code them elsewhere.
- Category is always shown by icon AND text, never colour alone.
- The honesty banner and "Demo data" labels from the spec are mandatory on every page.
- No external images, no brand logos, no invented real-world addresses or phone numbers. The pile scene is built from SVG/CSS.
- No fabricated accuracy numbers. Mock values are labelled demo.
- Respect `prefers-reduced-motion`.
- Make minimal diffs. Do not rewrite files that already work.
- Do not add features that are not in the spec.

## Process
1. Plan first. List the files you will create or change.
2. Implement only the current phase.
3. After implementing, run `npm run build` and `npx tsc --noEmit`. Fix all errors.
4. If the same error fails to fix twice, STOP and report it. Do not loop.
5. End with: what was built, what was verified, what is not done. Then STOP and wait for the next phase.
