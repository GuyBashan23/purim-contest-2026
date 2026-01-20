'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface CountdownTimerProps {
  targetTime: string | number | null
  onComplete?: () => void
  label?: string
  variant?: 'default' | 'sticky' | 'compact'
  showLabel?: boolean
}

export function CountdownTimer({
  targetTime,
  onComplete,
  label = 'הזמן שנותר',
  variant = 'default',
  showLabel = true,
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number
    hours: number
    minutes: number
    seconds: number
  } | null>(null)
  const [isComplete, setIsComplete] = useState(false)
  const [prevValues, setPrevValues] = useState<{
    days: number
    hours: number
    minutes: number
    seconds: number
  } | null>(null)

  useEffect(() => {
    if (!targetTime) {
      setTimeLeft(null)
      return
    }

    const updateTimer = () => {
      const now = new Date().getTime()
      const target = typeof targetTime === 'string' 
        ? new Date(targetTime).getTime() 
        : targetTime
      const difference = target - now

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })
        setIsComplete(true)
        if (onComplete) {
          onComplete()
        }
        return
      }

      setIsComplete(false)
      
      // Calculate days, hours, minutes, seconds properly
      const days = Math.floor(difference / (1000 * 60 * 60 * 24))
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((difference % (1000 * 60)) / 1000)

      setPrevValues(timeLeft)
      setTimeLeft({ days, hours, minutes, seconds })
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [targetTime, onComplete, timeLeft])

  if (!targetTime || !timeLeft) {
    return null
  }

  // If complete, show "VOTING OPEN!" message
  if (isComplete && variant === 'sticky') {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-[#eb1801] via-[#FF6B35] to-[#eb1801] text-white py-4 px-4 shadow-2xl"
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="text-center font-bold text-xl flex items-center justify-center gap-2"
        >
          <motion.span
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
          >
            🎉
          </motion.span>
          <span>ההצבעה נפתחה!</span>
          <motion.span
            animate={{ rotate: [0, -10, 10, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
          >
            🎉
          </motion.span>
        </motion.div>
      </motion.div>
    )
  }

  if (isComplete) {
    return null
  }

  const { days, hours, minutes, seconds } = timeLeft

  if (variant === 'sticky') {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed top-0 left-0 right-0 z-50 bg-black/20 backdrop-blur-sm border-b border-white/10"
      >
        <div className="max-w-4xl mx-auto px-3 py-2">
          <div className="flex items-center justify-center gap-1 sm:gap-1.5">
            {days > 0 && (
              <>
                <TimeUnitMinimal value={days} label="י" isChanging={prevValues?.days !== days} />
                <SeparatorMinimal />
              </>
            )}
            <TimeUnitMinimal value={hours} label="ש" isChanging={prevValues?.hours !== hours} />
            <SeparatorMinimal />
            <TimeUnitMinimal value={minutes} label="ד" isChanging={prevValues?.minutes !== minutes} />
            <SeparatorMinimal />
            <TimeUnitMinimal value={seconds} label="שנ" isChanging={prevValues?.seconds !== seconds} />
          </div>
        </div>
      </motion.div>
    )
  }

  if (variant === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white/10 rounded-lg px-4 py-3 w-full border border-white/20"
      >
        <div className="flex items-center justify-center gap-1 sm:gap-1.5">
          {days > 0 && (
            <>
              <TimeUnitMinimal value={days} label="י" isChanging={prevValues?.days !== days} />
              <SeparatorMinimal />
            </>
          )}
          <TimeUnitMinimal value={hours} label="ש" isChanging={prevValues?.hours !== hours} />
          <SeparatorMinimal />
          <TimeUnitMinimal value={minutes} label="ד" isChanging={prevValues?.minutes !== minutes} />
          <SeparatorMinimal />
          <TimeUnitMinimal value={seconds} label="שנ" isChanging={prevValues?.seconds !== seconds} />
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/10 rounded-lg px-4 py-3 w-full border border-white/20"
    >
      <div className="flex items-center justify-center gap-1 sm:gap-1.5 flex-wrap">
        {days > 0 && (
          <>
            <TimeUnitMinimal value={days} label="י" isChanging={prevValues?.days !== days} />
            <SeparatorMinimal />
          </>
        )}
        <TimeUnitMinimal value={hours} label="ש" isChanging={prevValues?.hours !== hours} />
        <SeparatorMinimal />
        <TimeUnitMinimal value={minutes} label="ד" isChanging={prevValues?.minutes !== minutes} />
        <SeparatorMinimal />
        <TimeUnitMinimal value={seconds} label="שנ" isChanging={prevValues?.seconds !== seconds} />
      </div>
    </motion.div>
  )
}

function SeparatorMinimal() {
  return (
    <span className="text-lg sm:text-xl text-white/50 font-mono mx-0.5">
      :
    </span>
  )
}

function TimeUnitMinimal({ value, label, isChanging }: { value: number; label?: string; isChanging?: boolean }) {
  return (
    <motion.div
      key={`minimal-${value}-${label}`}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col items-center"
    >
      <motion.div
        animate={isChanging ? { scale: [1, 1.05, 1] } : {}}
        transition={{ duration: 0.3 }}
        className="bg-white/10 border border-white/20 rounded px-2.5 py-1.5 sm:px-3 sm:py-2 min-w-[45px] sm:min-w-[50px] text-center"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={value}
            initial={{ y: 5, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -5, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="text-lg sm:text-xl font-bold text-white font-mono tracking-tight"
          >
            {String(value).padStart(2, '0')}
          </motion.div>
        </AnimatePresence>
      </motion.div>
      {label && (
        <div className="text-[10px] sm:text-xs text-white/80 mt-1 uppercase tracking-wide">
          {label}
        </div>
      )}
    </motion.div>
  )
}
