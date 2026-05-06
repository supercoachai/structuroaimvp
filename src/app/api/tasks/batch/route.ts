import { createClient } from '@/lib/supabase/server'
import { takeRateToken } from '@/lib/simpleRateBucket'
import { NextResponse } from 'next/server'

/** Per warme instance; echte KV-ratelimits volgen bij wachtlijst/OG. */
const BATCH_MAX_PER_USER_PER_MIN = Number(
  process.env.STRUCTURO_BATCH_RATE_MAX_PER_MIN ?? '40'
)

// Batch update voor het synchroniseren van meerdere taken tegelijk
export async function POST(request: Request) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (
    !takeRateToken(
      `tasks_batch:${user.id}`,
      BATCH_MAX_PER_USER_PER_MIN,
      60_000
    )
  ) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { tasks } = await request.json()

  if (!Array.isArray(tasks)) {
    return NextResponse.json({ error: 'Tasks must be an array' }, { status: 400 })
  }

  // Map tasks to database format
  const dbTasks = tasks.map((task: {
    id?: string;
    title: string;
    done?: boolean;
    priority?: number | null;
    dueAt?: string | null;
    duration?: number;
    source?: string;
    completedAt?: string | null;
    reminders?: number[];
    repeat?: string;
    impact?: string;
    energyLevel?: string;
    estimatedDuration?: number;
  }) => {
    const dbTask: {
      user_id: string;
      title: string;
      done: boolean;
      priority?: number | null;
      due_at?: string | null;
      duration?: number;
      source: string;
      completed_at?: string | null;
      reminders: number[];
      repeat: string;
      impact?: string;
      energy_level?: string;
      estimated_duration?: number;
      id?: string;
    } = {
      user_id: user.id,
      title: task.title,
      done: task.done || false,
      priority: task.priority,
      due_at: task.dueAt || null,
      duration: task.duration,
      source: task.source || 'regular',
      completed_at: task.completedAt || null,
      reminders: task.reminders || [],
      repeat: task.repeat || 'none',
      impact: task.impact,
      energy_level: task.energyLevel,
      estimated_duration: task.estimatedDuration,
    };
    // Alleen ID toevoegen als het bestaat (voor updates)
    if (task.id) {
      dbTask.id = task.id;
    }
    return dbTask;
  })

  const incomingIds = dbTasks.flatMap((t) => (t.id ? [t.id] : []))
  if (incomingIds.length > 0) {
    const { data: owned, error: ownErr } = await supabase
      .from('tasks')
      .select('id')
      .eq('user_id', user.id)
      .in('id', incomingIds)

    if (ownErr) {
      return NextResponse.json({ error: ownErr.message }, { status: 500 })
    }

    const ownedSet = new Set((owned ?? []).map((r) => r.id as string))
    if (!incomingIds.every((id) => ownedSet.has(id))) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }
  }

  const { data, error } = await supabase
    .from('tasks')
    .upsert(dbTasks, { onConflict: 'id' })
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
