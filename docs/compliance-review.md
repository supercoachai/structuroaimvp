# Compliance review, Structuro MVP, NL launch 26 mei 2026

Datum review: 6 mei 2026. Reviewer: AI-assistent Cursor (in opdracht).
Scope: AVG / UAVG, Telecomwet 11.7a, Boek 6/7 BW (consumentenrecht NL),
codebase op `main`. Doelgroep: volwassenen met ADHD-achtige kenmerken
in Nederland.

> **Disclaimer.** Dit document is een interne audit, geen juridisch
> advies. Laat de plug-and-play teksten in §A en §B nog tegen-lezen door
> een NL-jurist (privacy/IT-recht) vóór publicatie. De review identifi-
> ceert risico's en geeft concrete fixes; de juridische eindverant-
> woordelijkheid blijft bij Structuro.

---

## Rondvondsten (samenvatting)

- Privacy en terms zijn **één i18n-string per document** (`legal.privacyBody`
  en `legal.termsBody` in `src/lib/i18n/localeAddons.ts:489` resp. `:493`).
  Beide zijn 4-6 alinea's en missen vrijwel alle AVG-verplichte velden.
- Account-delete `src/app/api/account/delete/route.ts` is **niet
  transactioneel**, wist een vaste hardcoded tabellijst, mist 1-2 tabellen,
  en signt de gebruiker **niet** uit binnen het endpoint zelf.
- Consent-banner gedrag is **technisch correct** (default deny, GA pas na
  opt-in, timestamp opgeslagen, reset zichtbaar in /settings). Wel een
  paar inhoudelijke smetten: marketing-toggle is loos, GA4 mist
  `anonymize_ip` / `cookie_flags`, "marketing" claim mist verwerkersnaam.
- Datamigratie na signup is **stil** (geen confirm), wist localStorage
  pas na succesvolle batch-call. Juridisch verdedigbaar (eigen device-data),
  UX-juridisch zwak: gebruiker krijgt vooraf niet te zien wat er meegaat.
- Geen verwerkingsregister (intern), geen sub-processor-pagina, geen
  cookie-verklaring los van privacy, geen contact-/KvK-blok in app of
  legal pages, geen DPA-template voor B2B.

---

## A. Privacy Policy (juridisch)

### A.1 Wat is gevonden

- Privacy-bron: `src/lib/i18n/localeAddons.ts:489` (NL `legal.privacyBody`)
  en `:974` (EN `legal.privacyBody`). Alles in één lange string,
  `\n\n`-gesplitst in `src/components/LegalStaticPage.tsx:14`.
- Render: `src/app/privacy/page.tsx`.
- Update-datum: `legal.privacyUpdated` ("mei 2026").
- Geen versienummer, geen changelog, geen ondertekenings-/contactblok,
  geen klachtroute, geen verwerkersnamen met juridische identiteit,
  geen bewaartermijnen, geen rechtsgrondslag per dataveld.

### A.2 Tegen het databaseschema (wat wordt **echt** verwerkt)

Tabellen met `user_id` (gevonden via `supabase/schema.sql` +
`migration_*.sql` + `migration_complete_schema.sql`):

| Tabel | Bron | Inhoud |
|---|---|---|
| `profiles` | `schema.sql:8`, `migration_add_display_name.sql`, `migration_add_preferred_name.sql`, `migration_analytics_consent.sql` | `id`, `email`, `full_name`, `display_name`, `preferred_name`, `onboarding_completed`, `onboarding_version`, `analytics_consent` |
| `tasks` | `schema.sql:17`, `migration_complete_schema.sql`, `migration_focus_session_tracking.sql`, `migration_add_micro_steps.sql` | titel, prioriteit, deadline, energy_level, micro_steps (JSON), focus-timestamps |
| `daily_checkins` | `migration_daily_checkins.sql`, `schema.sql:67` | datum, energie, top3_task_ids |
| `daily_shutdowns` | `schema.sql:78`, `migration_daily_shutdowns_extra_columns.sql`, `migration_dagafsluiter_postpone.sql`, `migration_dagafsluiter_parked_and_satisfaction.sql` | satisfaction, **reflection (vrije tekst)**, notes, remembered_tasks |
| `gamification_data` | `schema.sql:41` | streak, xp, badges |
| `user_insights` | `schema.sql:55` | dagteller `tasks_completed`, `focus_time_minutes` |
| `parked_thoughts` | `migration_parked_thoughts.sql:4` | **content (vrije tekst)** |
| `push_subscriptions` | `migration_push_subscriptions.sql:4` | `endpoint`, `p256dh`, `auth` (per browser/apparaat) |
| `shutdown_reminder_sends` | `migration_shutdown_reminder_sends.sql:1` | technisch send-log per dag/user |

Plus de Supabase-eigen tabel `auth.users` (e-mail, hash, `last_sign_in_at`,
`raw_user_meta_data.full_name`).

De huidige privacy-tekst noemt: "tasks, dagstarts, dagafsluitingen, optional
geparkeerde gedachten en gerelateerde notificatie-instellingen". **Niet
genoemd**: gamification (streak / xp / badges), `user_insights` (dag-aggregaten),
focus-timing op tasks, `analytics_consent`-kolom op profiles, push-endpoint
metadata, reminder-send-logs.

### A.3 Wat klopt

- Vermelding GA4 als **optioneel** en pas na consent. Conform
  Telecomwet 11.7a + AVG.
- Vermelding van Supabase als hosting- en auth-partner.
- Vermelding van Vercel als delivery-partner.
- Aparte privacy- en terms-route (in plaats van één blob).
- Footer in `/settings:631-637` linkt naar beide.
- Voorwaarden zijn **vóór login** bereikbaar (de middleware-matcher in
  `src/middleware.ts:25` sluit alleen API/static uit, dus
  `/privacy` en `/terms` zijn ook zonder sessie te lezen).

### A.4 Wat ontbreekt of zwak is

| Item | Waar | Status |
|---|---|---|
| Identiteit verwerkingsverantwoordelijke (handelsnaam, KvK, vestigingsadres, e-mail) | nergens | **BLOCKER** |
| Privacy-contact / DPO of verklaring "geen DPO" | nergens | **BLOCKER** |
| Categorieën persoonsgegevens compleet (gamification / insights / focus-timestamps / analytics_consent / reminder-logs / push-endpoints) | `legal.privacyBody:489` | **BLOCKER** |
| Rechtsgrondslag per categorie (art. 6 AVG: uitvoering overeenkomst / toestemming / gerechtvaardigd belang) | nergens | **BLOCKER** |
| Bijzondere persoonsgegevens (art. 9): vrije-tekstvelden `parked_thoughts.content` en `daily_shutdowns.reflection` kunnen mentaal-gezondheid bevatten. Verwerkingsbasis (toestemming + waarborgen) ontbreekt | nergens | **BLOCKER** |
| Subverwerkers met juridische naam, vestiging, doel | tekst noemt alleen "Supabase" en "Vercel" zonder entiteit | **BLOCKER** |
| Internationale doorgifte (Vercel Inc. = US, Supabase Inc. = US, Google = US) + grondslag (DPF / SCC / aanvullende waarborgen) | nergens | **BLOCKER** |
| Bewaartermijnen concreet | "tot je verwijdert" voor account, niets voor logs/backups | **BLOCKER** |
| Betrokkenenrechten + uitvoering (inzien / corrigeren / verwijderen / dataportabiliteit / bezwaar / intrekking toestemming) | dunne zin | **SHOULD-FIX** |
| Klachtroute Autoriteit Persoonsgegevens met URL | nergens | **BLOCKER** |
| Cookie-/storage-overzicht (welke `localStorage`-keys, welke 1st/3rd party cookies van GA, looptijden) | nergens | **SHOULD-FIX** |
| Geautomatiseerde besluitvorming / profilering (`top3_task_ids` validatie, focus-suggesties): expliciete vermelding "geen profilering met juridische gevolgen" | nergens | **SHOULD-FIX** |
| Datalek-procedure (intern, niet publiek, maar wel verwijzing dat we melden) | nergens | **NICE-TO-HAVE** |
| Versienummer + changelog | alleen "mei 2026" datum | **SHOULD-FIX** |
| Privacy by design / minimalisatie-statement | nergens | **NICE-TO-HAVE** |

