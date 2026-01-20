'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { PartyButton } from '@/components/party-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { VotingBottomSheet } from '@/components/voting-bottom-sheet'
import { CostumeGallery } from '@/components/costume-gallery'
import { SwipeDeck } from '@/components/swipe-deck'
import { submitVote, checkVoterEligibility } from '@/app/actions/contest'
import { validateIsraeliPhone, normalizePhone } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import { Trophy, Award, Medal } from 'lucide-react'
import { motion } from 'framer-motion'
import type { Entry } from '@/components/costume-gallery'
import { useSoundEffects } from '@/lib/hooks/use-sound-effects'
import { supabase } from '@/lib/supabase/client'

interface VotingSelectorProps {
  phase: 1 | 2
  entries?: Entry[]
  onVoteComplete?: () => void
}

type SelectedEntry = Entry & { points: number }

export function VotingSelector({ phase, entries: initialEntries, onVoteComplete }: VotingSelectorProps) {
  const [phone, setPhone] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [selectedEntries, setSelectedEntries] = useState<SelectedEntry[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showBottomSheet, setShowBottomSheet] = useState(false)
  const [selectedEntryForPoints, setSelectedEntryForPoints] = useState<Entry | null>(null)
  const [swipeEntries, setSwipeEntries] = useState<Entry[]>([])
  const [useSwipeMode, setUseSwipeMode] = useState(true) // Default to swipe mode
  const [mounted, setMounted] = useState(false)
  const { toast } = useToast()
  const { playSound } = useSoundEffects()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch entries for swipe mode
  useEffect(() => {
    if (isAuthenticated && phase === 1 && useSwipeMode) {
      fetchSwipeEntries()
    }
  }, [isAuthenticated, phase, useSwipeMode])

  const fetchSwipeEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('entries')
        .select('id, name, costume_title, description, image_url, total_score')
        .order('created_at', { ascending: false })

      if (error) throw error
      const validEntries = (data || []).filter((entry) => entry.image_url && entry.image_url.trim() !== '')
      setSwipeEntries(validEntries)
    } catch (error) {
      console.error('Error fetching entries:', error)
    }
  }

  const handleSwipeVote = async (entryId: string, points: number) => {
    if (isSubmitting) return

    setIsSubmitting(true)
    try {
      const result = await submitVote(normalizePhone(phone), [{ entryId, points }], phase)

      if (result?.error) {
        toast({
          title: 'שגיאה',
          description: result.error,
          variant: 'destructive',
        })
        setIsSubmitting(false)
        return
      }

      // Success!
      if (points === 12) {
        playSound('douze-points')
      } else {
        playSound('confetti')
      }

      // Confetti
      const confettiModule = await import('canvas-confetti')
      const confetti = confettiModule.default
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      })

      toast({
        title: 'הצבעת! 🎉',
        description: `ניתנו ${points} נקודות`,
      })
    } catch (error) {
      console.error('Vote error:', error)
      const isNetworkError = 
        error instanceof TypeError && error.message.includes('fetch') ||
        (mounted && !navigator.onLine)
      
      toast({
        title: isNetworkError ? 'שגיאת רשת' : 'שגיאה',
        description: isNetworkError
          ? 'אין חיבור לאינטרנט. אנא בדוק את החיבור ונסה שוב.'
          : 'שגיאה בהצבעה. נסה שוב.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSwipeSkip = (entryId: string) => {
    // Just skip - no action needed
  }

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateIsraeliPhone(phone)) {
      toast({
        title: 'שגיאה',
        description: 'מספר טלפון לא תקין',
        variant: 'destructive',
      })
      return
    }

    const { eligible } = await checkVoterEligibility(normalizePhone(phone), phase)
    if (!eligible) {
      toast({
        title: 'לא מורשה',
        description: phase === 2 
          ? 'עליך להצביע בשלב הקודם כדי להצביע בגמר'
          : 'שגיאה באימות',
        variant: 'destructive',
      })
      return
    }

    setIsAuthenticated(true)
  }

  const handleEntrySelect = (entry: Entry) => {
    if (phase === 1) {
      // Phase 1: Show modal to select points (8, 10, or 12)
      setSelectedEntryForPoints(entry)
      setShowBottomSheet(true)
    } else {
      // Phase 2: Single vote (1 point)
      setSelectedEntries([{ ...entry, points: 1 }])
    }
  }

  const handlePointsSelect = (points: number) => {
    if (!selectedEntryForPoints) return

    // Check if entry already selected
    const existingIndex = selectedEntries.findIndex((e) => e.id === selectedEntryForPoints.id)
    
    if (existingIndex >= 0) {
      // If same points selected, remove entry (toggle off)
      if (selectedEntries[existingIndex].points === points) {
        setSelectedEntries(selectedEntries.filter((e) => e.id !== selectedEntryForPoints.id))
      } else {
        // Update existing entry's points
        const updated = [...selectedEntries]
        updated[existingIndex] = { ...updated[existingIndex], points }
        setSelectedEntries(updated)
      }
    } else {
      // Add new entry with selected points
      setSelectedEntries([...selectedEntries, { ...selectedEntryForPoints, points }])
    }

    setShowBottomSheet(false)
    setSelectedEntryForPoints(null)
  }

  const handleSubmitVote = async () => {
    if (selectedEntries.length === 0) {
      toast({
        title: 'שגיאה',
        description: 'אנא בחר תחפושת',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)

    let votes: Array<{ entryId: string; points: number }>

    if (phase === 1) {
      // Phase 1: Use points from selected entries
      votes = selectedEntries.map((entry) => ({
        entryId: entry.id,
        points: entry.points,
      }))
    } else {
      // Phase 2: Single vote (1 point)
      votes = [{ entryId: selectedEntries[0].id, points: 1 }]
    }

    try {
      const result = await submitVote(normalizePhone(phone), votes, phase)

      if (result?.error) {
        const isNetworkError = 
          result.error.includes('fetch') ||
          result.error.includes('network') ||
          (mounted && !navigator.onLine)

        toast({
          title: isNetworkError ? 'שגיאת רשת' : 'שגיאה',
          description: isNetworkError
            ? 'אין חיבור לאינטרנט. אנא בדוק את החיבור ונסה שוב.'
            : result.error,
          variant: 'destructive',
        })
        setIsSubmitting(false)
      } else {
        // Play sound effect based on points
        if (phase === 1 && votes[0]?.points === 12) {
          playSound('douze-points')
        } else {
          playSound('confetti')
        }

        // Confetti celebration - dynamic import to reduce bundle size
        const confettiModule = await import('canvas-confetti')
        const confetti = confettiModule.default
        confetti({
          particleCount: 200,
          spread: 100,
          origin: { y: 0.6 },
        })

        toast({
          title: 'תודה שהצבעת!',
          description: 'הקול שלך נרשם בהצלחה',
        })

        // Reset
        setSelectedEntries([])
        setIsAuthenticated(false)
        setPhone('')
        
        if (onVoteComplete) {
          onVoteComplete()
        }
        setIsSubmitting(false)
      }
    } catch (error) {
      console.error('Vote submission error:', error)
      const isNetworkError = 
        error instanceof TypeError && error.message.includes('fetch') ||
        !navigator.onLine

      toast({
        title: isNetworkError ? 'שגיאת רשת' : 'שגיאה',
        description: isNetworkError
          ? 'אין חיבור לאינטרנט. אנא בדוק את החיבור ונסה שוב.'
          : 'שגיאה בלתי צפויה. אנא נסה שוב.',
        variant: 'destructive',
      })
      setIsSubmitting(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="glass rounded-2xl p-6 shadow-xl w-full">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">התחבר להצבעה</h2>
          <p className="text-white/80">
            הזן את מספר הטלפון שלך כדי להצביע
          </p>
        </div>
        <form onSubmit={handlePhoneSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="voter-phone" className="text-white font-semibold">מספר טלפון</Label>
            <Input
              id="voter-phone"
              type="tel"
              inputMode="numeric"
              dir="ltr"
              value={phone}
              onChange={(e) => {
                // Safely extract value with defensive checks
                const value = e?.target?.value || ''
                // Allow free typing - only keep digits
                const digits = value.replace(/\D/g, '')
                
                // Limit to 10 digits (Israeli phone number length)
                if (digits.length > 10) {
                  return // Don't update if exceeds 10 digits
                }
                
                // Only format when we have exactly 10 digits starting with 05
                // Otherwise, just show the digits as typed (preserves leading zero)
                if (digits.length === 10 && digits.startsWith('05')) {
                  setPhone(`${digits.slice(0, 3)}-${digits.slice(3)}`)
                } else {
                  setPhone(digits) // Allow free typing without formatting
                }
              }}
              placeholder="05X-XXXXXXX"
              className="glass border-white/20 text-white placeholder:text-white/50"
              required
            />
          </div>
          <PartyButton type="submit" className="w-full">
            התחבר
          </PartyButton>
        </form>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {phase === 1 ? 'בחר תחפושות ודרג אותן' : 'בחר את המנצח'}
            </h2>
            <p className="text-white/80">
              {phase === 1
                ? useSwipeMode
                  ? 'גרור או לחץ על הכפתורים להצבעה'
                  : 'לחץ על כל תמונה לבחירת נקודות: 8, 10, או 12. תוכל לבחור כמה תמונות שתרצה.'
                : 'בחר את התחפושת הזוכה'}
            </p>
          </div>
          {phase === 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUseSwipeMode(!useSwipeMode)}
              className="text-white border-white/20 hover:bg-white/10"
            >
              {useSwipeMode ? '📋 רשימה' : '🔥 Swipe'}
            </Button>
          )}
        </div>
      </div>

      {/* Swipe Mode */}
      {phase === 1 && useSwipeMode && isAuthenticated && (
        <SwipeDeck
          entries={swipeEntries}
          onVote={handleSwipeVote}
          onSkip={handleSwipeSkip}
          disabled={isSubmitting}
        />
      )}

      {/* Grid Mode */}
      {(!useSwipeMode || phase === 2) && (
        <>

      {phase === 1 && selectedEntries.length > 0 && (
        <div className="flex gap-4 justify-center flex-wrap">
          {selectedEntries.map((entry) => (
            <motion.div
              key={entry.id}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ scale: 1.05 }}
              className="relative cursor-pointer"
              onClick={() => {
                setSelectedEntryForPoints(entry)
                setShowBottomSheet(true)
              }}
            >
              <div className="glass rounded-2xl overflow-hidden shadow-xl w-48">
                <div className="relative h-32 w-full">
                  {entry.image_url ? (
                    <img
                      src={entry.image_url}
                      alt={entry.costume_title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        const fallback = document.createElement('div')
                        fallback.className = 'w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-white text-xs'
                        fallback.textContent = 'תמונה לא זמינה'
                        target.parentElement?.appendChild(fallback)
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-white text-xs">
                      תמונה לא זמינה
                    </div>
                  )}
                  <div className="absolute top-2 left-2 glass px-3 py-1 rounded-full text-xs font-bold text-white backdrop-blur-md flex items-center gap-1">
                    {entry.points === 12 && <span>👑</span>}
                    {entry.points === 10 && <span>🥈</span>}
                    {entry.points === 8 && <span>🥉</span>}
                    {entry.points} נקודות
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-sm font-semibold truncate text-white">{entry.costume_title}</p>
                  <p className="text-xs text-white/70 mt-1">לחץ לשינוי נקודות</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {initialEntries && initialEntries.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {initialEntries.map((entry) => {
            const isSelected = selectedEntries.some((e) => e.id === entry.id)
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`cursor-pointer ${isSelected ? 'ring-2 ring-primary' : ''}`}
                onClick={() => handleEntrySelect(entry)}
              >
                <Card>
                  <div className="relative h-64 w-full">
                    {entry.image_url ? (
                      <img
                        src={entry.image_url}
                        alt={entry.costume_title}
                        className="w-full h-full object-cover rounded-t-lg"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                          const fallback = document.createElement('div')
                          fallback.className = 'w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-muted-foreground'
                          fallback.textContent = 'תמונה לא זמינה'
                          target.parentElement?.appendChild(fallback)
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-muted-foreground">
                        תמונה לא זמינה
                      </div>
                    )}
                    {isSelected && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <div className="bg-primary text-primary-foreground px-4 py-2 rounded-full font-bold">
                          {selectedEntry.points} נקודות
                        </div>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold">{entry.costume_title}</h3>
                    <p className="text-sm text-muted-foreground">{entry.name}</p>
                    {phase === 2 && (
                      <p className="text-lg font-bold text-primary mt-2">
                        {entry.total_score} נקודות
                      </p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      ) : (
        <CostumeGallery
          onSelect={handleEntrySelect}
          selectedIds={selectedEntries.map((e) => e.id)}
          showScores={phase === 2}
        />
      )}

      {selectedEntries.length > 0 && (
        <div className="flex justify-center">
          <PartyButton
            onClick={handleSubmitVote}
            disabled={isSubmitting}
            className="text-lg px-8 py-6 min-h-[44px]"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⏳</span>
                שולח...
              </span>
            ) : (
              'שלח הצבעה 🎉'
            )}
          </PartyButton>
        </div>
      )}
      
      <VotingBottomSheet
        isOpen={showBottomSheet}
        onClose={() => {
          setShowBottomSheet(false)
          setSelectedEntryForPoints(null)
        }}
        onSelect={handlePointsSelect}
      />
        </>
      )}
    </div>
  )
}
