'use client'

import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { useIsMobile } from './use-mobile'

export type DeviceQuality = 'low' | 'medium' | 'high'

const STORAGE_KEY = 'device-quality-tier'
const BENCHMARK_DURATION = 2000 // 2 seconds

const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false
  return /Mobi|Android|iPhone/i.test(navigator.userAgent) ||
    window.matchMedia('(pointer:coarse)').matches
}

const runBenchmark = (gl: THREE.WebGLRenderer): Promise<DeviceQuality> => {
  return new Promise((resolve) => {
    const tempScene = new THREE.Scene()
    const tempCamera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000)
    const geometry = new THREE.BoxGeometry()
    const material = new THREE.MeshBasicMaterial()

    for (let i = 0; i < 1000; i++) {
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10
      )
      tempScene.add(mesh)
    }

    let frameCount = 0
    const startTime = performance.now()

    const testRender = () => {
      try {
        gl.render(tempScene, tempCamera)
        frameCount++
        const elapsed = performance.now() - startTime
        if (elapsed < BENCHMARK_DURATION) {
          requestAnimationFrame(testRender)
        } else {
          const fps = frameCount / (elapsed / 1000)
          tempScene.clear()
          geometry.dispose()
          material.dispose()
          if (fps > 50) resolve('high')
          else if (fps > 30) resolve('medium')
          else resolve('low')
        }
      } catch {
        tempScene.clear()
        geometry.dispose()
        material.dispose()
        resolve('medium')
      }
    }

    testRender()
  })
}

const assessHardwareQuality = (gl: THREE.WebGLRenderer | null = null): DeviceQuality => {
  if (typeof window === 'undefined') return 'medium'

  const mobile = isMobileDevice()
  const cpuCores = navigator.hardwareConcurrency || 4
  const ramGB = (navigator as { deviceMemory?: number }).deviceMemory ?? 4
  let isHighEndGPU = false
  if (gl) {
    const maxTextures = gl.capabilities.maxTextures || 16
    isHighEndGPU = maxTextures > 32
  }

  if (mobile || ramGB <= 4 || cpuCores <= 4) return 'low'
  if (ramGB >= 8 && cpuCores >= 8 && isHighEndGPU) return 'high'
  return 'medium'
}

export function useDeviceQuality(): DeviceQuality {
  const isMobile = useIsMobile()
  const [quality, setQuality] = useState<DeviceQuality>('medium')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(STORAGE_KEY) as DeviceQuality | null
      if (cached && ['low', 'medium', 'high'].includes(cached)) {
        setQuality(cached)
        return
      }
    }
    const hardwareTier = assessHardwareQuality(null)
    setQuality(hardwareTier)
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, hardwareTier)
    }
  }, [isMobile])

  return quality
}

export function useDeviceQualityInCanvas(gl: THREE.WebGLRenderer | null): DeviceQuality {
  const isMobile = useIsMobile()
  const [quality, setQuality] = useState<DeviceQuality>('medium')
  const [hasRunDetection, setHasRunDetection] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(STORAGE_KEY) as DeviceQuality | null
      if (cached && ['low', 'medium', 'high'].includes(cached)) {
        setQuality(cached)
        setHasRunDetection(true)
        return
      }
    }

    const detectQuality = async () => {
      if (!gl) {
        setQuality(isMobile ? 'low' : 'medium')
        setHasRunDetection(true)
        return
      }
      const hardwareTier = assessHardwareQuality(gl)
      try {
        const benchmarkTier = await runBenchmark(gl)
        const finalTier =
          benchmarkTier === 'low' || hardwareTier === 'low'
            ? 'low'
            : benchmarkTier === 'high' && hardwareTier === 'high'
              ? 'high'
              : 'medium'
        setQuality(finalTier)
        if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, finalTier)
      } catch {
        setQuality(hardwareTier)
        if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, hardwareTier)
      }
      setHasRunDetection(true)
    }

    if (!hasRunDetection && gl) detectQuality()
  }, [gl, isMobile, hasRunDetection])

  return quality
}
