import { updateSession } from './lib/supabase/middleware'
import { NextResponse, type NextFetchEvent, type NextRequest } from 'next/server'

function isV2LabFailClosedPath(pathname: string): boolean {
  if (pathname === '/v2' || pathname === '/v2/') return true
  if (pathname === '/v2/jasper' || pathname.startsWith('/v2/jasper/')) return true
  return false
}

function isFailOpenPath(pathname: string): boolean {
  if (pathname.startsWith('/_next')) return true
  if (pathname.startsWith('/api/')) return true
  if (pathname.startsWith('/auth')) return true
  if (pathname.startsWith('/login')) return true
  if (pathname === '/registreren' || pathname.startsWith('/registreren/')) return true
  if (pathname === '/onboardingpro' || pathname.startsWith('/onboardingpro/')) return true
  // Lab-index fail-closed (zie catch). Live /v2/* shell blijft fail-open.
  if (pathname === '/v2' || pathname.startsWith('/v2/')) {
    return !isV2LabFailClosedPath(pathname)
  }
  if (pathname === '/welkom' || pathname.startsWith('/welkom/')) return true
  if (pathname === '/wachtlijst' || pathname.startsWith('/wachtlijst/')) return true
  if (pathname === '/inschrijven' || pathname.startsWith('/inschrijven/')) return true
  if (pathname === '/privacy' || pathname.startsWith('/privacy/')) return true
  if (pathname === '/terms' || pathname.startsWith('/terms/')) return true
  if (pathname === '/consent' || pathname.startsWith('/consent/')) return true
  if (pathname === '/abonnement' || pathname.startsWith('/abonnement/')) return true
  if (pathname === '/favicon.ico' || pathname === '/manifest.json' || pathname === '/sw.js') {
    return true
  }
  return false
}

export async function middleware(request: NextRequest, event: NextFetchEvent) {
  try {
    return await updateSession(request, event)
  } catch (err) {
    console.error('[Structuro middleware]', err)
    const { pathname } = request.nextUrl

    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'middleware_unavailable' }, { status: 503 })
    }

    // Private lab-directory nooit fail-open serveren.
    if (isV2LabFailClosedPath(pathname)) {
      const homeUrl = request.nextUrl.clone()
      homeUrl.pathname = '/'
      homeUrl.search = ''
      return NextResponse.redirect(homeUrl)
    }

    if (isFailOpenPath(pathname)) {
      return NextResponse.next({ request })
    }

    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.search = ''
    return NextResponse.redirect(loginUrl)
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
    '/((?!_next/static|_next/image|favicon.ico|sw\\.js$|manifest\\.json$|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
