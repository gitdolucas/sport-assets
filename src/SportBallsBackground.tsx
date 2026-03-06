'use client'

import React, { Suspense, useRef, useMemo, useEffect, useState, createContext, useContext } from 'react'
import { Canvas, useFrame, useThree, type RootState } from '@react-three/fiber'
import { Physics, RigidBody, RapierRigidBody } from '@react-three/rapier'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { useDeviceQuality, useDeviceQualityInCanvas } from './hooks/useDeviceQuality'
import type { DeviceQuality } from './hooks/useDeviceQuality'

export type QualityOverride = 'auto' | 'high' | 'low'

export interface SportBallsBackgroundProps {
  /** Base URL for model assets (e.g. "" or "/models"). Paths will append /full-poly/ and /low-poly/. */
  modelBaseUrl?: string
  /** RGB accent color [0-1, 0-1, 0-1]. If not set, reads --accent from document (when available). */
  accentColor?: [number, number, number]
  /** Root container class (e.g. "absolute inset-0 z-0"). */
  className?: string
  /** Gradient overlay class (e.g. Tailwind gradient). */
  gradientClassName?: string
  /** Override instance count per model id (e.g. { basquete: 5, tennis: 8 }). When set, used instead of random min–max. */
  instanceCounts?: Partial<Record<string, number>>
  /** Override LOD: "auto" = use device quality, "high" = force high-poly, "low" = force low-poly. */
  qualityOverride?: QualityOverride
  /** Simulation parameters: gravity, pointer interaction, ball–ball attraction, center pull, bounds. */
  simulationParams?: SimulationParams
}

export interface SimulationParams {
  /** Gravity vector [x, y, z]. Default [0, 0, 0]. */
  gravity?: [number, number, number]
  /** Max distance for pointer/touch to repel balls. */
  pointerDistance?: number
  /** Strength of pointer repulsion. */
  pointerStrength?: number
  /** Max distance for ball–ball attraction. */
  ballAttractionDistance?: number
  /** Strength of ball–ball attraction. */
  ballAttractionStrength?: number
  /** Strength of pull toward center. */
  centerAttractionStrength?: number
  /** Arena bounds (balls clamped to ±bounds on each axis). */
  bounds?: number
}

export type ModelConfig = {
  id: string
  paths: { high: string; low: string }
  baseScale: number
  colliderRadius: number
  colliderType: 'ball' | 'hull'
}

export function getModelConfigs(modelBaseUrl: string): ModelConfig[] {
  const base = modelBaseUrl.replace(/\/$/, '')
  return [
    { id: 'basquete', paths: { high: `${base}/full-poly/Basquete-transformed.glb`, low: `${base}/low-poly/BasqueteLOW1to1.glb` }, baseScale: 0.3, colliderRadius: 0.3, colliderType: 'ball' },
    { id: 'futbol', paths: { high: `${base}/full-poly/Futbol-transformed.glb`, low: `${base}/low-poly/FutbolLOW1to1.glb` }, baseScale: 0.28, colliderRadius: 0.28, colliderType: 'ball' },
    { id: 'euasoccer', paths: { high: `${base}/full-poly/EUAsoccer-transformed.glb`, low: `${base}/low-poly/EUAsoccerLOW1to1.glb` }, baseScale: 0.18, colliderRadius: 0.18, colliderType: 'ball' },
    { id: 'voley', paths: { high: `${base}/full-poly/Voley-transformed.glb`, low: `${base}/low-poly/VoleyLOW1to1.glb` }, baseScale: 0.2, colliderRadius: 0.2, colliderType: 'hull' },
    { id: 'pickle', paths: { high: `${base}/full-poly/Pickle-transformed.glb`, low: `${base}/low-poly/Pickle1to1.glb` }, baseScale: 0.095, colliderRadius: 0.095, colliderType: 'hull' },
    { id: 'tennis', paths: { high: `${base}/full-poly/tennis-transformed.glb`, low: `${base}/low-poly/tennisLOW1to1.glb` }, baseScale: 0.084, colliderRadius: 0.084, colliderType: 'ball' },
  ]
}

const INSTANCES_PER_MODEL: Record<string, { min: number; max: number }> = {
  basquete: { min: 3, max: 3 },
  futbol: { min: 3, max: 5 },
  euasoccer: { min: 3, max: 5 },
  voley: { min: 5, max: 8 },
  pickle: { min: 10, max: 15 },
  tennis: { min: 10, max: 15 },
}

