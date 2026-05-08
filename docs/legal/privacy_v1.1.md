# Privacybeleid

Versie 1.1, geldig vanaf 26 mei 2026.

**Toepassingsgebied.** Dit beleid geldt voor de Structuro-dienst en deze website (structuro.eu).

## 1. Wie wij zijn

Structuro is een dienst van Structuro AI, eenmanszaak gevestigd te Machinekamerplein 32-325, 5617AP Eindhoven, Nederland. Ingeschreven bij de Kamer van Koophandel onder nummer 97938289 (vestigingsnummer 000063130475). Contact voor privacyvragen: info@structuro.eu. Wij zijn voor de Algemene Verordening Gegevensbescherming (AVG) verwerkingsverantwoordelijke voor de gegevens die wij over jou verwerken via de Structuro-webapp. Wij hebben geen verplicht aangewezen functionaris voor gegevensbescherming; voor inhoudelijke vragen kun je terecht bij hetzelfde adres.

## 2. Welke gegevens wij verwerken

**Accountgegevens:** e-mailadres, wachtwoordhash, voor- of aanspreeknaam (profielvelden display_name en preferred_name), tijdstempels van aanmaak en laatste login, en (als jij dat instelt) je analytics-keuze.

**Plannings- en gebruiksgegevens:** taken (titel, deadline, prioriteit, status, micro-stappen, geschatte duur, energie-niveau), dagstarts (energie en top-3 keuze), dagafsluitingen (afgevinkte taken, energie, tevredenheid, optionele reflectietekst, optionele notities), geparkeerde gedachten (vrije tekst die jij invoert), focus-sessies (start- en eindtijd, aantal pogingen per taak), en dagelijkse aggregaten zoals afgeronde taken en totale focusminuten.

**Betalingsgegevens:** wij verwerken zelf geen volledige betaalgegevens. Bij betaling word je doorgestuurd naar onze betaalprovider Stripe. Wij ontvangen van Stripe alleen je betaalstatus, het abonnementstype, het bedrag, en een tokenized verwijzing naar je betaalmethode (geen volledig kaartnummer of bankrekening).

**Notificaties:** web-push-eindpunten en encryptiesleutels per browser of apparaat (alleen wanneer jij notificaties aanzet), en log-records van verstuurde reminders zodat we niet dubbel sturen.

**Technische gegevens:** cookies en lokale opslag voor sessiebeheer, taalvoorkeur, en je cookie-/analytics-keuze (zie hoofdstuk 6). Beperkte logs van fouten en serverbelasting bij onze infrastructuurpartner Supabase, voor zover noodzakelijk voor beveiliging en beschikbaarheid.

## 3. Bijzondere persoonsgegevens

In de velden geparkeerde gedachten en reflectie kun je vrije tekst invoeren. Daar kunnen mentale of gezondheids-gerelateerde aantekeningen in staan. Wij verwerken die alleen omdat jij ze zelf invoert (uitdrukkelijke toestemming, art. 9 lid 2 sub a AVG). Wij delen deze velden niet met derden voor analyse of training, en wij gebruiken ze niet voor profilering of geautomatiseerde besluiten met juridische gevolgen. Je kunt deze gegevens op elk moment wissen via de app.

## 4. Waarom wij dit verwerken (rechtsgrondslagen, art. 6 AVG)

**Account, login en de kernfunctionaliteit** (taken, dagstart, dagafsluiter, geparkeerde gedachten, focus): uitvoering van de overeenkomst tussen jou en ons (art. 6 lid 1 sub b AVG).

**Betaling en facturatie:** uitvoering van de overeenkomst (art. 6 lid 1 sub b AVG) en, voor zover van toepassing, wettelijke verplichting voor administratie (art. 6 lid 1 sub c AVG).

**Web-push-notificaties:** jouw toestemming via de browser- of besturingssysteem-prompt en de in-app-toggle (art. 6 lid 1 sub a AVG); je kunt ze in de instellingen uitzetten.

**Google Analytics 4:** jouw toestemming via de cookiebanner (art. 6 lid 1 sub a AVG); zonder toestemming wordt het script niet geladen.

**Beveiliging en misbruikpreventie** (rate-limits, auditlogs bij verwerking van accountverwijderingen, sessiebeheer): ons gerechtvaardigd belang (art. 6 lid 1 sub f AVG), afgewogen tegen jouw belang.

## 5. Verwerkers en sub-verwerkers

Wij gebruiken de volgende partijen die jouw gegevens namens ons verwerken. Met al deze partijen hebben wij een verwerkersovereenkomst (Data Processing Agreement) zoals bedoeld in art. 28 AVG.

**Supabase, Inc.**, 970 Toa Payoh North #07-04, Singapore 318992, met databaseregio EU (eu-north-1, Stockholm). Hosting van database en authenticatie. DPA: supabase.com/legal/dpa.

**Vercel Inc.**, 440 N Barranca Ave #4133, Covina, CA 91723, Verenigde Staten. Levert de webapplicatie (rendering, edge-routing). DPA: vercel.com/legal/dpa. Vercel is gecertificeerd onder het EU-US Data Privacy Framework.

**Stripe Payments Europe, Limited**, The One Building, 1 Grand Canal Street Lower, Dublin 2, Ierland (D02 H210). Verwerkt jouw betalingen en abonnementsadministratie. DPA: stripe.com/legal/dpa.

