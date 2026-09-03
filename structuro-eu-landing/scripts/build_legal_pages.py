#!/usr/bin/env python3
"""Genereer statische privacy-, terms- en cookiepagina's (NL + EN) uit legalBodiesNlV11.ts."""

from __future__ import annotations

import html
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LEGAL_BODIES_TS = ROOT / "src" / "lib" / "i18n" / "legalBodiesNlV11.ts"
OUT = Path(__file__).resolve().parents[1]

PRIVACY_UPDATED_NL = "Versie 1.4, geldig vanaf 3 september 2026."
PRIVACY_UPDATED_EN = "Version 1.4, effective from 3 September 2026."
TERMS_UPDATED_NL = "Versie 1.1, geldig vanaf 26 mei 2026."
TERMS_UPDATED_EN = "Version 1.1, effective from 26 May 2026."


def read_export(name: str) -> str:
    text = LEGAL_BODIES_TS.read_text(encoding="utf-8")
    m = re.search(rf"export const {name} = `([\s\S]*?)`;", text)
    if not m:
        raise RuntimeError(f"Kon {name} niet uit legalBodiesNlV11.ts halen.")
    return m.group(1)


def inline_format(text: str) -> str:
    """Escape HTML, zet @Label@ / **bold** om naar <strong>."""
    safe = html.escape(text)
    safe = re.sub(
        r"@([^@]+)@\s*",
        lambda m: f"<strong>{m.group(1)}:</strong> ",
        safe,
    )
    return re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", safe)


def ts_to_html_paragraphs(body: str) -> str:
    parts = [p.strip() for p in body.split("\n\n") if p.strip()]
    chunks: list[str] = []
    for p in parts:
        if re.match(r"^\d+\.\s+", p) and len(p) < 140 and "\n" not in p:
            chunks.append(f"<h2>{html.escape(p)}</h2>")
        elif "\n" in p:
            safe = "<br/>".join(inline_format(line) for line in p.split("\n"))
            chunks.append(f"<p>{safe}</p>")
        else:
            chunks.append(f"<p>{inline_format(p)}</p>")
    return "\n".join(chunks)


def extract_cookie_section(privacy_body: str, lang: str) -> str:
    if lang == "en":
        start = privacy_body.find("7. Cookies and local storage")
        end = privacy_body.find("8. Retention periods")
    else:
        start = privacy_body.find("7. Cookies en lokale opslag")
        end = privacy_body.find("8. Bewaartermijnen")
    if start == -1 or end == -1 or end <= start:
        raise RuntimeError(f"Kon cookies-sectie niet vinden ({lang}).")
    return privacy_body[start:end].strip()


