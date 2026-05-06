import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function redirectToAuthError(
  origin: string,
  params: Record<string, string>
): NextResponse {
  const q = new URLSearchParams(params)
  return NextResponse.redirect(`${origin}/auth/auth-code-error?${q}`)
}

/** Open-redirect hardened: alleen relatieve paths op de eigen origin. */
function safeRelativeNext(raw: string | null): string {
  const fallback = '/'
  const n = (raw ?? '').trim() || fallback
  if (!n.startsWith('/') || n.startsWith('//')) return fallback
  if (n.includes('://')) return fallback
  if (n.includes('\\')) return fallback
  return n
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const { origin, searchParams } = url
  const code = searchParams.get('code')
  const nextRaw = searchParams.get('next') ?? '/'

  const authError = searchParams.get('error')
  const authErrorCode = searchParams.get('error_code')
  const authErrorDesc = searchParams.get('error_description')

  if (authError || authErrorCode) {
    const p: Record<string, string> = {}
    if (authErrorCode) p.error_code = authErrorCode
    else if (authError) p.error_code = authError
    if (authError) p.error = authError
    if (authErrorDesc) p.error_description = authErrorDesc
    return redirectToAuthError(origin, p)
  }

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const safePath = safeRelativeNext(nextRaw)
      const target = `${origin}${safePath}`
      const res = NextResponse.redirect(target)
      res.cookies.set('structuro_local_mode', '', {
        path: '/',
        maxAge: 0,
        sameSite: 'lax',
      })
      return res
    }
    return redirectToAuthError(origin, {
      error_code: 'exchange_failed',
      error_description: error.message,
    })
  }

  return redirectToAuthError(origin, { error_code: 'missing_code' })
}
