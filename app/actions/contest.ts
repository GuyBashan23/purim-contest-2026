'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'
import { createServerSupabase } from '@/lib/supabase/server'
import type { ContestPhase } from '@/lib/store/contest-store'
import { revalidatePath } from 'next/cache'

export async function setPhase(phase: ContestPhase) {
  try {
    // Use Service Role client to bypass RLS
    const supabase = createServiceRoleClient()
    const now = new Date().toISOString()

    const updates: Record<string, any> = {
      current_phase: phase,
      updated_at: now,
    }

    if (phase === 'voting') {
      updates.phase_2_start_time = now
    } else if (phase === 'finals') {
      updates.phase_3_start_time = now
    } else if (phase === 'winners') {
      updates.phase_4_start_time = now
    }

    const { data: stateData, error: selectError } = await supabase
      .from('contest_state')
      .select('id')
      .single()

    if (selectError) {
      console.error('Error fetching contest_state:', selectError)
      return { error: `שגיאה בקבלת מצב תחרות: ${selectError.message}` }
    }

    if (!stateData) {
      return { error: 'Contest state not found' }
    }

    const { error: updateError } = await supabase
      .from('contest_state')
      .update(updates)
      .eq('id', stateData.id)

    if (updateError) {
      console.error('Error updating contest_state:', updateError)
      return { error: `שגיאה בעדכון מצב תחרות: ${updateError.message}` }
    }

    revalidatePath('/')
    revalidatePath('/admin')
    return { success: true }
  } catch (error: any) {
    console.error('Unexpected error in setPhase:', error)
    return { error: `שגיאה בלתי צפויה: ${error?.message || 'Unknown error'}` }
  }
}

export async function resetContest() {

  const supabase = createServiceRoleClient()

  // Delete all votes
  await supabase.from('votes').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  // Delete all entries
  await supabase.from('entries').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  // Delete all voters
  await supabase.from('voters').delete().neq('phone', '')

  // Reset contest state
  const { data: stateData } = await supabase
    .from('contest_state')
    .select('id')
    .single()

  if (!stateData) {
    return { error: 'Contest state not found' }
  }

  const { error } = await supabase
    .from('contest_state')
    .update({
      current_phase: 'registration',
      phase_2_start_time: null,
      phase_3_start_time: null,
      phase_4_start_time: null,
    })
    .eq('id', stateData.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/')
  revalidatePath('/admin')
  return { success: true }
}

export async function submitEntry(
  prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  try {
    // Validate environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Missing Supabase environment variables')
      return { error: 'שגיאת הגדרת שרת. אנא פנה למנהל המערכת.', success: false }
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing SUPABASE_SERVICE_ROLE_KEY')
      return { error: 'שגיאת הרשאות שרת. אנא פנה למנהל המערכת.', success: false }
    }

    const supabase = await createServerSupabase()
    const supabaseAdmin = createServiceRoleClient() // Use service role for storage uploads

    const phone = formData.get('phone') as string
    const name = formData.get('name') as string
    const costumeTitle = formData.get('costume_title') as string
    const description = formData.get('description') as string | null
    const imageFile = formData.get('image') as File

    if (!phone || !name || !costumeTitle || !imageFile) {
      return { error: 'Missing required fields', success: false }
    }

    // Check if phone already exists
    const { data: existing, error: existingError } = await supabase
      .from('entries')
      .select('id')
      .eq('phone', phone)
      .single()

    if (existingError && existingError.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is fine
      console.error('Error checking existing entry:', existingError)
      return { error: 'שגיאה בבדיקת רשומה קיימת. אנא נסה שוב.', success: false }
    }

    if (existing) {
      return { error: 'מספר טלפון זה כבר נרשם', success: false }
    }

    // Upload image to Supabase Storage using service role (bypasses RLS)
    const fileExt = imageFile.name.split('.').pop()
    const fileName = `${phone}-${Date.now()}.${fileExt}`
    const filePath = fileName

    // Verify service role client is configured
    if (!supabaseAdmin) {
      console.error('Service role client not initialized')
      return { error: 'שגיאת הגדרת שרת. אנא פנה למנהל המערכת.', success: false }
    }

    console.log('Attempting to upload to costumes bucket:', filePath)
    const { error: uploadError, data: uploadData } = await supabaseAdmin.storage
      .from('costumes')
      .upload(filePath, imageFile, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error details:', {
        message: uploadError.message,
        statusCode: uploadError.statusCode,
        error: uploadError,
      })
      
      // Return more detailed error message
      if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('not found') || uploadError.statusCode === '404') {
        return { error: 'שגיאה: Bucket "costumes" לא נמצא. אנא צור אותו ב-Supabase Dashboard → Storage', success: false }
      }
      if (uploadError.message?.includes('new row violates row-level security') || 
          uploadError.message?.includes('permission') || 
          uploadError.message?.includes('insufficient_scope') ||
          uploadError.statusCode === '403' ||
          uploadError.statusCode === '401') {
        return { error: 'שגיאה: אין הרשאות להעלאת תמונות. אנא בדוק את הגדרות ה-Storage Policies ב-Supabase Dashboard → Storage → costumes → Policies', success: false }
      }
      return { error: `שגיאה בהעלאת התמונה: ${uploadError.message || 'שגיאה לא ידועה'}`, success: false }
    }

    console.log('Upload successful:', uploadData)

    // Get public URL
    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from('costumes').getPublicUrl(filePath)

    // Insert entry using regular client (respects RLS)
    const { error: insertError } = await supabase.from('entries').insert({
      phone,
      name,
      costume_title: costumeTitle,
      description,
      image_url: publicUrl,
    })

    if (insertError) {
      console.error('Insert error:', insertError)
      return { error: insertError.message, success: false }
    }

    revalidatePath('/')
    return { success: true, error: undefined }
  } catch (error: any) {
    // Catch any unexpected errors
    console.error('Unexpected error in submitEntry:', error)
    return { 
      error: error?.message || 'שגיאה בלתי צפויה. אנא נסה שוב או פנה למנהל המערכת.', 
      success: false 
    }
  }
}

