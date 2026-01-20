'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { PartyButton } from '@/components/party-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { VotingBottomSheet } from '@/components/voting-bottom-sheet'
import { CostumeGallery } from '@/components/costume-gallery'
import { submitVote, checkVoterEligibility } from '@/app/actions/contest'
import { validateIsraeliPhone, normalizePhone } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import { Trophy, Award, Medal } from 'lucide-react'
import { motion } from 'framer-motion'
import type { Entry } from '@/components/costume-gallery'
import { useSoundEffects } from '@/lib/hooks/use-sound-effects'

interface VotingSelectorProps {
  phase: 1 | 2
  entries?: Entry[]
  onVoteComplete?: () => void
}

export function VotingSelector({ phase, entries: initialEntries, onVoteComplete }: VotingSelectorProps) {
  const [phone, setPhone] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [selectedEntries, setSelectedEntries] = useState<Entry[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showBottomSheet, setShowBottomSheet] = useState(false)
  const [selectedEntryForPoints, setSelectedEntryForPoints] = useState<Entry | null>(null)
  const { toast } = useToast()
  const { playSound } = useSoundEffects()

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
      // Phase 2: Select top 3
      const index = selectedEntries.findIndex((e) => e.id === entry.id)
      if (index >= 0) {
        // Deselect
        setSelectedEntries(selectedEntries.filter((e) => e.id !== entry.id))
      } else if (selectedEntries.length < 3) {
        // Select
        setSelectedEntries([...selectedEntries, entry])
      } else {
        toast({
          title: 'הגבלה',
          description: 'ניתן לבחור עד 3 תחפושות',
          variant: 'destructive',
        })
      }
    } else {
      // Phase 3: Single vote
      setSelectedEntries([entry])
    }
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
      // Phase 2: 12, 10, 8 points
      votes = selectedEntries.map((entry, index) => ({
        entryId: entry.id,
        points: index === 0 ? 12 : index === 1 ? 10 : 8,
      }))
    } else {
      // Phase 3: Single vote (1 point)
      votes = [{ entryId: selectedEntries[0].id, points: 1 }]
    }

    try {
      const result = await submitVote(normalizePhone(phone), votes, phase)

      if (result?.error) {
        const isNetworkError = 
          result.error.includes('fetch') ||
          result.error.includes('network') ||
          !navigator.onLine

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
        <h2 className="text-2xl font-bold text-white mb-2">
          {phase === 1 ? 'בחר את 3 התחפושות המועדפות עליך' : 'בחר את המנצח'}
        </h2>
        <p className="text-white/80">
          {phase === 1
            ? 'הראשונה תקבל 12 נקודות, השנייה 10 נקודות, והשלישית 8 נקודות'
            : 'בחר את התחפושת הזוכה'}
        </p>
      </div>

      {phase === 1 && selectedEntries.length > 0 && (
        <div className="flex gap-4 justify-center flex-wrap">
          {selectedEntries.map((entry, index) => (
            <motion.div
              key={entry.id}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ scale: 1.05 }}
              className="relative"
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
                    {index === 0 && <span>👑</span>}
                    {index === 1 && <span>🥈</span>}
                    {index === 2 && <span>🥉</span>}
                    {index === 0 ? '12 נקודות' : index === 1 ? '10 נקודות' : '8 נקודות'}
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-sm font-semibold truncate text-white">{entry.costume_title}</p>
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
                          נבחר
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
        onClose={() => setShowBottomSheet(false)}
        onSelect={(points) => {
          if (selectedEntryForPoints) {
            // Handle point selection
            setShowBottomSheet(false)
            setSelectedEntryForPoints(null)
          }
        }}
      />
    </div>
  )
}
