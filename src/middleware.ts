import { updateSession } from './lib/supabase/middleware'
import {
  isV2AppPath,
  isV2LockdownExemptPath,
  isV2PublicEnabled,
  mapV2PathToV1,
} from './lib/v2/v2LabAccess'
import { NextResponse, type NextFetchEvent, type NextRequest } from 'next/server'

function isFailOpenPath(pathname: string): boolean {
  if (pathname.startsWith('/_next')) return true
  if (pathname.startsWith('/api/')) return true
  if (pathname.startsWith('/auth')) return true
  if (pathname.startsWith('/login')) return true
  if (pathname === '/registreren' || pathname.startsWith('/registreren/')) return true
  if (pathname === '/onboardingpro' || pathname.startsWith('/onboardingpro/')) return true
  // /v2 nooit fail-open tijdens lockdown. Als publiek: alleen non-lab fail-open
  // (lab blijft fail-closed via redirect hieronder).
  if (isV2AppPath(pathname)) {
    if (!isV2PublicEnabled()) return false
    if (isV2LockdownExemptPath(pathname)) return true
    // Lab-index/jasper: fail-closed. Overige live shell: fail-open.
    if (pathname === '/v2' || pathname === '/v2/') return false
    if (pathname === '/v2/jasper' || pathname.startsWith('/v2/jasper/')) return false
    return true
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

    // /v2 lockdown / lab: nooit fail-open serveren naar de shell.
    if (isV2AppPath(pathname)) {
      if (!isV2PublicEnabled() && !isV2LockdownExemptPath(pathname)) {
        const bounce = request.nextUrl.clone()
        bounce.pathname = mapV2PathToV1(pathname)
        bounce.search = ''
        return NextResponse.redirect(bounce)
      }
      if (
        pathname === '/v2' ||
        pathname === '/v2/' ||
        pathname === '/v2/jasper' ||
        pathname.startsWith('/v2/jasper/')
      ) {
        const homeUrl = request.nextUrl.clone()
        homeUrl.pathname = '/'
        homeUrl.search = ''
        return NextResponse.redirect(homeUrl)
      }
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