export async function submitVote(
  voterPhone: string,
  votes: Array<{ entryId: string; points: number }>,
  phase: 1 | 2
) {
  const supabase = await createServerSupabase()
  const supabaseAdmin = createServiceRoleClient()

  // SECURITY CHECK 1: Validate current phase allows voting
  const { data: appSettings } = await supabaseAdmin
    .from('app_settings')
    .select('current_phase')
    .single()

  if (!appSettings) {
    // Fallback: check contest_state for backward compatibility
    const { data: contestState } = await supabaseAdmin
      .from('contest_state')
      .select('current_phase')
      .single()

    if (!contestState || (contestState.current_phase !== 'voting' && contestState.current_phase !== 'finals')) {
      return { error: 'ההצבעה לא פעילה כרגע' }
    }
  } else {
    // Check app_settings phase
    if (appSettings.current_phase !== 'VOTING' && appSettings.current_phase !== 'FINALS') {
      return { error: 'ההצבעה לא פעילה כרגע' }
    }
  }

  // SECURITY CHECK 2: Validate input - points must be valid
  const validPoints = [1, 8, 10, 12]
  for (const vote of votes) {
    if (!validPoints.includes(vote.points)) {
      return { error: 'ערך נקודות לא תקין. אפשרויות: 1, 8, 10, 12' }
    }
  }

  // SECURITY CHECK 3: Validate entries exist and get their phone numbers
  const entryIds = votes.map((v) => v.entryId)
  const { data: entries, error: entriesError } = await supabase
    .from('entries')
    .select('id, phone')
    .in('id', entryIds)

  if (entriesError || !entries || entries.length !== votes.length) {
    return { error: 'אחת או יותר מהתחפושות לא נמצאה' }
  }

  // SECURITY CHECK 4: Prevent self-voting
  for (const entry of entries) {
    if (entry.phone === voterPhone) {
      return { error: 'לא ניתן להצביע עבור התחפושת שלך' }
    }
  }

  // SECURITY CHECK 5: Check if already voted in this phase
  const { data: existingVote } = await supabase
    .from('votes')
    .select('id')
    .eq('voter_phone', voterPhone)
    .eq('phase', phase)
    .single()

  if (existingVote) {
    return { error: 'כבר הצבעת בשלב זה' }
  }

  // SECURITY CHECK 6: Validate phase-specific rules
  if (phase === 1) {
    // Phase 1: Must vote for at least 1 entry with points 8, 10, or 12
    if (votes.length === 0) {
      return { error: 'יש לבחור לפחות תחפושת אחת' }
    }
    // Validate all points are 8, 10, or 12 (not 1)
    for (const vote of votes) {
      if (vote.points === 1) {
        return { error: 'בשלב זה יש להעניק 8, 10 או 12 נקודות בלבד' }
      }
      if (![8, 10, 12].includes(vote.points)) {
        return { error: 'נקודות לא תקינות. אפשרויות: 8, 10, 12' }
      }
    }
  } else if (phase === 2) {
    // Phase 3: Must vote for exactly 1 entry with 1 point
    if (votes.length !== 1) {
      return { error: 'בשלב זה יש לבחור תחפושת אחת' }
    }
    if (votes[0].points !== 1) {
      return { error: 'בשלב זה יש להעניק נקודה אחת' }
    }
  }

  // All security checks passed - insert votes
  const voteRecords = votes.map((vote) => ({
    voter_phone: voterPhone,
    entry_id: vote.entryId,
    points: vote.points,
    phase,
  }))

  const { error } = await supabase.from('votes').insert(voteRecords)

  if (error) {
    // Handle unique constraint violation (race condition)
    if (error.code === '23505' || error.message?.includes('unique')) {
      return { error: 'כבר הצבעת בשלב זה' }
    }
    return { error: error.message }
  }

  // Update voters table
  if (phase === 1) {
    await supabase
      .from('voters')
      .upsert({ phone: voterPhone, voted_phase_2: true }, { onConflict: 'phone' })
  } else if (phase === 2) {
    await supabase
      .from('voters')
      .upsert({ phone: voterPhone, voted_phase_3: true }, { onConflict: 'phone' })
  }

  revalidatePath('/vote')
  revalidatePath('/finals')
  revalidatePath('/live')
  return { success: true }
}