def wrap_page(
    *,
    lang: str,
    title: str,
    updated: str,
    inner_html: str,
    active: str,
    h1: str | None = None,
    scope_html: str,
    back_label: str,
    nav_aria: str,
) -> str:
    h1_text = html.escape(h1 or title)
    prefix = "/en" if lang == "en" else ""
    nav_items = []
    labels = (
        ("privacy", "Privacy policy" if lang == "en" else "Privacybeleid"),
        ("terms", "Terms of use" if lang == "en" else "Algemene voorwaarden"),
        ("cookies", "Cookies" if lang == "en" else "Cookies"),
    )
    for key, label in labels:
        href = f"{prefix}/{key}/"
        if key == active:
            nav_items.append(
                f'<span class="is-active" aria-current="page">{html.escape(label)}</span>'
            )
        else:
            nav_items.append(f'<a href="{href}">{html.escape(label)}</a>')
    nav_join = "\n      ".join(nav_items)

    nl_href = f"/{active}/"
    en_href = f"/en/{active}/"
    nl_active = ' aria-current="page" class="is-active"' if lang == "nl" else ""
    en_active = ' aria-current="page" class="is-active"' if lang == "en" else ""
    lang_switch = (
        '<nav class="legal-lang" aria-label="Language">'
        f'<a href="{nl_href}"{nl_active}>NL</a>'
        f'<a href="{en_href}"{en_active}>EN</a>'
        "</nav>"
    )

    canonical = (
        f"https://www.structuro.eu/en/{active}/"
        if lang == "en"
        else f"https://www.structuro.eu/{active}/"
    )
    # EU-landing homepage is NL-first; EN legal pages still return to /.
    home = "/"
    foot_privacy = f"{prefix}/privacy/"
    foot_terms = f"{prefix}/terms/"
    foot_cookies = f"{prefix}/cookies/"
    made_in = "Made in the Netherlands" if lang == "en" else "Gemaakt in Nederland"
    eyebrow = "Legal" if lang == "en" else "Juridisch"

    return f"""<!DOCTYPE html>
<html lang="{lang}">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>{html.escape(title)} · Structuro</title>
<link rel="canonical" href="{canonical}"/>
<link rel="alternate" hreflang="nl" href="https://www.structuro.eu/{active}/"/>
<link rel="alternate" hreflang="en" href="https://www.structuro.eu/en/{active}/"/>
<link rel="icon" href="/favicon.ico" sizes="any"/>
<link rel="icon" href="/uploads/logo-structuro-favicon-48.png?v=20260730a" type="image/png" sizes="48x48"/>
<link rel="icon" href="/uploads/logo-structuro-favicon-96.png?v=20260730a" type="image/png" sizes="96x96"/>
<link rel="apple-touch-icon" href="/uploads/logo-structuro-apple.png?v=20260730a"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/>
<link rel="stylesheet" href="/v2/v2-tokens.css"/>
<link rel="stylesheet" href="/css/legal.css?v=20260722a"/>
<script>
  window.va = window.va || function () {{ (window.vaq = window.vaq || []).push(arguments); }};
</script>
<script defer src="/_vercel/insights/script.js"></script>
<script defer src="/js/ph-config.js?v=20260724a"></script>
<script defer src="/js/analytics.js?v=20260903b"></script>
</head>
<body>
<header class="site-header">
  <div class="wrap nav">
    <a class="brand" href="{home}">
      <span class="brand-mark"><img src="/uploads/logo-structuro-mark.png?v=20260722e" alt="" width="30" height="30"/></span>
      Structuro
    </a>
    <div class="legal-header-actions">
      {lang_switch}
      <nav class="legal-nav" aria-label="{html.escape(nav_aria)}">
      {nav_join}
      </nav>
    </div>
  </div>
</header>

<main class="legal-main">
  <p class="legal-eyebrow"><i></i><span>{html.escape(eyebrow)}</span></p>
  <h1 class="serif">{h1_text}</h1>
  <p class="legal-meta">{html.escape(updated)}</p>
  <p class="legal-scope">{scope_html}</p>
  <article class="legal-prose">
{inner_html}
  </article>
  <a class="legal-back" href="{home}">{html.escape(back_label)}</a>
  <a class="verified-dr-badge" href="https://verifieddr.com/website/structuro-eu" target="_blank" rel="noopener"><img src="https://verifieddr.com/badge/structuro-eu.svg?style=minimal&amp;metric=truedr" alt="Verified DR - Verified Domain Rating for structuro.eu" width="200" height="24" loading="lazy" decoding="async" /></a>
</main>

<footer class="site-foot">
  <div class="wrap">
    <div class="foot-top">
      <a class="brand" href="{home}">
        <span class="brand-mark"><img src="/uploads/logo-structuro-mark.png?v=20260722e" alt="" width="28" height="28"/></span>
        Structuro
      </a>
      <nav class="foot-links">
        <a href="{foot_privacy}">{"Privacy policy" if lang == "en" else "Privacybeleid"}</a>
        <a href="{foot_terms}">{"Terms of use" if lang == "en" else "Algemene voorwaarden"}</a>
        <a href="{foot_cookies}">Cookies</a>
        <a href="mailto:info@structuro.eu">info@structuro.eu</a>
      </nav>
    </div>
    <div class="foot-bottom">
      <span>© 2026 Structuro · {html.escape(made_in)}</span>
      <nav>
        <a href="{foot_privacy}">Privacy</a>
        <a href="{foot_terms}">{"Terms" if lang == "en" else "Voorwaarden"}</a>
        <a href="{foot_cookies}">Cookies</a>
        <span>KvK: 97938289</span>
      </nav>
    </div>
  </div>
</footer>
</body>
</html>
"""


