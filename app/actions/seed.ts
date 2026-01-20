'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'
import { generateMockParticipants } from '@/lib/seed-data'
import { revalidatePath } from 'next/cache'

/**
 * Generate mock participants for demo mode
 */
export async function generateMockData(count: number = 40, password: string) {
  if (password !== process.env.ADMIN_PASSWORD) {
    return { error: 'Unauthorized' }
  }

  const supabase = createServiceRoleClient()
  const participants = generateMockParticipants(count)

  try {
    // Batch insert entries
    // First, check which phones already exist
    const phones = participants.map((p) => p.phone)
    const { data: existing } = await supabase
      .from('entries')
      .select('phone')
      .in('phone', phones)

    const existingPhones = new Set(existing?.map((e) => e.phone) || [])
    
    // Filter out existing phones
    const newParticipants = participants.filter((p) => !existingPhones.has(p.phone))

    if (newParticipants.length === 0) {
      return { 
        error: 'כל המשתתפים המזויפים כבר קיימים במערכת',
        created: 0 
      }
    }

    // Insert in batches of 10 for better performance
    const batchSize = 10
    let inserted = 0

    for (let i = 0; i < newParticipants.length; i += batchSize) {
      const batch = newParticipants.slice(i, i + batchSize)
      
      const { error } = await supabase
        .from('entries')
        .insert(batch)

      if (error) {
        console.error('Batch insert error:', error)
        return { error: `שגיאה בהכנסת נתונים: ${error.message}`, created: inserted }
      }

      inserted += batch.length
    }

    revalidatePath('/admin')
    revalidatePath('/gallery')
    revalidatePath('/live')

    return { success: true, created: inserted }
  } catch (error) {
    console.error('Generate mock data error:', error)
    return { 
      error: error instanceof Error ? error.message : 'Unknown error',
      created: 0 
    }
  }
}

/**
 * Clear all mock data (entries with phone numbers starting with 055-0000)
 */
export async function clearMockData(password: string) {
  if (password !== process.env.ADMIN_PASSWORD) {
    return { error: 'Unauthorized' }
  }

  const supabase = createServiceRoleClient()

  try {
    // Get all mock entries to delete their images from storage
    const { data: mockEntries, error: fetchError } = await supabase
      .from('entries')
      .select('image_url')
      .like('phone', '055-0000%')

    if (fetchError) {
      return { error: fetchError.message }
    }

    // Delete images from storage
    if (mockEntries && mockEntries.length > 0) {
      for (const entry of mockEntries) {
        if (entry.image_url) {
          try {
            const url = new URL(entry.image_url)
            const pathParts = url.pathname.split('/')
            const costumesIndex = pathParts.findIndex((part) => part === 'costumes')
            
            if (costumesIndex !== -1 && costumesIndex < pathParts.length - 1) {
              const filePath = pathParts.slice(costumesIndex + 1).join('/')
              await supabase.storage
                .from('costumes')
                .remove([filePath])
            }
          } catch (error) {
            // Continue even if storage delete fails (might be external URL)
            console.error('Storage delete error:', error)
          }
        }
      }
    }

    // Delete votes from mock participants (by phone pattern)
    await supabase
      .from('votes')
      .delete()
      .like('voter_phone', '055-0000%')

    // Delete entries from database
    const { error: deleteError } = await supabase
      .from('entries')
      .delete()
      .like('phone', '055-0000%')

    if (deleteError) {
      return { error: deleteError.message }
    }

    revalidatePath('/admin')
    revalidatePath('/gallery')
    revalidatePath('/live')

    const deletedCount = mockEntries?.length || 0
    return { success: true, deleted: deletedCount }
  } catch (error) {
    console.error('Clear mock data error:', error)
    return { 
      error: error instanceof Error ? error.message : 'Unknown error',
      deleted: 0 
    }
  }
}
