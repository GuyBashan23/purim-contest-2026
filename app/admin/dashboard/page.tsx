'use client'

import { useState, useEffect } from 'react'
import { getContestStats } from '@/app/actions/contest'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { motion } from 'framer-motion'
import { LiveControlTab } from '@/components/admin/live-control-tab'
import { GalleryManagerTab } from '@/components/admin/gallery-manager-tab'
import { AnalyticsTab } from '@/components/admin/analytics-tab'
import { Settings, Image as ImageIcon, BarChart3 } from 'lucide-react'

export default function AdminDashboard() {
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('live')
  const [stats, setStats] = useState<{ totalEntries: number; totalVotes: number }>({ 
    totalEntries: 0, 
    totalVotes: 0 
  })

  useEffect(() => {
    loadStats()
    const interval = setInterval(loadStats, 5000)
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-5xl font-bold mb-2 text-white drop-shadow-lg">
            🛠️ מרכז הבקרה
          </h1>
          <p className="text-white/70 text-lg">
            ניהול מלא של התחרות ממקום אחד
          </p>
        </motion.div>

        {/* Quick Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
        >
          <Card className="glass border-slate-700 bg-slate-800/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/60">תמונות</p>
                  <p className="text-2xl font-bold text-white">{stats.totalEntries}</p>
                </div>
                <ImageIcon className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="glass border-slate-700 bg-slate-800/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/60">הצבעות</p>
                  <p className="text-2xl font-bold text-white">{stats.totalVotes}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs Interface */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start mb-6">
              <TabsTrigger value="live" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                בקרה חיה
              </TabsTrigger>
              <TabsTrigger value="gallery" className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                ניהול גלריה
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                אנליטיקה
              </TabsTrigger>
            </TabsList>

            <TabsContent value="live">
              <LiveControlTab
                isLoading={isLoading}
                setIsLoading={setIsLoading}
                onStatsUpdate={loadStats}
              />
            </TabsContent>

            <TabsContent value="gallery">
              <GalleryManagerTab
                isLoading={isLoading}
                setIsLoading={setIsLoading}
                onStatsUpdate={loadStats}
              />
            </TabsContent>

            <TabsContent value="analytics">
              <AnalyticsTab />
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  )
}
