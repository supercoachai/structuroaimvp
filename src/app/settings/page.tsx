'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
import { useInfoDismissals } from '@/contexts/InfoDismissalsContext';
import {
  clearPreferredDisplayName,
  persistPreferredDisplayName,
} from '@/lib/accountDisplayName';
import { useI18n, type Locale } from '@/lib/i18n';
import {
  registerPushSubscription,
  unregisterPushSubscription,
} from '@/utils/pushNotifications';
import { detectPushSupport } from '@/lib/pushNotificationSupport';
import { NotificationsHint } from '@/components/settings/NotificationsHint';
import { useConsent } from '@/lib/posthog/ConsentContext';
import CycleSettingsSection from '@/components/cycle/CycleSettingsSection';
import { isRegistrationCheckoutEnabledClient } from '@/lib/stripe/registrationLaunch';
import {
  SettingsLinkActions,
  SettingsRow,
  SettingsSection,
  SettingsTextLink,
  SettingsToggle,
} from '@/components/settings/SettingsUi';
import { refundMailtoHref } from '@/lib/refundContact';
import { PasskeySettingsSection } from '@/components/settings/PasskeySettingsSection';
import { PasswordSettingsSection } from '@/components/settings/PasswordSettingsSection';

const NAME_KEY = 'structuro_user_name';

/** Tijdelijk: abonnement-acties uit voor testers tot Stripe-flow live is. */
const SUBSCRIPTION_ACTIONS_DISABLED = true;

