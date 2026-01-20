import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { password } = await request.json()
  
  // Simple password check - in production, use proper authentication
  if (password === process.env.ADMIN_PASSWORD || password === 'admin') {
    return NextResponse.json({ success: true })
  }
  
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
