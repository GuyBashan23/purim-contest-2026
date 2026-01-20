'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase/client'
import { getSlideshowSettings } from '@/app/actions/admin'
import { useToast } from '@/components/ui/use-toast'
import { Toast, ToastTitle, ToastDescription } from '@/components/ui/toast'

interface Entry {
  id: string
  name: string
  costume_title: string
  image_url: string
}

export default function LivePage() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [currentBatch, setCurrentBatch] = useState<Entry[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [slideshowInterval, setSlideshowInterval] = useState(5000)
  const [slideshowBatchSize, setSlideshowBatchSize] = useState(3)
  const [totalCount, setTotalCount] = useState(0)
  const [newUploadToast, setNewUploadToast] = useState<{ show: boolean; name: string }>({ show: false, name: '' })
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const { toast } = useToast()

  // Load slideshow settings
  useEffect(() => {
    loadSettings()
    
    // Force full screen by removing layout constraints
    document.body.style.margin = '0'
    document.body.style.padding = '0'
    document.body.style.overflow = 'hidden'
    
    // Remove any wrapper divs that might constrain the page
    const wrapper = document.querySelector('body > div > div') as HTMLElement | null
    if (wrapper && wrapper instanceof HTMLElement) {
      wrapper.style.maxWidth = 'none'
      wrapper.style.padding = '0'
      wrapper.style.margin = '0'
      wrapper.style.width = '100vw'
      wrapper.style.height = '100vh'
    }
    
    return () => {
      // Restore defaults on unmount
      document.body.style.overflow = ''
    }
  }, [])

  const loadSettings = async () => {
    const result = await getSlideshowSettings()
    if (result.data) {
      setSlideshowInterval(result.data.slideshowInterval)
      setSlideshowBatchSize(result.data.slideshowBatchSize)
    }
  }

  // Fetch entries
  useEffect(() => {
    fetchEntries()

    // Subscribe to real-time updates
    console.log('🔌 Setting up real-time subscription...')
    const channel = supabase
      .channel('live_wall_entries')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'entries',
        },
        (payload) => {
          console.log('📥 INSERT event received:', payload)
          const newEntry = payload.new as Entry
          if (newEntry) {
            handleNewEntry(newEntry)
          } else {
            console.warn('⚠️ No new entry data in payload:', payload)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'app_settings',
        },
        () => {
          console.log('⚙️ Settings updated, reloading...')
          loadSettings()
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to real-time updates!')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Channel error - check Supabase Realtime is enabled')
        }
      })

    return () => {
      console.log('🔌 Unsubscribing from real-time updates')
      channel.unsubscribe()
    }
  }, [])

  const fetchEntries = async () => {
    try {
      console.log('📥 Fetching entries...')
      const { data, error } = await supabase
        .from('entries')
        .select('id, name, costume_title, image_url')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Error fetching entries:', error)
        throw error
      }

      const validEntries = (data || []).filter(
        (entry) => entry.image_url && entry.image_url.trim() !== ''
      )

      console.log(`✅ Fetched ${validEntries.length} valid entries`)
      setEntries(validEntries)
      setTotalCount(validEntries.length)

      // Initialize first batch
      if (validEntries.length > 0 && currentBatch.length === 0) {
        updateCurrentBatch(validEntries, 0)
      }
    } catch (error) {
      console.error('❌ Error fetching entries:', error)
    }
  }

  const handleNewEntry = (newEntry: Entry) => {
    console.log('🎉 New entry received:', newEntry)
    
    // Validate entry has required fields
    if (!newEntry || !newEntry.name || !newEntry.image_url) {
      console.warn('⚠️ Invalid entry data:', newEntry)
      return
    }

    // Add to entries array
    setEntries((prev) => {
      const updated = [newEntry, ...prev]
      setTotalCount(updated.length)
      console.log('📊 Total entries:', updated.length)
      return updated
    })

    // Show toast notification
    console.log('🔔 Showing toast for:', newEntry.name)
    setNewUploadToast({ show: true, name: newEntry.name })
    
    // Clear toast after 5 seconds
    setTimeout(() => {
      console.log('🔕 Hiding toast')
      setNewUploadToast({ show: false, name: '' })
    }, 5000)

    // Play sound effect if available
    try {
      const audio = new Audio('/assets/notification.mp3')
      audio.volume = 0.3
      audio.play().catch((err) => {
        console.log('🔇 Audio play failed (this is OK):', err)
      })
    } catch (e) {
      console.log('🔇 Audio error (this is OK):', e)
    }
  }

  const updateCurrentBatch = (entriesList: Entry[], startIndex: number) => {
    const batch: Entry[] = []
    for (let i = 0; i < slideshowBatchSize; i++) {
      const index = (startIndex + i) % entriesList.length
      if (entriesList[index]) {
        batch.push(entriesList[index])
      }
    }
    setCurrentBatch(batch)
  }

  // Auto-cycle slideshow
  useEffect(() => {
    if (entries.length === 0) return

    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    // Set up new interval
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        const nextIndex = (prev + slideshowBatchSize) % entries.length
        updateCurrentBatch(entries, nextIndex)
        return nextIndex
      })
    }, slideshowInterval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [entries, slideshowInterval, slideshowBatchSize])

  // Update batch when settings change
  useEffect(() => {
    if (entries.length > 0) {
      updateCurrentBatch(entries, currentIndex)
    }
  }, [slideshowBatchSize])

  return (
    <div 
      className="fixed inset-0 h-[100dvh] w-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white relative overflow-hidden z-50"
      style={{
        margin: 0,
        padding: 0,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100dvh',
      }}
    >
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 lg:w-[28rem] lg:h-[28rem] xl:w-[32rem] xl:h-[32rem] 2xl:w-[36rem] 2xl:h-[36rem] bg-purple-500/10 rounded-full blur-3xl"
            animate={{
              x: [0, 100, 0],
              y: [0, -100, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 20 + i * 5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              left: `${5 + i * 8}%`,
              top: `${5 + i * 8}%`,
            }}
          />
        ))}
      </div>

      {/* Live Counter */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="absolute top-4 right-4 md:top-8 md:right-8 xl:top-12 xl:right-12 z-30 bg-black/60 backdrop-blur-md border-2 border-purple-500/50 rounded-2xl px-4 py-3 md:px-8 md:py-4 xl:px-10 xl:py-5 shadow-2xl"
        style={{
          boxShadow: '0 0 40px rgba(168, 85, 247, 0.4), inset 0 0 20px rgba(168, 85, 247, 0.1)',
        }}
      >
        <motion.div
          key={totalCount}
          initial={{ scale: 1.5, color: '#a855f7' }}
          animate={{ scale: 1, color: '#ffffff' }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <p className="text-lg md:text-2xl xl:text-3xl 2xl:text-4xl font-bold text-purple-300 mb-1">
            סה״כ תחפושות
          </p>
          <p className="text-4xl md:text-6xl xl:text-7xl 2xl:text-8xl font-black text-white drop-shadow-2xl">
            {totalCount}
          </p>
        </motion.div>
      </motion.div>

      {/* New Upload Toast Overlay */}
      <AnimatePresence mode="wait">
        {newUploadToast.show && newUploadToast.name && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: -100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -100, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[100] pointer-events-none"
            style={{ position: 'fixed' }}
          >
            <div
              className="bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 p-6 sm:p-8 md:p-10 lg:p-12 xl:p-14 2xl:p-16 rounded-2xl sm:rounded-3xl lg:rounded-4xl shadow-2xl border-2 sm:border-3 md:border-4 border-white/30"
              style={{
                boxShadow:
                  '0 0 80px rgba(168, 85, 247, 0.8), 0 0 160px rgba(236, 72, 153, 0.6), inset 0 0 40px rgba(255, 255, 255, 0.2)',
              }}
            >
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="text-center"
              >
                <p className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl 2xl:text-8xl font-black text-white mb-4 drop-shadow-2xl">
                  {newUploadToast.name} העלה תחפושת!
                </p>
                <p className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl font-bold text-yellow-300 drop-shadow-xl">
                  בהצלחה! 🎭
                </p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Slideshow Grid */}
      <div className="h-full w-full flex items-center justify-center p-2 sm:p-4 md:p-6 lg:p-8 xl:p-10 2xl:p-12">
        <AnimatePresence mode="wait">
          {currentBatch.length > 0 ? (
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className={`grid gap-2 sm:gap-4 md:gap-6 lg:gap-8 xl:gap-10 2xl:gap-12 w-full h-full ${
                slideshowBatchSize === 1
                  ? 'grid-cols-1 max-w-4xl xl:max-w-5xl 2xl:max-w-6xl'
                  : slideshowBatchSize === 2
                  ? 'grid-cols-2 max-w-6xl xl:max-w-7xl 2xl:max-w-8xl'
                  : slideshowBatchSize === 3
                  ? 'grid-cols-3 max-w-7xl xl:max-w-[90rem] 2xl:max-w-[100rem]'
                  : slideshowBatchSize === 4
                  ? 'grid-cols-2 md:grid-cols-4 max-w-7xl xl:max-w-[90rem] 2xl:max-w-[100rem]'
                  : slideshowBatchSize === 5
                  ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5 max-w-7xl xl:max-w-[90rem] 2xl:max-w-[120rem]'
                  : slideshowBatchSize === 6
                  ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6 max-w-7xl xl:max-w-[90rem] 2xl:max-w-[120rem]'
                  : slideshowBatchSize === 7
                  ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 max-w-7xl xl:max-w-[90rem] 2xl:max-w-[140rem]'
                  : slideshowBatchSize === 8
                  ? 'grid-cols-2 md:grid-cols-4 lg:grid-cols-8 max-w-7xl xl:max-w-[90rem] 2xl:max-w-[140rem]'
                  : slideshowBatchSize === 9
                  ? 'grid-cols-3 md:grid-cols-3 lg:grid-cols-9 max-w-7xl xl:max-w-[90rem] 2xl:max-w-[140rem]'
                  : 'grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-10 max-w-7xl xl:max-w-[90rem] 2xl:max-w-[160rem]'
              }`}
            >
              {currentBatch.map((entry, idx) => (
                <motion.div
                  key={`${entry.id}-${currentIndex}-${idx}`}
                  initial={{ opacity: 0, scale: 0.8, y: 50 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: -50 }}
                  transition={{
                    duration: 0.6,
                    delay: idx * 0.1,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="relative w-full h-full rounded-xl sm:rounded-2xl lg:rounded-3xl overflow-hidden group"
                  style={{
                    boxShadow:
                      '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(168, 85, 247, 0.3), inset 0 0 20px rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <motion.img
                    src={entry.image_url}
                    alt={entry.costume_title}
                    className="w-full h-full object-cover"
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                    onError={(e) => {
                      // Hide broken images
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  {/* Title Overlay */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileHover={{ opacity: 1, y: 0 }}
                    className="absolute bottom-0 left-0 right-0 p-2 sm:p-3 md:p-4 lg:p-5 xl:p-6"
                  >
                    <h3 className="text-sm sm:text-base md:text-xl lg:text-2xl xl:text-3xl 2xl:text-4xl font-bold text-white drop-shadow-2xl mb-1">
                      {entry.costume_title}
                    </h3>
                    <p className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl text-white/80 drop-shadow-lg">
                      {entry.name}
                    </p>
                  </motion.div>
                  {/* Neon Border Effect */}
                  <motion.div
                    className="absolute inset-0 rounded-xl sm:rounded-2xl lg:rounded-3xl"
                    style={{
                      boxShadow: 'inset 0 0 20px rgba(168, 85, 247, 0.5)',
                    }}
                    animate={{
                      boxShadow: [
                        'inset 0 0 20px rgba(168, 85, 247, 0.5)',
                        'inset 0 0 40px rgba(236, 72, 153, 0.7)',
                        'inset 0 0 20px rgba(168, 85, 247, 0.5)',
                      ],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
              <p className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl 2xl:text-8xl font-bold text-white/60">
                טוען תמונות...
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Global styles for full screen */}
      <style jsx global>{`
        /* Override layout constraints for live page */
        body > div > div {
          max-width: none !important;
          padding: 0 !important;
          margin: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
        }
        
        /* Ensure full screen */
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
        }
      `}</style>
    </div>
  )
}
