/**
 * Juridische teksten versie 1.1 (bron: docs/legal/*.md).
 * Wordt gebruikt door legalLocale en structuro-eu-landing build script.
 *
 * Opmaak voor LegalStaticPage:
 * - "1. Titel" op een regel → vet hoofdstuk
 * - "@Label@ tekst" → vet label, normale tekst erachter
 */
export const privacyBodyNlV11 = `Toepassingsgebied. Dit beleid geldt voor de Structuro-webapp (structuro.ai) en de website structuro.eu.

1. Wie wij zijn

Structuro is een dienst van Structuro AI, eenmanszaak gevestigd te Machinekamerplein 32-325, 5617AP Eindhoven, Nederland. Ingeschreven bij de Kamer van Koophandel onder nummer 97938289. Contact voor privacyvragen: info@structuro.eu. Wij zijn verwerkingsverantwoordelijke voor de gegevens die wij over jou verwerken via de Structuro-webapp.

2. Welke gegevens wij verwerken

@Accountgegevens@ e-mailadres, wachtwoordhash, de naam die je in je profiel zet, tijdstempels van aanmaak en laatste login, en (als jij dat instelt) je analytics-keuze.

@Plannings- en gebruiksgegevens@ taken (titel, deadline, prioriteit, status, micro-stappen, geschatte duur, energie-niveau), dagstarts (energie en top-3 keuze), dagafsluitingen (afgevinkte taken, energie, tevredenheid, optionele reflectietekst, optionele notities), geparkeerde gedachten (vrije tekst die jij invoert), focus-sessies (start- en eindtijd, aantal pogingen per taak), en dagelijkse aggregaten zoals afgeronde taken en totale focusminuten.

@Cyclus-tracking (optioneel)@ alleen als jij deze functie aanzet in Instellingen, verwerken wij de startdatum van je laatste menstruatie, je gemiddelde cycluslengte en menstruatieduur, plus de datum waarop je toestemming hebt gegeven. Wij gebruiken deze gegevens uitsluitend om je dagstart-context te kleuren. Je kunt de functie op elk moment uitzetten; dan worden deze velden gewist.

@Betalingsgegevens@ wij verwerken zelf geen volledige betaalgegevens. Bij betaling word je doorgestuurd naar onze betaalprovider Stripe. Wij ontvangen van Stripe alleen je betaalstatus, het abonnementstype, het bedrag, en een tokenized verwijzing naar je betaalmethode (geen volledig kaartnummer of bankrekening).

@Notificaties@ web-push-eindpunten en encryptiesleutels per browser of apparaat (alleen wanneer jij notificaties aanzet), en log-records van verstuurde reminders zodat we niet dubbel sturen.

@Technische gegevens@ cookies en lokale opslag voor sessiebeheer, taalvoorkeur, en je analytics-keuze (zie hoofdstuk 6). Beperkte logs van fouten en serverbelasting bij onze infrastructuurpartner Supabase, voor zover noodzakelijk voor beveiliging en beschikbaarheid.

3. Bijzondere persoonsgegevens

In de velden geparkeerde gedachten en reflectie kun je vrije tekst invoeren. Daar kunnen mentale of gezondheids-gerelateerde aantekeningen in staan. De optionele cyclus-tracking valt eveneens onder gezondheidsgegevens. Wij verwerken die alleen omdat jij ze zelf invoert of de functie zelf aanzet. Wij delen deze velden niet met derden voor analyse of training. Wij nemen geen geautomatiseerde besluiten met rechtsgevolgen voor jou. Suggesties in de app (zoals top-3-keuze of focus-aanbevelingen) zijn hulpmiddelen die je zelf accepteert of negeert. Je kunt deze gegevens op elk moment wissen via de app.

4. Waarom wij dit verwerken

Wij verwerken persoonsgegevens alleen met een geldige rechtsgrond onder de AVG: uitvoering van onze overeenkomst met jou, jouw toestemming, een wettelijke verplichting, of ons gerechtvaardigd belang (waarbij wij jouw belangen meewegen).

@Account, login en kernfunctionaliteit@ taken, dagstart, dagafsluiter, geparkeerde gedachten, focus: nodig om de dienst te leveren.

@Betaling en facturatie@ nodig om je abonnement af te handelen en administratie bij te houden.

@Cyclus-tracking@ alleen met jouw toestemming via de toggle in Instellingen.

@Web-push-notificaties@ alleen met jouw toestemming via browser of app; uit te zetten in Instellingen.

@Productanalyse (PostHog)@ alleen met jouw toestemming via cookiebanner en toggle in Instellingen. Zonder toestemming meten wij alleen anoniem en cookieless.

@Foutopsporing en beveiliging@ technische foutmeldingen, rate-limits en auditlogs: nodig om de dienst veilig en beschikbaar te houden. Wij registreren daarbij geen inhoud van taken, geparkeerde gedachten of cyclus-tracking.

5. Verwerkers

Wij gebruiken onderstaande partijen die gegevens namens ons verwerken. Met al deze partijen hebben wij een verwerkersovereenkomst.

@Supabase, Inc.@ databaseregio EU (Stockholm). Database en authenticatie.

@Vercel Inc.@ Verenigde Staten. Webapplicatie (rendering, edge-routing). Gecertificeerd onder het EU-US Data Privacy Framework.

@Stripe Payments Europe, Limited@ Ierland. Betalingen, abonnementen en facturatie (bewaring conform fiscale bewaarplicht).

@PostHog Inc.@ Verenigde Staten, dataregio EU. Productanalyse en foutopsporing zoals in hoofdstuk 4 en 6. Gecertificeerd onder het EU-US Data Privacy Framework.

@Resend (Resend.com Inc.)@ Verenigde Staten. Transactionele e-mails; ontvangt alleen het e-mailadres en de inhoud van die e-mail.

@Upstash, Inc.@ Verenigde Staten. Rate-limiting van publieke endpoints; ontvangt je IP-adres of een gehashte vorm daarvan.

@Browser-push-providers@ Apple, Google, Mozilla, Microsoft: aflevering van push-berichten. Wij sturen alleen tekst die jij in je instellingen activeert.

Doorgifte naar landen buiten de EU gebeurt op basis van het EU-US Data Privacy Framework of modelcontractbepalingen (SCCs). Een actuele sub-verwerkerlijst is opvraagbaar via info@structuro.eu.

6. Cookies en lokale opslag

Wij plaatsen geen tracking-cookies zonder jouw toestemming. De volgende opslag gebruiken wij wel altijd, omdat de dienst zonder deze niet werkt:

Een Supabase-sessiecookie (HttpOnly, Secure, SameSite=Lax) voor ingelogd blijven.

localStorage-keys voor taalvoorkeur, je analytics-keuze, en (offline) taken die nog niet zijn gesynchroniseerd. Looptijd: tot je ze zelf wist of je account verwijdert.

Stripe plaatst tijdens de betaalflow eigen cookies voor fraudepreventie en sessiebeheer; deze zijn noodzakelijk voor de betaalfunctie en vallen onder Stripe's eigen privacybeleid (stripe.com/privacy).

Met jouw toestemming kan PostHog cookies en localStorage gebruiken om je sessie te herkennen en gebeurtenissen aan je account te koppelen. Zonder toestemming gebruiken wij cookieless modus: anonieme telling zonder persoonlijke koppeling. Je keuze stel je in via de cookiebanner bij je eerste bezoek, of later via Instellingen, toggle Anonieme productanalyse.

7. Bewaartermijnen

@Account- en planningsgegevens@ bewaard zolang je account actief is.

@Bij accountverwijdering@ via Instellingen verwijderen wij je accountgegevens, planning-data en cyclus-tracking direct uit de productieomgeving, en wissen wij je login-account. Wij houden een geanonimiseerde auditregistratie bij (zonder persoonsgegevens) voor beveiligingsdoeleinden. Back-ups bij Supabase worden binnen 30 dagen geroteerd; daarna zijn de gegevens ook daar verdwenen.

@Betaalhistorie@ factuur- en betaalgegevens worden door Stripe bewaard conform de fiscale bewaarplicht (zeven jaar), ook nadat je je Structuro-account verwijdert. Het gaat om factuurnummer, datum, bedrag, btw en gegevens die wettelijk op een factuur moeten staan; niet om planningsdata of vrije-tekstvelden.

@Server- en beveiligingslogs@ maximaal 30 dagen.

@Reminder-send-logs@ logregels van verstuurde dagstart-, lunch- en shutdown-reminders: maximaal 90 dagen.

@Productanalyse (PostHog)@ analytics-gebeurtenissen worden maximaal 12 maanden bewaard en daarna automatisch verwijderd.

8. Jouw rechten

Je hebt het recht om jouw gegevens in te zien, te laten corrigeren, te laten verwijderen, te laten beperken, over te dragen (dataportabiliteit), of bezwaar te maken tegen verwerking. Voor de meeste rechten kun je terecht in de app:

Inzien en bewerken: profielinstellingen en de tabbladen Taken, Dagstart, Dagafsluiter en Geparkeerd.

Verwijderen: Instellingen, knop 'Account verwijderen'.

Toestemming intrekken voor analytics: Instellingen, toggle 'Anonieme productanalyse'.

Toestemming intrekken voor cyclus-tracking: Instellingen, sectie 'Cyclus', toggle uitzetten.

Voor inzage-, correctie- of dataportabiliteitsverzoeken, en voor andere verzoeken die niet rechtstreeks in de app kunnen, mail info@structuro.eu. Wij reageren binnen 30 dagen. Je hebt ook het recht om een klacht in te dienen bij de Autoriteit Persoonsgegevens, via https://www.autoriteitpersoonsgegevens.nl/nl/zelf-doen/privacyrechten/klacht-indienen-bij-de-ap.

9. Beveiliging en datalekken

Wij gebruiken TLS, row-level security in de database, gescheiden service-role-sleutels, en rate-limiting op gevoelige endpoints. Bij een datalek dat een risico voor jou oplevert melden wij dit binnen 72 uur bij de Autoriteit Persoonsgegevens en, waar van toepassing, ook aan jou.

10. Wijzigingen

Dit beleid kan wijzigen. De geldige versie staat altijd op deze pagina. Belangrijke wijzigingen kondigen wij in de app aan.`;

