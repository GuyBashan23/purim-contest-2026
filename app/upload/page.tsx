'use client'

import { UploadForm } from '@/components/upload-form'
import { CountdownTimer } from '@/components/countdown-timer'
import { NavigationHeader } from '@/components/navigation-header'
import { useContestPhase } from '@/lib/hooks/use-contest-phase'
import { TARGET_DATE } from '@/lib/config'
import { motion } from 'framer-motion'
import Image from 'next/image'

export default function UploadPage() {
  const { phase, isVotingOpen } = useContestPhase()

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
        <NavigationHeader title="העלאת תמונה" />

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
              className="relative w-32 h-32"
            >
              <Image
                src="/assets/logo.svg"
                alt="J&J MedTech Logo"
                fill
                sizes="128px"
                className="object-contain drop-shadow-2xl"
                priority
              />
            </motion.div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-2 text-white drop-shadow-lg">
            J&J MedTech Purim 2026
          </h1>
          <p className="text-xl text-white/90 drop-shadow-md">
            תחרות תחפושות פורים
          </p>
        </motion.div>

        {/* Upload Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <UploadForm />
        </motion.div>
      </div>
    </div>
  )
}
