import type { Locale } from "@/lib/i18n/types";

/** Zelfde energie-bakken als V2Energy; lokaal om circulaire imports te vermijden. */
export type V2ThingEnergy = "low" | "enough" | "high";

export type V2ThingSuggestion = { title: string; energy: V2ThingEnergy };

/**
 * Canonieke contentbank voor Structuro-voorstellen (NL/EN).
 * 100 items; app varieert via dag-seed. Obsidian spiegelt voor redactie.
 */
export type V2ThingBankItem = {
  id: string;
  energy: V2ThingEnergy;
  title: Record<Locale, string>;
  microSteps: Record<Locale, string[]>;
  /** Zware onderwerpen: niet als default-pick, wel "Mag later" in adjust. */
  anxiety?: boolean;
};

export const V2_THING_BANK: readonly V2ThingBankItem[] = [
  {
    id: "glass-of-water",
    energy: "low",
    title: {
      nl: "Eén glas water pakken",
      en: "Grab a glass of water",
    },
    microSteps: {
      nl: ["Glas of fles pakken", "Vullen", "Opdrinken"],
      en: ["Grab a glass or bottle", "Fill it", "Drink it"],
    },
  },
  {
    id: "reply-one-message",
    energy: "low",
    title: {
      nl: "Eén bericht beantwoorden",
      en: "Reply to one message",
    },
    microSteps: {
      nl: ["Bericht openen", "Korte reactie typen", "Versturen"],
      en: ["Open the message", "Type a short reply", "Send"],
    },
  },
  {
    id: "tidy-two-minutes",
    energy: "low",
    title: {
      nl: "Twee minuten opruimen",
      en: "Tidy for two minutes",
    },
    microSteps: {
      nl: ["Eén oppervlak kiezen", "Alles wat weg kan wegleggen", "Stoppen na twee minuten"],
      en: ["Pick one surface", "Put away what can go", "Stop after two minutes"],
    },
  },
  {
    id: "open-window",
    energy: "low",
    title: {
      nl: "Raam openzetten",
      en: "Open a window",
    },
    microSteps: {
      nl: ["Raam kiezen", "Openzetten", "Even frisse lucht nemen"],
      en: ["Pick a window", "Open it", "Take a breath of fresh air"],
    },
  },
  {
    id: "stretch-shoulders",
    energy: "low",
    title: {
      nl: "Schouders losschudden",
      en: "Shake out your shoulders",
    },
    microSteps: {
      nl: ["Opstaan of rechtop zitten", "Schouders omhoog en los", "Nog één keer"],
      en: ["Stand or sit upright", "Lift and drop shoulders", "Do it once more"],
    },
  },
  {
    id: "wash-face",
    energy: "low",
    title: {
      nl: "Gezicht wassen",
      en: "Wash your face",
    },
    microSteps: {
      nl: ["Naar de wasbak", "Water aan", "Gezicht spoelen en afdrogen"],
      en: ["Go to the sink", "Turn on water", "Rinse and dry your face"],
    },
  },
  {
    id: "put-on-socks",
    energy: "low",
    title: {
      nl: "Sokken aantrekken",
      en: "Put on socks",
    },
    microSteps: {
      nl: ["Sokken pakken", "Aantrekken", "Klaar"],
      en: ["Grab socks", "Put them on", "Done"],
    },
  },
  {
    id: "charge-phone",
    energy: "low",
    title: {
      nl: "Telefoon aan de lader",
      en: "Put your phone on charge",
    },
    microSteps: {
      nl: ["Lader zoeken", "Telefoon aansluiten", "Telefoon even wegleggen"],
      en: ["Find the charger", "Plug the phone in", "Set the phone aside"],
    },
  },
  {
    id: "drink-tea",
    energy: "low",
    title: {
      nl: "Kop thee zetten",
      en: "Make a cup of tea",
    },
    microSteps: {
      nl: ["Water koken of zetten", "Thee erbij", "Even laten trekken"],
      en: ["Boil or heat water", "Add tea", "Let it steep briefly"],
    },
  },
  {
    id: "one-dish",
    energy: "low",
    title: {
      nl: "Eén bord aftassen",
      en: "Wash one dish",
    },
    microSteps: {
      nl: ["Bord of beker pakken", "Spoelen of in de machine", "Stoppen bij één"],
      en: ["Pick a plate or cup", "Rinse or load it", "Stop at one"],
    },
  },
  {
    id: "make-bed-corner",
    energy: "low",
    title: {
      nl: "Bedhoek rechttrekken",
      en: "Straighten one corner of the bed",
    },
    microSteps: {
      nl: ["Bedhoek kiezen", "Laken of deken trekken", "Kussen rechtzetten"],
      en: ["Pick a corner", "Pull the sheet or duvet", "Fix the pillow"],
    },
  },
  {
    id: "open-curtains",
    energy: "low",
    title: {
      nl: "Gordijnen openen",
      en: "Open the curtains",
    },
    microSteps: {
      nl: ["Naar het raam", "Gordijn opzij", "Licht binnenlaten"],
      en: ["Go to the window", "Pull the curtain aside", "Let light in"],
    },
  },
  {
    id: "write-one-line",
    energy: "low",
    title: {
      nl: "Eén zin opschrijven",
      en: "Write one sentence",
    },
    microSteps: {
      nl: ["Notitie openen", "Eén zin typen of schrijven", "Opslaan of dichtklappen"],
      en: ["Open a note", "Type or write one sentence", "Save or close"],
    },
  },
  {
    id: "delete-one-mail",
    energy: "low",
    title: {
      nl: "Eén mail weggooien",
      en: "Delete one email",
    },
    microSteps: {
      nl: ["Inbox openen", "Eén mail kiezen", "Verwijderen of archiveren"],
      en: ["Open inbox", "Pick one email", "Delete or archive"],
    },
  },
  {
    id: "breathe-three",
    energy: "low",
    title: {
      nl: "Drie keer diep ademhalen",
      en: "Take three deep breaths",
    },
    microSteps: {
      nl: ["Stilzitten", "Inademen door de neus", "Drie keer uitademen"],
      en: ["Sit still", "Breathe in through your nose", "Exhale three times"],
    },
  },
  {
    id: "fill-water-bottle",
    energy: "low",
    title: {
      nl: "Bidon vullen",
      en: "Fill your water bottle",
    },
    microSteps: {
      nl: ["Bidon pakken", "Kraan open", "Vullen en dichtdoen"],
      en: ["Grab the bottle", "Turn on the tap", "Fill and close"],
    },
  },
  {
    id: "plug-headphones",
    energy: "low",
    title: {
      nl: "Koptelefoon klaarleggen",
      en: "Set headphones ready",
    },
    microSteps: {
      nl: ["Koptelefoon zoeken", "Klaarleggen bij je", "Klaar"],
      en: ["Find headphones", "Place them near you", "Ready"],
    },
  },
  {
    id: "one-plant-water",
    energy: "low",
    title: {
      nl: "Eén plant water geven",
      en: "Water one plant",
    },
    microSteps: {
      nl: ["Plant kiezen", "Beetje water geven", "Gieter wegzetten"],
      en: ["Pick a plant", "Give a little water", "Put the watering can away"],
    },
  },
  {
    id: "tie-hair",
    energy: "low",
    title: {
      nl: "Haar vastbinden",
      en: "Tie your hair back",
    },
    microSteps: {
      nl: ["Elastiekje pakken", "Haar bij elkaar", "Vastzetten"],
      en: ["Grab a hair tie", "Gather your hair", "Secure it"],
    },
  },
  {
    id: "shoes-by-door",
    energy: "low",
    title: {
      nl: "Schoenen bij de deur zetten",
      en: "Put shoes by the door",
    },
    microSteps: {
      nl: ["Schoenen pakken", "Bij de deur zetten", "Klaar"],
      en: ["Grab shoes", "Place by the door", "Done"],
    },
  },
  {
    id: "close-tabs",
    energy: "low",
    title: {
      nl: "Drie tabs sluiten",
      en: "Close three tabs",
    },
    microSteps: {
      nl: ["Browser openen", "Drie tabs kiezen", "Sluiten"],
      en: ["Open the browser", "Pick three tabs", "Close them"],
    },
  },
  {
    id: "mute-chat",
    energy: "low",
    title: {
      nl: "Eén chat dempen",
      en: "Mute one chat",
    },
    microSteps: {
      nl: ["Chat openen", "Dempen kiezen", "Bevestigen"],
      en: ["Open the chat", "Choose mute", "Confirm"],
    },
  },
  {
    id: "snack-fruit",
    energy: "low",
    title: {
      nl: "Stuk fruit pakken",
      en: "Grab a piece of fruit",
    },
    microSteps: {
      nl: ["Fruit kiezen", "Wassen of schillen", "Opeten of klaarzetten"],
      en: ["Pick fruit", "Wash or peel", "Eat or set aside"],
    },
  },
  {
    id: "sit-outside-2",
    energy: "low",
    title: {
      nl: "Twee minuten buiten zitten",
      en: "Sit outside for two minutes",
    },
    microSteps: {
      nl: ["Naar buiten", "Ergens gaan zitten", "Twee minuten blijven"],
      en: ["Step outside", "Sit somewhere", "Stay two minutes"],
    },
  },
  {
    id: "apply-lipbalm",
    energy: "low",
    title: {
      nl: "Lippenbalsem doen",
      en: "Put on lip balm",
    },
    microSteps: {
      nl: ["Balsem pakken", "Aanbrengen", "Wegleggen"],
      en: ["Grab the balm", "Apply", "Put it away"],
    },
  },
  {
    id: "fold-one-shirt",
    energy: "low",
    title: {
      nl: "Eén shirt vouwen",
      en: "Fold one shirt",
    },
    microSteps: {
      nl: ["Shirt pakken", "Vouwen", "Op een stapel leggen"],
      en: ["Pick a shirt", "Fold it", "Place on a pile"],
    },
  },
  {
    id: "set-timer-5",
    energy: "low",
    title: {
      nl: "Timer op vijf minuten",
      en: "Set a five-minute timer",
    },
    microSteps: {
      nl: ["Timer openen", "Vijf minuten zetten", "Starten"],
      en: ["Open a timer", "Set five minutes", "Start"],
    },
  },
  {
    id: "name-feeling",
    energy: "low",
    title: {
      nl: "Gevoel in één woord",
      en: "Name your feeling in one word",
    },
    microSteps: {
      nl: ["Even stilstaan", "Eén woord kiezen", "Opschrijven of hardop zeggen"],
      en: ["Pause briefly", "Pick one word", "Write or say it out loud"],
    },
  },
  {
    id: "text-im-ok",
    energy: "low",
    title: {
      nl: "Kort: ik ben oké sturen",
      en: "Send a short \"I am okay\"",
    },
    microSteps: {
      nl: ["Chat openen", "Korte zin typen", "Versturen"],
      en: ["Open a chat", "Type a short line", "Send"],
    },
  },
  {
    id: "clear-nightstand",
    energy: "low",
    title: {
      nl: "Nachtkastje leegvegen",
      en: "Clear the nightstand surface",
    },
    microSteps: {
      nl: ["Spullen opstapelen", "Oppervlak afnemen", "Eén ding terugleggen"],
      en: ["Stack items", "Wipe the surface", "Put one thing back"],
    },
  },
  {
    id: "refill-meds-box",
    energy: "low",
    title: {
      nl: "Medicatie-doosje checken",
      en: "Check your meds box",
    },
    microSteps: {
      nl: ["Doosje openen", "Checken wat erin zit", "Dichtklappen"],
      en: ["Open the box", "Check what is inside", "Close it"],
    },
  },
  {
    id: "one-compliment",
    energy: "low",
    title: {
      nl: "Jezelf één compliment geven",
      en: "Give yourself one compliment",
    },
    microSteps: {
      nl: ["Iets noemen dat oké ging", "Hardop of opschrijven", "Door"],
      en: ["Name one okay thing", "Say or write it", "Move on"],
    },
  },
  {
    id: "brush-teeth-soft",
    energy: "low",
    title: {
      nl: "Tanden poetsen (zacht)",
      en: "Brush teeth gently",
    },
    microSteps: {
      nl: ["Tandenborstel pakken", "Poetsen", "Spoelen"],
      en: ["Grab toothbrush", "Brush", "Rinse"],
    },
  },
  {
    id: "change-shirt",
    energy: "low",
    title: {
      nl: "Schoon shirt aantrekken",
      en: "Put on a clean shirt",
    },
    microSteps: {
      nl: ["Schoon shirt pakken", "Oude uit", "Nieuwe aan"],
      en: ["Grab a clean shirt", "Take the old one off", "Put the new one on"],
    },
  },
  {
    id: "light-candle",
    energy: "low",
    title: {
      nl: "Kaars of lamp aan",
      en: "Light a candle or lamp",
    },
    microSteps: {
      nl: ["Kaars of lamp kiezen", "Aansteken of aandoen", "Even kijken"],
      en: ["Pick candle or lamp", "Light or switch on", "Take a look"],
    },
  },
  {
    id: "inbox-star-one",
    energy: "low",
    title: {
      nl: "Eén mail sterren",
      en: "Star one email",
    },
    microSteps: {
      nl: ["Inbox openen", "Eén mail kiezen", "Ster zetten"],
      en: ["Open inbox", "Pick one email", "Add a star"],
    },
  },
  {
    id: "pack-bag-one",
    energy: "low",
    title: {
      nl: "Eén ding in je tas",
      en: "Put one thing in your bag",
    },
    microSteps: {
      nl: ["Tas openen", "Eén ding erin", "Dicht"],
      en: ["Open the bag", "Put one thing in", "Close it"],
    },
  },
  {
    id: "stand-up-once",
    energy: "low",
    title: {
      nl: "Eén keer opstaan",
      en: "Stand up once",
    },
    microSteps: {
      nl: ["Stoel loslaten", "Opstaan", "Even blijven staan"],
      en: ["Leave the chair", "Stand up", "Stay standing briefly"],
    },
  },
  {
    id: "save-draft",
    energy: "low",
    title: {
      nl: "Concept opslaan",
      en: "Save a draft",
    },
    microSteps: {
      nl: ["Document openen", "Opslaan klikken", "Dicht"],
      en: ["Open the document", "Hit save", "Close"],
    },
  },
  {
    id: "pet-or-plant",
    energy: "low",
    title: {
      nl: "Huisdier of plant even checken",
      en: "Check on a pet or plant",
    },
    microSteps: {
      nl: ["Naartoe lopen", "Even kijken of aaien", "Terug"],
      en: ["Walk over", "Look or pet briefly", "Return"],
    },
  },
  {
    id: "send-one-email",
    energy: "enough",
    title: {
      nl: "Die ene mail versturen",
      en: "Send that one email",
    },
    microSteps: {
      nl: ["Mail openen of nieuw beginnen", "Kernzin schrijven", "Versturen"],
      en: ["Open or start the email", "Write the key line", "Send"],
    },
  },
  {
    id: "tidy-ten-minutes",
    energy: "enough",
    title: {
      nl: "Tien minuten opruimen",
      en: "Tidy for ten minutes",
    },
    microSteps: {
      nl: ["Starttimer of telefoon wegleggen", "Eén zone opruimen", "Klaar zetten wat blijft liggen"],
      en: ["Set a timer or put the phone away", "Tidy one zone", "Park what stays for later"],
    },
  },
  {
    id: "short-walk",
    energy: "enough",
    title: {
      nl: "Een blokje om",
      en: "Take a short walk",
    },
    microSteps: {
      nl: ["Schoenen aan", "Naar buiten", "Terugkomen zonder haast"],
      en: ["Put shoes on", "Step outside", "Come back without rushing"],
    },
  },
  {
    id: "laundry-start",
    energy: "enough",
    title: {
      nl: "Was starten",
      en: "Start a load of laundry",
    },
    microSteps: {
      nl: ["Was bij elkaar rapen", "In de machine", "Programma starten"],
      en: ["Gather laundry", "Load the machine", "Start the cycle"],
    },
  },
  {
    id: "grocery-list-3",
    energy: "enough",
    title: {
      nl: "Boodschappenlijst: drie dingen",
      en: "Grocery list: three items",
    },
    microSteps: {
      nl: ["Lijst openen", "Drie dingen opschrijven", "Opslaan"],
      en: ["Open the list", "Write three items", "Save"],
    },
  },
  {
    id: "call-back-one",
    energy: "enough",
    title: {
      nl: "Eén gemiste oproep terugbellen",
      en: "Return one missed call",
    },
    microSteps: {
      nl: ["Lijst openen", "Nummer kiezen", "Bellen of appen"],
      en: ["Open the list", "Pick a number", "Call or message"],
    },
  },
  {
    id: "prep-lunch",
    energy: "enough",
    title: {
      nl: "Lunch klaarzetten",
      en: "Prep lunch",
    },
    microSteps: {
      nl: ["Ingrediënten pakken", "Klaarmaken", "Inpakken of neerzetten"],
      en: ["Grab ingredients", "Prepare", "Pack or set out"],
    },
  },
  {
    id: "calendar-tomorrow",
    energy: "enough",
    title: {
      nl: "Morgen in agenda checken",
      en: "Check tomorrow in your calendar",
    },
    microSteps: {
      nl: ["Agenda openen", "Morgen aanklikken", "Eén notitie zetten indien nodig"],
      en: ["Open calendar", "Open tomorrow", "Add one note if needed"],
    },
  },
  {
    id: "pay-one-bill",
    energy: "enough",
    title: {
      nl: "Eén rekening openen (alleen kijken)",
      en: "Open one bill (just look)",
    },
    microSteps: {
      nl: ["Mail of app openen", "Rekening openen", "Sluiten of markeren"],
      en: ["Open mail or app", "Open the bill", "Close or mark it"],
    },
  },
  {
    id: "shower",
    energy: "enough",
    title: {
      nl: "Douchen",
      en: "Take a shower",
    },
    microSteps: {
      nl: ["Douche aanzetten", "Wassen", "Afdrogen"],
      en: ["Start the shower", "Wash", "Dry off"],
    },
  },
  {
    id: "dishes-sink",
    energy: "enough",
    title: {
      nl: "Afwasserbak leegmaken",
      en: "Clear the dish sink",
    },
    microSteps: {
      nl: ["Spullen sorteren", "Spoelen of in machine", "Aanrecht afvegen"],
      en: ["Sort items", "Rinse or load", "Wipe the counter"],
    },
  },
  {
    id: "reply-two-mails",
    energy: "enough",
    title: {
      nl: "Twee mails beantwoorden",
      en: "Reply to two emails",
    },
    microSteps: {
      nl: ["Eerste mail", "Kort antwoorden", "Tweede mail kort"],
      en: ["First email", "Short reply", "Second email briefly"],
    },
  },
  {
    id: "plan-outfit",
    energy: "enough",
    title: {
      nl: "Outfit voor morgen klaarleggen",
      en: "Lay out tomorrow outfit",
    },
    microSteps: {
      nl: ["Kleding kiezen", "Klaarleggen", "Schoenen erbij"],
      en: ["Pick clothes", "Lay them out", "Add shoes"],
    },
  },
  {
    id: "vacuum-one-room",
    energy: "enough",
    title: {
      nl: "Eén kamer stofzuigen",
      en: "Vacuum one room",
    },
    microSteps: {
      nl: ["Stofzuiger pakken", "Eén kamer", "Terugzetten"],
      en: ["Get the vacuum", "Do one room", "Put it back"],
    },
  },
  {
    id: "water-plants",
    energy: "enough",
    title: {
      nl: "Planten water geven",
      en: "Water the plants",
    },
    microSteps: {
      nl: ["Gieter vullen", "Ronde maken", "Gieter wegzetten"],
      en: ["Fill watering can", "Do the round", "Put it away"],
    },
  },
  {
    id: "update-cv-line",
    energy: "enough",
    title: {
      nl: "Eén regel op je CV",
      en: "Add one line to your CV",
    },
    microSteps: {
      nl: ["CV openen", "Eén regel toevoegen", "Opslaan"],
      en: ["Open CV", "Add one line", "Save"],
    },
  },
  {
    id: "book-appointment-slot",
    energy: "enough",
    title: {
      nl: "Tijdslot voor afspraak zoeken",
      en: "Find a time slot for an appointment",
    },
    microSteps: {
      nl: ["Agenda openen", "Vrije momenten scannen", "Eén optie noteren"],
      en: ["Open calendar", "Scan free times", "Note one option"],
    },
  },
  {
    id: "meal-plan-tonight",
    energy: "enough",
    title: {
      nl: "Avondeten kiezen",
      en: "Choose dinner",
    },
    microSteps: {
      nl: ["Opties bedenken", "Eén kiezen", "Ingrediënten checken"],
      en: ["Think of options", "Pick one", "Check ingredients"],
    },
  },
  {
    id: "sort-paper-pile",
    energy: "enough",
    title: {
      nl: "Papierenstapel: vijf vellen",
      en: "Paper pile: five sheets",
    },
    microSteps: {
      nl: ["Stapel pakken", "Vijf vellen sorteren", "Rest laten liggen"],
      en: ["Grab the pile", "Sort five sheets", "Leave the rest"],
    },
  },
  {
    id: "stretch-10",
    energy: "enough",
    title: {
      nl: "Tien minuten stretchen",
      en: "Stretch for ten minutes",
    },
    microSteps: {
      nl: ["Mat of vloer", "Drie stretches", "Klaar wanneer timer gaat"],
      en: ["Mat or floor", "Three stretches", "Stop when timer ends"],
    },
  },
  {
    id: "pack-tomorrow-bag",
    energy: "enough",
    title: {
      nl: "Tas voor morgen inpakken",
      en: "Pack tomorrow bag",
    },
    microSteps: {
      nl: ["Tas leegmaken of openen", "Nodige dingen erin", "Dicht"],
      en: ["Open or empty bag", "Add needed items", "Close"],
    },
  },
  {
    id: "clean-desk",
    energy: "enough",
    title: {
      nl: "Bureau opruimen",
      en: "Clear your desk",
    },
    microSteps: {
      nl: ["Spullen groeperen", "Afval weg", "Eén schoon vlak maken"],
      en: ["Group items", "Trash out", "Make one clear surface"],
    },
  },
  {
    id: "message-friend",
    energy: "enough",
    title: {
      nl: "Kort bericht naar vriend",
      en: "Short message to a friend",
    },
    microSteps: {
      nl: ["Chat openen", "Eén zin", "Versturen"],
      en: ["Open chat", "One sentence", "Send"],
    },
  },
  {
    id: "review-photos-5",
    energy: "enough",
    title: {
      nl: "Vijf foto's opruimen",
      en: "Clean up five photos",
    },
    microSteps: {
      nl: ["Album openen", "Vijf kiezen", "Verwijderen of album"],
      en: ["Open album", "Pick five", "Delete or file"],
    },
  },
  {
    id: "bike-pump",
    energy: "enough",
    title: {
      nl: "Fietsbanden checken",
      en: "Check bike tires",
    },
    microSteps: {
      nl: ["Fiets pakken", "Band indrukken", "Oppompen indien nodig"],
      en: ["Get the bike", "Squeeze tires", "Pump if needed"],
    },
  },
  {
    id: "cook-simple",
    energy: "enough",
    title: {
      nl: "Eenvoudig iets koken",
      en: "Cook something simple",
    },
    microSteps: {
      nl: ["Recept of idee kiezen", "Pannen op", "Klaarmaken tot eetbaar"],
      en: ["Pick a recipe or idea", "Pans on", "Cook until edible"],
    },
  },
  {
    id: "inbox-zero-10",
    energy: "enough",
    title: {
      nl: "Tien minuten inbox",
      en: "Ten minutes in inbox",
    },
    microSteps: {
      nl: ["Timer zetten", "Van oud naar nieuw", "Stoppen bij timer"],
      en: ["Set timer", "Oldest first", "Stop at timer"],
    },
  },
  {
    id: "return-package",
    energy: "enough",
    title: {
      nl: "Retourlabel printen of klaarzetten",
      en: "Print or prep a return label",
    },
    microSteps: {
      nl: ["Bestelling opzoeken", "Label openen", "Printen of opslaan"],
      en: ["Find the order", "Open label", "Print or save"],
    },
  },
  {
    id: "meds-refill-request",
    energy: "enough",
    title: {
      nl: "Herhaalrecept aanvragen",
      en: "Request a prescription refill",
    },
    microSteps: {
      nl: ["App of telefoon", "Aanvraag starten", "Bevestiging noteren"],
      en: ["App or phone", "Start request", "Note confirmation"],
    },
  },
  {
    id: "budget-look",
    energy: "enough",
    title: {
      nl: "Saldo even checken",
      en: "Check your balance briefly",
    },
    microSteps: {
      nl: ["Bank-app openen", "Saldo bekijken", "Sluiten zonder diep te duiken"],
      en: ["Open banking app", "View balance", "Close without diving deep"],
    },
  },
  {
    id: "learn-10",
    energy: "enough",
    title: {
      nl: "Tien minuten leren",
      en: "Learn for ten minutes",
    },
    microSteps: {
      nl: ["Cursus of video openen", "Timer", "Stoppen bij genoeg"],
      en: ["Open course or video", "Timer", "Stop when enough"],
    },
  },
  {
    id: "wash-bedding-start",
    energy: "enough",
    title: {
      nl: "Beddengoed in de was",
      en: "Start bedding laundry",
    },
    microSteps: {
      nl: ["Bed aftrekken", "In machine", "Starten"],
      en: ["Strip the bed", "Into machine", "Start"],
    },
  },
  {
    id: "declutter-bag",
    energy: "enough",
    title: {
      nl: "Tas uitruimen",
      en: "Empty your bag",
    },
    microSteps: {
      nl: ["Alles eruit", "Afval weg", "Nodige dingen terug"],
      en: ["Everything out", "Trash away", "Put needed items back"],
    },
  },
  {
    id: "plan-focus-block",
    energy: "enough",
    title: {
      nl: "Eén focusblok in agenda",
      en: "Block one focus slot",
    },
    microSteps: {
      nl: ["Agenda openen", "Blok zetten", "Titel: focus"],
      en: ["Open calendar", "Add block", "Title: focus"],
    },
  },
  {
    id: "walk-errand",
    energy: "enough",
    title: {
      nl: "Korte boodschap te voet",
      en: "Short walking errand",
    },
    microSteps: {
      nl: ["Schoenen en tas", "Heen", "Terug zonder omwegen"],
      en: ["Shoes and bag", "Go", "Return without detours"],
    },
  },
  {
    id: "start-one-project",
    energy: "high",
    title: {
      nl: "Aan dat ene project beginnen",
      en: "Start that one project",
    },
    microSteps: {
      nl: ["Project openen", "Eerste kleine zet zetten", "Opschrijven wat je deed"],
      en: ["Open the project", "Make the first small move", "Note what you did"],
    },
  },
  {
    id: "clear-admin",
    energy: "high",
    title: {
      nl: "Administratie wegwerken",
      en: "Clear some admin",
    },
    microSteps: {
      nl: ["Map of mail openen", "Eén ding afhandelen", "Rest voor later zetten"],
      en: ["Open the folder or mail", "Handle one item", "Park the rest for later"],
    },
  },
  {
    id: "schedule-appointment",
    energy: "high",
    title: {
      nl: "Een afspraak inplannen",
      en: "Schedule an appointment",
    },
    microSteps: {
      nl: ["Agenda openen", "Moment kiezen", "Uitnodiging of notitie zetten"],
      en: ["Open the calendar", "Pick a time", "Add invite or note"],
    },
  },
  {
    id: "deep-work-25",
    energy: "high",
    title: {
      nl: "Vijfentwintig minuten diep werk",
      en: "Twenty-five minutes of deep work",
    },
    microSteps: {
      nl: ["Timer zetten", "Eén taak openen", "Doorgaan tot timer"],
      en: ["Set timer", "Open one task", "Continue until timer"],
    },
  },
  {
    id: "finish-draft",
    energy: "high",
    title: {
      nl: "Concept afronden",
      en: "Finish a draft",
    },
    microSteps: {
      nl: ["Document openen", "Laatste gaten vullen", "Opslaan als klaar-genoeg"],
      en: ["Open document", "Fill last gaps", "Save as good enough"],
    },
  },
  {
    id: "send-proposal",
    energy: "high",
    title: {
      nl: "Voorstel of offerte versturen",
      en: "Send a proposal or quote",
    },
    microSteps: {
      nl: ["Bestand openen", "Checken", "Versturen"],
      en: ["Open the file", "Quick check", "Send"],
    },
  },
  {
    id: "meeting-prep",
    energy: "high",
    title: {
      nl: "Vergadering voorbereiden",
      en: "Prep for a meeting",
    },
    microSteps: {
      nl: ["Agenda of notities openen", "Drie punten schrijven", "Link of docs klaarzetten"],
      en: ["Open agenda or notes", "Write three points", "Prep links or docs"],
    },
  },
  {
    id: "code-or-build",
    energy: "high",
    title: {
      nl: "Bouwen of coderen: eerste commit",
      en: "Build or code: first commit",
    },
    microSteps: {
      nl: ["Project openen", "Kleine wijziging", "Opslaan of committen"],
      en: ["Open project", "Small change", "Save or commit"],
    },
  },
  {
    id: "write-page",
    energy: "high",
    title: {
      nl: "Eén pagina schrijven",
      en: "Write one page",
    },
    microSteps: {
      nl: ["Document openen", "Schrijven zonder editen", "Stoppen bij één pagina"],
      en: ["Open document", "Write without editing", "Stop at one page"],
    },
  },
  {
    id: "clean-kitchen",
    energy: "high",
    title: {
      nl: "Keuken grondig opruimen",
      en: "Deep-clean the kitchen",
    },
    microSteps: {
      nl: ["Aanrecht leeg", "Afwassen of machine", "Vloer of doekjes"],
      en: ["Clear counters", "Dishes or machine", "Floor or wipe-down"],
    },
  },
  {
    id: "budget-review",
    energy: "high",
    title: {
      nl: "Uitgaven van de week scannen",
      en: "Scan this week spending",
    },
    microSteps: {
      nl: ["Bank-app of sheet", "Week filteren", "Eén inzicht noteren"],
      en: ["Bank app or sheet", "Filter the week", "Note one insight"],
    },
  },
  {
    id: "apply-one-job",
    energy: "high",
    title: {
      nl: "Eén sollicitatie versturen",
      en: "Send one job application",
    },
    microSteps: {
      nl: ["Vacature openen", "CV of brief checken", "Versturen"],
      en: ["Open the listing", "Check CV or letter", "Submit"],
    },
  },
  {
    id: "study-block",
    energy: "high",
    title: {
      nl: "Studieblok van een half uur",
      en: "Half-hour study block",
    },
    microSteps: {
      nl: ["Materiaal openen", "Timer dertig", "Samenvatting in drie zinnen"],
      en: ["Open materials", "Thirty-minute timer", "Three-sentence summary"],
    },
  },
  {
    id: "client-followup",
    energy: "high",
    title: {
      nl: "Klant of collega opvolgen",
      en: "Follow up with client or colleague",
    },
    microSteps: {
      nl: ["Naam kiezen", "Korte update typen", "Versturen"],
      en: ["Pick a name", "Type a short update", "Send"],
    },
  },
  {
    id: "home-admin",
    energy: "high",
    title: {
      nl: "Huishoudelijke admin rondmaken",
      en: "Finish household admin",
    },
    microSteps: {
      nl: ["Lijstje openen", "Twee items afhandelen", "Rest plannen"],
      en: ["Open the list", "Handle two items", "Plan the rest"],
    },
  },
  {
    id: "workout",
    energy: "high",
    title: {
      nl: "Training of bewegingssessie",
      en: "Workout or movement session",
    },
    microSteps: {
      nl: ["Kleren/schoenen", "Starten", "Afronden zonder perfectie"],
      en: ["Clothes or shoes", "Start", "Finish without perfection"],
    },
  },
  {
    id: "presentation-outline",
    energy: "high",
    title: {
      nl: "Presentatie-outline maken",
      en: "Make a presentation outline",
    },
    microSteps: {
      nl: ["Nieuw document", "Vijf kopjes", "Opslaan"],
      en: ["New document", "Five headings", "Save"],
    },
  },
  {
    id: "fix-bug",
    energy: "high",
    title: {
      nl: "Die ene bug of fout fixen",
      en: "Fix that one bug or error",
    },
    microSteps: {
      nl: ["Issue openen", "Reproduceer kort", "Fix of notitie zetten"],
      en: ["Open the issue", "Reproduce briefly", "Fix or note"],
    },
  },
  {
    id: "declutter-closet",
    energy: "high",
    title: {
      nl: "Kast: tien stuks beslissen",
      en: "Closet: decide on ten items",
    },
    microSteps: {
      nl: ["Tien stuks pakken", "Houden of weg", "Weg-stapel apart"],
      en: ["Pick ten items", "Keep or go", "Set go-pile aside"],
    },
  },
  {
    id: "tax-folder-prep",
    energy: "high",
    title: {
      nl: "Map voor papieren klaarzetten",
      en: "Prep a papers folder",
    },
    microSteps: {
      nl: ["Map maken of openen", "Labels of secties", "Eerste document erin"],
      en: ["Create or open folder", "Labels or sections", "Add first document"],
    },
  },
  {
    id: "network-message",
    energy: "high",
    title: {
      nl: "Netwerkbericht sturen",
      en: "Send a networking message",
    },
    microSteps: {
      nl: ["Persoon kiezen", "Korte oprechte zin", "Versturen"],
      en: ["Pick a person", "Short sincere line", "Send"],
    },
  },
  {
    id: "plan-week",
    energy: "high",
    title: {
      nl: "Weekplan in drie bullets",
      en: "Week plan in three bullets",
    },
    microSteps: {
      nl: ["Notitie openen", "Drie bullets", "Prioriteit markeren"],
      en: ["Open note", "Three bullets", "Mark priority"],
    },
  },
  {
    id: "ship-something",
    energy: "high",
    title: {
      nl: "Iets live zetten of delen",
      en: "Ship or share something",
    },
    microSteps: {
      nl: ["Artifact kiezen", "Check", "Publiceren of delen"],
      en: ["Pick the artifact", "Quick check", "Publish or share"],
    },
  },
  {
    id: "hard-conversation-note",
    energy: "high",
    title: {
      nl: "Moeilijk gesprek: drie zinnen voorbereiden",
      en: "Hard talk: prep three sentences",
    },
    microSteps: {
      nl: ["Onderwerp noemen", "Drie zinnen", "Bewaren tot het moment"],
      en: ["Name the topic", "Three sentences", "Save until the moment"],
    },
  },
  {
    id: "deep-clean-room",
    energy: "high",
    title: {
      nl: "Eén kamer echt schoon",
      en: "Really clean one room",
    },
    microSteps: {
      nl: ["Rommel eruit", "Oppervlakken", "Vloer"],
      en: ["Clutter out", "Surfaces", "Floor"],
    },
  }
] as const;

