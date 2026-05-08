/**
 * Nederlandse juridische teksten versie 1.1 (bron: docs/legal/*.md).
 * Wordt gebruikt door legalLocale (NL) en door structuro-eu-landing build script.
 */
export const privacyBodyNlV11 = `Toepassingsgebied. Dit beleid geldt voor de Structuro-dienst en deze website (structuro.eu).

1. Wie wij zijn

Structuro is een dienst van Structuro AI, eenmanszaak gevestigd te Machinekamerplein 32-325, 5617AP Eindhoven, Nederland. Ingeschreven bij de Kamer van Koophandel onder nummer 97938289 (vestigingsnummer 000063130475). Contact voor privacyvragen: info@structuro.eu. Wij zijn voor de Algemene Verordening Gegevensbescherming (AVG) verwerkingsverantwoordelijke voor de gegevens die wij over jou verwerken via de Structuro-webapp. Wij hebben geen verplicht aangewezen functionaris voor gegevensbescherming; voor inhoudelijke vragen kun je terecht bij hetzelfde adres.

2. Welke gegevens wij verwerken

**Accountgegevens:** e-mailadres, wachtwoordhash, voor- of aanspreeknaam (profielvelden display_name en preferred_name), tijdstempels van aanmaak en laatste login, en (als jij dat instelt) je analytics-keuze.

**Plannings- en gebruiksgegevens:** taken (titel, deadline, prioriteit, status, micro-stappen, geschatte duur, energie-niveau), dagstarts (energie en top-3 keuze), dagafsluitingen (afgevinkte taken, energie, tevredenheid, optionele reflectietekst, optionele notities), geparkeerde gedachten (vrije tekst die jij invoert), focus-sessies (start- en eindtijd, aantal pogingen per taak), en dagelijkse aggregaten zoals afgeronde taken en totale focusminuten.

**Betalingsgegevens:** wij verwerken zelf geen volledige betaalgegevens. Bij betaling word je doorgestuurd naar onze betaalprovider Stripe. Wij ontvangen van Stripe alleen je betaalstatus, het abonnementstype, het bedrag, en een tokenized verwijzing naar je betaalmethode (geen volledig kaartnummer of bankrekening).

**Notificaties:** web-push-eindpunten en encryptiesleutels per browser of apparaat (alleen wanneer jij notificaties aanzet), en log-records van verstuurde reminders zodat we niet dubbel sturen.

**Technische gegevens:** cookies en lokale opslag voor sessiebeheer, taalvoorkeur, en je cookie-/analytics-keuze (zie hoofdstuk 6). Beperkte logs van fouten en serverbelasting bij onze infrastructuurpartner Supabase, voor zover noodzakelijk voor beveiliging en beschikbaarheid.

3. Bijzondere persoonsgegevens

In de velden geparkeerde gedachten en reflectie kun je vrije tekst invoeren. Daar kunnen mentale of gezondheids-gerelateerde aantekeningen in staan. Wij verwerken die alleen omdat jij ze zelf invoert (uitdrukkelijke toestemming, art. 9 lid 2 sub a AVG). Wij delen deze velden niet met derden voor analyse of training, en wij gebruiken ze niet voor profilering of geautomatiseerde besluiten met juridische gevolgen. Je kunt deze gegevens op elk moment wissen via de app.

4. Waarom wij dit verwerken (rechtsgrondslagen, art. 6 AVG)

**Account, login en de kernfunctionaliteit** (taken, dagstart, dagafsluiter, geparkeerde gedachten, focus): uitvoering van de overeenkomst tussen jou en ons (art. 6 lid 1 sub b AVG).

**Betaling en facturatie:** uitvoering van de overeenkomst (art. 6 lid 1 sub b AVG) en, voor zover van toepassing, wettelijke verplichting voor administratie (art. 6 lid 1 sub c AVG).

**Web-push-notificaties:** jouw toestemming via de browser- of besturingssysteem-prompt en de in-app-toggle (art. 6 lid 1 sub a AVG); je kunt ze in de instellingen uitzetten.

**Google Analytics 4:** jouw toestemming via de cookiebanner (art. 6 lid 1 sub a AVG); zonder toestemming wordt het script niet geladen.

**Beveiliging en misbruikpreventie** (rate-limits, auditlogs bij verwerking van accountverwijderingen, sessiebeheer): ons gerechtvaardigd belang (art. 6 lid 1 sub f AVG), afgewogen tegen jouw belang.

5. Verwerkers en sub-verwerkers

Wij gebruiken de volgende partijen die jouw gegevens namens ons verwerken. Met al deze partijen hebben wij een verwerkersovereenkomst (Data Processing Agreement) zoals bedoeld in art. 28 AVG.

**Supabase, Inc.**, 970 Toa Payoh North #07-04, Singapore 318992, met databaseregio EU (eu-north-1, Stockholm). Hosting van database en authenticatie. DPA: supabase.com/legal/dpa.

**Vercel Inc.**, 440 N Barranca Ave #4133, Covina, CA 91723, Verenigde Staten. Levert de webapplicatie (rendering, edge-routing). DPA: vercel.com/legal/dpa. Vercel is gecertificeerd onder het EU-US Data Privacy Framework.

**Stripe Payments Europe, Limited**, The One Building, 1 Grand Canal Street Lower, Dublin 2, Ierland (D02 H210). Verwerkt jouw betalingen en abonnementsadministratie. DPA: stripe.com/legal/dpa.

**Google LLC**, 1600 Amphitheatre Parkway, Mountain View, CA 94043, Verenigde Staten. Verwerkt anonieme gebruiksstatistieken via Google Analytics 4 wanneer jij toestemming geeft. DPA: business.safety.google/adsprocessorterms. Google LLC is gecertificeerd onder het EU-US Data Privacy Framework.

**Upstash, Inc.**, 251 Little Falls Drive, Wilmington, DE 19808, Verenigde Staten. Wordt gebruikt voor rate-limiting van publieke endpoints; ontvangt je IP-adres of een gehashte vorm daarvan.

**Browser-push-providers** (Apple Push Notification service door Apple Inc., Firebase Cloud Messaging door Google LLC, Mozilla autopush door Mozilla Corporation, Windows Push Notification Service door Microsoft Corporation): leveren push-berichten af. Wij sturen alleen de tekst die jij in je instellingen activeert.

Doorgifte naar landen buiten de EU gebeurt op basis van het EU-US Data Privacy Framework (adequaatheidsbesluit van de Europese Commissie van 10 juli 2023) of, waar dat ontbreekt, modelcontractbepalingen (SCCs) zoals vastgesteld door de Europese Commissie. Een actuele sub-verwerkerlijst is opvraagbaar via info@structuro.eu.

6. Cookies en lokale opslag

Wij plaatsen geen tracking-cookies zonder jouw toestemming. De volgende opslag gebruiken wij wel altijd, omdat de dienst zonder deze niet werkt:

Een Supabase-sessiecookie (HttpOnly, Secure, SameSite=Lax) voor ingelogd blijven.

localStorage-keys voor taalvoorkeur, je cookiekeuze, en (offline) taken die nog niet zijn gesynchroniseerd. Looptijd: tot je ze zelf wist of je account verwijdert.

Stripe plaatst tijdens de betaalflow eigen cookies voor fraudepreventie en sessiebeheer; deze zijn noodzakelijk voor de betaalfunctie en vallen onder Stripe's eigen privacybeleid (stripe.com/privacy).

Met jouw toestemming plaatsen wij Google Analytics 4 cookies (zoals _ga en _ga_<id>) met een looptijd tot 2 jaar. Je kunt je keuze altijd wijzigen via Instellingen, knop 'Cookiekeuze opnieuw instellen'.

7. Bewaartermijnen

**Account- en planningsgegevens:** bewaard zolang je account actief is.

**Bij accountverwijdering** via Instellingen: directe verwijdering uit de productieomgeving. Back-ups bij Supabase worden binnen 30 dagen geroteerd; daarna zijn de gegevens ook daar verdwenen.

**Betaalhistorie:** wij bewaren factuur- en betaalgegevens zeven jaar in verband met de fiscale bewaarplicht (art. 52 lid 4 AWR), ook nadat je je account verwijdert. Het gaat om factuurnummer, datum, bedrag, btw, en de gegevens die wettelijk op een factuur moeten staan; niet om planningsdata of vrije-tekstvelden.

**Server- en beveiligingslogs:** maximaal 30 dagen.

**Reminder-send-logs** (shutdown_reminder_sends): maximaal 90 dagen.

**Inactieve accounts:** een account dat 24 maanden niet gebruikt is, ontvangt een aankondiging per e-mail; daarna verwijderen wij het account binnen 30 dagen, voor zover de fiscale bewaarplicht zich daar niet tegen verzet.

8. Jouw rechten

Je hebt het recht om jouw gegevens in te zien, te laten corrigeren, te laten verwijderen, te laten beperken, over te dragen (dataportabiliteit), of bezwaar te maken tegen verwerking. Voor de meeste rechten kun je terecht in de app:

Inzien en bewerken: profielinstellingen en de tabbladen Taken, Dagstart, Dagafsluiter en Geparkeerd.

Exporteren: Instellingen, knop 'Exporteer mijn data'.

Verwijderen: Instellingen, knop 'Account verwijderen'.

Toestemming intrekken (analytics): Instellingen, knop 'Cookiekeuze opnieuw instellen'.

Voor verzoeken die niet in de app kunnen, mail info@structuro.eu. Wij reageren binnen 30 dagen. Je hebt ook het recht om een klacht in te dienen bij de Autoriteit Persoonsgegevens, via https://www.autoriteitpersoonsgegevens.nl/nl/zelf-doen/privacyrechten/klacht-indienen-bij-de-ap.

9. Geautomatiseerde besluitvorming

Wij gebruiken geen geautomatiseerde besluiten met rechtsgevolgen of vergelijkbaar aanmerkelijke gevolgen voor jou. Suggesties in de app (zoals top-3-keuze of focus-aanbevelingen) zijn hulpmiddelen die je zelf accepteert of negeert.

10. Beveiliging en datalekken

Wij gebruiken TLS, row-level security in de database, gescheiden service-role-sleutels, en rate-limiting op gevoelige endpoints. Bij een datalek dat een risico voor jou oplevert melden wij dit binnen 72 uur bij de Autoriteit Persoonsgegevens en, waar van toepassing, ook aan jou.

**Product Analytics (PostHog)**

Om Structuro continu te verbeteren en te begrijpen hoe de Core Loop wordt gebruikt, maken wij gebruik van PostHog (gehost in de EU).
Welke data: Wij registreren interacties zoals het starten van een focus-sessie of het voltooien van een dagstart. Wij registreren expliciet niet de inhoud van je taken of geparkeerde gedachten.
Identificatie: Na inloggen koppelen wij je gebruikers-ID en e-mailadres aan deze gebeurtenissen om persoonlijke ondersteuning en retentie-inzichten mogelijk te maken.
Privacy-waarborgen: Wij maken gebruik van een eigen proxy-server zodat gegevens direct via ons domein worden verzonden (first-party). IP-adressen worden niet opgeslagen. Analytics-data wordt na 12 maanden automatisch verwijderd.
Data-doorgifte: PostHog Inc. is een Amerikaans bedrijf. Wij hebben een verwerkersovereenkomst (DPA) gesloten en zij zijn gecertificeerd onder het EU-U.S. Data Privacy Framework.
Toestemming: Het gebruik van PostHog voor het koppelen van data aan je gebruikersprofiel gebeurt alleen na expliciete toestemming via onze cookie-banner. Je kunt deze toestemming op elk moment intrekken via je instellingen.

11. Wijzigingen

Dit beleid kan wijzigen. De geldige versie staat altijd op deze pagina. Belangrijke wijzigingen kondigen wij in de app aan. Versie 1.1, geldig vanaf 26 mei 2026.`;

