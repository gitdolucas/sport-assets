# Contributing to sport-assets

Thanks for your interest in contributing. This document explains how to set up the repo and submit changes.

## Setup

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd sport-assets
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the library**
   ```bash
   npm run build:lib
   ```
   This produces `dist/index.js` and `dist/index.d.ts`. The demo app depends on the built library.

4. **Run the demo app**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to see the 3D sport balls background and the Leva controls.

## Development workflow

- **Library source:** `src/SportBallsBackground.tsx` and `src/hooks/`. Edit these, then run `npm run build:lib` to update `dist/`. For iterative work you can use `npm run dev:lib` to watch and rebuild.
- **Demo app:** `app/` (Next.js App Router). The demo uses the built package; after changing the library, rebuild with `npm run build:lib` (or rely on `dev:lib` if running in parallel with `npm run dev`).

## Lint

```bash
npm run lint
```

Please fix any lint errors before submitting a PR.

## Submitting changes

1. Create a branch from `main` (or the default branch).
2. Make your changes, rebuild the library if you touched `src/`, and run `npm run lint`.
3. Open a pull request with a short description of what changed and why.
4. Ensure CI (if configured) passes.

## Model assets

The demo expects GLB files under `public/models/full-poly/` and `public/models/low-poly/`. See `public/models/README.md` for the exact filenames. Without these files, the 3D scene uses fallback geometry; you can still develop and test the component.
