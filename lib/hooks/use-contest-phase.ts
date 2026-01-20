'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { TARGET_DATE } from '@/lib/config'
import type { RealtimeChannel } from '@supabase/supabase-js'

export type ContestPhase = 'UPLOAD' | 'VOTING' | 'FINALS' | 'ENDED'

interface AppSettings {
  id: string
  current_phase: ContestPhase
  voting_start_time: string | null
  updated_at: string
}

interface ContestPhaseState {
  phase: ContestPhase
  timeRemaining: number | null
  isVotingOpen: boolean
  votingStartTime: string | null
}

/**
 * Hook to determine the current contest phase from Supabase app_settings
 * Falls back to TARGET_DATE if DB connection fails
 * Subscribes to real-time updates via Supabase Realtime
 */
export function useContestPhase(): ContestPhaseState {
  const [phase, setPhase] = useState<ContestPhase>('UPLOAD')
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [votingStartTime, setVotingStartTime] = useState<string | null>(null)
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)
  const [useFallback, setUseFallback] = useState(false)

  useEffect(() => {
    let mounted = true

    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('*')
          .single()

        if (error) throw error

        if (mounted && data) {
          const settings = data as AppSettings
          setPhase(settings.current_phase)
          setVotingStartTime(settings.voting_start_time)
          setUseFallback(false)

          // Calculate time remaining if voting hasn't started
          if (settings.current_phase === 'UPLOAD' && settings.voting_start_time) {
            const now = Date.now()
            const target = new Date(settings.voting_start_time).getTime()
            const remaining = target - now
            setTimeRemaining(remaining > 0 ? remaining : 0)
          } else {
            setTimeRemaining(0)
          }
        }
      } catch (error) {
        // Silently fallback if table doesn't exist (404) or other errors
        if (mounted) {
          setUseFallback(true)
          // Fallback to TARGET_DATE logic
          const now = Date.now()
          const remaining = TARGET_DATE - now
          if (remaining <= 0) {
            setPhase('VOTING')
            setTimeRemaining(0)
          } else {
            setPhase('UPLOAD')
            setTimeRemaining(remaining)
          }
        }
      }
    }

    // Initial fetch
    fetchSettings()

    // Subscribe to real-time changes
    const realtimeChannel = supabase
      .channel('app_settings_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_settings',
        },
        () => {
          fetchSettings()
        }
      )
      .subscribe()

    setChannel(realtimeChannel)

    // Update timer if using fallback
    let interval: NodeJS.Timeout | null = null
    if (useFallback) {
      interval = setInterval(() => {
        const now = Date.now()
        const remaining = TARGET_DATE - now
        if (remaining <= 0) {
          setPhase('VOTING')
          setTimeRemaining(0)
        } else {
          setPhase('UPLOAD')
          setTimeRemaining(remaining)
        }
      }, 1000)
    } else if (phase === 'UPLOAD' && votingStartTime) {
      // Update timer for voting start time
      interval = setInterval(() => {
        const now = Date.now()
        const target = new Date(votingStartTime).getTime()
        const remaining = target - now
        if (remaining <= 0) {
          setTimeRemaining(0)
        } else {
          setTimeRemaining(remaining)
        }
      }, 1000)
    }

    return () => {
      mounted = false
      if (realtimeChannel) {
        realtimeChannel.unsubscribe()
      }
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [useFallback, phase, votingStartTime])

  return {
    phase,
    timeRemaining,
    isVotingOpen: phase === 'VOTING' || phase === 'FINALS',
    votingStartTime,
  }
}
