import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';

export async function POST() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Test taken met variërende energie-niveaus
    const testTasks = [
      // Lage energie taken (3 stuks)
      {
        user_id: user.id,
        title: 'Email beantwoorden',
        done: false,
        priority: null,
        duration: 15,
        energy_level: 'low',
        source: 'regular',
        due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Morgen
      },
      {
        user_id: user.id,
        title: 'Boodschappenlijst maken',
        done: false,
        priority: null,
        duration: 10,
        energy_level: 'low',
        source: 'regular',
        due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        user_id: user.id,
        title: 'Kamer opruimen',
        done: false,
        priority: null,
        duration: 20,
        energy_level: 'low',
        source: 'regular',
        due_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // Over 2 dagen
      },
      
      // Normale energie taken (4 stuks)
      {
        user_id: user.id,
        title: 'Projectplanning opstellen',
        done: false,
        priority: null,
        duration: 45,
        energy_level: 'medium',
        source: 'regular',
        due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        user_id: user.id,
        title: 'Vergadering voorbereiden',
        done: false,
        priority: null,
        duration: 30,
        energy_level: 'medium',
        source: 'regular',
        due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        user_id: user.id,
        title: 'Rapport schrijven',
        done: false,
        priority: null,
        duration: 60,
        energy_level: 'medium',
        source: 'regular',
        due_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        user_id: user.id,
        title: 'Presentatie maken',
        done: false,
        priority: null,
        duration: 90,
        energy_level: 'medium',
        source: 'regular',
        due_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
      
      // Hoge energie taken (3 stuks)
      {
        user_id: user.id,
        title: 'Complexe data-analyse uitvoeren',
        done: false,
        priority: null,
        duration: 120,
        energy_level: 'high',
        source: 'regular',
        due_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        user_id: user.id,
        title: 'Volledige website redesign',
        done: false,
        priority: null,
        duration: 180,
        energy_level: 'high',
        source: 'regular',
        due_at: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        user_id: user.id,
        title: 'Strategisch plan ontwikkelen',
        done: false,
        priority: null,
        duration: 150,
        energy_level: 'high',
        source: 'regular',
        due_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    const { data, error } = await supabase
      .from('tasks')
      .insert(testTasks)
      .select();

    if (error) {
      console.error('Error inserting test tasks:', error);
      return NextResponse.json({ 
        error: error.message || 'Fout bij toevoegen van testtaken',
        details: error.details
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      count: data.length,
      message: `${data.length} testtaken toegevoegd`,
      tasks: data
    });
  } catch (err: any) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ 
      error: err.message || 'Onverwachte fout bij toevoegen van testtaken' 
    }, { status: 500 });
  }
}
