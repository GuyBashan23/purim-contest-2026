'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'
import { createServerSupabase } from '@/lib/supabase/server'
import type { ContestPhase } from '@/lib/store/contest-store'
import { revalidatePath } from 'next/cache'

export async function setPhase(phase: ContestPhase, password: string) {
  if (password !== process.env.ADMIN_PASSWORD) {
    return { error: 'Unauthorized' }
  }

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

  const { data: stateData } = await supabase
    .from('contest_state')
    .select('id')
    .single()

  if (!stateData) {
    return { error: 'Contest state not found' }
  }

  const { error } = await supabase
    .from('contest_state')
    .update(updates)
    .eq('id', stateData.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/')
  revalidatePath('/admin')
  return { success: true }
}

export async function resetContest(password: string) {
  if (password !== process.env.ADMIN_PASSWORD) {
    return { error: 'Unauthorized' }
  }

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
  const { data: existing } = await supabase
    .from('entries')
    .select('id')
    .eq('phone', phone)
    .single()

  if (existing) {
    return { error: 'מספר טלפון זה כבר נרשם', success: false }
  }

  // Upload image to Supabase Storage using service role (bypasses RLS)
  const fileExt = imageFile.name.split('.').pop()
  const fileName = `${phone}-${Date.now()}.${fileExt}`
  const filePath = fileName

  const { error: uploadError } = await supabaseAdmin.storage
    .from('costumes')
    .upload(filePath, imageFile, {
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) {
    console.error('Upload error:', uploadError)
    // Return more detailed error message
    if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('not found')) {
      return { error: 'שגיאה: Bucket "costumes" לא נמצא. אנא צור אותו ב-Supabase Dashboard → Storage', success: false }
    }
    if (uploadError.message?.includes('new row violates row-level security') || uploadError.message?.includes('permission')) {
      return { error: 'שגיאה: אין הרשאות להעלאת תמונות. אנא בדוק את הגדרות ה-Storage Policies', success: false }
    }
    return { error: `שגיאה בהעלאת התמונה: ${uploadError.message}`, success: false }
  }

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
    return { error: insertError.message, success: false }
  }

  revalidatePath('/')
  return { success: true, error: undefined }
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
    // Phase 2: Must vote for exactly 3 entries with points 12, 10, 8
    if (votes.length !== 3) {
      return { error: 'בשלב זה יש לבחור בדיוק 3 תחפושות' }
    }
    const points = votes.map((v) => v.points).sort((a, b) => b - a)
    if (points[0] !== 12 || points[1] !== 10 || points[2] !== 8) {
      return { error: 'בשלב זה יש להעניק 12, 10 ו-8 נקודות' }
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

// New app_settings management functions
export type AppPhase = 'UPLOAD' | 'VOTING' | 'FINALS' | 'ENDED'

export async function setAppPhase(phase: AppPhase, password: string) {
  if (password !== process.env.ADMIN_PASSWORD) {
    return { error: 'Unauthorized' }
  }

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
  const { data: settingsData } = await supabase
    .from('app_settings')
    .select('id')
    .single()

  if (!settingsData) {
    // Create if doesn't exist
    const { error: insertError } = await supabase
      .from('app_settings')
      .insert({ current_phase: phase, voting_start_time: phase === 'VOTING' ? now : null })
    
    if (insertError) {
      return { error: insertError.message }
    }
  } else {
    const { error } = await supabase
      .from('app_settings')
      .update(updates)
      .eq('id', settingsData.id)

    if (error) {
      return { error: error.message }
    }
  }

  // Also update contest_state for backward compatibility
  const { data: stateData } = await supabase
    .from('contest_state')
    .select('id')
    .single()

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

    await supabase
      .from('contest_state')
      .update(contestPhaseUpdates)
      .eq('id', stateData.id)
  }

  revalidatePath('/')
  revalidatePath('/admin')
  revalidatePath('/gallery')
  revalidatePath('/upload')
  return { success: true }
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

export async function triggerFinals(password: string) {
  if (password !== process.env.ADMIN_PASSWORD) {
    return { error: 'Unauthorized' }
  }

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
