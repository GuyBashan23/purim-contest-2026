'use client'

import { useState, useEffect } from 'react'
import { useContestPhase } from '@/lib/hooks/use-contest-phase'
import { BarChartRace } from '@/components/bar-chart-race'
import { WinnerPodium } from '@/components/winner-podium'
import { FloatingReactions } from '@/components/floating-reactions'
import { motion, AnimatePresence } from 'framer-motion'

export default function LivePage() {
  const { phase } = useContestPhase()
  const [showTitle, setShowTitle] = useState(true)

  const getTitle = () => {
    switch (phase) {
      case 'UPLOAD':
        return 'ההעלאה החלה!'
      case 'VOTING':
        return 'THE RACE IS ON! 🏁'
      case 'FINALS':
        return 'שלב הגמר!'
      case 'ENDED':
        return 'הזוכים! 🏆'
      default:
        return 'לוח תוצאות חי'
    }
  }

  const isWinnerMode = phase === 'ENDED'

  return (
    <div className="h-[100dvh] w-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"
            animate={{
              x: [0, 100, 0],
              y: [0, -100, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 20 + i * 5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              left: `${10 + i * 20}%`,
              top: `${10 + i * 15}%`,
            }}
          />
        ))}
      </div>

      {/* Floating Reactions Overlay */}
      <FloatingReactions />

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-8 left-0 right-0 z-20 text-center"
      >
        <motion.h1
          animate={{
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="text-7xl md:text-9xl font-black text-white drop-shadow-2xl mb-4"
          style={{
            textShadow: '0 0 40px rgba(255,255,255,0.5), 0 0 80px rgba(235,24,1,0.3)',
          }}
        >
          {getTitle()}
        </motion.h1>
        <p className="text-2xl md:text-3xl text-white/80 drop-shadow-lg">
          J&J MedTech Purim 2026
        </p>
      </motion.div>

      {/* Content */}
      <div className="h-full pt-32 pb-8 px-8 relative z-10 overflow-hidden">
        <AnimatePresence mode="wait">
          {isWinnerMode ? (
            <motion.div
              key="winners"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.5 }}
              className="h-full"
            >
              <WinnerPodium />
            </motion.div>
          ) : (
            <motion.div
              key="race"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              transition={{ duration: 0.5 }}
              className="h-full overflow-y-auto scrollbar-hide"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              <div className="max-w-6xl mx-auto">
                <BarChartRace limit={10} phase={phase} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  )
}