**Google LLC**, 1600 Amphitheatre Parkway, Mountain View, CA 94043, Verenigde Staten. Verwerkt anonieme gebruiksstatistieken via Google Analytics 4 wanneer jij toestemming geeft. DPA: business.safety.google/adsprocessorterms. Google LLC is gecertificeerd onder het EU-US Data Privacy Framework.

**Upstash, Inc.**, 251 Little Falls Drive, Wilmington, DE 19808, Verenigde Staten. Wordt gebruikt voor rate-limiting van publieke endpoints; ontvangt je IP-adres of een gehashte vorm daarvan.

**Browser-push-providers** (Apple Push Notification service door Apple Inc., Firebase Cloud Messaging door Google LLC, Mozilla autopush door Mozilla Corporation, Windows Push Notification Service door Microsoft Corporation): leveren push-berichten af. Wij sturen alleen de tekst die jij in je instellingen activeert.

Doorgifte naar landen buiten de EU gebeurt op basis van het EU-US Data Privacy Framework (adequaatheidsbesluit van de Europese Commissie van 10 juli 2023) of, waar dat ontbreekt, modelcontractbepalingen (SCCs) zoals vastgesteld door de Europese Commissie. Een actuele sub-verwerkerlijst is opvraagbaar via info@structuro.eu.

## 6. Cookies en lokale opslag

Wij plaatsen geen tracking-cookies zonder jouw toestemming. De volgende opslag gebruiken wij wel altijd, omdat de dienst zonder deze niet werkt:

Een Supabase-sessiecookie (HttpOnly, Secure, SameSite=Lax) voor ingelogd blijven.

localStorage-keys voor taalvoorkeur, je cookiekeuze, en (offline) taken die nog niet zijn gesynchroniseerd. Looptijd: tot je ze zelf wist of je account verwijdert.

Stripe plaatst tijdens de betaalflow eigen cookies voor fraudepreventie en sessiebeheer; deze zijn noodzakelijk voor de betaalfunctie en vallen onder Stripe's eigen privacybeleid (stripe.com/privacy).

Met jouw toestemming plaatsen wij Google Analytics 4 cookies (zoals _ga en _ga_<id>) met een looptijd tot 2 jaar. Je kunt je keuze altijd wijzigen via Instellingen, knop 'Cookiekeuze opnieuw instellen'.

## 7. Bewaartermijnen

**Account- en planningsgegevens:** bewaard zolang je account actief is.

**Bij accountverwijdering** via Instellingen: directe verwijdering uit de productieomgeving. Back-ups bij Supabase worden binnen 30 dagen geroteerd; daarna zijn de gegevens ook daar verdwenen.

**Betaalhistorie:** wij bewaren factuur- en betaalgegevens zeven jaar in verband met de fiscale bewaarplicht (art. 52 lid 4 AWR), ook nadat je je account verwijdert. Het gaat om factuurnummer, datum, bedrag, btw, en de gegevens die wettelijk op een factuur moeten staan; niet om planningsdata of vrije-tekstvelden.

**Server- en beveiligingslogs:** maximaal 30 dagen.

**Reminder-send-logs** (shutdown_reminder_sends): maximaal 90 dagen.

**Inactieve accounts:** een account dat 24 maanden niet gebruikt is, ontvangt een aankondiging per e-mail; daarna verwijderen wij het account binnen 30 dagen, voor zover de fiscale bewaarplicht zich daar niet tegen verzet.

## 8. Jouw rechten

Je hebt het recht om jouw gegevens in te zien, te laten corrigeren, te laten verwijderen, te laten beperken, over te dragen (dataportabiliteit), of bezwaar te maken tegen verwerking. Voor de meeste rechten kun je terecht in de app:

Inzien en bewerken: profielinstellingen en de tabbladen Taken, Dagstart, Dagafsluiter en Geparkeerd.

Exporteren: Instellingen, knop 'Exporteer mijn data'.

Verwijderen: Instellingen, knop 'Account verwijderen'.

Toestemming intrekken (analytics): Instellingen, knop 'Cookiekeuze opnieuw instellen'.

Voor verzoeken die niet in de app kunnen, mail info@structuro.eu. Wij reageren binnen 30 dagen. Je hebt ook het recht om een klacht in te dienen bij de Autoriteit Persoonsgegevens, via https://www.autoriteitpersoonsgegevens.nl/nl/zelf-doen/privacyrechten/klacht-indienen-bij-de-ap.

## 9. Geautomatiseerde besluitvorming

Wij gebruiken geen geautomatiseerde besluiten met rechtsgevolgen of vergelijkbaar aanmerkelijke gevolgen voor jou. Suggesties in de app (zoals top-3-keuze of focus-aanbevelingen) zijn hulpmiddelen die je zelf accepteert of negeert.

## 10. Beveiliging en datalekken

Wij gebruiken TLS, row-level security in de database, gescheiden service-role-sleutels, en rate-limiting op gevoelige endpoints. Bij een datalek dat een risico voor jou oplevert melden wij dit binnen 72 uur bij de Autoriteit Persoonsgegevens en, waar van toepassing, ook aan jou.

## 11. Wijzigingen

Dit beleid kan wijzigen. De geldige versie staat altijd op deze pagina. Belangrijke wijzigingen kondigen wij in de app aan. Versie 1.1, geldig vanaf 26 mei 2026.

