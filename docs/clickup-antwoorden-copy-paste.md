# ClickUp Builder: antwoorden copy-paste

Plak deze blokken direct in het ClickUp Super Agent Builder-gesprek.

---

## 1. Hybride doctrine (al gekozen)

```
Hybride:
- Security/AVG/auth/data: hard veto, nooit uitvoeren als het tegen regels ingaat.
- Product-doctrines: sterk afraden + alternatief; alleen door als expliciet experiment met subtask "Experiment – wijkt af van doctrine X".
```

---

## 2. List + velden (Social Manager)

```
Gebruik list: Marketing > Social Content.

Verplichte velden per post:
- post_date (Date)
- channel (Dropdown: TikTok, Instagram, Cross-post)
- content_id (Short text, = utm_content)
- landing_url (URL)
- hook_type (Dropdown)
- hook_variant (Dropdown A-E)
- avg_watch_sec, completion_pct, lp_views, lp_cta_clicks, signups (Number)
- promote_budget_eur (Currency, 0 = organisch)
- creative_center_done (Checkbox, verplicht vóór Gepost)
- creative_gap_topic (Short text)
- creative_center_notes (Long text)
- analysis_done (Checkbox)
```

---

## 3. Waar outputs (Social Manager)

```
Per post: analyse + advies als comment op de taak, automatisch 3 dagen na post_date
(zodra metrics ingevuld of status Analyse).

Wekelijks: nieuwe taak in Social Content:
"Social Weekly Overview | YYYY-WXX | week van DD-MM"
met zeer gedetailleerd overzicht: winnaars, verliezers, hooks, budget, stap-3 compliance, verdubbel-plan.
```

---

## 4. Social Manager scope

```
Structuro Social Manager = data + inzicht + advies + verdubbel-logica.
Canva maakt content. Agent maakt geen scripts/visuals als default, maar mag altijd meedenken en hooks beoordelen.

Automatisch 3 dagen na post: analyse-comment per taak.
Stap 3 TikTok Creative Center is verplicht (creative_center_done) vóór status Gepost.
Wekelijks zeer gedetailleerd overzicht als nieuwe taak.
```

---

## 5. Superagent scope (aparte agent)

```
Structuro Superagent = doctrines, security, funnel, roadmap.
Alle drie wekelijkse ritmes aan.
Automations alleen op Structuro's List: Task Created + status Ready/Live review-comment.
Hybride doctrine-regels zoals hierboven.
```

---

## 6. Twee agents bevestigen

```
Ja, twee agents:
1. Structuro Superagent (strategie/doctrines/security)
2. Structuro Social Manager (TikTok + Instagram performance, Canva ondersteunt creatie)

Knowledge Social Manager: docs/tiktok-*.md + docs/structuro-social-manager-clickup.md
Knowledge Superagent: doctrines + docs/structuro-superagent-clickup.md
```

---

## 7. List + velden (Superagent / Structuro's List)

```
Gebruik list: Structuro > Structuro's List.

Statussen: Backlog, In Progress, Review, Ready, Live, Blocked, Done
Automations op Ready + Live + Task Created.

Verplichte velden per taak:
- work_type (Dropdown: Feature, Bug, Security, Infrastructure, Experiment, Support, Analytics, Ops)
- work_area (Dropdown: Auth, Supabase, PostHog, Stripe, Landing, Core Loop, Dagstart, Shutdown, Acquisition, Mobile, Admin, Docs)
- funnel_stage (Dropdown: Acquisition, Activation, Core Loop, Retention, Revenue, N/A)
- effort (S/M/L), target_release (Date), github_pr (URL)

Doctrine / experiment:
- doctrine_relevant, doctrine_conflict, doctrine_flag
- experiment_waiver, experiment_doctrine_name

Security scan flags (checkbox):
- touches_auth, touches_rls, touches_pii, touches_posthog, touches_stripe
- security_severity (none|low|medium|high|critical)

Superagent output:
- superagent_review_status (pending|ok|warning|veto)
- superagent_review_done, superagent_notes

Wekelijkse ankers in list:
- Weekly Product Review | YYYY-WXX
- Weekly Security Check | YYYY-WXX
- Weekly Doctrine Review | YYYY-WXX
```

CSV import: docs/clickup-structuro-list-import.md

---


## 8. Master checklist

```
Volledige setup: docs/clickup-setup-checklist.md
```