export async function getTopEntries(limit: number = 10) {
  const supabase = await createServerSupabase()

  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .order('total_score', { ascending: false })
    .limit(limit)

  if (error) {
    return { error: error.message, data: [] }
  }

  return { data: data || [] }
}

export async function getTop3Finalists() {
  const supabase = await createServerSupabase()

  // Mark top 3 as finalists
  const { data: top3 } = await supabase
    .from('entries')
    .select('id')
    .order('total_score', { ascending: false })
    .limit(3)

  if (top3 && top3.length > 0) {
    // Update is_finalist flag
    await supabase
      .from('entries')
      .update({ is_finalist: false })
      .neq('id', '00000000-0000-0000-0000-000000000000')

    await supabase
      .from('entries')
      .update({ is_finalist: true })
      .in('id', top3.map((e) => e.id))
  }

  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .eq('is_finalist', true)
    .order('total_score', { ascending: false })

  if (error) {
    return { error: error.message, data: [] }
  }

  return { data: data || [] }
}

export async function checkVoterEligibility(phone: string, phase: 1 | 2) {
  const supabase = await createServerSupabase()

  if (phase === 1) {
    // Phase 2: Anyone can vote
    return { eligible: true }
  } else {
    // Phase 3: Must have voted in Phase 2
    const { data } = await supabase
      .from('voters')
      .select('voted_phase_2')
      .eq('phone', phone)
      .single()

    return { eligible: data?.voted_phase_2 === true }
  }
}

