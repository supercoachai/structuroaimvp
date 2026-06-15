# ClickUp verify checklist (5 min per list)

Gebruik dit **vóór** je Optie A (Superagent) of Optie B (Social Manager) test. Alles afgevinkt = klaar om agent te triggeren.

---

## 0. Agents (1 min)

| Check | Structuro Superagent | Structuro Social Manager |
|---|---|---|
| Agent bestaat in AI Hub | [ ] | [ ] |
| Juiste list gekoppeld | Structuro's List | Social Content |
| Knowledge docs geüpload | doctrines + superagent doc | tiktok-* + social manager doc |
| Je kunt `@Structuro Superagent` mentionen | [ ] | n.v.t. |
| Je kunt `@Structuro Social Manager` mentionen | n.v.t. | [ ] |

---

## 1. Social Content (Marketing)

### Statussen (8, exacte spelling)

- [ ] Idee
- [ ] Creative Center
- [ ] Canva
- [ ] CapCut
- [ ] Review
- [ ] Gepost
- [ ] Analyse
- [ ] Besluit

### Custom fields (22 velden)

Open list → ⚙️ → Custom Fields. Tel: **22 velden**.

| Veld | Type | Dropdown-opties (indien van toepassing) |
|---|---|---|
| content_id | Short Text | |
| utm_content | Short Text | |
| channel | Dropdown | TikTok, Instagram, Cross-post |
| post_date | Date | |
| analysis_due_date | Date | |
| landing_url | URL | |
| hook_type | Dropdown | herkenning, spanning, tegen_intuitief, cyclus, kosten |
| hook_variant | Dropdown | A, B, C, D, E |
| payoff_theme | Short Text | |
| lp_headline_match | Checkbox | |
| creative_center_done | Checkbox | |
| creative_gap_topic | Short Text | |
| creative_center_notes | Long Text | |
| avg_watch_sec | Number | |
| completion_pct | Number | |
| lp_views | Number | |
| lp_cta_clicks | Number | |
| signups | Number | |
| promote_budget_eur | Currency | |
| analysis_done | Checkbox | |
| learning_notes | Long Text | |
| caption_nl | Long Text | |

**Veelgemaakte fout:** `Cyclus` i.p.v. `cyclus`, of `CapCut / Edit` i.p.v. `CapCut`.

### Import-taken (minimaal 3)

- [ ] **SC-001 | week3_v2** bestaat
- [ ] **SC-002 | staar_40min_v1** bestaat
- [ ] **Social Weekly Overview | ...** bestaat

### SC-001 spot-check (waarden uit template)

| Veld | Verwacht |
|---|---|
| Status | Idee (of verder, als je al gewerkt hebt) |
| channel | TikTok |
| content_id | week3_v2 |
| utm_content | week3_v2 |
| hook_type | cyclus |
| hook_variant | A |
| creative_center_done | aan |
| landing_url | bevat `structuro.ai/tiktok` + `utm_content=week3_v2` |
| post_date | 2026-06-14 (of jouw datum) |
| analysis_due_date | post_date + 3 dagen |

**Rood vlag:** landing_url wijst naar `/registreren` zonder `/tiktok`.

---

## 2. Structuro's List

### Statussen (7)

- [ ] Backlog
- [ ] In Progress
- [ ] Review
- [ ] **Ready** (Superagent-trigger)
- [ ] **Live** (Superagent-trigger)
- [ ] Blocked
- [ ] Done

### Custom fields (20 velden)

Tel: **20 velden**.

| Veld | Type | Dropdown-opties |
|---|---|---|
| work_type | Dropdown | Feature, Bug, Security, Infrastructure, Experiment, Support, Analytics, Ops |
| work_area | Dropdown | Auth, Supabase, PostHog, Stripe, Landing, Core Loop, Dagstart, Shutdown, Acquisition, Mobile, Admin, Docs |
| funnel_stage | Dropdown | Acquisition, Activation, Core Loop, Retention, Revenue, N/A |
| effort | Dropdown | S, M, L |
| target_release | Date | |
| github_pr | URL | |
| doctrine_relevant | Checkbox | |
| doctrine_flag | Dropdown | none, anti_neurotypisch, progressive_silence, amnestische_backlog, empirische_firewall, executie_interface, multiple |
| doctrine_conflict | Checkbox | |
| experiment_waiver | Checkbox | |
| experiment_doctrine_name | Short Text | |
| touches_auth | Checkbox | |
| touches_rls | Checkbox | |
| touches_pii | Checkbox | |
| touches_posthog | Checkbox | |
| touches_stripe | Checkbox | |
| security_severity | Dropdown | none, low, medium, high, critical |
| superagent_review_status | Dropdown | pending, ok, warning, veto |
| superagent_review_done | Checkbox | |
| superagent_notes | Long Text | |

### Import-taken (minimaal 8)

**Weekly ankers:**
- [ ] Weekly Product Review | ...
- [ ] Weekly Security Check | ...
- [ ] Weekly Doctrine Review | ...

**Sprint (PRD-*):**
- [ ] PRD-001 Deploy TikTok LP + tracking
- [ ] PRD-002 Auth recovery hash fix
- [ ] PRD-003 Supabase redirect allow list
- [ ] PRD-004 PostHog before_send URL token strip
- [ ] PRD-005 Experiment streak badge

### PRD-001 spot-check

| Veld | Verwacht |
|---|---|
| Status | Ready (of In Progress als je al bezig bent) |
| work_type | Feature |
| work_area | Acquisition |
| funnel_stage | Acquisition |
| touches_posthog | aan |
| superagent_review_status | pending |

---

## 3. Snelle "alles goed?" test (2 min)

### Social Content OK als:

1. SC-001 opent zonder lege verplichte velden (content_id, channel, landing_url)
2. Je kunt hook_type dropdown openen en **cyclus** kiezen
3. Status **Gepost** bestaat en je kunt er naartoe (zonder error)

### Structuro's List OK als:

1. PRD-001 opent met work_type + work_area ingevuld
2. Status **Ready** bestaat
3. superagent_review_status dropdown toont pending / ok / warning / veto

---

## 4. Als iets niet klopt

| Symptoom | Fix |
|---|---|
| Veld ontbreekt | Voeg toe via field-definitions.csv |
| Dropdown waarde ontbreekt | Edit field → optie toevoegen (exacte spelling) |
| Taak ontbreekt | Opnieuw import-template.csv importeren |
| Waarden leeg na import | Kolomnaam bij import niet gemapt → opnieuw importeren of handmatig vullen |
| Verkeerde list | Verplaats taak naar juiste list |

---

## 5. Klaar? Volgende stap

**Alles groen → kies:**

- **Optie B:** SC-001 → metrics invullen → status Analyse → `@Structuro Social Manager` comment
- **Optie A:** Nieuwe taak in Structuro's List → `@Structuro Superagent` of status Ready

Zie `clickup-setup-checklist.md` Fase 3 voor exacte trigger-teksten.
