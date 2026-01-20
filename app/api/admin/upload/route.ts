import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const password = request.headers.get('X-Admin-Password')
    
    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const phone = formData.get('phone') as string
    const name = formData.get('name') as string
    const costumeTitle = formData.get('costume_title') as string
    const description = formData.get('description') as string | null
    const imageFile = formData.get('image') as File

    if (!phone || !name || !costumeTitle || !imageFile) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    // Upload image to Supabase Storage
    const fileExt = imageFile.name.split('.').pop()
    const fileName = `${phone}-${Date.now()}.${fileExt}`
    const filePath = fileName

    const { error: uploadError } = await supabase.storage
      .from('costumes')
      .upload(filePath, imageFile, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json(
        { error: `Upload error: ${uploadError.message}` },
        { status: 500 }
      )
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('costumes').getPublicUrl(filePath)

    // Insert entry (admin can bypass phone uniqueness check by using upsert)
    const { error: insertError } = await supabase
      .from('entries')
      .upsert({
        phone,
        name,
        costume_title: costumeTitle,
        description,
        image_url: publicUrl,
      }, {
        onConflict: 'phone',
      })

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
