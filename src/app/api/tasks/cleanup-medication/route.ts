import { createClient } from '@/lib/supabase/server'
import { withApiErrorTracking } from '@/lib/posthog/withApiErrorTracking'
import { NextResponse } from 'next/server'

async function deleteMedicationTasks(_request: Request) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verwijder alle medicatie taken voor deze gebruiker
  const { data, error } = await supabase
    .from('tasks')
    .delete()
    .eq('user_id', user.id)
    .eq('source', 'medication')
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ 
    success: true, 
    deletedCount: data?.length || 0,
    message: `${data?.length || 0} medicatie items verwijderd`
  })
}

export const DELETE = withApiErrorTracking(
  "DELETE /api/tasks/cleanup-medication",
  deleteMedicationTasks
);