import type { AuthError } from '@supabase/supabase-js'

export type PasskeyListItem = {
  id: string
  friendly_name?: string
  created_at: string
  last_used_at?: string
}

export function isPasskeySupportedInBrowser(): boolean {
  if (typeof window === 'undefined') return false
  return (
    typeof PublicKeyCredential !== 'undefined' &&
    typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable ===
      'function'
  )
}

export function mapPasskeyErrorMessage(
  error: AuthError | Error | null | undefined,
  t: (key: string) => string
): string {
  if (!error) return t('passkey.errGeneric')

  const code =
    'code' in error && typeof error.code === 'string' ? error.code : ''
  const message = error.message?.toLowerCase() ?? ''

  if (code === 'passkey_disabled') return t('passkey.errDisabled')
  if (code === 'webauthn_challenge_expired') return t('passkey.errExpired')
  if (code === 'webauthn_credential_exists') return t('passkey.errExists')
  if (code === 'webauthn_credential_not_found') return t('passkey.errNotFound')
  if (code === 'too_many_passkeys') return t('passkey.errTooMany')
  if (code === 'email_not_confirmed' || code === 'phone_not_confirmed') {
    return t('passkey.errEmailConfirm')
  }
  if (message.includes('cancel') || message.includes('abort')) {
    return t('passkey.errCancelled')
  }
  if (message.includes('not supported') || message.includes('secure context')) {
    return t('passkey.errUnsupported')
  }

  return error.message || t('passkey.errGeneric')
}
