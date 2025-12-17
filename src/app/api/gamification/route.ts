import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('gamification_data')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error) {
    // Als er geen data is, maak het aan
    if (error.code === 'PGRST116') {
      const { data: newData, error: insertError } = await supabase
        .from('gamification_data')
        .insert({ user_id: user.id })
        .select()
        .single()
      
      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
      return NextResponse.json(newData)
    }
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
  
  const { data, error } = await supabase
    .from('gamification_data')
    .update({
      current_streak: body.currentStreak,
      longest_streak: body.longestStreak,
      total_tasks_completed: body.totalTasksCompleted,
      badges: body.badges,
      level: body.level,
      experience_points: body.experiencePoints,
    })
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

