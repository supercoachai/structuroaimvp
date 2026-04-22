import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function redirectToAuthError(
  origin: string,
  params: Record<string, string>
): NextResponse {
  const q = new URLSearchParams(params)
  return NextResponse.redirect(`${origin}/auth/auth-code-error?${q}`)
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

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
      const forwardedHost = request.headers.get('x-forwarded-host') // original origin before reverse proxy
      const isLocalEnv = process.env.NODE_ENV === 'development'
      const target = isLocalEnv
        ? `${origin}${next}`
        : forwardedHost
          ? `https://${forwardedHost}${next}`
          : `${origin}${next}`
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

