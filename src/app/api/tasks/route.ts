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
  
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: user.id,
      title: body.title,
      done: body.done || false,
      priority: body.priority,
      due_at: body.dueAt || null,
      duration: body.duration,
      source: body.source || 'regular',
      completed_at: body.completedAt || null,
      reminders: body.reminders || [],
      repeat: body.repeat || 'none',
      impact: body.impact,
      energy_level: body.energyLevel,
      estimated_duration: body.estimatedDuration,
      micro_steps: body.microSteps || [],
      not_today: body.notToday || false,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
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

