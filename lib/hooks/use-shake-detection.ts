'use client'

import { useEffect, useRef } from 'react'

interface ShakeDetectionOptions {
  threshold?: number // Minimum acceleration change to detect shake
  debounceTime?: number // Time between shake events (ms)
  onShake: () => void
}

/**
 * Hook to detect device shake using accelerometer
 * Mobile only - requires device motion permissions
 */
export function useShakeDetection({
  threshold = 15,
  debounceTime = 2000,
  onShake,
}: ShakeDetectionOptions) {
  const lastShakeTime = useRef<number>(0)
  const lastAcceleration = useRef<{ x: number; y: number; z: number } | null>(null)

  useEffect(() => {
    // Check if device motion is supported
    if (typeof window === 'undefined' || !('DeviceMotionEvent' in window)) {
      return
    }

    const handleMotion = (event: DeviceMotionEvent) => {
      const acceleration = event.accelerationIncludingGravity

      if (!acceleration) return

      const now = Date.now()

      // Debounce: don't trigger if too soon after last shake
      if (now - lastShakeTime.current < debounceTime) {
        return
      }

      if (lastAcceleration.current) {
        const deltaX = Math.abs(acceleration.x! - lastAcceleration.current.x)
        const deltaY = Math.abs(acceleration.y! - lastAcceleration.current.y)
        const deltaZ = Math.abs(acceleration.z! - lastAcceleration.current.z)

        const totalDelta = deltaX + deltaY + deltaZ

        // Detect shake if total change exceeds threshold
        if (totalDelta > threshold) {
          lastShakeTime.current = now
          onShake()
        }
      }

      lastAcceleration.current = {
        x: acceleration.x || 0,
        y: acceleration.y || 0,
        z: acceleration.z || 0,
      }
    }

    // Request permission (iOS 13+)
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      ;(DeviceMotionEvent as any)
        .requestPermission()
        .then((response: string) => {
          if (response === 'granted') {
            window.addEventListener('devicemotion', handleMotion)
          }
        })
        .catch(() => {
          // Permission denied or not supported
        })
    } else {
      // Android and older iOS
      window.addEventListener('devicemotion', handleMotion)
    }

    return () => {
      window.removeEventListener('devicemotion', handleMotion)
    }
  }, [threshold, debounceTime, onShake])
}
