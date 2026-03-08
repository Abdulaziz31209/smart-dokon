import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ 
    message: 'AI Chat API - Use the AI Chat page for conversations',
    endpoints: {
      chat: 'POST /api/ai-chat'
    }
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    return NextResponse.json({ 
      success: true, 
      message: 'Please use the AI Chat page at /ai-chat for AI conversations',
      received: body
    })
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Invalid request' 
    }, { status: 400 })
  }
}