### A.5 Aanbevolen fix, plug-and-play tekst (NL)

Vervang `legal.privacyBody` (NL) en `legal.privacyBody` (EN) volledig.
Voor de leesbaarheid hieronder als blokken; in de codebase splits je het
over `\n\n` zoals `LegalStaticPage` al doet.

> **Plaats aanvullen.** Vul `[KVK-NUMMER]`, `[ADRES]`, `[POSTCODE PLAATS]`,
> `[E-MAIL]` voor je publiceert. Sla pas merge-baar in i18n als die ingevuld
> zijn. Adviezen voor verwerkersnamen zijn op het moment van schrijven
> publiek bekend; controleer ze nog tegen de actuele DPA's.

```text
1. Wie wij zijn

Structuro is een dienst van [HANDELSNAAM B.V./V.O.F./EENMANSZAAK],
gevestigd te [ADRES], [POSTCODE PLAATS], Nederland. KvK [KVK-NUMMER].
Contact voor privacyvragen: [E-MAIL]. Wij zijn voor de Algemene
Verordening Gegevensbescherming (AVG) verwerkingsverantwoordelijke
voor de gegevens die wij over jou verwerken via de Structuro-webapp.
Wij hebben geen verplicht aangewezen functionaris voor gegevensbescherming;
voor inhoudelijke vragen kun je terecht bij hetzelfde adres.

2. Welke gegevens wij verwerken

Accountgegevens: e-mailadres, wachtwoordhash, voor- of aanspreeknaam
(profielvelden display_name en preferred_name), tijdstempels van
aanmaak en laatste login, en (als jij dat instelt) je analytics-keuze.

Plannings- en gebruiksgegevens: taken (titel, deadline, prioriteit,
status, micro-stappen, geschatte duur, energie-niveau), dagstarts
(energie en top-3 keuze), dagafsluitingen (afgevinkte taken, energie,
tevredenheid, optionele reflectietekst, optionele notities),
geparkeerde gedachten (vrije tekst die jij invoert), focus-sessies
(start- en eindtijd, aantal pogingen per taak), gamification
(streak, ervaringspunten, badges), en dagelijkse aggregaten zoals
afgeronde taken en totale focusminuten.

Notificaties: web-push-eindpunten en encryptiesleutels per browser
of apparaat (alleen wanneer jij notificaties aanzet), en log-records
van verstuurde reminders zodat we niet dubbel sturen.

Technische gegevens: cookies en lokale opslag voor sessiebeheer,
taalvoorkeur, en je cookie-/analytics-keuze (zie hoofdstuk 6).
Beperkte logs van fouten en serverbelasting bij onze infrastructuur-
partner Supabase, voor zover noodzakelijk voor beveiliging en
beschikbaarheid.

3. Bijzondere persoonsgegevens

In de velden geparkeerde gedachten en reflectie kun je vrije tekst
invoeren. Daar kunnen mentale of gezondheids-gerelateerde aantekeningen
in staan. Wij verwerken die alleen omdat jij ze zelf invoert
(uitdrukkelijke toestemming, art. 9 lid 2 sub a AVG). Wij delen deze
velden niet met derden voor analyse of training, en wij gebruiken ze
niet voor profilering of geautomatiseerde besluiten met juridische
gevolgen. Je kunt deze gegevens op elk moment wissen via de app.

4. Waarom wij dit verwerken (rechtsgrondslagen, art. 6 AVG)

- Account, login en de kernfunctionaliteit (taken, dagstart,
  dagafsluiter, geparkeerde gedachten, focus): uitvoering van de
  overeenkomst tussen jou en ons (art. 6 lid 1 sub b AVG).
- Web-push-notificaties: jouw toestemming via de browser- of
  besturingssysteem-prompt en de in-app-toggle (art. 6 lid 1 sub a AVG);
  je kunt ze in de instellingen uitzetten.
- Google Analytics 4: jouw toestemming via de cookiebanner
  (art. 6 lid 1 sub a AVG); zonder toestemming wordt het script niet
  geladen.
- Beveiliging en misbruikpreventie (rate-limits, auditlogs bij
  verwerking van accountverwijderingen, sessiebeheer): ons
  gerechtvaardigd belang (art. 6 lid 1 sub f AVG), afgewogen tegen
  jouw belang.

5. Verwerkers en sub-verwerkers

Wij gebruiken de volgende partijen die jouw gegevens namens ons
verwerken. Met al deze partijen hebben wij een verwerkers-overeenkomst
(Data Processing Agreement) zoals bedoeld in art. 28 AVG.

- Supabase, Inc., 970 Toa Payoh North #07-04, Singapore 318992,
  met databaseregio EU (eu-north-1, Stockholm). Hosting van database
  en authenticatie. DPA: supabase.com/legal/dpa.
- Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, Verenigde
  Staten. Levert de webapplicatie (rendering, edge-routing). DPA:
  vercel.com/legal/dpa. Vercel is gecertificeerd onder het EU-US
  Data Privacy Framework.
- Google LLC, 1600 Amphitheatre Parkway, Mountain View, CA 94043,
  Verenigde Staten. Verwerkt anonieme gebruiksstatistieken via
  Google Analytics 4 wanneer jij toestemming geeft. DPA:
  business.safety.google/adsprocessorterms. Google LLC is gecertificeerd
  onder het EU-US Data Privacy Framework.
- Upstash, Inc., 251 Little Falls Drive, Wilmington, DE 19808,
  Verenigde Staten. Wordt gebruikt voor rate-limiting van publieke
  endpoints; ontvangt je IP-adres of een gehashte vorm daarvan.
- Browser-push-providers (Apple Push Notification service door
  Apple Inc., Firebase Cloud Messaging door Google LLC, Mozilla
  autopush door Mozilla Corporation, Windows Push Notification
  Service door Microsoft Corporation): leveren push-berichten af.
  Wij sturen alleen de tekst die jij in je instellingen activeert.

Doorgifte naar de Verenigde Staten gebeurt op basis van het EU-US
Data Privacy Framework (adequaatheidsbesluit van de Europese Commissie
van 10 juli 2023) of, waar dat ontbreekt, modelcontractbepalingen
(SCC's) zoals vastgesteld door de Europese Commissie. Een actuele
sub-verwerkerlijst is opvraagbaar via [E-MAIL].

6. Cookies en lokale opslag

Wij plaatsen geen tracking-cookies zonder jouw toestemming. De
volgende opslag gebruiken wij wel altijd, omdat de dienst zonder
deze niet werkt:

- Een Supabase-sessiecookie (HttpOnly, Secure, SameSite=Lax) voor
  ingelogd blijven.
- localStorage-keys voor taalvoorkeur, je cookiekeuze, en (offline)
  taken die nog niet zijn gesynchroniseerd. Looptijd: tot je ze
  zelf wist of je account verwijdert.
- Een korte cookie 'structuro_local_mode' voor ontwikkelaars-flows;
  niet gebruikt voor tracking.

Met jouw toestemming plaatsen wij Google Analytics 4 cookies (zoals
_ga en _ga_<id>) met een looptijd tot 2 jaar. Je kunt je keuze altijd
wijzigen via Instellingen, knop "Cookiekeuze opnieuw instellen".

7. Bewaartermijnen

- Account- en planningsgegevens: bewaard zolang je account actief is.
- Bij accountverwijdering via Instellingen: directe verwijdering uit
  de productieomgeving. Back-ups bij Supabase worden binnen 30 dagen
  geroteerd; daarna zijn de gegevens ook daar verdwenen.
- Server- en beveiligingslogs: maximaal 30 dagen.
- Reminder-send-logs (`shutdown_reminder_sends`): maximaal 90 dagen.
- Inactieve accounts: een account dat 24 maanden niet gebruikt is,
  ontvangt een aankondiging per e-mail; daarna verwijderen wij het
  account binnen 30 dagen.

8. Jouw rechten

Je hebt het recht om jouw gegevens in te zien, te laten corrigeren,
te laten verwijderen, te laten beperken, over te dragen
(dataportabiliteit), of bezwaar te maken tegen verwerking. Voor de
meeste rechten kun je terecht in de app:

- Inzien en bewerken: profielinstellingen en de tabbladen Taken,
  Dagstart, Dagafsluiter en Geparkeerd.
- Exporteren: Instellingen, knop "Exporteer mijn data".
- Verwijderen: Instellingen, knop "Account verwijderen".
- Toestemming intrekken (analytics): Instellingen, knop
  "Cookiekeuze opnieuw instellen".

Voor verzoeken die niet in de app kunnen, mail [E-MAIL]. Wij reageren
binnen 30 dagen. Je hebt ook het recht om een klacht in te dienen bij
de Autoriteit Persoonsgegevens, via
https://www.autoriteitpersoonsgegevens.nl/nl/zelf-doen/privacyrechten/klacht-indienen-bij-de-ap.

9. Geautomatiseerde besluitvorming

Wij gebruiken geen geautomatiseerde besluiten met rechtsgevolgen of
vergelijkbaar aanmerkelijke gevolgen voor jou. Suggesties in de app
(zoals top-3-keuze of focus-aanbevelingen) zijn hulpmiddelen die je
zelf accepteert of negeert.

10. Beveiliging en datalekken

Wij gebruiken TLS, row-level security in de database, gescheiden
service-role-sleutels, en rate-limiting op gevoelige endpoints. Bij
een datalek dat een risico voor jou oplevert melden wij dit binnen
72 uur bij de Autoriteit Persoonsgegevens en, waar van toepassing,
ook aan jou.

11. Wijzigingen

Dit beleid kan wijzigen. De geldige versie staat altijd op deze
pagina. Belangrijke wijzigingen kondigen wij in de app aan. Versie
1.0, mei 2026.
```

