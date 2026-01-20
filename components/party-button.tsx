'use client'

import { motion } from 'framer-motion'
import { Button, ButtonProps } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PartyButtonProps extends ButtonProps {
  shimmer?: boolean
}

export function PartyButton({ 
  children, 
  className, 
  shimmer = true,
  ...props 
}: PartyButtonProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      <Button
        className={cn(
          'relative overflow-hidden rounded-full px-8 py-6 text-lg font-bold shadow-2xl',
          'bg-gradient-to-r from-[#eb1801] via-[#FF6B35] to-[#eb1801]',
          'text-white border-0',
          'hover:shadow-[0_0_30px_rgba(235,24,1,0.5)]',
          shimmer && 'shimmer',
          className
        )}
        {...props}
      >
        <span className="relative z-10">{children}</span>
      </Button>
    </motion.div>
  )
}
