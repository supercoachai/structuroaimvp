// Mock data voor lokale testing zonder Supabase
export interface MockTask {
  id: string;
  title: string;
  done: boolean;
  started: boolean; // Nieuw: telt als succes zodra gestart
  priority: number | null;
  dueAt: string | null;
  duration: number | null;
  source: string;
  completedAt: string | null;
  reminders: number[];
  repeat: string;
  impact: string;
  energyLevel: string; // 'low', 'medium', 'high'
  estimatedDuration: number | null;
  microSteps: string[];
  notToday: boolean;
  created_at: string;
  updated_at: string;
}

export const mockTasks: MockTask[] = [
  {
    id: '1',
    title: 'Email beantwoorden',
    done: false,
    started: false,
    priority: null,
    dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    duration: 15,
    source: 'regular',
    completedAt: null,
    reminders: [10],
    repeat: 'none',
    impact: '🌱',
    energyLevel: 'low',
    estimatedDuration: 15,
    microSteps: [],
    notToday: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '2',
    title: 'Boodschappenlijst maken',
    done: false,
    started: false,
    priority: null,
    dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    duration: 10,
    source: 'regular',
    completedAt: null,
    reminders: [10],
    repeat: 'none',
    impact: '🌱',
    energyLevel: 'low',
    estimatedDuration: 10,
    microSteps: [],
    notToday: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '3',
    title: 'Kamer opruimen',
    done: false,
    started: false,
    priority: null,
    dueAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    duration: 20,
    source: 'regular',
    completedAt: null,
    reminders: [10],
    repeat: 'none',
    impact: '🌱',
    energyLevel: 'low',
    estimatedDuration: 20,
    microSteps: [],
    notToday: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '4',
    title: 'Projectplanning opstellen',
    done: false,
    started: false,
    priority: null,
    dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    duration: 45,
    source: 'regular',
    completedAt: null,
    reminders: [10],
    repeat: 'none',
    impact: '🌱',
    energyLevel: 'medium',
    estimatedDuration: 45,
    microSteps: [],
    notToday: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '5',
    title: 'Vergadering voorbereiden',
    done: false,
    started: false,
    priority: null,
    dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    duration: 30,
    source: 'regular',
    completedAt: null,
    reminders: [10],
    repeat: 'none',
    impact: '🌱',
    energyLevel: 'medium',
    estimatedDuration: 30,
    microSteps: [],
    notToday: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '6',
    title: 'Rapport schrijven',
    done: false,
    started: false,
    priority: null,
    dueAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    duration: 60,
    source: 'regular',
    completedAt: null,
    reminders: [10],
    repeat: 'none',
    impact: '🌱',
    energyLevel: 'medium',
    estimatedDuration: 60,
    microSteps: [],
    notToday: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '7',
    title: 'Presentatie maken',
    done: false,
    started: false,
    priority: null,
    dueAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    duration: 90,
    source: 'regular',
    completedAt: null,
    reminders: [10],
    repeat: 'none',
    impact: '🌱',
    energyLevel: 'medium',
    estimatedDuration: 90,
    microSteps: [],
    notToday: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '8',
    title: 'Complexe data-analyse uitvoeren',
    done: false,
    started: false,
    priority: null,
    dueAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    duration: 120,
    source: 'regular',
    completedAt: null,
    reminders: [10],
    repeat: 'none',
    impact: '🌱',
    energyLevel: 'high',
    estimatedDuration: 120,
    microSteps: [],
    notToday: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '9',
    title: 'Volledige website redesign',
    done: false,
    started: false,
    priority: null,
    dueAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    duration: 180,
    source: 'regular',
    completedAt: null,
    reminders: [10],
    repeat: 'none',
    impact: '🌱',
    energyLevel: 'high',
    estimatedDuration: 180,
    microSteps: [],
    notToday: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '10',
    title: 'Strategisch plan ontwikkelen',
    done: false,
    started: false,
    priority: null,
    dueAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    duration: 150,
    source: 'regular',
    completedAt: null,
    reminders: [10],
    repeat: 'none',
    impact: '🌱',
    energyLevel: 'high',
    estimatedDuration: 150,
    microSteps: [],
    notToday: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];
