'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useHypeReactions, type Reaction } from '@/lib/hooks/use-hype-reactions'

export function FloatingReactions() {
  const { reactions } = useHypeReactions()

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <AnimatePresence>
        {reactions.map((reaction) => (
          <motion.div
            key={reaction.id}
            initial={{
              opacity: 0,
              scale: 0,
              x: `${reaction.x || 50}%`,
              y: '100%',
            }}
            animate={{
              opacity: [0, 1, 1, 0],
              scale: [0, 1.2, 1, 0.8],
              y: '-20%',
              x: `${(reaction.x || 50) + (Math.random() - 0.5) * 20}%`,
            }}
            exit={{
              opacity: 0,
              scale: 0,
            }}
            transition={{
              duration: 3,
              ease: 'easeOut',
            }}
            className="absolute text-6xl md:text-8xl select-none"
            style={{
              filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.8))',
            }}
          >
            {reaction.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
