"use client";

import { useState, useEffect } from 'react';
import DayShutdown from '../../components/DayShutdown';
import AppLayout from '../../components/layout/AppLayout';
import { createClient } from '../../lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function ShutdownPage() {
  const [hasShutdown, setHasShutdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkIfAlreadyShutdown();
  }, []);

  const checkIfAlreadyShutdown = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push('/login');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('daily_shutdowns')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .single();

    if (data) {
      setHasShutdown(true);
    }
    
    setLoading(false);
  };

  const handleComplete = () => {
    setHasShutdown(true);
    setTimeout(() => {
      router.push('/');
    }, 2000);
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

  if (hasShutdown) {
    return (
      <AppLayout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>🌙 Shutdown voltooid!</div>
            <div style={{ fontSize: 14, color: '#6B7280' }}>Rust goed uit. Tot morgen!</div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div style={{ padding: '28px 16px', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <DayShutdown onComplete={handleComplete} />
      </div>
    </AppLayout>
  );
}

