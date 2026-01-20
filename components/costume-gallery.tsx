'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { submitSingleVote, getUserVotes } from '@/app/actions/contest'
import { validateIsraeliPhone, normalizePhone } from '@/lib/utils'
import { useContestPhase } from '@/lib/hooks/use-contest-phase'
import { useSoundEffects } from '@/lib/hooks/use-sound-effects'

export interface Entry {
  id: string
  name: string
  costume_title: string
  description: string | null
  image_url: string
  total_score: number
}

interface CostumeGalleryProps {
  onSelect?: (entry: Entry) => void
  selectedIds?: string[]
  showScores?: boolean
  readOnly?: boolean
}

export function CostumeGallery({
  onSelect,
  selectedIds = [],
  showScores = false,
  readOnly = false,
}: CostumeGalleryProps) {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null)
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())
  const [voterPhone, setVoterPhone] = useState<string>('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [userVotes, setUserVotes] = useState<Record<string, number>>({}) // { entryId: points }
  const { toast } = useToast()
  const { isVotingOpen, phase: contestPhase } = useContestPhase()
  const { playSound } = useSoundEffects()

  // Load voter phone from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPhone = localStorage.getItem('voterPhone')
      if (savedPhone && validateIsraeliPhone(savedPhone)) {
        setVoterPhone(savedPhone)
        setIsAuthenticated(true)
      }
    }
  }, [])

  // Fetch user's current votes when authenticated and voting is open
  useEffect(() => {
    const fetchUserVotes = async () => {
      if (isAuthenticated && isVotingOpen && voterPhone) {
        const currentPhase = contestPhase === 'FINALS' ? 2 : 1
        const result = await getUserVotes(normalizePhone(voterPhone), currentPhase)
        if (result.votes) {
          setUserVotes(result.votes)
        }
      }
    }
    fetchUserVotes()
  }, [isAuthenticated, isVotingOpen, voterPhone, contestPhase])

  // Refresh votes when modal opens
  useEffect(() => {
    if (selectedEntry && isAuthenticated && isVotingOpen) {
      const fetchVotes = async () => {
        const currentPhase = contestPhase === 'FINALS' ? 2 : 1
        const result = await getUserVotes(normalizePhone(voterPhone), currentPhase)
        if (result.votes) {
          setUserVotes(result.votes)
        }
      }
      fetchVotes()
    }
  }, [selectedEntry, isAuthenticated, isVotingOpen, voterPhone, contestPhase])

  useEffect(() => {
    fetchEntries()

    // Subscribe to real-time updates for entries (score changes)
    const entriesChannel = supabase
      .channel('entries_changes_gallery')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'entries',
        },
        (payload) => {
          console.log('📊 Entry score updated via realtime:', payload)
          // Update the specific entry in local state
          if (payload.new && payload.new.id) {
            const newScore = payload.new.total_score || 0
            console.log(`[Realtime] Updating entry ${payload.new.id} score to ${newScore}`)
            
            setEntries((prevEntries) => {
              const updated = prevEntries.map((entry) =>
                entry.id === payload.new.id
                  ? { ...entry, total_score: newScore }
                  : entry
              )
              console.log('[Realtime] Updated entries:', updated.find(e => e.id === payload.new.id))
              return updated
            })
            
            // Also update selectedEntry if it's the same entry
            setSelectedEntry((prev) => {
              if (prev && prev.id === payload.new.id) {
                const updated = { ...prev, total_score: newScore }
                console.log('[Realtime] Updated selectedEntry:', updated)
                return updated
              }
              return prev
            })
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'entries',
        },
        () => {
          console.log('📥 New entry inserted, refreshing...')
          fetchEntries()
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to entries realtime updates')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Realtime subscription error - check Supabase Realtime is enabled')
        }
      })

    return () => {
      entriesChannel.unsubscribe()
    }
  }, [])

  const fetchEntries = async () => {
    try {
      console.log('[fetchEntries] Fetching entries with scores...')
      // Only select required fields (not SELECT *)
      // Limit initial load to 20 entries for better performance
      const { data, error } = await supabase
        .from('entries')
        .select('id, name, costume_title, description, image_url, total_score')
        .order('created_at', { ascending: false })
        .limit(20) // Limit initial load to 20 entries for performance

      if (error) {
        console.error('[fetchEntries] Error:', error)
        throw error
      }
      
      // Filter out entries with invalid image URLs
      const validEntries = (data || []).filter((entry) => entry.image_url && entry.image_url.trim() !== '')
      console.log(`[fetchEntries] Loaded ${validEntries.length} entries with scores:`, 
        validEntries.map(e => ({ id: e.id, score: e.total_score }))
      )
      setEntries(validEntries)
    } catch (error) {
      console.error('[fetchEntries] Error fetching entries:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCardClick = (entry: Entry) => {
    if (readOnly) {
      // In read-only mode, only show the detail dialog
      setSelectedEntry(entry)
      return
    }
    
    if (onSelect) {
      onSelect(entry)
    } else {
      setSelectedEntry(entry)
    }
  }

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateIsraeliPhone(voterPhone)) {
      toast({
        title: 'שגיאה',
        description: 'מספר טלפון לא תקין',
        variant: 'destructive',
      })
      return
    }

    const normalizedPhone = normalizePhone(voterPhone)
    localStorage.setItem('voterPhone', normalizedPhone)
    setIsAuthenticated(true)
  }

  const handleVote = async (points: 8 | 10 | 12) => {
    if (!selectedEntry || isSubmitting || !isAuthenticated) return

    setIsSubmitting(true)
    try {
      const normalizedPhone = normalizePhone(voterPhone)
      const result = await submitSingleVote(normalizedPhone, selectedEntry.id, points)

      if (result?.error) {
        toast({
          title: 'שגיאה',
          description: result.error,
          variant: 'destructive',
        })
        setIsSubmitting(false)
        return
      }

      // Update local votes state
      const currentPhase = contestPhase === 'FINALS' ? 2 : 1
      const updatedVotes = { ...userVotes }
      
      // If vote was moved, remove it from previous entry and update its score
      if (result.moved && result.previousEntryId) {
        delete updatedVotes[result.previousEntryId]
        const movedPoints = result.points || points
        // Update the previous entry's score (subtract the points)
        setEntries((prevEntries) => {
          const updated = prevEntries.map((entry) => {
            if (entry.id === result.previousEntryId) {
              const newScore = Math.max(0, (entry.total_score || 0) - movedPoints)
              console.log(`[handleVote] Moving vote: Entry ${entry.id} score ${entry.total_score} -> ${newScore}`)
              return { ...entry, total_score: newScore }
            }
            return entry
          })
          return updated
        })
        
        // Also update selectedEntry if it's the previous entry
        setSelectedEntry((prev) => {
          if (prev && prev.id === result.previousEntryId) {
            const newScore = Math.max(0, (prev.total_score || 0) - movedPoints)
            return { ...prev, total_score: newScore }
          }
          return prev
        })
      }
      
      // Add new vote
      updatedVotes[selectedEntry.id] = points
      setUserVotes(updatedVotes)

      // Success! Play sound and show confetti
      if (points === 12) {
        playSound('douze-points')
      } else {
        playSound('confetti')
      }

      // Confetti explosion
      const confettiModule = await import('canvas-confetti')
      const confetti = confettiModule.default
      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.6 },
        colors: points === 12 
          ? ['#9333EA', '#A855F7', '#C084FC', '#E9D5FF'] // Purple/neon for 12 points
          : points === 10
          ? ['#FCD34D', '#FDE047', '#FEF3C7', '#FFFBEB'] // Gold for 10 points
          : ['#94A3B8', '#CBD5E1', '#E2E8F0', '#F1F5F9'], // Silver/gray for 8 points
      })

      const movedMessage = result.moved 
        ? ' (הצבעה הועברה מתחפושת אחרת)' 
        : ''
      
      toast({
        title: 'תודה! 🎉',
        description: `ניתנו ${points} נקודות${points === 12 ? ' - דוז פואה!' : ''}${movedMessage}`,
      })

      // Optimistically update the selected entry's score in local state immediately
      // This gives instant feedback while the database trigger updates the actual score
      if (selectedEntry) {
        // Calculate new score: current score + points
        // If vote was moved, we already subtracted from previous entry
        const currentScore = selectedEntry.total_score || 0
        const newScore = currentScore + points
        
        console.log(`[handleVote] Updating score for entry ${selectedEntry.id}: ${currentScore} + ${points} = ${newScore}`)
        
        // Update in entries list immediately
        setEntries((prevEntries) => {
          const updated = prevEntries.map((entry) =>
            entry.id === selectedEntry.id
              ? { ...entry, total_score: newScore }
              : entry
          )
          console.log('[handleVote] Updated entries list:', updated.find(e => e.id === selectedEntry.id))
          return updated
        })
        
        // Update selectedEntry if it's still open
        setSelectedEntry((prev) => {
          if (prev && prev.id === selectedEntry.id) {
            const updated = { ...prev, total_score: newScore }
            console.log('[handleVote] Updated selectedEntry:', updated)
            return updated
          }
          return prev
        })
      }
      
      // Force refresh entries after a short delay to sync with DB
      // This ensures we get the actual calculated score from the database trigger
      setTimeout(async () => {
        console.log('[handleVote] Refreshing entries from DB...')
        await fetchEntries()
      }, 800)

      // Auto-close modal after 1 second
      setTimeout(() => {
        setSelectedEntry(null)
        setIsSubmitting(false)
      }, 1000)
    } catch (error) {
      console.error('Vote error:', error)
      toast({
        title: 'שגיאה',
        description: 'שגיאה בהצבעה. נסה שוב.',
        variant: 'destructive',
      })
      setIsSubmitting(false)
    }
  }

  // Check if user has given this point value to this entry
  const getVoteStatus = (entryId: string, points: 8 | 10 | 12) => {
    const currentVote = userVotes[entryId]
    if (currentVote === points) {
      return 'active' // User gave this exact point value to this entry
    }
    
    // Check if user gave this point value to a different entry
    const entryWithPoints = Object.entries(userVotes).find(([id, pts]) => 
      id !== entryId && pts === points
    )
    
    if (entryWithPoints) {
      return 'used-elsewhere' // User gave this point value to another entry
    }
    
    return 'available' // User hasn't used this point value yet
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    )
  }

  // Empty state
  if (entries.length === 0) {
    return (
      <div className="glass rounded-2xl p-12 text-center">
        <div className="text-6xl mb-4">🎭</div>
        <h3 className="text-2xl font-bold text-white mb-2">אין תחפושות עדיין</h3>
        <p className="text-white/70">
          תהיה הראשון להעלות תחפושת!
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-6">
        {entries.map((entry, index) => {
          const isSelected = selectedIds.includes(entry.id)
          return (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, type: 'spring', stiffness: 100 }}
              whileHover={{ scale: 1.02, y: -5 }}
              className="w-full"
            >
              <div
                className={`glass rounded-2xl overflow-hidden shadow-xl cursor-pointer transition-all ${
                  isSelected ? 'ring-2 ring-yellow-400 shadow-[0_0_30px_rgba(255,215,0,0.5)]' : ''
                }`}
                onClick={() => handleCardClick(entry)}
              >
                <div className="relative h-80 w-full group">
                  {imageErrors.has(entry.id) || !entry.image_url ? (
                    <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                      <div className="text-white/50 text-center p-4">
                        <p className="text-lg">תמונה לא זמינה</p>
                      </div>
                    </div>
                  ) : (
                    <Image
                      src={entry.image_url}
                      alt={entry.costume_title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      onError={() => {
                        setImageErrors((prev) => new Set(prev).add(entry.id))
                      }}
                      unoptimized={entry.image_url?.includes('supabase.co')}
                      loading="lazy"
                    />
                  )}
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
                  
                  {/* Score badge */}
                  {showScores && (
                    <motion.div 
                      className="absolute top-4 left-4 glass px-4 py-2 rounded-full text-white text-sm font-bold backdrop-blur-md"
                      key={`score-${entry.id}-${entry.total_score}`}
                      initial={{ scale: 1 }}
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.3 }}
                    >
                      {entry.total_score || 0} נקודות
                    </motion.div>
                  )}
                  
                  {/* Selected indicator */}
                  {isSelected && (
                    <div className="absolute inset-0 bg-yellow-400/20 flex items-center justify-center backdrop-blur-sm">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="glass px-6 py-3 rounded-full font-bold text-white backdrop-blur-md border-2 border-yellow-400"
                      >
                        ✓ נבחר
                      </motion.div>
                    </div>
                  )}
                  
                  {/* Content overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                    <h3 className="font-bold text-2xl mb-2 drop-shadow-lg line-clamp-2 break-words">
                      {entry.costume_title}
                    </h3>
                    <p className="text-base opacity-90 drop-shadow-md truncate">{entry.name}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {selectedEntry && !onSelect && (
        <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="line-clamp-2 break-words">
                {selectedEntry.costume_title}
              </DialogTitle>
              <DialogDescription className="sr-only">
                תצוגה מפורטת של התחפושת {selectedEntry.costume_title} מאת {selectedEntry.name}
              </DialogDescription>
            </DialogHeader>
            <div className="relative h-96 w-full rounded-lg overflow-hidden mb-4">
              {imageErrors.has(selectedEntry.id) || !selectedEntry.image_url ? (
                <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                  <div className="text-muted-foreground text-center p-4">
                    <p className="text-lg">תמונה לא זמינה</p>
                  </div>
                </div>
              ) : (
                <Image
                  src={selectedEntry.image_url}
                  alt={selectedEntry.costume_title}
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, 80vw"
                  loading="lazy"
                  onError={() => {
                    setImageErrors((prev) => new Set(prev).add(selectedEntry.id))
                  }}
                  unoptimized={selectedEntry.image_url?.includes('supabase.co')}
                />
              )}
            </div>
            <div className="space-y-2 mb-4">
              <p className="font-semibold truncate">{selectedEntry.name}</p>
              {selectedEntry.description && (
                <p className="text-muted-foreground line-clamp-3 break-words">
                  {selectedEntry.description}
                </p>
              )}
              {showScores && (
                <p className="text-lg font-bold text-primary">
                  {selectedEntry.total_score} נקודות
                </p>
              )}
            </div>

            {/* Phone Authentication (if voting is open and not authenticated) */}
            {isVotingOpen && !readOnly && !isAuthenticated && (
              <div className="space-y-4 p-4 glass rounded-lg border border-white/20">
                <div className="space-y-2">
                  <Label htmlFor="gallery-voter-phone" className="text-white font-semibold">
                    מספר טלפון להצבעה
                  </Label>
                  <form onSubmit={handlePhoneSubmit} className="space-y-2">
                    <Input
                      id="gallery-voter-phone"
                      type="tel"
                      inputMode="numeric"
                      dir="ltr"
                      value={voterPhone}
                      onChange={(e) => {
                        const value = e?.target?.value || ''
                        const digits = value.replace(/\D/g, '')
                        if (digits.length > 10) return
                        if (digits.length === 10 && digits.startsWith('05')) {
                          setVoterPhone(`${digits.slice(0, 3)}-${digits.slice(3)}`)
                        } else {
                          setVoterPhone(digits)
                        }
                      }}
                      placeholder="05X-XXXXXXX"
                      className="glass border-white/20 text-white placeholder:text-white/50"
                      required
                    />
                    <Button type="submit" className="w-full">
                      התחבר להצבעה
                    </Button>
                  </form>
                </div>
              </div>
            )}

            {/* Eurovision Style Voting Buttons */}
            {isVotingOpen && !readOnly && isAuthenticated && selectedEntry && (
              <div className="space-y-3">
                <div className="text-center mb-2">
                  <p className="text-white/90 font-semibold">בחר את מספר הנקודות:</p>
                  <p className="text-white/70 text-sm mt-1">
                    ניתן להעניק 8, 10 ו-12 נקודות פעם אחת בלבד
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {/* 8 Points - Silver/Gray */}
                  {(() => {
                    const status = getVoteStatus(selectedEntry.id, 8)
                    return (
                      <motion.button
                        whileHover={{ scale: status !== 'used-elsewhere' ? 1.05 : 1 }}
                        whileTap={{ scale: status !== 'used-elsewhere' ? 0.95 : 1 }}
                        onClick={() => handleVote(8)}
                        disabled={isSubmitting || status === 'used-elsewhere'}
                        className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl text-white font-bold text-lg shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[100px] relative ${
                          status === 'active'
                            ? 'bg-gradient-to-br from-gray-300 to-gray-500 ring-4 ring-white/50 shadow-2xl'
                            : status === 'used-elsewhere'
                            ? 'bg-gradient-to-br from-gray-600 to-gray-800 opacity-60'
                            : 'bg-gradient-to-br from-gray-400 to-gray-600 hover:shadow-xl'
                        }`}
                      >
                        <span className="text-3xl">🥉</span>
                        <span>8 נקודות</span>
                        {status === 'active' && (
                          <span className="text-xs absolute bottom-1 opacity-90 font-normal">✓ נבחר</span>
                        )}
                        {status === 'used-elsewhere' && (
                          <span className="text-xs absolute bottom-1 opacity-70 font-normal">בשימוש</span>
                        )}
                      </motion.button>
                    )
                  })()}

                  {/* 10 Points - Gold/Yellow */}
                  {(() => {
                    const status = getVoteStatus(selectedEntry.id, 10)
                    return (
                      <motion.button
                        whileHover={{ scale: status !== 'used-elsewhere' ? 1.05 : 1 }}
                        whileTap={{ scale: status !== 'used-elsewhere' ? 0.95 : 1 }}
                        onClick={() => handleVote(10)}
                        disabled={isSubmitting || status === 'used-elsewhere'}
                        className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl text-white font-bold text-lg shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[100px] relative ${
                          status === 'active'
                            ? 'bg-gradient-to-br from-yellow-300 to-yellow-500 ring-4 ring-white/50 shadow-2xl'
                            : status === 'used-elsewhere'
                            ? 'bg-gradient-to-br from-yellow-600 to-yellow-800 opacity-60'
                            : 'bg-gradient-to-br from-yellow-400 to-yellow-600 hover:shadow-xl'
                        }`}
                      >
                        <span className="text-3xl">🥈</span>
                        <span>10 נקודות</span>
                        {status === 'active' && (
                          <span className="text-xs absolute bottom-1 opacity-90 font-normal">✓ נבחר</span>
                        )}
                        {status === 'used-elsewhere' && (
                          <span className="text-xs absolute bottom-1 opacity-70 font-normal">בשימוש</span>
                        )}
                      </motion.button>
                    )
                  })()}

                  {/* 12 Points - Purple/Neon */}
                  {(() => {
                    const status = getVoteStatus(selectedEntry.id, 12)
                    return (
                      <motion.button
                        whileHover={{ scale: status !== 'used-elsewhere' ? 1.05 : 1 }}
                        whileTap={{ scale: status !== 'used-elsewhere' ? 0.95 : 1 }}
                        onClick={() => handleVote(12)}
                        disabled={isSubmitting || status === 'used-elsewhere'}
                        className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl text-white font-bold text-lg shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[100px] relative overflow-hidden ${
                          status === 'active'
                            ? 'bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600 ring-4 ring-white/50 shadow-2xl'
                            : status === 'used-elsewhere'
                            ? 'bg-gradient-to-br from-purple-700 via-purple-800 to-purple-900 opacity-60'
                            : 'bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 hover:shadow-xl'
                        }`}
                      >
                        <span className="text-3xl">🥇</span>
                        <span>12 נקודות</span>
                        <span className="text-xs absolute bottom-1 opacity-80">דוז פואה!</span>
                        {status === 'active' && (
                          <span className="text-xs absolute bottom-6 opacity-90 font-normal">✓ נבחר</span>
                        )}
                        {status === 'used-elsewhere' && (
                          <span className="text-xs absolute bottom-6 opacity-70 font-normal">בשימוש</span>
                        )}
                      </motion.button>
                    )
                  })()}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
