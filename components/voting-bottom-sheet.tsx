'use client'

import { motion, AnimatePresence } from 'framer-motion'

interface VotingBottomSheetProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (points: number) => void
}

export function VotingBottomSheet({ isOpen, onClose, onSelect }: VotingBottomSheetProps) {
  const handleSelect = async (points: number) => {
    // Confetti explosion - dynamic import to reduce bundle size
    const confettiModule = await import('canvas-confetti')
    const confetti = confettiModule.default
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#eb1801', '#FF6B35', '#6A1B9A', '#FF1744'],
    })
    onSelect(points)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-50 glass rounded-t-3xl p-6 max-w-md mx-auto"
          >
            <div className="flex flex-col gap-4">
              <div className="flex justify-center mb-2">
                <div className="w-12 h-1 bg-white/30 rounded-full" />
              </div>
              <h3 className="text-2xl font-bold text-center mb-4 text-white">בחר נקודות</h3>
              {[12, 10, 8].map((points) => (
                <motion.button
                  key={points}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    handleSelect(points)
                    onClose()
                  }}
                  className="glass rounded-2xl p-6 text-2xl font-bold text-white border-2 border-transparent hover:border-yellow-400 hover:shadow-[0_0_20px_rgba(255,215,0,0.5)] transition-all"
                >
                  {points === 12 ? '👑 Douze Points!' : `${points} נקודות`}
                </motion.button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
