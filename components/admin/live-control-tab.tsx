'use client'

import { useState, useEffect } from 'react'
import { useContestPhase } from '@/lib/hooks/use-contest-phase'
import { setAppPhase, resetContest, triggerFinals } from '@/app/actions/contest'
import { updateVotingStartTime, updateSlideshowSettings, getSlideshowSettings } from '@/app/actions/admin'
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
  AlertTriangle,
  Monitor,
  Image as ImageIcon
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useSoundEffects } from '@/lib/hooks/use-sound-effects'
import { formatIsraelDateTimeLocal, parseIsraelDateTimeLocal, toIsraelLocaleString } from '@/lib/utils/timezone'

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
  const [slideshowInterval, setSlideshowInterval] = useState(5000)
  const [slideshowBatchSize, setSlideshowBatchSize] = useState(3)

  useEffect(() => {
    if (votingStartTime) {
      // Convert ISO string to Israel timezone datetime-local format
      setVotingTime(formatIsraelDateTimeLocal(votingStartTime))
    }
    loadSlideshowSettings()
  }, [votingStartTime])

  const loadSlideshowSettings = async () => {
    const result = await getSlideshowSettings()
    if (result.data) {
      setSlideshowInterval(result.data.slideshowInterval)
      setSlideshowBatchSize(result.data.slideshowBatchSize)
    }
  }

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
    // Convert Israel timezone datetime-local to ISO string
    const isoString = parseIsraelDateTimeLocal(votingTime)
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

  const handleUpdateSlideshowSettings = async () => {
    if (slideshowInterval < 1000 || slideshowBatchSize < 1 || slideshowBatchSize > 10) {
      toast({
        title: 'שגיאה',
        description: 'מרווח זמן מינימלי: 1000ms, גודל אצווה: 1-10',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    const result = await updateSlideshowSettings(slideshowInterval, slideshowBatchSize)

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
        description: 'הגדרות הלוח החי עודכנו!',
      })
    }
    setIsLoading(false)
  }

  return (
    <div className="space-y-6">
      {/* Slideshow Settings */}
      <Card className="glass border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            הגדרות לוח חי (Live Wall)
          </CardTitle>
          <CardDescription>
            הגדר את המרווח והגודל של תצוגת התמונות על המסך
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="slideshow-interval" className="text-white">
                מרווח זמן (מילישניות)
              </Label>
              <Input
                id="slideshow-interval"
                type="number"
                min="1000"
                step="500"
                value={slideshowInterval}
                onChange={(e) => setSlideshowInterval(parseInt(e.target.value) || 5000)}
                className="glass border-white/20 text-white"
              />
              <p className="text-xs text-white/60">
                זמן בין החלפת תמונות (מומלץ: 3000-10000ms)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="slideshow-batch-size" className="text-white">
                גודל אצווה (מספר תמונות)
              </Label>
              <Input
                id="slideshow-batch-size"
                type="number"
                min="1"
                max="10"
                value={slideshowBatchSize}
                onChange={(e) => setSlideshowBatchSize(parseInt(e.target.value) || 3)}
                className="glass border-white/20 text-white"
              />
              <p className="text-xs text-white/60">
                מספר תמונות להצגה בו-זמנית (1-10)
              </p>
            </div>
          </div>
          <Button
            onClick={handleUpdateSlideshowSettings}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600"
          >
            <ImageIcon className="h-4 w-4 mr-2" />
            עדכן הגדרות לוח חי
          </Button>
        </CardContent>
      </Card>

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
              זמן נוכחי: {toIsraelLocaleString(votingStartTime)}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
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
