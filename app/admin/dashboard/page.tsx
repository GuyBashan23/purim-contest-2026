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
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-4 sm:py-6 lg:py-8 xl:py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8 lg:mb-10"
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-2 text-white drop-shadow-lg">
            🛠️ מרכז הבקרה
          </h1>
          <p className="text-white/70 text-base sm:text-lg lg:text-xl xl:text-2xl">
            ניהול מלא של התחרות ממקום אחד
          </p>
        </motion.div>

        {/* Quick Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 xl:gap-8 mb-6 lg:mb-8"
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
            <TabsList className="w-full justify-start mb-4 sm:mb-6 lg:mb-8 h-auto">
              <TabsTrigger value="live" className="flex items-center gap-2 px-3 sm:px-4 lg:px-6 py-2 sm:py-2.5 lg:py-3 text-sm sm:text-base lg:text-lg">
                <Settings className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
                <span className="hidden sm:inline">בקרה חיה</span>
                <span className="sm:hidden">בקרה</span>
              </TabsTrigger>
              <TabsTrigger value="gallery" className="flex items-center gap-2 px-3 sm:px-4 lg:px-6 py-2 sm:py-2.5 lg:py-3 text-sm sm:text-base lg:text-lg">
                <ImageIcon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
                <span className="hidden sm:inline">ניהול גלריה</span>
                <span className="sm:hidden">גלריה</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2 px-3 sm:px-4 lg:px-6 py-2 sm:py-2.5 lg:py-3 text-sm sm:text-base lg:text-lg">
                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
                <span className="hidden sm:inline">אנליטיקה</span>
                <span className="sm:hidden">אנליטיקה</span>
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