const DEFAULT_ATTRACTION_DISTANCE = 1.0
const DEFAULT_ATTRACTION_STRENGTH = 1.0
const DEFAULT_CENTER_ATTRACTION_STRENGTH = 50.0
const DEFAULT_INTERACTION_DISTANCE = 1.2
const DEFAULT_INTERACTION_STRENGTH = 175.0
const DEFAULT_MODEL_BOUNDS = 5

function hslToRgb(hsl: string): [number, number, number] {
  const match = hsl.match(/(\d+\.?\d*)\s+(\d+\.?\d*)%\s+(\d+\.?\d*)%/)
  if (!match) return [0.5, 0.5, 0.5]
  const h = parseFloat(match[1]) / 360
  const s = parseFloat(match[2]) / 100
  const l = parseFloat(match[3]) / 100
  let r: number, g: number, b: number
  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }
  return [r, g, b]
}

function getAccentColorFromDocument(): [number, number, number] {
  if (typeof window === 'undefined') return [0.5, 0.5, 0.5]
  const accentHsl = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()
  if (accentHsl) return hslToRgb(accentHsl)
  return [0.5, 0.5, 0.5]
}

const ModelPositionsContext = createContext<React.MutableRefObject<Map<number, THREE.Vector3>> | null>(null)
const MousePositionContext = createContext<React.MutableRefObject<{ x: number; y: number }> | null>(null)

interface ModelInstance {
  id: number
  modelType: string
  position: [number, number, number]
  modelConfigIndex: number
}

/** Returns a position at a random corner of the arena (within bounds). */
function randomCornerPosition(bounds: number): [number, number, number] {
  const xy = bounds * 0.9
  const corners: [number, number, number][] = [
    [-xy, -xy, (Math.random() - 0.5) * bounds * 0.6],
    [xy, -xy, (Math.random() - 0.5) * bounds * 0.6],
    [-xy, xy, (Math.random() - 0.5) * bounds * 0.6],
    [xy, xy, (Math.random() - 0.5) * bounds * 0.6],
  ]
  return corners[Math.floor(Math.random() * corners.length)]!
}

function useModelMeshes(paths: { high: string; low: string }, quality: DeviceQuality) {
  const selectedPath = useMemo(() => (quality === 'high' ? paths.high : paths.low), [paths, quality])
  const gltf = useGLTF(selectedPath)
  const meshes = useMemo(() => {
    const meshData: Array<{ geometry: THREE.BufferGeometry; material: THREE.Material }> = []
    gltf.scene.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        const clonedGeometry = child.geometry.clone()
        clonedGeometry.applyMatrix4(child.matrixWorld)
        let material = child.material
        if (Array.isArray(material)) material = material[0]
        meshData.push({ geometry: clonedGeometry, material: material.clone() })
      }
    })
    if (meshData.length === 0) {
      return [{ geometry: new THREE.SphereGeometry(0.3, 32, 32), material: new THREE.MeshStandardMaterial() }]
    }
    return meshData
  }, [gltf])
  return meshes
}

interface InstancedMeshComponentProps {
  geometry: THREE.BufferGeometry
  material: THREE.Material
  instances: ModelInstance[]
  instanceMatricesRef: React.MutableRefObject<Map<number, THREE.Matrix4>>
  color: [number, number, number]
}

