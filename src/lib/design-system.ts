/**
 * Centraal Design Systeem voor StructuroAI
 * 
 * Dit bestand bevat alle standaard styling voor een consistent, ADHD-proof design.
 * Gebruik deze constanten in plaats van inline styles waar mogelijk.
 */

export const designSystem = {
  // Container
  container: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '24px',
  },

  // Spacing systeem
  spacing: {
    xs: '8px',
    sm: '12px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },

  // Grid systemen
  // Note: Responsive styling wordt via CSS classes in globals.css afgehandeld
  grid: {
    stats: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '16px',
    },
    quickActions: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '12px',
    },
  },

  // Standaard section styling – shadows over borders (Herinneringen)
  section: {
    background: '#FFFFFF',
    padding: '24px',
    borderRadius: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    marginTop: '24px',
  },

  // Standaard card styling
  card: {
    background: '#FFFFFF',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    borderRadius: '20px',
    padding: '24px',
  },

  // Stat card styling (voor de 4 statistiek blokken)
  statCard: {
    background: '#FFFFFF',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    borderRadius: '20px',
    padding: '20px 16px',
    textAlign: 'center' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Typography
  typography: {
    h1: {
      fontSize: '22px',
      fontWeight: 700,
      color: '#2F3441',
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '18px',
      fontWeight: 600,
      color: '#2F3441',
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '16px',
      fontWeight: 600,
      color: '#2F3441',
      lineHeight: 1.3,
    },
    body: {
      fontSize: '14px',
      fontWeight: 400,
      color: '#2F3441',
      lineHeight: 1.5,
    },
    bodySmall: {
      fontSize: '12px',
      fontWeight: 400,
      color: 'rgba(47,52,65,0.75)',
      lineHeight: 1.4,
    },
    statValue: {
      fontSize: '28px',
      fontWeight: 700,
      lineHeight: 1,
    },
    statLabel: {
      fontSize: '11px',
      color: 'rgba(47,52,65,0.75)',
      lineHeight: 1.3,
      marginTop: '6px',
    },
  },

  // Kleuren
  colors: {
    primary: '#4A90E2',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    text: '#2F3441',
    textSecondary: 'rgba(47,52,65,0.75)',
    textMuted: 'rgba(47,52,65,0.6)',
    border: '#E6E8EE',
    background: '#F7F8FA',
    white: '#FFFFFF',
  },

  // Quick action button styling – Herinneringen: shadow, geen border
  quickActionButton: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px 16px',
    borderRadius: '20px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'center' as const,
  },

  // Icon sizes
  icon: {
    small: '20px',
    medium: '24px',
    large: '28px',
  },
};

/**
 * Helper functies voor consistente styling
 */
export const createStatCardStyle = (color: string) => ({
  ...designSystem.statCard,
});

export const createQuickActionStyle = (bgColor: string, borderColor: string, textColor: string, hoverBg: string, hoverBorder: string) => ({
  ...designSystem.quickActionButton,
  background: bgColor,
  borderColor: borderColor,
  color: textColor,
  ':hover': {
    background: hoverBg,
    borderColor: hoverBorder,
  },
});

