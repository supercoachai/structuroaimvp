# ClickUp import: Structuro's List (Superagent)

Importeer product/tech-taken + wekelijkse anker-taken voor **Structuro Superagent**.

| Bestand | Doel |
|---|---|
| `clickup-structuro-list-field-definitions.csv` | Checklist: custom fields |
| `clickup-structuro-list-import-template.csv` | 8 voorbeeldtaken (3 weekly + 5 product) |
| `clickup-structuro-list-import.md` | Deze handleiding |

Partner-agent voor social: `structuro-social-manager-clickup.md` + `clickup-social-content-*.csv`

---

## Stap 1: List aanmaken (2 min)

1. Space **Structuro** (of bestaande product-space)
2. List naam: **Structuro's List**
3. Statussen toevoegen (Settings → List → Statuses):

| Status | Gebruik |
|---|---|
| Backlog | Idee, nog niet gestart |
| In Progress | Actief in development |
| Review | Code/design review |
| Ready | Klaar voor deploy (Superagent check) |
| Live | Staat in productie (Superagent check) |
| Blocked | Wacht op iets extern |
| Done | Afgerond |

**Belangrijk:** status **Ready** en **Live** triggeren Superagent-automation (zie `structuro-superagent-clickup.md`).

---

## Stap 2: Custom fields (10 min)

List → **Settings → Custom Fields → +**

Loop `clickup-structuro-list-field-definitions.csv` na. Aanbevolen volgorde:

1. work_type, work_area, funnel_stage, effort, target_release
2. github_pr
3. doctrine_relevant, doctrine_flag, doctrine_conflict, experiment_waiver, experiment_doctrine_name
4. touches_auth, touches_rls, touches_pii, touches_posthog, touches_stripe
5. security_severity, superagent_review_status, superagent_review_done, superagent_notes

---

## Stap 3: CSV importeren (5 min)

1. Open **Structuro's List**
2. **⋯ → Import → CSV**
3. Upload `clickup-structuro-list-import-template.csv`
4. Map kolommen naar custom fields (namen moeten exact matchen)
5. Import

### Wat je krijgt

**Wekelijkse ankers (Backlog, hergebruik elke week):**
- Weekly Product Review | 2026-W24
- Weekly Security Check | 2026-W24
- Weekly Doctrine Review | 2026-W24

**Producttaken (uit jullie huidige sprint):**
- PRD-001 Deploy TikTok LP + tracking (Ready)
- PRD-002 Auth recovery fix (Ready)
- PRD-003 Supabase redirect allow list (In Progress)
- PRD-004 PostHog token strip (Backlog)
- PRD-005 Experiment streak badge (voorbeeld doctrine-conflict)

Pas weeknummer in anker-taken aan of dupliceer wekelijks.

---

## Stap 4: Superagent koppelen (5 min)

1. AI Hub → **Structuro Superagent**
2. Knowledge: doctrines + `structuro-superagent-clickup.md` + security audit docs
3. Instructions: hybride doctrine-blok uit superagent doc
4. Automations op **Structuro's List**:
   - **Task Created** → doctrine + knelpunten review-comment
   - **Status → Ready** → security/data/doctrine check
   - **Status → Live** → zelfde check + OK/waarschuwing

Scheduled (wekelijks):
- Maandag 08:00 → comments op de 3 Weekly-* anker-taken

---

## Superagent review workflow

| Moment | Vul in | Agent doet |
|---|---|---|
| Nieuwe taak | work_type, work_area, touches_* | Task Created comment |
| Vóór deploy | Status → Ready | Review → superagent_review_status |
| Na deploy | Status → Live | Bevestiging + eventuele follow-ups |

**superagent_review_status waarden:** pending | ok | warning | veto

- **veto:** alleen bij security/AVG/auth/data (hard stop)
- **warning:** product-doctrine conflict, experiment nodig
- **ok:** geen blockers

---

## Experiment-taken (hybride doctrine)

Als een taak tegen product-doctrine ingaat:

1. Zet `doctrine_conflict = true`
2. Zet `experiment_waiver = true` alleen als jij expliciet experiment wilt
3. Vul `experiment_doctrine_name` (bijv. Anti-Neurotypisch Veto)
4. Maak subtask: **Experiment – wijkt af van [doctrine X]**

Zonder waiver: Superagent adviseert alternatief, geen stilzwijgende doorvoer.

---

## Checkbox-waarden in CSV

Gebruik `true` / `false` (lowercase).

---

## Troubleshooting

| Probleem | Oplossing |
|---|---|
| Status Ready/Live ontbreekt | Maak statussen aan vóór import |
| Automation triggert niet | Automation moet op list Structuro's List staan, niet Social Content |
| touches_* niet ingevuld | Agent kan niet goed security-scannen; vul handmatig bij nieuwe taken |

---

**Master checklist:** `clickup-setup-checklist.md`
