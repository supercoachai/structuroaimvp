'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  CalendarIcon, 
  ClockIcon, 
  PlusIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import AppLayout from '../../components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useTasks } from '../../hooks/useTasks';
import { toast } from '../../components/Toast';

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
}

const timeRangeOptions: TimeRangeOption[] = [
  { key: 'work', label: 'Werkuren', start: 8, end: 18, description: '08:00 - 18:00' },
  { key: '24h', label: 'Volledige dag', start: 0, end: 23, description: '00:00 - 23:00' },
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

export default function AgendaPage() {
  const { tasks, addTask: addTaskToDatabase, fetchTasks } = useTasks();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedView, setSelectedView] = useState<'day' | 'week' | 'month' | 'workweek'>('day');
  const [timeRange, setTimeRange] = useState<TimeRange>('work');
  const [customStart, setCustomStart] = useState(8);
  const [customEnd, setCustomEnd] = useState(18);
  const [showTimeRangeSelector, setShowTimeRangeSelector] = useState(false);
  const timeRangeSelectorRef = useRef<HTMLDivElement>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showMedicationTracker, setShowMedicationTracker] = useState(false);
  const [editingItem, setEditingItem] = useState<AgendaItem | null>(null);
  const [editMode, setEditMode] = useState<'single' | 'series' | null>(null);
  
  // Task form state
  const [newTask, setNewTask] = useState({ 
    title: '', 
    time: '', 
    duration: 30, 
    priority: 'medium',
    date: ''
  });
  
  // Event form state - volledig uitgebreid
  const [newEvent, setNewEvent] = useState({ 
    title: '', 
    date: '',
    startTime: '', 
    endTime: '',
    duration: 60, 
    type: 'meeting',
    description: ''
  });
  
  const [medicationData, setMedicationData] = useState({
    name: '',
    dosage: '',
    time: '',
    repeat: 'daily',
    reminder: '10',
    addToAgenda: false
  });
  const [isSavingMedication, setIsSavingMedication] = useState(false);
  const medicationSaveRef = useRef(false);

  // ========== DATA SEPARATION: Tasks, Events, Medication ==========
  
  // Filter tasks (source: 'regular', 'focus_remainder', etc. maar NIET 'medication' of 'event')
  const tasksForDate = useMemo(() => {
    return tasks.filter(task => {
      if (!task.dueAt) return false;
      if (task.source === 'medication' || task.source === 'event') return false;
      
      const taskDate = new Date(task.dueAt);
      if (selectedView === 'day') {
        return isSameDay(taskDate, selectedDate);
      }
      // Voor andere views filteren we later
      return true;
    }).map(task => {
      const startTime = new Date(task.dueAt!);
      const duration = task.duration || 15;
      const endTime = new Date(startTime.getTime() + duration * 60000);
      
      return {
        id: task.id,
        title: task.title,
        type: 'task' as ItemType,
        startTime,
        endTime,
        duration,
        completed: task.done,
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: '📌',
        metadata: { priority: task.priority }
      } as AgendaItem;
    });
  }, [tasks, selectedDate, selectedView]);

  // Filter events (source: 'event')
  const eventsForDate = useMemo(() => {
    return tasks.filter(task => {
      if (!task.dueAt) return false;
      if (task.source !== 'event') return false;
      
      const eventDate = new Date(task.dueAt);
      if (selectedView === 'day') {
        return isSameDay(eventDate, selectedDate);
      }
      return true;
    }).map(task => {
      const startTime = new Date(task.dueAt!);
      const duration = task.duration || 60;
      const endTime = new Date(startTime.getTime() + duration * 60000);
      
      // Bepaal kleur op basis van type (opgeslagen in impact of title)
      let color = 'bg-green-100 text-green-800 border-green-200';
      let icon = '📅';
      
      if (task.impact) {
        if (task.impact.includes('meeting')) {
          color = 'bg-purple-100 text-purple-800 border-purple-200';
          icon = '🕒';
        } else if (task.impact.includes('appointment')) {
          color = 'bg-orange-100 text-orange-800 border-orange-200';
          icon = '📅';
        }
      }
      
      return {
        id: task.id,
        title: task.title,
        type: 'event' as ItemType,
        startTime,
        endTime,
        duration,
        completed: task.done,
        color,
        icon,
        metadata: { description: task.impact }
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
      const duration = 5; // Medicatie duurt altijd 5 min
      const endTime = new Date(startTime.getTime() + duration * 60000);
      
      return {
        id: task.id,
        title: task.title.replace(/^💊\s*/, ''), // Verwijder 💊 emoji uit titel
        type: 'medication' as ItemType,
        startTime,
        endTime,
        duration: Math.max(duration, 15), // Minimaal 15 minuten voor weergave
        completed: task.done,
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: '', // Geen emoji icon
        metadata: { dosage: task.impact }
      } as AgendaItem;
    });
  }, [tasks, selectedDate, selectedView]);

  // Combineer alle items voor rendering
  const allAgendaItems = useMemo(() => {
    return [...tasksForDate, ...eventsForDate, ...medicationForDate].sort(
      (a, b) => a.startTime.getTime() - b.startTime.getTime()
    );
  }, [tasksForDate, eventsForDate, medicationForDate]);

  // ========== TIME SLOTS & RENDERING ==========
  
  const getTimeSlots = () => {
    // Altijd 0:00 tot 24:00 weergeven, ongeacht timeRange
    const start = 0;
    const end = 24;
    
    // Genereer slots voor elk uur en elk half uur (0:00, 0:30, 1:00, 1:30, etc.)
    return Array.from({ length: (end - start) * 2 }, (_, i) => {
      const hour = start + Math.floor(i / 2);
      const minute = (i % 2) * 30;
      return { hour, minute, time: hour * 60 + minute };
    });
  };

  const timeSlots = getTimeSlots();

  const formatDate = (date: Date) => {
    const formatted = date.toLocaleDateString('nl-NL', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    return formatted.replace(/\b\w/g, (char) => char.toUpperCase());
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
  
  const handleAddAgendaTask = async () => {
    if (!newTask.title || !newTask.time) {
      toast('Vul minimaal titel en tijd in');
      return;
    }

    try {
      const [hours, minutes] = newTask.time.split(':').map(Number);
      const taskDate = new Date(newTask.date || selectedDate.toISOString().split('T')[0]);
      taskDate.setHours(hours, minutes, 0, 0);
      
      await addTaskToDatabase({
        title: newTask.title.trim(),
        duration: newTask.duration || 30,
        priority: newTask.priority === 'high' ? 1 : newTask.priority === 'medium' ? 2 : 3,
        done: false,
        dueAt: taskDate.toISOString(),
        reminders: [10],
        repeat: 'none',
        impact: '🌱',
        energyLevel: 'medium',
        estimatedDuration: newTask.duration || 30,
        source: 'regular'
      });
      
      toast('Taak toegevoegd aan agenda!');
      setNewTask({ title: '', time: '', duration: 30, priority: 'medium', date: '' });
      setShowAddTask(false);
      fetchTasks();
    } catch (error: any) {
      console.error('Failed to add task:', error);
      toast('Fout bij toevoegen van taak: ' + (error.message || 'Onbekende fout'));
    }
  };

  const handleAddEvent = async () => {
    if (!newEvent.title || !newEvent.startTime || !newEvent.date) {
      toast('Vul minimaal titel, datum en starttijd in');
      return;
    }

    try {
      // Parse starttijd
      const [startHours, startMinutes] = newEvent.startTime.split(':').map(Number);
      const eventDate = new Date(newEvent.date);
      eventDate.setHours(startHours, startMinutes, 0, 0);
      
      // Bereken eindtijd
      const endDate = new Date(eventDate);
      if (newEvent.endTime) {
        const [endHours, endMinutes] = newEvent.endTime.split(':').map(Number);
        endDate.setHours(endHours, endMinutes, 0, 0);
      } else {
        endDate.setTime(eventDate.getTime() + newEvent.duration * 60000);
      }
      
      const duration = Math.round((endDate.getTime() - eventDate.getTime()) / 60000);
      
      await addTaskToDatabase({
        title: newEvent.title,
        duration: duration,
        priority: null,
        done: false,
        dueAt: eventDate.toISOString(),
        reminders: [10],
        repeat: 'none',
        impact: `${newEvent.type}|${newEvent.description || ''}`,
        energyLevel: 'medium',
        source: 'event'
      });
      
      toast('Gebeurtenis toegevoegd aan agenda!');
      setNewEvent({ title: '', date: '', startTime: '', endTime: '', duration: 60, type: 'meeting', description: '' });
      setShowAddEvent(false);
      fetchTasks();
    } catch (error) {
      console.error('Failed to add event:', error);
      toast('Fout bij toevoegen van gebeurtenis');
    }
  };

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

  // Planning tips
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
    "Gebruik een 'do not disturb' modus op je apparaten"
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
      
      if (medicationData.repeat === 'daily' && medicationData.addToAgenda) {
        // Maak 1 herhalende taak aan in plaats van 30 aparte taken
        // Gebruik repeat: 'daily' zodat het systeem automatisch herhaalt
        const medicationTask = {
          title: medicationTitle,
          duration: 5,
          priority: null,
          done: false,
          dueAt: today.toISOString(),
          reminders: [parseInt(medicationData.reminder) || 10],
          repeat: 'daily', // Herhaal dagelijks
          impact: medicationData.dosage || '',
          energyLevel: 'low',
          source: 'medication'
        };
        
        // Check of er al een dagelijkse medicatie taak bestaat
        const existingDaily = existingMedication.find(task => 
          task.title === medicationTitle && 
          task.repeat === 'daily'
        );
        
        if (!existingDaily) {
          await addTaskToDatabase(medicationTask);
          toast('Medicatie toegevoegd als dagelijkse herhalende taak!');
        } else {
          toast('Deze medicatie bestaat al als dagelijkse taak');
        }
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
            dueAt: today.toISOString(),
            reminders: [parseInt(medicationData.reminder) || 10],
            repeat: medicationData.repeat === 'daily' ? 'daily' : 'none',
            impact: medicationData.dosage || '',
            energyLevel: 'low',
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
        addToAgenda: false
      });
      setShowMedicationTracker(false);
      fetchTasks();
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

  return (
    <AppLayout>
      <div
        style={{
          minHeight: "100vh",
          background: "#F7F8FA",
          color: "#2F3441",
          display: "grid",
          justifyContent: "center",
          padding: "28px 16px 64px",
        }}
      >
        <main style={{ width: "min(1200px, 92vw)", display: "grid", gap: 20 }}>
          {/* Header */}
          <header style={{ textAlign: "center", marginBottom: 4 }}>
            <div style={{ fontSize: 22, fontWeight: 700 }}>Agenda & Planning</div>
            <div style={{ fontSize: 14, color: "rgba(47,52,65,0.75)", marginTop: 6 }}>
              Plan je dag en houd overzicht over je afspraken en taken.
            </div>
          </header>

          {/* View Selector en Tijd Bereik */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <div className="bg-white rounded-lg border border-slate-200 p-1 inline-flex">
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

            {selectedView === 'day' && (
              <div className="relative" ref={timeRangeSelectorRef}>
                <button
                  onClick={() => setShowTimeRangeSelector(!showTimeRangeSelector)}
                  className="flex items-center gap-2 bg-white rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <ClockIcon className="w-4 h-4" />
                  <span>{timeRangeOptions.find(r => r.key === timeRange)?.description || '08:00 - 18:00'}</span>
                  <Cog6ToothIcon className="w-4 h-4" />
                </button>

                {showTimeRangeSelector && (
                  <div className="absolute top-full mt-2 right-0 bg-white rounded-lg border border-slate-200 shadow-xl z-50 min-w-[200px]">
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
                      
                      <div className="border-t border-slate-200 mt-2 pt-2">
                        <button
                          onClick={() => {
                            setTimeRange('custom');
                            setShowTimeRangeSelector(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                            timeRange === 'custom'
                              ? 'bg-blue-50 text-blue-700 font-medium'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="font-medium">Aangepast</div>
                          <div className="text-xs text-slate-500">Kies zelf</div>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Custom tijd bereik instellingen */}
          {selectedView === 'day' && timeRange === 'custom' && (
            <Card variant="elevated">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Start tijd</label>
                    <select
                      value={customStart}
                      onChange={(e) => setCustomStart(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Eind tijd</label>
                    <select
                      value={customEnd}
                      onChange={(e) => setCustomEnd(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Geselecteerd: {customStart.toString().padStart(2, '0')}:00 - {customEnd.toString().padStart(2, '0')}:00
                </p>
              </CardContent>
            </Card>
          )}

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
                    {selectedView === 'week' && formatDateRange(selectedDate, 7)}
                    {selectedView === 'workweek' && formatDateRange(selectedDate, 5)}
                    {selectedView === 'month' && (() => {
                      const monthStr = selectedDate.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
                      return monthStr.charAt(0).toUpperCase() + monthStr.slice(1);
                    })()}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {(() => {
                      const filteredItems = getItemsForDate(selectedDate);
                      const incompleteCount = filteredItems.filter(item => !item.completed).length;
                      
                      if (selectedView === 'day') return `${incompleteCount} items vandaag`;
                      if (selectedView === 'week') return `${incompleteCount} items deze week`;
                      if (selectedView === 'workweek') return `${incompleteCount} items deze werkweek`;
                      return `${incompleteCount} items deze maand`;
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
                {selectedView === 'day' && (
                  <div className="relative" style={{ minHeight: '600px' }}>
                    {/* Tijdsas met stippellijnen */}
                    <div className="relative">
                      {timeSlots.map((slot) => {
                        const items = getItemsForTimeSlot(slot.hour, slot.minute);
                        // Altijd vanaf 0:00 beginnen, ongeacht timeRange
                        const startHour = 0;
                        const topPosition = (slot.time - startHour * 60) * 1; // 1px per minuut
                        
                        return (
                          <div
                            key={`${slot.hour}-${slot.minute}`}
                            className="relative border-b border-dotted border-slate-200"
                            style={{
                              height: '30px',
                              top: `${topPosition}px`,
                              position: 'absolute',
                              width: '100%',
                              left: 0
                            }}
                          >
                            {/* Tijd label links */}
                            {slot.minute === 0 && (
                              <div 
                                className="absolute left-0 text-xs text-slate-500 font-medium"
                                style={{ top: '4px', width: '60px' }}
                              >
                                {slot.hour.toString().padStart(2, '0')}:00
                              </div>
                            )}
                            
                            {/* Items in dit tijdslot */}
                            <div className="absolute left-20 right-0" style={{ top: '0px' }}>
                              {items.map((item) => {
                                const itemStartMinutes = item.startTime.getHours() * 60 + item.startTime.getMinutes();
                                const slotStartMinutes = slot.hour * 60 + slot.minute;
                                const offsetTop = itemStartMinutes - slotStartMinutes;
                                // Zorg dat duur minimaal 15 minuten is en bereken hoogte correct (1px per minuut)
                                // Voor medicatie: altijd minimaal 15 minuten hoogte
                                const minDuration = item.type === 'medication' ? Math.max(item.duration || 15, 15) : Math.max(item.duration || 15, 15);
                                const heightPx = minDuration; // 1px per minuut
                                
                                return (
                                  <div
                                    key={item.id}
                                    className={`absolute p-2 rounded-lg border text-sm ${item.color} ${item.completed ? 'opacity-50' : ''} cursor-pointer hover:shadow-md transition-shadow`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Open edit modal
                                      setEditingItem(item);
                                    }}
                                    onContextMenu={(e) => {
                                      e.preventDefault();
                                      // Rechtsklik menu voor enkel deze of hele reeks
                                      if (item.type === 'task' || item.type === 'event') {
                                        setEditingItem(item);
                                        // Toon keuze: enkel deze of hele reeks
                                      }
                                    }}
                                    style={{
                                      top: `${offsetTop}px`,
                                      height: `${Math.max(heightPx, 15)}px`, // Minimaal 15px (15 minuten)
                                      minWidth: '200px',
                                      maxWidth: 'calc(100% - 20px)',
                                      zIndex: 10,
                                      left: '0px'
                                    }}
                                    title={`${item.icon ? item.icon + ' ' : ''}${item.title} - ${item.startTime.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })} - ${item.endTime.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}`}
                                  >
                                    <div className="flex items-start gap-2 h-full">
                                      {item.icon && (
                                        <span className="text-base flex-shrink-0">{item.icon}</span>
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <div className="font-medium truncate">{item.title}</div>
                                        <div className="text-xs opacity-75 mt-1">
                                          {item.startTime.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                                          {item.endTime && ` - ${item.endTime.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}`}
                                        </div>
                                      </div>
                                      {item.completed && (
                                        <CheckCircleIcon className="w-4 h-4 flex-shrink-0" />
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Spacer voor laatste items */}
                    <div style={{ height: `${(timeSlots[timeSlots.length - 1]?.time || 0) * 1 + 100}px` }}></div>
                  </div>
                )}

                {/* Week/Werkweek/Month views */}
                {(selectedView === 'week' || selectedView === 'workweek' || selectedView === 'month') && (() => {
                  const daysToShow = selectedView === 'month' ? 30 : selectedView === 'week' ? 7 : 5;
                  const startDate = new Date(selectedDate);
                  if (selectedView === 'workweek') {
                    // Begin op maandag
                    const day = startDate.getDay();
                    const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
                    startDate.setDate(diff);
                  } else if (selectedView === 'week') {
                    // Begin op zondag
                    const day = startDate.getDay();
                    startDate.setDate(startDate.getDate() - day);
                  } else {
                    // Maand: begin op eerste dag van de maand
                    startDate.setDate(1);
                  }
                  
                  const days = Array.from({ length: daysToShow }, (_, i) => {
                    const date = new Date(startDate);
                    date.setDate(startDate.getDate() + i);
                    return date;
                  });
                  
                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                        {days.map((day, idx) => {
                          const dayItems = getItemsForDate(day);
                          const isToday = isSameDay(day, new Date());
                          
                          return (
                            <div 
                              key={idx}
                              className={`p-3 rounded-lg border ${isToday ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'}`}
                            >
                              <div className={`text-sm font-semibold mb-2 ${isToday ? 'text-blue-700' : 'text-slate-700'}`}>
                                {day.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })}
                              </div>
                              <div className="space-y-2">
                                {dayItems.slice(0, 3).map((item) => (
                                  <div
                                    key={item.id}
                                    onClick={() => setEditingItem(item)}
                                    className={`p-2 rounded text-xs cursor-pointer hover:shadow-sm ${item.color} ${item.completed ? 'opacity-50' : ''}`}
                                  >
                                    <div className="font-medium truncate">{item.icon} {item.title}</div>
                                    <div className="text-xs opacity-75 mt-1">
                                      {item.startTime.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                  </div>
                                ))}
                                {dayItems.length > 3 && (
                                  <div className="text-xs text-slate-500 text-center">
                                    +{dayItems.length - 3} meer
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Overzicht */}
              <Card variant="elevated">
                <CardHeader>
                  <CardTitle>
                    {selectedView === 'day' ? 'Vandaag\'s Overzicht' : 
                     selectedView === 'week' ? 'Week Overzicht' :
                     selectedView === 'workweek' ? 'Werkweek Overzicht' :
                     'Maand Overzicht'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const filteredItems = getItemsForDate(selectedDate);
                    
                    return (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600">Totaal items:</span>
                          <span className="font-medium">{filteredItems.length}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600">Taken:</span>
                          <span className="font-medium text-blue-600">
                            {filteredItems.filter(item => item.type === 'task').length}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600">Gebeurtenissen:</span>
                          <span className="font-medium text-green-600">
                            {filteredItems.filter(item => item.type === 'event').length}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600">Medicatie:</span>
                          <span className="font-medium text-red-600">
                            {filteredItems.filter(item => item.type === 'medication').length}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600">Voltooid:</span>
                          <span className="font-medium text-green-600">
                            {filteredItems.filter(item => item.completed).length}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600">Totale tijd:</span>
                          <span className="font-medium">
                            {filteredItems.reduce((total, item) => total + item.duration, 0)} min
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Actie knoppen */}
              <Card variant="elevated">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <Button
                      onClick={() => setShowAddTask(true)}
                      size="md"
                      className="w-full"
                    >
                      <PlusIcon className="w-4 h-4 mr-2" />
                      Taak Toevoegen
                    </Button>
                    
                    <Button
                      onClick={() => {
                        setNewEvent({ 
                          ...newEvent, 
                          date: selectedDate.toISOString().split('T')[0] 
                        });
                        setShowAddEvent(true);
                      }}
                      size="md"
                      variant="outline"
                      className="w-full"
                    >
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      Gebeurtenis Toevoegen
                    </Button>

                    <Button
                      onClick={() => setShowMedicationTracker(true)}
                      size="md"
                      variant="outline"
                      className="w-full bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                    >
                      <ClockIcon className="w-4 h-4 mr-2" />
                      Medicatie Tracker
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Volgende afspraken */}
              <Card variant="elevated">
                <CardHeader>
                  <CardTitle>Volgende Afspraken</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {allAgendaItems
                      .filter(item => !item.completed)
                      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
                      .slice(0, 3)
                      .map((item) => (
                        <div 
                          key={item.id} 
                          onClick={() => {
                            // Navigeer naar focus modus of agenda detail
                            if (item.type === 'task') {
                              window.location.href = `/focus?task=${encodeURIComponent(item.title)}&duration=${item.duration || 15}`;
                            } else {
                              setSelectedDate(item.startTime);
                            }
                          }}
                          className="flex items-center space-x-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors"
                        >
                          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                            item.type === 'event' ? 'bg-green-500' :
                            item.type === 'medication' ? 'bg-red-500' :
                            'bg-blue-500'
                          }`}></div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{item.icon} {item.title}</p>
                            <p className="text-xs text-slate-500">
                              <span className="font-medium">{formatRelativeDate(item.startTime)}</span>
                              {' • '}
                              <span>{item.startTime.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}</span>
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quick tips */}
              <Card variant="outlined" className="bg-blue-50 border-blue-200">
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
            </div>
          </div>

          {/* Add Task Modal */}
          {showAddTask && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <Card variant="elevated" className="w-full max-w-md mx-4">
                <CardHeader>
                  <CardTitle>Nieuwe Taak Toevoegen</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Titel
                      </label>
                      <Input
                        type="text"
                        value={newTask.title}
                        onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                        placeholder="Wat moet er gedaan worden?"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Datum
                        </label>
                        <input
                          type="date"
                          value={newTask.date || selectedDate.toISOString().split('T')[0]}
                          onChange={(e) => setNewTask({...newTask, date: e.target.value})}
                          className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Tijd
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-slate-500 mb-1 block">Uur</label>
                            <select
                              value={newTask.time ? newTask.time.split(':')[0] : '00'}
                              onChange={(e) => {
                                const minutes = newTask.time ? newTask.time.split(':')[1] || '00' : '00';
                                setNewTask({...newTask, time: `${e.target.value}:${minutes}`});
                              }}
                              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            >
                              {Array.from({ length: 24 }, (_, i) => (
                                <option key={i} value={i.toString().padStart(2, '0')}>
                                  {i.toString().padStart(2, '0')}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-slate-500 mb-1 block">Minuut</label>
                            <select
                              value={newTask.time ? newTask.time.split(':')[1] || '00' : '00'}
                              onChange={(e) => {
                                const hours = newTask.time ? newTask.time.split(':')[0] || '00' : '00';
                                setNewTask({...newTask, time: `${hours}:${e.target.value}`});
                              }}
                              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            >
                              {[0, 15, 30, 45].map(m => (
                                <option key={m} value={m.toString().padStart(2, '0')}>
                                  {m.toString().padStart(2, '0')}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Duur (min)
                        </label>
                        <select
                          value={newTask.duration}
                          onChange={(e) => setNewTask({...newTask, duration: parseInt(e.target.value)})}
                          className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                          <option value={15}>15 min</option>
                          <option value={30}>30 min</option>
                          <option value={60}>1 uur</option>
                          <option value={90}>1,5 uur</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Prioriteit
                        </label>
                        <select
                          value={newTask.priority}
                          onChange={(e) => setNewTask({...newTask, priority: e.target.value})}
                          className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                          <option value="low">Laag</option>
                          <option value="medium">Gemiddeld</option>
                          <option value="high">Hoog</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end space-x-3 mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setShowAddTask(false)}
                    >
                      Annuleren
                    </Button>
                    <Button
                      onClick={handleAddAgendaTask}
                    >
                      Toevoegen
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Add Event Modal - VOLLEDIG UITGEBREID */}
          {showAddEvent && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <Card variant="elevated" className="w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
                <CardHeader>
                  <CardTitle>Nieuwe Gebeurtenis Toevoegen</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Titel *
                      </label>
                      <Input
                        type="text"
                        value={newEvent.title}
                        onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                        placeholder="Wat is de gebeurtenis?"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Type
                      </label>
                      <select
                        value={newEvent.type}
                        onChange={(e) => setNewEvent({...newEvent, type: e.target.value})}
                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="meeting">Vergadering</option>
                        <option value="appointment">Afspraak</option>
                        <option value="event">Evenement</option>
                        <option value="personal">Persoonlijk</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Datum *
                      </label>
                      <input
                        type="date"
                        value={newEvent.date || selectedDate.toISOString().split('T')[0]}
                        onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Starttijd *
                        </label>
                        <input
                          type="time"
                          value={newEvent.startTime}
                          onChange={(e) => setNewEvent({...newEvent, startTime: e.target.value})}
                          className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Eindtijd
                        </label>
                        <input
                          type="time"
                          value={newEvent.endTime}
                          onChange={(e) => {
                            setNewEvent({...newEvent, endTime: e.target.value});
                            // Bereken duration automatisch
                            if (newEvent.startTime && e.target.value) {
                              const [startH, startM] = newEvent.startTime.split(':').map(Number);
                              const [endH, endM] = e.target.value.split(':').map(Number);
                              const startMinutes = startH * 60 + startM;
                              const endMinutes = endH * 60 + endM;
                              const duration = endMinutes - startMinutes;
                              if (duration > 0) {
                                setNewEvent(prev => ({...prev, duration, endTime: e.target.value}));
                              }
                            }
                          }}
                          className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        <p className="text-xs text-slate-500 mt-1">Of gebruik duur hieronder</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Duur (minuten) - wordt overschreven door eindtijd
                      </label>
                      <select
                        value={newEvent.duration}
                        onChange={(e) => setNewEvent({...newEvent, duration: parseInt(e.target.value), endTime: ''})}
                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value={30}>30 min</option>
                        <option value={60}>1 uur</option>
                        <option value={90}>1,5 uur</option>
                        <option value={120}>2 uur</option>
                        <option value={180}>3 uur</option>
                        <option value={240}>4 uur</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Beschrijving
                      </label>
                      <textarea
                        value={newEvent.description}
                        onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        rows={3}
                        placeholder="Optionele beschrijving..."
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end space-x-3 mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setShowAddEvent(false)}
                    >
                      Annuleren
                    </Button>
                    <Button
                      onClick={handleAddEvent}
                    >
                      Toevoegen
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Medication Tracker Modal */}
          {showMedicationTracker && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <Card variant="elevated" className="w-full max-w-lg mx-4">
                <CardHeader>
                  <CardTitle>Medicatie Tracker</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-sm text-slate-600 mb-4">
                      Houd bij wanneer je je medicatie hebt ingenomen en stel herinneringen in.
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Medicatie Naam
                        </label>
                        <Input
                          type="text"
                          placeholder="bijv. Ritalin, Concerta"
                          value={medicationData.name}
                          onChange={(e) => setMedicationData({...medicationData, name: e.target.value})}
                          className="w-full"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Dosering
                        </label>
                        <Input
                          type="text"
                          placeholder="bijv. 10mg, 1 tablet"
                          value={medicationData.dosage}
                          onChange={(e) => setMedicationData({...medicationData, dosage: e.target.value})}
                          className="w-full"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Tijdstip
                        </label>
                        <input
                          type="time"
                          value={medicationData.time}
                          onChange={(e) => setMedicationData({...medicationData, time: e.target.value})}
                          className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Herhaal
                        </label>
                        <select
                          value={medicationData.repeat}
                          onChange={(e) => setMedicationData({...medicationData, repeat: e.target.value})}
                          className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                          <option value="daily">Dagelijks</option>
                          <option value="weekly">Wekelijks</option>
                          <option value="none">Niet herhalen</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Herinnering
                      </label>
                      <select 
                        value={medicationData.reminder}
                        onChange={(e) => setMedicationData({...medicationData, reminder: e.target.value})}
                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="5">5 minuten voor</option>
                        <option value="10">10 minuten voor</option>
                        <option value="15">15 minuten voor</option>
                        <option value="30">30 minuten voor</option>
                      </select>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        id="addToAgenda" 
                        checked={medicationData.addToAgenda}
                        onChange={(e) => setMedicationData({...medicationData, addToAgenda: e.target.checked})}
                        className="rounded" 
                      />
                      <label htmlFor="addToAgenda" className="text-sm text-slate-700">
                        Voeg toe aan agenda {medicationData.repeat === 'daily' ? 'voor de komende 30 dagen' : 'als dagelijkse taak'}
                      </label>
                    </div>
                    {medicationData.addToAgenda && medicationData.repeat === 'daily' && (
                      <p className="text-xs text-slate-500 mt-1">
                        💡 Er worden automatisch 30 dagelijkse herinneringen aangemaakt
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-end space-x-3 mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setShowMedicationTracker(false)}
                    >
                      Sluiten
                    </Button>
                    <Button
                      onClick={handleSaveMedication}
                      disabled={isSavingMedication}
                      className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSavingMedication ? 'Opslaan...' : 'Opslaan & Herinnering Instellen'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Edit Item Modal */}
          {editingItem && (
            <div 
              className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30 backdrop-blur-sm"
              onClick={() => {
                setEditingItem(null);
                setEditMode(null);
              }}
            >
              <div 
                className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              >
                <div className="mb-4">
                  <h3 className="text-lg font-semibold">Bewerk {editingItem.type === 'task' ? 'Taak' : editingItem.type === 'event' ? 'Gebeurtenis' : 'Medicatie'}</h3>
                </div>
                <div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Titel
                      </label>
                      <Input
                        type="text"
                        value={editingItem.title.replace(/^[^\s]+\s/, '')} // Verwijder emoji/icon
                        onChange={(e) => setEditingItem({...editingItem, title: editingItem.icon + ' ' + e.target.value})}
                        className="w-full"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Starttijd
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={editingItem.startTime.getHours().toString().padStart(2, '0')}
                            onChange={(e) => {
                              const newTime = new Date(editingItem.startTime);
                              newTime.setHours(parseInt(e.target.value));
                              setEditingItem({...editingItem, startTime: newTime, endTime: new Date(newTime.getTime() + editingItem.duration * 60000)});
                            }}
                            className="w-full p-2 border border-slate-300 rounded-lg"
                          >
                            {Array.from({ length: 24 }, (_, i) => (
                              <option key={i} value={i.toString().padStart(2, '0')}>
                                {i.toString().padStart(2, '0')}
                              </option>
                            ))}
                          </select>
                          <select
                            value={editingItem.startTime.getMinutes().toString().padStart(2, '0')}
                            onChange={(e) => {
                              const newTime = new Date(editingItem.startTime);
                              newTime.setMinutes(parseInt(e.target.value));
                              setEditingItem({...editingItem, startTime: newTime, endTime: new Date(newTime.getTime() + editingItem.duration * 60000)});
                            }}
                            className="w-full p-2 border border-slate-300 rounded-lg"
                          >
                            {[0, 15, 30, 45].map(m => (
                              <option key={m} value={m.toString().padStart(2, '0')}>
                                {m.toString().padStart(2, '0')}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Duur (min)
                        </label>
                        <select
                          value={editingItem.duration}
                          onChange={(e) => {
                            const newDuration = parseInt(e.target.value);
                            setEditingItem({...editingItem, duration: newDuration, endTime: new Date(editingItem.startTime.getTime() + newDuration * 60000)});
                          }}
                          className="w-full p-2 border border-slate-300 rounded-lg"
                        >
                          {[15, 30, 45, 60, 90, 120].map(d => (
                            <option key={d} value={d}>{d} min</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {editingItem.type === 'task' && (
                      <div>
                        <label className="flex items-center space-x-2">
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

                    <div className="flex items-center justify-end space-x-3 mt-6">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingItem(null);
                          setEditMode(null);
                        }}
                      >
                        Annuleren
                      </Button>
                      <Button
                        onClick={async () => {
                          // Update taak in database
                          if (editingItem.type === 'task') {
                            const task = tasks.find(t => t.id === editingItem.id);
                            if (task) {
                              try {
                                const response = await fetch('/api/tasks', {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    id: task.id,
                                    title: editingItem.title.replace(/^[^\s]+\s/, ''),
                                    dueAt: editingItem.startTime.toISOString(),
                                    duration: editingItem.duration,
                                    done: editingItem.completed
                                  })
                                });
                                if (response.ok) {
                                  await fetchTasks();
                                  toast('Taak bijgewerkt!');
                                  setEditingItem(null);
                                  setEditMode(null);
                                }
                              } catch (error) {
                                toast('Fout bij bijwerken van taak');
                              }
                            }
                          }
                        }}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Opslaan
                      </Button>
                    </div>
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
