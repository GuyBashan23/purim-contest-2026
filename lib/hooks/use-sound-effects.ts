'use client'

import { useState, useEffect, useCallback } from 'react'

export type SoundEffect = 
  | 'douze-points' 
  | 'upload-success' 
  | 'phase-change' 
  | 'reaction'
  | 'confetti'

interface SoundConfig {
  volume: number
  muted: boolean
}

/**
 * Hook for playing sound effects
 * Uses Web Audio API for simple sound generation or can load audio files
 */
export function useSoundEffects() {
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(0.7)

  // Generate simple tones using Web Audio API
  const playTone = useCallback((frequency: number, duration: number, type: OscillatorType = 'sine') => {
    if (muted) return

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.value = frequency
    oscillator.type = type

    gainNode.gain.setValueAtTime(0, audioContext.currentTime)
    gainNode.gain.linearRampToValueAtTime(volume * 0.3, audioContext.currentTime + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + duration)
  }, [muted, volume])

  // Play sound effects
  const playSound = useCallback((effect: SoundEffect) => {
    if (muted) return

    switch (effect) {
      case 'douze-points':
        // Jackpot/Win sound - ascending notes
        playTone(523.25, 0.1, 'sine') // C5
        setTimeout(() => playTone(659.25, 0.1, 'sine'), 100) // E5
        setTimeout(() => playTone(783.99, 0.2, 'sine'), 200) // G5
        setTimeout(() => playTone(1046.50, 0.3, 'sine'), 300) // C6
        break

      case 'upload-success':
        // Success chime - pleasant chord
        playTone(523.25, 0.2, 'sine') // C5
        playTone(659.25, 0.2, 'sine') // E5
        playTone(783.99, 0.2, 'sine') // G5
        break

      case 'phase-change':
        // Dramatic gong - low frequency with decay
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()

        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)

        oscillator.frequency.value = 100
        oscillator.type = 'sine'

        gainNode.gain.setValueAtTime(volume * 0.5, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1)

        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 1)
        break

      case 'reaction':
        // Quick pop sound
        playTone(800, 0.1, 'square')
        break

      case 'confetti':
        // Celebration - multiple quick tones
        for (let i = 0; i < 5; i++) {
          setTimeout(() => {
            playTone(400 + Math.random() * 400, 0.1, 'sine')
          }, i * 50)
        }
        break
    }
  }, [muted, volume, playTone])

  const toggleMute = useCallback(() => {
    setMuted((prev) => !prev)
  }, [])

  return {
    playSound,
    muted,
    toggleMute,
    volume,
    setVolume,
  }
}
