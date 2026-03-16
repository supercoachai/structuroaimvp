"use client";

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppLayout from '../../components/layout/AppLayout';
import { useTaskContext } from '../../context/TaskContext';
import Collapsible from '../../components/Collapsible';
import { xpForTask, progressWithinLevel, unlockedTrophies, TROPHIES, XP_PER_LEVEL, prestigeForTotalXp, levelInPrestigeForTotalXp, PRESTIGE_BADGES, getPrestigeBadge } from '../../lib/xp';
import { awardBonusXp, loadGamificationMeta, saveGamificationMeta, type GamificationMeta } from '../../lib/gamificationMeta';
import { getRandomCompletionReward } from '../../lib/completionRewards';

interface Task {
  id: string;
  title: string;
  done: boolean;
  priority: number | null;
  completedAt?: string;
  energyLevel?: 'low' | 'medium' | 'high' | string;
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

function GamificationContent() {
  const { tasks, loading } = useTaskContext();
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [celebration, setCelebration] = useState<{ gain: number; taskTitle?: string; quote: string } | null>(null);
  const [confettiElements, setConfettiElements] = useState<number[]>([]);
  const [meta, setMeta] = useState<GamificationMeta>(() => ({ bonusXp: 0, awardedTrophyIds: [], awardedPrestiges: [] }));
  const [majorPopupOpen, setMajorPopupOpen] = useState(false);

  // Kalenderdag – elke minuut geüpdatet zodat "vandaag voltooid" na 0:00 opnieuw op 0 staat
  const [todayKey, setTodayKey] = useState(() => new Date().toDateString());
  useEffect(() => {
    const interval = setInterval(() => {
      const next = new Date().toDateString();
      setTodayKey((prev) => (next !== prev ? next : prev));
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Bereken gamification data op basis van voltooide taken
  useEffect(() => {
    setMeta(loadGamificationMeta());
  }, []);

  useEffect(() => {
    if (loading) return;
    
    const calculateGamificationData = () => {
      try {
        const completedTasks = tasks.filter(task => task.done);
        
        // Alleen taken voltooid op de huidige kalenderdag (reset na middernacht)
        const todayTasks = completedTasks.filter(task => {
          if (!task.completedAt) return false;
          return new Date(task.completedAt).toDateString() === todayKey;
        });

        // Bereken streak
        const streak = calculateStreak(completedTasks);
        
        // Bereken XP op basis van taak-moeilijkheid
        const baseExp = completedTasks.reduce((sum, t) => sum + xpForTask(t), 0);
        const totalExp = baseExp + (meta?.bonusXp || 0);
        const { level, xpIntoLevel } = progressWithinLevel(totalExp);
        const experience = xpIntoLevel; // compat (progress binnen level)

        // Bereken badges
        const badges = calculateBadges(completedTasks, streak);

        setGamificationData({
          currentStreak: streak.current,
          longestStreak: streak.longest,
          totalTasksCompleted: completedTasks.length,
          todayTasksCompleted: todayTasks.length,
          todayGoal: 3,
          level,
          experience, // xp in current level
          badges,
          totalXP: totalExp,
          unlockedBadges: calculateUnlockedBadges(completedTasks, streak.current)
        });
      } catch (error) {
        console.error('Error calculating gamification data:', error);
      }
    };

    calculateGamificationData();
  }, [tasks, loading, meta?.bonusXp, todayKey]);

  // Celebration banner when coming from Focus Mode
  useEffect(() => {
    const gainParam = searchParams?.get('gain');
    if (!gainParam) return;
    const gain = parseInt(gainParam, 10);
    if (!Number.isFinite(gain) || gain <= 0) return;
    const taskTitle = searchParams?.get('task') ? decodeURIComponent(searchParams?.get('task') as string) : undefined;
    setCelebration({ gain, taskTitle, quote: getRandomCompletionReward(Date.now()) });
    // Confetti burst
    setConfettiElements(Array.from({ length: 24 }, (_, i) => Date.now() + i));
    setTimeout(() => setConfettiElements([]), 1200);
    // BELANGRIJK: Niet automatisch sluiten; gebruiker sluit zelf.
  }, [searchParams]);

  // Award trophy + prestige bonus XP (one-time) when arriving with a gain
  useEffect(() => {
    if (!celebration) return;
    if (loading) return;

    const completedTasks = tasks.filter((t: any) => t?.done);
    const baseExpNow = completedTasks.reduce((sum: number, t: any) => sum + xpForTask(t), 0);
    const bonusXpNow = meta?.bonusXp || 0;

    // Assume `celebration.gain` was the task XP gained from Focus.
    const baseExpPrev = Math.max(0, baseExpNow - celebration.gain);
    const prevTotal = baseExpPrev + bonusXpNow;
    const totalBeforeAwards = baseExpNow + bonusXpNow;

    let nextMeta = meta;
    let changed = false;

    // Award trophies that were crossed
    const newly = unlockedTrophies(totalBeforeAwards).filter(t => t.requiredTotalXp > prevTotal);
    for (const t of newly) {
      if (nextMeta.awardedTrophyIds.includes(t.id)) continue;
      nextMeta = {
        ...awardBonusXp(nextMeta, t.xpReward),
        awardedTrophyIds: [...nextMeta.awardedTrophyIds, t.id],
      };
      changed = true;
    }

    // Award prestige badge(s) if prestige increased
    const prevPrestige = prestigeForTotalXp(prevTotal);
    const nowPrestige = prestigeForTotalXp(totalBeforeAwards);
    if (nowPrestige > prevPrestige) {
      for (let p = prevPrestige + 1; p <= nowPrestige; p++) {
        if (nextMeta.awardedPrestiges.includes(p)) continue;
        const badge = getPrestigeBadge(p);
        if (badge) {
          nextMeta = {
            ...awardBonusXp(nextMeta, badge.xpReward),
            awardedPrestiges: [...nextMeta.awardedPrestiges, p],
          };
          changed = true;
        }
      }
    }

    if (changed) {
      setMeta(nextMeta);
      saveGamificationMeta(nextMeta);
    }
  }, [celebration, loading, tasks, meta]);

  const levelProgressPct = useMemo(() => {
    return Math.min(100, Math.max(0, (gamificationData.experience / XP_PER_LEVEL) * 100));
  }, [gamificationData.experience]);

  const nextLevelXp = useMemo(() => {
    return Math.max(0, XP_PER_LEVEL - gamificationData.experience);
  }, [gamificationData.experience]);

  const trophies = useMemo(() => {
    return unlockedTrophies(gamificationData.totalXP);
  }, [gamificationData.totalXP]);

  const newlyUnlockedTrophies = useMemo(() => {
    if (!celebration) return [];
    const prevTotal = Math.max(0, gamificationData.totalXP - celebration.gain);
    return unlockedTrophies(gamificationData.totalXP).filter(t => t.requiredTotalXp > prevTotal);
  }, [celebration, gamificationData.totalXP]);

  const levelUp = useMemo(() => {
    if (!celebration) return false;
    const prevTotal = Math.max(0, gamificationData.totalXP - celebration.gain);
    const prev = Math.floor(prevTotal / XP_PER_LEVEL) + 1;
    return gamificationData.level > prev;
  }, [celebration, gamificationData.level, gamificationData.totalXP]);

  const prestige = useMemo(() => prestigeForTotalXp(gamificationData.totalXP), [gamificationData.totalXP]);
  const levelInPrestige = useMemo(() => levelInPrestigeForTotalXp(gamificationData.totalXP), [gamificationData.totalXP]);
  const prestigeBadge = useMemo(() => getPrestigeBadge(prestige), [prestige]);

  // Open a big popup only when a trophy unlocks or a level-up happens.
  useEffect(() => {
    if (!celebration) return;
    if (newlyUnlockedTrophies.length > 0 || levelUp) {
      setMajorPopupOpen(true);
    }
  }, [celebration, newlyUnlockedTrophies.length, levelUp]);

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

  const getTodayProgressPercentage = () => {
    return Math.min((gamificationData.todayTasksCompleted / gamificationData.todayGoal) * 100, 100);
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
    const [showTooltip, setShowTooltip] = useState(false);
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
        className="prizeHover"
        onMouseEnter={(e) => {
          setShowTooltip(true);
          if (badge.unlocked) {
            e.currentTarget.style.transform = "scale(1.05)";
            e.currentTarget.style.boxShadow = `0 8px 25px ${rarityStyle.glowColor}`;
          }
        }}
        onMouseLeave={(e) => {
          setShowTooltip(false);
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
              bottom: "calc(100% + 8px)",
              left: "50%",
              transform: "translateX(-50%)",
              background: "#111827",
              color: "white",
              padding: "8px 12px",
              borderRadius: 10,
              fontSize: 11,
              maxWidth: 220,
              textAlign: "center",
              opacity: showTooltip ? 1 : 0,
              pointerEvents: "none",
              transition: "opacity 160ms ease",
              zIndex: 50,
              boxShadow: "0 10px 24px rgba(0,0,0,0.22)",
            }}
          >
            {badge.requirement}
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: "50%",
                transform: "translateX(-50%)",
                border: "6px solid transparent",
                borderTopColor: "#111827",
              }}
            />
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
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(140px) rotate(360deg); opacity: 0; }
        }
        .confetti {
          animation: confetti-fall 1.2s ease-out forwards;
        }
        .prizeHover {
          transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease, border-color 160ms ease;
        }
        .prizeHover:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 34px rgba(15, 23, 42, 0.12);
        }
      `}</style>
      <div
        className="min-h-screen py-12 px-4 sm:px-6 pb-16"
        style={{
          background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
          color: "#2F3441",
        }}
      >
        <main
          style={{
            width: "100%",
            maxWidth: 720,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: 32,
          }}
        >
          {/* Confetti */}
          {confettiElements.map((id, idx) => (
            <div
              key={id}
              className="confetti"
              style={{
                position: 'fixed',
                top: 20,
                left: `${(idx * 37) % 100}%`,
                width: 10,
                height: 10,
                background: ['#10B981', '#4A90E2', '#F59E0B', '#EF4444', '#9333EA'][idx % 5],
                borderRadius: '50%',
                pointerEvents: 'none',
                zIndex: 9999,
              }}
            />
          ))}

          {/* Big popup: only on trophy unlock or level-up */}
          {celebration && majorPopupOpen && (newlyUnlockedTrophies.length > 0 || levelUp) && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(15, 23, 42, 0.55)',
                backdropFilter: 'blur(6px)',
                zIndex: 10000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 16,
              }}
              onClick={() => setMajorPopupOpen(false)}
            >
              <div
                style={{
                  width: '100%',
                  maxWidth: 560,
                  background: 'white',
                  borderRadius: 16,
                  border: '1px solid #E6E8EE',
                  boxShadow: '0 24px 60px rgba(0,0,0,0.22)',
                  overflow: 'hidden',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  style={{
                    padding: 18,
                    background: 'linear-gradient(135deg, rgba(16,185,129,0.10), rgba(74,144,226,0.10))',
                    borderBottom: '1px solid rgba(74, 144, 226, 0.18)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 900, color: '#10B981' }}>
                        {levelUp ? 'Level omhoog!' : 'Nieuwe trofee vrijgespeeld!'}
                      </div>
                      <div style={{ marginTop: 4, fontSize: 18, fontWeight: 900, color: '#2F3441' }}>
                        {levelUp
                          ? `${prestigeBadge?.icon || '🎖️'} ${prestigeBadge?.name || `Prestige ${prestige}`} · Level ${levelInPrestige}`
                          : newlyUnlockedTrophies.length > 0
                            ? newlyUnlockedTrophies.length === 1
                              ? `${newlyUnlockedTrophies[0].icon} ${newlyUnlockedTrophies[0].name}`
                              : `🏆 ${newlyUnlockedTrophies.length} trofeeën`
                            : ''}
                      </div>
                    </div>
                    <button
                      onClick={() => setMajorPopupOpen(false)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 12,
                        border: '1px solid #E6E8EE',
                        background: 'white',
                        color: 'rgba(47,52,65,0.75)',
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      Sluiten
                    </button>
                  </div>

                  {newlyUnlockedTrophies.length > 0 && (
                    <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                      {newlyUnlockedTrophies.slice(0, 2).map((t) => (
                        <div
                          key={t.id}
                          style={{
                            display: 'flex',
                            gap: 12,
                            alignItems: 'center',
                            padding: '12px 14px',
                            background: 'rgba(74, 144, 226, 0.08)',
                            border: '1px solid rgba(74, 144, 226, 0.22)',
                            borderRadius: 12,
                          }}
                        >
                          <div
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 999,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: 'rgba(74, 144, 226, 0.16)',
                              border: '1px solid rgba(74, 144, 226, 0.25)',
                              flexShrink: 0,
                              fontSize: 22,
                            }}
                          >
                            {t.icon}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 900, color: '#2F3441' }}>{t.name}</div>
                            <div style={{ marginTop: 2, fontSize: 12, color: 'rgba(47,52,65,0.75)' }}>{t.description}</div>
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 900, color: '#10B981' }}>+{t.xpReward} XP</div>
                        </div>
                      ))}
                      {newlyUnlockedTrophies.length > 2 && (
                        <div style={{ fontSize: 12, color: 'rgba(47,52,65,0.75)', fontWeight: 700 }}>
                          +{newlyUnlockedTrophies.length - 2} meer…
                        </div>
                      )}
                    </div>
                  )}

                  <div
                    style={{
                      marginTop: 12,
                      fontSize: 13,
                      color: 'rgba(47,52,65,0.85)',
                      lineHeight: 1.6,
                      fontStyle: 'italic',
                      display: 'flex',
                      gap: 10,
                      alignItems: 'center',
                      padding: '12px 14px',
                      background: 'rgba(74, 144, 226, 0.08)',
                      border: '1px solid rgba(74, 144, 226, 0.22)',
                      borderRadius: 12,
                    }}
                  >
                    <span
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(74, 144, 226, 0.16)',
                        border: '1px solid rgba(74, 144, 226, 0.25)',
                        flexShrink: 0,
                        fontSize: 16,
                        lineHeight: 1,
                      }}
                    >
                      💡
                    </span>
                    <span style={{ flex: 1 }}>{celebration.quote}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Celebration banner */}
          {celebration && (
            <section style={{
              background: 'linear-gradient(135deg, rgba(16,185,129,0.10), rgba(74,144,226,0.10))',
              border: '1px solid #E6E8EE',
              borderRadius: 12,
              padding: 16,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#10B981' }}>
                +{celebration.gain} XP verdiend{celebration.taskTitle ? ` voor “${celebration.taskTitle}”` : ''}!
                {levelUp ? '  (Level up!)' : ''}
              </div>
                <button
                  onClick={() => {
                    setCelebration(null);
                    router.replace('/gamification');
                  }}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 10,
                    border: '1px solid #E6E8EE',
                    background: 'white',
                    color: 'rgba(47,52,65,0.75)',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Sluiten
                </button>
              </div>
              <div style={{
                marginTop: 10,
                fontSize: 13,
                color: 'rgba(47,52,65,0.85)',
                lineHeight: 1.6,
                fontStyle: 'italic',
                display: 'flex',
                gap: 10,
                alignItems: 'center',
                padding: '12px 14px',
                background: 'rgba(74, 144, 226, 0.08)',
                border: '1px solid rgba(74, 144, 226, 0.22)',
                borderRadius: 12
              }}>
                <span style={{
                  width: 28,
                  height: 28,
                  borderRadius: 999,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(74, 144, 226, 0.16)',
                  border: '1px solid rgba(74, 144, 226, 0.25)',
                  flexShrink: 0,
                  fontSize: 16,
                  lineHeight: 1
                }}>💡</span>
                <span style={{ flex: 1 }}>{celebration.quote}</span>
              </div>
              {newlyUnlockedTrophies.length > 0 && (
                <div style={{
                  marginTop: 10,
                  display: 'flex',
                  gap: 10,
                  alignItems: 'center',
                  padding: '12px 14px',
                  background: 'rgba(74, 144, 226, 0.08)',
                  border: '1px solid rgba(74, 144, 226, 0.22)',
                  borderRadius: 12,
                }}>
                  <span style={{
                    width: 28,
                    height: 28,
                    borderRadius: 999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(74, 144, 226, 0.16)',
                    border: '1px solid rgba(74, 144, 226, 0.25)',
                    flexShrink: 0,
                    fontSize: 16,
                    lineHeight: 1
                  }}>🏆</span>
                  <div style={{ fontSize: 13, color: 'rgba(47,52,65,0.85)', fontStyle: 'italic' }}>
                    Nieuwe trofee{newlyUnlockedTrophies.length > 1 ? 'ën' : ''}:{' '}
                    {newlyUnlockedTrophies.map(t => `${t.icon} ${t.name}`).join(' • ')}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Header – zweeft los, luchtigheid zoals Taken/Herinneringen */}
          <header className="text-center pt-12 pb-0 mb-4">
            <div
              className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-4"
              style={{
                background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
                boxShadow: "0 4px 14px rgba(245, 158, 11, 0.35)",
              }}
            >
              <span style={{ fontSize: 28 }}>🏆</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Prestaties</h1>
            <p className="text-sm text-gray-500 mt-2">
              Motiveer jezelf met beloningen en voortgang
            </p>
          </header>

          {/* Level & Experience */}
          <section className="bg-white rounded-3xl shadow-sm p-6 sm:p-8">
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>🎖️</div>
              <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
                {prestigeBadge?.icon || '🎖️'} {prestigeBadge?.name || `Prestige ${prestige}`} · Level {levelInPrestige}
              </div>
              <div style={{ fontSize: 14, color: "rgba(47,52,65,0.75)" }}>
                {gamificationData.experience} / {XP_PER_LEVEL} XP
              </div>
            </div>
            
            {/* Experience Bar */}
            <div style={{ background: "#E6E8EE", borderRadius: 8, height: 12, marginBottom: 8 }}>
              <div 
                style={{ 
                  background: "#4A90E2", 
                  borderRadius: 8, 
                  height: "100%", 
                  width: `${levelProgressPct}%`,
                  transition: "width 0.3s ease"
                }}
              />
            </div>
            
            <div style={{ textAlign: "center", fontSize: 12, color: "rgba(47,52,65,0.75)" }}>
              {nextLevelXp} XP tot level {gamificationData.level + 1}
            </div>
            
            {/* Total XP Display */}
            <div style={{ textAlign: "center", fontSize: 14, fontWeight: 600, color: "#10B981", marginTop: 8 }}>
              🎯 Totaal: {gamificationData.totalXP.toString()} XP
            </div>
          </section>

          {/* Trofeeën */}
          <section className="bg-white rounded-3xl shadow-sm p-6 sm:p-8">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
              <div style={{ fontSize: 16, fontWeight: 800 }}>Trofeeën</div>
              <div style={{ fontSize: 12, color: 'rgba(47,52,65,0.7)' }}>
                {trophies.length} / {TROPHIES.length} vrijgespeeld
              </div>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {TROPHIES.map((t) => {
                const unlocked = gamificationData.totalXP >= t.requiredTotalXp;
                return (
                  <div
                    key={t.id}
                    className="prizeHover"
                    style={{
                      display: 'flex',
                      gap: 12,
                      alignItems: 'center',
                      padding: 12,
                      borderRadius: 12,
                      border: `1px solid ${unlocked ? 'rgba(16,185,129,0.35)' : '#E6E8EE'}`,
                      background: unlocked ? 'rgba(16,185,129,0.06)' : '#FFFFFF',
                      opacity: unlocked ? 1 : 0.55,
                    }}
                    title={unlocked ? 'Ontgrendeld' : `Nog ${Math.max(0, t.requiredTotalXp - gamificationData.totalXP)} XP`}
                  >
                    <div style={{ fontSize: 22, width: 28, textAlign: 'center' }}>{t.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 800 }}>{t.name}</div>
                      <div style={{ fontSize: 12, color: 'rgba(47,52,65,0.75)', marginTop: 2 }}>
                        {t.description} · {t.requiredTotalXp} XP
                      </div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 900, color: '#10B981' }}>
                      +{t.xpReward} XP
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Streak & Progress */}
          <section className="bg-white rounded-3xl shadow-sm p-6 sm:p-8">
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
          <section className="bg-white rounded-3xl shadow-sm p-6 sm:p-8">
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
          <section className="bg-white rounded-3xl shadow-sm p-6 sm:p-8">
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                📊 Vandaag's Voortgang
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 14, color: "rgba(47,52,65,0.75)" }}>
                  {gamificationData.todayTasksCompleted} / {gamificationData.todayGoal} taken voltooid
                </span>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#4A90E2" }}>
                  {Math.round(getTodayProgressPercentage())}%
                </span>
              </div>
              
              {/* Progress Bar */}
              <div style={{ background: "#E6E8EE", borderRadius: 8, height: 8 }}>
                <div 
                  style={{ 
                    background: "#4A90E2", 
                    borderRadius: 8, 
                    height: "100%", 
                    width: `${getTodayProgressPercentage()}%`,
                    transition: "width 0.3s ease"
                  }}
                />
              </div>
            </div>
          </section>

          {/* Badges */}
          {gamificationData.badges.length > 0 && (
            <section className="bg-white rounded-3xl shadow-sm p-6 sm:p-8">
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
          <section className="bg-white rounded-3xl shadow-sm p-6 sm:p-8">
            <Collapsible title="🏆 Structuro Prijzenkast" defaultOpen={false}>
            {/* Header - Cleaner versie */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, textAlign: "center", color: "#4A90E2" }}>
                🏆 Prijzenkast
              </div>
              <div style={{ fontSize: 14, color: "rgba(47,52,65,0.75)", marginBottom: 20, textAlign: "center" }}>
                Trofee boosters, prestige badges en 50+ achievements – alles op één plek
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
                    {gamificationData.experience}/{XP_PER_LEVEL} XP
                  </div>
                </div>
                <div style={{ width: "100%", height: 8, background: "#E0F2FE", borderRadius: 4, overflow: "hidden" }}>
                  <div 
                    style={{ 
                      height: "100%", 
                      background: "linear-gradient(90deg, #0EA5E9, #38BDF8)", 
                      borderRadius: 4,
                      width: `${levelProgressPct}%`,
                      transition: "width 0.5s ease",
                      boxShadow: "0 0 8px rgba(14, 165, 233, 0.3)"
                    }}
                  />
                </div>
                <div style={{ textAlign: "center", marginTop: 8, fontSize: 12, color: "#0369A1" }}>
                  Nog {nextLevelXp} XP tot Level {gamificationData.level + 1} 🔥
                </div>
              </div>
            </div>

            {/* 1) Trofee Boosters */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: "#10B981", display: "flex", alignItems: "center", gap: 8 }}>
                🏆 Trofee Boosters
                <span style={{ fontSize: 12, background: "rgba(16,185,129,0.12)", color: "#059669", padding: "2px 8px", borderRadius: 999 }}>
                  {unlockedTrophies(gamificationData.totalXP).length}/{TROPHIES.length} vrij
                </span>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {TROPHIES
                  .slice()
                  .sort((a, b) => a.requiredTotalXp - b.requiredTotalXp)
                  .map((t) => {
                    const unlocked = gamificationData.totalXP >= t.requiredTotalXp;
                    const remaining = Math.max(0, t.requiredTotalXp - gamificationData.totalXP);
                    return (
                      <div
                        key={t.id}
                        className="prizeHover"
                        style={{
                          display: "flex",
                          gap: 12,
                          alignItems: "center",
                          padding: "12px 14px",
                          borderRadius: 14,
                          border: `1px solid ${unlocked ? "rgba(16,185,129,0.35)" : "rgba(74,144,226,0.22)"}`,
                          background: unlocked ? "rgba(16,185,129,0.06)" : "rgba(74, 144, 226, 0.06)",
                          opacity: unlocked ? 1 : 0.78,
                        }}
                        title={unlocked ? "Ontgrendeld" : `Nog ${remaining} XP`}
                      >
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 999,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: unlocked ? "rgba(16,185,129,0.12)" : "rgba(74,144,226,0.12)",
                            border: `1px solid ${unlocked ? "rgba(16,185,129,0.25)" : "rgba(74,144,226,0.25)"}`,
                            flexShrink: 0,
                            fontSize: 22,
                          }}
                        >
                          {t.icon}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 900, color: "#2F3441" }}>{t.name}</div>
                          <div style={{ marginTop: 2, fontSize: 12, color: "rgba(47,52,65,0.75)" }}>
                            {t.description}
                          </div>
                          <div style={{ marginTop: 4, fontSize: 11, color: "rgba(47,52,65,0.7)" }}>
                            Voorwaarde: {t.requiredTotalXp} XP {unlocked ? "· Ontgrendeld" : `· Nog ${remaining} XP`}
                          </div>
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 900, color: "#10B981" }}>+{t.xpReward} XP</div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* 2) Prestige Badges (1..15) */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: "#4A90E2", display: "flex", alignItems: "center", gap: 8 }}>
                🎖️ Prestige Badges
                <span style={{ fontSize: 12, background: "rgba(74,144,226,0.12)", color: "#2563EB", padding: "2px 8px", borderRadius: 999 }}>
                  {prestige}/{PRESTIGE_BADGES.length} bereikt
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                {PRESTIGE_BADGES.map((b) => {
                  const unlocked = prestige >= b.prestige;
                  return (
                    <div
                      key={b.prestige}
                      className="prizeHover"
                      style={{
                        padding: 14,
                        borderRadius: 14,
                        border: `1px solid ${unlocked ? "rgba(16,185,129,0.35)" : "rgba(74,144,226,0.22)"}`,
                        background: unlocked ? "rgba(16,185,129,0.06)" : "rgba(74,144,226,0.06)",
                        opacity: unlocked ? 1 : 0.7,
                        display: "flex",
                        gap: 12,
                        alignItems: "center",
                      }}
                      title={unlocked ? "Prestige bereikt" : `Nog ${b.prestige - prestige} prestige(s)`}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 14,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: unlocked ? "rgba(16,185,129,0.12)" : "rgba(74,144,226,0.12)",
                          border: `1px solid ${unlocked ? "rgba(16,185,129,0.25)" : "rgba(74,144,226,0.25)"}`,
                          flexShrink: 0,
                          fontSize: 22,
                        }}
                      >
                        {unlocked ? b.icon : "🔒"}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 900, color: "#2F3441" }}>
                          {b.name}
                        </div>
                        <div style={{ marginTop: 2, fontSize: 12, color: "rgba(47,52,65,0.75)" }}>
                          Voorwaarde: Prestige {b.prestige}
                        </div>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 900, color: "#10B981" }}>+{b.xpReward} XP</div>
                    </div>
                  );
                })}
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
                  {gamificationData.unlockedBadges
                    .filter(b => b.category === 'streak')
                    .slice()
                    .sort((a, b) => Number(b.unlocked) - Number(a.unlocked))
                    .map((badge) => (
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
                  {gamificationData.unlockedBadges
                    .filter(b => b.category === 'task')
                    .slice()
                    .sort((a, b) => Number(b.unlocked) - Number(a.unlocked))
                    .map((badge) => (
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
                  {gamificationData.unlockedBadges
                    .filter(b => b.category === 'focus')
                    .slice()
                    .sort((a, b) => Number(b.unlocked) - Number(a.unlocked))
                    .map((badge) => (
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
                  {gamificationData.unlockedBadges
                    .filter(b => b.category === 'challenge' || b.category === 'fun')
                    .slice()
                    .sort((a, b) => Number(b.unlocked) - Number(a.unlocked))
                    .map((badge) => (
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
          <section className="bg-white rounded-3xl shadow-sm p-6 sm:p-8">
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
          <section className="bg-white rounded-3xl shadow-sm p-6 sm:p-8">
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

export default function GamificationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-gray-900">
        <span className="text-slate-500">Laden...</span>
      </div>
    }>
      <GamificationContent />
    </Suspense>
  );
}
