'use client'

import { useState, useEffect } from 'react'
import { useContestStore } from '@/lib/store/contest-store'
import { setPhase, resetContest, getTopEntries } from '@/app/actions/contest'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { Play, RotateCcw, Trophy, BarChart3 } from 'lucide-react'

export default function AdminPage() {
  const [password, setPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [stats, setStats] = useState<{ entries: number; votes: number; top3: any[] }>({ entries: 0, votes: 0, top3: [] })
  const { state, fetchState } = useContestStore()
  const { toast } = useToast()

  useEffect(() => {
    fetchState()
    if (isAuthenticated) {
      loadStats()
    }
  }, [isAuthenticated, fetchState])

  const handleLogin = () => {
    // Simple client-side check - password is validated server-side in actions
    // For demo purposes, accept 'admin' or check against env var
    const isValid = password === 'admin' || password.length > 0
    if (isValid) {
      setIsAuthenticated(true)
      toast({
        title: 'ברוך הבא',
        description: 'נכנסת לממשק הניהול',
      })
    } else {
      toast({
        title: 'שגיאה',
        description: 'סיסמה שגויה',
        variant: 'destructive',
      })
    }
  }

  const loadStats = async () => {
    const { data } = await getTopEntries(10)
    if (data) {
      setStats({
        entries: data.length,
        votes: data.reduce((sum, e) => sum + e.total_score, 0),
        top3: data.slice(0, 3),
      })
    }
  }

  const handleSetPhase = async (phase: 'voting' | 'finals' | 'winners') => {
    setIsLoading(true)
    const result = await setPhase(phase, password)
    if (result?.error) {
      toast({
        title: 'שגיאה',
        description: result.error,
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'הצלחה',
        description: `שלב ${phase} הופעל`,
      })
      fetchState()
      loadStats()
    }
    setIsLoading(false)
  }

  const handleReset = async () => {
    if (!confirm('האם אתה בטוח שברצונך לאפס את כל הנתונים?')) {
      return
    }
    setIsLoading(true)
    const result = await resetContest(password)
    if (result?.error) {
      toast({
        title: 'שגיאה',
        description: result.error,
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'הצלחה',
        description: 'התחרות אופסה',
      })
      fetchState()
      loadStats()
    }
    setIsLoading(false)
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>ממשק ניהול</CardTitle>
            <CardDescription>הזן סיסמה כדי להמשיך</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Input
                type="password"
                placeholder="סיסמה"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
              <Button onClick={handleLogin} className="w-full">
                התחבר
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-8">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">ממשק ניהול</h1>
          <p className="text-muted-foreground">
            שלב נוכחי: <strong>{state?.current_phase || 'טוען...'}</strong>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                סטטיסטיקות
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p>סה"כ רישומים: {stats.entries}</p>
                <p>סה"כ נקודות: {stats.votes}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Top 3
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.top3.map((entry, index) => (
                  <p key={entry.id}>
                    {index + 1}. {entry.costume_title} - {entry.total_score} נקודות
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>בקרת שלבים</CardTitle>
              <CardDescription>
                שליטה על מהלך התחרות
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={() => handleSetPhase('voting')}
                disabled={isLoading || state?.current_phase !== 'registration'}
                className="w-full"
              >
                <Play className="h-4 w-4 mr-2" />
                התחל שלב הצבעה
              </Button>
              <Button
                onClick={() => handleSetPhase('finals')}
                disabled={isLoading || state?.current_phase !== 'voting'}
                className="w-full"
              >
                <Play className="h-4 w-4 mr-2" />
                התחל שלב גמר
              </Button>
              <Button
                onClick={() => handleSetPhase('winners')}
                disabled={isLoading || state?.current_phase !== 'finals'}
                className="w-full"
              >
                <Trophy className="h-4 w-4 mr-2" />
                הצג זוכים
              </Button>
              <Button
                onClick={handleReset}
                disabled={isLoading}
                variant="destructive"
                className="w-full"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                אפס תחרות
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
