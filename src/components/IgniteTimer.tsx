"use client";

import { useState, useEffect } from 'react';
import { PlayIcon, PauseIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface IgniteTimerProps {
  minutes: number;
}

export default function IgniteTimer({ minutes }: IgniteTimerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(minutes * 60);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            setIsCompleted(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const startTimer = () => {
    setIsRunning(true);
    setIsCompleted(false);
  };

  const pauseTimer = () => {
    setIsRunning(false);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(minutes * 60);
    setIsCompleted(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((minutes * 60 - timeLeft) / (minutes * 60)) * 100;

  return (
    <div className="text-center space-y-4">
      {!isCompleted ? (
        <>
          {/* Compacte timer display */}
          <div className="mb-4">
            <div className="text-2xl font-medium text-[#2F3441] mb-1">
              {formatTime(timeLeft)}
            </div>
            <div className="text-sm text-[rgba(47,52,65,0.65)]">
              {isRunning ? 'Je bent bezig' : 'Klaar om te starten?'}
            </div>
          </div>

          {/* Dunne progress bar */}
          <div className="w-full bg-[#E6E8EE] rounded-full h-1 mb-4">
            <div 
              className="bg-[#4A90E2] h-1 rounded-full transition-all duration-1000"
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          {/* Controls - compact */}
          <div className="flex gap-3 justify-center">
            {!isRunning ? (
              <button
                onClick={startTimer}
                className="bg-white border border-[#E6E8EE] text-[#2F3441] px-6 py-2 rounded-lg font-medium hover:bg-[#F7F8FA] transition-colors flex items-center gap-2"
              >
                <PlayIcon className="w-4 h-4" />
                Start {minutes} min
              </button>
            ) : (
              <button
                onClick={pauseTimer}
                className="bg-white border border-[#E6E8EE] text-[#2F3441] px-6 py-2 rounded-lg font-medium hover:bg-[#F7F8FA] transition-colors flex items-center gap-2"
              >
                <PauseIcon className="w-4 h-4" />
                Pauzeer
              </button>
            )}
            
            <button
              onClick={resetTimer}
              className="bg-[#F7F8FA] border border-[#E6E8EE] text-[rgba(47,52,65,0.65)] px-4 py-2 rounded-lg font-medium hover:bg-[#E6E8EE] transition-colors flex items-center gap-2"
            >
              <ArrowPathIcon className="w-4 h-4" />
              Reset
            </button>
          </div>
        </>
      ) : (
        <div className="text-center">
          <div className="text-2xl mb-3">✨</div>
          <h3 className="text-lg font-medium text-[#2F3441] mb-2">
            Gefeliciteerd!
          </h3>
          <p className="text-sm text-[rgba(47,52,65,0.65)] mb-4">
            Je hebt je {minutes} minuten sessie voltooid.
          </p>
          <button
            onClick={resetTimer}
            className="bg-[#4A90E2] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#3A80D2] transition-colors"
          >
            Nog een keer
          </button>
        </div>
      )}
    </div>
  );
}
