import { createClient } from '@/lib/supabase/server'
import { LENGTH_LIMITS, firstLengthError, validateLength } from '@/lib/validateLength'
import { withApiErrorTracking } from '@/lib/posthog/withApiErrorTracking'
import { NextResponse } from 'next/server'

async function postTasksBatch(request: Request) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { tasks } = await request.json()

  if (!Array.isArray(tasks)) {
    return NextResponse.json({ error: 'Tasks must be an array' }, { status: 400 })
  }

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i]
    const prefix = `tasks[${i}]`
    if (!task || typeof task.title !== 'string' || task.title.trim() === '') {
      return NextResponse.json(
        { error: `${prefix}: title is verplicht` },
        { status: 400 }
      )
    }
    const trimmed = task.title.trim()
    const err = firstLengthError([
      validateLength(`${prefix}.title`, trimmed, LENGTH_LIMITS.TASK_TITLE),
      task.notes !== undefined &&
        task.notes !== null &&
        typeof task.notes !== 'string'
        ? `${prefix}.notes moet een tekst zijn`
        : null,
      typeof task.notes === 'string'
        ? validateLength(`${prefix}.notes`, task.notes, LENGTH_LIMITS.TASK_NOTES)
        : null,
    ])
    if (err) return NextResponse.json({ error: err }, { status: 400 })
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
      title: task.title.trim(),
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

  // Upsert alle taken (insert of update)
  const { data, error } = await supabase
    .from('tasks')
    .upsert(dbTasks, { onConflict: 'id' })
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export const POST = withApiErrorTracking("POST /api/tasks/batch", postTasksBatch);