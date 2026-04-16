const ADHD_QUOTES: string[] = [
  "Structuur is geen beperking, het is je superkracht.",
  "Kleine stappen tellen ook. Vooral als ze de juiste richting op gaan.",
  "Je hoeft niet alles tegelijk. Je hoeft alleen nu te beginnen.",
  "Focus is geen talent, het is een keuze die je elke dag opnieuw maakt.",
  "Een ADHD-brein is een Ferrari-motor met fietsenremmen. Bouw betere remmen.",
  "De beste productiviteitshack? Eén ding tegelijk.",
  "Chaos is geen karakter. Structuur is een skill die je kunt leren.",
  "Je brein is niet kapot. Het werkt gewoon anders.",
  "Vergeten is menselijk. Systemen bouwen is slim.",
  "Perfectie is de vijand van voortgang. Begin gewoon.",
  "Routine is niet saai. Routine is vrijheid voor je brein.",
  "Wat je vandaag doet, bepaalt wie je morgen bent.",
  "Je hoeft geen superheld te zijn. Gewoon opdagen is genoeg.",
  "Elke grote verandering begon met één klein moment van actie.",
  "Stop met plannen maken. Begin met het eerste stapje.",
  "Jouw brein denkt in vuurwerk. Geef het een aansteker, geen emmer water.",
  "Discipline is kiezen wat je wilt boven wat je nu voelt.",
  "De enige slechte dag is een dag zonder intentie.",
  "Je bent niet lui. Je mist alleen het juiste systeem.",
  "Structuur geeft je brein rust om creatief te zijn.",
  "Elke taak die je afmaakt, is bewijs dat je het kunt.",
  "Uitstelgedrag is geen falen. Het is informatie over wat je nodig hebt.",
  "Een klein beetje focus is meer waard dan een berg motivatie.",
  "Begin met wat makkelijk is. Momentum doet de rest.",
  "Je hoeft niet gemotiveerd te zijn om te beginnen. Begin, en de motivatie volgt.",
  "Het geheim van productiviteit? Weten wanneer je moet stoppen.",
  "Rust is geen beloning. Rust is onderdeel van het proces.",
  "Een goed systeem verslaat altijd een goed voornemen.",
  "Multitasken is een mythe. Singletasken is de realiteit.",
  "Je bent verder dan je denkt. Kijk eens achterom.",
  "Niet elke dag hoeft productief te zijn. Sommige dagen zijn voor herstel.",
  "De kracht van een checklist: je brein hoeft het niet te onthouden.",
  "Focus is niet iets wat je hebt. Het is iets wat je creëert.",
  "Elke keer dat je terugkomt na afleiding, train je je focus.",
  "Een slechte planning is beter dan geen planning.",
  "Je brein is gemaakt voor ideeën, niet voor to-do lijsten.",
  "Geef jezelf toestemming om niet perfect te zijn.",
  "De kortste weg naar succes? Elke dag een klein beetje beter.",
  "Structuur is het canvas waarop creativiteit kan bloeien.",
  "Vergelijk jezelf niet met anderen. Vergelijk jezelf met gisteren.",
  "Energie managen is belangrijker dan tijd managen.",
  "Een kwartier gefocust werk is meer waard dan een uur half-werk.",
  "Je hoeft niet te wachten op het perfecte moment. Dit is het.",
  "Herhaling bouwt gewoontes. Gewoontes bouwen resultaten.",
  "Maak het jezelf makkelijk om het juiste te doen.",
  "Elke dag is een nieuwe kans om je systeem te verbeteren.",
  "Complexe problemen, simpele oplossingen. Stap voor stap.",
  "Zelfdiscipline is zelfliefde in actie.",
  "Je bent niet te laat. Je bent precies op tijd om te beginnen.",
  "Afleidingen zijn geen vijanden. Het zijn signalen van je brein.",
  "De beste versie van jezelf bouw je dag voor dag.",
  "Minder opties betekent minder besluitmoeheid.",
  "Focus op voortgang, niet op perfectie.",
  "Een timer is je beste vriend. Werk in blokken, rust in blokken.",
  "Je hebt geen motivatie nodig. Je hebt een eerste stap nodig.",
  "Accepteer dat sommige dagen moeilijker zijn. Dat is oké.",
  "Succesvolle mensen hebben niet meer wilskracht. Ze hebben betere systemen.",
  "Jouw unieke brein is je grootste kracht. Leer het kennen.",
  "Pauzes zijn geen tijdverspilling. Ze zijn brandstof.",
  "Stop met jezelf straffen voor wat je niet hebt gedaan. Vier wat je wel deed.",
  "De makkelijkste manier om door te gaan? De volgende stap zo klein mogelijk maken.",
  "Consistentie verslaat intensiteit. Elke dag een beetje.",
  "Je hoeft niet de hele trap te zien. Alleen de volgende trede.",
  "Opschrijven is onthouden zonder je brein te belasten.",
  "Grote dromen, kleine acties. Dat is het geheim.",
  "Je verdient dezelfde vriendelijkheid die je aan anderen geeft.",
  "Overal beginnen is nergens komen. Kies één ding.",
  "Wat als het makkelijker is dan je denkt?",
  "Jouw tempo is jouw tempo. En dat is precies goed.",
  "Doe minder, maar doe het goed.",
  "Focus is een spier. Train hem elke dag.",
  "Het gaat niet om hoeveel je doet. Het gaat om hoe bewust je het doet.",
  "Beloon jezelf voor de kleine overwinningen. Ze tellen allemaal.",
  "Een rommelig bureau is niet erg. Een rommelig systeem wel.",
  "Begin waar je bent. Gebruik wat je hebt. Doe wat je kunt.",
  "Deadlines zijn geen stress. Ze zijn structuur.",
  "Je brein houdt van nieuwigheid. Gebruik dat als tool, niet als vijand.",
  "Moed is niet de afwezigheid van angst. Het is beginnen ondanks de angst.",
  "Elke expert was ooit een beginner die niet opgaf.",
  "De beste investering? In jezelf en je systemen.",
  "Stop met wachten op inspiratie. Ga aan de slag en inspiratie volgt.",
  "Het belangrijkste gesprek van de dag? Dat met jezelf.",
  "Schrijf het op. Je brein is geen opslagplaats.",
  "Fouten zijn geen falen. Het zijn lessen.",
  "Eenvoud is de ultieme vorm van verfijning.",
  "Jij bent meer dan je productiviteit.",
  "Wat je aandacht geeft, groeit.",
  "Minder beslissingen, meer energie voor wat ertoe doet.",
  "Gewoontes vormen je toekomst. Kies ze bewust.",
  "Vertrouw op je systeem, niet op je geheugen.",
  "De dag begint niet met je wekker. De dag begint met je intentie.",
  "Succes is niet lineair. Het is een zigzagpad omhoog.",
  "Geef jezelf credit voor het feit dat je hier bent.",
  "Niet alles wat telt is te tellen. Niet alles wat te tellen is, telt.",
  "Je hebt alles al in je. Je hebt alleen de juiste structuur nodig.",
  "Prioriteiten stellen is ook nee zeggen tegen goede dingen.",
  "Een vol hoofd is een teken dat je veel wilt. Dat is mooi.",
  "Vandaag is een goed moment om iets kleins geweldig te doen.",
  "Je bent niet je gedachten. Je bent degene die ze observeert.",
  "Elke ochtend is een herkansing. Gebruik hem.",
];

export function getQuoteOfTheDay(visitCount?: number): string {
  if (visitCount != null && visitCount >= 0 && visitCount < ADHD_QUOTES.length) {
    return ADHD_QUOTES[visitCount];
  }

  const seed = new Date().toISOString().split("T")[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return ADHD_QUOTES[Math.abs(hash) % ADHD_QUOTES.length];
}

const VISIT_COUNT_KEY = "structuro_quote_visit_count";

export function getNextUniqueQuote(): string {
  let count = 0;
  try {
    const stored = localStorage.getItem(VISIT_COUNT_KEY);
    if (stored) count = parseInt(stored, 10) || 0;
  } catch { /* ignore */ }

  const quote = ADHD_QUOTES[count % ADHD_QUOTES.length];

  try {
    localStorage.setItem(VISIT_COUNT_KEY, String(count + 1));
  } catch { /* ignore */ }

  return quote;
}
