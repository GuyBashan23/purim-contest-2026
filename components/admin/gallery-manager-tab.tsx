'use client'

import { useState, useEffect } from 'react'
import { getAllEntries, deleteEntry, updateEntry } from '@/app/actions/admin'
import { generateMockData, clearMockData } from '@/app/actions/seed'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { Trash2, Edit, Plus, Image as ImageIcon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import type { Entry } from '@/components/costume-gallery'
import { ManualUploadModal } from '@/components/admin/manual-upload-modal'

interface GalleryManagerTabProps {
  password: string
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
  onStatsUpdate: () => void
}

export function GalleryManagerTab({
  password,
  isLoading,
  setIsLoading,
  onStatsUpdate,
}: GalleryManagerTabProps) {
  const [entries, setEntries] = useState<Entry[]>([])
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isManualUploadOpen, setIsManualUploadOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', costume_title: '', description: '' })
  const { toast } = useToast()

  useEffect(() => {
    loadEntries()
    const interval = setInterval(loadEntries, 10000) // Refresh every 10 seconds
    return () => clearInterval(interval)
  }, [])

  const loadEntries = async () => {
    const result = await getAllEntries(password)
    if (result.data) {
      setEntries(result.data)
    }
  }

  const handleDelete = async () => {
    if (!selectedEntry) return

    setIsLoading(true)
    const result = await deleteEntry(selectedEntry.id, password)

    if (result?.error) {
      toast({
        title: 'שגיאה',
        description: result.error,
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'הצלחה',
        description: 'התמונה נמחקה בהצלחה',
      })
      setIsDeleteDialogOpen(false)
      setSelectedEntry(null)
      loadEntries()
      onStatsUpdate()
    }
    setIsLoading(false)
  }

  const handleEdit = async () => {
    if (!selectedEntry) return

    setIsLoading(true)
    const result = await updateEntry(
      selectedEntry.id,
      {
        name: editForm.name,
        costume_title: editForm.costume_title,
        description: editForm.description || null,
      },
      password
    )

    if (result?.error) {
      toast({
        title: 'שגיאה',
        description: result.error,
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'הצלחה',
        description: 'הפרטים עודכנו',
      })
      setIsEditDialogOpen(false)
      setSelectedEntry(null)
      loadEntries()
    }
    setIsLoading(false)
  }

  const openEditDialog = (entry: Entry) => {
    setSelectedEntry(entry)
    setEditForm({
      name: entry.name,
      costume_title: entry.costume_title,
      description: entry.description || '',
    })
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (entry: Entry) => {
    setSelectedEntry(entry)
    setIsDeleteDialogOpen(true)
  }

  const handleGenerateMock = async () => {
    setIsGenerating(true)
    const result = await generateMockData(40, password)

    if (result?.error) {
      toast({
        title: 'שגיאה',
        description: result.error,
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'הצלחה!',
        description: `נוצרו ${result.created} משתתפים מזויפים`,
      })
      loadEntries()
      onStatsUpdate()
    }
    setIsGenerating(false)
  }

  const handleClearMock = async () => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את כל הנתונים המזויפים? פעולה זו לא ניתנת לביטול!')) {
      return
    }

    setIsClearing(true)
    const result = await clearMockData(password)

    if (result?.error) {
      toast({
        title: 'שגיאה',
        description: result.error,
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'הצלחה',
        description: `נמחקו ${result.deleted} רשומות מזויפות`,
      })
      loadEntries()
      onStatsUpdate()
    }
    setIsClearing(false)
  }

  return (
    <div className="space-y-6">
      {/* Demo Zone */}
      <Card className="glass border-yellow-500/30 bg-gradient-to-br from-yellow-900/20 to-yellow-800/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-400">
            🧪 אזור Demo
          </CardTitle>
          <CardDescription className="text-white/70">
            צור נתונים מזויפים להדגמה ללקוח
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={handleGenerateMock}
            disabled={isGenerating || isClearing}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            size="lg"
          >
            {isGenerating ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                יוצר נתונים...
              </>
            ) : (
              <>
                🧪 צור 40 משתתפים מזויפים
              </>
            )}
          </Button>
          <Button
            onClick={handleClearMock}
            disabled={isGenerating || isClearing}
            variant="destructive"
            className="w-full"
            size="lg"
          >
            {isClearing ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                מוחק...
              </>
            ) : (
              <>
                🧹 נקה נתונים מזויפים
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Manual Upload Button */}
      <Card className="glass border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            העלאה ידנית
          </CardTitle>
          <CardDescription>
            העלה תמונה בשם משתמש אחר (למשל, עובד שלא יכול להעלות בעצמו)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => setIsManualUploadOpen(true)}
            className="w-full bg-gradient-to-r from-[#eb1801] to-[#FF6B35]"
            size="lg"
          >
            <Plus className="h-4 w-4 mr-2" />
            הוסף רשומה ידנית
          </Button>
        </CardContent>
      </Card>

      {/* Entries Grid */}
      <div>
        <h3 className="text-xl font-bold text-white mb-4">
          כל הרשומות ({entries.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {entries.map((entry) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="glass rounded-xl overflow-hidden border border-slate-700"
              >
                <div className="relative h-48 w-full">
                  {entry.image_url ? (
                    <img
                      src={entry.image_url}
                      alt={entry.costume_title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                      <ImageIcon className="h-12 w-12 text-slate-600" />
                    </div>
                  )}
                </div>
                <div className="p-4 space-y-2">
                  <h4 className="font-bold text-white truncate">{entry.costume_title}</h4>
                  <p className="text-sm text-white/70 truncate">{entry.name}</p>
                  {entry.total_score > 0 && (
                    <p className="text-sm text-yellow-400 font-semibold">
                      {entry.total_score} נקודות
                    </p>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => openEditDialog(entry)}
                      variant="outline"
                      size="sm"
                      className="flex-1 glass border-white/20 text-white hover:bg-white/10"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      ערוך
                    </Button>
                    <Button
                      onClick={() => openDeleteDialog(entry)}
                      variant="destructive"
                      size="sm"
                      className="flex-1"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      מחק
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="glass border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">ערוך רשומה</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name" className="text-white">שם</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="glass border-white/20 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-title" className="text-white">כותרת התחפושת</Label>
              <Input
                id="edit-title"
                value={editForm.costume_title}
                onChange={(e) => setEditForm({ ...editForm, costume_title: e.target.value })}
                className="glass border-white/20 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description" className="text-white">תיאור</Label>
              <textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="flex min-h-[80px] w-full rounded-lg glass border-white/20 px-3 py-2 text-sm text-white placeholder:text-white/50"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleEdit}
                disabled={isLoading || !editForm.name || !editForm.costume_title}
                className="flex-1 bg-gradient-to-r from-[#eb1801] to-[#FF6B35]"
              >
                שמור
              </Button>
              <Button
                onClick={() => setIsEditDialogOpen(false)}
                variant="outline"
                className="flex-1 glass border-white/20 text-white"
              >
                ביטול
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="glass border-red-500/50 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-400">מחיקת רשומה</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-white">
              האם אתה בטוח שברצונך למחוק את הרשומה של <strong>{selectedEntry?.name}</strong>?
            </p>
            <p className="text-white/70 text-sm">
              פעולה זו תמחק את הרשומה מהמסד נתונים ואת התמונה מה-Storage. פעולה זו לא ניתנת לביטול!
            </p>
            <div className="flex gap-2">
              <Button
                onClick={handleDelete}
                disabled={isLoading}
                variant="destructive"
                className="flex-1"
              >
                מחק
              </Button>
              <Button
                onClick={() => setIsDeleteDialogOpen(false)}
                variant="outline"
                className="flex-1 glass border-white/20 text-white"
              >
                ביטול
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manual Upload Modal */}
      <ManualUploadModal
        isOpen={isManualUploadOpen}
        onClose={() => setIsManualUploadOpen(false)}
        onSuccess={() => {
          loadEntries()
          onStatsUpdate()
        }}
        password={password}
      />
    </div>
  )
}
