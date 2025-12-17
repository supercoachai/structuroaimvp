"use client";

import { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import { useTasks } from '../../hooks/useTasks';
import Collapsible from '../../components/Collapsible';

interface Task {
  id: string;
  title: string;
  done: boolean;
  priority: number | null;
  completedAt?: string;
}

interface GamificationData {
  currentStreak: number;
  longestStreak: number;
  totalTasksCompleted: number;
  todayTasksCompleted: number;
  todayGoal: number;
  level: number;
  experience: number;
  badges: string[];
  totalXP: number;
  unlockedBadges: Badge[];
}

interface Badge {
  id: string;
  name: string;
  description: string;
  category: 'streak' | 'focus' | 'task' | 'challenge' | 'fun';
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlocked: boolean;
  unlockedAt?: string;
  requirement: string;
  xpReward: number;
  seasonal?: boolean;
  eventName?: string;
}

export default function GamificationPage() {
  const { tasks, loading } = useTasks();
  const [gamificationData, setGamificationData] = useState<GamificationData>({
    currentStreak: 0,
    longestStreak: 0,
    totalTasksCompleted: 0,
    todayTasksCompleted: 0,
    todayGoal: 3,
    level: 1,
    experience: 0,
    badges: [],
    totalXP: 0,
    unlockedBadges: []
  });

  const [showStreak, setShowStreak] = useState(true);
  const [showProgress, setShowProgress] = useState(true);

  // Bereken gamification data op basis van voltooide taken
  useEffect(() => {
    if (loading) return;
    
    const calculateGamificationData = () => {
      try {
        const completedTasks = tasks.filter(task => task.done);
        
        // Bereken dagelijkse voltooiingen
        const today = new Date().toDateString();
        const todayTasks = completedTasks.filter(task => {
          if (!task.completedAt) return false;
          return new Date(task.completedAt).toDateString() === today;
        });

        // Bereken streak
        const streak = calculateStreak(completedTasks);
        
        // Bereken level en experience
        const totalExp = completedTasks.length * 10; // 10 XP per taak
        const level = Math.floor(totalExp / 100) + 1; // Level up elke 100 XP
        const experience = totalExp % 100;

        // Bereken badges
        const badges = calculateBadges(completedTasks, streak);

        setGamificationData({
          currentStreak: streak.current,
          longestStreak: streak.longest,
          totalTasksCompleted: completedTasks.length,
          todayTasksCompleted: todayTasks.length,
          todayGoal: 3,
          level,
          experience,
          badges,
          totalXP: totalExp,
          unlockedBadges: calculateUnlockedBadges(completedTasks, streak.current)
        });
      } catch (error) {
        console.error('Error calculating gamification data:', error);
      }
    };

    calculateGamificationData();
  }, [tasks, loading]);

  const calculateStreak = (completedTasks: Task[]) => {
    if (completedTasks.length === 0) return { current: 0, longest: 0 };

    const sortedTasks = completedTasks
      .filter(task => task.completedAt)
      .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let lastDate: string | null = null;

    for (const task of sortedTasks) {
      const taskDate = new Date(task.completedAt!).toDateString();
      
      if (!lastDate) {
        tempStreak = 1;
        lastDate = taskDate;
      } else {
        const daysDiff = Math.floor((new Date(lastDate).getTime() - new Date(taskDate).getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === 1) {
          tempStreak++;
        } else if (daysDiff === 0) {
          // Zelfde dag, tel niet op
          continue;
        } else {
          // Streak gebroken
          if (tempStreak > longestStreak) {
            longestStreak = tempStreak;
          }
          tempStreak = 1;
        }
        lastDate = taskDate;
      }
    }

    // Check laatste streak
    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }

    // Bereken huidige streak (alleen als laatste taak vandaag of gisteren was)
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
    
    if (lastDate === today || lastDate === yesterday) {
      currentStreak = tempStreak;
    }

    return { current: currentStreak, longest: longestStreak };
  };

  const calculateBadges = (completedTasks: Task[], streak: { current: number, longest: number }) => {
    const badges: string[] = [];
    
    if (completedTasks.length >= 10) badges.push('🎯 Beginner');
    if (completedTasks.length >= 50) badges.push('🚀 Gevorderde');
    if (completedTasks.length >= 100) badges.push('🏆 Expert');
    if (streak.current >= 3) badges.push('🔥 Hot Streak');
    if (streak.current >= 7) badges.push('⚡ Week Warrior');
    if (streak.longest >= 30) badges.push('👑 Maand Koning');
    if (completedTasks.length >= 5 && streak.current >= 5) badges.push('💪 Consistentie');
    
    return badges;
  };

  // Bereken alle 50+ badges en hun unlock status
  const calculateUnlockedBadges = (completedTasks: Task[], currentStreak: number): Badge[] => {
    const allBadges: Badge[] = [
      // Streak Badges
      {
        id: 'streak_3',
        name: '3 Dagen Streak',
        description: '3 dagen achter elkaar taken voltooid',
        category: 'streak',
        icon: '🔥',
        rarity: 'common',
        unlocked: currentStreak >= 3,
        unlockedAt: currentStreak >= 3 ? new Date().toISOString() : undefined,
        requirement: 'Voltooi 3 dagen achter elkaar taken',
        xpReward: 50
      },
      {
        id: 'streak_7',
        name: '7 Dagen Streak',
        description: 'Een hele week consistent!',
        category: 'streak',
        icon: '⚡',
        rarity: 'rare',
        unlocked: currentStreak >= 7,
        unlockedAt: currentStreak >= 7 ? new Date().toISOString() : undefined,
        requirement: 'Voltooi 7 dagen achter elkaar taken',
        xpReward: 100
      },
      {
        id: 'streak_30',
        name: '30 Dagen Streak',
        description: 'Een maand lang consistent!',
        category: 'streak',
        icon: '🏆',
        rarity: 'epic',
        unlocked: currentStreak >= 30,
        unlockedAt: currentStreak >= 30 ? new Date().toISOString() : undefined,
        requirement: 'Voltooi 30 dagen achter elkaar taken',
        xpReward: 500
      },
      {
        id: 'streak_100',
        name: 'Centurion',
        description: '100 dagen streak! Je bent een legende!',
        category: 'streak',
        icon: '👑',
        rarity: 'legendary',
        unlocked: currentStreak >= 100,
        unlockedAt: currentStreak >= 100 ? new Date().toISOString() : undefined,
        requirement: 'Voltooi 100 dagen achter elkaar taken',
        xpReward: 1000
      },
      
      // Task Badges
      {
        id: 'task_first',
        name: 'Eerste Taak',
        description: 'Je eerste taak voltooid!',
        category: 'task',
        icon: '🌱',
        rarity: 'common',
        unlocked: completedTasks.length >= 1,
        unlockedAt: completedTasks.length >= 1 ? new Date().toISOString() : undefined,
        requirement: 'Voltooi je eerste taak',
        xpReward: 10
      },
      {
        id: 'task_10',
        name: '10 Taken',
        description: '10 taken voltooid!',
        category: 'task',
        icon: '📚',
        rarity: 'common',
        unlocked: completedTasks.length >= 10,
        unlockedAt: completedTasks.length >= 10 ? new Date().toISOString() : undefined,
        requirement: 'Voltooi 10 taken',
        xpReward: 50
      },
      {
        id: 'task_100',
        name: '100 Taken',
        description: '100 taken voltooid!',
        category: 'task',
        icon: '💎',
        rarity: 'rare',
        unlocked: completedTasks.length >= 100,
        unlockedAt: completedTasks.length >= 100 ? new Date().toISOString() : undefined,
        requirement: 'Voltooi 100 taken',
        xpReward: 200
      },
      {
        id: 'task_1000',
        name: 'Task Master',
        description: '1000 taken! Je bent een productiviteitsmachine!',
        category: 'task',
        icon: '🚀',
        rarity: 'epic',
        unlocked: completedTasks.length >= 1000,
        unlockedAt: completedTasks.length >= 1000 ? new Date().toISOString() : undefined,
        requirement: 'Voltooi 1000 taken',
        xpReward: 500
      },
      
      // Focus Badges
      {
        id: 'focus_5min',
        name: '5 Min Focus',
        description: 'Eerste 5-minuten focus sessie',
        category: 'focus',
        icon: '⚡',
        rarity: 'common',
        unlocked: false, // TODO: Check focus sessions
        requirement: 'Voltooi een 5-minuten focus sessie',
        xpReward: 25
      },
      {
        id: 'focus_15min',
        name: '15 Min Focus',
        description: 'Eerste 15-minuten focus sessie',
        category: 'focus',
        icon: '🎯',
        rarity: 'common',
        unlocked: false, // TODO: Check focus sessions
        requirement: 'Voltooi een 15-minuten focus sessie',
        xpReward: 50
      },
      {
        id: 'focus_25min',
        name: '25 Min Focus',
        description: 'Eerste 25-minuten focus sessie',
        category: 'focus',
        icon: '🔥',
        rarity: 'rare',
        unlocked: false, // TODO: Check focus sessions
        requirement: 'Voltooi een 25-minuten focus sessie',
        xpReward: 75
      },
      {
        id: 'focus_100',
        name: 'Focus Warrior',
        description: '100 focus sessies voltooid!',
        category: 'focus',
        icon: '⚔️',
        rarity: 'epic',
        unlocked: false, // TODO: Check focus sessions
        requirement: 'Voltooi 100 focus sessies',
        xpReward: 300
      },
      
      // Specials & Fun Badges
      {
        id: 'fun_night_owl',
        name: 'Night Owl',
        description: '5 taken afgerond na 22:00',
        category: 'fun',
        icon: '🌙',
        rarity: 'rare',
        unlocked: false, // TODO: Check late night tasks
        requirement: 'Voltooi 5 taken na 22:00',
        xpReward: 75
      },
      {
        id: 'fun_early_bird',
        name: 'Early Bird',
        description: '5 taken afgerond vóór 08:00',
        category: 'fun',
        icon: '☀️',
        rarity: 'rare',
        unlocked: false, // TODO: Check early morning tasks
        requirement: 'Voltooi 5 taken vóór 08:00',
        xpReward: 75
      },
      {
        id: 'fun_streak_buster',
        name: 'Streak Buster',
        description: '7 dagen streak behaald!',
        category: 'fun',
        icon: '💥',
        rarity: 'rare',
        unlocked: currentStreak >= 7,
        unlockedAt: currentStreak >= 7 ? new Date().toISOString() : undefined,
        requirement: 'Behaal een 7-dagen streak',
        xpReward: 100
      },
      {
        id: 'fun_zen_master',
        name: 'Zen Master',
        description: '10 focus sessies achter elkaar zonder pauze',
        category: 'fun',
        icon: '🧘‍♂️',
        rarity: 'epic',
        unlocked: false, // TODO: Check consecutive focus sessions
        requirement: '10 focus sessies zonder pauze',
        xpReward: 200
      },
      {
        id: 'fun_speedrunner',
        name: 'Speedrunner',
        description: '5 taken in <10 minuten afgerond',
        category: 'fun',
        icon: '⚡',
        rarity: 'rare',
        unlocked: false, // TODO: Check fast task completion
        requirement: 'Voltooi 5 taken in <10 min',
        xpReward: 150
      },
      {
        id: 'fun_weekend_warrior',
        name: 'Weekend Warrior',
        description: 'Alle weekend taken voltooid!',
        category: 'fun',
        icon: '🏆',
        rarity: 'rare',
        unlocked: false, // TODO: Check weekend completion
        requirement: 'Voltooi alle weekend taken',
        xpReward: 100
      },
      
      // Seizoensgebonden Badges
      {
        id: 'seasonal_halloween',
        name: '🎃 Halloween Focus',
        description: 'Focus sessie op Halloween!',
        category: 'fun',
        icon: '🎃',
        rarity: 'epic',
        seasonal: true,
        eventName: 'Halloween 2024',
        unlocked: false, // TODO: Check Halloween date
        requirement: 'Voltooi focus sessie op 31 oktober',
        xpReward: 150
      },
      {
        id: 'seasonal_newyear',
        name: '🎆 New Year Sprint',
        description: 'Begin het jaar met focus!',
        category: 'fun',
        icon: '🎆',
        rarity: 'epic',
        seasonal: true,
        eventName: 'New Year 2025',
        unlocked: false, // TODO: Check New Year date
        requirement: 'Voltooi 5 taken op 1 januari',
        xpReward: 200
      }
    ];
    
    return allBadges;
  };

  const getProgressPercentage = () => {
    return Math.min((gamificationData.todayTasksCompleted / gamificationData.todayGoal) * 100, 100);
  };

  const getNextLevelExp = () => {
    return 100 - gamificationData.experience;
  };

  // Level namen voor game-vibe
  const getLevelName = (level: number): string => {
    const levelNames: { [key: number]: string } = {
      1: '🌱 Beginner',
      2: '📝 Notetaker',
      3: '🎯 Task Tracker',
      4: '⏰ Time Manager',
      5: '📋 Planner Pro',
      6: '⚡ Momentum Builder',
      7: '🔥 Streak Starter',
      8: '📊 Progress Tracker',
      9: '🎉 Achievement Hunter',
      10: '🧠 Focus Master',
      15: '🚀 Productivity Rocket',
      20: '🧘‍♂️ Structuro Sensei',
      25: '💎 Efficiency Diamond',
      30: '🏆 Task Champion',
      40: '🌟 Productivity Star',
      50: '👑 Task King/Queen',
      75: '🔮 Productivity Wizard',
      100: '🌌 Structuro Legend'
    };
    
    // Zoek de dichtstbijzijnde level naam
    const levels = Object.keys(levelNames).map(Number).sort((a, b) => a - b);
    const currentLevel = levels.find(l => l <= level) || levels[0];
    const nextLevel = levels.find(l => l > level);
    
    if (nextLevel) {
      return `${levelNames[currentLevel]} (${nextLevel - level} levels tot ${levelNames[nextLevel]})`;
    }
    
    return levelNames[currentLevel] || `Level ${level}`;
  };

  // BadgeCard Component - Visueel aantrekkelijke badge weergave met game-vibe en zeldzaamheid
  const BadgeCard = ({ badge }: { badge: Badge }) => {
    // Zeldzaamheid kleuren en effecten
    const getRarityStyle = () => {
      switch (badge.rarity) {
        case 'common':
          return {
            borderColor: '#6B7280',
            glowColor: 'rgba(107, 114, 128, 0.1)',
            badgeColor: '#6B7280',
            background: 'linear-gradient(135deg, #F9FAFB, #F3F4F6)'
          };
        case 'rare':
          return {
            borderColor: '#3B82F6',
            glowColor: 'rgba(59, 130, 246, 0.15)',
            badgeColor: '#3B82F6',
            background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)'
          };
        case 'epic':
          return {
            borderColor: '#8B5CF6',
            glowColor: 'rgba(139, 92, 246, 0.2)',
            badgeColor: '#8B5CF6',
            background: 'linear-gradient(135deg, #F5F3FF, #EDE9FE)'
          };
        case 'legendary':
          return {
            borderColor: '#F59E0B',
            glowColor: 'rgba(245, 158, 11, 0.25)',
            badgeColor: '#F59E0B',
            background: 'linear-gradient(135deg, #FFFBEB, #FEF3C7)'
          };
        default:
          return {
            borderColor: '#6B7280',
            glowColor: 'rgba(107, 114, 128, 0.1)',
            badgeColor: '#6B7280',
            background: 'linear-gradient(135deg, #F9FAFB, #F3F4F6)'
          };
      }
    };

    const rarityStyle = getRarityStyle();
    
    return (
      <div 
        style={{ 
          textAlign: "center", 
          padding: 16, 
          background: badge.unlocked ? rarityStyle.background : "#F7F8FA", 
          border: badge.unlocked 
            ? `2px solid ${rarityStyle.borderColor}` 
            : "1px solid #E6E8EE",
          borderRadius: 12,
          position: "relative",
          transition: "all 0.3s ease",
          cursor: "pointer",
          opacity: badge.unlocked ? 1 : 0.6,
          transform: badge.unlocked ? "scale(1)" : "scale(0.95)",
          boxShadow: badge.unlocked ? `0 4px 15px ${rarityStyle.glowColor}` : "none"
        }}
        onMouseEnter={(e) => {
          if (badge.unlocked) {
            e.currentTarget.style.transform = "scale(1.05)";
            e.currentTarget.style.boxShadow = `0 8px 25px ${rarityStyle.glowColor}`;
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = badge.unlocked ? "scale(1)" : "scale(0.95)";
          e.currentTarget.style.boxShadow = badge.unlocked ? `0 4px 15px ${rarityStyle.glowColor}` : "none";
        }}
      >
        {/* Rarity Badge */}
        <div style={{
          position: "absolute",
          top: "-8px",
          left: "-8px",
          background: rarityStyle.badgeColor,
          color: "white",
          fontSize: 8,
          fontWeight: 700,
          padding: "2px 6px",
          borderRadius: 8,
          textTransform: "uppercase",
          letterSpacing: "0.5px"
        }}>
          {badge.rarity}
        </div>
        
        {/* Seasonal Badge */}
        {badge.seasonal && (
          <div style={{
            position: "absolute",
            top: "-8px",
            right: "-8px",
            background: "#EF4444",
            color: "white",
            fontSize: 8,
            fontWeight: 700,
            padding: "2px 6px",
            borderRadius: 8,
            textTransform: "uppercase",
            letterSpacing: "0.5px"
          }}>
            Event
          </div>
        )}
        
        {/* Badge Icon - Echte icon-badges */}
        <div style={{ 
          fontSize: 36, 
          marginBottom: 8,
          filter: badge.unlocked ? "none" : "grayscale(100%)",
          transition: "all 0.3s ease",
          position: "relative",
          marginTop: badge.seasonal ? 8 : 0
        }}>
          {badge.unlocked ? badge.icon : "🔒"}
          
          {/* Unlock Shine Effect */}
          {badge.unlocked && (
            <div style={{
              position: "absolute",
              top: "-2px",
              left: "-2px",
              right: "-2px",
              bottom: "-2px",
              background: "linear-gradient(45deg, transparent, rgba(255,255,255,0.8), transparent)",
              borderRadius: "50%",
              animation: "shine 2s ease-in-out infinite",
              pointerEvents: "none"
            }}></div>
          )}
        </div>
        
        {/* Badge Name */}
        <div style={{ 
          fontSize: 12, 
          fontWeight: 600, 
          marginBottom: 4,
          color: badge.unlocked ? rarityStyle.badgeColor : "rgba(47,52,65,0.5)"
        }}>
          {badge.name}
        </div>
        
        {/* XP Reward */}
        <div style={{ 
          fontSize: 10, 
          color: "#10B981",
          fontWeight: 600,
          background: badge.unlocked ? "rgba(16, 185, 129, 0.1)" : "transparent",
          padding: "2px 6px",
          borderRadius: 8,
          display: "inline-block"
        }}>
          +{badge.xpReward.toString()} XP
        </div>
        
        {/* Unlock Date */}
        {badge.unlocked && badge.unlockedAt && (
          <div style={{ 
            fontSize: 9, 
            color: "rgba(47,52,65,0.6)",
            marginTop: 6,
            fontStyle: "italic"
          }}>
            {new Date(badge.unlockedAt).toLocaleDateString('nl-NL', { 
              day: 'numeric', 
              month: 'short' 
            })}
          </div>
        )}
        
        {/* Locked Badge Tooltip */}
        {!badge.unlocked && (
          <div 
            style={{
              position: "absolute",
              bottom: "100%",
              left: "50%",
              transform: "translateX(-50%)",
              background: "#1F2937",
              color: "white",
              padding: "8px 12px",
              borderRadius: 8,
              fontSize: 11,
              whiteSpace: "nowrap",
              marginBottom: 8,
              opacity: '0',
              pointerEvents: "none",
              transition: "opacity 0.3s ease",
              zIndex: 10,
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '0';
            }}
          >
            {badge.requirement}
            <div style={{
              position: "absolute",
              top: "100%",
              left: "50%",
              transform: "translateX(-50%)",
              border: "4px solid transparent",
              borderTopColor: "#1F2937"
            }}></div>
          </div>
        )}
        
        {/* Unlock Glow Effect */}
        {badge.unlocked && (
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: 12,
            background: `radial-gradient(circle at center, ${rarityStyle.glowColor}, transparent 70%)`,
            pointerEvents: "none"
          }}></div>
        )}
        
        {/* Unlock Animation Trigger */}
        {badge.unlocked && (
          <div style={{
            position: "absolute",
            top: "-4px",
            right: "-4px",
            width: "12px",
            height: "12px",
            background: "#10B981",
            borderRadius: "50%",
            border: "2px solid white",
            animation: "pulse 2s ease-in-out infinite"
          }}></div>
        )}
      </div>
    );
  };

  return (
    <AppLayout>
      <div
        style={{
          minHeight: "100vh",
          background: "#F7F8FA",
          color: "#2F3441",
          display: "grid",
          justifyContent: "center",
          padding: "28px 16px 64px",
        }}
      >
        <main style={{ width: "min(720px, 92vw)", display: "grid", gap: 20 }}>
          {/* Header */}
          <header style={{ textAlign: "center", marginBottom: 4 }}>
            <div style={{ fontSize: 22, fontWeight: 700 }}>Prestaties</div>
            <div style={{ fontSize: 14, color: "rgba(47,52,65,0.75)", marginTop: 6 }}>
              Motiveer jezelf met beloningen en voortgang
            </div>
          </header>

          {/* Level & Experience */}
          <section style={{ background: "white", border: "1px solid #E6E8EE", borderRadius: 12, padding: 24 }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>🎖️</div>
              <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
                Level {gamificationData.level}
              </div>
              <div style={{ fontSize: 14, color: "rgba(47,52,65,0.75)" }}>
                {gamificationData.experience} / 100 XP
              </div>
            </div>
            
            {/* Experience Bar */}
            <div style={{ background: "#E6E8EE", borderRadius: 8, height: 12, marginBottom: 8 }}>
              <div 
                style={{ 
                  background: "#4A90E2", 
                  borderRadius: 8, 
                  height: "100%", 
                  width: `${getProgressPercentage()}%`,
                  transition: "width 0.3s ease"
                }}
              />
            </div>
            
            <div style={{ textAlign: "center", fontSize: 12, color: "rgba(47,52,65,0.75)" }}>
              {getNextLevelExp()} XP tot level {gamificationData.level + 1}
            </div>
            
            {/* Total XP Display */}
            <div style={{ textAlign: "center", fontSize: 14, fontWeight: 600, color: "#10B981", marginTop: 8 }}>
              🎯 Totaal: {gamificationData.totalXP.toString()} XP
            </div>
          </section>

          {/* Streak & Progress */}
          <section style={{ background: "white", border: "1px solid #E6E8EE", borderRadius: 12, padding: 24 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {/* Current Streak */}
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🔥</div>
                <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
                  {gamificationData.currentStreak}
                </div>
                <div style={{ fontSize: 12, color: "rgba(47,52,65,0.75)" }}>
                  Huidige streak
                </div>
              </div>
              
              {/* Longest Streak */}
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🏆</div>
                <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
                  {gamificationData.longestStreak}
                </div>
                <div style={{ fontSize: 12, color: "rgba(47,52,65,0.75)" }}>
                  Langste streak
                </div>
              </div>
            </div>
          </section>

          {/* Focus Streaks - Verplaatst van Focus Modus */}
          <section style={{ background: "white", border: "1px solid #E6E8EE", borderRadius: 12, padding: 24 }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
              🎯 Focus Streaks
            </div>
            <div style={{ display: "grid", gap: 16 }}>
              {/* 5 min streak */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#F7F8FA", borderRadius: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 20 }}>⚡</span>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>5 Minuten</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 80, background: "#E6E8EE", borderRadius: 4, height: 8 }}>
                    <div 
                      style={{ 
                        background: "#4A90E2", 
                        borderRadius: 4, 
                        height: "100%", 
                        width: `${Math.min(100, (parseInt(localStorage.getItem('focus_streak_5') || '0') / 3) * 100)}%`,
                        transition: "width 0.3s ease"
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#4A90E2" }}>
                    {parseInt(localStorage.getItem('focus_streak_5') || '0')}/3
                  </span>
                </div>
              </div>
              
              {/* 15 min streak */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#F7F8FA", borderRadius: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 20 }}>🎯</span>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>15 Minuten</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 80, background: "#E6E8EE", borderRadius: 4, height: 8 }}>
                    <div 
                      style={{ 
                        background: "#4A90E2", 
                        borderRadius: 4, 
                        height: "100%", 
                        width: `${Math.min(100, (parseInt(localStorage.getItem('focus_streak_15') || '0') / 3) * 100)}%`,
                        transition: "width 0.3s ease"
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#4A90E2" }}>
                    {parseInt(localStorage.getItem('focus_streak_15') || '0')}/3
                  </span>
                </div>
              </div>
              
              {/* 25 min streak */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#F7F8FA", borderRadius: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 20 }}>🚀</span>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>25 Minuten</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 80, background: "#E6E8EE", borderRadius: 4, height: 8 }}>
                    <div 
                      style={{ 
                        background: "#4A90E2", 
                        borderRadius: 4, 
                        height: "100%", 
                        width: `${Math.min(100, (parseInt(localStorage.getItem('focus_streak_25') || '0') / 3) * 100)}%`,
                        transition: "width 0.3s ease"
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#4A90E2" }}>
                    {parseInt(localStorage.getItem('focus_streak_25') || '0')}/3
                  </span>
                </div>
              </div>
            </div>
            
            {/* Motivatie bericht */}
            <div style={{ marginTop: 16, padding: "12px 16px", background: "linear-gradient(135deg, #FFF3CD, #FFEAA7)", border: "1px solid #FFE5A3", borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: "#856404", textAlign: "center" }}>
                {(() => {
                  const streak5 = parseInt(localStorage.getItem('focus_streak_5') || '0');
                  const streak15 = parseInt(localStorage.getItem('focus_streak_15') || '0');
                  const streak25 = parseInt(localStorage.getItem('focus_streak_25') || '0');
                  
                  if (streak5 >= 3) return "🔥 5min master! Je bent on fire!";
                  if (streak15 >= 3) return "⚡ 15min expert! Consistentie is key!";
                  if (streak25 >= 3) return "🚀 25min warrior! Deep focus is jouw ding!";
                  if (streak5 >= 1 || streak15 >= 1 || streak25 >= 1) return "🌱 Je bouwt momentum op! Blijf zo doorgaan!";
                  return "💪 Begin je focus journey vandaag!";
                })()}
              </div>
            </div>
          </section>

          {/* Today's Progress */}
          <section style={{ background: "white", border: "1px solid #E6E8EE", borderRadius: 12, padding: 24 }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                📊 Vandaag's Voortgang
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 14, color: "rgba(47,52,65,0.75)" }}>
                  {gamificationData.todayTasksCompleted} / {gamificationData.todayGoal} taken voltooid
                </span>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#4A90E2" }}>
                  {Math.round(getProgressPercentage())}%
                </span>
              </div>
              
              {/* Progress Bar */}
              <div style={{ background: "#E6E8EE", borderRadius: 8, height: 8 }}>
                <div 
                  style={{ 
                    background: "#4A90E2", 
                    borderRadius: 8, 
                    height: "100%", 
                    width: `${getProgressPercentage()}%`,
                    transition: "width 0.3s ease"
                  }}
                />
              </div>
            </div>
          </section>

          {/* Badges */}
          {gamificationData.badges.length > 0 && (
            <section style={{ background: "white", border: "1px solid #E6E8EE", borderRadius: 12, padding: 24 }}>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
                🏅 Verdiende Badges
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
                {gamificationData.badges.map((badge, index) => (
                  <div key={index} style={{ textAlign: "center", padding: 16, background: "#F7F8FA", borderRadius: 8 }}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>🎖️</div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{badge}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 🏆 Structuro Prijzenkast - 50+ Badges - Uitklapbaar */}
          <section style={{ 
            background: "linear-gradient(135deg, #FFFFFF, #F8FAFC)", 
            border: "2px solid #E6E8EE", 
            borderRadius: 16, 
            padding: 24,
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)"
          }}>
            <Collapsible title="🏆 Structuro Prijzenkast" defaultOpen={false}>
            {/* Header - Cleaner versie */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, textAlign: "center", color: "#4A90E2" }}>
                🏆 Prijzenkast
              </div>
              <div style={{ fontSize: 14, color: "rgba(47,52,65,0.75)", marginBottom: 20, textAlign: "center" }}>
                {gamificationData.unlockedBadges.filter(b => b.unlocked).length} van de 50+ badges ontgrendeld
              </div>
              
              {/* XP Progressiebalk */}
              <div style={{ 
                background: "linear-gradient(135deg, #F0F9FF, #E0F2FE)", 
                border: "1px solid #BAE6FD", 
                borderRadius: 12, 
                padding: "16px 20px",
                marginBottom: 16
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#0369A1" }}>
                    🎯 {getLevelName(gamificationData.level)}
                  </div>
                  <div style={{ fontSize: 12, color: "#0369A1" }}>
                    {gamificationData.experience}/{100} XP
                  </div>
                </div>
                <div style={{ width: "100%", height: 8, background: "#E0F2FE", borderRadius: 4, overflow: "hidden" }}>
                  <div 
                    style={{ 
                      height: "100%", 
                      background: "linear-gradient(90deg, #0EA5E9, #38BDF8)", 
                      borderRadius: 4,
                      width: `${(gamificationData.experience / 100) * 100}%`,
                      transition: "width 0.5s ease",
                      boxShadow: "0 0 8px rgba(14, 165, 233, 0.3)"
                    }}
                  />
                </div>
                <div style={{ textAlign: "center", marginTop: 8, fontSize: 12, color: "#0369A1" }}>
                  Nog {100 - gamificationData.experience} XP tot Level {gamificationData.level + 1} 🔥
                </div>
              </div>
            </div>
            
            {/* Badge Categorieën */}
            <div style={{ marginBottom: 24 }}>
              {/* Streaks Sectie */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: "#EF4444", display: "flex", alignItems: "center", gap: 8 }}>
                  🕑 Streaks
                  <span style={{ fontSize: 12, background: "#FEE2E2", color: "#DC2626", padding: "2px 8px", borderRadius: 12 }}>
                    {gamificationData.unlockedBadges.filter(b => b.category === 'streak' && b.unlocked).length}/{gamificationData.unlockedBadges.filter(b => b.category === 'streak').length} ontgrendeld
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
                  {gamificationData.unlockedBadges.filter(b => b.category === 'streak').map((badge) => (
                    <BadgeCard key={badge.id} badge={badge} />
                  ))}
                </div>
              </div>
              
              {/* Taken Sectie */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: "#10B981", display: "flex", alignItems: "center", gap: 8 }}>
                  ✅ Taken
                  <span style={{ fontSize: 12, background: "#D1FAE5", color: "#059669", padding: "2px 8px", borderRadius: 12 }}>
                    {gamificationData.unlockedBadges.filter(b => b.category === 'task' && b.unlocked).length}/{gamificationData.unlockedBadges.filter(b => b.category === 'task').length} ontgrendeld
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
                  {gamificationData.unlockedBadges.filter(b => b.category === 'task').map((badge) => (
                    <BadgeCard key={badge.id} badge={badge} />
                  ))}
                </div>
              </div>
              
              {/* Focus Sessies Sectie */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: "#8B5CF6", display: "flex", alignItems: "center", gap: 8 }}>
                  ⚡ Focus Sessies
                  <span style={{ fontSize: 12, background: "#EDE9FE", color: "#7C3AED", padding: "2px 8px", borderRadius: 12 }}>
                    {gamificationData.unlockedBadges.filter(b => b.category === 'focus' && b.unlocked).length}/{gamificationData.unlockedBadges.filter(b => b.category === 'focus').length} ontgrendeld
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
                  {gamificationData.unlockedBadges.filter(b => b.category === 'focus').map((badge) => (
                    <BadgeCard key={badge.id} badge={badge} />
                  ))}
                </div>
              </div>
              
              {/* Specials / Fun Sectie */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: "#F59E0B", display: "flex", alignItems: "center", gap: 8 }}>
                  🎯 Specials & Fun
                  <span style={{ fontSize: 12, background: "#FEF3C7", color: "#D97706", padding: "2px 8px", borderRadius: 12 }}>
                    {gamificationData.unlockedBadges.filter(b => b.category === 'challenge' || b.category === 'fun').length}/{gamificationData.unlockedBadges.filter(b => b.category === 'challenge' || b.category === 'fun').length} ontgrendeld
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
                  {gamificationData.unlockedBadges.filter(b => b.category === 'challenge' || b.category === 'fun').map((badge) => (
                    <BadgeCard key={badge.id} badge={badge} />
                  ))}
                </div>
              </div>
            </div>
            
            {/* Motivatie Bericht */}
            <div style={{ 
              marginTop: 24, 
              padding: "16px 20px", 
              background: "linear-gradient(135deg, #FEF3C7, #FDE68A)", 
              border: "1px solid #F59E0B", 
              borderRadius: 12,
              textAlign: "center"
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#92400E", marginBottom: 4 }}>
                🎯 Volgende Doel
              </div>
              <div style={{ fontSize: 12, color: "#92400E" }}>
                {(() => {
                  const nextBadge = gamificationData.unlockedBadges.find(b => !b.unlocked);
                  return nextBadge ? nextBadge.requirement : "Je hebt alle badges ontgrendeld! 🏆";
                })()}
              </div>
            </div>
            </Collapsible>
          </section>

          {/* Statistics - Uitgebreid */}
          <section style={{ background: "white", border: "1px solid #E6E8EE", borderRadius: 12, padding: 24 }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
              📈 Statistieken
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16 }}>
              <div style={{ textAlign: "center", padding: 16, background: "#F7F8FA", borderRadius: 8 }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#4A90E2", marginBottom: 4 }}>
                  {gamificationData.totalTasksCompleted}
                </div>
                <div style={{ fontSize: 12, color: "rgba(47,52,65,0.75)" }}>
                  Totaal voltooid
                </div>
              </div>
              
              <div style={{ textAlign: "center", padding: 16, background: "#F7F8FA", borderRadius: 8 }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#10B981", marginBottom: 4 }}>
                  {gamificationData.totalXP}
                </div>
                <div style={{ fontSize: 12, color: "rgba(47,52,65,0.75)" }}>
                  Totaal verdiende XP
                </div>
              </div>
              
              <div style={{ textAlign: "center", padding: 16, background: "#F7F8FA", borderRadius: 8 }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#EF4444", marginBottom: 4 }}>
                  {gamificationData.currentStreak}
                </div>
                <div style={{ fontSize: 12, color: "rgba(47,52,65,0.75)" }}>
                  Huidige streak
                </div>
              </div>
              
              <div style={{ textAlign: "center", padding: 16, background: "#F7F8FA", borderRadius: 8 }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#8B5CF6", marginBottom: 4 }}>
                  {gamificationData.unlockedBadges.filter(b => b.unlocked).length}
                </div>
                <div style={{ fontSize: 12, color: "rgba(47,52,65,0.75)" }}>
                  Badges ontgrendeld
                </div>
              </div>
              
              <div style={{ textAlign: "center", padding: 16, background: "#F7F8FA", borderRadius: 8 }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#F59E0B", marginBottom: 4 }}>
                  {Math.round((gamificationData.totalTasksCompleted / Math.max(gamificationData.level * 10, 1)) * 100)}%
                </div>
                <div style={{ fontSize: 12, color: "rgba(47,52,65,0.75)" }}>
                  Efficiency
                </div>
              </div>
              
              <div style={{ textAlign: "center", padding: 16, background: "#F7F8FA", borderRadius: 8 }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#EC4899", marginBottom: 4 }}>
                  {(() => {
                    const rarestBadge = gamificationData.unlockedBadges
                      .filter(b => b.unlocked)
                      .sort((a, b) => b.xpReward - a.xpReward)[0];
                    return rarestBadge ? rarestBadge.xpReward : 0;
                  })()}
                </div>
                <div style={{ fontSize: 12, color: "rgba(47,52,65,0.75)" }}>
                  Zeldzaamste badge
                </div>
              </div>
            </div>
          </section>

          {/* Settings */}
          <section style={{ background: "white", border: "1px solid #E6E8EE", borderRadius: 12, padding: 24 }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
              ⚙️ Instellingen
            </div>
            <div style={{ display: "grid", gap: 16 }}>
              <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Streak tonen</div>
                  <div style={{ fontSize: 12, color: "rgba(47,52,65,0.75)" }}>
                    Toon je dagelijkse streak in taken
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={showStreak}
                  onChange={(e) => setShowStreak(e.target.checked)}
                  style={{ width: 20, height: 20, accentColor: "#4A90E2" }}
                />
              </label>
              
              <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Voortgang tonen</div>
                  <div style={{ fontSize: 12, color: "rgba(47,52,65,0.75)" }}>
                    Toon dagelijkse voortgang
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={showProgress}
                  onChange={(e) => setShowProgress(e.target.checked)}
                  style={{ width: 20, height: 20, accentColor: "#4A90E2" }}
                />
              </label>
            </div>
          </section>
        </main>
      </div>
    </AppLayout>
  );
}
