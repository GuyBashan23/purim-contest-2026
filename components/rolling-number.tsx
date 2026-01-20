'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface RollingNumberProps {
  value: number
  className?: string
}

export function RollingNumber({ value, className = '' }: RollingNumberProps) {
  const [displayValue, setDisplayValue] = useState(value)
  const previousValueRef = useRef(value)

  useEffect(() => {
    // Only animate if value actually changed
    if (value === previousValueRef.current) return

    // Animate to new value
    const startValue = previousValueRef.current
    const endValue = value
    const difference = endValue - startValue

    previousValueRef.current = value

    const duration = Math.min(Math.abs(difference) * 20, 1000) // Max 1 second
    const steps = Math.ceil(duration / 16) // ~60fps
    let currentStep = 0

    const interval = setInterval(() => {
      currentStep++
      const progress = currentStep / steps
      const easeProgress = 1 - Math.pow(1 - progress, 3) // Ease out cubic
      setDisplayValue(Math.round(startValue + difference * easeProgress))

      if (currentStep >= steps) {
        setDisplayValue(value)
        clearInterval(interval)
      }
    }, 16)

    return () => clearInterval(interval)
  }, [value])

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={displayValue}
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 10, opacity: 0 }}
        transition={{ duration: 0.15 }}
        className={`inline-block tabular-nums ${className}`}
      >
        {displayValue}
      </motion.span>
    </AnimatePresence>
  )
}
