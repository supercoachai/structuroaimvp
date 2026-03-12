import { NextResponse, type NextRequest } from 'next/server'

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

  const localModeCookie = request.cookies.get('structuro_local_mode')?.value
  const hasAuth = hasSupabaseAuthCookie(request)

  if (!hasAuth && !localModeCookie) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return NextResponse.next({ request })
}