def write_lang_pages(lang: str, privacy_raw: str, terms_raw: str) -> None:
    privacy_html = ts_to_html_paragraphs(privacy_raw)
    terms_html = ts_to_html_paragraphs(terms_raw)
    cookie_block = extract_cookie_section(privacy_raw, lang)
    cookie_html = ts_to_html_paragraphs(cookie_block)

    if lang == "en":
        base = OUT / "en"
        privacy_intro = (
            '<p>The text below is from the privacy policy section on cookies and local storage. '
            'The full policy is at <a href="/en/privacy/">structuro.eu/en/privacy</a>.</p>\n'
        )
        scope = (
            "<strong>Scope.</strong> These texts apply to the Structuro service and this website "
            "(structuro.eu), in line with the policy for the web app."
        )
        meta = {
            "privacy": ("Privacy policy", PRIVACY_UPDATED_EN),
            "terms": ("Terms of use", TERMS_UPDATED_EN),
            "cookies": (
                "Cookie information",
                f"See chapter 7 of the privacy policy. {PRIVACY_UPDATED_EN}",
            ),
        }
        back = "← Back to the landing page"
        nav_aria = "Legal"
    else:
        base = OUT
        privacy_intro = (
            '<p>Onderstaande tekst komt uit het privacybeleid, sectie over cookies en lokale opslag. '
            'Het volledige beleid staat op <a href="/privacy/">structuro.eu/privacy</a>.</p>\n'
        )
        scope = (
            "<strong>Toepassingsgebied.</strong> Deze teksten gelden voor de Structuro-dienst en deze "
            "website (structuro.eu), in lijn met het beleid voor de webapp."
        )
        meta = {
            "privacy": ("Privacybeleid", PRIVACY_UPDATED_NL),
            "terms": ("Algemene voorwaarden", TERMS_UPDATED_NL),
            "cookies": (
                "Cookie-informatie",
                f"Zie hoofdstuk 7 van het privacybeleid. {PRIVACY_UPDATED_NL}",
            ),
        }
        back = "← Terug naar de landingspagina"
        nav_aria = "Juridisch"

    for folder in ("privacy", "terms", "cookies"):
        (base / folder).mkdir(parents=True, exist_ok=True)

    (base / "privacy" / "index.html").write_text(
        wrap_page(
            lang=lang,
            title=meta["privacy"][0],
            updated=meta["privacy"][1],
            inner_html=privacy_html,
            active="privacy",
            scope_html=scope,
            back_label=back,
            nav_aria=nav_aria,
        ),
        encoding="utf-8",
    )
    (base / "terms" / "index.html").write_text(
        wrap_page(
            lang=lang,
            title=meta["terms"][0],
            updated=meta["terms"][1],
            inner_html=terms_html,
            active="terms",
            scope_html=scope,
            back_label=back,
            nav_aria=nav_aria,
        ),
        encoding="utf-8",
    )
    (base / "cookies" / "index.html").write_text(
        wrap_page(
            lang=lang,
            title=meta["cookies"][0],
            updated=meta["cookies"][1],
            inner_html=privacy_intro + cookie_html,
            active="cookies",
            scope_html=scope,
            back_label=back,
            nav_aria=nav_aria,
        ),
        encoding="utf-8",
    )


def main() -> None:
    if not LEGAL_BODIES_TS.is_file():
        print(f"Niet gevonden: {LEGAL_BODIES_TS}", file=sys.stderr)
        sys.exit(1)

    privacy_nl = read_export("privacyBodyNlV11")
    terms_nl = read_export("termsBodyNlV11")
    privacy_en = read_export("privacyBodyEnV11")
    terms_en = read_export("termsBodyEnV11")

    write_lang_pages("nl", privacy_nl, terms_nl)
    write_lang_pages("en", privacy_en, terms_en)
    print(
        "Geschreven: privacy/, terms/, cookies/ en en/privacy/, en/terms/, en/cookies/"
    )


if __name__ == "__main__":
    main()
