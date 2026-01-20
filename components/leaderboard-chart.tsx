'use client'

import { useState, useEffect, useMemo, memo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Medal, Award } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface Entry {
  id: string
  name: string
  costume_title: string
  image_url: string
  total_score: number
}

interface LeaderboardChartProps {
  limit?: number
  showOnlyFinalists?: boolean
  compact?: boolean
}

export function LeaderboardChart({
  limit = 10,
  showOnlyFinalists = false,
  compact = false,
}: LeaderboardChartProps) {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [previousScores, setPreviousScores] = useState<Record<string, number>>({})

  useEffect(() => {
    fetchEntries()

    // Subscribe to real-time updates
    const channel = supabase
      .channel('leaderboard_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'entries',
        },
        () => {
          fetchEntries()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [showOnlyFinalists, limit])

  const fetchEntries = async () => {
    try {
      // Only select required fields
      let query = supabase
        .from('entries')
        .select('id, name, costume_title, image_url, total_score, is_finalist')

      if (showOnlyFinalists) {
        query = query.eq('is_finalist', true)
      }

      const { data, error } = await query
        .order('total_score', { ascending: false })
        .limit(limit)

      if (error) throw error

      // Update previous scores for animation
      setPreviousScores(
        entries.reduce((acc, entry) => {
          acc[entry.id] = entry.total_score
          return acc
        }, {} as Record<string, number>)
      )

      setEntries(data || [])
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="glass rounded-2xl p-6 shadow-xl">
        <h2 className="font-bold mb-6 text-white text-3xl">לוח תוצאות</h2>
        <div className="space-y-4">
          {[...Array(limit)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full bg-white/10" />
          ))}
        </div>
      </div>
    )
  }

  // Memoize maxScore to prevent recalculation
  const maxScore = useMemo(() => entries[0]?.total_score || 1, [entries])

  const getRankIcon = (rank: number) => {
    if (rank === 1) {
      return (
        <motion.span
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
          className="text-3xl"
        >
          👑
        </motion.span>
      )
    }
    if (rank === 2) {
      return (
        <motion.span
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
          className="text-3xl"
        >
          🥈
        </motion.span>
      )
    }
    if (rank === 3) {
      return (
        <motion.span
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
          className="text-3xl"
        >
          🥉
        </motion.span>
      )
    }
    return null
  }

  return (
    <div className="glass rounded-2xl p-6 shadow-xl">
      <h2 className={`font-bold mb-6 text-white ${compact ? 'text-2xl' : 'text-3xl'}`}>
        לוח תוצאות
      </h2>
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {entries.map((entry, index) => {
            const rank = index + 1
            const previousScore = previousScores[entry.id] || 0
            const scoreChanged = entry.total_score !== previousScore
            const percentage = (entry.total_score / maxScore) * 100

            return (
              <motion.div
                key={entry.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-4"
              >
                {/* Rank */}
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-[#eb1801] to-[#FF6B35] text-white font-bold text-lg shrink-0 shadow-lg">
                  {getRankIcon(rank) || (
                    <span className="text-xl">{rank}</span>
                  )}
                </div>

                {/* Entry Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    {!compact && (
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0">
                        <img
                          src={entry.image_url}
                          alt={entry.costume_title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3
                        className={`font-bold truncate text-white ${
                          compact ? 'text-base' : 'text-lg'
                        }`}
                      >
                        {entry.costume_title}
                      </h3>
                      {!compact && (
                        <p className="text-sm text-white/70 truncate">
                          {entry.name}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Bar Chart */}
                  <div className="mt-2">
                    <div className="relative h-6 bg-white/20 rounded-r-full overflow-hidden backdrop-blur-sm">
                      <motion.div
                        className="h-full bg-gradient-to-r from-[#eb1801] via-[#FF6B35] to-[#eb1801] rounded-r-full shadow-lg"
                        initial={false}
                        animate={{
                          width: `${percentage}%`,
                        }}
                        transition={{
                          type: 'spring',
                          stiffness: 100,
                          damping: 15,
                          duration: 1,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Score */}
                <motion.div
                  className={`font-bold shrink-0 text-white ${
                    compact ? 'text-lg' : 'text-2xl'
                  } ${scoreChanged ? 'text-yellow-300' : ''}`}
                  animate={scoreChanged ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  {entry.total_score}
                </motion.div>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {entries.length === 0 && (
          <div className="text-center py-8 text-white/70">
            אין תוצאות עדיין
          </div>
        )}
      </div>
    </div>
  )
}
