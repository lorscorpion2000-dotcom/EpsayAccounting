function hexToRgba(hex: string, alpha: number): string {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export interface ThemeColors {
  // Brand (رنگ اصلی - دکمه‌ها و لینک‌های فعال)
  brand50: string;
  brand100: string;
  brand200: string;
  brand300: string;
  brand400: string;
  brand500: string;
  brand600: string;
  brand700: string;
  brand800: string;
  brand900: string;

  // Sidebar (نوار کناری)
  sidebarBg: string;
  sidebarDark: string;
  sidebarLight: string;
  sidebarText: string;

  // Background
  bgMain: string;
  bgCard: string;
  textMain: string;
  textMuted: string;

  // Accent (رنگ دوم)
  accent: string;
}

export interface Theme {
  key: string;
  name: string;
  nameEn: string;
  preview: {
    primary: string;
    accent: string;
    sidebar: string;
    bg: string;
  };
  colors: ThemeColors;
}

/** 
 * ۱۰ پالت رنگی انتخاب‌شده از تصاویر ارسالی
 * هر پالت شامل ۱۹ رنگ اصلی است
 */
export const THEMES: Theme[] = [
  // ========== 1. Modern SaaS (پیش‌فرض) ==========
  {
    key: 'modern-saas',
    name: 'مدرن SaaS',
    nameEn: 'Modern SaaS',
    preview: { primary: '#6C63FF', accent: '#2EC4B6', sidebar: '#121826', bg: '#F8FAFC' },
    colors: {
      brand50: '#F0EEFF',
      brand100: '#E0DDFF',
      brand200: '#C1BBFF',
      brand300: '#9F96FF',
      brand400: '#867DFF',
      brand500: '#6C63FF',
      brand600: '#5850E0',
      brand700: '#4640BF',
      brand800: '#342FA0',
      brand900: '#232080',
      sidebarBg: '#121826',
      sidebarDark: '#0A0F1C',
      sidebarLight: '#1E2536',
      sidebarText: '#9CA3AF',
      bgMain: '#F8FAFC',
      bgCard: '#FFFFFF',
      textMain: '#1E293B',
      textMuted: '#64748B',
      accent: '#2EC4B6',
    },
  },

  // ========== 2. Minimal Blue ==========
  {
    key: 'minimal-blue',
    name: 'آبی مینیمال',
    nameEn: 'Minimal Blue',
    preview: { primary: '#5AA9E6', accent: '#1F3A5F', sidebar: '#1F3A5F', bg: '#EAF4F4' },
    colors: {
      brand50: '#EFF7FC',
      brand100: '#D9EBF7',
      brand200: '#B3D7EF',
      brand300: '#8DC4E8',
      brand400: '#73B7E7',
      brand500: '#5AA9E6',
      brand600: '#3F87C9',
      brand700: '#2B6BAA',
      brand800: '#1F3A5F',
      brand900: '#152843',
      sidebarBg: '#1F3A5F',
      sidebarDark: '#152843',
      sidebarLight: '#2B4E7A',
      sidebarText: '#B8C9DC',
      bgMain: '#EAF4F4',
      bgCard: '#FFFFFF',
      textMain: '#222831',
      textMuted: '#5C6B7A',
      accent: '#5AA9E6',
    },
  },

  // ========== 3. Modern Living (Green) ==========
  {
    key: 'modern-living',
    name: 'زندگی مدرن',
    nameEn: 'Modern Living',
    preview: { primary: '#A7F432', accent: '#3B8F7B', sidebar: '#0F1F16', bg: '#EAF3E7' },
    colors: {
      brand50: '#F7FDEB',
      brand100: '#EBFACB',
      brand200: '#D7F59D',
      brand300: '#C1EE6E',
      brand400: '#B4F14C',
      brand500: '#A7F432',
      brand600: '#8ACC28',
      brand700: '#6BA520',
      brand800: '#4E7E17',
      brand900: '#0F1F16',
      sidebarBg: '#0F1F16',
      sidebarDark: '#081410',
      sidebarLight: '#1A3324',
      sidebarText: '#A8C4B0',
      bgMain: '#EAF3E7',
      bgCard: '#FFFFFF',
      textMain: '#0F1F16',
      textMuted: '#566E60',
      accent: '#3B8F7B',
    },
  },

  // ========== 4. E-commerce Coral ==========
  {
    key: 'ecommerce-coral',
    name: 'فروشگاهی مرجانی',
    nameEn: 'E-commerce Coral',
    preview: { primary: '#E76F51', accent: '#2A9D8F', sidebar: '#264653', bg: '#F4EDE4' },
    colors: {
      brand50: '#FDF2EE',
      brand100: '#FBE0D5',
      brand200: '#F6C1AB',
      brand300: '#F19F82',
      brand400: '#EC8767',
      brand500: '#E76F51',
      brand600: '#D05336',
      brand700: '#A84228',
      brand800: '#7E311E',
      brand900: '#552014',
      sidebarBg: '#264653',
      sidebarDark: '#1A3340',
      sidebarLight: '#365A69',
      sidebarText: '#C0CED6',
      bgMain: '#F4EDE4',
      bgCard: '#FFFFFF',
      textMain: '#264653',
      textMuted: '#6B7C86',
      accent: '#2A9D8F',
    },
  },

  // ========== 5. Fresh Green ==========
  {
    key: 'fresh-green',
    name: 'سبز تازه',
    nameEn: 'Fresh Green',
    preview: { primary: '#9BF272', accent: '#7ABF5A', sidebar: '#193940', bg: '#BAC8D9' },
    colors: {
      brand50: '#F4FDEE',
      brand100: '#E1FAD4',
      brand200: '#C5F4AC',
      brand300: '#AFF485',
      brand400: '#A1F578',
      brand500: '#9BF272',
      brand600: '#7ACF54',
      brand700: '#5FA840',
      brand800: '#468230',
      brand900: '#193940',
      sidebarBg: '#193940',
      sidebarDark: '#102828',
      sidebarLight: '#264E52',
      sidebarText: '#B0C4C8',
      bgMain: '#BAC8D9',
      bgCard: '#FFFFFF',
      textMain: '#193940',
      textMuted: '#5A6F78',
      accent: '#7ABF5A',
    },
  },

  // ========== 6. Fitness Cyan ==========
  {
    key: 'fitness-cyan',
    name: 'ورزشی فیروزه‌ای',
    nameEn: 'Fitness Cyan',
    preview: { primary: '#A8DCE7', accent: '#272B3B', sidebar: '#101422', bg: '#FFFFFF' },
    colors: {
      brand50: '#F0FAFC',
      brand100: '#DCF2F6',
      brand200: '#B9E6EF',
      brand300: '#A8DCE7',
      brand400: '#84C8D8',
      brand500: '#5BB0C5',
      brand600: '#3D8EA3',
      brand700: '#2D6B7E',
      brand800: '#1F4E5C',
      brand900: '#101422',
      sidebarBg: '#101422',
      sidebarDark: '#080A15',
      sidebarLight: '#1B2135',
      sidebarText: '#9CA7C4',
      bgMain: '#FFFFFF',
      bgCard: '#F9FAFB',
      textMain: '#101422',
      textMuted: '#5C6580',
      accent: '#272B3B',
    },
  },

  // ========== 7. Soft Neutrals ==========
  {
    key: 'soft-neutrals',
    name: 'خنثی نرم',
    nameEn: 'Soft Neutrals',
    preview: { primary: '#577877', accent: '#295255', sidebar: '#162623', bg: '#F0F5F7' },
    colors: {
      brand50: '#F0F4F4',
      brand100: '#DCE6E6',
      brand200: '#BACDCD',
      brand300: '#98B4B3',
      brand400: '#7A9E9D',
      brand500: '#577877',
      brand600: '#3F5C5B',
      brand700: '#2E4745',
      brand800: '#162623',
      brand900: '#0B1614',
      sidebarBg: '#162623',
      sidebarDark: '#0A1512',
      sidebarLight: '#264540',
      sidebarText: '#A8BDB8',
      bgMain: '#F0F5F7',
      bgCard: '#FFFFFF',
      textMain: '#162623',
      textMuted: '#63787A',
      accent: '#295255',
    },
  },

  // ========== 8. Bold Adventure ==========
  {
    key: 'bold-adventure',
    name: 'ماجراجویی جسور',
    nameEn: 'Bold Adventure',
    preview: { primary: '#EB5B38', accent: '#347CCB', sidebar: '#272A2D', bg: '#E6E4DC' },
    colors: {
      brand50: '#FDF2EE',
      brand100: '#FBE0D5',
      brand200: '#F6C1AB',
      brand300: '#F19F82',
      brand400: '#EC8767',
      brand500: '#EB5B38',
      brand600: '#C84325',
      brand700: '#A03319',
      brand800: '#78250F',
      brand900: '#4F1808',
      sidebarBg: '#272A2D',
      sidebarDark: '#181B1E',
      sidebarLight: '#383B3F',
      sidebarText: '#B8BBBF',
      bgMain: '#E6E4DC',
      bgCard: '#FFFFFF',
      textMain: '#272A2D',
      textMuted: '#666A6E',
      accent: '#347CCB',
    },
  },

  // ========== 9. Creative Agency ==========
  {
    key: 'creative-agency',
    name: 'خلاقانه',
    nameEn: 'Creative Agency',
    preview: { primary: '#FF6B6B', accent: '#4ECDC4', sidebar: '#1A1A2E', bg: '#F7FFF7' },
    colors: {
      brand50: '#FFEFF0',
      brand100: '#FFD9D9',
      brand200: '#FFB4B4',
      brand300: '#FF8F8F',
      brand400: '#FF7D7D',
      brand500: '#FF6B6B',
      brand600: '#E04A4A',
      brand700: '#B33333',
      brand800: '#801F1F',
      brand900: '#4F1010',
      sidebarBg: '#1A1A2E',
      sidebarDark: '#0F0F1F',
      sidebarLight: '#2A2A45',
      sidebarText: '#A8A8C4',
      bgMain: '#F7FFF7',
      bgCard: '#FFFFFF',
      textMain: '#1A1A2E',
      textMuted: '#5F5F7A',
      accent: '#4ECDC4',
    },
  },

  // ========== 10. Smart Green ==========
  {
    key: 'smart-green',
    name: 'سبز هوشمند',
    nameEn: 'Smart Green',
    preview: { primary: '#25D162', accent: '#1D1D1D', sidebar: '#1D1D1D', bg: '#FFFFFF' },
    colors: {
      brand50: '#E8FCEE',
      brand100: '#CDF8DB',
      brand200: '#9BF0B7',
      brand300: '#5EE88F',
      brand400: '#3FDF77',
      brand500: '#25D162',
      brand600: '#1EAB4F',
      brand700: '#18853E',
      brand800: '#11602D',
      brand900: '#0B3B1B',
      sidebarBg: '#1D1D1D',
      sidebarDark: '#121212',
      sidebarLight: '#2B2B2B',
      sidebarText: '#B0B0B0',
      bgMain: '#FFFFFF',
      bgCard: '#F9FAFB',
      textMain: '#1D1D1D',
      textMuted: '#6B6B6B',
      accent: '#2B2B2B',
    },
  },
];

export const DEFAULT_THEME_KEY = 'modern-saas';

export function getThemeByKey(key: string | null | undefined): Theme {
  if (!key) return THEMES[0];
  return THEMES.find((t) => t.key === key) || THEMES[0];
}

/**
 * تبدیل Theme به CSS Variables
 */
export function themeToCssVariables(theme: Theme): Record<string, string> {
  const c = theme.colors;
  return {
    '--brand-50': c.brand50,
    '--brand-100': c.brand100,
    '--brand-200': c.brand200,
    '--brand-300': c.brand300,
    '--brand-400': c.brand400,
    '--brand-500': c.brand500,
    '--brand-600': c.brand600,
    '--brand-700': c.brand700,
    '--brand-800': c.brand800,
    '--brand-900': c.brand900,
    '--sidebar-bg': c.sidebarBg,
    '--sidebar-dark': c.sidebarDark,
    '--sidebar-light': c.sidebarLight,
    '--sidebar-text': c.sidebarText,
    '--bg-main': c.bgMain,
    '--bg-card': c.bgCard,
    '--text-main': c.textMain,
    '--text-muted': c.textMuted,
    '--accent': c.accent,
    // نسخه‌های شفاف برای focus و shadow
    '--brand-500-10': hexToRgba(c.brand500, 0.1),
    '--brand-500-15': hexToRgba(c.brand500, 0.15),
    '--brand-500-20': hexToRgba(c.brand500, 0.2),
    '--brand-500-30': hexToRgba(c.brand500, 0.3),
    '--brand-500-40': hexToRgba(c.brand500, 0.4),
    '--brand-900-20': hexToRgba(c.brand900, 0.2),
    '--brand-900-30': hexToRgba(c.brand900, 0.3),
  };
}
