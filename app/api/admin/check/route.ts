import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { password } = await request.json()
    
    // Validate password matches ADMIN_PASSWORD from environment variables
    if (!password) {
      return NextResponse.json({ valid: false, error: 'Password required' }, { status: 400 })
    }

    // Check against environment variable
    const adminPassword = process.env.ADMIN_PASSWORD
    
    if (!adminPassword) {
      console.error('ADMIN_PASSWORD environment variable is not set')
      return NextResponse.json({ valid: false, error: 'Server configuration error' }, { status: 500 })
    }

    if (password === adminPassword) {
      return NextResponse.json({ valid: true, success: true })
    }
    
    return NextResponse.json({ valid: false, error: 'Unauthorized' }, { status: 401 })
  } catch (error) {
    console.error('Error in admin check:', error)
    return NextResponse.json({ valid: false, error: 'Server error' }, { status: 500 })
  }
}
