'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { isPasskeySupportedInBrowser, mapPasskeyErrorMessage } from '@/lib/auth/passkeys'
import { useI18n } from '@/lib/i18n'
import { useClientMounted } from '@/hooks/useClientMounted'

type PasskeySignInButtonProps = {
  disabled?: boolean
  onSuccess: (userId: string, email: string | null | undefined) => void | Promise<void>
  onError?: (message: string) => void
  className?: string
  visual?: 'story' | 'work'
}

export function PasskeySignInButton({
  disabled,
  onSuccess,
  onError,
  className,
  visual = 'work',
}: PasskeySignInButtonProps) {
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)
  const mounted = useClientMounted()

  if (!mounted || !isPasskeySupportedInBrowser()) {
    return null
  }

  const handleClick = async () => {
    if (busy || disabled) return
    setBusy(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPasskey()
      if (error) {
        const message = mapPasskeyErrorMessage(error, t)
        onError?.(message)
        return
      }
      if (!data.user?.id) {
        onError?.(t('passkey.errGeneric'))
        return
      }
      await supabase.auth.getSession()
      await onSuccess(data.user.id, data.user.email)
    } catch (err) {
      onError?.(
        mapPasskeyErrorMessage(err instanceof Error ? err : null, t)
      )
    } finally {
      setBusy(false)
    }
  }

  const storyClass =
    'flex w-full items-center justify-center rounded-xl border border-[var(--story-border)] bg-white px-6 py-[15px] text-base font-semibold text-[var(--story-text)] transition-colors hover:border-[var(--story-accent)] disabled:cursor-not-allowed disabled:opacity-60'

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={busy || disabled}
        className={
        className ??
        (visual === 'story'
          ? storyClass
          : 'st-btn-ghost h-12 w-full border border-[var(--st-line)] text-base disabled:cursor-not-allowed')
      }
    >
      {busy ? t('login.busy') : t('passkey.signInCta')}
    </button>
  )
}
