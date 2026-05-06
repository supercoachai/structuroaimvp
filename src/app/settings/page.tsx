'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Settings } from 'lucide-react';
import AppLayout from '../../components/layout/AppLayout';
import { wipeAllUserData, STRUCTURO_STORAGE_KEYS } from '../../lib/resetStorage';
import { toast } from '../../components/Toast';
import { createClient } from '@/lib/supabase/client';
import { isProtectedTestAccount } from '@/lib/protectedTestAccount';
import { setProfileOnboardingCompleted } from '@/lib/onboardingMutations';
import {
  LOCAL_ONBOARDING_COMPLETED_KEY,
  LOCAL_ONBOARDING_VERSION_KEY,
} from '@/lib/onboardingProfile';
import { clearLocalOnboardingDoneCookieOnClient, hasStructuroLocalModeCookieOnClient } from '@/lib/localOnboardingCookie';
import { performClientLogout } from '@/lib/logoutClient';
import {
  clearPreferredDisplayName,
  persistPreferredDisplayName,
} from '@/lib/accountDisplayName';
import { useI18n, type Locale } from '@/lib/i18n';
import {
  registerPushSubscription,
  unregisterPushSubscription,
} from '@/utils/pushNotifications';
import { clearStoredConsent, hasAnalyticsConsent } from '@/lib/consentStorage';

const NAME_KEY = 'structuro_user_name';

