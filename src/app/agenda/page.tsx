'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  CalendarIcon, 
  ClockIcon, 
  PlayIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  Cog6ToothIcon,
  TrashIcon,
  BoltIcon
} from '@heroicons/react/24/outline';
import AppLayout from '../../components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useTaskContext } from '../../context/TaskContext';
import { toast } from '../../components/Toast';
import { getCategoryColor, CATEGORIES } from '../../lib/categoryColors';

type TimeRange = '24h' | 'work' | 'morning' | 'afternoon' | 'evening' | 'custom';
type ItemType = 'task' | 'event' | 'medication';

interface TimeRangeOption {
  key: TimeRange;
  label: string;
  start: number;
  end: number;
  description: string;
}

interface AgendaItem {
  id: string;
  title: string;
  type: ItemType;
  startTime: Date;
  endTime: Date;
  duration: number; // in minuten
  completed: boolean;
  color: string;
  icon: string;
  metadata?: Record<string, unknown>;
  isDeadline?: boolean;
}

const timeRangeOptions: TimeRangeOption[] = [
  { key: 'work', label: 'Werkuren', start: 8, end: 18, description: '08:00 - 18:00' },
  { key: '24h', label: 'Volledige dag', start: 0, end: 24, description: '00:00 - 24:00' },
  { key: 'morning', label: 'Ochtend', start: 6, end: 12, description: '06:00 - 12:00' },
  { key: 'afternoon', label: 'Middag', start: 12, end: 18, description: '12:00 - 18:00' },
  { key: 'evening', label: 'Avond', start: 18, end: 23, description: '18:00 - 23:00' },
  { key: 'custom', label: 'Aangepast', start: 0, end: 23, description: 'Kies zelf' },
];

// Helper function - moet voor de component worden gedefinieerd
const isSameDay = (date1: Date, date2: Date) => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

// ISO weeknummer (1-53)
function getISOWeek(d: Date): number {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 4 - (date.getDay() || 7));
  const yearStart = new Date(date.getFullYear(), 0, 1);
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// Weeknummers voor een maand (eerste en laatste week die in de maand vallen)
function getWeekNumbersForMonth(year: number, month: number): { first: number; last: number } {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  return { first: getISOWeek(firstDay), last: getISOWeek(lastDay) };
}

