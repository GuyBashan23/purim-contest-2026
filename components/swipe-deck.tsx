'use client'

import { useState } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import { X, Heart, Flame, ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Entry } from '@/components/costume-gallery'

interface SwipeDeckProps {
  entries: Entry[]
  onVote: (entryId: string, points: number) => void
  onSkip: (entryId: string) => void
  disabled?: boolean
}

const SWIPE_THRESHOLD = 50

export function SwipeDeck({ entries, onVote, onSkip, disabled = false }: SwipeDeckProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [exitX, setExitX] = useState<number>(0)
  const [direction, setDirection] = useState<'left' | 'right' | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const currentEntry = entries[currentIndex]
  const nextEntry = entries[currentIndex + 1]

  const handleSwipe = async (direction: 'left' | 'right', points?: number) => {
    if (disabled || !currentEntry || isProcessing) return

    setIsProcessing(true)
    setDirection(direction)
    setExitX(direction === 'right' ? 1000 : -1000)

    // Wait for animation, then process
    setTimeout(async () => {
      try {
        if (direction === 'right' && points) {
          await onVote(currentEntry.id, points)
        } else {
          onSkip(currentEntry.id)
        }

        // Move to next card
        if (currentIndex < entries.length - 1) {
          setCurrentIndex(currentIndex + 1)
          setDirection(null)
          setExitX(0)
        }
      } catch (error) {
        console.error('Swipe error:', error)
        // Reset on error
        setDirection(null)
        setExitX(0)
      } finally {
        setIsProcessing(false)
      }
    }, 300)
  }

  const handleButtonAction = (action: 'skip' | 'like' | 'super') => {
    if (action === 'skip') {
      handleSwipe('left')
    } else if (action === 'like') {
      handleSwipe('right', 10)
    } else if (action === 'super') {
      handleSwipe('right', 12)
    }
  }

  if (!currentEntry) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-white">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold mb-2">סיימת את כל התמונות!</h2>
        <p className="text-white/70">אין עוד תחפושות להצביע עליהן</p>
      </div>
    )
  }

  return (
    <div className="relative w-full max-w-md mx-auto h-[70vh] flex flex-col items-center justify-center">
      {/* Card Stack */}
      <div className="relative w-full h-full perspective-1000">
        {/* Next card (back of stack) */}
        {nextEntry && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0.5, rotate: -2 }}
            animate={{ scale: 0.9, opacity: 0.5, rotate: -2 }}
            className="absolute inset-0 w-full h-full rounded-3xl overflow-hidden shadow-2xl bg-slate-800"
          >
            <img
              src={nextEntry.image_url}
              alt={nextEntry.costume_title}
              className="w-full h-full object-cover"
            />
          </motion.div>
        )}

        {/* Current card (draggable) */}
        <AnimatePresence mode="wait">
          <SwipeCard
            key={currentEntry.id}
            entry={currentEntry}
            exitX={exitX}
            direction={direction}
            onSwipe={handleSwipe}
            disabled={disabled}
          />
        </AnimatePresence>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-6 mt-8 mb-4">
        <Button
          size="lg"
          variant="destructive"
          className="rounded-full w-16 h-16 p-0 shadow-lg hover:scale-110 transition-transform"
          onClick={() => handleButtonAction('skip')}
          disabled={disabled || isProcessing}
        >
          <X className="w-8 h-8" />
        </Button>

        <Button
          size="lg"
          className="rounded-full w-20 h-20 p-0 bg-gradient-to-r from-green-500 to-emerald-500 shadow-lg hover:scale-110 transition-transform"
          onClick={() => handleButtonAction('like')}
          disabled={disabled || isProcessing}
        >
          <Heart className="w-10 h-10 fill-white" />
        </Button>

        <Button
          size="lg"
          className="rounded-full w-20 h-20 p-0 bg-gradient-to-r from-orange-500 to-red-500 shadow-lg hover:scale-110 transition-transform"
          onClick={() => handleButtonAction('super')}
          disabled={disabled || isProcessing}
        >
          <Flame className="w-10 h-10 fill-white" />
        </Button>
      </div>

      {/* Instructions */}
      <p className="text-white/60 text-sm text-center mt-2">
        <span className="hidden sm:inline">גרור או לחץ על הכפתורים • </span>
        ❌ דלג • 💚 10 נקודות • 🔥 12 נקודות
      </p>
    </div>
  )
}

interface SwipeCardProps {
  entry: Entry
  exitX: number
  direction: 'left' | 'right' | null
  onSwipe: (direction: 'left' | 'right', points?: number) => void
  disabled: boolean
}

function SwipeCard({ entry, exitX, direction, onSwipe, disabled }: SwipeCardProps) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-300, 0, 300], [-25, 0, 25])
  const opacity = useTransform(x, [-300, -150, 0, 150, 300], [0, 1, 1, 1, 0])

  const handleDragEnd = (_event: any, info: any) => {
    if (disabled) return

    const offset = info.offset.x
    const velocity = info.velocity.x

    if (Math.abs(offset) > SWIPE_THRESHOLD || Math.abs(velocity) > 500) {
      const swipeDirection = offset > 0 ? 'right' : 'left'
      const points = swipeDirection === 'right' ? (Math.abs(offset) > 200 ? 12 : 10) : undefined
      onSwipe(swipeDirection, points)
    }
  }

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
      animate={
        exitX !== 0
          ? {
              x: exitX,
              opacity: 0,
              scale: 0.8,
              rotate: exitX > 0 ? 45 : -45,
            }
          : { x: 0, opacity: 1, scale: 1, rotate: 0 }
      }
      initial={{ scale: 0.9, opacity: 0, rotate: -10 }}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{ x, rotate, opacity }}
      className="absolute inset-0 w-full h-full rounded-3xl overflow-hidden shadow-2xl cursor-grab active:cursor-grabbing"
      whileDrag={{ cursor: 'grabbing' }}
    >
      {/* Image */}
      <div className="relative w-full h-full">
        {entry.image_url ? (
          <img
            src={entry.image_url}
            alt={entry.costume_title}
            className="w-full h-full object-cover"
            draggable={false}
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
            }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-white">
            תמונה לא זמינה
          </div>
        )}

        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

        {/* Vote Indicators */}
        {direction && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`absolute inset-0 flex items-center justify-center ${
              direction === 'right' ? 'bg-green-500/20' : 'bg-red-500/20'
            }`}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1.2 }}
              className={`text-6xl font-bold ${
                direction === 'right' ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {direction === 'right' ? '💚' : '❌'}
            </motion.div>
          </motion.div>
        )}

        {/* Card Info */}
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <h3 className="text-2xl sm:text-3xl font-bold mb-2 drop-shadow-lg">
            {entry.costume_title}
          </h3>
          <p className="text-white/90 text-sm sm:text-base mb-1 drop-shadow-md">{entry.name}</p>
          {entry.description && (
            <p className="text-white/80 text-xs sm:text-sm line-clamp-2 drop-shadow-md">
              {entry.description}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  )
}
