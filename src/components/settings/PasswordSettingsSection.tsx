'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { isSamePasswordError } from '@/lib/auth/passwordSetupProfile'
import { useI18n } from '@/lib/i18n'
import { toast } from '@/components/Toast'
import { SettingsTextLink } from '@/components/settings/SettingsUi'

const MIN_PASSWORD_LENGTH = 8

export function PasswordSettingsSection({ hasSession }: { hasSession: boolean }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!hasSession) {
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t('passwordSettings.errShort'))
      return
    }
    if (password !== confirm) {
      setError(t('passwordSettings.errMismatch'))
      return
    }
    setBusy(true)
    try {
      const supabase = createClient()
      const { error: upErr } = await supabase.auth.updateUser({ password })
      // same_password = het wachtwoord staat al precies zo: behandel als succes.
      if (upErr && !isSamePasswordError(upErr)) {
        setError(upErr.message || t('passwordSettings.errSave'))
        return
      }
      await fetch('/api/auth/complete-password-setup', { method: 'POST' }).catch(
        () => {}
      )
      toast(t('passwordSettings.success'))
      setPassword('')
      setConfirm('')
      setOpen(false)
    } catch {
      setError(t('passwordSettings.errSave'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="border-t border-slate-100 px-4 py-4">
      <p className="text-sm font-medium text-slate-800">
        {t('passwordSettings.title')}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">
        {t('passwordSettings.hint')}
      </p>

      {open ? (
        <form onSubmit={handleSubmit} className="mt-3 space-y-3">
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('passwordSettings.labelNew')}
            aria-label={t('passwordSettings.labelNew')}
            minLength={MIN_PASSWORD_LENGTH}
            required
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={t('passwordSettings.labelConfirm')}
            aria-label={t('passwordSettings.labelConfirm')}
            minLength={MIN_PASSWORD_LENGTH}
            required
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          {error ? (
            <p className="text-xs text-red-700">{error}</p>
          ) : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? t('passwordSettings.saving') : t('passwordSettings.save')}
          </button>
        </form>
      ) : (
        <div className="mt-3">
          <SettingsTextLink onClick={() => setOpen(true)}>
            {t('passwordSettings.save')}
          </SettingsTextLink>
        </div>
      )}
    </div>
  )
}