**Severity:** **BLOCKER** voor publicatie naar consumenten.

### A.6 Code-aanpassing voor de tekst

- `legal.privacyBody` is nu één string. Voor leesbaarheid en juridische
  versionering: voeg `legal.privacyVersion` toe en houd de tekst nog steeds
  als één string die `\n\n`-gesplitst rendert. `LegalStaticPage:14` is daar
  al op gebouwd.
- Voeg vóór de tekst een **kop met versie + datum** toe in
  `legal.privacyUpdated` (bv. "Versie 1.0, geldig vanaf 26 mei 2026").
- Splits in vervolg-iteratie de bron uit `localeAddons.ts` naar
  `src/lib/legal/privacy.nl.ts` zodat juridische review zonder i18n-context
  kan; niet verplicht voor launch.

---

## B. Algemene voorwaarden (consumentenrecht NL)

### B.1 Wat is gevonden

- Bron: `src/lib/i18n/localeAddons.ts:493` (NL `legal.termsBody`),
  `:977` (EN). 4 alinea's. Render via `src/app/terms/page.tsx`.
- Alleen aanwezig: gebruik op eigen risico, geen misbruik, content
  blijft van gebruiker, voorwaarden kunnen wijzigen.

### B.2 Wat klopt

- Disclaimer "MVP-fase, geen ononderbroken beschikbaarheid".
- Vermelding dat content van de gebruiker blijft.
- Verwijzing naar privacybeleid voor data.

### B.3 Wat ontbreekt of zwak is

| Item | Status |
|---|---|
| Identiteit aanbieder, KvK, BTW, contactadres, e-mail | **BLOCKER** |
| Toepasselijk recht (Nederlands) en bevoegde rechtbank | **BLOCKER** |
| Aansprakelijkheidsbeperking voor consumenten op een wijze die niet onder zwarte (art. 6:236 BW) of grijze (art. 6:237 BW) lijst valt | **BLOCKER** |
| Herroepingsrecht 14 dagen (art. 6:230o BW) of expliciete uitsluiting via art. 6:230p sub g BW (digitale dienst, met uitdrukkelijke toestemming + verklaring afstand recht herroeping bij start uitvoering) | **BLOCKER** |
| Beëindiging van de overeenkomst door consument (opzegtermijn) en door aanbieder (gronden + kennisgeving) | **SHOULD-FIX** |
| Prijs / abonnementen / verlenging (art. 7:236g BW e.v., automatische verlenging mag niet langer zijn dan een maand stilzwijgend) | **SHOULD-FIX** als gratis MVP, **BLOCKER** zodra betaalde abonnementen live gaan |
| Klachtroute en geschillenbeslechting (Stichting Geschillencommissie of ODR-platform van EU) | **SHOULD-FIX** |
| Verwijzing naar privacybeleid (aanwezig) en cookiebeleid | **OK** voor privacy, **SHOULD-FIX** voor cookies |
| Disclaimer "geen medisch hulpmiddel, geen behandeling van ADHD, geen vervanging professionele zorg" | **BLOCKER** voor doelgroep |
| Wijzigingen voorwaarden: kennisgeving en effectieve datum (huidige tekst zegt alleen "kijk af en toe", dat is voor consumenten te zwak) | **SHOULD-FIX** |

### B.4 Aanbevolen fix, plug-and-play tekst (NL)

Vervang `legal.termsBody` volledig. Inclusief medisch-disclaimer voor de
ADHD-doelgroep.

