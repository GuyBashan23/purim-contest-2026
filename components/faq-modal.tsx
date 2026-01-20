'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { faqData } from '@/lib/faq-data'
import { motion } from 'framer-motion'

interface FAQModalProps {
  isOpen: boolean
  onClose: () => void
}

export function FAQModal({ isOpen, onClose }: FAQModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass border-white/20 max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white text-center">
            שאלות ותשובות
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <Accordion type="single" collapsible className="w-full space-y-2">
            {faqData.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <AccordionItem
                  value={`item-${index}`}
                  className="glass rounded-lg border border-white/10 px-4 mb-2"
                >
                  <AccordionTrigger className="text-white hover:text-yellow-300 text-right font-semibold py-4">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-white/80 text-right leading-relaxed pb-4">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </div>
      </DialogContent>
    </Dialog>
  )
}
