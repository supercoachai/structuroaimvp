"use client";

import { useState, useEffect } from 'react';
import DayStartCheckIn from '../../components/DayStartCheckIn';
import { useRouter } from 'next/navigation';
import { hasCheckedInToday } from '../../lib/localStorageTasks';

export default function DagStartPage() {
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkIfAlreadyCheckedIn();
  }, []);

  const checkIfAlreadyCheckedIn = () => {
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    const checkedIn = hasCheckedInToday();
    
    if (checkedIn) {
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
      router.push('/');
    }, 1500);
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: '#F7F8FA',
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        padding: '32px 24px'
      }}>
        <div style={{ fontSize: 16, color: '#6B7280' }}>Laden...</div>
      </div>
    );
  }

  if (hasCheckedIn) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: '#F7F8FA',
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        padding: '32px 24px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>✅ Check-in voltooid!</div>
          <div style={{ fontSize: 14, color: '#6B7280' }}>Je wordt doorgestuurd...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#F7F8FA',
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '32px 24px'
    }}>
      <div style={{ width: '100%', maxWidth: 840 }}>
        <DayStartCheckIn onComplete={handleComplete} />
      </div>
    </div>
  );
}