export const termsBodyNlV11 = `Toepassingsgebied. Deze voorwaarden gelden voor de Structuro-dienst en deze website (structuro.eu).

1. Aanbieder

Structuro wordt aangeboden door Structuro AI, eenmanszaak gevestigd te Machinekamerplein 32-325, 5617AP Eindhoven, Nederland. Ingeschreven bij de Kamer van Koophandel onder nummer 97938289 (vestigingsnummer 000063130475). Contact: info@structuro.eu.

2. Wat Structuro is, en niet is

Structuro is een digitaal hulpmiddel om je dag te plannen, taken op te splitsen en je focus te ondersteunen. Structuro is uitdrukkelijk geen medisch hulpmiddel, geen behandeling, en geen vervanging van zorg of advies van een arts, psychiater, psycholoog of andere zorgverlener. Wij bieden geen diagnose voor ADHD of een andere aandoening. Twijfel je over je gezondheid of mentale belasting, raadpleeg dan een zorgprofessional.

3. Account

Voor toegang tot de gepersonaliseerde functies maak je een account aan. Je staat ervoor in dat de gegevens die je opgeeft kloppen, en je houdt je inloggegevens vertrouwelijk. Je mag je account niet aan derden overdragen.

4. Gebruiksregels

Je gebruikt Structuro niet voor:

onrechtmatige inhoud, intimidatie of onveilige content;

het ontwijken van beveiligingsmaatregelen of het overbelasten van de dienst (denial of service);

het zonder toestemming verzamelen van gegevens van anderen.

Bij overtreding mogen wij je account beperken of beëindigen, na een waarschuwing waar redelijkerwijs mogelijk.

5. Beschikbaarheid

Wij streven naar een betrouwbare dienst maar geven geen garantie op ononderbroken beschikbaarheid of foutloze werking. Wij mogen onderhouds- en beveiligingsmomenten inplannen.

6. Prijs en abonnement

Structuro is beschikbaar als maandabonnement van €12,99 per maand of als jaarabonnement van €119 per jaar (effectief €9,92 per maand). De prijzen zijn inclusief btw waar van toepassing.

Je abonnement gaat in op het moment dat de betaling slaagt. Het maandabonnement wordt elke maand automatisch verlengd tot je opzegt. Het jaarabonnement wordt elk jaar automatisch verlengd tot je opzegt. Je kunt je abonnement op elk moment opzeggen via Instellingen, knop 'Abonnement opzeggen', of per e-mail naar info@structuro.eu. Bij opzegging behoud je toegang tot het einde van de lopende factuurperiode.

Wij mogen prijzen wijzigen. Wezenlijke prijswijzigingen kondigen wij ten minste 30 dagen vooraf aan per e-mail. Je kunt in dat geval je abonnement opzeggen voordat de wijziging in werking treedt.

7. Founding-memberkorting

Voor een vooraf geselecteerde groep gebruikers, die Structuro heeft getest in de periode vóór 26 mei 2026, geldt een persoonlijke kortingscode die 50% korting geeft op het abonnement, voor de gehele duur van dat abonnement. De korting wordt aangeboden per persoonlijke e-mail. De code is niet overdraagbaar en kan slechts één keer worden ingewisseld per gebruiker. De korting geldt alleen zolang het abonnement onafgebroken loopt; bij volledige opzegging en latere heraanmelding vervalt de aanspraak op de korting.

8. Geld-terug-garantie van 14 dagen

Wij geven je 14 dagen vanaf je eerste betaling om Structuro te proberen. Ben je niet tevreden, om welke reden dan ook, dan krijg je je geld volledig terug. Geen formulieren, geen exit-vragenlijst, geen 'we missen je'-mails.

Hoe het werkt: stuur binnen 14 dagen na je eerste betaling een e-mail naar info@structuro.eu met het onderwerp 'Geld terug'. Wij verwerken het verzoek binnen drie werkdagen en betalen het volledige bedrag terug op het rekeningnummer of de creditcard waarmee je hebt betaald.

Deze garantie geldt voor zowel het maand- als het jaarabonnement, en alleen voor je eerste betaling. Bij verlengingen na de eerste 14 dagen geldt de wettelijke regeling voor doorlopende abonnementen.

9. Wettelijk herroepingsrecht

Voor digitale diensten geldt in beginsel een wettelijk herroepingsrecht van 14 dagen (art. 6:230o BW). Bij aanmaak van je betaalde account vragen wij om jouw uitdrukkelijke toestemming dat wij meteen beginnen met de uitvoering, en bevestigen dat je daarmee afstand doet van het herroepingsrecht zodra de uitvoering is voltooid (art. 6:230p sub g BW).

Onze geld-terug-garantie van 14 dagen (zie artikel 8) gaat verder dan dit wettelijke recht: ook nadat de uitvoering is voltooid kun je binnen 14 dagen je geld volledig terugvragen.

10. Beëindiging

Je kunt de overeenkomst op elk moment beëindigen door je abonnement op te zeggen via Instellingen of per e-mail. Bij opzegging behoud je toegang tot het einde van de lopende factuurperiode. Wil je ook je account en gegevens verwijderen, gebruik dan Instellingen, knop 'Account verwijderen'.

Wij mogen de overeenkomst beëindigen met inachtneming van een redelijke termijn, behalve in gevallen van misbruik. Bij beëindiging vervallen de gebruiksrechten; de privacyparagraaf 'Bewaartermijnen' beschrijft wat er met je gegevens gebeurt.

11. Aansprakelijkheid

Wij zijn niet aansprakelijk voor schade die voortvloeit uit beslissingen die jij neemt op basis van suggesties in Structuro, voor schade door overmacht, en voor indirecte schade zoals gederfde winst, verlies van gegevens of immateriële schade, voor zover de wet dat toelaat. Onze totale aansprakelijkheid in een kalenderjaar is, voor zover de wet dat toelaat, beperkt tot het bedrag dat je in datzelfde jaar voor de dienst aan ons hebt betaald, met een minimum van EUR 50,-. Niets in deze voorwaarden beperkt of sluit aansprakelijkheid uit voor opzet of bewuste roekeloosheid van Structuro of haar leidinggevenden, voor dood of letsel, of in andere gevallen waarin de wet aansprakelijkheid dwingend voorschrijft (waaronder afdeling 6.5.3 BW voor consumenten).

12. Wijzigingen voorwaarden

Wij mogen deze voorwaarden wijzigen. Wezenlijke wijzigingen kondigen wij ten minste 30 dagen vooraf aan in de app of per e-mail; je kunt in dat geval je account beëindigen voordat de wijziging in werking treedt. Niet-wezenlijke wijzigingen (bijvoorbeeld redactionele verbeteringen) kunnen direct ingaan; de geldige versie en de datum staan altijd op deze pagina.

13. Klachten en geschillen

Heb je een klacht? Neem eerst contact met ons op via info@structuro.eu. Wij reageren binnen 14 dagen. Komen wij er niet samen uit, dan is de geschillenregeling op het ODR-platform van de Europese Commissie beschikbaar via https://ec.europa.eu/consumers/odr. Voor consumenten in Nederland is daarnaast de gewone civiele rechter bevoegd.

14. Toepasselijk recht

Op deze overeenkomst is Nederlands recht van toepassing. Voor zover de wet dat toelaat is de rechtbank in Eindhoven, Nederland, bevoegd om geschillen te beslechten. Een consument behoudt het recht zich te wenden tot de bevoegde rechter van zijn of haar woonplaats.`;
