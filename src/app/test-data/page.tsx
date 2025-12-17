'use client';

import { useState } from 'react';
import { createClient } from '../../lib/supabase/client';
import { toast } from '../../components/Toast';

export default function TestDataPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [added, setAdded] = useState(false);

  const addTestTasks = async () => {
    setIsLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast('Je moet ingelogd zijn');
      setIsLoading(false);
      return;
    }

    try {
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
          due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
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
          due_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
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
        console.error('Error:', error);
        toast(`Fout: ${error.message}`);
        return;
      }

      toast(`✅ ${data.length} testtaken toegevoegd!`);
      setAdded(true);
    } catch (error: any) {
      console.error('Error:', error);
      toast(`Fout: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#F7F8FA',
      padding: '48px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E6E8EE',
        borderRadius: 16,
        padding: 32,
        maxWidth: 500,
        width: '100%'
      }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16, color: '#111827' }}>
          Testdata Toevoegen
        </h1>
        <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 24, lineHeight: 1.6 }}>
          Dit voegt 10 testtaken toe met variërende energie-niveaus:
        </p>
        <ul style={{ fontSize: 14, color: '#374151', marginBottom: 24, paddingLeft: 20, lineHeight: 1.8 }}>
          <li>3 taken met <strong>lage energie</strong> (10-20 min)</li>
          <li>4 taken met <strong>normale energie</strong> (30-90 min)</li>
          <li>3 taken met <strong>hoge energie</strong> (120-180 min)</li>
        </ul>
        <button
          onClick={addTestTasks}
          disabled={isLoading || added}
          style={{
            width: '100%',
            padding: '12px 24px',
            borderRadius: 8,
            border: 'none',
            background: (isLoading || added) ? '#E6E8EE' : '#4A90E2',
            color: (isLoading || added) ? '#9CA3AF' : 'white',
            fontSize: 16,
            fontWeight: 600,
            cursor: (isLoading || added) ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          {isLoading ? 'Toevoegen...' : added ? '✅ Toegevoegd!' : '10 Testtaken Toevoegen'}
        </button>
        {added && (
          <p style={{ fontSize: 12, color: '#10B981', marginTop: 16, textAlign: 'center' }}>
            Ga naar de takenlijst om ze te zien!
          </p>
        )}
      </div>
    </div>
  );
}
