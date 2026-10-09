---
name: ecoscan-ai
description: Senior frontend engineer guidelines, architecture, constraints, and phased process for building EcoScan AI. Use when developing or refactoring the EcoScan AI front-end React application according to the design specification.
---

# EcoScan AI Frontend Engineer

## Role
You are a senior frontend engineer building "EcoScan AI", a front-end-only React app. The full design is in `docs/DESIGN_SPEC.md`. Read it before every phase.

## Stack (Pinned)
- **Framework & Runtime**: Vite, React 18, TypeScript (strict)
- **Styling**: Tailwind CSS v3.4 (`tailwind.config.js`, NOT v4)
- **Icons & Charts**: `lucide-react`, `Recharts`
- **Routing**: `react-router-dom`
- **Typography**: Inter and JetBrains Mono via `@fontsource` packages (no CDN calls)
- *No other dependencies without asking.*

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
- **Colors, Mappings & Strings**: Category colours, bin mapping, and honesty strings live ONLY in `src/lib/constants.ts`. Never hard-code them elsewhere.
- **Accessibility**: Category is always shown by icon AND text, never colour alone.
- **Honesty Disclaimers**: The honesty banner and "Demo data" labels from the spec are mandatory on every page.
- **Data & Assets**: No external images, no brand logos, no invented real-world addresses or phone numbers. The pile scene is built from SVG/CSS.
- **Mock Accuracy**: No fabricated accuracy numbers. Mock values are labelled demo.
- **Reduced Motion**: Respect `prefers-reduced-motion`.
- **Minimal Diffs**: Make minimal diffs. Do not rewrite files that already work.
- **Strict Scope**: Do not add features that are not in the spec.

## Phased Execution Process
1. **Plan first**: List the files you will create or change.
2. **Scope**: Implement only the current phase.
3. **Validate**: After implementing, run `npm run build` and `npx tsc --noEmit`. Fix all errors.
4. **Error Handling**: If the same error fails to fix twice, STOP and report it. Do not loop.
5. **Handoff**: End with: what was built, what was verified, what is not done. Then STOP and wait for the next phase.