```text
1. Aanbieder

Structuro wordt aangeboden door [HANDELSNAAM] te [ADRES], [POSTCODE PLAATS],
KvK [KVK-NUMMER], BTW [BTW-NUMMER]. Contact: [E-MAIL].

2. Wat Structuro is, en niet is

Structuro is een digitaal hulpmiddel om je dag te plannen, taken op te
splitsen en je focus te ondersteunen. Structuro is uitdrukkelijk geen
medisch hulpmiddel, geen behandeling, en geen vervanging van zorg of
advies van een arts, psychiater, psycholoog of andere zorgverlener.
Wij bieden geen diagnose voor ADHD of een andere aandoening. Twijfel
je over je gezondheid of mentale belasting, raadpleeg dan een
zorgprofessional.

3. Account

Voor toegang tot de gepersonaliseerde functies maak je een account aan.
Je staat ervoor in dat de gegevens die je opgeeft kloppen, en je houdt
je inloggegevens vertrouwelijk. Je mag je account niet aan derden
overdragen.

4. Gebruiksregels

Je gebruikt Structuro niet voor:

- onrechtmatige inhoud, intimidatie of onveilige content;
- het ontwijken van beveiligingsmaatregelen of het overbelasten van de
  dienst (denial of service);
- het zonder toestemming verzamelen van gegevens van anderen.

Bij overtreding mogen wij je account beperken of beëindigen, na een
waarschuwing waar redelijkerwijs mogelijk.

5. Beschikbaarheid

Wij streven naar een betrouwbare dienst maar geven, gezien de
MVP-fase, geen garantie op ononderbroken beschikbaarheid of foutloze
werking. Wij mogen onderhouds- en beveiligingsmomenten inplannen.

6. Prijs en duur (gratis MVP)

Tijdens de MVP-periode, lopend van 26 mei 2026 tot een door ons aan te
kondigen einddatum, is Structuro kosteloos beschikbaar. Er is geen
abonnement en geen automatische verlenging. Zodra wij betaalde plannen
introduceren, kondigen wij deze ten minste 30 dagen vooraf aan, en
gelden aanvullende voorwaarden die wij in de app tonen voor je een
betaald plan koopt. Lopende gratis accounts blijven gratis tot het
einde van de MVP-periode of tot een door jou bevestigde overstap.

7. Herroepingsrecht en directe levering

Voor digitale diensten geldt in beginsel een wettelijk herroepingsrecht
van 14 dagen (art. 6:230o BW). Omdat Structuro een online dienst is
die direct na aanmaak van je account wordt geleverd, vragen wij bij
aanmaken om jouw uitdrukkelijke toestemming dat wij meteen beginnen
met de uitvoering en bevestigen dat je daarmee afstand doet van het
herroepingsrecht zodra de uitvoering is voltooid (art. 6:230p sub g BW).
Tijdens de MVP-periode is de dienst kosteloos en is dit herroepings-
recht in praktijk niet relevant; bij toekomstige betaalde plannen
herhalen wij deze toestemmingsvraag op het moment van koop.

8. Beëindiging

Je kunt de overeenkomst op elk moment beëindigen door je account te
verwijderen via Instellingen, knop "Account verwijderen". Wij mogen de
overeenkomst beëindigen met inachtneming van een redelijke termijn,
behalve in gevallen van misbruik, dan kunnen wij direct beëindigen.
Bij beëindiging vervallen de gebruiksrechten; de privacyparagraaf
"Bewaartermijnen" beschrijft wat er met je gegevens gebeurt.

9. Aansprakelijkheid

Wij zijn niet aansprakelijk voor schade die voortvloeit uit beslissingen
die jij neemt op basis van suggesties in Structuro, voor schade door
overmacht, en voor indirecte schade zoals gederfde winst, verlies van
gegevens of immateriële schade, voor zover de wet dat toelaat. Onze
totale aansprakelijkheid in een kalenderjaar is, voor zover de wet
dat toelaat, beperkt tot het bedrag dat je in datzelfde jaar voor de
dienst aan ons hebt betaald, met een minimum van EUR 50,-. Niets in
deze voorwaarden beperkt of sluit aansprakelijkheid uit voor opzet of
bewuste roekeloosheid van Structuro of haar leidinggevenden, voor
dood of letsel, of in andere gevallen waarin de wet aansprakelijkheid
dwingend voorschrijft (waaronder afdeling 6.5.3 BW voor consumenten).

10. Wijzigingen voorwaarden

Wij mogen deze voorwaarden wijzigen. Wezenlijke wijzigingen kondigen
wij ten minste 30 dagen vooraf aan in de app of per e-mail; je kunt
in dat geval je account beëindigen voordat de wijziging in werking
treedt. Niet-wezenlijke wijzigingen (bijvoorbeeld redactionele
verbeteringen) kunnen direct ingaan; de geldige versie en de datum
staan altijd op deze pagina.

11. Klachten en geschillen

Heb je een klacht? Neem eerst contact met ons op via [E-MAIL]. Wij
reageren binnen 14 dagen. Komen wij er niet samen uit, dan is de
geschillenregeling op het ODR-platform van de Europese Commissie
beschikbaar via https://ec.europa.eu/consumers/odr. Voor consumenten
in Nederland is daarnaast de gewone civiele rechter bevoegd.

12. Toepasselijk recht

Op deze overeenkomst is Nederlands recht van toepassing. Voor zover
de wet dat toelaat is de rechtbank in [VESTIGINGSPLAATS], Nederland,
bevoegd om geschillen te beslechten. Een consument behoudt het recht
zich te wenden tot de bevoegde rechter van zijn of haar woonplaats.

Versie 1.0, geldig vanaf 26 mei 2026.
```

**Severity samenvatting Sectie B:**
- Identiteit + medisch-disclaimer + jurisdictie + aansprakelijkheids-
  begrenzing + herroeping: **BLOCKER**.
- Klachten / opzeg / wijzigingen-procedure: **SHOULD-FIX**.

---

## C. Right-to-erasure (technisch)

### C.1 Wat is gevonden

- Endpoint: `src/app/api/account/delete/route.ts:1-58`.
- Hardcoded tabellijst:

```5:14:src/app/api/account/delete/route.ts
const TABLES_WITH_USER_ID = [
  "tasks",
  "daily_checkins",
  "daily_shutdowns",
  "parked_thoughts",
  "gamification_data",
  "user_insights",
  "push_subscriptions",
  "shutdown_reminder_sends",
] as const;
```

- Profiles + auth.users worden los gewist: `route.ts:43` en `:48`.
- UI-trigger: `src/app/settings/page.tsx:247-278` met
  bevestigings-woord `accountDeleteWord`.
- Beschermd testaccount-check: `:249`, gebruikt `isProtectedTestAccount`.
- Logout pas bij **204**: `:267` `await performClientLogout(router)`.

### C.2 Cross-check tegen schema

Tabellen met `user_id` in productie (uit §A.2):

`tasks, daily_checkins, daily_shutdowns, parked_thoughts,
gamification_data, user_insights, push_subscriptions,
shutdown_reminder_sends, profiles`.

Ontbrekende, expliciet door opdracht genoemd:

