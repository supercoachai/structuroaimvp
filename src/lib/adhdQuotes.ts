import { STRUCTURO_LOCALE_STORAGE_KEY } from "@/lib/i18n/types";
import type { Locale } from "@/lib/i18n/types";

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

/** Engelstalige varianten (zelfde doel: korte motivatie). */
const ADHD_QUOTES_EN: string[] = [
  "Structure is not a cage, it is a superpower.",
  "Small steps count, especially in the right direction.",
  "You do not have to do everything at once. You only have to start now.",
  "Focus is not a talent, it is a choice you remake every day.",
  "An ADHD brain is a fast engine with weak brakes. Build better brakes.",
  "The best productivity hack? One thing at a time.",
  "Chaos is not your character. Structure is a skill you can learn.",
  "Your brain is not broken. It works differently.",
  "Forgetting is human. Building systems is smart.",
  "Perfection is the enemy of progress. Just begin.",
  "Routine is not boring. Routine is freedom for your brain.",
  "What you do today shapes who you become tomorrow.",
  "You do not have to be a hero. Showing up is enough.",
  "Every big change started with one small moment of action.",
  "Stop planning forever. Start with the first tiny step.",
  "Your brain lights up like fireworks. Give it a lighter, not a bucket of water.",
  "Discipline is choosing what you want over what you feel right now.",
  "The only bad day is a day without intention.",
  "You are not lazy. You are missing the right system.",
  "Structure gives your brain room to be creative.",
  "Every task you finish is proof that you can.",
  "Procrastination is not failure. It is information about what you need.",
  "A little focus beats a mountain of motivation.",
  "Start with what is easy. Momentum does the rest.",
  "You do not need motivation to begin. Begin, and motivation often follows.",
  "The secret of productivity? Knowing when to stop.",
  "Rest is not a prize. Rest is part of the process.",
  "A good system always beats a good intention.",
  "Multitasking is a myth. Single-tasking is reality.",
  "You are further than you think. Look how far you have come.",
  "Not every day has to be productive. Some days are for recovery.",
  "A checklist frees your brain from having to remember everything.",
  "Focus is not something you have. It is something you build.",
  "Every time you return after distraction, you train your focus.",
  "A weak plan beats no plan.",
  "Your brain is for ideas, not for holding endless to-do lists.",
  "Give yourself permission not to be perfect.",
  "The shortest path to success? A little better every day.",
  "Structure is the canvas where creativity can grow.",
  "Do not compare yourself to others. Compare yourself to yesterday.",
  "Managing energy matters more than managing time.",
  "Fifteen focused minutes beat an hour of half-work.",
  "You do not have to wait for the perfect moment. This is it.",
  "Repetition builds habits. Habits build results.",
  "Make it easier to do the right thing.",
  "Every day is a new chance to improve your system.",
  "Complex problems, simple solutions. Step by step.",
  "Self-discipline is self-love in action.",
  "You are not late. You are right on time to begin.",
  "Distractions are not enemies. They are signals from your brain.",
  "You build your best self day by day.",
  "Fewer options mean less decision fatigue.",
  "Focus on progress, not perfection.",
  "A timer is your friend. Work in blocks, rest in blocks.",
  "You do not need motivation. You need a first step.",
  "Some days are harder. That is okay.",
  "Successful people do not have more willpower. They have better systems.",
  "Your unique brain is your greatest strength. Learn how it works.",
  "Breaks are not wasted time. They are fuel.",
  "Stop punishing yourself for what you did not do. Celebrate what you did.",
  "The easiest way to keep going? Make the next step tiny.",
  "Consistency beats intensity. A little every day.",
  "You do not need to see the whole staircase. Just the next step.",
  "Writing it down is remembering without overloading your brain.",
  "Big dreams, small actions. That is the secret.",
  "You deserve the kindness you give others.",
  "Starting everywhere is starting nowhere. Pick one thing.",
  "What if it is easier than you think?",
  "Your pace is your pace. And that is enough.",
  "Do less, but do it well.",
  "Focus is a muscle. Train it daily.",
  "It is not about how much you do. It is about how intentionally you do it.",
  "Reward yourself for small wins. They all count.",
  "A messy desk is fine. A messy system is harder.",
  "Start where you are. Use what you have. Do what you can.",
  "Deadlines are not stress. They are structure.",
  "Your brain loves novelty. Use it as a tool, not an enemy.",
  "Courage is not the absence of fear. It is starting anyway.",
  "Every expert was once a beginner who did not quit.",
  "The best investment? Yourself and your systems.",
  "Stop waiting for inspiration. Start working and inspiration often follows.",
  "The most important conversation of the day? The one with yourself.",
  "Write it down. Your brain is not a storage closet.",
  "Mistakes are not failures. They are lessons.",
  "Simplicity is the ultimate sophistication.",
  "You are more than your productivity.",
  "What you feed with attention grows.",
  "Fewer decisions, more energy for what matters.",
  "Habits shape your future. Choose them on purpose.",
  "Trust your system, not your memory.",
  "The day does not start with your alarm. It starts with your intention.",
  "Success is not linear. It is a zigzag upward.",
  "Give yourself credit for being here.",
  "Not everything that counts can be counted.",
  "You already have what you need. You need the right structure.",
  "Priorities also mean saying no to good things.",
  "A full head can mean you care a lot. That is beautiful.",
  "Today is a good day to do something small and great.",
  "You are not your thoughts. You are the one noticing them.",
  "Every morning is another chance. Use it.",
];

function readLocaleFromStorage(): Locale {
  if (typeof window === "undefined") return "nl";
  try {
    const raw = localStorage.getItem(STRUCTURO_LOCALE_STORAGE_KEY);
    return raw === "en" ? "en" : "nl";
  } catch {
    return "nl";
  }
}

function quotesForLocale(locale: Locale): string[] {
  return locale === "en" ? ADHD_QUOTES_EN : ADHD_QUOTES;
}

export function getQuoteOfTheDay(visitCount?: number, locale?: Locale): string {
  const loc = locale ?? readLocaleFromStorage();
  const pool = quotesForLocale(loc);
  if (visitCount != null && visitCount >= 0 && visitCount < pool.length) {
    return pool[visitCount];
  }

  const seed = new Date().toISOString().split("T")[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return pool[Math.abs(hash) % pool.length];
}

const VISIT_COUNT_KEY = "structuro_quote_visit_count";

export function getNextUniqueQuote(localeOverride?: Locale): string {
  const loc = localeOverride ?? readLocaleFromStorage();
  const pool = quotesForLocale(loc);
  let count = 0;
  try {
    const stored = localStorage.getItem(VISIT_COUNT_KEY);
    if (stored) count = parseInt(stored, 10) || 0;
  } catch {
    /* ignore */
  }

  const quote = pool[count % pool.length];

  try {
    localStorage.setItem(VISIT_COUNT_KEY, String(count + 1));
  } catch {
    /* ignore */
  }

  return quote;
}

export function getRandomAdhdPlanningQuote(seed: number, locale?: Locale): string {
  const loc = locale ?? readLocaleFromStorage();
  const pool = quotesForLocale(loc);
  return pool[Math.abs(seed) % pool.length];
}
