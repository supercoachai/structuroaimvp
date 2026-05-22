import { createClient } from '@/lib/supabase/server'
import { buildTaskPutDbUpdates } from '@/lib/buildTaskPutDbUpdates'
import {
  LENGTH_LIMITS,
  firstLengthError,
  validateLength,
} from '@/lib/validateLength'
import { withApiErrorTracking } from '@/lib/posthog/withApiErrorTracking'
import { NextResponse } from 'next/server'

async function getTasks(_request: Request) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

async function postTask(request: Request) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  if (!body.title || typeof body.title !== 'string' || body.title.trim() === '') {
    return NextResponse.json({ error: 'Titel is verplicht' }, { status: 400 })
  }

  const trimmedTitle = body.title.trim()
  const postLenErr = firstLengthError([
    validateLength('title', trimmedTitle, LENGTH_LIMITS.TASK_TITLE),
    body.notes !== undefined &&
      body.notes !== null &&
      typeof body.notes !== 'string'
      ? 'notes moet een tekst zijn'
      : null,
    typeof body.notes === 'string'
      ? validateLength('notes', body.notes, LENGTH_LIMITS.TASK_NOTES)
      : null,
  ])
  if (postLenErr) {
    return NextResponse.json({ error: postLenErr }, { status: 400 })
  }

  try {
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        title: trimmedTitle,
        done: body.done || false,
        priority: body.priority || null,
        due_at: body.dueAt || null,
        duration: body.duration || null, // null = gebruiker moet zelf instellen
        source: body.source || 'regular',
        completed_at: body.completedAt || null,
        reminders: body.reminders || [],
        repeat: body.repeat || 'none',
        impact: body.impact || '🌱',
        energy_level: body.energyLevel || 'medium',
        estimated_duration: body.estimatedDuration || body.duration || null,
        micro_steps: body.microSteps || [],
        not_today: body.notToday || false,
        started: body.started || false,
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ 
        error: error.message || 'Database fout bij toevoegen van taak',
        details: error.details || null,
        hint: error.hint || null
      }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err: any) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ 
      error: err.message || 'Onverwachte fout bij toevoegen van taak' 
    }, { status: 500 })
  }
}

async function putTask(request: Request) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { id, ...updates } = body

  if (!id) {
    return NextResponse.json({ error: 'Task ID required' }, { status: 400 })
  }

  if (updates.title !== undefined) {
    if (typeof updates.title !== 'string') {
      return NextResponse.json(
        { error: 'title moet een tekst zijn' },
        { status: 400 }
      )
    }
    const t = updates.title.trim()
    if (!t) {
      return NextResponse.json(
        { error: 'title mag niet leeg zijn' },
        { status: 400 }
      )
    }
    const titleErr = validateLength('title', t, LENGTH_LIMITS.TASK_TITLE)
    if (titleErr) {
      return NextResponse.json({ error: titleErr }, { status: 400 })
    }
  }

  const putLenErr = firstLengthError([
    updates.notes !== undefined &&
      updates.notes !== null &&
      typeof updates.notes !== 'string'
      ? 'notes moet een tekst zijn'
      : null,
    typeof updates.notes === 'string'
      ? validateLength('notes', updates.notes, LENGTH_LIMITS.TASK_NOTES)
      : null,
  ])
  if (putLenErr) {
    return NextResponse.json({ error: putLenErr }, { status: 400 })
  }

  const updatesForPut =
    updates.title !== undefined
      ? { ...updates, title: (updates.title as string).trim() }
      : updates

  const dbUpdates = buildTaskPutDbUpdates(updatesForPut)

  const { data, error } = await supabase
    .from('tasks')
    .update(dbUpdates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

async function deleteTask(request: Request) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Task ID required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export const GET = withApiErrorTracking("GET /api/tasks", getTasks);
export const POST = withApiErrorTracking("POST /api/tasks", postTask);
export const PUT = withApiErrorTracking("PUT /api/tasks", putTask);
export const DELETE = withApiErrorTracking("DELETE /api/tasks", deleteTask);