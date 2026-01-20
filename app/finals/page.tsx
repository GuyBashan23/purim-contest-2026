'use client'

import { useEffect, useState } from 'react'
import { useContestPhase } from '@/lib/hooks/use-contest-phase'
import { VotingSelector } from '@/components/voting-selector'
import { LeaderboardChart } from '@/components/leaderboard-chart'
import { getTop3Finalists } from '@/app/actions/contest'
import { motion, AnimatePresence } from 'framer-motion'
import type { Entry } from '@/components/costume-gallery'
import { Trophy, Sparkles } from 'lucide-react'

export default function FinalsPage() {
  const { phase } = useContestPhase()
  const [finalists, setFinalists] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [showTransition, setShowTransition] = useState(true)

  useEffect(() => {
    if (phase === 'FINALS') {
      loadFinalists()
      // Hide transition after animation
      setTimeout(() => setShowTransition(false), 2000)
    }
  }, [phase])

  const loadFinalists = async () => {
    setLoading(true)
    const { data } = await getTop3Finalists()
    if (data) {
      setFinalists(data)
    }
    setLoading(false)
  }

  if (phase !== 'FINALS') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-white">שלב הגמר טרם החל</p>
          <p className="text-white/60 mt-2">המתן עד שהמנהל יפעיל את שלב הגמר</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900 to-gray-900 relative overflow-hidden">
      {/* Animated background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"
            animate={{
              x: [0, 100, 0],
              y: [0, -100, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 10 + i * 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              left: `${20 + i * 30}%`,
              top: `${10 + i * 20}%`,
            }}
          />
        ))}
      </div>

      {/* Voting Closed Transition */}
      <AnimatePresence>
        {showTransition && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/90"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.2, opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center"
            >
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="mb-8"
              >
                <Trophy className="h-24 w-24 text-yellow-400 mx-auto" />
              </motion.div>
              <h1 className="text-6xl font-bold text-white mb-4 drop-shadow-2xl">
                ההצבעה נסגרה!
              </h1>
              <p className="text-2xl text-white/80 mb-8">
                שלב הגמר מתחיל...
              </p>
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="flex justify-center gap-2"
              >
                <Sparkles className="h-8 w-8 text-yellow-400" />
                <Sparkles className="h-8 w-8 text-yellow-400" />
                <Sparkles className="h-8 w-8 text-yellow-400" />
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-block mb-6"
          >
            <Trophy className="h-16 w-16 text-yellow-400 mx-auto drop-shadow-2xl" />
          </motion.div>
          <h1 className="text-5xl md:text-6xl font-bold mb-4 text-white drop-shadow-2xl">
            שלב הגמר
          </h1>
          <p className="text-2xl text-white/90 drop-shadow-lg">
            בחר את המנצח מבין 3 המועמדים הסופיים
          </p>
        </motion.div>

        {loading ? (
          <div className="text-center text-white">
            <p>טוען מועמדים...</p>
          </div>
        ) : finalists.length === 0 ? (
          <div className="text-center text-white">
            <p>לא נמצאו מועמדים לגמר</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Finalists Spotlight Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {finalists.map((finalist, index) => (
                <motion.div
                  key={finalist.id}
                  initial={{ opacity: 0, y: 50, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: index * 0.2 + 0.5, type: 'spring', stiffness: 100 }}
                  whileHover={{ scale: 1.05, y: -10 }}
                  className="relative"
                >
                  {/* Spotlight effect */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 via-purple-500 to-yellow-400 rounded-3xl blur opacity-75 animate-pulse" />
                  <div className="relative glass rounded-3xl overflow-hidden shadow-2xl border-2 border-yellow-400/50">
                    <div className="relative h-80 w-full">
                      {finalist.image_url ? (
                        <img
                          src={finalist.image_url}
                          alt={finalist.costume_title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-white">
                          תמונה לא זמינה
                        </div>
                      )}
                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
                      
                      {/* Rank badge */}
                      <div className="absolute top-4 left-4 glass px-4 py-2 rounded-full text-white text-lg font-bold backdrop-blur-md border-2 border-yellow-400">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'} מקום {index + 1}
                      </div>
                      
                      {/* Score badge */}
                      <div className="absolute top-4 right-4 glass px-4 py-2 rounded-full text-white text-lg font-bold backdrop-blur-md">
                        {finalist.total_score} נקודות
                      </div>
                      
                      {/* Content overlay */}
                      <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                        <h3 className="font-bold text-2xl mb-2 drop-shadow-lg">{finalist.costume_title}</h3>
                        <p className="text-base opacity-90 drop-shadow-md">{finalist.name}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Voting Interface */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              className="glass rounded-3xl p-6 shadow-2xl"
            >
              <VotingSelector phase={2} entries={finalists} />
            </motion.div>

            {/* Leaderboard */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
            >
              <LeaderboardChart showOnlyFinalists={true} />
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}