function InstancedMeshComponent({ geometry, material, instances, instanceMatricesRef, color }: InstancedMeshComponentProps) {
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null)
  const matrix = useMemo(() => new THREE.Matrix4(), [])
  const isMountedRef = useRef(true)
  useEffect(() => { isMountedRef.current = true; return () => { isMountedRef.current = false } }, [])

  useEffect(() => {
    if (!instancedMeshRef.current || !isMountedRef.current) return
    instances.forEach((instance, index) => {
      const instanceMatrix = instanceMatricesRef.current.get(instance.id)
      if (instanceMatrix) instancedMeshRef.current!.setMatrixAt(index, instanceMatrix)
      else {
        matrix.makeTranslation(...instance.position)
        instanceMatricesRef.current.set(instance.id, matrix.clone())
        instancedMeshRef.current!.setMatrixAt(index, matrix)
      }
    })
    instancedMeshRef.current.instanceMatrix.needsUpdate = true
  }, [instances, instanceMatricesRef, matrix])

  useFrame(() => {
    if (!isMountedRef.current || !instancedMeshRef.current) return
    try {
      instances.forEach((instance, index) => {
        const instanceMatrix = instanceMatricesRef.current.get(instance.id)
        if (instanceMatrix) instancedMeshRef.current!.setMatrixAt(index, instanceMatrix)
      })
      instancedMeshRef.current.instanceMatrix.needsUpdate = true
    } catch (e) {
      if (process.env.NODE_ENV === 'development') console.warn('InstancedMeshComponent animation error:', e)
    }
  })

  const tintedMaterial = useMemo(() => {
    const baseMaterial = material.clone()
    if (baseMaterial instanceof THREE.MeshStandardMaterial) {
      const [r, g, b] = color
      baseMaterial.emissive = new THREE.Color(r, g, b).multiplyScalar(0.1)
      baseMaterial.emissiveIntensity = 0.1
      baseMaterial.opacity = 1.0
      baseMaterial.transparent = true
      baseMaterial.shadowSide = THREE.FrontSide
      // Reduce specular to avoid blown-out highlights in production
      baseMaterial.roughness = Math.min(1, (baseMaterial.roughness ?? 0.5) + 0.2)
      baseMaterial.metalness = Math.max(0, (baseMaterial.metalness ?? 0) * 0.5)
    }
    return baseMaterial
  }, [material, color])

  if (instances.length === 0) return null
  return (
    <instancedMesh ref={instancedMeshRef} args={[geometry, tintedMaterial, instances.length]} frustumCulled={false} castShadow receiveShadow />
  )
}

interface InstancedModelProps {
  instances: ModelInstance[]
  modelConfigIndex: number
  modelConfigs: ModelConfig[]
  instanceMatricesRef: React.MutableRefObject<Map<number, THREE.Matrix4>>
  color: [number, number, number]
  quality: DeviceQuality
}

function InstancedModel({ instances, modelConfigIndex, modelConfigs, instanceMatricesRef, color, quality }: InstancedModelProps) {
  const config = modelConfigs[modelConfigIndex]
  const meshes = useModelMeshes(config.paths, quality)
  if (instances.length === 0 || meshes.length === 0) return null
  return (
    <>
      {meshes.map((meshData, meshIndex) => (
        <InstancedMeshComponent
          key={meshIndex}
          geometry={meshData.geometry}
          material={meshData.material}
          instances={instances}
          instanceMatricesRef={instanceMatricesRef}
          color={color}
        />
      ))}
    </>
  )
}

interface ModelRigidBodyProps {
  instance: ModelInstance
  index: number
  modelConfigs: ModelConfig[]
  instanceMatricesRef: React.MutableRefObject<Map<number, THREE.Matrix4>>
  physicsParams: { attractionDistance: number; attractionStrength: number; centerAttractionStrength: number; interactionDistance: number; interactionStrength: number; modelBounds: number }
}

