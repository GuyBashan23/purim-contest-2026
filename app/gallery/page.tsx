'use client'

import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { CostumeGallery } from '@/components/costume-gallery'
import { CountdownTimer } from '@/components/countdown-timer'
import { HypeReactionButtons } from '@/components/hype-reaction-buttons'
import { NavigationHeader } from '@/components/navigation-header'
import { useContestPhase } from '@/lib/hooks/use-contest-phase'
import { useShakeDetection } from '@/lib/hooks/use-shake-detection'
import { TARGET_DATE } from '@/lib/config'
import { motion } from 'framer-motion'
import Image from 'next/image'

// Dynamic import for confetti (heavy library, non-critical)
// Load only on client-side, not during SSR
const confetti = dynamic(
  () => import('canvas-confetti').then((mod) => mod.default),
  { ssr: false }
)

export default function GalleryPage() {
  const { phase, isVotingOpen } = useContestPhase()

  // Shake to celebrate
  useShakeDetection({
    threshold: 20,
    onShake: async () => {
      // Dynamic import confetti only when needed
      const confettiModule = await import('canvas-confetti')
      const confetti = confettiModule.default
      
      // Trigger confetti explosion
      confetti({
        particleCount: 300,
        spread: 120,
        origin: { y: 0.5 },
        colors: ['#FFD700', '#FFA500', '#FF6347', '#FF1493', '#00CED1'],
      })
    },
  })

  return (
    <div className="w-full">
      {/* Global Countdown Timer - Sticky */}
      {!isVotingOpen && (
        <CountdownTimer
          targetTime={TARGET_DATE}
          variant="sticky"
          label="הזמן שנותר עד תחילת ההצבעה"
        />
      )}

      {/* Add padding top if timer is showing */}
      <div className={!isVotingOpen ? 'pt-16' : ''}>
        {/* Navigation Header */}
        <NavigationHeader title="גלריית התחפושות" />

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex justify-center mb-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="relative w-24 h-24"
            >
              <Image
                src="/assets/logo.svg"
                alt="J&J MedTech Logo"
                fill
                sizes="96px"
                className="object-contain drop-shadow-2xl"
                priority
              />
            </motion.div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-2 text-white drop-shadow-lg">
            גלריית התחפושות
          </h1>
          <p className="text-xl text-white/90 drop-shadow-md">
            {isVotingOpen 
              ? 'ההצבעה נפתחה! בחר את התחפושות המועדפות עליך'
              : 'הצגת התחפושות - ההצבעה תיפתח בקרוב'
            }
          </p>
        </motion.div>

        {/* Gallery - Read-only before voting opens */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <CostumeGallery readOnly={!isVotingOpen} showScores={isVotingOpen} />
        </motion.div>
      </div>

      {/* Floating Reaction Buttons */}
      <HypeReactionButtons />
    </div>
  )
}
