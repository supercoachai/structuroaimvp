/**
 * Herinneringen Design System – De absolute visuele bron voor de hele app.
 * Shadows over borders. Luchtigheid. Iconen in cirkels. Eén vorm-taal.
 */
export const HERINNERINGEN = {
  // Containers: witte kaarten, geen borders
  card: 'bg-white rounded-2xl shadow-sm',
  cardHover: 'hover:shadow-md transition-shadow',
  
  // Achtergrond
  pageBg: 'bg-gray-50',
  pageBgGradient: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
  
  // Spacing – luchtigheid
  sectionGap: 28,
  cardPadding: 'p-5 sm:p-6',
  cardPaddingLg: 'px-6 py-5',
  
  // Iconen: altijd in gekleurde cirkel (geen borders)
  iconCircle: 'flex items-center justify-center rounded-full',
  iconCircleSm: 'w-10 h-10',
  iconCircleMd: 'w-12 h-12',
  iconCircleLg: 'w-14 h-14',
  iconBgBlue: 'bg-blue-100',
  iconBgYellow: 'bg-yellow-100',
  iconBgGreen: 'bg-green-100',
  iconBgPurple: 'bg-purple-100',
  iconBgOrange: 'bg-orange-100',
  
  // Knoppen – Afgerond/Aan stijl (full color, rounded-xl)
  btnPrimary: 'rounded-xl font-semibold text-white shadow-sm',
  btnPrimaryBlue: 'bg-blue-600 hover:bg-blue-700',
  btnPrimaryGreen: 'bg-green-600 hover:bg-green-700',
  btnSecondary: 'rounded-xl font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200',
  
  // Inputs: shadow, geen border
  input: 'rounded-2xl bg-white shadow-sm focus:ring-2 focus:ring-gray-200 min-w-0',
  
  // Border radius – één waarde overal
  radius: 'rounded-2xl',
  radiusSm: 'rounded-xl',
} as const;
