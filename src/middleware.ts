import { updateSession } from './lib/supabase/middleware'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Zelfde gedrag als productie (login, dagstart-cookie). Lokaal: zorg voor geldige Supabase-env of local_mode-cookie.
  try {
    return await updateSession(request)
  } catch (err) {
    console.error('[Structuro middleware]', err)
    // Voorkomt totale 500 bij onverwachte Edge/runtime-fouten (corrupte cookies, bundel, enz.)
    return NextResponse.next({ request })
  }
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

