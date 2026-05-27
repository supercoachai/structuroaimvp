const T = {
  nl: {
    wl_h1: 'Wachtlijst',
    wl_lede: 'Laat je gegevens achter. Als Structuro voor jou live gaat, hoor je van ons. Geen nieuwsbrieven, geen gedoe.',
    wl_name: 'Naam',
    wl_email: 'E-mailadres',
    wl_ph_name: 'Jouw naam',
    wl_ph_email: 'jouw@email.nl',
    wl_submit: 'Pak je plek voor 31 mei',
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
    wl_submit: 'Claim your spot for May 31',
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

function waitlistJoinUrl() {
  var override =
    typeof window.__STRUCTURO_WAITLIST_JOIN_URL__ === 'string'
      ? window.__STRUCTURO_WAITLIST_JOIN_URL__.trim()
      : '';
  if (override) return override;
  return 'https://www.structuro.ai/api/waitlist/join';
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

const form = document.getElementById('wl-form');
const btn = document.getElementById('wl-submit');
const boxDup = document.getElementById('wl-dup');
const boxErr = document.getElementById('wl-err');

form.addEventListener('submit', async function (e) {
  e.preventDefault();
  boxDup.hidden = true;
  boxErr.hidden = true;
  btn.disabled = true;

  var wlSource = resolveWaitlistSource();
  if (typeof window.posthog !== 'undefined') {
    window.posthog.capture('waitlist_signup_started', {
      source: wlSource,
      site: 'eu',
    });
  }

  var nameVal = document.getElementById('wl-name').value.trim();
  var emailVal = document.getElementById('wl-email').value.trim().toLowerCase();

  try {
    var res = await fetch(waitlistJoinUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: nameVal,
        email: emailVal,
        source: wlSource,
        site: 'eu',
      }),
    });

    var data = null;
    try {
      data = await res.json();
    } catch (parseErr) {
      data = null;
    }

    if (res.ok && data && data.ok === true) {
      form.classList.add('hidden');
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

    if (res.status === 409 || (data && data.error === 'already_exists')) {
      boxDup.textContent = T[lang()].wl_dup;
      boxDup.hidden = false;
      return;
    }

    boxErr.textContent = T[lang()].wl_err;
    boxErr.hidden = false;
  } catch (err) {
    boxErr.textContent = T[lang()].wl_err;
    boxErr.hidden = false;
  } finally {
    btn.disabled = false;
  }
});
