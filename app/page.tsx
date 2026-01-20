'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { CountdownTimer } from '@/components/countdown-timer'
import { useContestPhase } from '@/lib/hooks/use-contest-phase'
import { TARGET_DATE } from '@/lib/config'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { Camera, Eye, HelpCircle } from 'lucide-react'

// Dynamic import for FAQModal (non-critical, heavy component)
const FAQModal = dynamic(() => import('@/components/faq-modal').then((mod) => mod.FAQModal), {
  ssr: false,
  loading: () => null, // Don't show loading state for modal
})

export default function HomePage() {
  const { phase, isVotingOpen } = useContestPhase()
  const [isFAQOpen, setIsFAQOpen] = useState(false)

  return (
    <div className="w-full min-h-screen flex flex-col relative z-10 pointer-events-auto">
      {/* FAQ Help Button - Fixed Position */}
      <motion.button
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6, type: 'spring' }}
        whileHover={{ scale: 1.1, rotate: 15 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsFAQOpen(true)}
        className="fixed top-2 left-2 sm:top-4 sm:left-4 z-50 p-2 sm:p-3 rounded-full glass border-2 border-yellow-400/50 hover:border-yellow-400 bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-300 transition-all min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] flex items-center justify-center shadow-lg"
        aria-label="Help / FAQ"
      >
        <HelpCircle className="h-4 w-4 sm:h-5 sm:w-5" />
      </motion.button>

      {/* Global Countdown Timer - Sticky */}
      {!isVotingOpen && (
        <CountdownTimer
          targetTime={TARGET_DATE}
          variant="sticky"
          label="הזמן שנותר עד תחילת ההצבעה"
        />
      )}

      {/* Add padding top if timer is showing */}
      <div className={`flex-1 flex flex-col justify-center ${!isVotingOpen ? 'pt-12 sm:pt-16' : ''}`}>
        {/* Logo Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6 sm:mb-12"
        >
          <div className="flex justify-center mb-3 sm:mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="relative w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32"
            >
              <Image
                src="/assets/logo.svg"
                alt="J&J MedTech Logo"
                fill
                sizes="(max-width: 640px) 80px, 128px"
                className="object-contain drop-shadow-2xl"
                priority
              />
            </motion.div>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-1 sm:mb-2 text-white drop-shadow-lg px-2">
            J&J MedTech Purim 2026
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-white/90 drop-shadow-md px-2">
            תחרות תחפושות פורים
          </p>
        </motion.div>

        {/* Choice Cards */}
        <div className="flex flex-col gap-3 sm:gap-4 md:gap-6 w-full">
          {/* Participate Card */}
          <Link 
            href="/upload" 
            className="block w-full"
            style={{ display: 'block' }}
          >
            <motion.div
              initial={{ opacity: 0, x: -100 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: 'spring', delay: 0.4, stiffness: 100 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="relative h-[32vh] min-h-[200px] sm:h-[36vh] sm:min-h-[240px] md:h-[40vh] md:min-h-[280px] rounded-2xl sm:rounded-3xl overflow-hidden cursor-pointer shadow-2xl group w-full"
              style={{
                background: 'linear-gradient(135deg, #eb1801 0%, #FF6B35 100%)',
              }}
            >
            {/* Pulsing animation */}
            <motion.div
              animate={{
                scale: [1, 1.05, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="absolute inset-0 bg-white/20 rounded-2xl sm:rounded-3xl pointer-events-none"
            />
            
            <div className="relative z-10 h-full flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 text-white pointer-events-none">
              <motion.div
                whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                transition={{ duration: 0.5 }}
                className="mb-3 sm:mb-4 md:mb-6"
              >
                <Camera className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 drop-shadow-lg" strokeWidth={2} />
              </motion.div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 sm:mb-3 md:mb-4 drop-shadow-lg text-center px-2">
                אני מתחפש!
              </h2>
              <p className="text-base sm:text-lg md:text-xl lg:text-2xl opacity-90 drop-shadow-md text-center px-2">
                השתתף בתחרות
              </p>
            </div>
            </motion.div>
          </Link>

          {/* Spectator Card */}
          <Link 
            href="/gallery" 
            className="block w-full"
            style={{ display: 'block' }}
          >
            <motion.div
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: 'spring', delay: 0.5, stiffness: 100 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="relative h-[32vh] min-h-[200px] sm:h-[36vh] sm:min-h-[240px] md:h-[40vh] md:min-h-[280px] rounded-2xl sm:rounded-3xl overflow-hidden cursor-pointer shadow-2xl group backdrop-blur-xl w-full"
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '2px solid rgba(255, 255, 255, 0.2)',
              }}
            >
            <div className="relative z-10 h-full flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 text-white pointer-events-none">
              <motion.div
                whileHover={{ scale: 1.1 }}
                transition={{ duration: 0.3 }}
                className="mb-3 sm:mb-4 md:mb-6"
              >
                <Eye className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 drop-shadow-lg" strokeWidth={2} />
              </motion.div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 sm:mb-3 md:mb-4 drop-shadow-lg text-center px-2">
                הראה לי את התחפושות
              </h2>
              <p className="text-base sm:text-lg md:text-xl lg:text-2xl opacity-90 drop-shadow-md text-center px-2">
                צפה בגלריה
              </p>
            </div>
            </motion.div>
          </Link>
        </div>
      </div>

      {/* FAQ Modal */}
      <FAQModal isOpen={isFAQOpen} onClose={() => setIsFAQOpen(false)} />
    </div>
  )
}
