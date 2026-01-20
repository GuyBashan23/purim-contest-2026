'use client'

import { useState, useEffect } from 'react'
import { getContestStats } from '@/app/actions/contest'
import { getLeadingCandidate } from '@/app/actions/admin'
import { useContestPhase } from '@/lib/hooks/use-contest-phase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Camera, 
  Vote, 
  Clock, 
  Trophy,
  TrendingUp,
  Users
} from 'lucide-react'
import { motion } from 'framer-motion'
import Image from 'next/image'

interface AnalyticsTabProps {
  password: string
}

export function AnalyticsTab({ password }: AnalyticsTabProps) {
  const { phase, timeRemaining, votingStartTime } = useContestPhase()
  const [stats, setStats] = useState<{ totalEntries: number; totalVotes: number }>({
    totalEntries: 0,
    totalVotes: 0,
  })
  const [leadingCandidate, setLeadingCandidate] = useState<any>(null)

  useEffect(() => {
    loadStats()
    loadLeadingCandidate()
    const interval = setInterval(() => {
      loadStats()
      loadLeadingCandidate()
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const loadStats = async () => {
    const result = await getContestStats()
    if (result.totalEntries !== undefined) {
      setStats({
        totalEntries: result.totalEntries,
        totalVotes: result.totalVotes,
      })
    }
  }

  const loadLeadingCandidate = async () => {
    const result = await getLeadingCandidate(password)
    if (result.data) {
      setLeadingCandidate(result.data)
    }
  }

  const formatTimeRemaining = () => {
    if (!timeRemaining || timeRemaining <= 0) return 'ההצבעה נפתחה'
    
    const hours = Math.floor(timeRemaining / (1000 * 60 * 60))
    const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000)
    
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glass border-slate-700 bg-gradient-to-br from-blue-900/50 to-blue-800/30">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/80">סה"כ העלאות</CardTitle>
              <Camera className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{stats.totalEntries}</div>
              <p className="text-xs text-white/60 mt-1">תמונות שהועלו</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="glass border-slate-700 bg-gradient-to-br from-yellow-900/50 to-yellow-800/30">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/80">סה"כ הצבעות</CardTitle>
              <Vote className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{stats.totalVotes}</div>
              <p className="text-xs text-white/60 mt-1">הצבעות שנרשמו</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="glass border-slate-700 bg-gradient-to-br from-green-900/50 to-green-800/30">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/80">זמן נותר</CardTitle>
              <Clock className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white font-mono">
                {formatTimeRemaining()}
              </div>
              <p className="text-xs text-white/60 mt-1">
                {phase === 'UPLOAD' ? 'עד תחילת ההצבעה' : 'ההצבעה פעילה'}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="glass border-slate-700 bg-gradient-to-br from-purple-900/50 to-purple-800/30">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/80">שלב נוכחי</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{phase}</div>
              <p className="text-xs text-white/60 mt-1">
                {phase === 'UPLOAD' ? '📸 העלאה' : phase === 'VOTING' ? '🗳️ הצבעה' : phase === 'FINALS' ? '🏆 גמר' : '🎉 הסתיים'}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Leading Candidate (Spoiler Alert) */}
      {leadingCandidate && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="glass border-yellow-500/30 bg-gradient-to-br from-yellow-900/30 to-yellow-800/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-400">
                <Trophy className="h-5 w-5" />
                המוביל הנוכחי (ספוילר!)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                {leadingCandidate.image_url && (
                  <div className="relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={leadingCandidate.image_url}
                      alt={leadingCandidate.costume_title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white">{leadingCandidate.costume_title}</h3>
                  <p className="text-white/70">{leadingCandidate.name}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-400" />
                    <span className="text-2xl font-bold text-yellow-400">
                      {leadingCandidate.total_score} נקודות
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
