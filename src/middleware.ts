import { updateSession } from './lib/supabase/middleware'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Tijdelijk: middleware overslaan om hang bij localhost te omzeilen.
  // Als de app nu wél laadt, was de middleware de oorzaak.
  if (request.nextUrl.hostname === 'localhost' && request.nextUrl.port === '3000') {
    return NextResponse.next({ request })
  }
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

