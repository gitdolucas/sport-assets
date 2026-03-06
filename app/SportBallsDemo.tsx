'use client'

import dynamic from 'next/dynamic'
import { useControls, folder, Leva } from 'leva'
import type { QualityOverride, SimulationParams } from '../src/SportBallsBackground'

// bundle-dynamic-imports: heavy 3D/R3F component loaded on demand with next/dynamic; ssr: false + loading avoids ReactCurrentOwner and improves TTI/LCP
const SportBallsBackground = dynamic(
  () => import('../src/SportBallsBackground').then((m) => ({ default: m.SportBallsBackground })),
  {
    ssr: false,
    loading: () => (
      <div
        className="absolute inset-0 z-0 bg-gradient-to-br from-primary/10 via-background to-background dark:from-primary/20"
        aria-hidden
      />
    ),
  }
)

const INSTANCE_DEFAULTS: Record<string, number> = {
  basquete: 3,
  futbol: 3,
  euasoccer: 3,
  voley: 5,
  pickle: 10,
  tennis: 10,
}

// Leva order: gravityX, gravityY, gravityZ, pointerDistance, pointerStrength, ballAttractionDistance, ballAttractionStrength, centerAttractionStrength, bounds
const SIM_DEFAULTS = {
  gravityX: 0.0,
  gravityY: 0.0,
  gravityZ: 0.0,
  pointerDistance: 1.0,
  pointerStrength: 400,
  ballAttractionDistance: 5.0,
  ballAttractionStrength: 0.0,
  centerAttractionStrength: 150,
  bounds: 5.0,
}

export default function SportBallsDemo() {
  const {
    basquete,
    futbol,
    euasoccer,
    voley,
    pickle,
    tennis,
    LOD: qualityOverride,
    gravityX,
    gravityY,
    gravityZ,
    pointerDistance,
    pointerStrength,
    ballAttractionDistance,
    ballAttractionStrength,
    centerAttractionStrength,
    bounds,
  } = useControls('Sport Balls', {
    'Instance count': folder({
      basquete: { value: INSTANCE_DEFAULTS.basquete, min: 0, max: 25, step: 1, label: 'Basketball' },
      futbol: { value: INSTANCE_DEFAULTS.futbol, min: 0, max: 25, step: 1, label: 'Soccer' },
      euasoccer: { value: INSTANCE_DEFAULTS.euasoccer, min: 0, max: 25, step: 1, label: 'American football' },
      voley: { value: INSTANCE_DEFAULTS.voley, min: 0, max: 25, step: 1, label: 'Volleyball' },
      pickle: { value: INSTANCE_DEFAULTS.pickle, min: 0, max: 25, step: 1, label: 'Pickleball' },
      tennis: { value: INSTANCE_DEFAULTS.tennis, min: 0, max: 25, step: 1, label: 'Tennis' },
    }),
    LOD: {
      value: 'auto' as QualityOverride,
      options: ['auto', 'high', 'low'] as QualityOverride[],
      label: 'Level of detail (auto / high / low poly)',
    },
    Simulation: folder({
      Gravity: folder({
        gravityX: { value: SIM_DEFAULTS.gravityX, min: -20, max: 20, step: 0.5, label: 'X' },
        gravityY: { value: SIM_DEFAULTS.gravityY, min: -20, max: 20, step: 0.5, label: 'Y' },
        gravityZ: { value: SIM_DEFAULTS.gravityZ, min: -20, max: 20, step: 0.5, label: 'Z' },
      }),
      Pointer: folder({
        pointerDistance: { value: SIM_DEFAULTS.pointerDistance, min: 0, max: 5, step: 0.1, label: 'Repel distance' },
        pointerStrength: { value: SIM_DEFAULTS.pointerStrength, min: 0, max: 400, step: 5, label: 'Repel strength' },
      }),
      'Ball–ball': folder({
        ballAttractionDistance: { value: SIM_DEFAULTS.ballAttractionDistance, min: 0, max: 5, step: 0.1, label: 'Attraction distance' },
        ballAttractionStrength: { value: SIM_DEFAULTS.ballAttractionStrength, min: 0, max: 10, step: 0.1, label: 'Attraction strength' },
      }),
      Center: folder({
        centerAttractionStrength: { value: SIM_DEFAULTS.centerAttractionStrength, min: 0, max: 150, step: 5, label: 'Pull strength' },
      }),
      bounds: { value: SIM_DEFAULTS.bounds, min: 2, max: 15, step: 0.5, label: 'Arena size' },
    }),
  })

  const instanceCounts = {
    basquete,
    futbol,
    euasoccer,
    voley,
    pickle,
    tennis,
  }

  const simulationParams: SimulationParams = {
    gravity: [gravityX, gravityY, gravityZ],
    pointerDistance,
    pointerStrength,
    ballAttractionDistance,
    ballAttractionStrength,
    centerAttractionStrength,
    bounds,
  }

  return (
    <>
      <Leva oneLineLabels />
      <SportBallsBackground
        modelBaseUrl="/models"
        className="absolute inset-0 z-0"
        gradientClassName="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background dark:from-primary/20"
        instanceCounts={instanceCounts}
        qualityOverride={qualityOverride}
        simulationParams={simulationParams}
      />
    </>
  )
}
