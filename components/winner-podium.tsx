'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Medal, Award } from 'lucide-react'
import type { Entry } from '@/components/costume-gallery'

interface WinnerPodiumProps {
  onComplete?: () => void
}

export function WinnerPodium({ onComplete }: WinnerPodiumProps) {
  const [winners, setWinners] = useState<Entry[]>([])

  useEffect(() => {
    fetchWinners()
    
    // Continuous fireworks - load confetti dynamically
    let fireworkInterval: NodeJS.Timeout | null = null
    
    const startFireworks = async () => {
      const confettiModule = await import('canvas-confetti')
      const confetti = confettiModule.default
      
      fireworkInterval = setInterval(() => {
        // Left side
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { x: 0.1, y: 0.8 },
          colors: ['#FFD700', '#FFA500', '#FF6347', '#FF1493', '#00CED1'],
        })
        
        // Right side
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { x: 0.9, y: 0.8 },
          colors: ['#FFD700', '#FFA500', '#FF6347', '#FF1493', '#00CED1'],
        })
        
        // Center burst
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { x: 0.5, y: 0.7 },
          colors: ['#FFD700', '#FFA500'],
        })
      }, 2000)
    }
    
    startFireworks()

    return () => {
      if (fireworkInterval) {
        clearInterval(fireworkInterval)
      }
    }
  }, [])

  const fetchWinners = async () => {
    try {
      const { data, error } = await supabase
        .from('entries')
        .select('*')
        .order('total_score', { ascending: false })
        .limit(3)

      if (error) throw error
      if (data && data.length >= 3) {
        // Reverse to show 3rd, 2nd, 1st
        setWinners([data[2], data[1], data[0]])
      }
    } catch (error) {
      console.error('Error fetching winners:', error)
    }
  }

  const getRankLabel = (rank: number) => {
    if (rank === 1) return 'מקום ראשון 🏆'
    if (rank === 2) return 'מקום שני 🥈'
    if (rank === 3) return 'מקום שלישי 🥉'
    return ''
  }

  const getRankHeight = (rank: number) => {
    if (rank === 1) return 'h-64'
    if (rank === 2) return 'h-48'
    if (rank === 3) return 'h-40'
    return 'h-32'
  }

  const getRankGradient = (rank: number) => {
    if (rank === 1) return 'from-yellow-400 via-yellow-500 to-yellow-600'
    if (rank === 2) return 'from-gray-300 via-gray-400 to-gray-500'
    if (rank === 3) return 'from-amber-600 via-amber-700 to-amber-800'
    return 'from-slate-600 to-slate-700'
  }

  if (winners.length < 3) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-white text-2xl">טוען זוכים...</p>
      </div>
    )
  }

  return (
    <div className="relative h-full flex items-end justify-center gap-8 px-8 pb-16">
      {/* Background Fireworks Effect */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-yellow-400 rounded-full"
            initial={{
              x: `${50 + (i % 10) * 5}%`,
              y: '100%',
              opacity: 0,
            }}
            animate={{
              y: '-20%',
              opacity: [0, 1, 1, 0],
              scale: [0, 1, 1, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: 'easeOut',
            }}
          />
        ))}
      </div>

      {/* 2nd Place (Left) */}
      <motion.div
        initial={{ opacity: 0, y: 100, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 100 }}
        className="flex flex-col items-center"
      >
        <div className={`w-48 ${getRankHeight(2)} bg-gradient-to-t ${getRankGradient(2)} rounded-t-2xl shadow-2xl flex flex-col items-center justify-center p-4 mb-4 relative`}>
          <Medal className="h-12 w-12 text-white mb-2" />
          <p className="text-white font-bold text-lg">2</p>
        </div>
        <div className="text-center">
          <h3 className="text-2xl font-bold text-white mb-2">{winners[1]?.costume_title}</h3>
          <p className="text-white/80">{winners[1]?.name}</p>
          <p className="text-3xl font-bold text-gray-300 mt-2">{winners[1]?.total_score}</p>
        </div>
      </motion.div>

      {/* 1st Place (Center - Biggest) */}
      <motion.div
        initial={{ opacity: 0, y: 100, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 100 }}
        className="flex flex-col items-center relative"
      >
        {/* Crown Effect */}
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-12 z-10"
        >
          <Trophy className="h-16 w-16 text-yellow-400 drop-shadow-2xl" />
        </motion.div>

        <div className={`w-64 ${getRankHeight(1)} bg-gradient-to-t ${getRankGradient(1)} rounded-t-2xl shadow-2xl flex flex-col items-center justify-center p-6 mb-4 relative overflow-hidden`}>
          {/* Shine effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            animate={{
              x: ['-100%', '200%'],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <Trophy className="h-16 w-16 text-white mb-2 relative z-10" />
          <p className="text-white font-bold text-2xl relative z-10">1</p>
        </div>
        <div className="text-center">
          <h3 className="text-3xl font-bold text-white mb-2">{winners[0]?.costume_title}</h3>
          <p className="text-white/80 text-lg">{winners[0]?.name}</p>
          <p className="text-4xl font-bold text-yellow-400 mt-2">{winners[0]?.total_score}</p>
        </div>
      </motion.div>

      {/* 3rd Place (Right) */}
      <motion.div
        initial={{ opacity: 0, y: 100, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.4, type: 'spring', stiffness: 100 }}
        className="flex flex-col items-center"
      >
        <div className={`w-40 ${getRankHeight(3)} bg-gradient-to-t ${getRankGradient(3)} rounded-t-2xl shadow-2xl flex flex-col items-center justify-center p-4 mb-4`}>
          <Award className="h-10 w-10 text-white mb-2" />
          <p className="text-white font-bold text-lg">3</p>
        </div>
        <div className="text-center">
          <h3 className="text-xl font-bold text-white mb-2">{winners[2]?.costume_title}</h3>
          <p className="text-white/80">{winners[2]?.name}</p>
          <p className="text-2xl font-bold text-amber-600 mt-2">{winners[2]?.total_score}</p>
        </div>
      </motion.div>
    </div>
  )
}
