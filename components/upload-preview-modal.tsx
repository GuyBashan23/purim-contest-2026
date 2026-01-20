'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X } from 'lucide-react'
import Image from 'next/image'

interface UploadPreviewModalProps {
  isOpen: boolean
  imagePreview: string | null
  name: string
  phone: string
  costumeTitle: string
  description: string
  onNameChange: (value: string) => void
  onPhoneChange: (value: string) => void
  onCostumeTitleChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onCancel: () => void
  onConfirm: () => void
  isSubmitting: boolean
}

export function UploadPreviewModal({
  isOpen,
  imagePreview,
  name,
  phone,
  costumeTitle,
  description,
  onNameChange,
  onPhoneChange,
  onCostumeTitleChange,
  onDescriptionChange,
  onCancel,
  onConfirm,
  isSubmitting,
}: UploadPreviewModalProps) {
  if (!isOpen || !imagePreview) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onCancel}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl overflow-hidden shadow-2xl border-2 border-white/20"
        >
          {/* Header */}
          <div className="relative p-6 bg-gradient-to-r from-[#eb1801] to-[#FF6B35]">
            <h2 className="text-2xl font-bold text-white text-center">
              האם זו התמונה שברצונך לשלוח?
            </h2>
            <button
              onClick={onCancel}
              className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-all"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-5 md:p-6 space-y-4 sm:space-y-5 md:space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Polaroid-style Image Frame */}
            <div className="relative bg-white p-4 rounded-lg shadow-2xl">
              <div className="relative aspect-[3/4] w-full rounded overflow-hidden">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Polaroid bottom border */}
              <div className="h-8 bg-white" />
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="preview-name" className="text-white font-semibold">
                  שם מלא
                </Label>
                <Input
                  id="preview-name"
                  value={name}
                  onChange={(e) => onNameChange(e.target.value)}
                  className="glass border-white/20 text-white placeholder:text-white/50"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="preview-phone" className="text-white font-semibold">
                  מספר טלפון
                </Label>
                <Input
                  id="preview-phone"
                  type="tel"
                  inputMode="numeric"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => {
                    // Safely extract value
                    const value = e?.target?.value || ''
                    // Pass the event to the handler (it will handle it safely)
                    onPhoneChange(value)
                  }}
                  placeholder="05X-XXXXXXX"
                  className="glass border-white/20 text-white placeholder:text-white/50"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="preview-costume-title" className="text-white font-semibold">
                  כותרת התחפושת
                </Label>
                <Input
                  id="preview-costume-title"
                  value={costumeTitle}
                  onChange={(e) => onCostumeTitleChange(e.target.value)}
                  className="glass border-white/20 text-white placeholder:text-white/50"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="preview-description" className="text-white font-semibold">
                  תיאור (אופציונלי)
                </Label>
                <textarea
                  id="preview-description"
                  value={description}
                  onChange={(e) => onDescriptionChange(e.target.value)}
                  className="flex min-h-[80px] w-full rounded-2xl glass border-white/20 px-3 py-2 text-sm text-white placeholder:text-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-6 pt-0 space-y-3">
            <Button
              onClick={onConfirm}
              disabled={!name || !phone || !costumeTitle || isSubmitting}
              className="w-full h-14 text-lg font-bold bg-gradient-to-r from-[#eb1801] to-[#FF6B35] hover:from-[#FF6B35] hover:to-[#eb1801] text-white border-0"
            >
              {isSubmitting ? 'שולח...' : '✅ נראה מעולה, שלח!'}
            </Button>
            <Button
              onClick={onCancel}
              disabled={isSubmitting}
              variant="outline"
              className="w-full h-14 text-lg font-semibold glass border-white/30 text-white hover:bg-white/10"
            >
              🔴 רגע, החלף תמונה
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