const GENERIC_MICRO: Record<Locale, string[]> = {
  nl: [
    "De eerste kleine zet zetten",
    "Doorgaan tot het voelt als genoeg",
    "Afronden of voor later zetten",
  ],
  en: [
    "Make the first small move",
    "Continue until it feels like enough",
    "Finish or park for later",
  ],
};

export function v2NormalizeLocale(locale?: string | null): Locale {
  return locale === "en" ? "en" : "nl";
}

export function v2ThingBankForEnergy(energy: V2ThingEnergy): V2ThingBankItem[] {
  return V2_THING_BANK.filter((item) => item.energy === energy);
}

export function v2ThingBankTitle(
  item: V2ThingBankItem,
  locale?: string | null,
): string {
  return item.title[v2NormalizeLocale(locale)];
}

export function v2FindThingBankItemByTitle(
  title: string,
): V2ThingBankItem | undefined {
  const key = title.trim().toLowerCase();
  if (!key) return undefined;
  return V2_THING_BANK.find(
    (item) =>
      item.title.nl.toLowerCase() === key ||
      item.title.en.toLowerCase() === key,
  );
}

/** Stable hash for day-seeded shuffle (zelfde dag = zelfde volgorde). */
export function v2HashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Mulberry32 PRNG. */
function v2Mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function v2SeededShuffle<T>(items: readonly T[], seed: string): T[] {
  const out = [...items];
  const rand = v2Mulberry32(v2HashSeed(seed));
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Localized suggestion cards for a single energy bucket (optionally day-shuffled). */
export function v2LocalizedSuggestions(
  energy: V2ThingEnergy,
  locale?: string | null,
  seed?: string | null,
): V2ThingSuggestion[] {
  const lang = v2NormalizeLocale(locale);
  const base = v2ThingBankForEnergy(energy).map((item) => ({
    title: item.title[lang],
    energy: item.energy,
  }));
  if (!seed) return base;
  return v2SeededShuffle(base, seed);
}

/** Full NL map (legacy shape used by older call sites). */
export function v2SuggestionsRecordNl(): Record<
  V2ThingEnergy,
  V2ThingSuggestion[]
> {
  return {
    low: v2LocalizedSuggestions("low", "nl"),
    enough: v2LocalizedSuggestions("enough", "nl"),
    high: v2LocalizedSuggestions("high", "nl"),
  };
}

export function v2GenericMicroDefaults(locale?: string | null): string[] {
  return [...GENERIC_MICRO[v2NormalizeLocale(locale)]];
}

export function v2BankMicroDefaultsForTitle(
  title: string,
  locale?: string | null,
): string[] | null {
  const item = v2FindThingBankItemByTitle(title);
  if (!item) return null;
  return [...item.microSteps[v2NormalizeLocale(locale)]];
}

export function v2ThingBankStats(): Record<V2ThingEnergy, number> & { total: number } {
  return {
    low: v2ThingBankForEnergy("low").length,
    enough: v2ThingBankForEnergy("enough").length,
    high: v2ThingBankForEnergy("high").length,
    total: V2_THING_BANK.length,
  };
}
