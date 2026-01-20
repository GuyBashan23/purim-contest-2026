'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'

const VERDICTS = [
  'High Energy ⚡',
  'Approved by CEO 👔',
  'Spicy 🌶️',
  'Winner Vibes 🏆',
  'Purim Approved 🎭',
  'Legendary Status ⭐',
  'Top Tier 🔥',
  'Costume Master 🎪',
]

interface AIScannerProps {
  imageSrc: string | null
  onComplete: () => void
  onVerdict: (verdict: string) => void
}

export function AIScanner({ imageSrc, onComplete, onVerdict }: AIScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [verdict, setVerdict] = useState<string | null>(null)
  const [scanPosition, setScanPosition] = useState(0)

  useEffect(() => {
    if (imageSrc) {
      setIsScanning(true)
      setVerdict(null)
      setScanPosition(0)

      // Animate scan line
      const scanInterval = setInterval(() => {
        setScanPosition((prev) => {
          if (prev >= 100) {
            clearInterval(scanInterval)
            return 100
          }
          return prev + 2
        })
      }, 30)

      // Track nested timeout ID for cleanup
      let completeTimeoutId: NodeJS.Timeout | null = null

      // Show verdict after 2 seconds
      const verdictTimeout = setTimeout(() => {
        const randomVerdict = VERDICTS[Math.floor(Math.random() * VERDICTS.length)]
        setVerdict(randomVerdict)
        onVerdict(randomVerdict)
        setIsScanning(false)

        // Complete after showing verdict
        completeTimeoutId = setTimeout(() => {
          onComplete()
        }, 1500)
      }, 2000)

      return () => {
        clearInterval(scanInterval)
        clearTimeout(verdictTimeout)
        if (completeTimeoutId) {
          clearTimeout(completeTimeoutId)
        }
      }
    }
  }, [imageSrc, onComplete, onVerdict])

  if (!imageSrc) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <div className="relative w-full max-w-md">
          {/* Image Container */}
          <div className="relative rounded-2xl overflow-hidden border-4 border-green-500/50 shadow-2xl">
            <img
              src={imageSrc}
              alt="Scanning"
              className="w-full h-auto"
            />

            {/* Scanning Overlay */}
            {isScanning && (
              <>
                {/* Scan Line */}
                <motion.div
                  className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent shadow-[0_0_20px_rgba(34,197,94,0.8)]"
                  style={{
                    top: `${scanPosition}%`,
                  }}
                />

                {/* Grid Overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-green-500/10 via-transparent to-green-500/10" />

                {/* Corner Brackets */}
                <div className="absolute top-4 left-4 w-12 h-12 border-t-4 border-l-4 border-green-400" />
                <div className="absolute top-4 right-4 w-12 h-12 border-t-4 border-r-4 border-green-400" />
                <div className="absolute bottom-4 left-4 w-12 h-12 border-b-4 border-l-4 border-green-400" />
                <div className="absolute bottom-4 right-4 w-12 h-12 border-b-4 border-r-4 border-green-400" />
              </>
            )}

            {/* Verdict Stamp */}
            {verdict && (
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-yellow-400 text-black font-bold text-2xl px-6 py-3 rounded-lg border-4 border-red-500 shadow-2xl transform rotate-12"
                style={{
                  textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
                }}
              >
                {verdict}
              </motion.div>
            )}
          </div>

          {/* Status Text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mt-6"
          >
            {isScanning ? (
              <motion.p
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="text-green-400 text-xl font-bold"
              >
                🔍 AI Scanning...
              </motion.p>
            ) : verdict ? (
              <motion.p
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-yellow-400 text-xl font-bold"
              >
                ✓ Analysis Complete!
              </motion.p>
            ) : null}
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
