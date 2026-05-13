# Sessiestatus (Claude Project)

**Laatste update:** 2026-05-13

---

## Waar sta ik nu

MVP live op www.structuro.ai. Lancering op **31 mei 2026** (was eerder 26 mei — overal bijgewerkt).

Post 1 live op LinkedIn (12 mei, 19:00 — te laat, volgende keer 08:30).
Post 2 klaar voor 14 mei (Amnestische Backlog / 36 taken).
3 wachtlijst-aanmeldingen via LinkedIn Post 1.
83 aanmelders totaal (64 Founding Members, 16 Early Access, 3 LinkedIn).

---

## Laatste beslissingen

### Positionering — scherpste formulering ooit (13 mei, Frank Jansen)

Frank Jansen (buitenstaander, intelligent meedenkend) splitste het probleem in twee categorieën:

**1. Registratiesysteem** — alles bijhouden, overzicht op het totale plaatje (MS To Do, Todoist, Notion)

**2. Executie-interface** — dingen daadwerkelijk gedaan krijgen op het moment dat het moet

**Structuro zit bewust op 2. Altijd geweest. Nu expliciet geformuleerd.**

Nieuwe kernclaim voor landingspagina, pitch en marketing:

> *"Gebruik MS To Do om alles bij te houden. Gebruik Structuro om het ook daadwerkelijk te doen."*

> *"Structuro is geen registratiesysteem. Het is een executie-interface."*

> *"Waar MS To Do stopt, begint Structuro."*

### Twee-werelden-app — AFGEWEZEN (Anti-Neurotypisch Veto)

Frank stelde voor: één app met een drukke totaaloverzicht-wereld + een rustige focus-wereld.

Beslissing: niet bouwen. Redenen:

- Versterkt de conditionering die Structuro wil doorbreken
- Drukke kant wordt de default, focus-modus wordt het hoekje
- Scope creep: registratiesysteem bouwen = maanden werk buiten de doctrine
- Structuro blijft executie-interface, niet alles-in-één

### MS To Do API integratie — roadmap post-lancering prioriteit 1

Technisch haalbaar (Microsoft Graph API, OAuth 2.0, Tasks.Read scope).

Niet bouwen voor 31 mei. Wel gebruiken als verhaal in marketing.

Cursor-prompt staat klaar voor wanneer het gebouwd wordt.

### Lanceringsdatum: 31 mei (bijgewerkt overal)

Alle footers en Notion-pagina's bijgewerkt van 26 mei naar 31 mei.

### Footer — standaard vastgesteld

```
🧠 Structuro — Voor breinen die vastlopen op executie, niet op inzicht.
Geen plannings-app, maar een externe frontale kwab.
Eén dag, één loop, één ritueel.
🚀 Live op 31 mei → www.structuro.eu

#ADHD #neurodivergent #structuro
```

Vijf varianten opgeslagen in Notion (Campagne & Content pagina).

Link in de post zelf dempt bereik op LinkedIn → URL altijd in eerste reactie plaatsen na posten.

### Roman Swanenberg — doctrine verdedigd (12 mei)

Roman stuurde screenshot van MS To Do met 22 taken. Wilde meer zichtbaarheid.

Beslissing:

- Roman is rand-case: hoog-functionerend, niet representatief voor primaire doelgroep
- Anti-Neurotypisch Veto toegepast: Structuro gaat niet richting MS To Do
- Echt probleem erkend: taken worden vergeten door collapsed buckets (out of sight = out of mind)
- Test-hypothese: drie buckets standaard automatisch open → nog niet geïmplementeerd
- "Out of sight, out of mind" is breed ADHD-patroon, niet Roman-specifiek → actie 5 Notion blijft open

### OG-tags website — moet worden bijgewerkt

LinkedIn pakt momenteel verkeerde description uit de website metadata.

Fix in Next.js (`app/layout.tsx` of `app/page.tsx`):

