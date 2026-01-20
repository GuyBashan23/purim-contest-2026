'use client'

import { useState, useEffect, useMemo, memo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Medal, Award } from 'lucide-react'
import { useSoundEffects } from '@/lib/hooks/use-sound-effects'
import { RollingNumber } from '@/components/rolling-number'
import type { Entry } from '@/components/costume-gallery'

interface BarChartRaceProps {
  limit?: number
  phase?: 'UPLOAD' | 'VOTING' | 'FINALS' | 'ENDED'
}

interface EntryWithRank extends Entry {
  rank: number
  previousRank?: number
}

export function BarChartRace({ limit = 10, phase = 'VOTING' }: BarChartRaceProps) {
  const [entries, setEntries] = useState<EntryWithRank[]>([])
  const [previousEntries, setPreviousEntries] = useState<EntryWithRank[]>([])
  const [newVotes, setNewVotes] = useState<Set<string>>(new Set())
  const { playSound } = useSoundEffects()

  useEffect(() => {
    fetchEntries()

    // Track all timeout IDs for cleanup
    const timeoutIds: NodeJS.Timeout[] = []

    // Subscribe to real-time updates
    const channel = supabase
      .channel('leaderboard_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'votes',
        },
        () => {
          // Debounce updates
          const timeoutId = setTimeout(() => {
            fetchEntries()
          }, 300)
          timeoutIds.push(timeoutId)
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'entries',
        },
        () => {
          const timeoutId = setTimeout(() => {
            fetchEntries()
          }, 300)
          timeoutIds.push(timeoutId)
        }
      )
      .subscribe()

    // Refresh periodically
    const interval = setInterval(fetchEntries, 2000)

    return () => {
      channel.unsubscribe()
      clearInterval(interval)
      // Clear all pending timeouts to prevent memory leaks
      timeoutIds.forEach((id) => clearTimeout(id))
    }
  }, [])

  const fetchEntries = async () => {
    try {
      // Only select required fields for leaderboard
      const { data, error } = await supabase
        .from('entries')
        .select('id, name, costume_title, image_url, total_score')
        .order('total_score', { ascending: false })
        .limit(limit)

      if (error) throw error

      const rankedEntries: EntryWithRank[] = (data || []).map((entry, index) => ({
        ...entry,
        rank: index + 1,
        previousRank: previousEntries.find((e) => e.id === entry.id)?.rank,
      }))

      // Check for rank changes in top 3 and play sound
      rankedEntries.slice(0, 3).forEach((entry) => {
        if (entry.previousRank && entry.previousRank !== entry.rank) {
          // Play swoosh sound for position changes
          playSound('reaction')
        }
      })
      
      // Also check for any rank improvements (moving up)
      rankedEntries.forEach((entry) => {
        if (entry.previousRank && entry.previousRank > entry.rank) {
          // Entry moved up in ranking
          const improvement = entry.previousRank - entry.rank
          if (improvement > 0 && entry.rank <= 3) {
            playSound('reaction')
          }
        }
      })

      // Track new votes
      rankedEntries.forEach((entry) => {
        const prevEntry = previousEntries.find((e) => e.id === entry.id)
        if (prevEntry && entry.total_score > prevEntry.total_score) {
          setNewVotes((prev) => new Set(prev).add(entry.id))
          setTimeout(() => {
            setNewVotes((prev) => {
              const next = new Set(prev)
              next.delete(entry.id)
              return next
            })
          }, 2000)
        }
      })

      setPreviousEntries(rankedEntries)
      setEntries(rankedEntries)
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
    }
  }

  // Memoize maxScore to prevent recalculation
  const maxScore = useMemo(() => entries[0]?.total_score || 1, [entries])

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-8 w-8 text-yellow-400" />
    if (rank === 2) return <Medal className="h-8 w-8 text-gray-300" />
    if (rank === 3) return <Award className="h-8 w-8 text-amber-600" />
    return null
  }

  const getRankBorder = (rank: number) => {
    if (rank === 1) return 'border-4 border-yellow-400 shadow-[0_0_20px_rgba(255,215,0,0.6)]'
    if (rank === 2) return 'border-4 border-gray-300 shadow-[0_0_15px_rgba(192,192,192,0.4)]'
    if (rank === 3) return 'border-4 border-amber-600 shadow-[0_0_15px_rgba(217,119,6,0.4)]'
    return 'border-2 border-white/30'
  }

  return (
    <div className="space-y-3">
      <AnimatePresence mode="popLayout">
        {entries.map((entry) => {
          const barWidth = (entry.total_score / maxScore) * 100
          const scoreIncrease = entry.previousRank
            ? entry.total_score - (previousEntries.find((e) => e.id === entry.id)?.total_score || 0)
            : 0

          return (
            <motion.div
              key={entry.id}
              layout
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              transition={{
                layout: { type: 'spring', stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
              className="relative"
            >
              <div className="flex items-center gap-4 p-4 glass rounded-2xl backdrop-blur-md border border-white/10 hover:border-white/20 transition-all">
                {/* Rank Badge */}
                <div className="flex-shrink-0 w-12 text-center">
                  <motion.div
                    key={entry.rank}
                    initial={{ scale: 1.5, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    className="text-3xl font-bold text-white"
                  >
                    {entry.rank}
                  </motion.div>
                </div>

                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <motion.div
                    className={`w-20 h-20 rounded-full overflow-hidden ${getRankBorder(entry.rank)}`}
                    whileHover={{ scale: 1.1 }}
                    transition={{ type: 'spring', stiffness: 400 }}
                  >
                    {entry.image_url ? (
                      <img
                        src={entry.image_url}
                        alt={entry.costume_title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
                        <span className="text-2xl">🎭</span>
                      </div>
                    )}
                  </motion.div>
                  
                  {/* Rank Icon Overlay */}
                  {entry.rank <= 3 && (
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      className="absolute -top-2 -right-2"
                    >
                      {getRankIcon(entry.rank)}
                    </motion.div>
                  )}

                  {/* New Vote Particle */}
                  {newVotes.has(entry.id) && scoreIncrease > 0 && (
                    <motion.div
                      initial={{ scale: 0, y: 0, opacity: 0 }}
                      animate={{ scale: 1, y: -30, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="absolute -top-8 left-1/2 -translate-x-1/2 bg-yellow-400 text-black px-3 py-1 rounded-full font-bold text-sm shadow-lg"
                    >
                      +{scoreIncrease}
                    </motion.div>
                  )}
                </div>

                {/* Name & Title */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold text-white truncate mb-1">
                    {entry.costume_title}
                  </h3>
                  <p className="text-sm text-white/70 truncate">{entry.name}</p>
                </div>

                {/* Progress Bar */}
                <div className="flex-1 relative h-12 rounded-full overflow-hidden bg-slate-800/50">
                  <motion.div
                    layout
                    className="h-full rounded-full bg-gradient-to-r from-[#eb1801] via-[#FF6B35] to-[#9B59B6] shadow-lg"
                    initial={{ width: 0 }}
                    animate={{ width: `${barWidth}%` }}
                    transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                  />
                  
                  {/* Shine effect */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    animate={{
                      x: ['-100%', '200%'],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      repeatDelay: 3,
                      ease: 'easeInOut',
                    }}
                  />
                </div>

                {/* Score Counter */}
                <div className="flex-shrink-0 w-24 text-right">
                  <div className="text-3xl font-bold text-white">
                    <RollingNumber value={entry.total_score} />
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