export const privacyBodyEnV11 = `Scope. This policy applies to the Structuro web app (structuro.ai) and the website structuro.eu.

1. Who we are

Structuro is a service of Structuro AI, a sole proprietorship registered at Machinekamerplein 32-325, 5617AP Eindhoven, the Netherlands. Registered with the Dutch Chamber of Commerce under number 97938289. Privacy contact: info@structuro.eu. We are the controller for the data we process about you through the Structuro web app.

2. What data we process

@Account data@ email address, password hash, the name you set in your profile, timestamps of creation and last login, and (if you set it) your analytics choice.

@Planning and usage data@ tasks (title, deadline, priority, status, micro steps, estimated duration, energy level), day starts (energy and top-3 selection), wind-downs (completed tasks, energy, satisfaction, optional reflection text, optional notes), parked thoughts (free text you enter), focus sessions (start and end time, number of attempts per task), and daily aggregates such as completed tasks and total focus minutes.

@Cycle tracking (optional)@ only if you enable this feature in Settings, we process the start date of your last period, your average cycle length and menstruation duration, plus the date on which you gave consent. We use this data solely to colour your day-start context. You can turn the feature off at any time; the fields are then erased.

@Payment data@ we do not process full payment details ourselves. When you pay, you are redirected to our payment provider Stripe. We receive from Stripe only your payment status, subscription type, amount, and a tokenized reference to your payment method (no full card number or bank account).

@Notifications@ web push endpoints and encryption keys per browser or device (only when you enable notifications), and log records of sent reminders so we do not send duplicates.

@Technical data@ cookies and local storage for session handling, language preference, and your analytics choice (see chapter 6). Limited error and load logs at our infrastructure partner Supabase, only as needed for security and availability.

3. Special categories of personal data

In the parked thoughts and reflection fields you can enter free text. These may contain mental or health-related notes. Optional cycle tracking also falls under health data. We process these only because you enter them yourself or enable the feature yourself. We do not share these fields with third parties for analysis or training. We do not make automated decisions with legal effects on you. Suggestions in the app (such as top-3 selection or focus suggestions) are aids that you accept or ignore. You can erase this data at any time through the app.

4. Why we process this

We process personal data only on a valid lawful basis under the GDPR: performance of our contract with you, your consent, a legal obligation, or our legitimate interest (balanced against your interests).

@Account, sign-in and core functionality@ tasks, day start, wind-down, parked thoughts, focus: needed to deliver the service.

@Payment and billing@ needed to handle your subscription and keep records.

@Cycle tracking@ only with your consent via the toggle in Settings.

@Web push notifications@ only with your consent via browser or app; can be turned off in Settings.

@Product analytics (PostHog)@ only with your consent via the cookie banner and toggle in Settings. Without consent we only measure anonymously and cookieless.

@Error tracking and security@ technical error reports, rate limits and audit logs: needed to keep the service secure and available. We do not record the content of your tasks, parked thoughts or cycle tracking.

5. Processors

We use the parties below to process data on our behalf. We have a Data Processing Agreement with each of them.

@Supabase, Inc.@ database region EU (Stockholm). Database and authentication.

@Vercel Inc.@ United States. Web application (rendering, edge routing). Certified under the EU-US Data Privacy Framework.

@Stripe Payments Europe, Limited@ Ireland. Payments, subscriptions and billing (retention in line with statutory tax requirements).

@PostHog Inc.@ United States, data region EU. Product analytics and error tracking as described in chapters 4 and 6. Certified under the EU-US Data Privacy Framework.

@Resend (Resend.com Inc.)@ United States. Transactional emails; receives only the email address and content of that email.

@Upstash, Inc.@ United States. Rate-limiting of public endpoints; receives your IP address or a hashed form of it.

@Browser push providers@ Apple, Google, Mozilla, Microsoft: delivery of push messages. We only send text you activate in your settings.

Transfers to countries outside the EU are based on the EU-US Data Privacy Framework or Standard Contractual Clauses (SCCs). An up-to-date sub-processor list is available on request via info@structuro.eu.

6. Cookies and local storage

We place no tracking cookies without your consent. We always use the following storage because the service does not function without it:

A Supabase session cookie (HttpOnly, Secure, SameSite=Lax) to keep you signed in.

localStorage keys for language preference, your analytics choice, and (offline) tasks not yet synced. Lifetime: until you erase them yourself or delete your account.

Stripe places its own cookies during the payment flow for fraud prevention and session handling; these are necessary for the payment function and fall under Stripe's own privacy policy (stripe.com/privacy).

With your consent, PostHog may use cookies and localStorage to recognise your session and link events to your account. Without consent we use cookieless mode: anonymous counting without personal linkage. You set your choice via the cookie banner on your first visit, or later via Settings, toggle Anonymous product analytics.

7. Retention periods

@Account and planning data@ kept while your account is active.

@Upon account deletion@ via Settings we remove your account data, planning data and cycle tracking from the production environment immediately, and delete your login account. We keep an anonymised audit record (without personal data) for security purposes. Backups at Supabase are rotated within 30 days; after that the data is also gone there.

@Payment history@ invoice and payment data are retained by Stripe in accordance with statutory retention requirements (seven years), even after you delete your Structuro account. This covers invoice number, date, amount, VAT and data legally required on an invoice; not planning data or free-text fields.

@Server and security logs@ maximum 30 days.

@Reminder send logs@ log records of sent day-start, lunch and shutdown reminders: maximum 90 days.

@Product analytics (PostHog)@ analytics events are kept for a maximum of 12 months and then automatically deleted.

8. Your rights

You have the right to access, rectify, erase, restrict, port (data portability), or object to the processing of your data. For most rights you can use the app:

Access and edit: profile settings and the Tasks, Day start, Wind-down and Parked tabs.

Erase: Settings, button 'Delete account'.

Withdraw consent for analytics: Settings, toggle 'Anonymous product analytics'.

Withdraw consent for cycle tracking: Settings, Cycle section, turn the toggle off.

For access, rectification or data portability requests, and for other requests that cannot be made directly in the app, email info@structuro.eu. We respond within 30 days. You also have the right to lodge a complaint with the Dutch Data Protection Authority (Autoriteit Persoonsgegevens) via https://www.autoriteitpersoonsgegevens.nl/nl/zelf-doen/privacyrechten/klacht-indienen-bij-de-ap.

9. Security and data breaches

We use TLS, row-level security in the database, separated service-role keys, and rate limiting on sensitive endpoints. In case of a data breach that creates a risk for you, we report it to the Dutch Data Protection Authority within 72 hours and, where applicable, also to you.

10. Changes

This policy may change. The current version is always on this page. We announce significant changes in the app.`;

