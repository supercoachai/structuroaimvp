#!/usr/bin/env node
/**
 * Controleer (en optioneel corrigeer) Supabase passkey / WebAuthn-config.
 *
 * Vereist SUPABASE_ACCESS_TOKEN (Dashboard → Account → Access Tokens).
 * Optioneel: SUPABASE_PROJECT_REF (default: oapnsywlmdmqgmfwiojy)
 *
 *   node scripts/verify-supabase-passkey-config.mjs
 *   node scripts/verify-supabase-passkey-config.mjs --fix
 */

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF ?? 'oapnsywlmdmqgmfwiojy'
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN?.trim()
const FIX = process.argv.includes('--fix')

const EXPECTED = {
  passkey_enabled: true,
  webauthn_rp_id: 'www.structuro.ai',
  webauthn_rp_display_name: 'Structuro',
  /** Alleen origins waarvan de hostname gelijk is aan RP ID of een subdomain daarvan. */
  webauthn_rp_origins: ['https://www.structuro.ai'],
}

function parseOrigins(raw) {
  if (Array.isArray(raw)) return raw.map(String)
  if (typeof raw !== 'string' || !raw.trim()) return []
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function originsMatch(actualRaw, expectedList) {
  const actual = new Set(parseOrigins(actualRaw))
  return expectedList.every((origin) => actual.has(origin))
}

async function fetchAuthConfig() {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`,
    {
      headers: { Authorization: `Bearer ${TOKEN}` },
    }
  )
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`GET config/auth failed (${res.status}): ${body.slice(0, 300)}`)
  }
  return res.json()
}

async function patchAuthConfig(payload) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  )
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`PATCH config/auth failed (${res.status}): ${body.slice(0, 300)}`)
  }
  return res.json()
}

function report(label, ok, detail) {
  console.log(`${ok ? '✓' : '✗'} ${label}${detail ? `: ${detail}` : ''}`)
}

async function main() {
  if (!TOKEN) {
    console.error(
      'SUPABASE_ACCESS_TOKEN ontbreekt. Maak een token aan op https://supabase.com/dashboard/account/tokens'
    )
    console.error('Verwachte waarden:')
    console.error(JSON.stringify(EXPECTED, null, 2))
    process.exit(1)
  }

  const config = await fetchAuthConfig()
  const current = {
    passkey_enabled: config.passkey_enabled,
    webauthn_rp_id: config.webauthn_rp_id,
    webauthn_rp_display_name: config.webauthn_rp_display_name,
    webauthn_rp_origins: parseOrigins(config.webauthn_rp_origins),
  }

  console.log(`Project: ${PROJECT_REF}`)
  console.log('Huidige passkey-config:')
  console.log(JSON.stringify(current, null, 2))
  console.log('')

  const rpIdOk = current.webauthn_rp_id === EXPECTED.webauthn_rp_id
  const displayOk =
    current.webauthn_rp_display_name === EXPECTED.webauthn_rp_display_name
  const enabledOk = current.passkey_enabled === EXPECTED.passkey_enabled
  const originsOk = originsMatch(current.webauthn_rp_origins, EXPECTED.webauthn_rp_origins)

  report('Passkeys enabled', enabledOk, String(current.passkey_enabled))
  report('RP ID', rpIdOk, current.webauthn_rp_id)
  report('Display name', displayOk, current.webauthn_rp_display_name)
  report(
    'Origins (www, compatibel met RP ID)',
    originsOk,
    current.webauthn_rp_origins.join(', ')
  )

  const allOk = rpIdOk && displayOk && enabledOk && originsOk

  if (allOk) {
    console.log('\nPasskey-config is correct.')
    return
  }

  if (!FIX) {
    console.log('\nRun met --fix om te corrigeren (alleen als RP ID nog niet verkeerd vastligt).')
    console.warn(
      'Let op: RP ID wijzigen maakt bestaande passkeys ongeldig. Controleer eerst of er al passkeys geregistreerd zijn.'
    )
    process.exit(2)
  }

  if (!rpIdOk && current.webauthn_rp_id) {
    console.error(
      `\nRP ID is "${current.webauthn_rp_id}" i.p.v. "${EXPECTED.webauthn_rp_id}".`
    )
    console.error(
      'Automatisch fixen van RP ID is uitgeschakeld: bestaande passkeys kunnen breken.'
    )
    console.error('Corrigeer handmatig in Dashboard als er nog geen passkeys zijn geregistreerd.')
    process.exit(3)
  }

  const mergedOrigins = new Set([
    ...parseOrigins(config.webauthn_rp_origins),
    ...EXPECTED.webauthn_rp_origins,
  ])

  await patchAuthConfig({
    passkey_enabled: true,
    webauthn_rp_display_name: EXPECTED.webauthn_rp_display_name,
    webauthn_rp_id: EXPECTED.webauthn_rp_id,
    webauthn_rp_origins: [...mergedOrigins].join(','),
  })

  console.log('\nConfig bijgewerkt. Herhaal zonder --fix om te verifiëren.')
}

main().catch((err) => {
  console.error(err.message ?? err)
  process.exit(1)
})
