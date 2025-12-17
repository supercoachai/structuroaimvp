import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
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

export async function POST(request: Request) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  
  // Validate required fields
  if (!body.title || body.title.trim() === '') {
    return NextResponse.json({ error: 'Titel is verplicht' }, { status: 400 })
  }
  
  try {
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        title: body.title.trim(),
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

export async function PUT(request: Request) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { id, ...updates } = body

  // Map camelCase to snake_case
  const dbUpdates: any = {}
  if (updates.dueAt !== undefined) dbUpdates.due_at = updates.dueAt
  if (updates.completedAt !== undefined) dbUpdates.completed_at = updates.completedAt
  if (updates.energyLevel !== undefined) dbUpdates.energy_level = updates.energyLevel
  if (updates.estimatedDuration !== undefined) dbUpdates.estimated_duration = updates.estimatedDuration
  if (updates.microSteps !== undefined) dbUpdates.micro_steps = updates.microSteps
  if (updates.notToday !== undefined) dbUpdates.not_today = updates.notToday
  if (updates.started !== undefined) dbUpdates.started = updates.started
  Object.assign(dbUpdates, {
    title: updates.title,
    done: updates.done,
    priority: updates.priority,
    duration: updates.duration,
    source: updates.source,
    reminders: updates.reminders,
    repeat: updates.repeat,
    impact: updates.impact,
  })

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

export async function DELETE(request: Request) {
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

