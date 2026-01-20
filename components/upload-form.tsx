'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { submitEntry } from '@/app/actions/contest'
import { validateIsraeliPhone, formatPhoneNumber, normalizePhone } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import { Image as ImageIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import { useSoundEffects } from '@/lib/hooks/use-sound-effects'
import { AIScanner } from '@/components/ai-scanner'
import { UploadPreviewModal } from '@/components/upload-preview-modal'
import { UploadSuccessScreen } from '@/components/upload-success-screen'
import { compressImage, blobToFile, validateImageFile, getFileSize } from '@/lib/utils/image-compression'

export function UploadForm() {
  const [preview, setPreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [costumeTitle, setCostumeTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [scannerImage, setScannerImage] = useState<string | null>(null)
  const [verdict, setVerdict] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const { playSound } = useSoundEffects()

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
      // Compress image before preview using browser-image-compression
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
        const imageSrc = reader.result as string
        setPreview(imageSrc)
        // Show scanner animation first
        setScannerImage(imageSrc)
        setShowScanner(true)

        // Dismiss loading toast and show success
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

  const handleScannerComplete = () => {
    setShowScanner(false)
    setScannerImage(null)
    // After scanner, show preview modal
    setTimeout(() => {
      setShowPreviewModal(true)
    }, 300)
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

  const handleCancelPreview = () => {
    setShowPreviewModal(false)
    setPreview(null)
    setImageFile(null)
    setName('')
    setPhone('')
    setCostumeTitle('')
    setDescription('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleConfirmUpload = async () => {
    if (!imageFile) {
      toast({
        title: 'שגיאה',
        description: 'אנא בחר תמונה',
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
    setShowPreviewModal(false)

    const formData = new FormData()
    formData.set('phone', normalizePhone(phone))
    formData.set('name', name)
    formData.set('costume_title', costumeTitle)
    formData.set('description', description)
    formData.set('image', imageFile)

    try {
      const result = await submitEntry(null, formData)

      if (result?.error) {
        // Check for network errors
        const isNetworkError = 
          result.error.includes('fetch') ||
          result.error.includes('network') ||
          result.error.includes('Failed to fetch') ||
          navigator.onLine === false

        if (isNetworkError) {
          toast({
            title: 'שגיאת רשת',
            description: 'אין חיבור לאינטרנט. אנא בדוק את החיבור ונסה שוב.',
            variant: 'destructive',
          })
        } else {
          toast({
            title: 'שגיאה',
            description: result.error,
            variant: 'destructive',
          })
        }
        setIsSubmitting(false)
        setShowPreviewModal(true) // Show modal again on error
      } else if (result?.success) {
        // Play success sound
        playSound('upload-success')

        // Show success screen
        setShowSuccess(true)
        
        // Reset form
        setPreview(null)
        setImageFile(null)
        setPhone('')
        setName('')
        setCostumeTitle('')
        setDescription('')
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        setIsSubmitting(false)
      }
    } catch (error) {
      // Catch any unexpected errors
      console.error('Upload error:', error)
      const isNetworkError = 
        error instanceof TypeError && error.message.includes('fetch') ||
        !navigator.onLine

      toast({
        title: isNetworkError ? 'שגיאת רשת' : 'שגיאה',
        description: isNetworkError
          ? 'אין חיבור לאינטרנט. אנא בדוק את החיבור ונסה שוב.'
          : 'שגיאה בלתי צפויה. אנא נסה שוב.',
        variant: 'destructive',
      })
      setIsSubmitting(false)
      setShowPreviewModal(true)
    }
  }

  // Show success screen
  if (showSuccess) {
    return <UploadSuccessScreen />
  }

  return (
    <>
      {/* AI Scanner Overlay */}
      {showScanner && scannerImage && (
        <AIScanner
          imageSrc={scannerImage}
          onComplete={handleScannerComplete}
          onVerdict={setVerdict}
        />
      )}

      {/* Preview & Confirm Modal */}
      <UploadPreviewModal
        isOpen={showPreviewModal}
        imagePreview={preview}
        name={name}
        phone={phone}
        costumeTitle={costumeTitle}
        description={description}
        onNameChange={setName}
        onPhoneChange={handlePhoneChange}
        onCostumeTitleChange={setCostumeTitle}
        onDescriptionChange={setDescription}
        onCancel={handleCancelPreview}
        onConfirm={handleConfirmUpload}
        isSubmitting={isSubmitting}
      />

      {/* Main Upload Form */}
      <div className="glass rounded-2xl p-6 shadow-xl w-full">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">הרשמה לתחרות</h2>
          <p className="text-white/80">
            העלה את תמונת התחפושת שלך והצטרף לתחרות
          </p>
        </div>

        <div className="space-y-6">
          {/* Image Upload Area */}
          <div className="space-y-2">
            <Label htmlFor="image" className="text-white font-semibold">תמונת התחפושת</Label>
            <div className="border-2 border-white/30 border-dashed rounded-2xl p-8 text-center glass hover:border-white/50 transition-all">
              {preview ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative"
                >
                  <img
                    src={preview}
                    alt="Preview"
                    className="max-h-48 mx-auto rounded-2xl shadow-lg"
                  />
                  <p className="text-white/80 mt-4 text-sm">
                    תמונה נבחרה - לחץ שוב לבחירת תמונה אחרת
                  </p>
                </motion.div>
              ) : (
                <div>
                  <ImageIcon className="h-16 w-16 mx-auto text-white/60 mb-4" />
                  <Label htmlFor="image" className="cursor-pointer text-white">
                    <span className="text-yellow-300 hover:underline font-semibold text-lg">
                      לחץ לבחירת תמונה
                    </span>
                    <br />
                    <span className="text-white/60 text-sm mt-2 block">
                      או גרור לכאן
                    </span>
                  </Label>
                </div>
              )}
              <Input
                ref={fileInputRef}
                id="image"
                name="image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Info Text */}
          <p className="text-white/60 text-sm text-center">
            לאחר בחירת התמונה תוכל לבדוק ולאשר לפני השליחה
          </p>
        </div>
      </div>
    </>
  )
}
