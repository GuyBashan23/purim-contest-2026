'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { Skeleton } from '@/components/ui/skeleton'

export interface Entry {
  id: string
  name: string
  costume_title: string
  description: string | null
  image_url: string
  total_score: number
}

interface CostumeGalleryProps {
  onSelect?: (entry: Entry) => void
  selectedIds?: string[]
  showScores?: boolean
  readOnly?: boolean
}

export function CostumeGallery({
  onSelect,
  selectedIds = [],
  showScores = false,
  readOnly = false,
}: CostumeGalleryProps) {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null)
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchEntries()

    // Subscribe to real-time updates
    const channel = supabase
      .channel('entries_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'entries',
        },
        () => {
          fetchEntries()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [])

  const fetchEntries = async () => {
    try {
      // Only select required fields (not SELECT *)
      // Limit initial load to 20 entries for better performance
      const { data, error } = await supabase
        .from('entries')
        .select('id, name, costume_title, description, image_url, total_score')
        .order('created_at', { ascending: false })
        .limit(20) // Limit initial load to 20 entries for performance

      if (error) throw error
      // Filter out entries with invalid image URLs
      const validEntries = (data || []).filter((entry) => entry.image_url && entry.image_url.trim() !== '')
      setEntries(validEntries)
    } catch (error) {
      console.error('Error fetching entries:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCardClick = (entry: Entry) => {
    if (readOnly) {
      // In read-only mode, only show the detail dialog
      setSelectedEntry(entry)
      return
    }
    
    if (onSelect) {
      onSelect(entry)
    } else {
      setSelectedEntry(entry)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    )
  }

  // Empty state
  if (entries.length === 0) {
    return (
      <div className="glass rounded-2xl p-12 text-center">
        <div className="text-6xl mb-4">🎭</div>
        <h3 className="text-2xl font-bold text-white mb-2">אין תחפושות עדיין</h3>
        <p className="text-white/70">
          תהיה הראשון להעלות תחפושת!
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-6">
        {entries.map((entry, index) => {
          const isSelected = selectedIds.includes(entry.id)
          return (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, type: 'spring', stiffness: 100 }}
              whileHover={{ scale: 1.02, y: -5 }}
              className="w-full"
            >
              <div
                className={`glass rounded-2xl overflow-hidden shadow-xl cursor-pointer transition-all ${
                  isSelected ? 'ring-2 ring-yellow-400 shadow-[0_0_30px_rgba(255,215,0,0.5)]' : ''
                }`}
                onClick={() => handleCardClick(entry)}
              >
                <div className="relative h-80 w-full group">
                  {imageErrors.has(entry.id) || !entry.image_url ? (
                    <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                      <div className="text-white/50 text-center p-4">
                        <p className="text-lg">תמונה לא זמינה</p>
                      </div>
                    </div>
                  ) : (
                    <Image
                      src={entry.image_url}
                      alt={entry.costume_title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      onError={() => {
                        setImageErrors((prev) => new Set(prev).add(entry.id))
                      }}
                      unoptimized={entry.image_url?.includes('supabase.co')}
                      loading="lazy"
                    />
                  )}
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
                  
                  {/* Score badge */}
                  {showScores && (
                    <div className="absolute top-4 left-4 glass px-4 py-2 rounded-full text-white text-sm font-bold backdrop-blur-md">
                      {entry.total_score} נקודות
                    </div>
                  )}
                  
                  {/* Selected indicator */}
                  {isSelected && (
                    <div className="absolute inset-0 bg-yellow-400/20 flex items-center justify-center backdrop-blur-sm">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="glass px-6 py-3 rounded-full font-bold text-white backdrop-blur-md border-2 border-yellow-400"
                      >
                        ✓ נבחר
                      </motion.div>
                    </div>
                  )}
                  
                  {/* Content overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                    <h3 className="font-bold text-2xl mb-2 drop-shadow-lg line-clamp-2 break-words">
                      {entry.costume_title}
                    </h3>
                    <p className="text-base opacity-90 drop-shadow-md truncate">{entry.name}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {selectedEntry && !onSelect && (
        <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="line-clamp-2 break-words">
                {selectedEntry.costume_title}
              </DialogTitle>
            </DialogHeader>
            <div className="relative h-96 w-full rounded-lg overflow-hidden">
              {imageErrors.has(selectedEntry.id) || !selectedEntry.image_url ? (
                <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                  <div className="text-muted-foreground text-center p-4">
                    <p className="text-lg">תמונה לא זמינה</p>
                  </div>
                </div>
              ) : (
                <Image
                  src={selectedEntry.image_url}
                  alt={selectedEntry.costume_title}
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, 80vw"
                  loading="lazy"
                  onError={() => {
                    setImageErrors((prev) => new Set(prev).add(selectedEntry.id))
                  }}
                  unoptimized={selectedEntry.image_url?.includes('supabase.co')}
                />
              )}
            </div>
            <div className="space-y-2">
              <p className="font-semibold truncate">{selectedEntry.name}</p>
              {selectedEntry.description && (
                <p className="text-muted-foreground line-clamp-3 break-words">
                  {selectedEntry.description}
                </p>
              )}
              {showScores && (
                <p className="text-lg font-bold text-primary">
                  {selectedEntry.total_score} נקודות
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