function ModelRigidBody({ instance, index, modelConfigs, instanceMatricesRef, physicsParams }: ModelRigidBodyProps) {
  const rigidBodyRef = useRef<RapierRigidBody>(null)
  const positionsRef = useContext(ModelPositionsContext)
  const { viewport } = useThree()
  const mousePositionRef = useContext(MousePositionContext)
  const config = modelConfigs[instance.modelConfigIndex]
  const isMountedRef = useRef(true)
  useEffect(() => { isMountedRef.current = true; return () => { isMountedRef.current = false } }, [])

  useFrame((_state: RootState, delta: number) => {
    if (!isMountedRef.current || !rigidBodyRef.current || !positionsRef) return
    try {
      const rigidBody = rigidBodyRef.current
      const currentPos = rigidBody.translation()
      const currentVec = new THREE.Vector3(currentPos.x, currentPos.y, currentPos.z)
      positionsRef.current.set(index, currentVec)

      const matrix = instanceMatricesRef.current.get(instance.id)
      if (matrix) {
        const rot = rigidBody.rotation()
        const euler = new THREE.Euler(rot.x, rot.y, rot.z, 'XYZ')
        matrix.makeRotationFromEuler(euler)
        matrix.setPosition(currentPos.x, currentPos.y, currentPos.z)
      }

      let forceX = 0, forceY = 0, forceZ = 0

      positionsRef.current.forEach((otherPos, otherIndex) => {
        if (otherIndex === index) return
        const dx = otherPos.x - currentPos.x, dy = otherPos.y - currentPos.y, dz = otherPos.z - currentPos.z
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)
        if (distance > 0 && distance < physicsParams.attractionDistance) {
          const strength = (1 - distance / physicsParams.attractionDistance) * physicsParams.attractionStrength * delta
          forceX += (dx / distance) * strength
          forceY += (dy / distance) * strength
          forceZ += (dz / distance) * strength
        }
      })

      const centerDx = 0 - currentPos.x
      const centerDy = 0 - currentPos.y
      const centerDz = 0 - currentPos.z
      const centerDistance = Math.sqrt(centerDx * centerDx + centerDy * centerDy + centerDz * centerDz)
      if (centerDistance > 0) {
        const centerStrength = physicsParams.centerAttractionStrength * delta
        forceX += (centerDx / centerDistance) * centerStrength
        forceY += (centerDy / centerDistance) * centerStrength
        forceZ += (centerDz / centerDistance) * centerStrength
      }

      let mouseWorld = new THREE.Vector3(0, 0, currentPos.z)
      if (mousePositionRef?.current) {
        const normalizedX = mousePositionRef.current.x * 2 - 1
        const normalizedY = 1 - mousePositionRef.current.y * 2
        mouseWorld = new THREE.Vector3(normalizedX * (viewport.width / 2), normalizedY * (viewport.height / 2), currentPos.z)
      }
      const dx = mouseWorld.x - currentPos.x, dy = mouseWorld.y - currentPos.y, dz = mouseWorld.z - currentPos.z
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)
      if (distance < physicsParams.interactionDistance && distance > 0) {
        const strength = (1 - distance / physicsParams.interactionDistance) * physicsParams.interactionStrength * delta
        forceX -= (dx / distance) * strength
        forceY -= (dy / distance) * strength
        forceZ -= (dz / distance) * strength * 0.5
      }

      if (Math.abs(forceX) > 0.001 || Math.abs(forceY) > 0.001 || Math.abs(forceZ) > 0.001) {
        rigidBody.wakeUp()
        const currentLinvel = rigidBody.linvel()
        const maxVel = 5
        const newLinvel = {
          x: Math.max(-maxVel, Math.min(maxVel, currentLinvel.x + forceX * 0.1)),
          y: Math.max(-maxVel, Math.min(maxVel, currentLinvel.y + forceY * 0.1)),
          z: Math.max(-maxVel, Math.min(maxVel, currentLinvel.z + forceZ * 0.1)),
        }
        rigidBody.setLinvel(newLinvel, true)
      }

      const maxDist = physicsParams.modelBounds
      if (Math.abs(currentPos.x) > maxDist || Math.abs(currentPos.y) > maxDist || Math.abs(currentPos.z) > maxDist) {
        rigidBody.setTranslation(
          { x: Math.max(-maxDist, Math.min(maxDist, currentPos.x)), y: Math.max(-maxDist, Math.min(maxDist, currentPos.y)), z: Math.max(-maxDist, Math.min(maxDist, currentPos.z)) },
          true
        )
      }
    } catch (e) {
      if (process.env.NODE_ENV === 'development') console.warn('ModelRigidBody animation error:', e)
    }
  })

  useEffect(() => {
    if (rigidBodyRef.current) {
      rigidBodyRef.current.wakeUp()
      rigidBodyRef.current.setAngvel({ x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2, z: (Math.random() - 0.5) * 2 }, true)
    }
  }, [])

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={instance.position}
      type="dynamic"
      colliders={config.colliderType === 'ball' ? 'ball' : 'hull'}
      restitution={0.5}
      friction={0.1}
      linearDamping={0.2}
      angularDamping={0.1}
      mass={1}
      canSleep={false}
      lockRotations={false}
      lockTranslations={false}
      ccd={true}
    >
      <mesh castShadow={false} receiveShadow={false}>
        {config.colliderType === 'ball' ? <sphereGeometry args={[config.colliderRadius, 16, 16]} /> : <boxGeometry args={[config.colliderRadius * 2, config.colliderRadius * 2, config.colliderRadius * 2]} />}
        <meshBasicMaterial visible={false} />
      </mesh>
    </RigidBody>
  )
}