// Helper: datum als YYYY-MM-DD voor vergelijking
function toDateKey(d: Date): string {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// Helpers voor datum-input (YYYY-MM-DD):
// JS interpreteert "YYYY-MM-DD" als UTC; dat kan tot tijdverschuivingen leiden.
function parseDateInputLocal(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
}

function formatDateInputLocal(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Helper: valt datum binnen herhaling? (repeat, repeatUntil, repeatWeekdays, repeatExcludeDates)
function isDateInRecurrence(
  startDate: Date,
  checkDate: Date,
  repeat: string,
  repeatUntil?: string | null,
  repeatWeekdays?: 'all' | 'weekdays' | 'weekends',
  repeatExcludeDates?: string[]
): boolean {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const check = new Date(checkDate);
  check.setHours(0, 0, 0, 0);
  if (check.getTime() < start.getTime()) return false;

  if (repeatUntil) {
    const untilDate = repeatUntil.includes('T') ? new Date(repeatUntil) : parseDateInputLocal(repeatUntil);
    untilDate.setHours(23, 59, 59, 999);
    if (check.getTime() > untilDate.getTime()) return false;
  }

  const checkKey = toDateKey(check);
  if (repeatExcludeDates?.includes(checkKey)) return false;

  const dow = check.getDay(); // 0=zo, 6=za
  if (repeatWeekdays === 'weekdays' && (dow === 0 || dow === 6)) return false;
  if (repeatWeekdays === 'weekends' && dow !== 0 && dow !== 6) return false;

  if (repeat === 'daily') return true;
  if (repeat === 'weekly') {
    const diffDays = Math.floor((check.getTime() - start.getTime()) / 86400000);
    return diffDays % 7 === 0;
  }
  if (repeat === 'monthly') {
    return start.getDate() === check.getDate();
  }
  return false;
}

// Helper: starttijd voor een herhalingsinstantie op gegeven datum (zelfde tijd als origineel)
function getInstanceStartTime(originalDueAt: Date, instanceDate: Date): Date {
  const orig = new Date(originalDueAt);
  const inst = new Date(instanceDate);
  inst.setHours(orig.getHours(), orig.getMinutes(), orig.getSeconds(), orig.getMilliseconds());
  return inst;
}

export default function AgendaPage() {
  const { tasks, addTask: addTaskToDatabase, updateTask: updateTaskInDatabase, deleteTask: deleteTaskInDatabase, fetchTasks } = useTaskContext();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedView, setSelectedView] = useState<'day' | 'week' | 'month' | 'workweek'>('day');
  const [timeRange, setTimeRange] = useState<TimeRange>('work');
  const [customStart, setCustomStart] = useState(8);
  const [customEnd, setCustomEnd] = useState(18);
  const [showTimeRangeSelector, setShowTimeRangeSelector] = useState(false);
  const timeRangeSelectorRef = useRef<HTMLDivElement>(null);
  const [showMedicationTracker, setShowMedicationTracker] = useState(false);
  const [legendaOpen, setLegendaOpen] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    date: '',
    startTime: '',
    endTime: '',
    duration: 60,
    type: 'meeting',
    description: '',
    category: 'appointment' as 'work' | 'personal' | 'appointment' | 'health'
  });
  const [editingItem, setEditingItem] = useState<AgendaItem | null>(null);
  const [editMode, setEditMode] = useState<'single' | 'series' | null>(null);
  const [showEventDetails, setShowEventDetails] = useState(false);
  useEffect(() => {
    setShowEventDetails(false);
  }, [editingItem?.id]);
  
  const [medicationData, setMedicationData] = useState({
    name: '',
    dosage: '',
    time: '',
    repeat: 'daily',
    reminder: '10',
    addToAgenda: false,
    daysToAdd: 30,
    weekdaysOnly: false
  });
  const [isSavingMedication, setIsSavingMedication] = useState(false);
  const medicationSaveRef = useRef(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dayTimelineRef = useRef<HTMLDivElement>(null);
  const dayScrollRef = useRef<HTMLDivElement>(null);
  // Resize (Outlook-achtig): sleep boven-/onderrand om duur aan te passen
  const [resizingItem, setResizingItem] = useState<{
    id: string;
    edge: 'top' | 'bottom';
    originalStartMinutes: number;
    originalDuration: number;
    startY: number;
  } | null>(null);
  const [resizePreview, setResizePreview] = useState<{ startMinutes: number; duration: number } | null>(null);
  const resizeJustEndedRef = useRef(false);

  // ========== DATA SEPARATION: Events, Medication (geen reguliere taken op agenda) ==========

  // Datumbereik voor huidige view (voor herhalingsuitbreiding)
  const viewDateRange = useMemo(() => {
    const dates: Date[] = [];
    if (selectedView === 'day') {
      dates.push(new Date(selectedDate));
    } else if (selectedView === 'week') {
      const weekStart = new Date(selectedDate);
      const d = weekStart.getDay();
      weekStart.setDate(weekStart.getDate() - (d === 0 ? 6 : d - 1));
      weekStart.setHours(0, 0, 0, 0);
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        dates.push(d);
      }
    } else if (selectedView === 'workweek') {
      const start = new Date(selectedDate);
      const d = start.getDay();
      const offset = d === 0 ? -5 : d === 6 ? -4 : 1 - d;
      start.setDate(start.getDate() + offset);
      start.setHours(0, 0, 0, 0);
      for (let i = 0; i < 5; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        dates.push(d);
      }
    } else {
      const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1, 0, 0, 0, 0);
      const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0, 0, 0, 0, 0);
      for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d));
      }
    }
    return dates;
  }, [selectedDate, selectedView]);

  // Filter events (source: 'event') – inclusief herhalingsuitbreiding
  const eventsForDate = useMemo(() => {
    const eventTasks = tasks.filter(t => t.source === 'event' && t.dueAt);
    const items: AgendaItem[] = [];
    for (const task of eventTasks) {
      const startDate = new Date(task.dueAt!);
      const repeat = task.repeat || 'none';
      const repeatUntil = (task as any).repeatUntil ?? null;
      const repeatWeekdays = (task as any).repeatWeekdays ?? 'all';
      const repeatExcludeDates = (task as any).repeatExcludeDates ?? undefined;
      let duration = task.duration ?? task.estimatedDuration ?? 60;
      if (duration < 15) duration = 60;
      const category = (task as any).category || 'appointment';
      const color = getCategoryColor(category);
      const cat = CATEGORIES.find(c => c.value === category);
      const icon = (task as any).isDeadline ? '⚠️' : (cat?.icon ?? '📅');

      const addInstance = (instanceDate: Date) => {
        const startTime = getInstanceStartTime(startDate, instanceDate);
        const endTime = new Date(startTime.getTime() + Math.max(duration, 15) * 60000);
        const dateKey = toDateKey(instanceDate);
        items.push({
          id: `${task.id}::${dateKey}`,
          title: task.title,
          type: 'event' as ItemType,
          startTime,
          endTime,
          duration: Math.max(duration, 15),
          completed: task.done,
          color,
          icon,
          isDeadline: (task as any).isDeadline,
          metadata: {
            description: task.impact,
            repeat: task.repeat || 'none',
            repeatUntil: (task as any).repeatUntil,
            repeatWeekdays: (task as any).repeatWeekdays ?? 'all',
            repeatExcludeDates: (task as any).repeatExcludeDates,
            category: (task as any).category,
            baseTaskId: task.id,
            instanceDate: dateKey
          }
        } as AgendaItem);
      };

      if (repeat === 'none') {
        if (viewDateRange.some(d => isSameDay(startDate, d))) {
          addInstance(startDate);
        }
      } else {
        for (const d of viewDateRange) {
          if (isDateInRecurrence(startDate, d, repeat, repeatUntil, repeatWeekdays, repeatExcludeDates)) {
            addInstance(d);
          }
        }
      }
    }
    return items;
  }, [tasks, viewDateRange]);

  // Filter deadlines (reguliere taken met dueAt + isDeadline: true)
  const deadlinesForDate = useMemo(() => {
    return tasks.filter(task => {
      if (!task.dueAt) return false;
      if (task.source === 'event' || task.source === 'medication') return false;
      if (!(task as any).isDeadline) return false;
      
      const taskDate = new Date(task.dueAt);
      if (selectedView === 'day') {
        return isSameDay(taskDate, selectedDate);
      }
      return true;
    }).map(task => {
      const startTime = new Date(task.dueAt!);
      let duration = task.duration ?? task.estimatedDuration ?? 30;
      if (duration < 15) duration = 30;
      const endTime = new Date(startTime.getTime() + Math.max(duration, 15) * 60000);
      
      const category = (task as any).category || 'work';
      const color = getCategoryColor(category);
      
      return {
        id: task.id,
        title: task.title,
        type: 'task' as ItemType,
        startTime,
        endTime,
        duration: Math.max(duration, 15),
        completed: task.done,
        color,
        icon: (task as any).isDeadline ? '⚠️' : (CATEGORIES.find(c => c.value === category)?.icon ?? '🔵'),
        isDeadline: true,
        metadata: { category: (task as any).category }
      } as AgendaItem;
    });
  }, [tasks, selectedDate, selectedView]);

  // Filter medication (source: 'medication')
  const medicationForDate = useMemo(() => {
    return tasks.filter(task => {
      if (!task.dueAt) return false;
      if (task.source !== 'medication') return false;
      
      const medDate = new Date(task.dueAt);
      if (selectedView === 'day') {
        return isSameDay(medDate, selectedDate);
      }
      return true;
    }).map(task => {
      const startTime = new Date(task.dueAt!);
      const duration = 5; // Medicatie duurt altijd 5 min (uniform dag/week/maand)
      const endTime = new Date(startTime.getTime() + duration * 60000);
      
      return {
        id: task.id,
        title: task.title.replace(/^💊\s*/, ''), // Verwijder 💊 emoji uit titel
        type: 'medication' as ItemType,
        startTime,
        endTime,
        duration: 5,
        completed: task.done,
        color: getCategoryColor('health'),
        icon: '🩷',
        metadata: { dosage: task.impact }
      } as AgendaItem;
    });
  }, [tasks, selectedDate, selectedView]);

  // Events, medicatie én harde deadlines op de agenda
  const allAgendaItems = useMemo(() => {
    return [...eventsForDate, ...deadlinesForDate, ...medicationForDate].sort(
      (a, b) => a.startTime.getTime() - b.startTime.getTime()
    );
  }, [eventsForDate, deadlinesForDate, medicationForDate]);

  // ========== TIME SLOTS & RENDERING ==========
  // Eén uur-blok hoogte; alle positionering via deze constante en helpers
  const HOUR_HEIGHT = 96;
  const PIXELS_PER_30MIN = HOUR_HEIGHT / 2;
  const pxPerMin = HOUR_HEIGHT / 60;

  const calculateTop = (startMinutes: number): number => {
    const minutesFromCalendarStart = startMinutes - dayRangeStartMinutes;
    return (minutesFromCalendarStart / 60) * HOUR_HEIGHT;
  };

  const calculateHeight = (durationMinutes: number): number => {
    // Min 15 min hoogte (leesbaar), zodat 15-min items correct worden getoond
    const minHeight = PIXELS_PER_30MIN / 2;
    return Math.max((durationMinutes / 60) * HOUR_HEIGHT, minHeight);
  };

  const dayRange = (() => {
    const opt = timeRangeOptions.find((r) => r.key === timeRange);
    const start = timeRange === 'custom' ? customStart : opt?.start ?? 0;
    const end = timeRange === 'custom' ? customEnd : opt?.end ?? 23;
    return { startHour: start, endHour: Math.max(end, start + 1) };
  })();
  const dayRangeStartMinutes = dayRange.startHour * 60;
  const dayRangeEndMinutes = dayRange.endHour * 60;

  const getTimeSlots = () => {
    const { startHour, endHour } = dayRange;
    // Inclusief einduur; eindig met 2 lijnen (laatste uur-lijn + geen extra lijn onderaan)
    const count = (endHour - startHour) * 2 + 1;
    return Array.from({ length: count }, (_, i) => {
      const hour = startHour + Math.floor(i / 2);
      const minute = (i % 2) * 30;
      return { hour, minute, time: hour * 60 + minute };
    });
  };

  const timeSlots = getTimeSlots();
  const GRID_TOP_OFFSET = PIXELS_PER_30MIN;
  const dayViewGridHeight = (dayRange.endHour - dayRange.startHour) * HOUR_HEIGHT;
  const dayViewTotalHeight = GRID_TOP_OFFSET + dayViewGridHeight;

  const formatDate = (date: Date) => {
    const formatted = date.toLocaleDateString('nl-NL', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    // Alleen eerste letter hoofdletter (Nederlands: maand blijft kleine letter)
    return formatted.replace(/^\w/, (char) => char.toUpperCase());
  };

  const formatRelativeDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const itemDate = new Date(date);
    itemDate.setHours(0, 0, 0, 0);
    
    const diffTime = itemDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Vandaag';
    if (diffDays === 1) return 'Morgen';
    if (diffDays === -1) return 'Gisteren';
    if (diffDays > 1 && diffDays <= 7) {
      const dayNames = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];
      return dayNames[date.getDay()];
    }
    return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', weekday: 'short' });
  };

  // getWeekNumber removed - not used in current implementation

  const formatDateRange = (date: Date, days: number) => {
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + days - 1);
    return `${formatDate(date)} - ${formatDate(endDate)}`;
  };

  // getTimePosition removed - using direct calculation in render

  // ========== EVENT HANDLERS ==========
  
  // Sluit tijd bereik selector bij klikken buiten
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (timeRangeSelectorRef.current && !timeRangeSelectorRef.current.contains(event.target as Node)) {
        setShowTimeRangeSelector(false);
      }
    };

    if (showTimeRangeSelector) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTimeRangeSelector]);

  const handleAddEvent = async () => {
    if (!newEvent.title || !newEvent.startTime || !newEvent.date) {
      toast('Vul minimaal titel, datum en starttijd in');
      return;
    }
    try {
      const [startHours, startMinutes] = newEvent.startTime.split(':').map(Number);
      const eventDate = parseDateInputLocal(newEvent.date);
      eventDate.setHours(startHours, startMinutes, 0, 0);
      const endDate = new Date(eventDate);
      if (newEvent.endTime) {
        const [endHours, endMinutes] = newEvent.endTime.split(':').map(Number);
        endDate.setHours(endHours, endMinutes, 0, 0);
        if (endDate.getTime() <= eventDate.getTime()) {
          endDate.setDate(endDate.getDate() + 1);
        }
      } else {
        endDate.setTime(eventDate.getTime() + newEvent.duration * 60000);
      }
      let duration = Math.round((endDate.getTime() - eventDate.getTime()) / 60000);
      if (duration < 15) duration = newEvent.duration || 60;
      await addTaskToDatabase({
        title: newEvent.title,
        duration,
        priority: null,
        done: false,
        started: false,
        dueAt: eventDate.toISOString(),
        reminders: [10],
        repeat: 'none',
        impact: `${newEvent.type}|${newEvent.description || ''}`,
        energyLevel: 'medium',
        estimatedDuration: duration,
        source: 'event',
        category: newEvent.category
      });
      toast('Gebeurtenis toegevoegd');
      setNewEvent({ title: '', date: '', startTime: '', endTime: '', duration: 60, type: 'meeting', description: '', category: 'appointment' });
      setShowAddEvent(false);
      fetchTasks();
    } catch (err) {
      console.error('Failed to add event:', err);
      toast('Fout bij toevoegen van gebeurtenis');
    }
  };

  // Planning tips – 200 motiverende en handige quotes m.b.t. plannen en ADHD
  const allPlanningTips = [
    "Plan moeilijke taken in je energiepiek (meestal 's ochtends)",
    "Gebruik visuele reminders en kleurcodering",
    "Breek grote taken op in kleine, haalbare stappen",
    "Plan korte pauzes van 5-10 minuten tussen taken",
    "Gebruik een timer voor elke taak (Pomodoro techniek)",
    "Plan je dag in blokken van max 25 minuten",
    "Zet je telefoon op stil en leg hem weg tijdens focus",
    "Gebruik een 'parkeerplaats' voor afleidende gedachten",
    "Plan routine taken op vaste tijden elke dag",
    "Werk in een prikkelarme omgeving",
    "Plan je belangrijkste taak als eerste van de dag",
    "Gebruik een checklist voor dagelijkse routines",
    "Plan buffer tijd voor ADHD-tax (extra tijd die dingen kosten)",
    "Wissel af tussen verschillende soorten werk",
    "Plan je medicatie en maaltijden op vaste tijden",
    "Gebruik een bullet journal of digitale agenda",
    "Plan je dag de avond ervoor, niet 's ochtends",
    "Stel realistische doelen - minder is meer",
    "Plan tijd in voor beweging en ontspanning",
    "Gebruik een 'do not disturb' modus op je apparaten",
    "Eén ding afmaken voordat je aan het volgende begint",
    "Schrijf alles op; vertrouw niet op je geheugen",
    "Kies één prioriteit per dag en bescherm die",
    "Gebruik body doubling: werk naast iemand die ook werkt",
    "Leg spullen op vaste plekken zodat je ze altijd vindt",
    "Start met de taak die je het meest uitstelt",
    "Vier kleine overwinningen; ze tellen mee",
    "Slaap en rust zijn onderdeel van je planning",
    "Gebruik alarms voor overgangsmomenten",
    "Plan 'niets'-tijd in om te herstellen",
    "ADHD betekent niet lui; je brein werkt anders",
    "Vermijd beslismoeheid: plan kleding en maaltijden vooraf",
    "Gebruik white noise of focusmuziek om afleiding te dempen",
    "Een rommelige omgeving kost energie; begin met één hoek",
    "Deadlines zijn je vriend; zet ze zelf als ze ontbreken",
    "Batching: doe vergelijkbare taken in één blok",
    "Vraag om reminders van anderen zonder schaamte",
    "Korte wandeling voor of tussen taken verbetert focus",
    "Gebruik post-its op ooghoogte voor wat niet vergeten mag",
    "Accepteer dat sommige dagen minder productief zijn",
    "Plan terugvaltijd in; niet alles gaat in één keer goed",
    "Eet eiwitrijk ontbijt voor stabielere energie",
    "Zet notificaties uit behalve voor wat echt urgent is",
    "Gebruik 'tijdblokken' in je agenda in plaats van to-do's",
    "Koppel nieuwe gewoonten aan bestaande (na koffie = planning)",
    "Een goede planning is er een die je ook uitvoert",
    "Minder keuzes = meer energie voor wat ertoe doet",
    "Begin met 2 minuten; vaak ga je daarna door",
    "Gebruik slechts één of twee systemen, niet tien",
    "Review je week: wat werkte, wat niet?",
    "Plan ook leuke dingen; ze geven energie terug",
    "Sta jezelf toe om taken te verplaatsen naar morgen",
    "Gebruik kleuren per type taak in je agenda",
    "Leg je spullen klaar de avond ervoor",
    "Vermijd 'moeten'; kies 'ik kies ervoor'",
    "Neem pauzes voordat je uitgeput bent",
    "Schakel tussen taken mag; plan het dan bewust",
    "Gebruik spraak-naar-tekst voor snelle notities",
    "Een voltooide imperfecte taak is beter dan geen",
    "Plan een vaste 'admin'-dag voor brieven en formulieren",
    "Zeg vaker nee om ja te zeggen tegen wat belangrijk is",
    "Gebruik een 'inbox' en verwerk die op vaste tijden",
    "Vergelijk jezelf met gisteren, niet met anderen",
    "Beweging voor het werk verbetert concentratie",
    "Houd een 'done'-lijst om vooruitgang te zien",
    "Gebruik de 2-minutenregel: kan het in 2 min? Doe het nu",
    "Plan tijd voor afleiding; dan hoef je niet te vechten",
    "Eén scherm, één taak; sluit andere tabbladen",
    "Gebruik een aparte plek voor werk en ontspanning",
    "Vraag om duidelijke instructies en deadlines",
    "Schrijf je gedachten uit je hoofd voordat je begint",
    "Gebruik een wekker voor medicatie en maaltijden",
    "Korte powernaps van 10–15 min kunnen helpen",
    "Plan geen back-to-back vergaderingen; bouw pauzes in",
    "Gebruik standaardantwoorden voor e-mail om tijd te winnen",
    "Leg uit aan anderen wat je nodig hebt (rust, structuur)",
    "Een slechte dag maakt je strategie niet slecht",
    "Begin met het makkelijkste onderdeel om op gang te komen",
    "Gebruik visuele tijdsindicatoren (klok, timer in zicht)",
    "Plan 'overlopen' aan het eind van de dag",
    "Vermijd eindeloos plannen; actie leert meer",
    "Gebruik een vaste plek voor sleutels en portemonnee",
    "Stel 'wat als het lukt?' in plaats van alleen 'wat als niet'",
    "Korte ademhalingsoefeningen kalmeren en herstellen focus",
    "Plan tijd voor verwerking na sociale activiteiten",
    "Gebruik herinneringen op je telefoon voor vaste momenten",
    "Breek vergaderingen op in korte blokken waar mogelijk",
    "Eén grote taak per dag is vaak genoeg",
    "Gebruik een weekoverzicht naast dagplanning",
    "Beloon jezelf na voltooide taken, hoe klein ook",
    "Plan geen belangrijke beslissingen laat op de dag",
    "Gebruik templates voor terugkerende taken",
    "ADHD-vriendelijk plannen = ruimte voor afwijking",
    "Schakel beeldschermen uit een uur voor het slapen",
    "Plan 'recovery'-dagen na drukke periodes",
    "Gebruik een vaste ochtendroutine als anker",
    "Vermijd multitasken; het kost meer tijd dan het oplevert",
    "Schrijf op wat je afleidt en plan het later in",
    "Gebruik een 'stop'-woord om piekeren te onderbreken",
    "Plan tijd voor creativiteit en spel, niet alleen moeten",
    "Korte check-ins met jezelf: wat heb ik nu nodig?",
    "Gebruik een boodschappenlijst en houd hem bij",
    "Stel je voor dat de taak al klaar is; wat was de stap?",
    "Plan buffer voor reistijd en omkleden",
    "Gebruik één kalender voor alles, niet meerdere",
    "Vier dat je bent begonnen, niet alleen dat je klaar bent",
    "Plan 'lege' momenten; ze zijn geen verspilling",
    "Gebruik koptelefoon of oordopjes in drukte",
    "Vraag om schriftelijke samenvattingen na vergaderingen",
    "Een chaotische dag betekent niet een chaotisch leven",
    "Gebruik een vaste slaaptijd waar mogelijk",
    "Plan moeilijke gesprekken op momenten met energie",
    "Houd water en een snack bij de hand tijdens werk",
    "Gebruik blokken voor 'deep work' en 'shallow work'",
    "Sta jezelf toe om een taak te laten vallen",
    "Plan terugkerende afspraken op dezelfde dag/tijd",
    "Gebruik een 'later'-lijst voor leuke ideeën",
    "Korte stretch of beweging herstelt aandacht",
    "Plan geen belangrijke mails 's avonds laat",
    "Gebruik een vaste plek voor post en papieren",
    "Progress over perfection",
    "Plan tijd om je planning bij te werken",
    "Gebruik een 'niet te doen'-lijst voor wat je laat vallen",
    "Routine vermindert beslissen; bespaar energie",
    "Plan sociale activiteiten met een duidelijk eindtijd",
    "Gebruik een dagboek voor wat goed ging vandaag",
    "Kleine stappen zijn nog steeds stappen",
    "Plan 'me-time' zonder schuldgevoel",
    "Gebruik automatische betalingen voor vaste lasten",
    "Vermijd 'moet ik nog' in je hoofd; schrijf het op",
    "Plan een wekelijkse reset (opruimen, lijsten leegmaken)",
    "Gebruik dezelfde start van de dag als anker",
    "Je hoeft niet alles te onthouden; dat is wat systemen doen",
    "Plan pauzes in vergaderingen in plaats van uren achter elkaar",
    "Gebruik een 'wacht'-map voor dingen die later moeten",
    "Focus op wat je wél gedaan hebt vandaag",
    "Plan tijd voor leren en experimenteren",
    "Gebruik korte video's of podcasts voor motivatie",
    "Vermijd vergelijken met 'normale' planners",
    "Plan een vaste dag voor administratie",
    "Gebruik visuele voortgang (streepjes, vinkjes)",
    "Een slechte start mag; je kunt bijsturen",
    "Plan 'afrond'-tijd aan het eind van de dag",
    "Gebruik een vaste plek voor telefoon en oplader",
    "Rust is productiviteit voor je brein",
    "Plan geen grote projecten zonder tussenstappen",
    "Gebruik muziek zonder tekst voor focus",
    "Vraag om herinneringen; het is geen zwakte",
    "Plan tijd voor niets doen; het is nuttig",
    "Gebruik een 'morgen'-lijst voor wat kan wachten",
    "ADHD vraagt om aanpassing, niet om harder je best doen",
    "Plan korte gesprekken in plaats van lange vergaderingen",
    "Gebruik één notitie-app en zoek daar",
    "Sta jezelf toe om te schakelen van strategie",
    "Plan vaste momenten om e-mail te checken",
    "Gebruik een 'parkeerplaats' voor ideeën voor later",
    "Je bent niet te laat voor een betere planning",
    "Plan beweging tussen zittend werk",
    "Gebruik standaardlocaties voor spullen (tas, bril)",
    "Minder items op je lijst = meer kans dat het lukt",
    "Plan tijd voor fouten en herstel",
    "Gebruik kleur of symbolen voor urgentie",
    "Vier je sterke kanten (creatief, flexibel, doorzetten)",
    "Plan geen belangrijke taken vlak na lunch",
    "Gebruik een vaste avondroutine voor rust",
    "Korte momenten van focus tellen op",
    "Plan 'nee'-momenten om overprikkeling te voorkomen",
    "Gebruik een wekker om te starten én te stoppen",
    "Structuur is vrijheid als het bij je past",
    "Plan tijd om te ontspannen na stress",
    "Gebruik een 'done for today'-grens",
    "Je hoeft niet alles vandaag; kies drie dingen",
    "Plan vaste tijden voor huishouden en boodschappen",
    "Gebruik herinneringen voor terugkerende taken",
    "Een halve taak is beter dan geen start",
    "Plan tijd voor reflectie: wat werkte deze week?",
    "Gebruik een aparte 'urgent'-lijst met max 3 items",
    "ADHD betekent ook creativiteit en doorzettingsvermogen",
    "Plan geen vergaderingen als eerste op de dag als je dat niet wilt",
    "Gebruik lichaamssignalen: honger, moe = pauze",
    "Kleine gewoonten bouwen grote resultaten",
    "Plan 'back-up'-tijd voor onverwachte dingen",
    "Gebruik een vaste volgorde voor ochtend en avond",
    "Vermijd eindeloos zoeken; leg dingen op vaste plekken",
    "Plan tijd voor hobby's; ze geven energie",
    "Gebruik een timer om te starten: 5 minuten is oké",
    "Je bent genoeg; je planning hoeft niet perfect",
    "Plan korte calls in plaats van lange mails",
    "Gebruik een 'focus'-modus op je telefoon",
    "Rust na inspanning is onderdeel van het plan",
    "Plan tijd voor anderen helpen; het geeft zin",
    "Gebruik één boodschappenlijst-app of briefje",
    "Vandaag een beetje is morgen een stuk",
    "Plan geen grote schoonmaak; doe één kamer of 15 min",
    "Gebruik visuele dagritme-kaarten als dat helpt",
    "Accepteer af en toe chaos; herstel daarna",
    "Plan vaste tijden voor sociale media als je het wilt",
    "Gebruik een 'wacht op'-lijst voor anderen",
    "Doe het op jouw tempo; vergelijk niet met anderen",
    "Plan tijd voor lezen of leren zonder doel",
    "Gebruik een vaste slaap-waak routine waar mogelijk",
    "Korte adempauze tussen taken herstelt focus",
    "Plan 'nee' tegen extra verplichtingen",
    "Gebruik een weekstart-moment om de week te plannen",
    "Elke dag opnieuw beginnen mag",
    "Plan tijd voor natuur of buitenlucht",
    "Gebruik een 'niet nu'-map voor later",
    "Je brein is anders, niet kapot",
    "Plan tijd voor lege momenten zonder schuld",
    "Gebruik één plek voor wachtwoorden en codes",
    "Minder keuzes in de ochtend = meer rust",
    "Plan terugkerende 'reset'-momenten",
    "Gebruik een vaste plek voor portemonnee en sleutels",
    "Vooruitgang is niet altijd rechtlijnig",
    "Plan tijd voor vrienden en familie bewust in",
    "Gebruik een 'top 3'-lijst per dag",
    "Routine hoeft niet saai te zijn; het schept ruimte",
    "Plan tijd om te evalueren: wat ga ik anders doen?",
    "Gebruik korte herinneringen voor medicatie",
    "Een goede dag = een dag die bij je past",
    "Plan geen belangrijke gesprekken als je moe bent",
    "Gebruik een vaste volgorde voor werk en pauzes",
    "Je mag je planning aanpassen; het is van jou",
    "Plan tijd voor ontspanning zonder scherm",
    "Gebruik een 'parkeerplaats' voor gedachten in vergaderingen",
    "Kleine aanpassingen maken groot verschil",
    "Plan tijd voor sport of beweging vast",
    "Gebruik één systeem lang genoeg om te wennen",
    "ADHD-vriendelijk = ruimte voor variatie",
    "Plan 'lege' blokken voor onverwachte taken",
    "Gebruik een vaste plek voor bril en telefoon",
    "Rust en slaap zijn geen luxe maar noodzaak",
    "Plan tijd voor wat je leuk vindt",
    "Gebruik een 'later vandaag'-lijst",
    "Je hoeft niet alles te kunnen; focus op wat werkt",
    "Plan korte momenten van stilte of meditatie",
    "Gebruik alarms voor overgangen (van werk naar pauze)",
    "Structuur geeft ruimte voor spontaniteit",
    "Plan tijd om te dromen en ideeën te noteren",
    "Gebruik een vaste plek voor belangrijke papieren",
    "Elke stap telt, hoe klein ook",
    "Plan tijd voor onderhoud van je systemen",
    "Gebruik kleuren per project of type taak",
    "Vermijd plannen tot het perfect is; begin",
    "Plan tijd voor eten zonder haast",
    "Gebruik een 'niet doen'-lijst voor deze week",
    "Je mag hulp vragen bij plannen en onthouden",
    "Plan vaste momenten voor nieuws of updates",
    "Gebruik één kalender voor werk en privé als dat kan",
    "Een korte wandeling reset je aandacht",
    "Plan tijd voor rommel opruimen wekelijks",
    "Gebruik een vaste ochtend- en avondroutine",
    "ADHD vraagt om zelfcompassie, niet harder pushen",
    "Plan tijd voor wat je uitstelt; begin met 5 min",
    "Gebruik herinneringen voor alles wat niet vanzelf gaat",
    "Minder is vaak meer op je dagelijkse lijst",
    "Plan tijd voor evaluatie: wat ging goed?",
    "Gebruik een 'wacht'-map voor antwoorden van anderen",
    "Je bent niet alleen in het zoeken naar structuur",
    "Plan tijd voor creativiteit zonder doel",
    "Gebruik body doubling of focus-sessies online",
    "Rust na een drukke dag is productief",
    "Plan vaste tijden voor bellen en mailen",
    "Gebruik een vaste plek voor portemonnee 's nachts",
    "Kleine routines bouwen vertrouwen",
    "Plan tijd voor hobby's en spel",
    "Gebruik een 'morgen eerst'-lijst van max 3 dingen",
    "Vergelijk je vandaag met gisteren, niet met ideaal",
    "Plan tijd voor niets; het helpt je brein",
    "Gebruik één notitieblok of app voor snelle notities",
    "Je mag je planning elke dag aanpassen",
    "Plan tijd voor gesprekken die energie geven",
    "Gebruik een vaste plek voor opladers",
    "Vooruitgang is vooruitgang, hoe klein ook",
    "Plan 'buffer'-tijd tussen afspraken",
    "Gebruik een weekeinde-moment om de week af te sluiten",
    "ADHD betekent ook doorzettingsvermogen en creativiteit",
    "Plan tijd voor wat je uitstelt; 10 min is genoeg om te starten",
    "Gebruik een 'parkeerplaats' voor goede ideeën",
    "Rust en herstel zijn onderdeel van het plan",
    "Plan tijd voor beweging elke dag",
    "Gebruik een vaste volgorde voor je ochtend",
    "Je hoeft niet alles vandaag af te krijgen",
    "Plan tijd voor ontspanning zonder schuld",
    "Gebruik een 'done'-lijst om vooruitgang te zien",
    "Structuur is er om je te dienen, niet om je te beperken",
    "Plan tijd voor wat je energie geeft",
    "Gebruik één plek voor alle afspraken",
    "Elke dag is een nieuwe kans om te plannen",
  ];

  const getDailyTips = () => {
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
    const seed = dayOfYear % allPlanningTips.length;
    
    const selectedTips = [];
    const usedIndices = new Set();
    for (let i = 0; i < 4; i++) {
      let index = (seed + i * 7) % allPlanningTips.length;
      // Zorg voor unieke tips
      while (usedIndices.has(index) && usedIndices.size < allPlanningTips.length) {
        index = (index + 1) % allPlanningTips.length;
      }
      usedIndices.add(index);
      selectedTips.push(allPlanningTips[index]);
    }
    
    return selectedTips;
  };

  const [dailyTips] = useState(() => getDailyTips());

  // Medicatie opslaan
  const handleSaveMedication = async () => {
    if (isSavingMedication || medicationSaveRef.current) {
      return;
    }

    if (!medicationData.name || !medicationData.time) {
      toast('Vul minimaal medicatie naam en tijdstip in');
      return;
    }

    medicationSaveRef.current = true;
    setIsSavingMedication(true);

    try {
      const [hours, minutes] = medicationData.time.split(':').map(Number);
      const today = new Date();
      today.setHours(hours, minutes, 0, 0);
      
      const medicationTitle = `${medicationData.name}${medicationData.dosage ? ` (${medicationData.dosage})` : ''}`;
      
      const existingMedication = tasks.filter(
        task => task.source === 'medication' && 
        task.title === medicationTitle &&
        task.dueAt
      );
      
      if (medicationData.addToAgenda) {
        // Meerdere dagen: maak per dag een medicatietaak (lokale datum voor correcte vergelijking)
        const baseDate = new Date();
        baseDate.setHours(0, 0, 0, 0);
        const n = Math.max(1, Math.min(365, medicationData.daysToAdd || 30));
        let added = 0;
        for (let dayOffset = 0; dayOffset < n; dayOffset++) {
          const doseDate = new Date(baseDate);
          doseDate.setDate(baseDate.getDate() + dayOffset);
          if (medicationData.weekdaysOnly) {
            const dow = doseDate.getDay();
            if (dow === 0 || dow === 6) continue;
          }
          doseDate.setHours(hours, minutes, 0, 0);
          const dateKey = `${doseDate.getFullYear()}-${String(doseDate.getMonth() + 1).padStart(2, '0')}-${String(doseDate.getDate()).padStart(2, '0')}`;
          const alreadyExists = existingMedication.some(task => {
            if (!task.dueAt) return false;
            const taskDate = new Date(task.dueAt);
            const taskKey = `${taskDate.getFullYear()}-${String(taskDate.getMonth() + 1).padStart(2, '0')}-${String(taskDate.getDate()).padStart(2, '0')}`;
            return taskKey === dateKey && taskDate.getHours() === hours && taskDate.getMinutes() === minutes;
          });
          if (!alreadyExists) {
            await addTaskToDatabase({
              title: medicationTitle,
              duration: 5,
              priority: null,
              done: false,
              started: false,
              dueAt: doseDate.toISOString(),
              reminders: [parseInt(medicationData.reminder) || 10],
              repeat: 'none',
              impact: medicationData.dosage || '',
              energyLevel: 'low',
              estimatedDuration: 5,
              source: 'medication'
            });
            added++;
          }
        }
        toast(added > 0 ? `Medicatie toegevoegd voor ${added} dagen` : 'Medicatie stond al op deze tijden voor de gekozen periode');
      } else {
        const exists = existingMedication.some(task => {
          if (!task.dueAt) return false;
          const taskDate = new Date(task.dueAt);
          const todayKey = today.toISOString().split('T')[0];
          const taskDateKey = taskDate.toISOString().split('T')[0];
          return taskDateKey === todayKey && 
                 taskDate.getHours() === hours && 
                 taskDate.getMinutes() === minutes;
        });
        
        if (exists) {
          toast('Medicatie bestaat al voor vandaag op dit tijdstip');
        } else {
          await addTaskToDatabase({
            title: medicationTitle,
            duration: 5,
            priority: null,
            done: false,
            started: false,
            dueAt: today.toISOString(),
            reminders: [parseInt(medicationData.reminder) || 10],
            repeat: medicationData.repeat === 'daily' ? 'daily' : 'none',
            impact: medicationData.dosage || '',
            energyLevel: 'low',
            estimatedDuration: 5,
            source: 'medication'
          });
          toast('Medicatie toegevoegd aan agenda!');
        }
      }

      setMedicationData({
        name: '',
        dosage: '',
        time: '',
        repeat: 'daily',
        reminder: '10',
        addToAgenda: false,
        daysToAdd: 30,
        weekdaysOnly: false
      });
      setShowMedicationTracker(false);
      await fetchTasks();
    } catch (error) {
      console.error('[Medication] Failed to save medication:', error);
      toast('Fout bij opslaan van medicatie');
    } finally {
      setIsSavingMedication(false);
      medicationSaveRef.current = false;
    }
  };

  // Filter items voor geselecteerde dag
  const getItemsForDate = (date: Date) => {
    return allAgendaItems.filter(item => isSameDay(item.startTime, date));
  };

  // Items in een periode (voor week/werkweek/maand) – voor correcte telling
  const getItemsForPeriod = useMemo(() => {
    return (view: 'day' | 'week' | 'workweek' | 'month', date: Date) => {
      if (view === 'day') {
        return allAgendaItems.filter(item => isSameDay(item.startTime, date));
      }
      const itemTime = (item: { startTime: Date }) => item.startTime.getTime();
      if (view === 'week') {
        const weekStart = new Date(date);
        const d = weekStart.getDay();
        weekStart.setDate(weekStart.getDate() - (d === 0 ? 6 : d - 1));
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);
        return allAgendaItems.filter(item => {
          const t = itemTime(item);
          return t >= weekStart.getTime() && t < weekEnd.getTime();
        });
      }
      if (view === 'workweek') {
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + 5);
        return allAgendaItems.filter(item => {
          const t = itemTime(item);
          return t >= start.getTime() && t < end.getTime();
        });
      }
      // month
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 1, 0, 0, 0, 0);
      return allAgendaItems.filter(item => {
        const t = itemTime(item);
        return t >= monthStart.getTime() && t < monthEnd.getTime();
      });
    };
  }, [allAgendaItems]);

  // Filter items voor tijd slot
  const getItemsForTimeSlot = (hour: number, minute: number = 0) => {
    const slotStart = new Date(selectedDate);
    slotStart.setHours(hour, minute, 0, 0);
    const slotEnd = new Date(slotStart);
    slotEnd.setHours(hour, minute === 0 ? hour + 1 : hour, minute === 0 ? 0 : 30, 0);
    
    return allAgendaItems.filter(item => {
      if (!isSameDay(item.startTime, selectedDate)) return false;
      
      // Check of item overlapt met dit tijdslot
      return (item.startTime < slotEnd && item.endTime > slotStart);
    });
  };

  // Drag & drop: verplaats taak/gebeurtenis naar nieuwe tijd op dezelfde dag
  const handleDayItemDragStart = (e: React.DragEvent, item: AgendaItem) => {
    if (item.type === 'medication') return;
    if ((e.target as HTMLElement).closest('[data-resize-handle]')) {
      e.preventDefault();
      return;
    }
    setDraggingId(item.id);
    const pxPerMin = PIXELS_PER_30MIN / 30;
    const startMinutes = item.startTime.getHours() * 60 + item.startTime.getMinutes();
    const itemTopPx = GRID_TOP_OFFSET + calculateTop(startMinutes);
    const scrollEl = dayScrollRef.current;
    const timelineRef = dayTimelineRef.current;
    if (scrollEl && timelineRef) {
      const timelineRect = timelineRef.getBoundingClientRect();
      const cursorContentY = e.clientY - timelineRect.top + scrollEl.scrollTop;
      const dragOffsetContent = cursorContentY - itemTopPx;
      e.dataTransfer.setData('application/json', JSON.stringify({ id: item.id, duration: item.duration, dragOffsetContent }));
    } else {
      e.dataTransfer.setData('application/json', JSON.stringify({ id: item.id, duration: item.duration, dragOffsetContent: 0 }));
    }
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.title);
  };

  const handleDayTimelineDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDayTimelineDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDraggingId(null);
    const raw = e.dataTransfer.getData('application/json');
    if (!raw) return;
    const scrollEl = dayScrollRef.current;
    const timelineRef = dayTimelineRef.current;
    if (!scrollEl || !timelineRef) return;
    try {
      const parsed = JSON.parse(raw) as { id: string; duration: number; dragOffsetContent?: number };
      const { id: rawId, dragOffsetContent = 0 } = parsed;
      const taskId = rawId.includes('::') ? rawId.split('::')[0]! : rawId;
      const pxPerMin = PIXELS_PER_30MIN / 30;
      const scrollRect = scrollEl.getBoundingClientRect();
      const cursorContentY = e.clientY - scrollRect.top + scrollEl.scrollTop;
      const newItemTopPx = cursorContentY - dragOffsetContent;
      const exactMinutes = dayRangeStartMinutes + Math.max(0, newItemTopPx - GRID_TOP_OFFSET) / pxPerMin;
      let minutesSinceMidnight = Math.round(exactMinutes / 30) * 30;
      minutesSinceMidnight = Math.max(dayRangeStartMinutes, Math.min(minutesSinceMidnight, dayRangeEndMinutes));
      const dropHour = Math.floor(minutesSinceMidnight / 60);
      const dropMin = minutesSinceMidnight % 60;
      const newStart = new Date(selectedDate);
      newStart.setHours(dropHour, dropMin, 0, 0);
      await updateTaskInDatabase(taskId, { dueAt: newStart.toISOString() });
      toast(`Verplaatst naar ${dropHour.toString().padStart(2, '0')}:${dropMin.toString().padStart(2, '0')}`);
      await fetchTasks();
    } catch (err) {
      console.error('Drop failed:', err);
      toast('Verplaatsen mislukt');
    }
  };

  const handleDayItemDragEnd = () => {
    setDraggingId(null);
  };

  // Y-positie (clientY) omzetten naar minuten sinds middernacht (zelfde logica als drop, incl. -30 correctie)
  const clientYToMinutes = useCallback((clientY: number): number => {
    const scrollEl = dayScrollRef.current;
    if (!scrollEl) return 0;
    const scrollRect = scrollEl.getBoundingClientRect();
    const pxPerMin = PIXELS_PER_30MIN / 30;
    const offsetY = clientY - scrollRect.top + scrollEl.scrollTop;
    const offsetFromGrid = Math.max(0, offsetY - GRID_TOP_OFFSET);
    let minutes = dayRangeStartMinutes + Math.round(offsetFromGrid / pxPerMin);
    minutes = Math.round(minutes / 30) * 30;
    return Math.max(dayRangeStartMinutes, Math.min(minutes, dayRangeEndMinutes));
  }, [dayRangeStartMinutes, dayRangeEndMinutes]);

  const handleResizeStart = (item: AgendaItem, edge: 'top' | 'bottom', e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startMinutes = item.startTime.getHours() * 60 + item.startTime.getMinutes();
    const duration = Math.max(item.duration || 15, 15);
    setResizingItem({
      id: item.id,
      edge,
      originalStartMinutes: startMinutes,
      originalDuration: duration,
      startY: e.clientY,
    });
    setResizePreview({ startMinutes, duration });
  };

  const handleResizeMove = useCallback(
    (e: MouseEvent) => {
      if (!resizingItem) return;
      const minutes = clientYToMinutes(e.clientY);
      const originalEnd = resizingItem.originalStartMinutes + resizingItem.originalDuration;
      const minDuration = 15;
      const maxDuration = 8 * 60;

      if (resizingItem.edge === 'top') {
        // Altijd relatief aan het zichtbare bereik (viewStartHour), niet aan 00:00
        const newStart = Math.max(dayRangeStartMinutes, Math.min(minutes, originalEnd - minDuration));
        const newDuration = originalEnd - newStart;
        setResizePreview({ startMinutes: newStart, duration: newDuration });
      } else {
        // Altijd relatief aan het zichtbare bereik (viewStartHour), niet aan 24:00
        const newEnd = Math.max(
          resizingItem.originalStartMinutes + minDuration,
          Math.min(dayRangeEndMinutes, minutes)
        );
        const newDuration = newEnd - resizingItem.originalStartMinutes;
        setResizePreview({ startMinutes: resizingItem.originalStartMinutes, duration: newDuration });
      }
    },
    [resizingItem, clientYToMinutes, dayRangeStartMinutes, dayRangeEndMinutes]
  );

  const handleResizeEnd = useCallback(async () => {
    if (!resizingItem || !resizePreview) {
      setResizingItem(null);
      setResizePreview(null);
      return;
    }
    const { id: rawId } = resizingItem;
    const taskId = rawId.includes('::') ? rawId.split('::')[0]! : rawId;
    const { startMinutes, duration } = resizePreview;
    const baseTask = tasks.find(t => t.id === taskId);
    const isRecurringInstance = rawId.includes('::');
    try {
      const payload: { dueAt?: string; duration: number } = { duration };
      if (!isRecurringInstance) {
        const newStart = new Date(selectedDate);
        newStart.setHours(0, 0, 0, 0);
        newStart.setMinutes(startMinutes);
        payload.dueAt = newStart.toISOString();
      } else if (baseTask?.dueAt) {
        const orig = new Date(baseTask.dueAt);
        orig.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);
        payload.dueAt = orig.toISOString();
      }
      await updateTaskInDatabase(taskId, payload);
      toast(`Duur aangepast naar ${duration} min`);
      await fetchTasks();
    } catch (err) {
      console.error('Resize failed:', err);
      toast('Aanpassen mislukt');
    }
    setResizingItem(null);
    setResizePreview(null);
    resizeJustEndedRef.current = true;
  }, [resizingItem, resizePreview, selectedDate, updateTaskInDatabase, fetchTasks]);

  useEffect(() => {
    if (!resizingItem) return;
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [resizingItem, handleResizeMove, handleResizeEnd]);

  return (
    <AppLayout>
      <div
        className="min-h-screen py-12 px-4 sm:px-6 pb-16"
        style={{
          color: "#2F3441",
          background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
        }}
      >
        <main
          style={{
            width: "100%",
            maxWidth: 1200,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: 32,
          }}
        >
          {/* Header – zweeft los, luchtigheid zoals Taken/Herinneringen */}
          <header className="text-center pt-12 pb-0 mb-4">
            <div
              className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-4"
              style={{
                background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
                boxShadow: "0 4px 14px rgba(59, 130, 246, 0.35)",
              }}
            >
              <CalendarIcon className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Agenda & Planning</h1>
            <p className="text-sm text-gray-500 mt-2">
              Plan je dag en houd overzicht over je afspraken en taken.
            </p>
          </header>

            {/* View Selector en Tijd Bereik – vaste breedte zodat knoppen niet verschuiven */}
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              <div className="bg-white rounded-2xl shadow-sm p-1 inline-flex">
                {[
                  { key: 'day', label: 'Dag', icon: '📅' },
                  { key: 'week', label: 'Week', icon: '📆' },
                  { key: 'workweek', label: 'Werkweek', icon: '💼' },
                  { key: 'month', label: 'Maand', icon: '🗓️' }
                ].map(({ key, label, icon }) => (
                  <button
                    key={key}
                    onClick={() => setSelectedView(key as 'day' | 'week' | 'month' | 'workweek')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      selectedView === key
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <span className="mr-2">{icon}</span>
                    {label}
                  </button>
                ))}
              </div>

              {/* Tijdbereik of lege plek met vaste breedte – voorkomt verschuiven */}
              <div className="min-w-[200px] h-10 flex items-center justify-center">
                {selectedView === 'day' ? (
                  <div className="relative" ref={timeRangeSelectorRef}>
                    <button
                      onClick={() => setShowTimeRangeSelector(!showTimeRangeSelector)}
                      className="flex items-center gap-2 bg-white rounded-2xl shadow-sm px-4 py-2 text-sm font-medium text-slate-700 hover:shadow-md transition-shadow"
                    >
                      <ClockIcon className="w-4 h-4" />
                      <span>{timeRange === 'custom' ? `${customStart.toString().padStart(2, '0')}:00 - ${customEnd.toString().padStart(2, '0')}:00` : (timeRangeOptions.find(r => r.key === timeRange)?.description || '08:00 - 18:00')}</span>
                      <Cog6ToothIcon className="w-4 h-4" />
                    </button>

                    {showTimeRangeSelector && (
                        <div className="absolute top-full mt-2 right-0 bg-white rounded-2xl shadow-lg z-50 min-w-[200px]">
                        <div className="p-2">
                          {timeRangeOptions.filter(r => r.key !== 'custom').map((option) => (
                            <button
                              key={option.key}
                              onClick={() => {
                                setTimeRange(option.key);
                                setShowTimeRangeSelector(false);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                                timeRange === option.key
                                  ? 'bg-blue-50 text-blue-700 font-medium'
                                  : 'text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <div className="font-medium">{option.label}</div>
                              <div className="text-xs text-slate-500">{option.description}</div>
                            </button>
                          ))}
                          
                          <div className="mt-2 pt-2">
                            {timeRange !== 'custom' ? (
                              <button
                                onClick={() => setTimeRange('custom')}
                                className="w-full text-left px-3 py-2 rounded-md text-sm transition-colors text-slate-700 hover:bg-slate-50"
                              >
                                <div className="font-medium">Aangepast</div>
                                <div className="text-xs text-slate-500">Kies zelf</div>
                              </button>
                            ) : (
                              <div className="px-3 py-2 space-y-2">
                                <div className="flex items-center gap-2">
                                  <select
                                    value={customStart}
                                    onChange={(e) => setCustomStart(parseInt(e.target.value))}
                                    className="flex-1 px-2 py-1.5 rounded-xl shadow-sm bg-white text-sm"
                                  >
                                    {Array.from({ length: 24 }, (_, i) => (
                                      <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                                    ))}
                                  </select>
                                  <span className="text-slate-400">–</span>
                                  <select
                                    value={customEnd}
                                    onChange={(e) => setCustomEnd(parseInt(e.target.value))}
                                    className="flex-1 px-2 py-1.5 rounded-xl shadow-sm bg-white text-sm"
                                  >
                                    {Array.from({ length: 24 }, (_, i) => (
                                      <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                                    ))}
                                  </select>
                                </div>
                                <button
                                  onClick={() => setShowTimeRangeSelector(false)}
                                  className="w-full py-1.5 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
                                >
                                  Gereed
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : selectedView === 'week' || selectedView === 'workweek' ? (
                  <div className="flex items-center gap-2 bg-white rounded-2xl shadow-sm px-4 py-2 text-sm font-medium text-slate-700">
                    Week {getISOWeek(selectedDate)}
                  </div>
                ) : selectedView === 'month' ? (
                  (() => {
                    const { first, last } = getWeekNumbersForMonth(selectedDate.getFullYear(), selectedDate.getMonth());
                    return (
                      <div className="flex items-center gap-2 bg-white rounded-2xl shadow-sm px-4 py-2 text-sm font-medium text-slate-700">
                        Week {first}{first !== last ? ` – ${last}` : ''}
                      </div>
                    );
                  })()
                ) : null}
              </div>
            </div>

          {/* Datum navigatie */}
          <Card variant="elevated">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const newDate = new Date(selectedDate);
                    if (selectedView === 'day') newDate.setDate(newDate.getDate() - 1);
                    else if (selectedView === 'week') newDate.setDate(newDate.getDate() - 7);
                    else if (selectedView === 'workweek') newDate.setDate(newDate.getDate() - 5);
                    else if (selectedView === 'month') newDate.setMonth(newDate.getMonth() - 1);
                    setSelectedDate(newDate);
                  }}
                  className="p-2"
                >
                  <ChevronLeftIcon className="w-5 h-5" />
                </Button>
                
                <div className="text-center">
                  <h2 className="text-lg font-semibold text-slate-900">
                    {selectedView === 'day' && formatDate(selectedDate)}
                    {selectedView === 'week' && (() => {
                      const weekStart = new Date(selectedDate);
                      const d = weekStart.getDay();
                      weekStart.setDate(weekStart.getDate() - d + (d === 0 ? -6 : 1));
                      return formatDateRange(weekStart, 7);
                    })()}
                    {selectedView === 'workweek' && formatDateRange(selectedDate, 5)}
                    {selectedView === 'month' && selectedDate.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {(() => {
                      const filteredItems = getItemsForPeriod(selectedView, selectedDate);
                      const incompleteCount = filteredItems.filter(item => !item.completed).length;
                      
                      if (selectedView === 'day') return `${incompleteCount} item${incompleteCount !== 1 ? 's' : ''} vandaag`;
                      if (selectedView === 'week') return `${incompleteCount} item${incompleteCount !== 1 ? 's' : ''} deze week`;
                      if (selectedView === 'workweek') return `${incompleteCount} item${incompleteCount !== 1 ? 's' : ''} deze werkweek`;
                      return `${incompleteCount} item${incompleteCount !== 1 ? 's' : ''} deze maand`;
                    })()}
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const newDate = new Date(selectedDate);
                    if (selectedView === 'day') newDate.setDate(newDate.getDate() + 1);
                    else if (selectedView === 'week') newDate.setDate(newDate.getDate() + 7);
                    else if (selectedView === 'workweek') newDate.setDate(newDate.getDate() + 5);
                    else if (selectedView === 'month') newDate.setMonth(newDate.getMonth() + 1);
                    setSelectedDate(newDate);
                  }}
                  className="p-2"
                >
                  <ChevronRightIcon className="w-5 h-5" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Dag overzicht met stippellijn tijdsas */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tijdlijn met stippellijnen */}
            <Card variant="elevated" className="lg:col-span-2">
              <CardHeader>
                <CardTitle>
                  {selectedView === 'day' && 'Dag Planning'}
                  {selectedView === 'week' && 'Week Planning'}
                  {selectedView === 'workweek' && 'Werkweek Planning'}
                  {selectedView === 'month' && 'Maand Planning'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedView === 'day' && (() => {
                  const dayItems = getItemsForDate(selectedDate);
                  return (
                    <div ref={dayScrollRef} className="relative" style={{ minHeight: 400 }}>
                      {/* Tijdslijn: vaste hoogte 48px per 30 min, labels links; gebeurtenissen + taken op dagniveau */}
                      <div className="relative flex">
                        <div className="flex-shrink-0 w-14" style={{ paddingTop: GRID_TOP_OFFSET - PIXELS_PER_30MIN }}>
                          {Array.from({ length: dayRange.endHour - dayRange.startHour }, (_, i) => (
                            <div
                              key={i}
                              className="text-xs text-slate-500 font-medium"
                              style={{ height: PIXELS_PER_30MIN * 2, lineHeight: `${PIXELS_PER_30MIN * 2}px` }}
                            >
                              {(dayRange.startHour + i).toString().padStart(2, '0')}:00
                            </div>
                          ))}
                        </div>
                        <div
                          ref={dayTimelineRef}
                          className="flex-1 relative"
                          style={{ height: dayViewTotalHeight }}
                          onDragOver={handleDayTimelineDragOver}
                          onDrop={handleDayTimelineDrop}
                        >
                          {/* Eerste lijn = starttijd; wrapper met padding zodat 0:00-lijn en label op één hoogte */}
                          <div className="absolute inset-0" style={{ paddingTop: GRID_TOP_OFFSET }}>
                            <div className="relative" style={{ height: dayViewGridHeight }}>
                              {timeSlots.filter(s => s.minute === 0 || s.minute === 30).map((slot) => (
                                <div
                                  key={`${slot.hour}-${slot.minute}`}
                                  className="absolute left-0 right-0 border-b border-gray-100"
                                  style={{
                                    top: calculateTop(slot.hour * 60 + slot.minute),
                                    height: 0,
                                  }}
                                />
                              ))}
                              {dayItems
                            .map((item) => {
                            const isResizing = resizingItem?.id === item.id;
                            const startMinutes = isResizing && resizePreview
                              ? resizePreview.startMinutes
                              : item.startTime.getHours() * 60 + item.startTime.getMinutes();
                            const duration = item.type === 'medication'
                              ? 5
                              : (isResizing && resizePreview ? resizePreview.duration : Math.max(item.duration || 15, 15));
                            const endMinutes = startMinutes + duration;
                            const visStart = Math.max(startMinutes, dayRangeStartMinutes);
                            const visEnd = Math.min(endMinutes, dayRangeEndMinutes);
                            // Events/taken horen alleen zichtbaar te zijn als ze (minimaal deels) binnen het bereik vallen.
                            // Voorbeeld: bij day-range tot 18:00 mag een event dat precies op 18:00 begint niet renderen.
                            const isCompletelyOutsideForTimeline =
                              item.type !== 'medication' &&
                              (startMinutes >= dayRangeEndMinutes || endMinutes <= dayRangeStartMinutes);
                            if (isCompletelyOutsideForTimeline) return null;
                            // Items buiten het zichtbare bereik (bijv. medicatie 07:00 of 22:00) toch tonen aan rand
                            // Als een item precies op de startgrens eindigt, hoort het niet als "vóór het bereik"
                            // behandeld te worden.
                            const isBeforeRange = endMinutes < dayRangeStartMinutes;
                            // Als een item precies op de eindgrens start (bv. 18:00 terwijl dag eindigt op 18:00),
                            // dan hoort het aan de onderkant van het bereik te landen (niet omhoog geschoven).
                            const isAfterRange = startMinutes > dayRangeEndMinutes;
                            let topPx: number;
                            let heightPx: number;
                            if (isBeforeRange) {
                              topPx = 0;
                              heightPx = calculateHeight(duration);
                            } else if (isAfterRange) {
                              topPx = Math.max(0, dayViewGridHeight - calculateHeight(duration));
                              heightPx = calculateHeight(duration);
                            } else {
                              topPx = calculateTop(visStart);
                              heightPx = calculateHeight(Math.max(visEnd - visStart, 5));
                            }
                            const isDraggable = item.type !== 'medication';
                            const isDragging = draggingId === item.id;
                            const isResizable = (item.type === 'task' || item.type === 'event') && !item.completed;
                            const startTimeDisplay = new Date(selectedDate);
                            startTimeDisplay.setHours(0, 0, 0, 0);
                            startTimeDisplay.setMinutes(startMinutes);
                            const endTimeDisplay = new Date(startTimeDisplay.getTime() + duration * 60000);
                            return (
                              <div
                                key={item.id}
                                draggable={isDraggable}
                                onDragStart={(e) => isDraggable && handleDayItemDragStart(e, item)}
                                onDragEnd={handleDayItemDragEnd}
                                className={`absolute left-1 right-1 rounded-xl shadow-sm text-sm overflow-hidden ${item.color} ${item.isDeadline ? 'border-l-4 border-l-red-500' : ''} ${item.completed ? 'opacity-50' : ''} ${isDraggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} hover:shadow-md transition-shadow ${isDragging ? 'opacity-40' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if ((e.target as HTMLElement).closest('[data-resize-handle]')) return;
                                  if (resizeJustEndedRef.current) {
                                    resizeJustEndedRef.current = false;
                                    return;
                                  }
                                  setEditingItem(item);
                                }}
                                onContextMenu={(e) => {
                                  e.preventDefault();
                                  if (resizeJustEndedRef.current) return;
                                  if (item.type === 'task' || item.type === 'event') setEditingItem(item);
                                }}
                                style={{
                                  top: `${topPx}px`,
                                  height: `${heightPx}px`,
                                  minHeight: `${PIXELS_PER_30MIN / 2}px`,
                                  zIndex: isDragging || isResizing ? 20 : 10,
                                }}
                                title={isDraggable ? `Slepen om te verplaatsen · ${item.icon ? item.icon + ' ' : ''}${item.title}` : `${item.icon ? item.icon + ' ' : ''}${item.title} - ${item.startTime.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })} - ${item.endTime.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}`}
                              >
                                {isResizable && (
                                  <>
                                    <div
                                      data-resize-handle
                                      className="absolute left-0 right-0 top-0 h-2 cursor-n-resize flex-shrink-0 z-10 rounded-t-lg hover:bg-black/10"
                                      onMouseDown={(e) => handleResizeStart(item, 'top', e)}
                                      title="Sleep om starttijd te wijzigen"
                                    />
                                    <div
                                      data-resize-handle
                                      className="absolute left-0 right-0 bottom-0 h-2 cursor-n-resize flex-shrink-0 z-10 rounded-b-lg hover:bg-black/10"
                                      onMouseDown={(e) => handleResizeStart(item, 'bottom', e)}
                                      title="Sleep om eindtijd te wijzigen"
                                    />
                                  </>
                                )}
                                <div className={`flex items-center gap-2 h-full min-h-0 overflow-hidden ${heightPx < 36 ? 'p-1.5' : 'p-2'}`}>
                                  {item.completed ? (
                                    <CheckCircleIcon className={`flex-shrink-0 text-green-600 ${heightPx < 36 ? 'w-4 h-4' : 'w-5 h-5'}`} title="Voltooid" />
                                  ) : (
                                    item.icon && <span className={`flex-shrink-0 ${heightPx < 36 ? 'text-sm' : 'text-base'}`}>{item.icon}</span>
                                  )}
                                  <div className="flex-1 min-w-0 overflow-hidden">
                                    {heightPx < 36 ? (
                                      <div className="text-xs truncate leading-none">
                                        <span className="font-medium">{item.title}</span>
                                        <span className="opacity-75 ml-1">
                                          {startTimeDisplay.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                                          {' - '}
                                          {endTimeDisplay.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                      </div>
                                    ) : (
                                      <>
                                        <div className="font-medium truncate leading-tight">{item.title}</div>
                                        <div className="text-xs opacity-75 truncate mt-0.5">
                                          {startTimeDisplay.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                                          {` - ${endTimeDisplay.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}`}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                  {item.type === 'task' && !item.completed && heightPx >= 36 && (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      className="flex-shrink-0 h-7 text-xs"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        window.location.href = `/focus?task=${encodeURIComponent(item.title)}&duration=${item.type === 'medication' ? 5 : (item.duration || 15)}`;
                                      }}
                                      title="Start focus"
                                    >
                                      <PlayIcon className="w-4 h-4 mr-1" />
                                      Start
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Week/Werkweek/Month views */}
                {(selectedView === 'week' || selectedView === 'workweek' || selectedView === 'month') && (() => {
                  const startDate = new Date(selectedDate);
                  let daysToShow: number;
                  if (selectedView === 'month') {
                    startDate.setDate(1);
                    startDate.setHours(0, 0, 0, 0);
                    // Werkelijk aantal dagen in deze maand (28, 29, 30 of 31)
                    daysToShow = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate();
                  } else if (selectedView === 'workweek') {
                    daysToShow = 5;
                    const day = startDate.getDay();
                    const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
                    startDate.setDate(diff);
                  } else {
                    daysToShow = 7;
                    const day = startDate.getDay();
                    const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
                    startDate.setDate(diff);
                  }
                  
                  const days = Array.from({ length: daysToShow }, (_, i) => {
                    const date = new Date(startDate);
                    date.setDate(startDate.getDate() + i);
                    return date;
                  });
                  
                  return (
                    <div className="flex flex-col gap-4">
                      {days.map((day, idx) => {
                        const dayItems = getItemsForDate(day);
                        const isToday = isSameDay(day, new Date());
                        
                        return (
                      <div
                        key={idx}
                            className={`p-4 rounded-2xl shadow-sm ${isToday ? 'bg-blue-50 ring-2 ring-blue-200' : 'bg-white'}`}
                          >
                            <div className={`text-base font-semibold mb-3 ${isToday ? 'text-blue-700' : 'text-slate-700'}`}>
                              {day.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^\w/, (c) => c.toUpperCase())}
                            </div>
                            <div className="space-y-2">
                              {dayItems.length === 0 ? (
                                <p className="text-sm text-slate-500">Geen items</p>
                              ) : (
                                dayItems.map((item) => (
                                  <div
                                    key={item.id}
                                    onClick={() => setEditingItem(item)}
                                    className={`p-3 rounded-lg text-sm cursor-pointer hover:shadow-sm border ${item.color} ${item.isDeadline ? 'border-l-4 border-l-red-500' : ''} ${item.completed ? 'opacity-50' : ''}`}
                                  >
                                    <div className="font-medium">{item.icon} {item.title}</div>
                                    <div className="text-sm opacity-80 mt-1">
                                      {item.startTime.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                                      {item.endTime && ` - ${item.endTime.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}`}
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Sidebar: actieknoppen als prominente kaarten bovenaan, takenlijst alleen bij Dag-view */}
            <div className="space-y-6">
              {/* 1. Actieknoppen – prominente kaarten in Herinneringen-stijl */}
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setNewEvent({ ...newEvent, date: formatDateInputLocal(selectedDate) });
                    setShowAddEvent(true);
                  }}
                  className="flex items-center gap-3 w-full p-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow text-left group"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                    <CalendarIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate">Nieuwe Gebeurtenis</p>
                    <p className="text-xs text-slate-500 truncate">Afspraak toevoegen</p>
                  </div>
                  <ChevronRightIcon className="w-5 h-5 text-slate-400 group-hover:text-slate-600 flex-shrink-0" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowMedicationTracker(true)}
                  className="flex items-center gap-3 w-full p-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow text-left group"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center">
                    <ClockIcon className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate">Medicatie</p>
                    <p className="text-xs text-slate-500 truncate">Herinnering instellen</p>
                  </div>
                  <ChevronRightIcon className="w-5 h-5 text-slate-400 group-hover:text-slate-600 flex-shrink-0" />
                </button>
              </div>

              {/* 2. Op de agenda vandaag – alleen bij Dag-view (afvinklijst) */}
              {selectedView === 'day' && (
                <Card variant="elevated">
                  <CardHeader>
                    <CardTitle>Op de agenda vandaag</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-[280px] overflow-y-auto">
                      {(() => {
                        const items = getItemsForDate(selectedDate).sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
                        if (items.length === 0) return <p className="text-sm text-slate-500">Geen afspraken of medicatie voor deze dag.</p>;
                        return items.map((item) => (
                          <div
                            key={item.id}
                            draggable={item.type !== 'medication'}
                            onDragStart={(e) => {
                              if (item.type === 'medication') return;
                              e.dataTransfer.setData('application/json', JSON.stringify({ id: item.id, duration: item.duration || 15, dragOffsetContent: 0 }));
                              e.dataTransfer.effectAllowed = 'move';
                              e.dataTransfer.setData('text/plain', item.title);
                            }}
                            className={`flex items-center gap-2 p-3 rounded-lg border text-left cursor-grab active:cursor-grabbing ${item.color} ${item.isDeadline ? 'border-l-4 border-l-red-500' : ''} ${item.completed ? 'opacity-70' : ''}`}
                          >
                            {item.completed ? (
                              <CheckCircleIcon className="w-5 h-5 flex-shrink-0 text-green-600" aria-hidden />
                            ) : item.icon ? (
                              <span className="flex-shrink-0 text-base">{item.icon}</span>
                            ) : (
                              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                                item.type === 'event' ? 'bg-green-500' : item.type === 'medication' ? 'bg-red-500' : 'bg-blue-500'
                              }`} />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{item.title}</p>
                              <p className="text-xs text-slate-500">
                                {item.startTime.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                                {item.duration ? ` · ${item.duration} min` : ''}
                              </p>
                            </div>
                            {item.type === 'task' && !item.completed && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="flex-shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.location.href = `/focus?task=${encodeURIComponent(item.title)}&duration=${item.type === 'medication' ? 5 : (item.duration || 15)}`;
                                }}
                              >
                                Start
                              </Button>
                            )}
                          </div>
                        ));
                      })()}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Planning Tips – variërende motiverende quotes m.b.t. plannen en ADHD */}
              <Card variant="elevated" className="bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-blue-800">Planning Tips</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-blue-700 text-sm">
                    {dailyTips.map((tip, index) => (
                      <li key={index}>• {tip}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Legenda */}
              <Card variant="elevated">
                <div
                  className="cursor-pointer select-none"
                  onClick={() => setLegendaOpen(!legendaOpen)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between w-full">
                      <CardTitle>Legenda</CardTitle>
                      {legendaOpen ? (
                        <ChevronUpIcon className="w-5 h-5 text-slate-500" />
                      ) : (
                        <ChevronDownIcon className="w-5 h-5 text-slate-500" />
                      )}
                    </div>
                  </CardHeader>
                </div>
                {legendaOpen && (
                <CardContent>
                  <div className="space-y-3 text-sm text-slate-600">
                    <div>
                      <p className="font-medium text-slate-700 mb-1.5">Categorieën</p>
                      <ul className="space-y-1">
                        <li className="flex items-center gap-2"><span className="text-base">🔵</span> Werk / Focus</li>
                        <li className="flex items-center gap-2"><span className="text-base">🟢</span> Persoonlijk / Huis</li>
                        <li className="flex items-center gap-2"><span className="text-base">🟣</span> Afspraken / Extern</li>
                        <li className="flex items-center gap-2"><span className="text-base">🩷</span> Gezondheid / Medicatie</li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium text-slate-700 mb-1.5">Modifiers</p>
                      <ul className="space-y-1">
                        <li className="flex items-center gap-2"><span className="text-base">⚠️</span> Urgent / Deadline (rode rand)</li>
                        <li className="flex items-center gap-2"><span className="text-base">✅</span> Voltooid (grijs)</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
                )}
              </Card>

            </div>
          </div>

          {/* Add Event Modal – Grid Sandwich */}
          {showAddEvent && (
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto p-6">
                {/* Header */}
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Gebeurtenis toevoegen</h2>
                {/* Titel */}
                <div className="mb-4">
                  <input
                    type="text"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    placeholder="Wat is de gebeurtenis?"
                    className="w-full p-3 rounded-2xl shadow-sm bg-white focus:ring-2 focus:ring-gray-200"
                  />
                </div>
                {/* Tijd/Duur: 2 strakke witte kaarten naast elkaar */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <label className="block bg-white rounded-2xl p-3 shadow-sm">
                    <span className="text-xs font-medium text-gray-500 block mb-1">Starttijd *</span>
                    <input
                      type="time"
                      value={newEvent.startTime}
                      onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                      className="w-full text-lg font-semibold text-gray-900 bg-transparent border-0 p-0 focus:ring-0"
                    />
                  </label>
                  <label className="block bg-white rounded-2xl p-3 shadow-sm">
                    <span className="text-xs font-medium text-gray-500 block mb-1">Eindtijd</span>
                    <input
                      type="time"
                      value={newEvent.endTime}
                      onChange={(e) => {
                        setNewEvent({ ...newEvent, endTime: e.target.value });
                        if (newEvent.startTime && e.target.value) {
                          const [startH, startM] = newEvent.startTime.split(':').map(Number);
                          const [endH, endM] = e.target.value.split(':').map(Number);
                          const dur = (endH * 60 + endM) - (startH * 60 + startM);
                          if (dur > 0) setNewEvent(prev => ({ ...prev, duration: dur, endTime: e.target.value }));
                        }
                      }}
                      className="w-full text-lg font-semibold text-gray-900 bg-transparent border-0 p-0 focus:ring-0"
                    />
                  </label>
                </div>
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Datum *</label>
                  <input
                    type="date"
                    value={newEvent.date || formatDateInputLocal(selectedDate)}
                    onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                    className="w-full p-3 rounded-2xl border border-gray-100 focus:ring-2 focus:ring-gray-200"
                  />
                </div>
                {/* Categorieën: 4-koloms grid */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setNewEvent({ ...newEvent, category: cat.value })}
                      className={`w-full min-w-0 h-12 rounded-2xl text-xs font-semibold text-center truncate transition-colors flex items-center justify-center px-1 ${newEvent.category === cat.value ? cat.color : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                    >
                      {cat.icon} {cat.label}
                    </button>
                  ))}
                </div>
                {/* Progressive Disclosure: Beschrijving */}
                <details className="group bg-gray-50 rounded-2xl overflow-hidden">
                  <summary className="flex items-center justify-between px-4 py-4 cursor-pointer hover:bg-gray-100/80 transition-colors">
                    <span className="font-semibold text-gray-900">Meer opties</span>
                    <ChevronDownIcon className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className="px-4 pb-4">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Beschrijving</label>
                    <textarea
                      value={newEvent.description}
                      onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                      className="w-full p-3 text-sm bg-white rounded-xl border-0 focus:ring-2 focus:ring-gray-200"
                      rows={2}
                      placeholder="Optioneel"
                    />
                  </div>
                </details>
                <div className="flex items-center justify-end gap-3 mt-6">
                  <Button type="button" variant="outline" onClick={() => setShowAddEvent(false)} className="rounded-2xl">
                    Annuleren
                  </Button>
                  <Button type="button" onClick={handleAddEvent} className="rounded-2xl bg-blue-600 hover:bg-blue-700 text-white">
                    Toevoegen
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Medication Tracker Modal – Grid Sandwich */}
          {showMedicationTracker && (
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto p-6">
                {/* Header */}
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Medicatie Tracker</h2>
                <p className="text-sm text-slate-500 mb-6">Houd bij wanneer je je medicatie hebt ingenomen en stel herinneringen in.</p>
                
                {/* Tijd/Duur: 2 strakke witte kaarten */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <label className="block bg-white rounded-2xl p-3 shadow-sm">
                    <span className="text-xs font-medium text-gray-500 block mb-1">Medicatie Naam</span>
                    <input
                      type="text"
                      placeholder="bijv. Ritalin, Concerta"
                      value={medicationData.name}
                      onChange={(e) => setMedicationData({...medicationData, name: e.target.value})}
                      className="w-full text-lg font-semibold text-gray-900 bg-transparent border-0 p-0 focus:ring-0 min-w-0"
                    />
                  </label>
                  <label className="block bg-white rounded-2xl p-3 shadow-sm">
                    <span className="text-xs font-medium text-gray-500 block mb-1">Dosering</span>
                    <input
                      type="text"
                      placeholder="bijv. 10mg"
                      value={medicationData.dosage}
                      onChange={(e) => setMedicationData({...medicationData, dosage: e.target.value})}
                      className="w-full text-lg font-semibold text-gray-900 bg-transparent border-0 p-0 focus:ring-0 min-w-0 truncate"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <label className="block bg-white rounded-2xl p-3 shadow-sm">
                    <span className="text-xs font-medium text-gray-500 block mb-1">Tijdstip</span>
                    <input
                      type="time"
                      value={medicationData.time}
                      onChange={(e) => setMedicationData({...medicationData, time: e.target.value})}
                      className="w-full text-lg font-semibold text-gray-900 bg-transparent border-0 p-0 focus:ring-0"
                    />
                  </label>
                  <label className="block bg-white rounded-2xl p-3 shadow-sm">
                    <span className="text-xs font-medium text-gray-500 block mb-1">Herhaal</span>
                    <select
                      value={medicationData.repeat}
                      onChange={(e) => setMedicationData({...medicationData, repeat: e.target.value})}
                      className="w-full text-lg font-semibold text-gray-900 bg-transparent border-0 p-0 focus:ring-0 min-w-0"
                    >
                      <option value="daily">Dagelijks</option>
                      <option value="weekly">Wekelijks</option>
                      <option value="none">Niet herhalen</option>
                    </select>
                  </label>
                </div>
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Herinnering</label>
                  <select 
                    value={medicationData.reminder}
                    onChange={(e) => setMedicationData({...medicationData, reminder: e.target.value})}
                    className="w-full p-3 rounded-2xl border border-gray-100 focus:ring-2 focus:ring-gray-200"
                  >
                    <option value="5">5 minuten voor</option>
                    <option value="10">10 minuten voor</option>
                    <option value="15">15 minuten voor</option>
                    <option value="30">30 minuten voor</option>
                  </select>
                </div>
                {/* Progressive Disclosure: Agenda-opties */}
                <details className="group bg-gray-50 rounded-2xl overflow-hidden">
                  <summary className="flex items-center justify-between px-4 py-4 cursor-pointer hover:bg-gray-100/80 transition-colors">
                    <span className="font-semibold text-gray-900">Meer opties</span>
                    <ChevronDownIcon className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className="px-4 pb-4 space-y-3">
                    <div className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        id="addToAgenda" 
                        checked={medicationData.addToAgenda}
                        onChange={(e) => setMedicationData({...medicationData, addToAgenda: e.target.checked})}
                        className="rounded" 
                      />
                      <label htmlFor="addToAgenda" className="text-sm text-slate-700">Voeg toe aan agenda (herhaalde momenten)</label>
                    </div>
                    {medicationData.addToAgenda && (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Voor hoeveel dagen?</label>
                          <select
                            value={medicationData.daysToAdd}
                            onChange={(e) => setMedicationData({...medicationData, daysToAdd: Number(e.target.value)})}
                            className="w-full p-3 rounded-xl border-0 bg-white focus:ring-2 focus:ring-gray-200"
                          >
                            <option value={7}>7 dagen (1 week)</option>
                            <option value={14}>14 dagen (2 weken)</option>
                            <option value={30}>30 dagen (ca. 1 maand)</option>
                            <option value={60}>60 dagen (ca. 2 maanden)</option>
                            <option value={90}>90 dagen (ca. 3 maanden)</option>
                          </select>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input 
                            type="checkbox" 
                            id="weekdaysOnly" 
                            checked={medicationData.weekdaysOnly}
                            onChange={(e) => setMedicationData({...medicationData, weekdaysOnly: e.target.checked})}
                            className="rounded" 
                          />
                          <label htmlFor="weekdaysOnly" className="text-sm text-slate-700">Alleen weekdagen (ma–vr)</label>
                        </div>
                        <p className="text-xs text-slate-500">Er worden aparte herinneringen per dag aangemaakt op het gekozen tijdstip.</p>
                      </>
                    )}
                  </div>
                </details>
                <div className="flex items-center justify-end gap-3 mt-6">
                  <Button variant="outline" onClick={() => setShowMedicationTracker(false)} className="rounded-2xl">Sluiten</Button>
                  <Button
                    onClick={handleSaveMedication}
                    disabled={isSavingMedication}
                    className="rounded-2xl bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSavingMedication ? 'Opslaan...' : 'Opslaan & Herinnering Instellen'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Edit Item Modal - Zen UI met Progressive Disclosure */}
          {editingItem && (
            <div 
              className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30 backdrop-blur-sm"
              onClick={() => {
                setEditingItem(null);
                setEditMode(null);
                setShowEventDetails(false);
              }}
            >
              <div 
                className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg mx-4"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
              >
                <div className="min-w-0 overflow-hidden">
                  {/* 1. Header: Grote titel zonder border, geflankeerd door prullenbak */}
                  <div className="flex items-start gap-3 pb-4 mb-4">
                    <input
                      type="text"
                      value={editingItem.icon && editingItem.title.startsWith(editingItem.icon)
                        ? editingItem.title.slice(editingItem.icon.length).replace(/^\s+/, '')
                        : editingItem.title}
                      onChange={(e) => setEditingItem({...editingItem, title: editingItem.icon ? (editingItem.icon + ' ' + e.target.value) : e.target.value})}
                      placeholder="Naam van gebeurtenis..."
                      className="flex-1 min-w-0 text-2xl font-bold bg-transparent border-0 focus:outline-none focus:ring-0 placeholder-gray-300 text-gray-900"
                    />
                    {(editingItem.type === 'task' || editingItem.type === 'event' || editingItem.type === 'medication') && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const taskId = (editingItem.metadata?.baseTaskId as string) || (editingItem.id.includes('::') ? editingItem.id.split('::')[0]! : editingItem.id);
                            await deleteTaskInDatabase(taskId);
                            await fetchTasks();
                            toast(editingItem.type === 'event' ? 'Gebeurtenis verwijderd' : editingItem.type === 'medication' ? 'Medicatie verwijderd' : 'Taak verwijderd');
                            setEditingItem(null);
                            setEditMode(null);
                            setShowEventDetails(false);
                          } catch (err) {
                            toast('Verwijderen mislukt');
                          }
                        }}
                        className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                        title="Verwijderen"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  
                  {/* 2. Tijd Sectie: 2 blokken, exact 50% breed, uitgelijnd */}
                  <div className="w-full min-w-0 grid grid-cols-2 gap-4">
                    <label className="block w-full min-w-0 bg-white rounded-2xl p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-2 mb-1">
                        <ClockIcon className="w-4 h-4 text-gray-500" />
                        <span className="text-xs font-medium text-gray-500">Starttijd</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <select
                          value={editingItem.startTime.getHours().toString().padStart(2, '0')}
                          onChange={(e) => {
                            const newTime = new Date(editingItem.startTime);
                            newTime.setHours(parseInt(e.target.value));
                            setEditingItem({...editingItem, startTime: newTime, endTime: new Date(newTime.getTime() + editingItem.duration * 60000)});
                          }}
                          className="text-lg font-semibold text-gray-900 bg-transparent border-0 p-0 focus:ring-0 cursor-pointer appearance-none"
                        >
                          {Array.from({ length: 24 }, (_, i) => (
                            <option key={i} value={i.toString().padStart(2, '0')}>{i.toString().padStart(2, '0')}</option>
                          ))}
                        </select>
                        <span className="text-lg font-semibold text-gray-900">:</span>
                        <select
                          value={editingItem.startTime.getMinutes().toString().padStart(2, '0')}
                          onChange={(e) => {
                            const newTime = new Date(editingItem.startTime);
                            newTime.setMinutes(parseInt(e.target.value));
                            setEditingItem({...editingItem, startTime: newTime, endTime: new Date(newTime.getTime() + editingItem.duration * 60000)});
                          }}
                          className="text-lg font-semibold text-gray-900 bg-transparent border-0 p-0 focus:ring-0 cursor-pointer appearance-none"
                        >
                          {[0, 15, 30, 45].map(m => (
                            <option key={m} value={m.toString().padStart(2, '0')}>{m.toString().padStart(2, '0')}</option>
                          ))}
                        </select>
                      </div>
                    </label>
                    <label className="block w-full min-w-0 bg-white rounded-2xl p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-2 mb-1">
                        <BoltIcon className="w-4 h-4 text-gray-500" />
                        <span className="text-xs font-medium text-gray-500">Duur</span>
                      </div>
                      {editingItem.type === 'medication' ? (
                        <span className="text-lg font-semibold text-gray-900">5 min</span>
                      ) : (
                        <select
                          value={editingItem.duration}
                          onChange={(e) => {
                            const newDuration = parseInt(e.target.value);
                            setEditingItem({...editingItem, duration: newDuration, endTime: new Date(editingItem.startTime.getTime() + newDuration * 60000)});
                          }}
                          className="text-lg font-semibold text-gray-900 bg-transparent border-0 p-0 focus:ring-0 cursor-pointer appearance-none block w-full"
                        >
                          {[15, 30, 45, 60, 90, 120, 180].map(d => (
                            <option key={d} value={d}>{d} min</option>
                          ))}
                        </select>
                      )}
                    </label>
                  </div>

                  {/* 3. Categorieën: 4 strakke rechthoeken, min-w-0 voorkomt overflow */}
                  {(editingItem.type === 'event' || editingItem.type === 'task') && (
                    <div className="w-full min-w-0 grid grid-cols-4 gap-2 mt-4">
                      {CATEGORIES.map((cat) => {
                        const isSelected = ((editingItem.metadata?.category as string) || (editingItem.type === 'event' ? 'appointment' : 'work')) === cat.value;
                        return (
                          <button
                            key={cat.value}
                            type="button"
                            onClick={() => setEditingItem({ ...editingItem, metadata: { ...editingItem.metadata, category: cat.value } })}
                            className={`w-full min-w-0 h-12 rounded-2xl text-xs font-semibold text-center truncate transition-colors flex items-center justify-center px-1 ${isSelected ? cat.color : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                          >
                            {cat.icon} {cat.label}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* 4. Herhalen & Details: uitgelijnd met tijd en categorieën */}
                  {editingItem.type === 'event' && (() => {
                    const eventRepeat = (editingItem.metadata?.repeat as string) ?? 'none';
                    const repeatLabels: Record<string, string> = { daily: 'Dagelijks', weekly: 'Wekelijks', monthly: 'Maandelijks' };
                    const statusText = eventRepeat !== 'none' ? (repeatLabels[eventRepeat] || eventRepeat) : 'Opties';
                    const statusColor = eventRepeat !== 'none' ? 'text-blue-600' : 'text-gray-500';
                    return (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowEventDetails(!showEventDetails)}
                        className="w-full min-w-0 flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-2xl px-4 py-4 mt-4 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">Herhalen & Details</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm ${statusColor}`}>{statusText}</span>
                          {showEventDetails ? (
                            <ChevronUpIcon className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </button>
                      {showEventDetails && (() => {
                        const impactStr = (editingItem.metadata?.description as string) ?? '';
                        const [eventType = 'personal', eventDesc = ''] = impactStr.includes('|') ? impactStr.split('|') : [impactStr || 'personal', ''];
                        const eventRepeat = (editingItem.metadata?.repeat as string) ?? 'none';
                        const eventRepeatUntil = (editingItem.metadata?.repeatUntil as string) ?? '';
                        const eventRepeatWeekdays = (editingItem.metadata?.repeatWeekdays as 'all' | 'weekdays' | 'weekends') ?? 'all';
                        return (
                          <div className="space-y-3 pt-3 pb-4">
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">Herhalen</label>
                              <select
                                value={eventRepeat}
                                onChange={(e) => setEditingItem({
                                  ...editingItem,
                                  metadata: { ...editingItem.metadata, repeat: e.target.value }
                                })}
                                className="w-full p-3 text-sm bg-gray-50 rounded-lg border-0 focus:ring-2 focus:ring-gray-200"
                              >
                                <option value="none">Niet herhalen</option>
                                <option value="daily">Dagelijks</option>
                                <option value="weekly">Wekelijks</option>
                                <option value="monthly">Maandelijks</option>
                              </select>
                            </div>
                            {eventRepeat !== 'none' && (
                              <>
                                <div>
                                  <label className="block text-xs font-medium text-gray-500 mb-1">Herhalen tot</label>
                                  <div className="flex gap-2">
                                    <select
                                      value={eventRepeatUntil ? 'date' : 'unlimited'}
                                      onChange={(e) => {
                                        const isDate = e.target.value === 'date';
                                        const defaultDate = new Date();
                                        defaultDate.setFullYear(defaultDate.getFullYear() + 1);
                                        setEditingItem({
                                          ...editingItem,
                                          metadata: { ...editingItem.metadata, repeatUntil: isDate ? (eventRepeatUntil || formatDateInputLocal(defaultDate)) : null }
                                        });
                                      }}
                                      className="flex-1 p-3 text-sm bg-gray-50 rounded-lg border-0 focus:ring-2 focus:ring-gray-200"
                                    >
                                      <option value="unlimited">Onbeperkt</option>
                                      <option value="date">Tot datum</option>
                                    </select>
                                    {eventRepeatUntil && (
                                      <input
                                        type="date"
                                        value={formatDateInputLocal(new Date(eventRepeatUntil))}
                                        onChange={(e) => setEditingItem({
                                          ...editingItem,
                                          metadata: { ...editingItem.metadata, repeatUntil: e.target.value || null }
                                        })}
                                        className="flex-1 p-3 text-sm bg-gray-50 rounded-lg border-0 focus:ring-2 focus:ring-gray-200"
                                      />
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-500 mb-1">Uitzonderingen qua dagen</label>
                                  <select
                                    value={eventRepeatWeekdays}
                                    onChange={(e) => setEditingItem({
                                      ...editingItem,
                                      metadata: { ...editingItem.metadata, repeatWeekdays: e.target.value as 'all' | 'weekdays' | 'weekends' }
                                    })}
                                    className="w-full p-3 text-sm bg-gray-50 rounded-lg border-0 focus:ring-2 focus:ring-gray-200"
                                  >
                                    <option value="all">Alle dagen</option>
                                    <option value="weekdays">Alleen weekdagen (ma–vr)</option>
                                    <option value="weekends">Alleen weekend (za–zo)</option>
                                  </select>
                                </div>
                              </>
                            )}
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">Beschrijving</label>
                              <textarea
                                value={eventDesc}
                                onChange={(e) => setEditingItem({
                                  ...editingItem,
                                  metadata: { ...editingItem.metadata, description: `${eventType}|${e.target.value}` }
                                })}
                                className="w-full p-3 text-sm bg-gray-50 rounded-lg border-0 focus:ring-2 focus:ring-gray-200 resize-none"
                                rows={2}
                                placeholder="Optioneel"
                              />
                            </div>
                          </div>
                        );
                      })()}
                    </>
                  );
                  })()}

                  {editingItem.type === 'task' && (
                    <div className="mb-6">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingItem.completed}
                          onChange={(e) => setEditingItem({...editingItem, completed: e.target.checked})}
                          className="rounded"
                        />
                        <span className="text-sm text-slate-700">Voltooid</span>
                      </label>
                    </div>
                  )}

                  {/* Footer: grid grid-cols-2 - Annuleren links, Opslaan rechts (uitlijning met tijd-blokken) */}
                  <div className="w-full min-w-0 grid grid-cols-2 gap-4 mt-6 pt-5">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setEditingItem(null);
                        setEditMode(null);
                        setShowEventDetails(false);
                      }}
                      className="py-3 text-base font-medium rounded-2xl shadow-sm bg-white hover:shadow-md"
                    >
                      Annuleren
                    </Button>
                    <Button
                      type="button"
                      onClick={async (e) => {
                        e.preventDefault();
                          e.stopPropagation();
                          const taskId = (editingItem.metadata?.baseTaskId as string) || (editingItem.id.includes('::') ? editingItem.id.split('::')[0]! : editingItem.id);
                          // Taken en gebeurtenissen zijn beide tasks in de backend; update direct op id
                          if (editingItem.type === 'task' || editingItem.type === 'event') {
                            try {
                              const baseTask = tasks.find(t => t.id === taskId);
                              const dueAtForRecurring = baseTask?.dueAt && editingItem.metadata?.baseTaskId
                                ? (() => {
                                    const orig = new Date(baseTask.dueAt);
                                    orig.setHours(editingItem.startTime.getHours(), editingItem.startTime.getMinutes(), 0, 0);
                                    return orig.toISOString();
                                  })()
                                : editingItem.startTime.toISOString();
                              const payload: Record<string, unknown> = {
                                title: (editingItem.icon && editingItem.title.startsWith(editingItem.icon) ? editingItem.title.slice(editingItem.icon.length).replace(/^\s+/, '') : editingItem.title).trim() || editingItem.title,
                                dueAt: dueAtForRecurring,
                                duration: editingItem.duration,
                                estimatedDuration: editingItem.duration,
                                done: editingItem.completed,
                              };
                              if (editingItem.type === 'event' || editingItem.type === 'task') {
                                if (editingItem.type === 'event') {
                                  if (editingItem.metadata?.description != null) {
                                    payload.impact = String(editingItem.metadata.description);
                                  }
                                  if (editingItem.metadata?.repeat != null) {
                                    payload.repeat = String(editingItem.metadata.repeat);
                                  }
                                  if (editingItem.metadata?.repeatUntil != null) {
                                    payload.repeatUntil = editingItem.metadata.repeatUntil;
                                  }
                                  if (editingItem.metadata?.repeatWeekdays != null) {
                                    payload.repeatWeekdays = editingItem.metadata.repeatWeekdays;
                                  }
                                  if (editingItem.metadata?.repeatExcludeDates != null) {
                                    payload.repeatExcludeDates = editingItem.metadata.repeatExcludeDates;
                                  }
                                }
                                if (editingItem.metadata?.category != null) {
                                  payload.category = String(editingItem.metadata.category);
                                }
                              }
                              await updateTaskInDatabase(taskId, payload);
                              await fetchTasks();
                              toast('Opgeslagen');
                              setEditingItem(null);
                              setEditMode(null);
                            } catch (err) {
                              toast('Fout bij opslaan');
                            }
                          }
                          if (editingItem.type === 'medication') {
                            try {
                              const medTaskId = (editingItem.metadata?.baseTaskId as string) || editingItem.id;
                              await updateTaskInDatabase(medTaskId, {
                                title: editingItem.title,
                                dueAt: editingItem.startTime.toISOString(),
                                duration: 5,
                                done: editingItem.completed,
                              });
                              await fetchTasks();
                              toast('Opgeslagen');
                              setEditingItem(null);
                              setEditMode(null);
                            } catch (err) {
                              toast('Fout bij opslaan');
                            }
                          }
                        }}
                      className="py-3 text-base font-semibold bg-gray-900 hover:bg-black text-white rounded-2xl transition-colors"
                    >
                      Opslaan
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </AppLayout>
  );
}

