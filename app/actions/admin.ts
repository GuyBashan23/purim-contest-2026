'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateVotingStartTime(
  votingStartTime: string,
  password: string
) {
  const adminPassword = process.env.ADMIN_PASSWORD
  
  if (!adminPassword) {
    console.error('ADMIN_PASSWORD environment variable is not set')
    return { error: 'שגיאת הגדרת שרת: ADMIN_PASSWORD לא מוגדר. אנא בדוק את הגדרות ה-environment variables ב-Vercel.' }
  }
  
  if (password !== adminPassword) {
    console.error('Password mismatch in updateVotingStartTime')
    return { error: 'סיסמה שגויה. אנא בדוק את הסיסמה והנסה שוב.' }
  }

  const supabase = createServiceRoleClient()

  const { data: settingsData } = await supabase
    .from('app_settings')
    .select('id')
    .single()

  if (!settingsData) {
    return { error: 'App settings not found' }
  }

  const { error } = await supabase
    .from('app_settings')
    .update({
      voting_start_time: votingStartTime,
      updated_at: new Date().toISOString(),
    })
    .eq('id', settingsData.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin')
  revalidatePath('/gallery')
  return { success: true }
}

export async function deleteEntry(entryId: string, password: string) {
  const adminPassword = process.env.ADMIN_PASSWORD
  
  if (!adminPassword) {
    console.error('ADMIN_PASSWORD environment variable is not set')
    return { error: 'שגיאת הגדרת שרת: ADMIN_PASSWORD לא מוגדר. אנא בדוק את הגדרות ה-environment variables ב-Vercel.' }
  }
  
  if (password !== adminPassword) {
    console.error('Password mismatch in deleteEntry')
    return { error: 'סיסמה שגויה. אנא בדוק את הסיסמה והנסה שוב.' }
  }

  const supabase = createServiceRoleClient()

  // Get entry to find image URL
  const { data: entry, error: fetchError } = await supabase
    .from('entries')
    .select('image_url')
    .eq('id', entryId)
    .single()

  if (fetchError) {
    return { error: fetchError.message }
  }

  // Extract file path from URL and delete from storage
  if (entry?.image_url) {
    try {
      // Supabase storage URLs are typically: https://[project].supabase.co/storage/v1/object/public/costumes/[filename]
      const url = new URL(entry.image_url)
      const pathParts = url.pathname.split('/')
      
      // Find the filename (last part after 'costumes')
      const costumesIndex = pathParts.findIndex((part) => part === 'costumes')
      if (costumesIndex !== -1 && costumesIndex < pathParts.length - 1) {
        // Get everything after 'costumes' - this is the file path
        const filePath = pathParts.slice(costumesIndex + 1).join('/')
        
        // Delete from storage
        const { error: storageError } = await supabase.storage
          .from('costumes')
          .remove([filePath])

        if (storageError) {
          console.error('Storage delete error:', storageError)
          // Continue with DB deletion even if storage fails
        } else {
          console.log('Successfully deleted file from storage:', filePath)
        }
      } else {
        // Try alternative: filename might be directly in the path
        const filename = pathParts[pathParts.length - 1]
        if (filename && filename.includes('.')) {
          const { error: storageError } = await supabase.storage
            .from('costumes')
            .remove([filename])
          
          if (storageError) {
            console.error('Storage delete error (alt):', storageError)
          }
        }
      }
    } catch (error) {
      console.error('Error parsing image URL:', error)
      // Continue with DB deletion even if we can't parse the URL
    }
  }

  // Delete from database
  const { error: deleteError } = await supabase
    .from('entries')
    .delete()
    .eq('id', entryId)

  if (deleteError) {
    return { error: deleteError.message }
  }

  revalidatePath('/admin')
  revalidatePath('/gallery')
  return { success: true }
}

export async function updateEntry(
  entryId: string,
  updates: { name?: string; costume_title?: string; description?: string },
  password: string
) {
  const adminPassword = process.env.ADMIN_PASSWORD
  
  if (!adminPassword) {
    console.error('ADMIN_PASSWORD environment variable is not set')
    return { error: 'שגיאת הגדרת שרת: ADMIN_PASSWORD לא מוגדר. אנא בדוק את הגדרות ה-environment variables ב-Vercel.' }
  }
  
  if (password !== adminPassword) {
    console.error('Password mismatch in updateEntry')
    return { error: 'סיסמה שגויה. אנא בדוק את הסיסמה והנסה שוב.' }
  }

  const supabase = createServiceRoleClient()

  const { error } = await supabase
    .from('entries')
    .update(updates)
    .eq('id', entryId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin')
  revalidatePath('/gallery')
  return { success: true }
}

export async function getAllEntries(password: string) {
  const adminPassword = process.env.ADMIN_PASSWORD
  
  if (!adminPassword) {
    console.error('ADMIN_PASSWORD environment variable is not set')
    return { error: 'שגיאת הגדרת שרת: ADMIN_PASSWORD לא מוגדר. אנא בדוק את הגדרות ה-environment variables ב-Vercel.', data: [] }
  }
  
  if (password !== adminPassword) {
    console.error('Password mismatch in getAllEntries')
    return { error: 'סיסמה שגויה. אנא בדוק את הסיסמה והנסה שוב.', data: [] }
  }

  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return { error: error.message, data: [] }
  }

  return { data: data || [] }
}

export async function getLeadingCandidate(password: string) {
  const adminPassword = process.env.ADMIN_PASSWORD
  
  if (!adminPassword) {
    console.error('ADMIN_PASSWORD environment variable is not set')
    return { error: 'שגיאת הגדרת שרת: ADMIN_PASSWORD לא מוגדר. אנא בדוק את הגדרות ה-environment variables ב-Vercel.', data: null }
  }
  
  if (password !== adminPassword) {
    console.error('Password mismatch in getLeadingCandidate')
    return { error: 'סיסמה שגויה. אנא בדוק את הסיסמה והנסה שוב.', data: null }
  }

  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .order('total_score', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    return { error: error.message, data: null }
  }

  return { data }
}