- **`daystart_reminder_sends`** en **`daystart_lunch_reminder_sends`**:
  bestaan **niet** in `supabase/*.sql` (alleen `shutdown_reminder_sends`).
  Geen actie nodig in delete-endpoint. Wel: in privacy-policy en
  retention-tekst alleen `shutdown_reminder_sends` noemen.
- **`og_waitlist`**: bestaat **niet** als migratie. Stub-endpoint
  `/api/og-signup` legt nog niets weg. Zodra die tabel bestaat:
  toevoegen aan `TABLES_WITH_USER_ID` of aparte e-mail-key wissen
  via een mailcolumn.

Andere zorgen ten aanzien van het schema:

- Alle data-tabellen verwijzen naar `auth.users(id) ON DELETE CASCADE`
  (zie `schema.sql:19,43,57,69,80`, `migration_parked_thoughts.sql:6`,
  `migration_push_subscriptions.sql:6`,
  `migration_shutdown_reminder_sends.sql:3`). De huidige volgorde
  (eerst rijen wissen, dan profiles, dan auth.users) is technisch dubbel
  werk maar veilig. **Het laatste call**, `auth.admin.deleteUser`, doet
  in principe alles ineens via cascade. Nu wordt cascade nooit echt
  geraakt omdat eerdere DELETE-statements de rijen al weggehaald
  hebben.

### C.3 Wat klopt

- Service-role-client guard met 503 als hij niet geconfigureerd is
  (`route.ts:18-23`).
- Auth-check via cookie-gebaseerde `createClient` server-helper
  (`:25-31`).
- Beschermd testaccount geblokkeerd in UI (`settings/page.tsx:249-252`).
- Bij **success → logout client-side** (`settings/page.tsx:267`).
- 503-toast in de UI (`:271`).

### C.4 Wat ontbreekt of zwak is

| Item | Severity |
|---|---|
| **Niet-transactioneel.** Per-tabel DELETE in een for-loop. Faalt één DELETE met andere fout dan "does not exist", dan log-line en doorgaan. Resultaat: partial delete kan blijven staan. AVG art. 17 vraagt volledige verwijdering. | **BLOCKER** |
| **Geen audit log van succesvolle deletion.** Voor accountverwijderingen vereist intern verwerkingsregister bewijs van uitvoering. | **SHOULD-FIX** |
| **Logout niet in endpoint zelf.** Als de UI de redirect-flow mist (bijv. tab gesloten direct na 204), blijft de Supabase-cookie geldig totdat hij verloopt. Beter: in de POST-response een `Set-Cookie` met `Max-Age=0` voor de Supabase-auth-cookie. | **SHOULD-FIX** |
| **Geen Stripe / billing teardown.** Geen Stripe in code, dus geen blocker nu. Wel benoemen als "todo" zodra billing live gaat. | **NICE-TO-HAVE** |
| **Foute filter `does not exist`.** Het check-statement (`:38, :44`) test op de **letterlijke** error-tekst. Postgres/Supabase kan ook `relation "x" does not exist` of code 42P01 teruggeven. Dat zou nu in een normale delete-flow niet voor mogen komen, maar de filter is fragile. | **NICE-TO-HAVE** |
| **Volgorde**. Eerst data → profiles → `auth.admin.deleteUser`. De cascade-FK had het in 1 call kunnen doen, met betere garantie. Wel: huidige volgorde is OK zolang je transactie + auditlog toevoegt. | **NICE-TO-HAVE** |
| **Geen 401-revoke.** Stale sessions in andere tabbladen / apparaten blijven werken tot de access-token verloopt. Service-role kan via `auth.admin.signOut(uid, 'global')` alle JWT's invalideren. | **SHOULD-FIX** |
| **Geen "double-confirm" e-mail / cooldown.** Conform best-practice voor onomkeerbare actie. Niet AVG-verplicht. | **NICE-TO-HAVE** |

### C.5 Aanbevolen fix

Twee-staps verbetering. Eerst de meest kritieke (transactie en audit-log),
dan de hygiëne (revoke + cookie-clear in respons).

**1. Atomair en met audit log via een Postgres-functie**

Maak een Postgres `SECURITY DEFINER`-functie die in één transactie alle
data wist en een audit-record schrijft. Voorbeeld migratie
`supabase/migration_account_delete_atomic.sql`:

```sql
-- audit log: alleen userId-hash + timestamp, geen PII
CREATE TABLE IF NOT EXISTS account_deletion_audit (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id_hash TEXT NOT NULL,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT NOT NULL DEFAULT 'user_request'
);

CREATE OR REPLACE FUNCTION public.delete_account_data(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM tasks                    WHERE user_id = p_user_id;
  DELETE FROM daily_checkins           WHERE user_id = p_user_id;
  DELETE FROM daily_shutdowns          WHERE user_id = p_user_id;
  DELETE FROM parked_thoughts          WHERE user_id = p_user_id;
  DELETE FROM gamification_data        WHERE user_id = p_user_id;
  DELETE FROM user_insights            WHERE user_id = p_user_id;
  DELETE FROM push_subscriptions       WHERE user_id = p_user_id;
  DELETE FROM shutdown_reminder_sends  WHERE user_id = p_user_id;
  DELETE FROM profiles                 WHERE id      = p_user_id;

  INSERT INTO account_deletion_audit (user_id_hash)
  VALUES (encode(digest(p_user_id::text, 'sha256'), 'hex'));
END;
$$;

REVOKE ALL ON FUNCTION public.delete_account_data(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_account_data(UUID) TO service_role;
```

`pgcrypto` is in Supabase by default beschikbaar; voeg anders
`CREATE EXTENSION IF NOT EXISTS pgcrypto;` toe boven de functie.

**2. Endpoint-aanroep eenvoudig en veilig maken**

Vervang de inhoud van `src/app/api/account/delete/route.ts:33-57` door:

```ts
const uid = user.id;
try {
  // 1) atomair alle eigen rijen + auditlog (geen PII in audit)
  const { error: rpcErr } = await service.rpc("delete_account_data", {
    p_user_id: uid,
  });
  if (rpcErr) {
    console.error("[account/delete] rpc", rpcErr.message);
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }

  // 2) auth.users wissen, en alle JWT's wereldwijd invalideren
  await service.auth.admin.signOut(uid, { scope: "global" });
  const { error: admErr } = await service.auth.admin.deleteUser(uid);
  if (admErr) {
    console.error("[account/delete] admin", admErr.message);
    return NextResponse.json({ error: admErr.message }, { status: 500 });
  }

  // 3) directe cookie-clear voor de huidige tab (defence in depth)
  const res = new NextResponse(null, { status: 204 });
  for (const name of ["sb-access-token", "sb-refresh-token"]) {
    res.cookies.set(name, "", { path: "/", maxAge: 0 });
  }
  return res;
} catch (e) {
  const msg = e instanceof Error ? e.message : "Unknown";
  return NextResponse.json({ error: msg }, { status: 500 });
}
```

**3. UI-fix: ook bij 500 sessie weggooien**

