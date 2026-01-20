'use client'

import { useEffect } from 'react'
import { useContestStore } from '@/lib/store/contest-store'
import { VotingSelector } from '@/components/voting-selector'
import { LeaderboardChart } from '@/components/leaderboard-chart'
import { motion } from 'framer-motion'

export default function VotePage() {
  const { state, fetchState, subscribeToChanges, unsubscribe } = useContestStore()

  useEffect(() => {
    fetchState()
    subscribeToChanges()

    return () => {
      unsubscribe()
    }
  }, [fetchState, subscribeToChanges, unsubscribe])

  if (!state || state.current_phase !== 'voting') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl">ההצבעה טרם החלה</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-4xl font-bold mb-2 text-white drop-shadow-lg">שלב ההצבעה</h1>
        <p className="text-xl text-white/90 drop-shadow-md">
          בחר את 3 התחפושות המועדפות עליך
        </p>
      </motion.div>

      <div className="space-y-6">
        <VotingSelector phase={1} />
        <LeaderboardChart limit={10} />
      </div>
    </div>
  )
}
