'use client'

import { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { X, Image as ImageIcon } from 'lucide-react'
import { formatPhoneNumber, normalizePhone, validateIsraeliPhone } from '@/lib/utils'
import { compressImage, blobToFile, validateImageFile, getFileSize } from '@/lib/utils/image-compression'

interface ManualUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  password: string
}

export function ManualUploadModal({
  isOpen,
  onClose,
  onSuccess,
  password,
}: ManualUploadModalProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [costumeTitle, setCostumeTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file
    const validation = validateImageFile(file)
    if (!validation.valid) {
      toast({
        title: 'שגיאה',
        description: validation.error || 'קובץ לא תקין',
        variant: 'destructive',
      })
      return
    }

    // Show loading toast
    const loadingToast = toast({
      title: 'דוחס תמונה...',
      description: 'אנא המתן',
    })

    try {
      // Compress image using browser-image-compression
      // This uses Web Worker so it won't freeze the UI
      const compressedBlob = await compressImage(file, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.85,
        maxSizeKB: 800, // Max 800KB (0.8MB) as per requirements
      })

      // Convert to File for FormData
      const compressedFile = blobToFile(
        compressedBlob,
        file.name,
        'image/jpeg'
      )

      // Show compression stats
      const originalSize = getFileSize(file.size)
      const compressedSize = getFileSize(compressedBlob.size)
      const savings = ((1 - compressedBlob.size / file.size) * 100).toFixed(0)

      setImageFile(compressedFile)

      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
        loadingToast.dismiss()
        toast({
          title: 'תמונה דחוסה',
          description: `${originalSize} → ${compressedSize} (חיסכון ${savings}%)`,
        })
      }
      reader.readAsDataURL(compressedBlob)
    } catch (error) {
      loadingToast.dismiss()
      toast({
        title: 'שגיאה',
        description: 'שגיאה בדחיסת התמונה. נסה שוב.',
        variant: 'destructive',
      })
      console.error('Compression error:', error)
    }
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement> | string) => {
    let rawValue = ''

    // 1. Extract the value safely - handle both Event and direct String
    if (typeof e === 'string') {
      rawValue = e
    } else if (e && e.target && e.target.value !== undefined) {
      rawValue = e.target.value
    } else {
      // Fallback: if e is an object but no target, try to get value directly
      rawValue = (e as any)?.value || ''
    }

    // 2. Filter only numbers
    const digits = rawValue.replace(/\D/g, '')

    // 3. Limit to 10 digits (Israeli phone number length)
    if (digits.length > 10) {
      return // Don't update if exceeds 10 digits
    }

    // 4. Only format when we have exactly 10 digits starting with 05
    // Otherwise, just show the digits as typed (preserves leading zero)
    if (digits.length === 10 && digits.startsWith('05')) {
      setPhone(`${digits.slice(0, 3)}-${digits.slice(3)}`)
    } else {
      setPhone(digits) // Allow free typing without formatting
    }
  }

  const handleSubmit = async () => {
    if (!imageFile || !name || !phone || !costumeTitle) {
      toast({
        title: 'שגיאה',
        description: 'אנא מלא את כל השדות הנדרשים',
        variant: 'destructive',
      })
      return
    }

    if (!validateIsraeliPhone(phone)) {
      toast({
        title: 'שגיאה',
        description: 'מספר טלפון לא תקין',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)

    try {
      const formDataToSend = new FormData()
      formDataToSend.set('phone', normalizePhone(phone))
      formDataToSend.set('name', name)
      formDataToSend.set('costume_title', costumeTitle)
      formDataToSend.set('description', description)
      formDataToSend.set('image', imageFile)

      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: {
          'X-Admin-Password': password,
        },
        body: formDataToSend,
      })

      const result = await response.json()

      if (result.error) {
        toast({
          title: 'שגיאה',
          description: result.error,
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'הצלחה',
          description: 'התמונה הועלתה בהצלחה',
        })
        handleClose()
        onSuccess()
      }
    } catch (error) {
      toast({
        title: 'שגיאה',
        description: 'שגיאה בהעלאת התמונה',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setPreview(null)
    setImageFile(null)
    setPhone('')
    setName('')
    setCostumeTitle('')
    setDescription('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="glass border-slate-700 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white text-2xl">העלאה ידנית</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Image Upload */}
          <div className="space-y-2">
            <Label htmlFor="manual-image" className="text-white font-semibold">
              תמונת התחפושת
            </Label>
            <div className="border-2 border-white/30 border-dashed rounded-2xl p-6 text-center glass">
              {preview ? (
                <div className="relative">
                  <img
                    src={preview}
                    alt="Preview"
                    className="max-h-64 mx-auto rounded-2xl shadow-lg"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 left-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm"
                    onClick={() => {
                      setPreview(null)
                      setImageFile(null)
                      if (fileInputRef.current) {
                        fileInputRef.current.value = ''
                      }
                    }}
                  >
                    <X className="h-4 w-4 text-white" />
                  </Button>
                </div>
              ) : (
                <div>
                  <ImageIcon className="h-12 w-12 mx-auto text-white/60 mb-4" />
                  <Label htmlFor="manual-image" className="cursor-pointer text-white">
                    <span className="text-yellow-300 hover:underline font-semibold">
                      לחץ לבחירת תמונה
                    </span>
                  </Label>
                  <Input
                    ref={fileInputRef}
                    id="manual-image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="manual-name" className="text-white">שם מלא</Label>
              <Input
                id="manual-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="glass border-white/20 text-white"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="manual-phone" className="text-white">מספר טלפון</Label>
              <Input
                id="manual-phone"
                type="tel"
                inputMode="numeric"
                dir="ltr"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="05X-XXXXXXX"
                className="glass border-white/20 text-white"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="manual-title" className="text-white">כותרת התחפושת</Label>
            <Input
              id="manual-title"
              value={costumeTitle}
              onChange={(e) => setCostumeTitle(e.target.value)}
              className="glass border-white/20 text-white"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="manual-description" className="text-white">תיאור (אופציונלי)</Label>
            <textarea
              id="manual-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="flex min-h-[80px] w-full rounded-lg glass border-white/20 px-3 py-2 text-sm text-white placeholder:text-white/50"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !imageFile || !name || !phone || !costumeTitle}
              className="flex-1 bg-gradient-to-r from-[#eb1801] to-[#FF6B35]"
            >
              {isSubmitting ? 'שולח...' : 'העלה'}
            </Button>
            <Button
              onClick={handleClose}
              variant="outline"
              className="flex-1 glass border-white/20 text-white"
            >
              ביטול
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