In `src/app/settings/page.tsx:262-277`: bij elke status `>= 400`
**altijd** `performClientLogout(router)` aanroepen voordat je de toast
laat zien, om "half ingelogd zonder data"-states te voorkomen wanneer
de RPC slaagde maar `auth.admin.deleteUser` faalde.

```ts
} finally {
  setAccountDeleteBusy(false);
}
```

→ vervang door iets als:

```ts
} finally {
  setAccountDeleteBusy(false);
  if (failedAfterDataWipe) {
    await performClientLogout(router);
  }
}
```

waarbij `failedAfterDataWipe` true is bij elke non-204 die geen 503 was.

**Severity samenvatting Sectie C:**
- Transactie + audit log + global signOut: **BLOCKER**.
- UI-logout bij elke fout-status: **SHOULD-FIX**.
- Cookie-clear server-side: **SHOULD-FIX**.

---

## D. Consent banner (juridisch + technisch)

### D.1 Wat is gevonden

- `src/components/ConsentBanner.tsx` (banner-UI).
- `src/lib/consentStorage.ts` (`CONSENT_STORAGE_KEY = "structuro_consent_v1"`,
  `analytics`, `marketing`, `timestamp`).
- `src/components/GoogleAnalytics.tsx` (laadt `gtag` alleen als
  `hasAnalyticsConsent()` true).
- Reset-knop: `src/app/settings/page.tsx:433-439`,
  `:235-238` (`clearStoredConsent` + toast).

### D.2 Wat klopt

| Item | Bewijs |
|---|---|
| Default deny: zonder klik geen GA, banner zichtbaar (`null`-snapshot) | `ConsentBanner.tsx:14-22`, `consentStorage.ts:25-32` |
| Banner is non-modal (`pointer-events-none` op wrapper, content `pointer-events-auto`); blokkeert content niet | `ConsentBanner.tsx:34-36` |
| Granulaire keuzes via `<details>`-block | `:62-92` |
| Consent-timestamp wordt opgeslagen (vereist als bewijs) | `consentStorage.ts:36-46` |
| GA `consent default` op `denied`, dan `update` `granted` zodra script laadt | `GoogleAnalytics.tsx:39-40` |
| Reset zichtbaar in /settings, met statusweergave | `settings/page.tsx:421-440` |
| Werkt in PWA (localStorage is in standalone-PWA hetzelfde scope) | manifest.json + iOSSafeAreaTheme |

### D.3 Wat ontbreekt of zwak is

| Item | Severity |
|---|---|
| **GA4 mist `anonymize_ip` en `cookie_flags`.** AP-richtlijn voor "GA zonder cookieconsent" hoeft nu niet meer (GA wordt alleen na consent geladen), maar `anonymize_ip` is nog steeds best practice en IP-anonimisatie reduceert dataset bij doorgifte. | **SHOULD-FIX** |
| **`marketing` toggle is loos.** `writeConsent({ analytics: false, marketing: true })` doet niets in code want er zijn geen marketing-pixels. Dit is misleidend voor de gebruiker en juridisch onhandig (toestemming voor "iets onbestaands"). Verwijderen of expliciet "Nu niet actief" tonen + log-only. | **SHOULD-FIX** |
| **Consent-keuze is per device, niet per account.** Wel een DB-kolom `profiles.analytics_consent` (zie `migration_analytics_consent.sql`), maar geen sync-code in repo. Resultaat: telefoon zegt "ja", laptop zegt "nee" tegen GA, terwijl het hetzelfde account is. | **SHOULD-FIX** |
| **Cookie-tabel ontbreekt in privacy.** Beschrijf welke cookies/storage-keys, looptijd, doel, partij. Sectie 6 in voorgestelde privacytekst hierboven dekt dit. | **SHOULD-FIX** (binnen privacy-fix) |
| **Banner-koptekst is generiek**. "Cookies en statistiek" ("Cookies and analytics") is OK, maar verwijs duidelijk naar privacybeleid via een link binnen de banner zelf, niet pas via /settings. | **SHOULD-FIX** |
| **`structuro_consent_changed`-event wordt niet door GA gehoord.** Als gebruiker eerst "weiger" klikt en daarna in /settings reset → banner toont weer → "accept" → GA-script wordt nu pas geladen. Dat klopt. Andersom: als gebruiker eerst "accept" klikt en daarna "reset" → het GA-script blijft echter in DOM (Next.js verwijdert `<Script>` niet altijd). Resultaat: GA blijft tot harde reload. | **SHOULD-FIX** |
| **`writeConsent` payload is lokaal, niet ondertekend.** Gebruiker kan `localStorage` zelf aanpassen. Voor audit-bewijs is dat OK (we hebben de `timestamp` en zien het server-side niet anders), maar als je proof-of-consent ooit nodig hebt, sla je hem ook server-side op (zie row hierboven). | **NICE-TO-HAVE** |
| **Geen "DNT" honoring.** Niet wettelijk vereist, maar netjes als signal. | **NICE-TO-HAVE** |

### D.4 Aanbevolen fixes

**1. GA4 anonymize_ip + cookie_flags**

```32:46:src/components/GoogleAnalytics.tsx
<Script
  id="google-analytics"
  strategy="afterInteractive"
  dangerouslySetInnerHTML={{
    __html: `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('consent','default',{'analytics_storage':'denied','ad_storage':'denied'});
      gtag('consent','update',{'analytics_storage':'granted'});
      gtag('js', new Date());
      gtag('config', '${GA_MEASUREMENT_ID}', {
        anonymize_ip: true,
        cookie_flags: 'SameSite=None;Secure'
      });
    `,
  }}
/>
```

**2. Marketing-toggle weghalen tot er ooit echt iets is**

In `ConsentBanner.tsx:74-80` en `consentStorage.ts`-payload de
`marketing`-toggle als _disabled, met "Nu niet actief"_ tonen, of helemaal
weghalen. Vandaag is hij actief klikbaar maar zonder effect.

**3. Banner: directe link naar privacybeleid**

Voeg in `ConsentBanner.tsx:38-40` een link naar `/privacy` toe binnen de
banner zelf:

```tsx
<p id="consent-banner-title" className="text-sm font-semibold text-slate-900">
  {t("consent.title")}
</p>
<p className="mt-1 text-xs leading-snug text-slate-600">
  {t("consent.body")}{" "}
  <a href="/privacy" className="underline">
    {t("consent.readMore")}
  </a>
</p>
```

en voeg `consent.readMore: "Lees ons privacybeleid"` (NL) +
`"Read our privacy policy"` (EN) toe in `bundles.ts`.

**4. Server-side cross-device consent**

Bij login + bij wijziging: schrijf naar `profiles.analytics_consent`
('granted' / 'denied') en lees die kolom uit als terugvalwaarde wanneer
`localStorage` leeg is. Niet nodig voor launch-blocker, wel voor 1.1.

**Severity samenvatting Sectie D:**
- `anonymize_ip` + cookie-tabel + bannerlink: **SHOULD-FIX**.
- Loze marketing-toggle: **SHOULD-FIX** (anders misleidend).
- Cross-device sync: **NICE-TO-HAVE**.

---

## E. Datamigratie na signup (juridisch + technisch)

### E.1 Wat is gevonden

