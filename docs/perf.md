# Performance (baseline en backlog)

Structuro heeft geen vaste automatische Lighthouse-run in deze repo. Harde drempels zoals "95+" zijn daarom **nog niet aangetoond** met voor/na-rapporten; baseline vastleggen met bijvoorbeeld:

```bash
npx lighthouse https://jouw-deployment.vercel.app/todo --output html --output-path ./lighthouse-todo.html
```

## Al gedaan in code

- **Middleware-matcher**: `/api/` valt niet meer onder de zware session-middleware (`src/middleware.ts`, audit aanbeveling).
- **UTC-dagdatum**: kritieke plaatsen gebruiken Amsterdam-kalender via `dagstartCookie` helpers.

## Dubbele `profiles`-routes in middleware

De huidige `src/lib/supabase/middleware.ts` haalt `onboarding_completed`, `onboarding_version` en `last_dagstart_date` **in één** `profiles`-select op. Twee sequentiële selects zoals in een oud auditsnippet zijn daar **samengevoegd**.

## Bekende zware punten uit de deepscan (nog open voor refactor)

| Onderwerp | Bestand |
|-----------|---------|
| `TaskContext`-splitsing | `TaskContext.tsx` |
| Focus-timer-interval | `focus/page.tsx` |
| AppLayout-poller | `AppLayout.tsx` |

Zie ook `docs/flow-audit.md` voor resterende security/rate-limit backlog.

## Rate limiting `/api/tasks/batch`

Er staat een **lichte**, per-invocation tokenbucket op `user.id`. Voor hoge-volume acties hoort **persistent** rate limiting zoals audit §1.3 (KV/Upstash) erbij.