```javascript
export const metadata = {
  title: "Structuro — Voor wie weet wat hij moet doen, maar niet begint",
  description: "De ADHD-app voor breinen die vastlopen op executie, niet op inzicht.",
  openGraph: {
    title: "Structuro — Voor wie weet wat hij moet doen, maar niet begint",
    description: "De ADHD-app voor breinen die vastlopen op executie, niet op inzicht.",
    url: "https://www.structuro.eu",
    siteName: "Structuro",
  },
}
```

Na deploy testen via LinkedIn Post Inspector (linkedin.com/post-inspector/).

**Repo-notitie:** www.structuro.eu is statische `structuro-eu-landing/index.html` met `<meta property="og:…">`; de Next.js-app op structuro.ai heeft een eigen `layout`. OG voor de EU-site hoort daar waar die HTML wordt gebouwd en gedeployed.

### Carousel-template vastgesteld (12-13 mei)

Stijl voor alle 18 launch-posts:

- 7 slides, 1080×1350 (Instagram portrait)
- Poppins Bold/Regular/LightItalic
- Wit canvas, subtiele blauwe gradient onderaan
- Donker grijsblauw (#0F172A) heading
- Helderblauw (#2563EB) accent
- Grijs (#64748B) sub-tekst
- Page nummer rechts boven, logo links onder
- Pill-labels voor categorie op cover-slides
- Page dots op laatste slide, swipe-indicator op cover

Post 1 — live 12 mei: "55% start de dag op medium energie" (Dagstart / Inzicht 01)

Post 2 — klaar voor 14 mei: "36 taken die wel even moeten. Niet vandaag." (Amnestische Backlog)

Post timing: altijd 08:30 op dinsdag t/m donderdag. Nooit 19:00.

### Aanmelderslijst — centrale database aangemaakt (12 mei)

Excel: Structuro_Aanmelders_Centraal.xlsx

- 64 Founding Members (aug-okt 2025)
- 16 Early Access (aug 2025 - feb 2026)
- 3 LinkedIn Post 1 (12 mei 2026)
- 60 van 64 FM'ers: ADHD/neurodivergent = Ja
- Importeerbaar in Notion als database

### Extern frontale kwab — behouden in alle communicatie

Term wordt strategisch ingezet op LinkedIn/landingspagina (autoriteitslaag).

Niet in de app zelf — daar: batterij-metafoor en energietaal.

Onderbouwing: Barkley-validatie (ADHD als performance-defect, niet karakter-defect),

EFaaS-positionering (Executive Function as a Service), onderscheidt van alle andere apps.

---

## Open acties (nu)

### Direct (voor 14 mei)

- [ ] **OG-tags bijwerken** in Next.js — Cursor-prompt klaar, zie hierboven
- [ ] **Post 2 plaatsen** op LinkedIn, donderdag 14 mei om 08:30
- [ ] URL www.structuro.eu in eerste reactie na elke post plaatsen en pinnen
- [ ] **Antwoord Frank Jansen** sturen — zie WhatsApp gesprek 13 mei
  - Kernboodschap: Structuro zit bewust op 2 (executie), niet op 1 (registratie)
  - Twee-werelden-app niet bouwen — MS To Do integratie wél op roadmap

### Deze week (voor 15 mei)

- [ ] **Call Frank van Strijen** — vrijdag 15 mei 08:00 (Niels' verjaardag)
  - Doel: één concrete ja op één actie vóór/bij lancering
  - Voorbereiding: affiliate-voorstel A4 (20-25% lifetime commissie), unieke link
  - Niet bespreken: B2B, Frans, lange termijn
- [ ] **Antwoord Frans Visee** definitief versturen (concept klaar van 12 mei)
  - Vervolgafspraak begin juni voorstellen
  - Veto op architectuur vastleggen als principe

### Productbeslissingen open

- [ ] **Buckets standaard open** — test voor Roman aanzetten (Notion Actie 5)
- [ ] **Waarom-laag** in de app (Annika's punt) — hoe zonder Progressive Visual Silence te schenden?
- [ ] **Keuze afvinken** — op alle niveaus of niet?

### Post-lancering (na 31 mei)

- [ ] **MS To Do API integratie** — Cursor-prompt klaar, prioriteit 1 na lancering
- [ ] **Retention naar 30%** — lanceringsmijlpaal (GORT-coaching sessie)

---

## Netwerk & Partners

### Frank van Strijen (B2C-route)

- Podcaster "Aan het werk met ADHD", 20k+ volgers
- Call vrijdag 15 mei 08:00
- Doel: affiliate partnership, unieke link, één lanceringsactie

### Frans Visee (B2B-route / channel architect)

- ~70 jaar, voormalig voorzitter RvT Klimkoord (ADHD-zorgorganisatie)
- Lid auditcommissie Stichting ADHD Netwerk (300+ behandelaars)
- Host podcast "Aan het werk met ADHD", gesponsord door Medice B.V.
- Rol: channel-architect (bouwt reseller-netwerk), niet reseller zelf
- Model: Strategic Referral Partnership → LOI principes → 6 maanden verkenning → formeel contract
- Vervolgafspraak begin juni

### Jasper Buitenhuis

- ~50k volgers, bereid te supporten
- Podcast 22 juni gepland

---

## Cijfers (13 mei 2026)

| Metric | Waarde |
|--------|--------|
| Geregistreerde gebruikers | ~48 |
| Dagelijks actief | 8-13 |
| Day-1 retentie | ~62% |
| Shutdown-completion | 1 van 8-13 starters |
| Founding Members aangemeld | 64 |
| Early Access aangemeld | 16 |
| LinkedIn aanmeldingen | 3 (Post 1) |
| LinkedIn volgers | 191 |
| LinkedIn Post 1 impressies | 14 (na 3 uur) |
| Retentie-doel lancering | 30% |

---

## Notion-pagina's (actief)

| Pagina | URL |
|--------|-----|
| Business HQ | https://www.notion.so/356958266cb780a29ebfeaecace269a5 |
| Campagne & Content | https://www.notion.so/994daf8f96ab425386f3264800379e56 |
| Launch Posts DB | https://www.notion.so/70a38b45ae234adab22cb43a19c832f9 |
| Post 1 (live) | https://www.notion.so/3069c3050f32448d879a3bfb297142a2 |
| Post 2 (klaar) | https://www.notion.so/8bddf7971a3749afaab4ddcb9bc79b04 |
| Post Externe Frontale Kwab | https://www.notion.so/35e958266cb781f5875ccaa2fccb88a1 |
| Acties deze week | https://www.notion.so/35e958266cb781c6b55acc34ddaad4fa |
| Frans Visee profiel | https://www.notion.so/35b958266cb78114a298cb1746e9acf9 |
| Netwerk & Partners | https://www.notion.so/9c0e8bc2d20641fc98ba5a504377d814 |

---

## Tech stack

- Next.js 15, Supabase (eu-west-1, project: oapnsywlmdmqgmfwiojy)
- Vercel (prj_BudZKOtKDzoTI3FTCecTSCX9iEor, team: team_zpPD6T1wCcIQooZpPQVRWSp3)
- Tailwind CSS, Poppins font
- Project root: /Users/nielsvandenhurk/structuroai-mvp
- Website: www.structuro.eu (DNS via Namecheap, PremiumDNS)
- Instagram: @structuro.ai

---

## Doctrines (niet-onderhandelbaar)

1. **Amnestische Backlog** — geen takenlijst die groeit. Elke dag begint leeg.
2. **Progressive Visual Silence** — minder UI = minder cognitieve belasting.
3. **Anti-Neurotypisch Veto** — kalenders, planboards, weekoverzichten worden geweerd tenzij interview-data of neurobiologie het rechtvaardigt.
4. **Empirische Firewall** — elk feature-voorstel herleidbaar naar interview-uitspraak of bewezen neurobiologisch mechanisme.
5. **Geen gezondheidsdata in database** — Zwaar moment is binaire killswitch, slaat niets medisch op (AVG/MDR).
6. **Structuro = executie-interface, niet registratiesysteem** — nieuw geformuleerd 13 mei op basis van Frank Jansen analyse.
