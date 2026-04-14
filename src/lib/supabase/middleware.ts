import { NextResponse, type NextRequest } from 'next/server'
import {
  STRUCTURO_DAGSTART_COOKIE,
  getCalendarDateAmsterdam,
} from '@/lib/dagstartCookie'

// Edge Runtime-compatible: geen Supabase-client (gebruikt Node APIs).
// We checken alleen op auth-cookie en lokale-modus cookie.
function hasSupabaseAuthCookie(request: NextRequest): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const projectRef = url.replace(/^https:\/\//, '').split('.')[0]
  if (!projectRef) return false
  const cookieName = `sb-${projectRef}-auth-token`
  const cookie = request.cookies.get(cookieName)?.value
  return Boolean(cookie)
}

/** Supabase niet geconfigureerd of placeholder → app lokaal gebruiken, geen redirect. */
function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  return Boolean(
    url &&
    key &&
    !url.includes('placeholder') &&
    !key.includes('placeholder')
  )
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isPublicPath =
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth')

  if (isPublicPath) {
    return NextResponse.next({ request })
  }

  // Geen Supabase-config → altijd doorlaten (lokaal/localStorage), voorkomt hangen
  if (!isSupabaseConfigured()) {
    return NextResponse.next({ request })
  }

  const localModeCookie = request.cookies.get('structuro_local_mode')?.value
  const hasAuth = hasSupabaseAuthCookie(request)

  if (!hasAuth && !localModeCookie) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Dagstart vandaag afgerond? (Edge leest geen DB; cookie zet client na check-in.)
  const needsDagstart =
    !pathname.startsWith('/dagstart') &&
    !pathname.startsWith('/login') &&
    !pathname.startsWith('/auth') &&
    !pathname.startsWith('/api')

  if (needsDagstart) {
    const today = getCalendarDateAmsterdam()
    const raw = request.cookies.get(STRUCTURO_DAGSTART_COOKIE)?.value
    const cookieVal = raw ? decodeURIComponent(raw) : ''
    if (cookieVal !== today) {
      const url = request.nextUrl.clone()
      url.pathname = '/dagstart'
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next({ request })
}
