'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export type ReactionEmoji = '🔥' | '👏' | '🎭' | '💯'

export interface Reaction {
  id: string
  emoji: ReactionEmoji
  timestamp: number
  x?: number // Position for display
  y?: number
}

/**
 * Hook for sending and receiving hype reactions via Supabase broadcast
 */
export function useHypeReactions() {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)
  const [reactions, setReactions] = useState<Reaction[]>([])

  useEffect(() => {
    // Track all timeout IDs for cleanup
    const timeoutIds: NodeJS.Timeout[] = []

    // Subscribe to broadcast events
    const reactionChannel = supabase
      .channel('hype_reactions')
      .on(
        'broadcast',
        { event: 'reaction' },
        (payload) => {
          const reaction: Reaction = {
            id: `${Date.now()}-${Math.random()}`,
            emoji: payload.payload.emoji,
            timestamp: Date.now(),
            x: payload.payload.x || Math.random() * 100,
            y: payload.payload.y || Math.random() * 100,
          }
          setReactions((prev) => [...prev, reaction])
          
          // Remove reaction after animation (3 seconds)
          const timeoutId = setTimeout(() => {
            setReactions((prev) => prev.filter((r) => r.id !== reaction.id))
          }, 3000)
          timeoutIds.push(timeoutId)
        }
      )
      .subscribe()

    setChannel(reactionChannel)

    return () => {
      reactionChannel.unsubscribe()
      // Clear all pending timeouts to prevent memory leaks
      timeoutIds.forEach((id) => clearTimeout(id))
    }
  }, [])

  const sendReaction = async (emoji: ReactionEmoji) => {
    if (!channel) return

    const payload = {
      emoji,
      x: Math.random() * 100, // Random position for variety
      y: Math.random() * 100,
    }

    await channel.send({
      type: 'broadcast',
      event: 'reaction',
      payload,
    })
  }

  return {
    reactions,
    sendReaction,
  }
}
