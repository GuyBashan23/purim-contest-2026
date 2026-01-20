'use client'

import { motion } from 'framer-motion'
import { useHypeReactions, type ReactionEmoji } from '@/lib/hooks/use-hype-reactions'
import { useSoundEffects } from '@/lib/hooks/use-sound-effects'

const REACTIONS: { emoji: ReactionEmoji; label: string; color: string }[] = [
  { emoji: '🔥', label: 'Fire', color: 'from-orange-500 to-red-600' },
  { emoji: '👏', label: 'Clap', color: 'from-yellow-400 to-orange-500' },
  { emoji: '🎭', label: 'Drama', color: 'from-purple-500 to-pink-600' },
  { emoji: '💯', label: 'Perfect', color: 'from-blue-500 to-cyan-500' },
]

export function HypeReactionButtons() {
  const { sendReaction } = useHypeReactions()
  const { playSound } = useSoundEffects()

  const handleReaction = (emoji: ReactionEmoji) => {
    sendReaction(emoji)
    playSound('reaction')
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex gap-3">
      {REACTIONS.map((reaction, index) => (
        <motion.button
          key={reaction.emoji}
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: index * 0.1, type: 'spring', stiffness: 200 }}
          whileHover={{ scale: 1.2, y: -5 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => handleReaction(reaction.emoji)}
          className={`
            w-14 h-14 rounded-full
            bg-gradient-to-br ${reaction.color}
            shadow-2xl
            flex items-center justify-center
            text-2xl
            backdrop-blur-sm
            border-2 border-white/30
            hover:border-white/60
            transition-all
          `}
          aria-label={reaction.label}
        >
          {reaction.emoji}
        </motion.button>
      ))}
    </div>
  )
}
