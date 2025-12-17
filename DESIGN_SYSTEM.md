# Design Systeem - StructuroAI

## Overzicht

Dit document beschrijft het centrale design-systeem voor een consistent, ADHD-proof UI.

## Locatie

Het design-systeem staat in: `src/lib/design-system.ts`

## Container Standaard

**Gebruik altijd:**
```typescript
import { designSystem } from '../lib/design-system';

<div style={designSystem.container}>
  {/* Content */}
</div>
```

**Eigenschappen:**
- `maxWidth: 1100px`
- `margin: 0 auto` (centrering)
- `padding: 24px`

## Spacing Systeem

**Gebruik deze constanten:**
```typescript
designSystem.spacing.xs   // 8px
designSystem.spacing.sm   // 12px
designSystem.spacing.md   // 16px
designSystem.spacing.lg   // 24px
designSystem.spacing.xl   // 32px
```

**Regels:**
- 24px tussen secties
- 16px tussen onderdelen binnen een sectie
- 12px voor kleine gaps
- 8px voor minimale spacing

## Grid Systemen

### Stats Grid (4 kolommen)
```typescript
<section style={designSystem.grid.stats}>
  {/* 4 gelijke kolommen, gap: 16px */}
</section>
```

### Quick Actions Grid (3 kolommen)
```typescript
<div style={designSystem.grid.quickActions}>
  {/* 3 gelijke kolommen, gap: 12px */}
</div>
```

**Responsive:**
- Stats: 4 → 2 kolommen op mobiel (< 768px)
- Actions: 3 → 2 kolommen op mobiel (< 768px)

## Section Styling

**Gebruik altijd:**
```typescript
<section style={designSystem.section}>
  {/* Content */}
</section>
```

**Eigenschappen:**
- `background: #FFFFFF`
- `padding: 24px`
- `borderRadius: 12px`
- `border: 1px solid #E6E8EE`
- `marginTop: 24px`

## Typography

**Gebruik deze constanten:**
```typescript
// Hoofdtitels
<div style={designSystem.typography.h1}>Titel</div>  // 22px, 700

// Sectie headers
<div style={designSystem.typography.h3}>Sectie</div>  // 16px, 600

// Body tekst
<div style={designSystem.typography.body}>Tekst</div>  // 14px, 400

// Kleine tekst
<div style={designSystem.typography.bodySmall}>Klein</div>  // 12px, 400

// Stat waarden
<div style={designSystem.typography.statValue}>28</div>  // 28px, 700

// Stat labels
<div style={designSystem.typography.statLabel}>Label</div>  // 11px
```

## Kleuren

**Gebruik altijd:**
```typescript
designSystem.colors.primary      // #4A90E2
designSystem.colors.success       // #10B981
designSystem.colors.warning       // #F59E0B
designSystem.colors.danger        // #EF4444
designSystem.colors.text          // #2F3441
designSystem.colors.textSecondary // rgba(47,52,65,0.75)
designSystem.colors.border        // #E6E8EE
designSystem.colors.background    // #F7F8FA
designSystem.colors.white         // #FFFFFF
```

## Stat Cards

**Voor statistiek blokken:**
```typescript
<div style={designSystem.statCard}>
  <div style={{ ...designSystem.typography.statValue, color: designSystem.colors.primary }}>
    {value}
  </div>
  <div style={designSystem.typography.statLabel}>
    Label
  </div>
</div>
```

## Icon Sizes

```typescript
designSystem.icon.small   // 20px
designSystem.icon.medium  // 24px
designSystem.icon.large    // 28px
```

## Best Practices

### ✅ DO

1. **Gebruik altijd `designSystem.container`** voor de hoofdwrapper
2. **Gebruik `designSystem.section`** voor alle secties
3. **Gebruik spacing constanten** in plaats van hardcoded waarden
4. **Gebruik typography constanten** voor consistente tekst
5. **Gebruik kleur constanten** uit designSystem.colors

### ❌ DON'T

1. **Geen hardcoded padding/margin** - gebruik spacing constanten
2. **Geen hardcoded font sizes** - gebruik typography constanten
3. **Geen hardcoded kleuren** - gebruik color constanten
4. **Geen inline container widths** - gebruik designSystem.container
5. **Geen verschillende border-radius** - gebruik 12px (of 8px voor kleine elementen)

## Componenten die het systeem gebruiken

- ✅ `HomeCalm.tsx` - Dashboard
- ✅ `TasksOverview.tsx` - Taken & Prioriteiten
- ⏳ Andere componenten kunnen worden gemigreerd

## Migratie Checklist

Voor nieuwe componenten of bij het updaten van bestaande:

- [ ] Container gebruikt `designSystem.container`
- [ ] Secties gebruiken `designSystem.section`
- [ ] Spacing gebruikt constanten (xs, sm, md, lg, xl)
- [ ] Typography gebruikt constanten (h1, h2, h3, body, bodySmall)
- [ ] Kleuren gebruiken `designSystem.colors.*`
- [ ] Grids gebruiken `designSystem.grid.*`
- [ ] Icons gebruiken `designSystem.icon.*`

