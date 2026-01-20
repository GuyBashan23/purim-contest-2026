'use client'

import { motion } from 'framer-motion'
import { Volume2, VolumeX } from 'lucide-react'
import { useSoundEffects } from '@/lib/hooks/use-sound-effects'

export function SoundToggle() {
  const { muted, toggleMute } = useSoundEffects()

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={toggleMute}
      className="fixed top-4 left-4 z-50 w-12 h-12 rounded-full glass backdrop-blur-md border-2 border-white/20 flex items-center justify-center text-white hover:border-white/40 transition-all"
      aria-label={muted ? 'Unmute' : 'Mute'}
    >
      {muted ? (
        <VolumeX className="h-5 w-5" />
      ) : (
        <Volume2 className="h-5 w-5" />
      )}
    </motion.button>
  )
}
