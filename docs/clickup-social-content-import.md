# ClickUp import: Social Content custom fields

## Bestand

`clickup-social-content-fields.csv`

## Handmatig importeren (ClickUp heeft geen universele CSV field-import)

ClickUp importeert custom fields **niet** direct via CSV op list-niveau. Gebruik dit bestand als **checklist** bij het aanmaken:

1. Open list **Social Content** (Marketing)
2. List settings → Custom Fields → Add field
3. Loop CSV rij voor rij (kolom `field_name`, `field_type`, dropdown opties)

## Snelle volgorde (aanbevolen)

1. post_date, channel, content_id, utm_content, landing_url
2. hook_type, hook_variant, payoff_theme, lp_headline_match
3. creative_center_done, creative_gap_topic, creative_center_notes
4. avg_watch_sec, completion_pct, lp_views, lp_cta_clicks, signups
5. promote_budget_eur, promote_ready, analysis_due_date, analysis_done
6. learning_notes, ig_reach, ig_saves, ig_profile_visits

## Statussen (handmatig, niet in CSV)

Idee → Creative Center → Canva → CapCut → Review → Gepost → Analyse → Besluit

## Task template naam

`SC-XXX | {{content_id}}`

## Automation suggesties na velden

| Trigger | Actie |
|---|---|
| Status → Gepost + creative_center_done = false | Comment waarschuwing |
| post_date + 3 dagen | Comment: vul metrics, status Analyse, @Social Manager |
| Maandag 09:00 | @Social Manager weekly overview |

Zie ook: `structuro-social-manager-clickup.md`, `clickup-antwoorden-copy-paste.md`

---

**Master checklist:** `clickup-setup-checklist.md`
