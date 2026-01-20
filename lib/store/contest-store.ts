import { create } from 'zustand'
import { supabase } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export type ContestPhase = 'registration' | 'voting' | 'finals' | 'winners'

export interface ContestState {
  id: string
  current_phase: ContestPhase
  phase_2_start_time: string | null
  phase_3_start_time: string | null
  phase_4_start_time: string | null
  updated_at: string
}

interface ContestStore {
  state: ContestState | null
  isLoading: boolean
  error: string | null
  channel: RealtimeChannel | null
  fetchState: () => Promise<void>
  subscribeToChanges: () => void
  unsubscribe: () => void
}

export const useContestStore = create<ContestStore>((set, get) => ({
  state: null,
  isLoading: true,
  error: null,
  channel: null,

  fetchState: async () => {
    try {
      set({ isLoading: true, error: null })
      const { data, error } = await supabase
        .from('contest_state')
        .select('*')
        .single()

      if (error) throw error

      set({ state: data, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false,
      })
    }
  },

  subscribeToChanges: () => {
    const { channel: existingChannel } = get()
    if (existingChannel) {
      existingChannel.unsubscribe()
    }

    const channel = supabase
      .channel('contest_state_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contest_state',
        },
        async () => {
          // Refetch state when changes occur
          await get().fetchState()
        }
      )
      .subscribe()

    set({ channel })
  },

  unsubscribe: () => {
    const { channel } = get()
    if (channel) {
      channel.unsubscribe()
      set({ channel: null })
    }
  },
}))