export default function SettingsPage() {
  const { t, locale, setLocale } = useI18n();
  const router = useRouter();
  const [nameInput, setNameInput] = useState('');
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isProtectedAccount, setIsProtectedAccount] = useState<boolean | null>(null);
  const [hasSupabaseSession, setHasSupabaseSession] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [nameSaveBusy, setNameSaveBusy] = useState(false);
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission | 'unsupported'>('unsupported');
  const [notificationBusy, setNotificationBusy] = useState(false);
  const [consentSnapshot, setConsentSnapshot] = useState(false);
  const [confirmAccountDelete, setConfirmAccountDelete] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [accountDeleteBusy, setAccountDeleteBusy] = useState(false);

  useEffect(() => {
    const syncConsent = () => setConsentSnapshot(hasAnalyticsConsent());
    syncConsent();
    window.addEventListener('structuro_consent_changed', syncConsent as EventListener);
    return () =>
      window.removeEventListener('structuro_consent_changed', syncConsent as EventListener);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (cancelled) return;
        setHasSupabaseSession(Boolean(user?.id));
        setIsProtectedAccount(isProtectedTestAccount(user?.email ?? null));

        if (user?.id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, preferred_name')
            .eq('id', user.id)
            .maybeSingle();
          if (cancelled) return;
          const fromProfile =
            (typeof profile?.display_name === 'string' && profile.display_name.trim()) ||
            (typeof profile?.preferred_name === 'string' && profile.preferred_name.trim()) ||
            '';
          const fromStorage =
            typeof window !== 'undefined'
              ? localStorage.getItem(NAME_KEY)?.trim() || ''
              : '';
          const m = user.user_metadata as Record<string, unknown> | undefined;
          const metaRaw = m?.full_name ?? m?.fullName;
          const fromMeta = typeof metaRaw === 'string' ? metaRaw.trim() : '';
          setNameInput(fromProfile || fromStorage || fromMeta);
        } else if (typeof window !== 'undefined') {
          setNameInput(localStorage.getItem(NAME_KEY) || '');
        }
      } catch {
        if (!cancelled) {
          setHasSupabaseSession(false);
          setIsProtectedAccount(false);
          if (typeof window !== 'undefined') {
            setNameInput(localStorage.getItem(NAME_KEY) || '');
          }
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const supported =
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window;
    if (!supported) {
      setNotificationPermission('unsupported');
      return;
    }
    setNotificationPermission(Notification.permission);
  }, []);

  const handleReplayIntro = async () => {
    if (hasSupabaseSession) {
      const { error } = await setProfileOnboardingCompleted(false);
      if (error) {
        toast(t('settings.toastReplayFail', { detail: String(error) }));
        return;
      }
    } else {
      try {
        window.localStorage.removeItem(LOCAL_ONBOARDING_COMPLETED_KEY);
        window.localStorage.removeItem(LOCAL_ONBOARDING_VERSION_KEY);
      } catch { /* ignore */ }
      clearLocalOnboardingDoneCookieOnClient();
    }
    window.location.assign(`${window.location.origin}/onboarding`);
  };

  const handleSaveName = async () => {
    const value = nameInput.trim();
    setNameSaveBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.id) {
        if (value) {
          const { error } = await persistPreferredDisplayName(user, value);
          if (error) {
            toast(t('settings.toastSaveFail', { detail: String(error) }));
            return;
          }
          toast(t('settings.toastNameSaved'));
        } else {
          const { error } = await clearPreferredDisplayName(user);
          if (error) {
            toast(t('settings.toastClearFail', { detail: String(error) }));
            return;
          }
          toast(t('settings.toastNameCleared'));
        }
      } else if (typeof window !== 'undefined') {
        if (value) {
          localStorage.setItem(NAME_KEY, value);
          toast(t('settings.toastNameSaved'));
        } else {
          localStorage.removeItem(NAME_KEY);
          toast(t('settings.toastNameCleared'));
        }
      }
    } finally {
      setNameSaveBusy(false);
    }
  };

  const wipeWord = t('settings.wipeWord');

  const handleWipeData = () => {
    if (isProtectedAccount) {
      toast(t('settings.toastProtected'));
      return;
    }
    if (!confirmWipe) {
      setConfirmWipe(true);
      setConfirmText('');
      return;
    }
    if (confirmText.toLowerCase() !== wipeWord.toLowerCase()) {
      toast(t('settings.toastTypeConfirm', { word: wipeWord }));
      return;
    }
    const ok = wipeAllUserData();
    if (ok) toast(t('settings.toastWiped'));
    else toast(t('settings.toastWipeError'));
  };

  const cancelWipe = () => {
    setConfirmWipe(false);
    setConfirmText('');
  };

  const handleDownloadData = () => {
    if (typeof window === 'undefined') return;
    const data: Record<string, unknown> = {};
    STRUCTURO_STORAGE_KEYS.forEach((key) => {
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          data[key] = JSON.parse(raw);
        } catch {
          data[key] = raw;
        }
      }
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `structuro-data-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast(t('settings.toastExportDone'));
  };

  const handleLogout = async () => {
    if (logoutBusy) return;
    setLogoutBusy(true);
    try {
      await performClientLogout(router);
    } finally {
      setLogoutBusy(false);
    }
  };

  const handleResetCookieChoice = () => {
    clearStoredConsent();
    toast(t('settings.toastConsentReset'));
  };

  const accountDeleteWord = t('settings.accountDeleteWord');

  const cancelAccountDelete = () => {
    setConfirmAccountDelete(false);
    setDeleteConfirmText('');
  };

  const handleAccountDelete = async () => {
    if (!hasSupabaseSession) return;
    if (isProtectedAccount) {
      toast(t('settings.toastProtected'));
      return;
    }
    if (!confirmAccountDelete) {
      setConfirmAccountDelete(true);
      setDeleteConfirmText('');
      return;
    }
    if (deleteConfirmText.trim().toLowerCase() !== accountDeleteWord.trim().toLowerCase()) {
      toast(t('settings.toastTypeConfirm', { word: accountDeleteWord }));
      return;
    }
    setAccountDeleteBusy(true);
    try {
      const res = await fetch('/api/account/delete', { method: 'POST', credentials: 'include' });
      if (res.status === 204) {
        toast(t('settings.accountDeleteDone'));
        await performClientLogout(router);
        return;
      }
      if (res.status === 503) {
        toast(t('settings.accountDeleteUnavailable'));
        return;
      }
      toast(t('settings.accountDeleteFail'));
    } finally {
      setAccountDeleteBusy(false);
    }
  };

  const handleEnableNotifications = async () => {
    if (notificationBusy) return;
    if (notificationPermission === 'unsupported') {
      toast(t('settings.notificationsUnsupported'));
      return;
    }
    setNotificationBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) {
        toast(t('settings.notificationsNeedLogin'));
        return;
      }
      const sub = await registerPushSubscription(user.id);
      const currentPermission =
        typeof window !== 'undefined' && 'Notification' in window
          ? Notification.permission
          : 'default';
      setNotificationPermission(currentPermission);
      if (sub) toast(t('settings.notificationsEnabled'));
      else if (currentPermission === 'denied') {
        toast(t('settings.notificationsDenied'));
      } else {
        toast(t('settings.notificationsNoSubscription'));
      }
    } catch (err) {
      toast(t('settings.notificationsEnableFail', { detail: String(err) }));
    } finally {
      setNotificationBusy(false);
    }
  };

  const handleDisableNotifications = async () => {
    if (notificationBusy) return;
    setNotificationBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) {
        toast(t('settings.notificationsNeedLogin'));
        return;
      }
      await unregisterPushSubscription(user.id);
      setNotificationPermission('default');
      toast(t('settings.notificationsDisabled'));
    } catch (err) {
      toast(t('settings.notificationsDisableFail', { detail: String(err) }));
    } finally {
      setNotificationBusy(false);
    }
  };

  const isLocalOnly = hasStructuroLocalModeCookieOnClient() && !hasSupabaseSession;

  return (
    <AppLayout>
      <div className="min-h-full bg-[var(--structuro-bg)] text-[var(--structuro-text)]">
        <main className="mx-auto w-full max-w-lg px-4 pb-28 pt-4">
          <header className="mb-10 flex w-full flex-col items-start text-left sm:mb-12">
            <div
              className="mb-5 flex h-14 w-14 shrink-0 items-center justify-center rounded-full shadow-md"
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
              }}
            >
              <Settings className="h-7 w-7 text-white" strokeWidth={2} aria-hidden />
            </div>
            <h1 className="structuro-page-title">{t('settings.title')}</h1>
            <p className="structuro-page-subtitle">
              {t('settings.subtitle')}
            </p>
          </header>

          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 mb-6 p-6">
            <h2 className="text-base font-semibold text-slate-800 mb-1">{t('settings.languageTitle')}</h2>
            <p className="text-sm text-slate-500 mb-4 text-balance">
              {t('settings.languageHint')}
            </p>
            <div className="flex flex-wrap gap-2">
              {(['nl', 'en'] as Locale[]).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLocale(code)}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition-all active:scale-[0.98] ${
                    locale === code
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {code === 'nl' ? t('settings.languageNl') : t('settings.languageEn')}
                </button>
              ))}
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 mb-6 p-6">
            <h2 className="text-base font-semibold text-slate-800 mb-1">
              {t('settings.notificationsTitle')}
            </h2>
            <p className="text-sm text-slate-500 mb-4 text-balance">
              {t('settings.notificationsHint')}
            </p>
            <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <span className="font-semibold">{t('settings.notificationsStatusLabel')}: </span>
              {notificationPermission === 'granted'
                ? t('settings.notificationsStatusOn')
                : notificationPermission === 'denied'
                  ? t('settings.notificationsStatusOff')
                  : notificationPermission === 'unsupported'
                    ? t('settings.notificationsStatusUnsupported')
                    : t('settings.notificationsStatusAsk')}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleEnableNotifications()}
                disabled={notificationBusy || notificationPermission === 'unsupported'}
                className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
              >
                {notificationBusy
                  ? t('settings.notificationsBusy')
                  : t('settings.notificationsEnableCta')}
              </button>
              <button
                type="button"
                onClick={() => void handleDisableNotifications()}
                disabled={notificationBusy || notificationPermission !== 'granted'}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
              >
                {t('settings.notificationsDisableCta')}
              </button>
            </div>
          </section>

          <section className="mb-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="mb-1 text-base font-semibold text-slate-800">
              {t('settings.analyticsConsentTitle')}
            </h2>
            <p className="mb-4 text-balance text-sm text-slate-500">{t('settings.analyticsConsentHint')}</p>
            <p className="mb-4 text-sm text-slate-700">
              {t('settings.analyticsConsentStatus', {
                status: consentSnapshot
                  ? t('settings.analyticsConsentStatusOn')
                  : t('settings.analyticsConsentStatusOff'),
              })}
            </p>
            <button
              type="button"
              onClick={handleResetCookieChoice}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 active:scale-[0.98]"
            >
              {t('settings.analyticsConsentResetCta')}
            </button>
          </section>

          {/* Kaart 1: Jouw profiel */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 mb-6 p-6">
            <h2 className="text-base font-semibold text-slate-800 mb-1">{t('settings.displayNameTitle')}</h2>
            <p className="text-sm text-slate-500 mb-4 text-balance">
              {t('settings.displayNameHint')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleSaveName();
                }}
                placeholder={t('settings.displayNamePlaceholder')}
                className="flex-1 min-w-0 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-300"
              />
              <button
                type="button"
                onClick={() => void handleSaveName()}
                disabled={nameSaveBusy}
                className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {nameSaveBusy ? t('settings.saving') : t('settings.save')}
              </button>
            </div>

            <div className="border-t border-slate-100 my-4" />

            <button
              type="button"
              onClick={() => void handleLogout()}
              disabled={logoutBusy}
              className="block text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 disabled:opacity-50"
            >
              {logoutBusy ? t('settings.logoutBusy') : t('settings.logout')}
            </button>
            {isLocalOnly ? (
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                {t('settings.localOnlyHint')}
              </p>
            ) : null}
          </section>

          {/* Kaart 2: App-ervaring */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 mb-6 p-6">
            <h2 className="text-base font-semibold text-slate-800 mb-1">{t('settings.tourTitle')}</h2>
            <p className="text-sm text-slate-500 mb-4 text-balance">
              {t('settings.tourHint')}
            </p>
            <button
              type="button"
              onClick={() => void handleReplayIntro()}
              className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-200 active:scale-[0.98]"
            >
              {t('settings.tourCta')}
            </button>
          </section>

          {/* Kaart 3: Data & privacy */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 mb-6 p-6">
            <h2 className="text-base font-semibold text-slate-800 mb-1">{t('settings.exportTitle')}</h2>
            <p className="text-sm text-slate-500 mb-4 text-balance">
              {t('settings.exportHint')}
            </p>
            <button
              type="button"
              onClick={handleDownloadData}
              className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-200 active:scale-[0.98]"
            >
              {t('settings.exportCta')}
            </button>
          </section>

          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 mb-6 p-6">
            <h2 className="text-base font-semibold text-slate-800 mb-1">{t('settings.wipeTitle')}</h2>
            <p className="text-sm text-slate-500 mb-4 text-balance leading-relaxed">
              {t('settings.wipeHint')}
            </p>

            {isProtectedAccount ? (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
                {t('settings.wipeProtected')}
              </div>
            ) : null}

            {!confirmWipe ? (
              <button
                type="button"
                onClick={handleWipeData}
                disabled={isProtectedAccount === true}
                className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-red-600 shadow-sm transition-all hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
              >
                {t('settings.wipeCta')}
              </button>
            ) : (
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-sm text-slate-600 text-balance">
                  {t('settings.wipeConfirmLine', { word: wipeWord })}
                </p>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={t('settings.wipePlaceholder')}
                  className="w-full max-w-xs rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-200"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleWipeData}
                    className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-red-600 shadow-sm transition-all hover:bg-red-50 active:scale-[0.98]"
                  >
                    {t('settings.wipeFinal')}
                  </button>
                  <button
                    type="button"
                    onClick={cancelWipe}
                    className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-200 transition-colors hover:bg-slate-50 active:scale-[0.98]"
                  >
                    {t('settings.cancel')}
                  </button>
                </div>
              </div>
            )}
          </section>

          {hasSupabaseSession ? (
            <section className="mb-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="mb-1 text-base font-semibold text-slate-800">
                {t('settings.accountDeleteTitle')}
              </h2>
              <p className="mb-4 text-balance text-sm leading-relaxed text-slate-500">
                {t('settings.accountDeleteHint')}
              </p>
              {isProtectedAccount ? (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
                  {t('settings.wipeProtected')}
                </div>
              ) : null}
              {!confirmAccountDelete ? (
                <button
                  type="button"
                  onClick={handleAccountDelete}
                  disabled={
                    isProtectedAccount === true || accountDeleteBusy || !hasSupabaseSession
                  }
                  className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-red-600 shadow-sm transition-all hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
                >
                  {t('settings.accountDeleteCta')}
                </button>
              ) : (
                <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-sm text-balance text-slate-600">
                    {t('settings.accountDeleteConfirmLine', { word: accountDeleteWord })}
                  </p>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder={accountDeleteWord}
                    className="w-full max-w-xs rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-red-200 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void handleAccountDelete()}
                      disabled={accountDeleteBusy}
                      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
                    >
                      {accountDeleteBusy ? t('settings.accountDeleteBusy') : t('settings.accountDeleteCta')}
                    </button>
                    <button
                      type="button"
                      onClick={cancelAccountDelete}
                      disabled={accountDeleteBusy}
                      className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 active:scale-[0.98]"
                    >
                      {t('settings.cancel')}
                    </button>
                  </div>
                </div>
              )}
            </section>
          ) : null}

          <p className="mt-8 text-center text-xs text-slate-400 leading-relaxed text-balance">
            {t('settings.footerPrivacy')}
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-medium">
            <Link href="/privacy" className="text-blue-600 underline-offset-2 hover:underline">
              {t('settings.legalPrivacy')}
            </Link>
            <Link href="/terms" className="text-blue-600 underline-offset-2 hover:underline">
              {t('settings.legalTerms')}
            </Link>
          </div>
        </main>
      </div>
    </AppLayout>
  );
}