function CornerLights({ positionsRef, bounds }: { positionsRef: React.MutableRefObject<Map<number, THREE.Vector3>>; bounds: number }) {
  const light1Ref = useRef<THREE.SpotLight>(null)
  const light2Ref = useRef<THREE.SpotLight>(null)
  const light3Ref = useRef<THREE.SpotLight>(null)
  const light4Ref = useRef<THREE.SpotLight>(null)
  const target1Ref = useMemo(() => new THREE.Object3D(), [])
  const target2Ref = useMemo(() => new THREE.Object3D(), [])
  const target3Ref = useMemo(() => new THREE.Object3D(), [])
  const target4Ref = useMemo(() => new THREE.Object3D(), [])
  const isMountedRef = useRef(true)
  useEffect(() => { isMountedRef.current = true; return () => { isMountedRef.current = false } }, [])

  useFrame(() => {
    if (!isMountedRef.current || !positionsRef.current || positionsRef.current.size === 0) return
    try {
      let sumX = 0, sumY = 0, sumZ = 0, count = 0
      positionsRef.current.forEach((pos) => { sumX += pos.x; sumY += pos.y; sumZ += pos.z; count++ })
      if (count === 0) return
      const clumpCenter = new THREE.Vector3(sumX / count, sumY / count, sumZ / count)
      const corners = [
        new THREE.Vector3(-bounds, -bounds, bounds * 0.5),
        new THREE.Vector3(bounds, -bounds, bounds * 0.5),
        new THREE.Vector3(-bounds, bounds, bounds * 0.5),
        new THREE.Vector3(bounds, bounds, bounds * 0.5),
      ]
      const lightRefs = [light1Ref, light2Ref, light3Ref, light4Ref]
      const targetRefs = [target1Ref, target2Ref, target3Ref, target4Ref]
      corners.forEach((corner, index) => {
        const lightRef = lightRefs[index]
        const targetRef = targetRefs[index]
        if (!lightRef.current) return
        lightRef.current.position.copy(corner)
        targetRef.position.copy(clumpCenter)
        targetRef.updateMatrixWorld()
        lightRef.current.target = targetRef
      })
    } catch (e) {
      if (process.env.NODE_ENV === 'development') console.warn('CornerLights animation error:', e)
    }
  })

  const spotProps = { intensity: 1.2, angle: Math.PI / 3, penumbra: 0.5, decay: 2, distance: bounds * 3, castShadow: true }
  const shadowProps = { 'shadow-mapSize-width': 2048, 'shadow-mapSize-height': 2048, 'shadow-camera-near': 0.1, 'shadow-camera-far': bounds * 3, 'shadow-bias': -0.0001 }
  return (
    <>
      <primitive object={target1Ref} />
      <spotLight ref={light1Ref} position={[-bounds, -bounds, bounds * 0.5]} {...spotProps} {...shadowProps} />
      <primitive object={target2Ref} />
      <spotLight ref={light2Ref} position={[bounds, -bounds, bounds * 0.5]} {...spotProps} {...shadowProps} />
      <primitive object={target3Ref} />
      <spotLight ref={light3Ref} position={[-bounds, bounds, bounds * 0.5]} {...spotProps} {...shadowProps} />
      <primitive object={target4Ref} />
      <spotLight ref={light4Ref} position={[bounds, bounds, bounds * 0.5]} {...spotProps} {...shadowProps} />
    </>
  )
}

interface SceneProps {
  color: [number, number, number]
  modelConfigs: ModelConfig[]
  instanceCounts?: Partial<Record<string, number>>
  qualityOverride?: QualityOverride
  simulationParams?: SimulationParams
}

