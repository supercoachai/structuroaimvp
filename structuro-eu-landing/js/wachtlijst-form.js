const SUPABASE_URL = 'https://oapnsywlmdmqgmfwiojy.supabase.co';
const SUPABASE_ANON_KEY = String(typeof window.__STRUCTURO_EU_SB_ANON__ === 'undefined' ? '' : window.__STRUCTURO_EU_SB_ANON__);

const T = {
  nl: {
    wl_h1: 'Wachtlijst',
    wl_lede: 'Laat je gegevens achter. Als Structuro voor jou live gaat, hoor je van ons. Geen nieuwsbrieven, geen gedoe.',
    wl_name: 'Naam',
    wl_email: 'E-mailadres',
    wl_ph_name: 'Jouw naam',
    wl_ph_email: 'jouw@email.nl',
    wl_submit: 'Zet me op de lijst',
    wl_success: 'Gelukt! Je hoort van ons zodra Structuro live gaat op 31 mei.',
    wl_dup: 'Dit e-mailadres staat al op de lijst.',
    wl_err: 'Er ging iets mis. Probeer het opnieuw.',
    wl_back: '← Terug naar de landingspagina',
  },
  en: {
    wl_h1: 'Waitlist',
    wl_lede: 'Leave your details. When Structuro is live for you, you will hear from us. No newsletters, no fuss.',
    wl_name: 'Name',
    wl_email: 'Email',
    wl_ph_name: 'Your name',
    wl_ph_email: 'your@email.com',
    wl_submit: 'Join the waitlist',
    wl_success: 'Done! You will hear from us when Structuro goes live on 31 May.',
    wl_dup: 'This email address is already on the list.',
    wl_err: 'Something went wrong. Please try again.',
    wl_back: '← Back to the landing page',
  },
};

function sanitizeWaitlistSource(raw) {
  var t = String(raw || '').trim().slice(0, 64);
  if (!t) return '';
  var cleaned = t.replace(/[^a-zA-Z0-9_-]/g, '');
  return cleaned;
}

/** utm_source (of ?source=) uit landing-URL; anders 'direct'. */
function resolveWaitlistSource() {
  try {
    var params = new URLSearchParams(window.location.search);
    var fromUtm = sanitizeWaitlistSource(params.get('utm_source'));
    if (fromUtm) return fromUtm;
    var fromSource = sanitizeWaitlistSource(params.get('source'));
    if (fromSource) return fromSource;
  } catch (e) {}
  return 'direct';
}

function supabaseAnonKeyReady() {
  var k = (SUPABASE_ANON_KEY || '').trim();
  if (!k) return false;
  if (k.indexOf('__SUPABASE_ANON_KEY__') !== -1) return false;
  return k.length >= 40;
}

function lang() {
  var s = '';
  try {
    s = localStorage.getItem('structuro_lang') || '';
  } catch (e) {}
  return s === 'en' ? 'en' : 'nl';
}

function setLang(l) {
  try {
    localStorage.setItem('structuro_lang', l);
  } catch (e) {}
  document.documentElement.lang = l === 'en' ? 'en' : 'nl';
  document.querySelectorAll('[data-i18n]').forEach(function (el) {
    var k = el.getAttribute('data-i18n');
    if (T[l][k]) el.textContent = T[l][k];
  });
  document.getElementById('btnNL').classList.toggle('active', l === 'nl');
  document.getElementById('btnEN').classList.toggle('active', l === 'en');
  document.getElementById('wl-name').placeholder = T[l].wl_ph_name;
  document.getElementById('wl-email').placeholder = T[l].wl_ph_email;
  var okEl = document.getElementById('wl-success-msg');
  if (okEl && okEl.dataset.i18nKey === '1' && T[l].wl_success) okEl.textContent = T[l].wl_success;
}

document.getElementById('btnNL').onclick = function () {
  setLang('nl');
};
document.getElementById('btnEN').onclick = function () {
  setLang('en');
};
setLang(lang());

var supabaseJsPromise = null;
function loadCreateClient() {
  if (!supabaseJsPromise) {
    supabaseJsPromise = import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  }
  return supabaseJsPromise.then(function (m) {
    return m.createClient;
  });
}

const form = document.getElementById('wl-form');
const btn = document.getElementById('wl-submit');
const boxDup = document.getElementById('wl-dup');
const boxErr = document.getElementById('wl-err');

form.addEventListener('submit', async function (e) {
  e.preventDefault();
  boxDup.hidden = true;
  boxErr.hidden = true;
  if (!supabaseAnonKeyReady()) {
    boxErr.textContent = T[lang()].wl_err;
    boxErr.hidden = false;
    return;
  }
  btn.disabled = true;
  if (typeof window.posthog !== 'undefined') {
    window.posthog.capture('waitlist_signup_started', {
      source: resolveWaitlistSource(),
    });
  }
  const nameVal = document.getElementById('wl-name').value.trim();
  const emailVal = document.getElementById('wl-email').value.trim().toLowerCase();
  try {
    const createClient = await loadCreateClient();
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY.trim());
    const { error } = await supabase.from('waitlist_subscribers').insert({
      name: nameVal,
      email: emailVal,
      source: resolveWaitlistSource(),
    });
    if (!error) {
      form.classList.add('hidden');
      if (typeof window.posthog !== 'undefined') {
        var params = new URLSearchParams(window.location.search);
        window.posthog.capture('waitlist_signup_completed', {
          source: resolveWaitlistSource(),
          utm_source: params.get('utm_source') || null,
          utm_medium: params.get('utm_medium') || null,
          utm_campaign: params.get('utm_campaign') || null,
        });
      }
      var okEl = document.getElementById('wl-success-msg');
      if (!okEl) {
        okEl = document.createElement('p');
        okEl.id = 'wl-success-msg';
        okEl.className = 'wl-msg ok show';
        okEl.setAttribute('role', 'status');
        okEl.dataset.i18nKey = '1';
        document.getElementById('wl-card').appendChild(okEl);
      }
      okEl.textContent = T[lang()].wl_success;
      return;
    }
    var code = error.code || '';
    var msg = (error.message || '') + '';
    if (code === '23505' || /duplicate|unique/i.test(msg)) {
      boxDup.textContent = T[lang()].wl_dup;
      boxDup.hidden = false;
    } else {
      boxErr.textContent = T[lang()].wl_err;
      boxErr.hidden = false;
    }
  } catch (e) {
    boxErr.textContent = T[lang()].wl_err;
    boxErr.hidden = false;
  } finally {
    btn.disabled = false;
  }
});
