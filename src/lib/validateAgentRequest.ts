import { NextResponse } from 'next/server'

export function validateAgentRequest(request: Request): NextResponse | null {
  const authHeader = request.headers.get('authorization')
  const secret = process.env.APP_API_SECRET

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return null
}