export const termsBodyNlV11 = `Toepassingsgebied. Deze voorwaarden gelden voor de Structuro-dienst, de webapp (structuro.ai) en de website structuro.eu.

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

7. Geld-terug-garantie van 14 dagen

Wij geven je 14 dagen vanaf je eerste betaling om Structuro te proberen. Ben je niet tevreden, om welke reden dan ook, dan krijg je je geld volledig terug. Geen formulieren, geen exit-vragenlijst, geen 'we missen je'-mails.

Hoe het werkt: stuur binnen 14 dagen na je eerste betaling een e-mail naar info@structuro.eu met het onderwerp 'Geld terug'. Je hoort binnen één werkdag terug. Het bedrag staat meestal binnen 5 tot 10 werkdagen op je rekening of creditcard.

Deze garantie geldt voor zowel het maand- als het jaarabonnement, en alleen voor je eerste betaling. Bij verlengingen na de eerste 14 dagen geldt de wettelijke regeling voor doorlopende abonnementen.

8. Wettelijk herroepingsrecht

Voor digitale diensten geldt in beginsel een wettelijk herroepingsrecht van 14 dagen (art. 6:230o BW). Bij aanmaak van je betaalde account vragen wij om jouw uitdrukkelijke toestemming dat wij meteen beginnen met de uitvoering, en bevestigen dat je daarmee afstand doet van het herroepingsrecht zodra de uitvoering is voltooid (art. 6:230p sub g BW).

Onze geld-terug-garantie van 14 dagen (zie artikel 7) gaat verder dan dit wettelijke recht: ook nadat de uitvoering is voltooid kun je binnen 14 dagen je geld volledig terugvragen.

9. Beëindiging

Je kunt de overeenkomst op elk moment beëindigen door je abonnement op te zeggen via Instellingen of per e-mail. Bij opzegging behoud je toegang tot het einde van de lopende factuurperiode. Wil je ook je account en gegevens verwijderen, gebruik dan Instellingen, knop 'Account verwijderen'.

Wij mogen de overeenkomst beëindigen met inachtneming van een redelijke termijn, behalve in gevallen van misbruik. Bij beëindiging vervallen de gebruiksrechten; de privacyparagraaf 'Bewaartermijnen' beschrijft wat er met je gegevens gebeurt.

10. Aansprakelijkheid

Wij zijn niet aansprakelijk voor schade die voortvloeit uit beslissingen die jij neemt op basis van suggesties in Structuro, voor schade door overmacht, en voor indirecte schade zoals gederfde winst, verlies van gegevens of immateriële schade, voor zover de wet dat toelaat. Onze totale aansprakelijkheid in een kalenderjaar is, voor zover de wet dat toelaat, beperkt tot het bedrag dat je in datzelfde jaar voor de dienst aan ons hebt betaald, met een minimum van EUR 50,-. Niets in deze voorwaarden beperkt of sluit aansprakelijkheid uit voor opzet of bewuste roekeloosheid van Structuro of haar leidinggevenden, voor dood of letsel, of in andere gevallen waarin de wet aansprakelijkheid dwingend voorschrijft (waaronder afdeling 6.5.3 BW voor consumenten).

11. Wijzigingen voorwaarden

Wij mogen deze voorwaarden wijzigen. Wezenlijke wijzigingen kondigen wij ten minste 30 dagen vooraf aan in de app of per e-mail; je kunt in dat geval je account beëindigen voordat de wijziging in werking treedt. Niet-wezenlijke wijzigingen (bijvoorbeeld redactionele verbeteringen) kunnen direct ingaan; de geldige versie en de datum staan altijd op deze pagina.

12. Klachten en geschillen

Heb je een klacht? Neem eerst contact met ons op via info@structuro.eu. Wij reageren binnen 14 dagen. Komen wij er niet samen uit, dan is de geschillenregeling op het ODR-platform van de Europese Commissie beschikbaar via https://ec.europa.eu/consumers/odr. Voor consumenten in Nederland is daarnaast de gewone civiele rechter bevoegd.

13. Toepasselijk recht

Op deze overeenkomst is Nederlands recht van toepassing. Voor zover de wet dat toelaat is de rechtbank in Eindhoven, Nederland, bevoegd om geschillen te beslechten. Een consument behoudt het recht zich te wenden tot de bevoegde rechter van zijn of haar woonplaats.`;

