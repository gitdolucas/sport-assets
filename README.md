# sport-assets

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Reusable 3D sport-ball background component (React Three Fiber + Rapier).

## SportBallsBackground

Physics-based interactive background with instanced sport ball models (basketball, soccer, volleyball, pickleball, tennis, etc.). Uses `@react-three/fiber`, `@react-three/drei`, and `@react-three/rapier`.

### Install (consumer)

Ensure peer dependencies are installed: `react`, `react-dom`, `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/rapier`, and optionally `@dimforge/rapier3d-compat` (often required by Rapier).

From a sibling repo:

```json
"sport-assets": "file:../sport-assets"
```

Then `npm install` and in the app:

```tsx
import { SportBallsBackground } from 'sport-assets'
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelBaseUrl` | `string` | `'/models'` | Base URL for GLB assets. Paths are `{modelBaseUrl}/full-poly/...` and `{modelBaseUrl}/low-poly/...`. |
| `accentColor` | `[number, number, number]` | — | RGB accent [0–1]. If omitted, reads CSS `--accent` from document when available. |
| `className` | `string` | `'absolute inset-0 z-0'` | Root container class. |
| `gradientClassName` | `string` | Tailwind gradient | Overlay gradient class (e.g. Tailwind). |

### Model assets

Host the GLB files in your app (e.g. `public/models/`) so they are served at:

- `{modelBaseUrl}/full-poly/`: `Basquete-transformed.glb`, `Futbol-transformed.glb`, `EUAsoccer-transformed.glb`, `Voley-transformed.glb`, `Pickle-transformed.glb`, `tennis-transformed.glb`
- `{modelBaseUrl}/low-poly/`: `BasqueteLOW1to1.glb`, `FutbolLOW1to1.glb`, `EUAsoccerLOW1to1.glb`, `VoleyLOW1to1.glb`, `Pickle1to1.glb`, `tennisLOW1to1.glb`

### Example (Next.js + Tailwind)

```tsx
import { SportBallsBackground } from 'sport-assets'

export default function Hero() {
  return (
    <section className="relative min-h-screen">
      <SportBallsBackground
        modelBaseUrl="/models"
        className="absolute inset-0 z-0"
        gradientClassName="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background dark:from-primary/20"
      />
      <div className="relative z-10">…</div>
    </section>
  )
}
```

### Build (library only)

```bash
npm install
npm run build:lib
```

Output: `dist/index.js` (ESM) and `dist/index.d.ts`.

---

## Run the demo app

This repo includes a Next.js app that showcases `SportBallsBackground`:

```bash
npm install
npm run build:lib   # build the library first
npm run dev         # start Next.js dev server at http://localhost:3000
```

- **Build (library + app):** `npm run build` — runs `build:lib` then `next build`.
- **Start production server:** `npm run start` (after `npm run build`).
- **Lint:** `npm run lint`.

## Deploy to Vercel

1. Push the repo to GitHub/GitLab/Bitbucket and import the project in [Vercel](https://vercel.com).
2. Use the default build settings: **Build Command** `npm run build`, **Output Directory** (leave default; Next.js uses `.next`).
3. Deploy. No `vercel.json` is required for a standard Next.js app.

## Adding model assets

The demo expects GLB files under `public/models/`. See [public/models/README.md](public/models/README.md) for the exact filenames. Copy the 12 GLB files from your source into `public/models/full-poly/` and `public/models/low-poly/`. Without them, the 3D scene uses fallback geometry.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to set up the repo, run the demo, and submit changes.
