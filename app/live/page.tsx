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
          const newEntry = payload.new as Entry
          handleNewEntry(newEntry)
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
          loadSettings()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [])

  const fetchEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('entries')
        .select('id, name, costume_title, image_url')
        .order('created_at', { ascending: false })

      if (error) throw error

      const validEntries = (data || []).filter(
        (entry) => entry.image_url && entry.image_url.trim() !== ''
      )

      setEntries(validEntries)
      setTotalCount(validEntries.length)

      // Initialize first batch
      if (validEntries.length > 0 && currentBatch.length === 0) {
        updateCurrentBatch(validEntries, 0)
      }
    } catch (error) {
      console.error('Error fetching entries:', error)
    }
  }

  const handleNewEntry = (newEntry: Entry) => {
    // Add to entries array
    setEntries((prev) => {
      const updated = [newEntry, ...prev]
      setTotalCount(updated.length)
      return updated
    })

    // Show toast notification
    setNewUploadToast({ show: true, name: newEntry.name })
    setTimeout(() => {
      setNewUploadToast({ show: false, name: '' })
    }, 5000)

    // Play sound effect if available
    try {
      const audio = new Audio('/assets/notification.mp3')
      audio.volume = 0.3
      audio.play().catch(() => {
        // Ignore audio errors
      })
    } catch (e) {
      // Ignore audio errors
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
    <div className="h-[100dvh] w-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"
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
              left: `${10 + i * 12}%`,
              top: `${10 + i * 12}%`,
            }}
          />
        ))}
      </div>

      {/* Live Counter */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="absolute top-8 right-8 z-30 bg-black/60 backdrop-blur-md border-2 border-purple-500/50 rounded-2xl px-8 py-4 shadow-2xl"
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
          <p className="text-2xl md:text-3xl font-bold text-purple-300 mb-1">
            סה״כ תחפושות
          </p>
          <p className="text-5xl md:text-7xl font-black text-white drop-shadow-2xl">
            {totalCount}
          </p>
        </motion.div>
      </motion.div>

      {/* New Upload Toast Overlay */}
      <AnimatePresence>
        {newUploadToast.show && (
          <motion.div
            initial={{ opacity: 0, y: -100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -100, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none"
          >
            <div
              className="bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 p-8 md:p-12 rounded-3xl shadow-2xl border-4 border-white/30"
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
                <p className="text-4xl md:text-6xl lg:text-8xl font-black text-white mb-4 drop-shadow-2xl">
                  {newUploadToast.name} העלה תחפושת!
                </p>
                <p className="text-3xl md:text-5xl lg:text-7xl font-bold text-yellow-300 drop-shadow-xl">
                  בהצלחה! 🎭
                </p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Slideshow Grid */}
      <div className="h-full w-full flex items-center justify-center p-4 md:p-8">
        <AnimatePresence mode="wait">
          {currentBatch.length > 0 ? (
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className={`grid gap-4 md:gap-6 lg:gap-8 w-full h-full max-w-7xl ${
                slideshowBatchSize === 1
                  ? 'grid-cols-1'
                  : slideshowBatchSize === 2
                  ? 'grid-cols-2'
                  : slideshowBatchSize === 3
                  ? 'grid-cols-3'
                  : slideshowBatchSize === 4
                  ? 'grid-cols-2 md:grid-cols-4'
                  : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5'
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
                  className="relative w-full h-full rounded-2xl overflow-hidden group"
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
                    className="absolute bottom-0 left-0 right-0 p-4 md:p-6"
                  >
                    <h3 className="text-xl md:text-3xl font-bold text-white drop-shadow-2xl mb-1">
                      {entry.costume_title}
                    </h3>
                    <p className="text-sm md:text-lg text-white/80 drop-shadow-lg">
                      {entry.name}
                    </p>
                  </motion.div>
                  {/* Neon Border Effect */}
                  <motion.div
                    className="absolute inset-0 rounded-2xl"
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
              <p className="text-4xl md:text-6xl font-bold text-white/60">
                טוען תמונות...
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Title Banner */}
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute bottom-8 left-0 right-0 z-20 text-center"
      >
        <motion.h1
          animate={{
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="text-5xl md:text-7xl lg:text-9xl font-black text-white drop-shadow-2xl mb-2"
          style={{
            textShadow:
              '0 0 40px rgba(255,255,255,0.5), 0 0 80px rgba(168, 85, 247, 0.5), 0 0 120px rgba(236, 72, 153, 0.3)',
          }}
        >
          לוח חי - Live Wall
        </motion.h1>
        <p className="text-xl md:text-2xl lg:text-3xl text-white/80 drop-shadow-lg">
          J&J MedTech Purim 2026
        </p>
      </motion.div>
    </div>
  )
}
