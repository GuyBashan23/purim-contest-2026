'use client'

import { useEffect, useState } from 'react'
import { useContestPhase } from '@/lib/hooks/use-contest-phase'
import { getTopEntries } from '@/app/actions/contest'
import { Card, CardContent } from '@/components/ui/card'
import { Trophy, Medal, Award } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'

export default function WinnersPage() {
  const { phase } = useContestPhase()
  const [winners, setWinners] = useState<any[]>([])
  const [revealed, setRevealed] = useState<number[]>([])
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    if (phase === 'ENDED') {
      loadWinners()
    }
  }, [phase])

  useEffect(() => {
    if (winners.length === 3 && revealed.length === 0) {
      // Start sequential reveal
      setTimeout(() => revealPlace(3), 1000) // 3rd place after 1 second
      setTimeout(() => revealPlace(2), 3000) // 2nd place after 3 seconds
      setTimeout(() => revealPlace(1), 5000) // 1st place after 5 seconds
    }
  }, [winners, revealed])

  const loadWinners = async () => {
    const { data } = await getTopEntries(3)
    if (data && data.length >= 3) {
      // Reverse to show 3rd, 2nd, 1st
      setWinners([data[2], data[1], data[0]])
    }
  }

  const revealPlace = async (place: number) => {
    setRevealed((prev) => [...prev, place])
    
    if (place === 1) {
      // Fireworks for 1st place! - load confetti dynamically
      setTimeout(async () => {
        // Dynamic import confetti
        const confettiModule = await import('canvas-confetti')
        const confetti = confettiModule.default
        
        // Multiple confetti bursts
        const duration = 5000
        const animationEnd = Date.now() + duration
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, z: 0 }

        function randomInRange(min: number, max: number) {
          return Math.random() * (max - min) + min
        }

        const interval = setInterval(function () {
          const timeLeft = animationEnd - Date.now()

          if (timeLeft <= 0) {
            return clearInterval(interval)
          }

          const particleCount = 100 * (timeLeft / duration)
          
          // Left side
          confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
            colors: ['#FFD700', '#FFA500', '#FF6347', '#FF1493', '#00CED1'],
          })
          
          // Right side
          confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
            colors: ['#FFD700', '#FFA500', '#FF6347', '#FF1493', '#00CED1'],
          })
          
          // Center burst
          confetti({
            ...defaults,
            particleCount: 50,
            origin: { x: 0.5, y: 0.5 },
            colors: ['#FFD700', '#FFA500'],
          })
        }, 250)

        // Final big burst
        setTimeout(() => {
          confetti({
            particleCount: 500,
            spread: 100,
            origin: { y: 0.5 },
            colors: ['#FFD700', '#FFA500', '#FF6347', '#FF1493', '#00CED1'],
          })
        }, 2000)
      }, 500)
      
      // Show all after fireworks
      setTimeout(() => setShowAll(true), 3000)
    }
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-20 w-20 text-yellow-400" />
    if (rank === 2) return <Medal className="h-20 w-20 text-gray-300" />
    if (rank === 3) return <Award className="h-20 w-20 text-amber-600" />
    return null
  }

  const getRankLabel = (rank: number) => {
    if (rank === 1) return 'מקום ראשון 🏆'
    if (rank === 2) return 'מקום שני 🥈'
    if (rank === 3) return 'מקום שלישי 🥉'
    return ''
  }

  const getRankFromIndex = (index: number) => {
    // Winners array is reversed: [3rd, 2nd, 1st]
    return 3 - index
  }

  if (phase !== 'ENDED') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-white">הזוכים טרם הוכרזו</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4 md:p-8 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-96 h-96 bg-yellow-400/10 rounded-full blur-3xl"
            animate={{
              x: [0, 100, 0],
              y: [0, -100, 0],
              scale: [1, 1.3, 1],
            }}
            transition={{
              duration: 8 + i * 2,
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

      <div className="max-w-6xl w-full relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <motion.h1
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-6xl md:text-7xl font-bold mb-4 text-white drop-shadow-2xl"
          >
            הזוכים! 🎉
          </motion.h1>
          <p className="text-3xl text-white/90 drop-shadow-lg">
            תודה לכל המשתתפים!
          </p>
        </motion.div>

        {/* Winners Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {winners.map((winner, index) => {
            const rank = getRankFromIndex(index)
            const isRevealed = revealed.includes(rank) || showAll
            
            return (
              <AnimatePresence key={winner.id}>
                {isRevealed && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5, y: 100, rotate: -180 }}
                    animate={{ 
                      opacity: 1, 
                      scale: 1, 
                      y: 0, 
                      rotate: 0,
                      transition: {
                        type: 'spring',
                        stiffness: 100,
                        damping: 15,
                        delay: rank === 1 ? 0.5 : 0,
                      }
                    }}
                    whileHover={{ scale: rank === 1 ? 1.1 : 1.05, y: -10 }}
                    className={rank === 1 ? 'md:col-span-3' : ''}
                  >
                    <Card className={`glass h-full overflow-hidden border-2 ${
                      rank === 1 
                        ? 'border-yellow-400 shadow-[0_0_50px_rgba(255,215,0,0.5)]' 
                        : rank === 2 
                        ? 'border-gray-300 shadow-[0_0_30px_rgba(192,192,192,0.3)]'
                        : 'border-amber-600 shadow-[0_0_30px_rgba(217,119,6,0.3)]'
                    }`}>
                      <CardContent className="p-8 text-center relative">
                        {/* Spotlight effect for 1st place */}
                        {rank === 1 && (
                          <motion.div
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute inset-0 bg-gradient-to-br from-yellow-400/20 via-yellow-400/10 to-transparent pointer-events-none rounded-lg"
                          />
                        )}
                        
                        {/* Rank Icon */}
                        <motion.div
                          animate={rank === 1 ? { 
                            scale: [1, 1.2, 1],
                            rotate: [0, 10, -10, 0]
                          } : {}}
                          transition={{ 
                            duration: 2, 
                            repeat: Infinity,
                            ease: 'easeInOut'
                          }}
                          className="flex justify-center mb-6"
                        >
                          {getRankIcon(rank)}
                        </motion.div>
                        
                        {/* Rank Label */}
                        <motion.h2
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.3, type: 'spring' }}
                          className={`text-3xl md:text-4xl font-bold mb-4 ${
                            rank === 1 ? 'text-yellow-400' : rank === 2 ? 'text-gray-300' : 'text-amber-600'
                          }`}
                        >
                          {getRankLabel(rank)}
                        </motion.h2>
                        
                        {/* Image */}
                        <motion.div
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ delay: 0.5, type: 'spring' }}
                          className="relative h-64 md:h-80 w-full rounded-lg overflow-hidden mb-6 shadow-2xl"
                        >
                          {winner.image_url ? (
                            <Image
                              src={winner.image_url}
                              alt={winner.costume_title}
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 100vw, 33vw"
                              loading="lazy"
                              unoptimized={winner.image_url?.includes('supabase.co')}
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-white">
                              תמונה לא זמינה
                            </div>
                          )}
                        </motion.div>
                        
                        {/* Title */}
                        <motion.h3
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.7 }}
                          className="text-2xl md:text-3xl font-semibold mb-2 text-white"
                        >
                          {winner.costume_title}
                        </motion.h3>
                        
                        {/* Name */}
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.9 }}
                          className="text-xl text-white/80 mb-4"
                        >
                          {winner.name}
                        </motion.p>
                        
                        {/* Score */}
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 1.1, type: 'spring' }}
                          className={`text-4xl md:text-5xl font-bold ${
                            rank === 1 ? 'text-yellow-400' : rank === 2 ? 'text-gray-300' : 'text-amber-600'
                          }`}
                        >
                          {winner.total_score} נקודות
                        </motion.div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            )
          })}
        </div>
      </div>
    </div>
  )
}