// Robust single vote submission for Eurovision-style voting with "move" logic
// This function implements the "3 Coins" logic: Switch Rule + Steal Rule
export async function submitSingleVote(
  voterPhone: string,
  entryId: string,
  points: 8 | 10 | 12
) {
  const supabase = await createServerSupabase()
  const supabaseAdmin = createServiceRoleClient()

  console.log(`[submitSingleVote] User ${voterPhone} voting ${points} on entry ${entryId}`)

  // SECURITY CHECK 1: Validate voter phone
  if (!voterPhone || voterPhone.trim() === '') {
    console.error('[submitSingleVote] No voter phone provided')
    return { error: 'מספר טלפון לא תקין' }
  }

  // SECURITY CHECK 2: Validate current phase allows voting
  const { data: appSettings, error: settingsError } = await supabaseAdmin
    .from('app_settings')
    .select('current_phase')
    .single()

  if (settingsError || !appSettings) {
    // Fallback: check contest_state for backward compatibility
    const { data: contestState } = await supabaseAdmin
      .from('contest_state')
      .select('current_phase')
      .single()

    if (!contestState || (contestState.current_phase !== 'voting' && contestState.current_phase !== 'finals')) {
      console.error('[submitSingleVote] Voting phase not active')
      return { error: 'ההצבעה לא פעילה כרגע' }
    }
  } else {
    // Check app_settings phase
    if (appSettings.current_phase !== 'VOTING' && appSettings.current_phase !== 'FINALS') {
      console.error('[submitSingleVote] Voting phase not active:', appSettings.current_phase)
      return { error: 'ההצבעה לא פעילה כרגע' }
    }
  }

  // SECURITY CHECK 3: Validate points (must be 8, 10, or 12)
  if (![8, 10, 12].includes(points)) {
    console.error('[submitSingleVote] Invalid points:', points)
    return { error: 'נקודות לא תקינות. אפשרויות: 8, 10, 12' }
  }

  // SECURITY CHECK 4: Validate entry exists and get its phone number
  const { data: entry, error: entryError } = await supabase
    .from('entries')
    .select('id, phone')
    .eq('id', entryId)
    .single()

  if (entryError || !entry) {
    console.error('[submitSingleVote] Entry not found:', entryId, entryError)
    return { error: 'התחפושת לא נמצאה' }
  }

  // SECURITY CHECK 5: Prevent self-voting
  if (entry.phone === voterPhone) {
    console.error('[submitSingleVote] Self-voting attempt blocked')
    return { error: 'לא ניתן להצביע עבור התחפושת שלך' }
  }

  // Determine phase (1 for VOTING, 2 for FINALS)
  const currentPhase = appSettings?.current_phase === 'FINALS' ? 2 : 1

  // THE "3 COINS" LOGIC - Sequential operations to prevent race conditions
  
  try {
    // STEP A: Remove any existing vote by THIS user on THIS entry (Switch Rule)
    // This handles the case where user is changing their vote on the same entry
    const { error: deleteEntryError, count: deletedEntryCount } = await supabase
      .from('votes')
      .delete()
      .eq('voter_phone', voterPhone)
      .eq('entry_id', entryId)
      .eq('phase', currentPhase)
      .select('*', { count: 'exact', head: true })

    if (deleteEntryError) {
      console.error('[submitSingleVote] Error deleting existing vote on entry:', deleteEntryError)
      return { error: 'שגיאה בהסרת הצבעה קודמת על תמונה זו' }
    }

    if (deletedEntryCount && deletedEntryCount > 0) {
      console.log(`[submitSingleVote] Deleted ${deletedEntryCount} existing vote(s) on this entry`)
    }

    // STEP B: Remove any existing vote by THIS user with THIS EXACT SCORE on ANY entry (Steal Rule)
    // This handles the case where user is "stealing" their 8/10/12 points from another entry
    // First, get the entry_id of the vote we're about to delete (for UI feedback)
    const { data: existingVoteWithPoints, error: findError } = await supabase
      .from('votes')
      .select('entry_id')
      .eq('voter_phone', voterPhone)
      .eq('points', points)
      .eq('phase', currentPhase)
      .maybeSingle()

    if (findError && findError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('[submitSingleVote] Error finding existing vote with same points:', findError)
      return { error: 'שגיאה בחיפוש הצבעה קודמת' }
    }

    const previousEntryId = existingVoteWithPoints?.entry_id || null

    // Now delete the existing vote with same points
    const { error: deletePointsError, count: deletedPointsCount } = await supabase
      .from('votes')
      .delete()
      .eq('voter_phone', voterPhone)
      .eq('points', points)
      .eq('phase', currentPhase)
      .select('*', { count: 'exact', head: true })

    if (deletePointsError) {
      console.error('[submitSingleVote] Error deleting existing vote with same points:', deletePointsError)
      return { error: 'שגיאה בהסרת הצבעה קודמת עם נקודות אלו' }
    }

    if (deletedPointsCount && deletedPointsCount > 0) {
      console.log(`[submitSingleVote] Deleted ${deletedPointsCount} existing vote(s) with same points from entry ${previousEntryId}`)
    }

    // STEP C: Insert the new vote
    const { error: insertError, data: insertedVote } = await supabase
      .from('votes')
      .insert({
        voter_phone: voterPhone,
        entry_id: entryId,
        points: points,
        phase: currentPhase,
      })
      .select()
      .single()

    if (insertError) {
      console.error('[submitSingleVote] Error inserting vote:', insertError)
      // Handle unique constraint violation
      if (insertError.code === '23505' || insertError.message?.includes('unique')) {
        // Check which constraint was violated
        if (insertError.message?.includes('votes_voter_phone_phase_key')) {
          console.error('[submitSingleVote] Old constraint still exists! Run fix_votes_constraint.sql in Supabase SQL Editor.')
          return { 
            error: 'שגיאת מסד נתונים: יש להריץ את הקובץ fix_votes_constraint.sql ב-Supabase SQL Editor כדי להסיר את האילוץ הישן' 
          }
        }
        if (insertError.message?.includes('votes_voter_phone_points_phase_key')) {
          return { error: 'כבר הצבעת עם נקודות אלו' }
        }
        return { error: 'כבר הצבעת עם נקודות אלו' }
      }
      return { error: `שגיאה בהצבעה: ${insertError.message}` }
    }

    console.log('[submitSingleVote] Vote inserted successfully:', insertedVote?.id)

    // STEP D: Update voters table (mark as voted in phase)
    if (currentPhase === 1) {
      await supabase
        .from('voters')
        .upsert({ phone: voterPhone, voted_phase_2: true }, { onConflict: 'phone' })
    } else if (currentPhase === 2) {
      await supabase
        .from('voters')
        .upsert({ phone: voterPhone, voted_phase_3: true }, { onConflict: 'phone' })
    }

    // Revalidate paths to refresh UI
    revalidatePath('/gallery')
    revalidatePath('/live')

    console.log('[submitSingleVote] Vote successful!')
    return { 
      success: true, 
      moved: (deletedPointsCount && deletedPointsCount > 0) || false,
      updated: (deletedEntryCount && deletedEntryCount > 0) || false,
      previousEntryId: previousEntryId || undefined, // Entry ID that lost the vote (for UI update)
      points: points,
      entryId: entryId
    }
  } catch (error: any) {
    console.error('[submitSingleVote] Unexpected error:', error)
    return { error: `שגיאה בלתי צפויה: ${error?.message || 'Unknown error'}` }
  }
}

