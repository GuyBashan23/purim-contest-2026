'use client'

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle } from 'lucide-react'

interface UploadSuccessScreenProps {
  onClose?: () => void
}

export function UploadSuccessScreen({ onClose }: UploadSuccessScreenProps) {
  const router = useRouter()

  // Trigger confetti on mount - dynamic import to reduce bundle size
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const timeoutId = setTimeout(() => {
        import('canvas-confetti').then((confettiModule) => {
          confettiModule.default({
            particleCount: 200,
            spread: 100,
            origin: { y: 0.6 },
            colors: ['#eb1801', '#FF6B35', '#FFD700'],
          })
        })
      }, 300)

      return () => clearTimeout(timeoutId)
    }
  }, [])

  const handleGoToGallery = () => {
    router.push('/gallery')
  }

  const handleGoHome = () => {
    router.push('/')
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 100 }}
        className="w-full max-w-md text-center space-y-8"
      >
        {/* Success Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="flex justify-center"
        >
          <div className="relative">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 1 }}
              className="absolute inset-0 bg-green-500/30 rounded-full blur-xl"
            />
            <div className="relative w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-2xl">
              <CheckCircle className="h-16 w-16 text-white" strokeWidth={2} />
            </div>
          </div>
        </motion.div>

        {/* Success Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-4"
        >
          <h1 className="text-4xl font-bold text-white drop-shadow-lg">
            הצלחה! 🎉
          </h1>
          <p className="text-xl text-white/90">
            התמונה נשלחה בהצלחה!
          </p>
          <p className="text-lg text-white/70">
            תודה שהצטרפת לתחרות
          </p>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="space-y-4 pt-4"
        >
          <Button
            onClick={handleGoToGallery}
            className="w-full h-16 text-lg font-bold bg-gradient-to-r from-[#eb1801] to-[#FF6B35] hover:from-[#FF6B35] hover:to-[#eb1801] text-white border-0 shadow-2xl"
          >
            📸 לך לגלריה
          </Button>
          <Button
            onClick={handleGoHome}
            variant="outline"
            className="w-full h-16 text-lg font-semibold glass border-white/30 text-white hover:bg-white/10"
          >
            🏠 חזור לדף הבית
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