function Scene({ color, modelConfigs, instanceCounts, qualityOverride, simulationParams }: SceneProps) {
  const positionsRef = useRef<Map<number, THREE.Vector3>>(new Map())
  const mousePositionRef = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.5 })
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const instanceMatricesRef = useRef<Map<number, THREE.Matrix4>>(new Map())
  const { gl } = useThree()
  const deviceQuality = useDeviceQualityInCanvas(gl)
  const quality: DeviceQuality = (qualityOverride === 'high' || qualityOverride === 'low') ? qualityOverride : deviceQuality
  const physicsParams = useMemo(() => ({
    attractionDistance: simulationParams?.ballAttractionDistance ?? DEFAULT_ATTRACTION_DISTANCE,
    attractionStrength: simulationParams?.ballAttractionStrength ?? DEFAULT_ATTRACTION_STRENGTH,
    centerAttractionStrength: simulationParams?.centerAttractionStrength ?? DEFAULT_CENTER_ATTRACTION_STRENGTH,
    interactionDistance: simulationParams?.pointerDistance ?? DEFAULT_INTERACTION_DISTANCE,
    interactionStrength: simulationParams?.pointerStrength ?? DEFAULT_INTERACTION_STRENGTH,
    modelBounds: simulationParams?.bounds ?? DEFAULT_MODEL_BOUNDS,
  }), [simulationParams])
  const gravity = useMemo<[number, number, number]>(
    () => simulationParams?.gravity ?? [0, 0, 0],
    [simulationParams]
  )

  useEffect(() => {
    let isMounted = true
    if (gl?.domElement) canvasRef.current = gl.domElement
    const getCanvas = () => (isMounted ? canvasRef.current : null)
    const updatePosition = (clientX: number, clientY: number) => {
      if (!isMounted) return
      const canvas = getCanvas()
      if (!canvas) return
      try {
        const rect = canvas.getBoundingClientRect()
        if (rect.width === 0 && rect.height === 0) return
        const x = (clientX - rect.left) / rect.width
        const y = (clientY - rect.top) / rect.height
        mousePositionRef.current = { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) }
      } catch (e) {
        if (process.env.NODE_ENV === 'development') console.warn('updatePosition error:', e)
      }
    }
    const handleMouseMove = (e: MouseEvent) => { if (isMounted) updatePosition(e.clientX, e.clientY) }
    const handleTouchStart = (e: TouchEvent) => { if (isMounted && e.touches[0]) updatePosition(e.touches[0].clientX, e.touches[0].clientY) }
    const handleTouchMove = (e: TouchEvent) => { if (isMounted && e.touches[0]) updatePosition(e.touches[0].clientX, e.touches[0].clientY) }
    const handleTouchEnd = () => { if (isMounted) mousePositionRef.current = { x: 0.5, y: 0.5 } }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: true })
    window.addEventListener('touchend', handleTouchEnd)
    window.addEventListener('touchcancel', handleTouchEnd)
    return () => {
      isMounted = false
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
      window.removeEventListener('touchcancel', handleTouchEnd)
      canvasRef.current = null
    }
  }, [gl])

  const [instances, setInstances] = useState<ModelInstance[]>([])
  const nextIdRef = useRef(0)
  const instancesRef = useRef<ModelInstance[]>([])
  useEffect(() => {
    instancesRef.current = instances
  }, [instances])

  const instanceCountsKey = useMemo(
    () => (instanceCounts != null ? JSON.stringify(instanceCounts) : ''),
    [instanceCounts]
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    const bounds = physicsParams.modelBounds
    const current = instancesRef.current

    const runFullInit = () => {
      const allInstances: ModelInstance[] = []
      let globalIndex = 0
      modelConfigs.forEach((config, configIndex) => {
        const instanceConfig = INSTANCES_PER_MODEL[config.id] || { min: 3, max: 5 }
        const instanceCount = instanceCounts != null && typeof instanceCounts[config.id] === 'number'
          ? Math.max(0, Math.floor(instanceCounts[config.id]!))
          : Math.floor(Math.random() * (instanceConfig.max - instanceConfig.min + 1)) + instanceConfig.min
        for (let i = 0; i < instanceCount; i++) {
          allInstances.push({
            id: globalIndex++,
            modelType: config.id,
            position: [
              (Math.random() - 0.5) * bounds * 0.8,
              (Math.random() - 0.5) * bounds * 0.8,
              (Math.random() - 0.5) * bounds * 0.5,
            ],
            modelConfigIndex: configIndex,
          })
          const matrix = new THREE.Matrix4()
          matrix.makeTranslation(...allInstances[allInstances.length - 1].position)
          instanceMatricesRef.current.set(allInstances[allInstances.length - 1].id, matrix)
        }
      })
      nextIdRef.current = allInstances.length
      setInstances(allInstances)
    }

    if (instanceCounts == null || current.length === 0) {
      runFullInit()
      return
    }

    const targetByConfig = new Map<number, number>()
    modelConfigs.forEach((config, configIndex) => {
      const n = instanceCounts != null && typeof instanceCounts[config.id] === 'number'
        ? Math.max(0, Math.floor(instanceCounts[config.id]!))
        : (INSTANCES_PER_MODEL[config.id]?.min ?? 3)
      targetByConfig.set(configIndex, n)
    })

    const groups = new Map<number, ModelInstance[]>()
    modelConfigs.forEach((_, configIndex) => {
      groups.set(configIndex, current.filter((inst) => inst.modelConfigIndex === configIndex))
    })

    let changed = false
    modelConfigs.forEach((config, configIndex) => {
      const target = targetByConfig.get(configIndex) ?? 0
      const group = groups.get(configIndex) ?? []
      if (target > group.length) {
        for (let i = group.length; i < target; i++) {
          const position = randomCornerPosition(bounds)
          const id = nextIdRef.current++
          const newInst: ModelInstance = {
            id,
            modelType: config.id,
            position,
            modelConfigIndex: configIndex,
          }
          group.push(newInst)
          const matrix = new THREE.Matrix4()
          matrix.makeTranslation(...position)
          instanceMatricesRef.current.set(id, matrix)
          changed = true
        }
      } else if (target < group.length) {
        const toRemove = group.length - target
        for (let i = 0; i < toRemove; i++) {
          group.pop()
          changed = true
        }
      }
    })

    if (changed) {
      const allInstances: ModelInstance[] = []
      modelConfigs.forEach((_, configIndex) => {
        allInstances.push(...(groups.get(configIndex) ?? []))
      })
      setInstances(allInstances)
    }
  }, [physicsParams.modelBounds, modelConfigs, instanceCountsKey, instanceCounts])

  const instancesByModel = useMemo(() => {
    const grouped = new Map<number, ModelInstance[]>()
    modelConfigs.forEach((_, configIndex) => {
      grouped.set(configIndex, instances.filter((inst) => inst.modelConfigIndex === configIndex))
    })
    return grouped
  }, [instances, modelConfigs])

  return (
    <ModelPositionsContext.Provider value={positionsRef}>
      <MousePositionContext.Provider value={mousePositionRef}>
        <Physics gravity={gravity} timeStep="vary" paused={false}>
          <ambientLight intensity={0.5} />
          <pointLight position={[5, 5, 5]} intensity={0.6} castShadow />
          <pointLight position={[-5, -5, -5]} intensity={0.4} castShadow />
          <directionalLight position={[0, 5, 5]} intensity={0.4} castShadow />
          <CornerLights positionsRef={positionsRef} bounds={physicsParams.modelBounds} />
          {instances.length > 0 && modelConfigs.map((config, configIndex) => {
            const modelInstances = instancesByModel.get(configIndex) || []
            if (modelInstances.length === 0) return null
            return (
              <InstancedModel
                key={config.id}
                instances={modelInstances}
                modelConfigIndex={configIndex}
                modelConfigs={modelConfigs}
                instanceMatricesRef={instanceMatricesRef}
                color={color}
                quality={quality}
              />
            )
          })}
          {instances.length > 0 && instances.map((instance) => (
            <ModelRigidBody
              key={instance.id}
              instance={instance}
              index={instance.id}
              modelConfigs={modelConfigs}
              instanceMatricesRef={instanceMatricesRef}
              physicsParams={physicsParams}
            />
          ))}
        </Physics>
      </MousePositionContext.Provider>
    </ModelPositionsContext.Provider>
  )
}

class ThreeErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null as Error | null }
  static getDerivedStateFromError(error: unknown) {
    return { hasError: true, error: error instanceof Error ? error : null }
  }
  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo) {
    if (process.env.NODE_ENV === 'development') console.warn('SportBallsBackground render error:', error, errorInfo)
  }
  render() {
    if (this.state.hasError) return this.props.fallback ?? null
    return this.props.children
  }
}

export function SportBallsBackground({
  modelBaseUrl = '/models',
  accentColor: accentColorProp,
  className = 'absolute inset-0 z-0',
  gradientClassName = 'absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background dark:from-primary/20',
  instanceCounts,
  qualityOverride,
  simulationParams,
}: SportBallsBackgroundProps) {
  const [mounted, setMounted] = useState(false)
  const [webglAvailable, setWebglAvailable] = useState(true)
  const [accentColor, setAccentColor] = useState<[number, number, number]>([0.5, 0.5, 0.5])
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const unmountingRef = useRef(false)

  const quality = useDeviceQuality()
  const modelConfigs = useMemo(() => getModelConfigs(modelBaseUrl), [modelBaseUrl])

  const canvasDpr: [number, number] = useMemo(() => (quality === 'low' ? [1, 1.5] : [1, 2]), [quality])
  const canvasFrameloop = useMemo(() => (quality === 'low' ? 'demand' : 'always'), [quality])

  useEffect(() => {
    if (typeof window === 'undefined') return
    let isMounted = true
    unmountingRef.current = false

    const checkWebGL = () => {
      try {
        const canvas = document.createElement('canvas')
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
        if (!gl) {
          if (isMounted && !unmountingRef.current) setWebglAvailable(false)
          return false
        }
        return true
      } catch {
        if (isMounted && !unmountingRef.current) setWebglAvailable(false)
        return false
      }
    }

    if (!checkWebGL()) return
    if (isMounted && !unmountingRef.current) {
      setMounted(true)
      setAccentColor(accentColorProp ?? getAccentColorFromDocument())
    }

    const updateColor = () => {
      if (typeof window !== 'undefined' && containerRef.current && isMounted && !unmountingRef.current && accentColorProp == null) {
        setAccentColor(getAccentColorFromDocument())
      }
    }

    const observer = new MutationObserver(updateColor)
    if (document.documentElement) observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] })
    const interval = setInterval(updateColor, 1000)

    const handleContextLost = (e: Event) => {
      e.preventDefault()
      if (isMounted && !unmountingRef.current) setWebglAvailable(false)
    }
    const handleContextRestored = () => {
      if (isMounted && !unmountingRef.current) { setWebglAvailable(true); setMounted(true) }
    }
    const setupCanvasHandlers = () => {
      if (unmountingRef.current) return
      const canvas = containerRef.current?.querySelector('canvas')
      if (canvas && isMounted && !unmountingRef.current) {
        canvasRef.current = canvas
        canvas.addEventListener('webglcontextlost', handleContextLost)
        canvas.addEventListener('webglcontextrestored', handleContextRestored)
      }
    }
    const timeoutId = setTimeout(setupCanvasHandlers, 100)

    return () => {
      unmountingRef.current = true
      isMounted = false
      observer.disconnect()
      clearInterval(interval)
      clearTimeout(timeoutId)
      setMounted(false)
      if (canvasRef.current) {
        canvasRef.current.removeEventListener('webglcontextlost', handleContextLost)
        canvasRef.current.removeEventListener('webglcontextrestored', handleContextRestored)
        canvasRef.current = null
      }
    }
  }, [accentColorProp])

  useEffect(() => {
    if (accentColorProp != null) setAccentColor(accentColorProp)
  }, [accentColorProp])

  useEffect(() => {
    if (typeof window === 'undefined' || !mounted) return
    modelConfigs.forEach((config) => {
      try {
        useGLTF.preload(config.paths.high)
        useGLTF.preload(config.paths.low)
      } catch (e) {
        if (process.env.NODE_ENV === 'development') console.warn('Failed to preload model:', config.paths.high, e)
      }
    })
  }, [mounted, modelConfigs])

  return (
    <div ref={containerRef} className={className}>
      <div className={gradientClassName} />
      {mounted && webglAvailable && (
        <Canvas
          className="absolute inset-0"
          gl={{ alpha: true, antialias: true, powerPreference: 'high-performance', stencil: false, depth: true, preserveDrawingBuffer: false, failIfMajorPerformanceCaveat: false }}
          camera={{ position: [0, 0, 5], fov: 45 }}
          style={{ pointerEvents: 'none' }}
          dpr={canvasDpr}
          frameloop={canvasFrameloop}
          performance={{ min: 0.5 }}
          onCreated={({ gl }: { gl: THREE.WebGLRenderer }) => {
            if (!unmountingRef.current) canvasRef.current = gl.domElement
            gl.shadowMap.enabled = true
            gl.shadowMap.type = THREE.PCFSoftShadowMap
          }}
        >
          <ThreeErrorBoundary fallback={null}>
            <Suspense fallback={null}>
              <Scene color={accentColor} modelConfigs={modelConfigs} instanceCounts={instanceCounts} qualityOverride={qualityOverride} simulationParams={simulationParams} />
            </Suspense>
          </ThreeErrorBoundary>
        </Canvas>
      )}
    </div>
  )
}