// Get user's current votes for a specific phase (for UI display)
export async function getUserVotes(voterPhone: string, phase: 1 | 2) {
  const supabase = await createServerSupabase()

  const { data: votes, error } = await supabase
    .from('votes')
    .select('entry_id, points')
    .eq('voter_phone', voterPhone)
    .eq('phase', phase)
    .in('points', [8, 10, 12])

  if (error) {
    return { error: error.message, votes: [] }
  }

  // Return a map: { entryId: points } for easy lookup
  const voteMap: Record<string, number> = {}
  votes?.forEach((vote) => {
    voteMap[vote.entry_id] = vote.points
  })

  return { votes: voteMap }
}

// New app_settings management functions
export type AppPhase = 'UPLOAD' | 'VOTING' | 'FINALS' | 'ENDED'

export async function setAppPhase(phase: AppPhase) {
  try {
    // Use Service Role client to bypass RLS
    const supabase = createServiceRoleClient()
    const now = new Date().toISOString()

    const updates: Record<string, any> = {
      current_phase: phase,
      updated_at: now,
    }

    // Set voting_start_time when transitioning to VOTING
    if (phase === 'VOTING') {
      updates.voting_start_time = now
    }

    // Get or create app_settings row
    const { data: settingsData, error: selectError } = await supabase
      .from('app_settings')
      .select('id')
      .single()

    if (selectError && selectError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching app_settings:', selectError)
      return { error: `שגיאה בקבלת הגדרות אפליקציה: ${selectError.message}` }
    }

    if (!settingsData) {
      // Create if doesn't exist
      console.log('[setAppPhase] Creating new app_settings row...')
      const { error: insertError, data: insertData } = await supabase
        .from('app_settings')
        .insert({ current_phase: phase, voting_start_time: phase === 'VOTING' ? now : null })
        .select()
      
      if (insertError) {
        console.error('[setAppPhase] Error inserting app_settings:', {
          message: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint
        })
        return { error: `שגיאה ביצירת הגדרות אפליקציה: ${insertError.message} (Code: ${insertError.code || 'N/A'})` }
      }
      
      console.log('[setAppPhase] Successfully created app_settings:', insertData)
    } else {
      console.log('[setAppPhase] Updating app_settings with id:', settingsData.id, 'updates:', updates)
      const { error: updateError, data: updateData } = await supabase
        .from('app_settings')
        .update(updates)
        .eq('id', settingsData.id)
        .select()

      if (updateError) {
        console.error('[setAppPhase] Error updating app_settings:', {
          message: updateError.message,
          code: updateError.code,
          details: updateError.details,
          hint: updateError.hint
        })
        return { error: `שגיאה בעדכון הגדרות אפליקציה: ${updateError.message} (Code: ${updateError.code || 'N/A'})` }
      }
      
      console.log('[setAppPhase] Successfully updated app_settings:', updateData)
    }

    // Also update contest_state for backward compatibility
    const { data: stateData, error: stateSelectError } = await supabase
      .from('contest_state')
      .select('id')
      .single()

    if (stateSelectError && stateSelectError.code !== 'PGRST116') {
      console.error('Error fetching contest_state:', stateSelectError)
      // Don't fail if contest_state doesn't exist, it's optional for backward compatibility
    }

    if (stateData) {
      const phaseMap: Record<AppPhase, ContestPhase> = {
        'UPLOAD': 'registration',
        'VOTING': 'voting',
        'FINALS': 'finals',
        'ENDED': 'winners',
      }

      const contestPhaseUpdates: Record<string, any> = {
        current_phase: phaseMap[phase],
        updated_at: now,
      }

      if (phase === 'VOTING') {
        contestPhaseUpdates.phase_2_start_time = now
      } else if (phase === 'FINALS') {
        contestPhaseUpdates.phase_3_start_time = now
      } else if (phase === 'ENDED') {
        contestPhaseUpdates.phase_4_start_time = now
      }

      const { error: stateUpdateError } = await supabase
        .from('contest_state')
        .update(contestPhaseUpdates)
        .eq('id', stateData.id)

      if (stateUpdateError) {
        console.error('Error updating contest_state:', stateUpdateError)
        // Don't fail the entire operation if contest_state update fails
        // It's optional for backward compatibility
      }
    }

    revalidatePath('/')
    revalidatePath('/admin')
    revalidatePath('/gallery')
    revalidatePath('/upload')
    return { success: true }
  } catch (error: any) {
    console.error('Unexpected error in setAppPhase:', error)
    return { error: `שגיאה בלתי צפויה: ${error?.message || 'Unknown error'}` }
  }
}

