import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth0 } from '@/lib/auth0'

export async function proxy(request: NextRequest) {
  if (auth0) {
    return await auth0.middleware(request)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/auth/:path*'],
}
