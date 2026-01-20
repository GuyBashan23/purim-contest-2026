'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase/client'
import { getSlideshowSettings } from '@/app/actions/admin'
import { useToast } from '@/components/ui/use-toast'
import { Toast, ToastTitle, ToastDescription } from '@/components/ui/toast'
import type { RealtimeChannel } from '@supabase/supabase-js'

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

  const getFirstName = useCallback((fullName: string): string => {
    if (!fullName) return ''
    // Extract first name (before first space)
    const firstName = fullName.trim().split(/\s+/)[0]
    return firstName || fullName
  }, [])

  const updateCurrentBatch = useCallback((entriesList: Entry[], startIndex: number) => {
    const batch: Entry[] = []
    for (let i = 0; i < slideshowBatchSize; i++) {
      const index = (startIndex + i) % entriesList.length
      if (entriesList[index]) {
        batch.push(entriesList[index])
      }
    }
    setCurrentBatch(batch)
  }, [slideshowBatchSize])

  const handleNewEntry = useCallback((newEntry: Entry) => {
    console.log('🎉 New entry received:', newEntry)
    
    // Validate entry has required fields
    if (!newEntry || !newEntry.image_url || !newEntry.id) {
      console.warn('⚠️ Invalid entry data:', newEntry)
      return
    }

    // Ensure entry has all required fields for Entry interface
    const validEntry: Entry = {
      id: newEntry.id,
      name: newEntry.name || 'ללא שם',
      costume_title: newEntry.costume_title || 'ללא כותרת',
      image_url: newEntry.image_url,
    }

    // Add to entries array (prepend to show newest first)
    setEntries((prev) => {
      // Check if entry already exists to avoid duplicates
      const exists = prev.some((e) => e.id === validEntry.id)
      if (exists) {
        console.log('⚠️ Entry already exists, skipping duplicate')
        return prev
      }
      
      const updated = [validEntry, ...prev]
      setTotalCount(updated.length)
      console.log('📊 Total entries after add:', updated.length)
      
      // Update current batch if it's the first entry
      if (prev.length === 0) {
        updateCurrentBatch(updated, 0)
        setCurrentIndex(0)
      }
      
      return updated
    })

    // Show toast notification
    const firstName = validEntry.name ? getFirstName(validEntry.name) : ''
    const displayName = firstName || 'מישהו'
    console.log('🔔 Showing toast notification for:', displayName)
    
    setNewUploadToast({ show: true, name: displayName })
    
    // Clear toast after 5 seconds
    setTimeout(() => {
      console.log('🔕 Hiding toast')
      setNewUploadToast((prev) => ({ ...prev, show: false }))
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
  }, [getFirstName, updateCurrentBatch])

  // Fetch entries and set up real-time subscription with polling fallback
  useEffect(() => {
    let channel: RealtimeChannel | null = null
    let pollingInterval: NodeJS.Timeout | null = null
    let lastEntryCount = 0
    
    const setupSubscription = async () => {
      // First, fetch initial entries
      const initialData = await fetchEntries()
      lastEntryCount = entries.length || 0

      // Subscribe to real-time updates
      console.log('🔌 Setting up real-time subscription...')
      console.log('📋 Ensuring Realtime is enabled on entries table in Supabase Dashboard')
      
      channel = supabase
        .channel('live_wall_entries_' + Date.now(), {
          config: {
            broadcast: { self: false },
            presence: { key: '' }
          }
        })
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'entries',
          },
          (payload) => {
            console.log('📥 INSERT event received!')
            console.log('📦 Full payload:', payload)
            console.log('📦 Payload.new:', payload.new)
            
            try {
              const newEntry = payload.new as any
              
              if (!newEntry) {
                console.error('❌ No new entry data in payload:', payload)
                return
              }
              
              // Create Entry object with all required fields
              const entry: Entry = {
                id: newEntry.id || newEntry.ID || '',
                name: newEntry.name || newEntry.NAME || 'ללא שם',
                costume_title: newEntry.costume_title || newEntry.COSTUME_TITLE || newEntry.costumeTitle || 'ללא כותרת',
                image_url: newEntry.image_url || newEntry.IMAGE_URL || newEntry.imageUrl || '',
              }
              
              // Validate required fields
              if (!entry.id) {
                console.error('❌ Entry missing id:', newEntry)
                console.error('❌ Full payload structure:', JSON.stringify(payload, null, 2))
                return
              }
              
              if (!entry.image_url) {
                console.error('❌ Entry missing image_url:', newEntry)
                console.error('❌ Available fields:', Object.keys(newEntry))
                return
              }
              
              console.log('✅ Valid entry created:', entry)
              handleNewEntry(entry)
              lastEntryCount = entries.length + 1
            } catch (error) {
              console.error('❌ Error processing INSERT event:', error)
              console.error('❌ Payload that caused error:', payload)
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
        .subscribe((status, err) => {
          console.log('📡 Subscription status:', status)
          if (err) {
            console.error('❌ Subscription error:', err)
          }
          
          if (status === 'SUBSCRIBED') {
            console.log('✅ Successfully subscribed to real-time updates!')
            console.log('👂 Listening for new entries on entries table...')
            
            // Set up polling fallback (check every 3 seconds for new entries)
            pollingInterval = setInterval(async () => {
              try {
                const { data, error } = await supabase
                  .from('entries')
                  .select('id, name, costume_title, image_url')
                  .order('created_at', { ascending: false })
                  .limit(1)
                
                if (error) {
                  console.error('❌ Polling error:', error)
                  return
                }
                
                if (data && data.length > 0) {
                  const latestEntry = data[0]
                  const currentCount = entries.length
                  
                  // Check if this is a new entry we haven't seen
                  const exists = entries.some(e => e.id === latestEntry.id)
                  
                  if (!exists && latestEntry.image_url) {
                    console.log('🔄 Polling detected new entry:', latestEntry)
                    handleNewEntry(latestEntry as Entry)
                  }
                }
              } catch (pollError) {
                console.error('❌ Polling check error:', pollError)
              }
            }, 3000)
            
            console.log('🔄 Polling fallback enabled (checks every 3 seconds)')
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Channel error - check Supabase Realtime is enabled')
            console.error('📖 Enable Realtime in Supabase Dashboard:')
            console.error('   1. Go to Database → Replication')
            console.error('   2. Find "entries" table')
            console.error('   3. Toggle "Enable Realtime" ON')
            console.error('   4. Or run the SQL script: enable_realtime.sql')
            
            // Enable polling immediately if Realtime fails
            pollingInterval = setInterval(async () => {
              await fetchEntries()
            }, 3000)
          } else if (status === 'TIMED_OUT') {
            console.error('⏱️ Subscription timed out - enabling polling fallback')
            pollingInterval = setInterval(async () => {
              await fetchEntries()
            }, 3000)
          } else if (status === 'CLOSED') {
            console.warn('🔒 Channel closed - enabling polling fallback')
            pollingInterval = setInterval(async () => {
              await fetchEntries()
            }, 3000)
          } else if (status === 'SUBSCRIBE_FAILED') {
            console.error('❌ Subscription failed - enabling polling fallback')
            pollingInterval = setInterval(async () => {
              await fetchEntries()
            }, 3000)
          }
        })
    }

    setupSubscription()

    return () => {
      if (channel) {
        console.log('🔌 Unsubscribing from real-time updates')
        channel.unsubscribe()
      }
      if (pollingInterval) {
        console.log('🔄 Clearing polling interval')
        clearInterval(pollingInterval)
      }
    }
  }, [handleNewEntry, entries.length])

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
      
      // Check if there are new entries
      const previousCount = entries.length
      if (validEntries.length > previousCount) {
        const newEntries = validEntries.slice(0, validEntries.length - previousCount)
        console.log(`🆕 Found ${newEntries.length} new entries via polling`)
        
        // Process new entries (oldest first to maintain order)
        for (const newEntry of newEntries.reverse()) {
          if (!entries.some(e => e.id === newEntry.id)) {
            console.log('🔄 Processing new entry from polling:', newEntry)
            handleNewEntry(newEntry as Entry)
          }
        }
      }
      
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

      {/* New Upload Toast Notification - Top Center */}
      <AnimatePresence mode="wait">
        {newUploadToast.show && (
          <motion.div
            key={`toast-${newUploadToast.name}`}
            initial={{ opacity: 0, y: -100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            transition={{ 
              type: 'spring', 
              stiffness: 500, 
              damping: 30,
              duration: 0.4
            }}
            className="fixed top-4 md:top-8 left-1/2 transform -translate-x-1/2 z-[9999] pointer-events-none"
            style={{ 
              position: 'fixed',
              zIndex: 9999
            }}
          >
            <div
              className="glass backdrop-blur-xl bg-black/40 border-2 border-purple-400/60 rounded-2xl px-6 py-4 md:px-8 md:py-5 lg:px-10 lg:py-6 shadow-2xl"
              style={{
                boxShadow:
                  '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(168, 85, 247, 0.5), 0 0 40px rgba(236, 72, 153, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                animation: 'glow-pulse 2s ease-in-out infinite',
              }}
            >
              <motion.div
                initial={{ scale: 1 }}
                animate={{ 
                  scale: [1, 1.02, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="flex items-center gap-3 md:gap-4"
              >
                {/* Icon */}
                <motion.div
                  animate={{ 
                    rotate: [0, 10, -10, 0],
                  }}
                  transition={{
                    duration: 0.5,
                    repeat: Infinity,
                    repeatDelay: 2,
                  }}
                  className="text-2xl md:text-3xl lg:text-4xl"
                >
                  🎭
                </motion.div>
                
                {/* Text */}
                <p className="text-lg md:text-xl lg:text-2xl xl:text-3xl font-bold text-white drop-shadow-lg whitespace-nowrap">
                  {newUploadToast.name === 'מישהו' ? (
                    <span className="text-white/90">מישהו העלה תמונה חדשה! 🎭</span>
                  ) : (
                    <>
                      <span className="text-purple-300 font-extrabold">{newUploadToast.name}</span>
                      <span className="text-white/90"> העלה תמונה לתחרות! 🎭</span>
                    </>
                  )}
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
        
        /* Glow pulse animation for toast */
        @keyframes glow-pulse {
          0%, 100% {
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 
                        0 0 20px rgba(168, 85, 247, 0.5), 
                        0 0 40px rgba(236, 72, 153, 0.3), 
                        inset 0 1px 0 rgba(255, 255, 255, 0.1);
          }
          50% {
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 
                        0 0 30px rgba(168, 85, 247, 0.7), 
                        0 0 60px rgba(236, 72, 153, 0.5), 
                        inset 0 1px 0 rgba(255, 255, 255, 0.2);
          }
        }
      `}</style>
    </div>
  )
}