export async function getContestStats() {
  const supabase = createServiceRoleClient()

  // Get total entries count
  const { count: entriesCount } = await supabase
    .from('entries')
    .select('*', { count: 'exact', head: true })

  // Get total votes count
  const { count: votesCount } = await supabase
    .from('votes')
    .select('*', { count: 'exact', head: true })

  return {
    totalEntries: entriesCount || 0,
    totalVotes: votesCount || 0,
  }
}

export async function triggerFinals() {

  const supabase = createServiceRoleClient()

  // Get top 3 entries
  const { data: top3, error: top3Error } = await supabase
    .from('entries')
    .select('id')
    .order('total_score', { ascending: false })
    .limit(3)

  if (top3Error) {
    return { error: top3Error.message }
  }

  if (!top3 || top3.length < 3) {
    return { error: 'לא מספיק משתתפים לגמר (נדרשים לפחות 3)' }
  }

  // Reset all finalist flags
  await supabase
    .from('entries')
    .update({ is_finalist: false })
    .neq('id', '00000000-0000-0000-0000-000000000000')

  // Mark top 3 as finalists
  await supabase
    .from('entries')
    .update({ is_finalist: true })
    .in('id', top3.map((e) => e.id))

  // Set phase to FINALS
  const result = await setAppPhase('FINALS', password)
  
  if (result.error) {
    return result
  }

  revalidatePath('/finals')
  return { success: true, finalists: top3 }
}
