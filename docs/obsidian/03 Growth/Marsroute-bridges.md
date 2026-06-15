# Marsroute bridges

Twee routes, zelfde LP-componenten, aparte attributie.

| Kanaal | Pad | Signup source |
|--------|-----|---------------|
| Organic (structuro.eu, zelftest) | `/start` | `structuro_eu` |
| TikTok paid/bio | `/tiktok` | `tiktok` |

## Regels

- structuro.eu organic → `/start`, nooit direct `/registreren`
- Paid TikTok uit tot [[../02 Product/Activatie-lek|activatie]] >25%
- `content_id` = `utm_content` in PostHog

## Code

`src/lib/acquisition/bridgePaths.ts`

## Doc

`docs/tiktok-conversie-marsroute-2026-06-14.md`
