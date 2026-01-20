'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowRight, Home, HelpCircle } from 'lucide-react'
import Link from 'next/link'

// Dynamic import for FAQModal (non-critical, heavy component)
const FAQModal = dynamic(() => import('@/components/faq-modal').then((mod) => mod.FAQModal), {
  ssr: false,
  loading: () => null, // Don't show loading state for modal
})

interface NavigationHeaderProps {
  title?: string
  showHome?: boolean
}

export function NavigationHeader({ title, showHome = true }: NavigationHeaderProps) {
  const router = useRouter()
  const [isFAQOpen, setIsFAQOpen] = useState(false)

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full mb-3 sm:mb-4 md:mb-6"
      >
        <div className="flex items-center justify-between p-2 sm:p-3 md:p-4 glass rounded-xl sm:rounded-2xl backdrop-blur-md border border-white/20">
          {/* Left side: Back Button + FAQ Button */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.back()}
              className="p-2 sm:p-3 md:p-4 rounded-full glass border-2 border-white/20 hover:border-white/40 text-white transition-all flex items-center gap-1 sm:gap-2 font-semibold text-sm sm:text-base min-h-[40px] sm:min-h-[44px]"
              aria-label="Back"
            >
              <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">חזור</span>
            </motion.button>

            {/* FAQ Help Button */}
            <motion.button
              whileHover={{ scale: 1.1, rotate: 15 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsFAQOpen(true)}
              className="p-2 sm:p-3 rounded-full glass border-2 border-yellow-400/50 hover:border-yellow-400 bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-300 transition-all min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] flex items-center justify-center"
              aria-label="Help / FAQ"
            >
              <HelpCircle className="h-4 w-4 sm:h-5 sm:w-5" />
            </motion.button>
          </div>

          {/* Title */}
          {title && (
            <h2 className="text-sm sm:text-base md:text-lg font-bold text-white flex-1 text-center px-1 sm:px-2">
              {title}
            </h2>
          )}

          {/* Home Button */}
          {showHome ? (
            <Link href="/">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 sm:p-3 md:p-4 rounded-full glass border-2 border-white/20 hover:border-white/40 text-white transition-all min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] flex items-center justify-center"
                aria-label="Home"
              >
                <Home className="h-4 w-4 sm:h-5 sm:w-5" />
              </motion.button>
            </Link>
          ) : (
            <div className="w-10 sm:w-12 md:w-14"></div>
          )}
        </div>
      </motion.div>

      {/* FAQ Modal */}
      <FAQModal isOpen={isFAQOpen} onClose={() => setIsFAQOpen(false)} />
    </>
  )
}
