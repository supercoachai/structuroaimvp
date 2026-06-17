'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  isPasskeySupportedInBrowser,
  mapPasskeyErrorMessage,
  type PasskeyListItem,
} from '@/lib/auth/passkeys'
import { useI18n } from '@/lib/i18n'
import { toast } from '@/components/Toast'
import { SettingsTextLink } from '@/components/settings/SettingsUi'

export function PasskeySettingsSection({ hasSession }: { hasSession: boolean }) {
  const { t } = useI18n()
  const [passkeys, setPasskeys] = useState<PasskeyListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [registerBusy, setRegisterBusy] = useState(false)
  const [deleteBusyId, setDeleteBusyId] = useState<string | null>(null)

  const supported = isPasskeySupportedInBrowser()

  const refreshPasskeys = useCallback(async () => {
    if (!hasSession || !supported) {
      setPasskeys([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.passkey.list()
      if (error) throw error
      setPasskeys((data ?? []) as PasskeyListItem[])
    } catch (err) {
      setPasskeys([])
      toast(mapPasskeyErrorMessage(err instanceof Error ? err : null, t))
    } finally {
      setLoading(false)
    }
  }, [hasSession, supported, t])

  useEffect(() => {
    void refreshPasskeys()
  }, [refreshPasskeys])

  if (!hasSession || !supported) {
    return null
  }

  const handleRegister = async () => {
    if (registerBusy) return
    setRegisterBusy(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.registerPasskey()
      if (error) throw error
      toast(t('passkey.registerSuccess'))
      await refreshPasskeys()
    } catch (err) {
      toast(mapPasskeyErrorMessage(err instanceof Error ? err : null, t))
    } finally {
      setRegisterBusy(false)
    }
  }

  const handleDelete = async (passkeyId: string) => {
    if (deleteBusyId) return
    setDeleteBusyId(passkeyId)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.passkey.delete({ passkeyId })
      if (error) throw error
      toast(t('passkey.deleteSuccess'))
      await refreshPasskeys()
    } catch (err) {
      toast(mapPasskeyErrorMessage(err instanceof Error ? err : null, t))
    } finally {
      setDeleteBusyId(null)
    }
  }

  return (
    <div className="border-t border-slate-100 px-4 py-4">
      <p className="text-sm font-medium text-slate-800">{t('passkey.settingsTitle')}</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">
        {t('passkey.settingsHint')}
      </p>

      {loading ? (
        <p className="mt-3 text-xs text-slate-400">{t('passkey.loading')}</p>
      ) : passkeys.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {passkeys.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">
                  {item.friendly_name?.trim() || t('passkey.unnamed')}
                </p>
                {item.last_used_at ? (
                  <p className="mt-0.5 text-xs text-slate-500">
                    {t('passkey.lastUsed', {
                      date: formatPasskeyDate(item.last_used_at),
                    })}
                  </p>
                ) : null}
              </div>
              <SettingsTextLink
                variant="danger"
                onClick={() => void handleDelete(item.id)}
                disabled={deleteBusyId === item.id}
              >
                {deleteBusyId === item.id ? t('passkey.deleteBusy') : t('passkey.deleteCta')}
              </SettingsTextLink>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-slate-500">{t('passkey.noneYet')}</p>
      )}

      <div className="mt-3">
        <SettingsTextLink onClick={() => void handleRegister()} disabled={registerBusy}>
          {registerBusy ? t('passkey.registerBusy') : t('passkey.registerCta')}
        </SettingsTextLink>
      </div>
    </div>
  )
}

function formatPasskeyDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}