export default function SettingsPage() {
  const { t, locale, setLocale } = useI18n();
  const router = useRouter();
  const { consent, grant, deny } = useConsent();
  const { resetAll: resetInfoDismissals } = useInfoDismissals();
  const [nameInput, setNameInput] = useState('');
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [wipeBusy, setWipeBusy] = useState(false);
  const [isProtectedAccount, setIsProtectedAccount] = useState<boolean | null>(null);
  const [hasSupabaseSession, setHasSupabaseSession] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [nameSaveBusy, setNameSaveBusy] = useState(false);
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission | 'unsupported'>('unsupported');
  const [needsHomescreen, setNeedsHomescreen] = useState(false);
  const [pushChecked, setPushChecked] = useState(false);
  const [notificationBusy, setNotificationBusy] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [subscriptionPeriodEnd, setSubscriptionPeriodEnd] = useState<string | null>(null);
  const [stripeSubscriptionId, setStripeSubscriptionId] = useState<string | null>(null);
  const [subscriptionSyncBusy, setSubscriptionSyncBusy] = useState(false);

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
            .select('display_name, preferred_name, subscription_status, subscription_current_period_end, stripe_subscription_id')
            .eq('id', user.id)
            .maybeSingle();
          if (cancelled) return;
          const fromProfile =
            (typeof profile?.display_name === 'string' && profile.display_name.trim()) ||
            (typeof profile?.preferred_name === 'string' && profile.preferred_name.trim()) ||
            '';
          setSubscriptionStatus(
            typeof profile?.subscription_status === 'string' ? profile.subscription_status : null
          );
          setSubscriptionPeriodEnd(
            profile?.subscription_current_period_end != null
              ? String(profile.subscription_current_period_end)
              : null
          );
          setStripeSubscriptionId(
            typeof profile?.stripe_subscription_id === 'string'
              ? profile.stripe_subscription_id
              : null
          );
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
    const state = detectPushSupport();
    setNotificationPermission(state.permission);
    setNeedsHomescreen(state.needsHomescreen);
    setPushChecked(true);
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
    window.location.assign(`${window.location.origin}/onboarding?replay=1`);
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

  const handleWipeData = async () => {
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
    if (wipeBusy) return;

    // Ingelogd: definitieve server-side accountverwijdering (AVG art. 17).
    if (hasSupabaseSession) {
      setWipeBusy(true);
      try {
        const res = await fetch('/api/account/delete', {
          method: 'POST',
          credentials: 'include',
        });
        if (res.status === 403) {
          toast(t('settings.toastProtected'));
          return;
        }
        if (!res.ok && res.status !== 204) {
          toast(t('settings.toastDeleteFail'));
          return;
        }
        // Server-data is weg: ruim ook lokale resten op en log uit naar /.
        wipeAllUserData();
      } catch {
        toast(t('settings.toastDeleteFail'));
      } finally {
        setWipeBusy(false);
      }
      return;
    }

    // Lokale modus (geen Supabase-sessie): alleen browseropslag wissen.
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

  const handleEnableNotifications = async () => {
    if (notificationBusy) return;
    if (needsHomescreen) {
      toast.error(t('settings.notificationsNeedsHomescreenToast'));
      return;
    }
    if (notificationPermission === 'unsupported') {
      toast.error(t('settings.notificationsUnsupported'));
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

  const handleCancelSubscription = async () => {
    if (cancelBusy) return;
    if (!window.confirm(t('settings.cancelConfirm'))) return;
    setCancelBusy(true);
    try {
      const res = await fetch('/api/stripe/subscription/cancel', { method: 'POST' });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast(t('settings.cancelFail', { detail: body.error ?? String(res.status) }));
        return;
      }
      toast(t('settings.cancelDone'));
      setSubscriptionStatus('cancelled');
    } catch (err) {
      toast(t('settings.cancelFail', { detail: String(err) }));
    } finally {
      setCancelBusy(false);
    }
  };

  const reloadSubscriptionFromProfile = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) return;
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_status, subscription_current_period_end, stripe_subscription_id')
      .eq('id', user.id)
      .maybeSingle();
    setSubscriptionStatus(
      typeof profile?.subscription_status === 'string' ? profile.subscription_status : null
    );
    setSubscriptionPeriodEnd(
      profile?.subscription_current_period_end != null
        ? String(profile.subscription_current_period_end)
        : null
    );
    setStripeSubscriptionId(
      typeof profile?.stripe_subscription_id === 'string'
        ? profile.stripe_subscription_id
        : null
    );
  };

  const handleSyncSubscription = async () => {
    if (subscriptionSyncBusy) return;
    setSubscriptionSyncBusy(true);
    try {
      const res = await fetch('/api/stripe/sync-subscription', { method: 'POST' });
      const body = (await res.json()) as { error?: string; detail?: string };
      if (res.ok) {
        toast(t('settings.subscriptionSyncOk'));
        await reloadSubscriptionFromProfile();
        return;
      }
      if (body.error === 'subscription_not_found') {
        toast(t('settings.subscriptionSyncNotFound'));
        return;
      }
      if (body.error === 'service_role_key_missing') {
        toast(t('subscription.checkoutServiceRoleError'));
        return;
      }
      toast(
        t('settings.subscriptionSyncFail', {
          detail: body.error ?? String(res.status),
        })
      );
    } catch (err) {
      toast(t('settings.subscriptionSyncFail', { detail: String(err) }));
    } finally {
      setSubscriptionSyncBusy(false);
    }
  };

  const subscriptionNeedsLink =
    !subscriptionStatus ||
    subscriptionStatus === 'none' ||
    subscriptionStatus === 'unknown';

  const formatPeriodEnd = (iso: string | null) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(locale === 'en' ? 'en-GB' : 'nl-NL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  const isLocalOnly = hasStructuroLocalModeCookieOnClient() && !hasSupabaseSession;
  const notificationsOn = notificationPermission === 'granted';
  const notificationsToggleDisabled =
    notificationBusy || notificationPermission === 'denied';

  const handleNotificationToggle = () => {
    if (notificationBusy) return;
    if (needsHomescreen) {
      toast.error(t('settings.notificationsNeedsHomescreenToast'));
      return;
    }
    if (notificationPermission === 'denied') {
      toast.error(t('settings.notificationsDenied'));
      return;
    }
    if (notificationsOn) void handleDisableNotifications();
    else void handleEnableNotifications();
  };

  const handleResetInfoIcons = () => {
    void resetInfoDismissals().then(() => {
      toast(t('settings.toastInfoIconsReset'));
    });
  };

  const subscriptionStatusLine = (() => {
    if (subscriptionStatus === 'active') return t('settings.subscriptionStatusActive');
    if (subscriptionStatus === 'cancelled') {
      return t('settings.subscriptionStatusCancelledEnd', {
        date: formatPeriodEnd(subscriptionPeriodEnd),
      });
    }
    if (subscriptionStatus === 'past_due') return t('settings.subscriptionStatusPastDue');
    if (subscriptionStatus === 'refunded') return t('settings.subscriptionStatusRefunded');
    if (subscriptionStatus === 'expired') return t('settings.subscriptionStatusExpired');
    return t('settings.subscriptionUnknown');
  })();

  return (
    <>
      <div className="min-h-full bg-[var(--structuro-bg)] text-[var(--structuro-text)]">
        <main className="mx-auto w-full max-w-lg px-4 pb-28 pt-4">
          <header className="mb-8">
            <h1 className="structuro-page-title">{t('settings.title')}</h1>
            <p className="structuro-page-subtitle">
              {t('settings.subtitle')}
            </p>
          </header>

          <SettingsSection title={t('settings.sectionPreferences')}>
            <SettingsRow label={t('settings.languageTitle')} hint={t('settings.languageHint')}>
              <div className="flex gap-1.5">
                {(['nl', 'en'] as Locale[]).map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setLocale(code)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      locale === code
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {code === 'nl' ? t('settings.languageNl') : t('settings.languageEn')}
                  </button>
                ))}
              </div>
            </SettingsRow>

            <SettingsRow
              label={t('settings.displayNameTitle')}
              hint={t('settings.displayNameHint')}
              stack
            >
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleSaveName();
                  }}
                  placeholder={t('settings.displayNamePlaceholder')}
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-base text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/25"
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
            </SettingsRow>
          </SettingsSection>

          <SettingsSection title={t('cycle.settingsTitle')}>
            <CycleSettingsSection embedded />
          </SettingsSection>

          <SettingsSection title={t('settings.sectionPrivacy')}>
            <SettingsRow
              label={t('settings.analyticsTitle')}
              hint={t('settings.analyticsHint')}
            >
              <SettingsToggle
                checked={consent === 'granted'}
                onChange={() => {
                  if (consent === 'granted') deny();
                  else grant();
                }}
                ariaLabel={t('settings.analyticsTitle')}
              />
            </SettingsRow>

            <SettingsRow
              label={t('settings.notificationsTitle')}
              hint={
                pushChecked ? (
                  <NotificationsHint
                    permission={notificationPermission}
                    needsHomescreen={needsHomescreen}
                    installLinkHref="/welkom/install?from=settings"
                    defaultHint="settings"
                  />
                ) : (
                  ' '
                )
              }
            >
              <SettingsToggle
                checked={notificationsOn}
                onChange={handleNotificationToggle}
                disabled={notificationsToggleDisabled}
                busy={notificationBusy}
                ariaLabel={t('settings.notificationsTitle')}
              />
            </SettingsRow>
          </SettingsSection>

          <SettingsSection title={t('settings.sectionAccount')}>
            {hasSupabaseSession && !isLocalOnly && isRegistrationCheckoutEnabledClient() ? (
              <div className="px-4 py-4">
                <p className="text-sm font-medium text-slate-800">
                  {t('settings.subscriptionTitle')}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  {subscriptionStatusLine}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                  {subscriptionNeedsLink ? (
                    SUBSCRIPTION_ACTIONS_DISABLED ? (
                      <>
                        <span className="text-sm font-medium text-slate-400">
                          {t('settings.subscriptionSyncCta')}
                        </span>
                        <span className="text-sm font-medium text-slate-400">
                          {t('settings.subscriptionGoAbonnement')}
                        </span>
                      </>
                    ) : (
                      <>
                        <SettingsTextLink
                          onClick={() => void handleSyncSubscription()}
                          disabled={subscriptionSyncBusy}
                        >
                          {subscriptionSyncBusy
                            ? t('settings.subscriptionSyncBusy')
                            : t('settings.subscriptionSyncCta')}
                        </SettingsTextLink>
                        <Link
                          href="/abonnement"
                          className="text-sm font-medium text-blue-600 underline-offset-2 hover:underline"
                        >
                          {t('settings.subscriptionGoAbonnement')}
                        </Link>
                      </>
                    )
                  ) : null}
                  {subscriptionStatus === 'active' && stripeSubscriptionId ? (
                    <>
                      <a
                        href={refundMailtoHref(locale)}
                        className="text-sm font-medium text-blue-600 underline-offset-2 hover:underline"
                      >
                        {t('settings.refundSelfCta')}
                      </a>
                      <SettingsTextLink
                        onClick={() => void handleCancelSubscription()}
                        disabled={cancelBusy}
                      >
                        {cancelBusy ? t('settings.cancelBusy') : t('settings.cancelCta')}
                      </SettingsTextLink>
                    </>
                  ) : null}
                </div>
              </div>
            ) : null}

            <PasskeySettingsSection hasSession={hasSupabaseSession && !isLocalOnly} />

            <PasswordSettingsSection hasSession={hasSupabaseSession && !isLocalOnly} />

            <SettingsLinkActions>
              <SettingsTextLink onClick={handleDownloadData}>
                {t('settings.exportCta')}
              </SettingsTextLink>
              <SettingsTextLink onClick={() => void handleReplayIntro()}>
                {t('settings.tourCta')}
              </SettingsTextLink>
              <SettingsTextLink onClick={() => void handleLogout()} disabled={logoutBusy}>
                {logoutBusy ? t('settings.logoutBusy') : t('settings.logout')}
              </SettingsTextLink>
              {isLocalOnly ? (
                <p className="text-xs leading-relaxed text-slate-400">
                  {t('settings.localOnlyHint')}
                </p>
              ) : null}
            </SettingsLinkActions>

            <div className="border-t border-slate-100 px-4 py-4">
              <p className="mb-1 text-sm font-medium text-slate-800">{t('settings.wipeTitle')}</p>
              <p className="mb-3 text-xs leading-relaxed text-slate-500">{t('settings.wipeHint')}</p>

              {isProtectedAccount ? (
                <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-900">
                  {t('settings.wipeProtected')}
                </div>
              ) : null}

              {!confirmWipe ? (
                <SettingsTextLink
                  variant="danger"
                  onClick={handleWipeData}
                  disabled={isProtectedAccount === true}
                >
                  {t('settings.wipeCta')}
                </SettingsTextLink>
              ) : (
                <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                  <p className="text-sm text-slate-600 text-balance">
                    {t('settings.wipeConfirmLine', { word: wipeWord })}
                  </p>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder={t('settings.wipePlaceholder')}
                    className="w-full max-w-xs rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-red-200 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                  />
                  <div className="flex flex-wrap gap-3">
                    <SettingsTextLink
                      variant="danger"
                      onClick={handleWipeData}
                      disabled={wipeBusy}
                    >
                      {wipeBusy ? t('settings.wipeBusy') : t('settings.wipeFinal')}
                    </SettingsTextLink>
                    <SettingsTextLink onClick={cancelWipe} disabled={wipeBusy}>
                      {t('settings.cancel')}
                    </SettingsTextLink>
                  </div>
                </div>
              )}
            </div>
          </SettingsSection>

          <p className="mt-4 text-center text-xs leading-relaxed text-slate-400 text-balance">
            {t('settings.footerPrivacy')}
          </p>
          <div className="mt-3 flex justify-center">
            <SettingsTextLink onClick={handleResetInfoIcons}>
              {t('settings.resetInfoIcons')}
            </SettingsTextLink>
          </div>
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
    </>
  );
}