- `src/lib/migrateLocalStorageAfterSignup.ts:9-72`. Trigger:
  `src/app/login/page.tsx` (zie bestaande imports).
- Verplaatst: tasks (via `/api/tasks/batch`), daily-checkin van vandaag
  (via `upsertCheckInToSupabase`).
- Toont **na** afloop een toast met aantallen
  (`bundles.ts: login.migrateTasksToast`, `migrateDayOnlyToast`,
  `migrateTasksAndDayToast`).
- localStorage-keys (`structuro_tasks`, `structuro_daily_checkins`)
  pas verwijderd na succesvolle server-bevestiging.

### E.2 Wat klopt

- Eigen device-data, eigen account, gebruiker is op dat moment al
  ingelogd. AVG: dit is de gebruiker zelf die data verplaatst, dus geen
  derde-partij doorgifte.
- Failsafe: als batch faalt, blijft data lokaal staan (regel 43-50).
- Data wordt herzendt via dezelfde batch-API met ownership + rate-limit.

### E.3 Wat ontbreekt of zwak is

| Item | Severity |
|---|---|
| **Stille migratie zonder vooraf tonen wat er meegaat.** Best practice: confirm-modal "We zien {n} taken in deze browser. Meenemen naar je nieuwe account?" met ja/nee-knop. | **SHOULD-FIX** |
| **Geen log-/audit-record** van migratie (handig bij betwisting "ik heb die taken niet aangemaakt"). | **NICE-TO-HAVE** |
| **migrate-pad bij oauth/social-login**. De huidige login-flow gaat via callback; de migratiehook draait pas wanneer hij vanuit `/login`-page wordt aangeroepen. Bij OAuth-callback (alleen redirect) is timing kritisch. Geen blocker, wel verifiëren. | **SHOULD-FIX** |
| **Geen rollback bij gedeeltelijke migratie**. Als 7 van 10 taken slagen retourneert batch nog steeds `ok` (zie `migrateLocalStorageAfterSignup.ts:43`); localStorage wordt geleegd. 3 taken zijn weg. | **SHOULD-FIX** |
| **`upsertCheckInToSupabase` faal-stilte**: catch retourneert `didCheckIn = false`, maar wist `localStorage.removeItem` niet aan, dus user kan retry doen. **OK**. | **OK** |

### E.4 Aanbevolen fixes

**1. Confirm-modal voor signup-migratie**

Pas in `src/app/login/page.tsx` (na succesvolle signup of eerste login
met lokale data) een `Suspense`-loze dialoog toe:

```tsx
<MigrateConfirmDialog
  taskCount={localTaskCount}
  hasCheckIn={hasLocalCheckIn}
  onConfirm={async () => {
    const r = await migrateLocalStorageAfterSignup(user.id);
    toast(migrateToastMessage(t, r) ?? "");
  }}
  onSkip={() => {
    /* laat localStorage staan; de gebruiker kan later in /settings
       beslissen om het toch te doen. */
  }}
/>
```

NL/EN strings toevoegen aan `bundles.ts: login.migrateConfirmTitle`,
`migrateConfirmBodyTasks`, `migrateConfirmBodyDay`, `migrateConfirmYes`,
`migrateConfirmSkip`.

**2. Atomair migreren of niets**

Op `/api/tasks/batch`-endpoint: retourneer naast `ok` ook
`{ inserted, failed }` en doe `localStorage.removeItem` alleen wanneer
`failed === 0`.

**3. Kleine privacy-zin in modal**

> "We slaan deze taken op in je Structuro-account zodat je ze ook op
> andere apparaten ziet. Je kunt ze altijd weer verwijderen."

Geen aparte toestemming nodig (geen derde partij), maar dit is
**transparantie** zoals AVG art. 13 verwacht.

**Severity samenvatting Sectie E:**
- Confirm vóór migratie + atomair maken: **SHOULD-FIX**.

---

## F. Kritieke gaps voor NL launch

### F.1 Cookie-/storage-verklaring los van privacy

Geen aparte `/cookies` of cookie-tabel. AVG verplicht het niet expliciet
maar Telecomwet 11.7a + AP-richtlijnen verwachten een **leesbare lijst**
van wat er wordt opgeslagen, met doel en duur. **SHOULD-FIX**: opgenomen in
de plug-and-play privacy van A.5 onder hoofdstuk 6. Een aparte route
`/cookies` is niet vereist.

### F.2 Verwerkingsregister (intern, niet publiek)

AVG art. 30: vereist voor verwerkers met meer dan 250 medewerkers, of
elke organisatie die niet-incidenteel of bijzondere persoonsgegevens
verwerkt. Structuro verwerkt vrije-tekstvelden die mentaal/gezondheid
kunnen raken (`parked_thoughts.content`, `daily_shutdowns.reflection`)
→ in praktijk **wel verplicht**. **BLOCKER (intern)**:
maak `docs/verwerkingsregister.md` (interne file, niet publiceren) met
per verwerking: doel, categorie betrokkenen, categorie data, ontvangers,
bewaartermijn, doorgifte, beveiligingsmaatregelen. Sjabloon hieronder
in §F.7.

### F.3 DPA-template voor toekomstige B2B-klanten

Niet relevant voor consumentenlaunch. **NICE-TO-HAVE**, los van 26 mei.

### F.4 Sub-processor-lijst (publiek of bijlage)

Een aparte pagina `/subprocessors` of een bijlage bij privacy. Niet
verplicht voor B2C, maar wel best practice. **SHOULD-FIX**: is opgenomen
in privacy A.5 hoofdstuk 5.

### F.5 DPA met Anthropic / Claude API

Geen Claude/Anthropic-import in `src/`-bronnen (gechecked met grep op
`claude|anthropic`: 0 hits in `src/`). **Niet relevant voor launch**.
Zodra AI in product komt: privacy-policy aanvullen, DPA tekenen,
expliciete toestemming + opt-out, **geen** vrije-tekstvelden zonder
extra waarschuwing naar het model sturen.

### F.6 Privacy by design / minimalisatie

Geen schriftelijke vastlegging. **SHOULD-FIX intern**: schrijf in
`docs/privacy-by-design.md` op:

- Welke data we **niet** verzamelen (locatie, contacts, browsing
  buiten app, telefoonnummer, geboortedatum, e.d.).
- Default-deny voor analytics.
- Lokale opslag waar mogelijk (bv. dagstart-cookie alleen lokaal).
- Pseudonimisering: `auth.users.id` is UUID, geen gebruikersnaam in URL's.
- RLS overal aan (`schema.sql:104-110`).
- Service-role key niet aan de client (geverifieerd:
  `createServiceRoleClient` zit in `src/lib/supabase/admin.ts`,
  niet exporteerd vanuit `client.ts`).

### F.7 Verwerkingsregister-sjabloon

Sla op in `docs/verwerkingsregister.md` (intern):