export const termsBodyEnV11 = `Scope. These terms apply to the Structuro service, the web app (structuro.ai) and the website structuro.eu.

1. Provider

Structuro is offered by Structuro AI, a sole proprietorship registered at Machinekamerplein 32-325, 5617AP Eindhoven, the Netherlands. Registered with the Dutch Chamber of Commerce under number 97938289 (establishment number 000063130475). Contact: info@structuro.eu.

2. What Structuro is, and is not

Structuro is a digital tool to help you plan your day, break down tasks, and support your focus. Structuro is expressly not a medical device, not a treatment, and not a substitute for care or advice from a doctor, psychiatrist, psychologist, or other healthcare professional. We do not provide a diagnosis for ADHD or any other condition. If you have doubts about your health or mental load, please consult a healthcare professional.

3. Account

You create an account to access the personalised features. You warrant that the data you provide is accurate, and you keep your sign-in credentials confidential. You may not transfer your account to third parties.

4. Use rules

You will not use Structuro for:

unlawful content, harassment, or unsafe content;

circumventing security measures or overloading the service (denial of service);

collecting data of others without permission.

In case of breach, we may restrict or terminate your account, after a warning where reasonably possible.

5. Availability

We strive for a reliable service but do not guarantee uninterrupted availability or flawless operation. We may schedule maintenance and security windows.

6. Price and subscription

Structuro is available as a monthly subscription of €12.99 per month or an annual subscription of €119 per year (equivalent to €9.92 per month). Prices include VAT where applicable.

Your subscription starts when payment succeeds. The monthly subscription renews automatically each month until you cancel. The annual subscription renews automatically each year until you cancel. You can cancel at any time via Settings, button 'Cancel subscription', or by email to info@structuro.eu. After cancellation you keep access until the end of the current billing period.

We may change prices. We announce significant price changes at least 30 days in advance by email. You may then cancel your subscription before the change takes effect.

7. 14-day money-back guarantee

We give you 14 days from your first payment to try Structuro. If you are not satisfied, for any reason, you receive a full refund. No forms, no exit survey, no 'we miss you' emails.

How it works: within 14 days of your first payment, email info@structuro.eu with the subject 'Refund'. We reply within one business day. The amount usually returns within 5 to 10 business days to your bank account or credit card.

This guarantee applies to both the monthly and annual subscription, and only to your first payment. For renewals after the first 14 days, the statutory rules for ongoing subscriptions apply.

8. Statutory right of withdrawal

For digital services, a statutory 14-day right of withdrawal applies in principle (art. 6:230o Dutch Civil Code). When you create your paid account, we ask for your express consent that we begin performance immediately, and confirm that you thereby waive your right of withdrawal once performance has been completed (art. 6:230p sub g Dutch Civil Code).

Our 14-day money-back guarantee (see article 7) goes further than this statutory right: even after performance has been completed, you can request a full refund within 14 days.

9. Termination

You may terminate the contract at any time by cancelling your subscription via Settings or by email. After cancellation you keep access until the end of the current billing period. To also delete your account and data, use Settings, button 'Delete account'.

We may terminate the contract subject to a reasonable notice period, except in cases of misuse. Upon termination, the rights of use end; the privacy section 'Retention periods' describes what happens to your data.

10. Liability

We are not liable for damage arising from decisions you make based on suggestions in Structuro, for damage due to force majeure, or for indirect damage such as lost profits, loss of data, or non-material damage, to the extent permitted by law. Our total liability in a calendar year is, to the extent permitted by law, limited to the amount you have paid us for the service in the same year, with a minimum of EUR 50. Nothing in these terms limits or excludes liability for intent or wilful recklessness of Structuro or its directors, for death or personal injury, or in any other cases where the law mandates liability (including section 6.5.3 Dutch Civil Code for consumers).

11. Changes to these terms

We may change these terms. We announce significant changes at least 30 days in advance in the app or by email; you may then terminate your account before the change takes effect. Non-significant changes (for example editorial improvements) may take effect immediately; the current version is always on this page.

12. Complaints and disputes

Have a complaint? First contact us via info@structuro.eu. We respond within 14 days. If we cannot resolve it together, the dispute resolution platform of the European Commission is available via https://ec.europa.eu/consumers/odr. For consumers in the Netherlands, the regular civil court is also competent.

13. Applicable law

Dutch law applies to this contract. To the extent permitted by law, the court in Eindhoven, the Netherlands, has jurisdiction to settle disputes. A consumer retains the right to bring proceedings before the competent court of his or her place of residence.`;
