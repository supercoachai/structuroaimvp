#!/usr/bin/env python3
"""Genereer statische privacy-, terms- en cookiepagina's uit src/lib/i18n/legalLocale.ts (NL)."""

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


def ts_to_html_paragraphs(body: str) -> str:
    parts = [p.strip() for p in body.split("\n\n") if p.strip()]
    chunks: list[str] = []
    for p in parts:
        if re.match(r"^\d+\.\s+", p) and len(p) < 140 and "\n" not in p:
            chunks.append(f"<h2>{html.escape(p)}</h2>")
        elif "\n" in p:
            safe = "<br/>".join(html.escape(line) for line in p.split("\n"))
            chunks.append(f"<p>{safe}</p>")
        else:
            chunks.append(f"<p>{html.escape(p)}</p>")
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
    nav_other = []
    for href, label, key in (
        ("/privacy/", "Privacybeleid", "privacy"),
        ("/terms/", "Algemene voorwaarden", "terms"),
        ("/cookies/", "Cookies", "cookies"),
    ):
        if key == active:
            nav_other.append(f'<strong>{html.escape(label)}</strong>')
        else:
            nav_other.append(f'<a href="{href}">{html.escape(label)}</a>')
    nav_join = " · ".join(nav_other)

    return f"""<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>{html.escape(title)} · Structuro</title>
<link rel="icon" href="/uploads/logo-structuro.png" type="image/png"/>
<link rel="apple-touch-icon" href="/uploads/logo-structuro.png"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>
<script>
  window.va = window.va || function () {{ (window.vaq = window.vaq || []).push(arguments); }};
</script>
<script defer src="/_vercel/insights/script.js"></script>
<style>
:root {{
  --text: #0F172A; --sub: #64748B; --border: #E2E8F0; --blue: #2563EB; --bg: #F8FAFC;
}}
* {{ box-sizing: border-box; }}
body {{ margin: 0; font-family: 'DM Sans', system-ui, sans-serif; color: var(--text); background: var(--bg); line-height: 1.6; font-size: 16px; }}
.legal-header {{
  background: #fff; border-bottom: 1px solid var(--border);
}}
.legal-header-inner {{
  max-width: 720px; margin: 0 auto; padding: 16px 20px;
  display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;
}}
.legal-header a.logo {{ display: flex; align-items: center; gap: 10px; text-decoration: none; color: var(--text); font-weight: 700; }}
.legal-header a.logo img {{ height: 36px; width: auto; }}
.legal-nav-links {{ font-size: 14px; color: var(--sub); }}
.legal-nav-links a {{ color: var(--blue); text-decoration: none; }}
.legal-nav-links a:hover {{ text-decoration: underline; }}
main {{ max-width: 720px; margin: 0 auto; padding: 32px 20px 64px; }}
.legal-scope {{
  background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 12px;
  padding: 14px 16px; font-size: 14px; color: var(--text); margin-bottom: 28px;
}}
.meta {{ color: var(--sub); font-size: 14px; margin-bottom: 28px; }}
.legal-prose h2 {{ font-size: 1.05rem; font-weight: 700; margin: 2rem 0 0.75rem; }}
.legal-prose h2:first-child {{ margin-top: 0; }}
.legal-prose p {{ margin: 0 0 1rem; }}
footer.legal-foot {{
  margin-top: 48px; padding-top: 24px; border-top: 1px solid var(--border);
  font-size: 14px; color: var(--sub);
}}
footer.legal-foot a {{ color: var(--blue); text-decoration: none; }}
</style>
</head>
<body>
<header class="legal-header">
  <div class="legal-header-inner">
    <a href="/" class="logo">
      <img src="/uploads/logo-structuro.png" alt="Structuro"/>
      <span>Structuro</span>
    </a>
    <div class="legal-nav-links">
      {nav_join}
    </div>
  </div>
</header>
<main>
  <h1 style="font-size:1.75rem;font-weight:700;margin:0 0 8px;line-height:1.25">{h1_text}</h1>
  <p class="meta">{html.escape(updated)}</p>
  <p class="legal-scope"><strong>Toepassingsgebied.</strong> Deze teksten gelden voor de Structuro-dienst en deze website (structuro.eu), in lijn met het beleid voor de webapp.</p>
  <article class="legal-prose">
{inner_html}
  </article>
  <footer class="legal-foot">
    <a href="/">← Terug naar de landingspagina</a>
  </footer>
</main>
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
            "<p>Onderstaande tekst komt uit het privacybeleid, sectie over cookies en lokale opslag. Het volledige beleid staat op <a href=\"/privacy/\">structuro.eu/privacy</a>.</p>\n"
            + cookie_html,
            "cookies",
        ),
        encoding="utf-8",
    )
    print("Geschreven: privacy/index.html, terms/index.html, cookies/index.html")


if __name__ == "__main__":
    main()