```text
| Verwerking | Doel | Rechtsgrondslag | Categorieën data | Categorieën betrokkenen | Ontvangers | Bewaartermijn | Doorgifte derde land | Beveiliging |
|---|---|---|---|---|---|---|---|---|
| Account & login | uitvoering overeenkomst | art. 6.1.b | e-mail, hash, displayname | gebruikers | Supabase | tot accountverwijdering, backups 30 d | EU (eu-north-1), Supabase Inc. (US) onder DPF | TLS, Argon2-hash, RLS |
| Taken / dagstart / dagafsluiter | uitvoering overeenkomst | art. 6.1.b | titel, energie, datums, micro-stappen | gebruikers | Supabase | tot accountverwijdering | EU + Supabase Inc. US (DPF) | RLS, validatie-trigger |
| Geparkeerde gedachten + reflectie | uitvoering + uitdrukkelijke toestemming | art. 6.1.b + art. 9.2.a | vrije tekst (kan gezondheid raken) | gebruikers | Supabase | tot accountverwijdering | idem | RLS, geen AI-analyse |
| Web-push | toestemming | art. 6.1.a | endpoint, p256dh, auth-sleutel | gebruikers | Supabase + Apple/FCM/Mozilla/Microsoft | tot uitschakelen of accountverwijdering | EU + DPF + SCC | TLS |
| Analytics (GA4) | toestemming | art. 6.1.a | _ga cookies, anoniem IP, page-views | bezoekers met opt-in | Google LLC | 14 maanden GA-config | DPF | gtag, anonymize_ip |
| Rate-limiting | gerechtvaardigd belang | art. 6.1.f | IP / user-id-hash | bezoekers | Upstash Inc. | 1 uur | DPF / SCC | TLS |
| Beveiligings- en foutlogs | gerechtvaardigd belang | art. 6.1.f | request-meta, geen body | bezoekers | Vercel + Supabase | 30 dagen | DPF | TLS |
```

### F.8 Andere observaties tijdens scan

| Observatie | Bron | Severity |
|---|---|---|
| Sentry niet geconfigureerd; foutmeldingen blijven verborgen voor ons | `docs/launch-readiness.md:21` | **SHOULD-FIX** |
| Vercel-region niet gepind (audit §5.8) | `docs/audit-2025-05-02-deepscan.md:661-665` | **SHOULD-FIX** voor "data blijft in EU"-verhaal |
| `console.log(user.id)` in audit als hygiene-issue (1.9 / 5.9) | audit | **SHOULD-FIX** |
| Geen versionering van privacy/terms (alleen "mei 2026") | `localeAddons.ts:487, 491` | **SHOULD-FIX** |
| Identifiable e-mail in `info@structuro.eu` (`README.md:43`, `supabase/functions/shutdown-reminder/index.ts:6`) | n.v.t. juridisch, OK als support-adres | OK |
| `og_waitlist`-stub aanwezig zonder DB-tabel; bij launch publiek live: zorg dat persoonsgegevens van waitlist niet via stub-route lekken | `src/app/api/og-signup/route.ts` | **SHOULD-FIX** voor productie |
| `console.error("[account/delete] ...", error.message)` logt error-tekst zonder PII-filter; lijkt veilig | `route.ts:39, 45` | **OK** |
| `migration_analytics_consent.sql` voegt kolom toe maar code synchroniseert niet | code | **SHOULD-FIX** (D.3) |
| Push-consent niet versie-getagged (audit 5.6) | audit | **SHOULD-FIX** |

---

## Eindoordeel

### Tellingen

- **BLOCKER:** **9**
  1. Geen identiteit verwerkingsverantwoordelijke (KvK / adres / contact).
  2. Geen rechtsgrondslag per dataveld in privacy.
  3. Categorieën persoonsgegevens incompleet in privacy
     (gamification / insights / analytics_consent / push-endpoints).
  4. Geen behandeling van bijzondere persoonsgegevens
     (parked_thoughts / reflection-vrije tekst).
  5. Subverwerkers met juridische naam, vestiging, doel + DPA-verwijzing
     ontbreken.
  6. Internationale doorgifte (Vercel Inc., Supabase Inc., Google LLC)
     zonder juridische dekking benoemd.
  7. Klachtroute Autoriteit Persoonsgegevens ontbreekt.
  8. Algemene voorwaarden missen identiteit, jurisdictie, herroeping,
     aansprakelijkheidsbegrenzing en medisch-disclaimer voor de
     ADHD-doelgroep.
  9. Right-to-erasure is niet transactioneel (partial-delete mogelijk)
     en zonder audit-log.
- **SHOULD-FIX:** **15+** (waaronder GA4 `anonymize_ip`, marketing-toggle,
  cross-device consent, migratie confirm-modal, server-side audit van
  consent, retention-tekst, banner-link, server-cookie-clear bij delete,
  signOut-global, Vercel-regio pinnen, Sentry, push-consent versie,
  versienummering legal docs, `migration_analytics_consent` UI-binding,
  cookie-tabel/cookie-pagina).
- **NICE-TO-HAVE:** 7 (DPA-template B2B, Stripe-teardown stub,
  DNT-respect, AI-toekomstplan, Vertex-EU, double-confirm e-mail,
  mailmap-prefix-DPI).

### Kunnen we 26 mei launchen?

**Voorwaardelijk: ja, mits onderstaande 3 punten af zijn vóór 26 mei
00:00 NL-tijd.**

> Met de huidige tekst in `legal.privacyBody` en `legal.termsBody` is
> een publieke launch in Nederland naar consumenten **niet** verdedigbaar
> tegen een AP-toets of een procedure op basis van Boek 6/7 BW.
> De technische compliance (consent-gating, RLS, deletion-endpoint zonder
> Stripe) is in de basis op orde, maar het juridische deel is dun.
> Met onderstaande 3 must-fixes wordt het wel verdedigbaar voor een
> MVP-launch met klein gebruikersbestand.

### De 3 dingen die ECHT eerst af moeten

1. **Privacy-policy en algemene voorwaarden vervangen door de
   plug-and-play teksten in §A.5 en §B.4**, met ingevulde
   `[KVK-NUMMER]`, `[ADRES]`, `[POSTCODE PLAATS]`, `[E-MAIL]`,
   `[VESTIGINGSPLAATS]`. Zonder dit zijn 7 van de 9 blockers
   onmiddellijk weg.
2. **Right-to-erasure atomair en met audit-log maken**: de migratie
   `supabase/migration_account_delete_atomic.sql` uit §C.5 plus de
   endpoint-rewrite (RPC + global-signOut + cookie-clear). Daarna het
   testaccount één keer verwijderen via de UI om end-to-end te
   verifiëren in staging.
3. **DPA's tekenen en registreren** voor Supabase, Vercel, Google
   (GA4), en (als de OG-signup-stub aan blijft) Upstash. Sla de
   ondertekende PDF's op in een interne map en verwijs in de privacy.
   Zonder ondertekende DPA's is verwerking technisch in strijd met
   art. 28 AVG, los van wat er in de tekst staat.

### Daarna direct, vóór 1 juni

- §C: UI-logout bij elke fout-status van delete-endpoint.
- §D: GA4 `anonymize_ip` + `cookie_flags`, banner-link naar privacy,
  marketing-toggle disablen of weghalen.
- §E: confirm-modal voor signup-migratie + atomic batch.
- §F.2: intern verwerkingsregister invullen.
- §F.6: privacy-by-design-doc invullen.

---

_Einde document. Versie 1.0, opgesteld 6 mei 2026._
