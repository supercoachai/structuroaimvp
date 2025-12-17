"use client";

import { useState, useEffect } from 'react';
import DayStartCheckIn from '../../components/DayStartCheckIn';
import { useRouter } from 'next/navigation';
import { hasCheckedInToday, getTodayCheckIn } from '../../lib/localStorageTasks';

export default function DagStartPage() {
  const [loading, setLoading] = useState(true);
  const [existingCheckIn, setExistingCheckIn] = useState<any>(null);
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
      // Laad bestaande check-in data
      const checkIn = getTodayCheckIn();
      setExistingCheckIn(checkIn);
    }
    
    setLoading(false);
  };

  const handleComplete = () => {
    // Na opslaan, refresh om eventuele wijzigingen te tonen
    setTimeout(() => {
      router.push('/');
    }, 500);
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
        <DayStartCheckIn 
          onComplete={handleComplete} 
          existingCheckIn={existingCheckIn}
        />
      </div>
    </div>
  );
}

