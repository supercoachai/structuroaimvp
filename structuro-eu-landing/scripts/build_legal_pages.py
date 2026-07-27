#!/usr/bin/env python3
"""Genereer statische privacy-, terms- en cookiepagina's uit src/lib/i18n/legalBodiesNlV11.ts (NL)."""

from __future__ import annotations

import html
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LEGAL_BODIES_TS = ROOT / "src" / "lib" / "i18n" / "legalBodiesNlV11.ts"
OUT = Path(__file__).resolve().parents[1]


def read_nl_bodies() -> tuple[str, str]:
    text = LEGAL_BODIES_TS.read_text(encoding="utf-8")
    pm = re.search(
        r"export const privacyBodyNlV11 = `([\s\S]*?)`;",
        text,
    )
    tm = re.search(
        r"export const termsBodyNlV11 = `([\s\S]*?)`;",
        text,
    )
    if not pm or not tm:
        raise RuntimeError(
            "Kon privacyBodyNlV11 of termsBodyNlV11 niet uit legalBodiesNlV11.ts halen."
        )
    return pm.group(1), tm.group(1)


def inline_format(text: str) -> str:
    """Escape HTML, zet **bold** om naar <strong>."""
    safe = html.escape(text)
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


def extract_cookie_section(privacy_body: str) -> str:
    start = privacy_body.find("6. Cookies en lokale opslag")
    end = privacy_body.find("7. Bewaartermijnen")
    if start == -1 or end == -1 or end <= start:
        raise RuntimeError("Kon cookies-sectie niet vinden.")
    block = privacy_body[start:end].strip()
    return block


def wrap_page(
    title: str,
    updated: str,
    inner_html: str,
    active: str,
    h1: str | None = None,
) -> str:
    h1_text = html.escape(h1 or title)
    nav_items = []
    for href, label, key in (
        ("/privacy/", "Privacybeleid", "privacy"),
        ("/terms/", "Algemene voorwaarden", "terms"),
        ("/cookies/", "Cookies", "cookies"),
    ):
        if key == active:
            nav_items.append(
                f'<span class="is-active" aria-current="page">{html.escape(label)}</span>'
            )
        else:
            nav_items.append(f'<a href="{href}">{html.escape(label)}</a>')
    nav_join = "\n      ".join(nav_items)

    return f"""<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>{html.escape(title)} · Structuro</title>
<link rel="canonical" href="https://www.structuro.eu/{active}/"/>
<link rel="icon" href="/uploads/logo-structuro-favicon.png?v=20260722d" type="image/png" sizes="64x64"/>
<link rel="icon" href="/uploads/logo-structuro-favicon-32.png?v=20260722d" type="image/png" sizes="32x32"/>
<link rel="apple-touch-icon" href="/uploads/logo-structuro-apple.png?v=20260722d"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/>
<link rel="stylesheet" href="/v2/v2-tokens.css"/>
<link rel="stylesheet" href="/css/legal.css?v=20260722a"/>
<script>
  window.va = window.va || function () {{ (window.vaq = window.vaq || []).push(arguments); }};
</script>
<script defer src="/_vercel/insights/script.js"></script>
</head>
<body>
<header class="site-header">
  <div class="wrap nav">
    <a class="brand" href="/">
      <span class="brand-mark"><img src="/uploads/logo-structuro-mark.png?v=20260722e" alt="" width="30" height="30"/></span>
      Structuro
    </a>
    <nav class="legal-nav" aria-label="Juridisch">
      {nav_join}
    </nav>
  </div>
</header>

<main class="legal-main">
  <p class="legal-eyebrow"><i></i><span>Juridisch</span></p>
  <h1 class="serif">{h1_text}</h1>
  <p class="legal-meta">{html.escape(updated)}</p>
  <p class="legal-scope"><strong>Toepassingsgebied.</strong> Deze teksten gelden voor de Structuro-dienst en deze website (structuro.eu), in lijn met het beleid voor de webapp.</p>
  <article class="legal-prose">
{inner_html}
  </article>
  <a class="legal-back" href="/">← Terug naar de landingspagina</a>
  <a class="verified-dr-badge" href="https://verifieddr.com/website/structuro-eu" target="_blank" rel="noopener"><img src="https://verifieddr.com/badge/structuro-eu.svg?style=minimal&amp;metric=truedr" alt="Verified DR - Verified Domain Rating for structuro.eu" width="200" height="24" loading="lazy" decoding="async" /></a>
</main>

<footer class="site-foot">
  <div class="wrap">
    <div class="foot-top">
      <a class="brand" href="/">
        <span class="brand-mark"><img src="/uploads/logo-structuro-mark.png?v=20260722e" alt="" width="28" height="28"/></span>
        Structuro
      </a>
      <nav class="foot-links">
        <a href="/privacy/">Privacybeleid</a>
        <a href="/terms/">Algemene voorwaarden</a>
        <a href="/cookies/">Cookies</a>
        <a href="mailto:info@structuro.eu">info@structuro.eu</a>
      </nav>
    </div>
    <div class="foot-bottom">
      <span>© 2026 Structuro · Gemaakt in Nederland</span>
      <nav>
        <a href="/privacy/">Privacy</a>
        <a href="/terms/">Voorwaarden</a>
        <a href="/cookies/">Cookies</a>
        <span>KvK: 97938289</span>
      </nav>
    </div>
  </div>
</footer>
</body>
</html>
"""


def main() -> None:
    if not LEGAL_BODIES_TS.is_file():
        print(f"Niet gevonden: {LEGAL_BODIES_TS}", file=sys.stderr)
        sys.exit(1)
    privacy_raw, terms_raw = read_nl_bodies()
    privacy_html = ts_to_html_paragraphs(privacy_raw)
    terms_html = ts_to_html_paragraphs(terms_raw)

    cookie_block = extract_cookie_section(privacy_raw)
    cookie_html = ts_to_html_paragraphs(cookie_block)

    (OUT / "privacy").mkdir(exist_ok=True)
    (OUT / "terms").mkdir(exist_ok=True)
    (OUT / "cookies").mkdir(exist_ok=True)

    (OUT / "privacy" / "index.html").write_text(
        wrap_page(
            "Privacybeleid",
            "Versie 1.1, geldig vanaf 26 mei 2026.",
            privacy_html,
            "privacy",
        ),
        encoding="utf-8",
    )
    (OUT / "terms" / "index.html").write_text(
        wrap_page(
            "Algemene voorwaarden",
            "Versie 1.1, geldig vanaf 26 mei 2026.",
            terms_html,
            "terms",
        ),
        encoding="utf-8",
    )
    (OUT / "cookies" / "index.html").write_text(
        wrap_page(
            "Cookie-informatie",
            "Zie hoofdstuk 6 van het privacybeleid. Versie 1.1, geldig vanaf 26 mei 2026.",
            '<p>Onderstaande tekst komt uit het privacybeleid, sectie over cookies en lokale opslag. Het volledige beleid staat op <a href="/privacy/">structuro.eu/privacy</a>.</p>\n'
            + cookie_html,
            "cookies",
        ),
        encoding="utf-8",
    )
    print("Geschreven: privacy/index.html, terms/index.html, cookies/index.html")


if __name__ == "__main__":
    main()
