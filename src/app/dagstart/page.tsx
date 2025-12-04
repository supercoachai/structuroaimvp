"use client";

import { useState, useEffect } from 'react';
import DayStartCheckIn from '../../components/DayStartCheckIn';
import AppLayout from '../../components/layout/AppLayout';
import { createClient } from '../../lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function DagStartPage() {
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkIfAlreadyCheckedIn();
  }, []);

  const checkIfAlreadyCheckedIn = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push('/login');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('daily_checkins')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .single();

    if (data) {
      setHasCheckedIn(true);
      // Redirect naar home na 2 seconden
      setTimeout(() => {
        router.push('/');
      }, 2000);
    }
    
    setLoading(false);
  };

  const handleComplete = () => {
    setHasCheckedIn(true);
    setTimeout(() => {
      router.push('/todo');
    }, 1500);
  };

  if (loading) {
    return (
      <AppLayout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <div style={{ fontSize: 16, color: '#6B7280' }}>Laden...</div>
        </div>
      </AppLayout>
    );
  }

  if (hasCheckedIn) {
    return (
      <AppLayout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>✅ Check-in voltooid!</div>
            <div style={{ fontSize: 14, color: '#6B7280' }}>Je wordt doorgestuurd...</div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div style={{ padding: '28px 16px', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <DayStartCheckIn onComplete={handleComplete} />
      </div>
    </AppLayout>
  );
}

