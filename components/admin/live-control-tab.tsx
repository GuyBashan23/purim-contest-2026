'use client'

import { useState, useEffect } from 'react'
import { useContestPhase } from '@/lib/hooks/use-contest-phase'
import { setAppPhase, resetContest, triggerFinals } from '@/app/actions/contest'
import { updateVotingStartTime } from '@/app/actions/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { 
  RotateCcw, 
  Camera, 
  Vote, 
  Trophy, 
  PartyPopper,
  Clock,
  AlertTriangle
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useSoundEffects } from '@/lib/hooks/use-sound-effects'

interface LiveControlTabProps {
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
  onStatsUpdate: () => void
}

export function LiveControlTab({
  isLoading,
  setIsLoading,
  onStatsUpdate,
}: LiveControlTabProps) {
  const { phase, votingStartTime } = useContestPhase()
  const { toast } = useToast()
  const router = useRouter()
  const { playSound } = useSoundEffects()
  const [votingTime, setVotingTime] = useState('')

  useEffect(() => {
    if (votingStartTime) {
      // Convert ISO string to local datetime-local format
      const date = new Date(votingStartTime)
      const localDateTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
      setVotingTime(localDateTime)
    }
  }, [votingStartTime])

  const handleUpdateTimer = async () => {
    if (!votingTime) {
      toast({
        title: 'שגיאה',
        description: 'אנא בחר תאריך ושעה',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    // Convert local datetime to ISO string
    const isoString = new Date(votingTime).toISOString()
    const result = await updateVotingStartTime(isoString)

    if (result?.error) {
      toast({
        title: 'שגיאה',
        description: result.error,
        variant: 'destructive',
      })
    } else {
      playSound('phase-change')
      toast({
        title: 'הצלחה',
        description: 'זמן ההצבעה עודכן! הטיימר יתעדכן לכל המשתמשים.',
      })
      onStatsUpdate()
    }
    setIsLoading(false)
  }

  const handleSetPhase = async (newPhase: 'UPLOAD' | 'VOTING' | 'FINALS' | 'ENDED') => {
    setIsLoading(true)
    const result = await setAppPhase(newPhase)
    if (result?.error) {
      toast({
        title: 'שגיאה',
        description: result.error,
        variant: 'destructive',
      })
    } else {
      playSound('phase-change')
      toast({
        title: 'הצלחה',
        description: `שלב ${newPhase} הופעל`,
      })
      onStatsUpdate()
    }
    setIsLoading(false)
  }

  const handleTriggerFinals = async () => {
    if (!confirm('האם אתה בטוח שברצונך להתחיל את שלב הגמר? זה יבחר את 3 המובילים.')) {
      return
    }
    setIsLoading(true)
    const result = await triggerFinals()
    if (result?.error) {
      toast({
        title: 'שגיאה',
        description: result.error,
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'הצלחה',
        description: 'שלב הגמר הופעל! 3 המובילים נבחרו.',
      })
      onStatsUpdate()
      router.push('/finals')
    }
    setIsLoading(false)
  }

  const handleReset = async () => {
    if (!confirm('⚠️ אזהרה: האם אתה בטוח שברצונך לאפס את כל הנתונים? פעולה זו לא ניתנת לביטול!')) {
      return
    }
    setIsLoading(true)
    const result = await resetContest()
    if (result?.error) {
      toast({
        title: 'שגיאה',
        description: result.error,
        variant: 'destructive',
      })
    } else {
      await setAppPhase('UPLOAD')
      toast({
        title: 'הצלחה',
        description: 'התחרות אופסה',
      })
      onStatsUpdate()
    }
    setIsLoading(false)
  }

  return (
    <div className="space-y-6">
      {/* Timer Control */}
      <Card className="glass border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            הגדרת זמן הצבעה
          </CardTitle>
          <CardDescription>
            הגדר מתי ההצבעה תיפתח. הטיימר יתעדכן לכל המשתמשים בזמן אמת.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="voting-time" className="text-white">
              תאריך ושעה להצבעה
            </Label>
            <Input
              id="voting-time"
              type="datetime-local"
              value={votingTime}
              onChange={(e) => setVotingTime(e.target.value)}
              className="glass border-white/20 text-white"
            />
          </div>
          <Button
            onClick={handleUpdateTimer}
            disabled={isLoading || !votingTime}
            className="w-full bg-gradient-to-r from-[#eb1801] to-[#FF6B35]"
          >
            <Clock className="h-4 w-4 mr-2" />
            עדכן טיימר
          </Button>
          {votingStartTime && (
            <p className="text-sm text-white/60">
              זמן נוכחי: {new Date(votingStartTime).toLocaleString('he-IL')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Emergency Actions */}
      <Card className="glass border-red-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="h-5 w-5" />
            פעולות חירום
          </CardTitle>
          <CardDescription>
            שליטה ידנית על שלבי התחרות
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={handleReset}
              disabled={isLoading}
              variant="destructive"
              size="lg"
              className="h-20 flex flex-col gap-2"
            >
              <RotateCcw className="h-6 w-6" />
              <span>⏹️ איפוס מלא</span>
            </Button>

            <Button
              onClick={() => handleSetPhase('UPLOAD')}
              disabled={isLoading || phase === 'UPLOAD'}
              size="lg"
              className="h-20 flex flex-col gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Camera className="h-6 w-6" />
              <span>📸 התחל העלאה</span>
            </Button>

            <Button
              onClick={() => handleSetPhase('VOTING')}
              disabled={isLoading || phase === 'VOTING' || phase === 'FINALS' || phase === 'ENDED'}
              size="lg"
              className="h-20 flex flex-col gap-2 bg-green-600 hover:bg-green-700"
            >
              <Vote className="h-6 w-6" />
              <span>🗳️ התחל הצבעה</span>
            </Button>

            <Button
              onClick={handleTriggerFinals}
              disabled={isLoading || phase !== 'VOTING'}
              size="lg"
              className="h-20 flex flex-col gap-2 bg-purple-600 hover:bg-purple-700"
            >
              <Trophy className="h-6 w-6" />
              <span>🏆 הפעל גמר</span>
            </Button>

            <Button
              onClick={() => handleSetPhase('ENDED')}
              disabled={isLoading || phase !== 'FINALS'}
              size="lg"
              className="h-20 flex flex-col gap-2 bg-yellow-600 hover:bg-yellow-700 md:col-span-2"
            >
              <PartyPopper className="h-6 w-6" />
              <span>🎉 הכרז זוכים</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
