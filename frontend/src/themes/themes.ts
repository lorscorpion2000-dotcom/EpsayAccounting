function hexToRgba(hex: string, alpha: number): string {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export interface ThemeColors {
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

  sidebarBg: string;
  sidebarDark: string;
  sidebarLight: string;
  sidebarText: string;

  bgMain: string;
  bgCard: string;
  textMain: string;
  textMuted: string;

  accent: string;
}

export interface Theme {
  key: string;
  name: string;
  nameEn: string;
  category?: string;
  preview: {
    primary: string;
    accent: string;
    sidebar: string;
    bg: string;
  };
  colors: ThemeColors;
}

export const THEMES: Theme[] = [
  // ==================== ۱. پوسته‌های اصلی و اولیه ====================
  {
    key: 'modern-saas',
    name: 'مدرن SaaS',
    nameEn: 'Modern SaaS',
    preview: { primary: '#6C63FF', accent: '#2EC4B6', sidebar: '#121826', bg: '#F8FAFC' },
    colors: {
      brand50: '#F0EEFF', brand100: '#E0DDFF', brand200: '#C1BBFF', brand300: '#9F96FF', brand400: '#867DFF',
      brand500: '#6C63FF', brand600: '#5850E0', brand700: '#4640BF', brand800: '#342FA0', brand900: '#232080',
      sidebarBg: '#121826', sidebarDark: '#0A0F1C', sidebarLight: '#1E2536', sidebarText: '#9CA3AF',
      bgMain: '#F8FAFC', bgCard: '#FFFFFF', textMain: '#1E293B', textMuted: '#64748B', accent: '#2EC4B6',
    },
  },
  {
    key: 'minimal-blue',
    name: 'آبی مینیمال',
    nameEn: 'Minimal Blue',
    preview: { primary: '#5AA9E6', accent: '#1F3A5F', sidebar: '#1F3A5F', bg: '#EAF4F4' },
    colors: {
      brand50: '#EFF7FC', brand100: '#D9EBF7', brand200: '#B3D7EF', brand300: '#8DC4E8', brand400: '#73B7E7',
      brand500: '#5AA9E6', brand600: '#3F87C9', brand700: '#2B6BAA', brand800: '#1F3A5F', brand900: '#152843',
      sidebarBg: '#1F3A5F', sidebarDark: '#152843', sidebarLight: '#2B4E7A', sidebarText: '#B8C9DC',
      bgMain: '#EAF4F4', bgCard: '#FFFFFF', textMain: '#222831', textMuted: '#5C6B7A', accent: '#5AA9E6',
    },
  },
  {
    key: 'modern-living',
    name: 'زندگی مدرن',
    nameEn: 'Modern Living',
    preview: { primary: '#8ACC28', accent: '#3B8F7B', sidebar: '#0F1F16', bg: '#EAF3E7' },
    colors: {
      brand50: '#F7FDEB', brand100: '#EBFACB', brand200: '#D7F59D', brand300: '#C1EE6E', brand400: '#B4F14C',
      brand500: '#A7F432', brand600: '#8ACC28', brand700: '#6BA520', brand800: '#4E7E17', brand900: '#0F1F16',
      sidebarBg: '#0F1F16', sidebarDark: '#081410', sidebarLight: '#1A3324', sidebarText: '#A8C4B0',
      bgMain: '#EAF3E7', bgCard: '#FFFFFF', textMain: '#0F1F16', textMuted: '#566E60', accent: '#3B8F7B',
    },
  },

  // ==================== ۲. پوسته‌های جدید Dopely Colors ====================
  {
    key: 'dusk-purple',
    name: 'بنفش شبانگاهی',
    nameEn: 'Dusk Purple',
    preview: { primary: '#7C3AED', accent: '#C4B5FD', sidebar: '#120A2A', bg: '#F5F3FF' },
    colors: {
      brand50: '#F5F3FF', brand100: '#EDE9FE', brand200: '#DDD6FE', brand300: '#C4B5FD', brand400: '#A78BFA',
      brand500: '#8B5CF6', brand600: '#7C3AED', brand700: '#6D28D9', brand800: '#5B21B6', brand900: '#120A2A',
      sidebarBg: '#120A2A', sidebarDark: '#0A051A', sidebarLight: '#231647', sidebarText: '#C4B5FD',
      bgMain: '#F5F3FF', bgCard: '#FFFFFF', textMain: '#1F1235', textMuted: '#6B5B95', accent: '#A78BFA',
    },
  },
  {
    key: 'smoke-navy-lime',
    name: 'سورمه‌ای و لیموئی',
    nameEn: 'Smoke Navy & Lime',
    preview: { primary: '#84CC16', accent: '#D9F99D', sidebar: '#111827', bg: '#F7FEE7' },
    colors: {
      brand50: '#F7FEE7', brand100: '#ECFCCB', brand200: '#D9F99D', brand300: '#BEF264', brand400: '#A3E635',
      brand500: '#84CC16', brand600: '#65A30D', brand700: '#4D7C0F', brand800: '#3F6212', brand900: '#111827',
      sidebarBg: '#111827', sidebarDark: '#0B0F19', sidebarLight: '#1F2937', sidebarText: '#D9F99D',
      bgMain: '#F7FEE7', bgCard: '#FFFFFF', textMain: '#111827', textMuted: '#4B5563', accent: '#84CC16',
    },
  },
  {
    key: 'deep-aqua',
    name: 'فیروزه‌ای عمیق',
    nameEn: 'Deep Aqua & Teal',
    preview: { primary: '#14B8A6', accent: '#99F6E4', sidebar: '#053B36', bg: '#ECFEFF' },
    colors: {
      brand50: '#ECFEFF', brand100: '#CCFBF1', brand200: '#99F6E4', brand300: '#5EEAD4', brand400: '#2DD4BF',
      brand500: '#14B8A6', brand600: '#0D9488', brand700: '#0F766E', brand800: '#115E59', brand900: '#053B36',
      sidebarBg: '#053B36', sidebarDark: '#022421', sidebarLight: '#0B5750', sidebarText: '#99F6E4',
      bgMain: '#ECFEFF', bgCard: '#FFFFFF', textMain: '#042F2C', textMuted: '#4A7C77', accent: '#14B8A6',
    },
  },
  {
    key: 'ocean-depth',
    name: 'عمق اقیانوس',
    nameEn: 'Ocean Depth',
    preview: { primary: '#0284C7', accent: '#38BDF8', sidebar: '#082F49', bg: '#F0F9FF' },
    colors: {
      brand50: '#F0F9FF', brand100: '#E0F2FE', brand200: '#BAE6FD', brand300: '#7DD3FC', brand400: '#38BDF8',
      brand500: '#0284C7', brand600: '#0369A1', brand700: '#075985', brand800: '#0C4A6E', brand900: '#082F49',
      sidebarBg: '#082F49', sidebarDark: '#031B2C', sidebarLight: '#0E4469', sidebarText: '#BAE6FD',
      bgMain: '#F0F9FF', bgCard: '#FFFFFF', textMain: '#082F49', textMuted: '#527993', accent: '#0284C7',
    },
  },
  {
    key: 'aurora-night',
    name: 'شفق قطبی',
    nameEn: 'Aurora Night',
    preview: { primary: '#3B82F6', accent: '#A78BFA', sidebar: '#0F172A', bg: '#F8FAFC' },
    colors: {
      brand50: '#F0F5FF', brand100: '#E0EAFF', brand200: '#C7D2FE', brand300: '#A78BFA', brand400: '#60A5FA',
      brand500: '#3B82F6', brand600: '#2563EB', brand700: '#1D4ED8', brand800: '#1E40AF', brand900: '#0F172A',
      sidebarBg: '#0F172A', sidebarDark: '#090D1A', sidebarLight: '#1E293B', sidebarText: '#A78BFA',
      bgMain: '#F8FAFC', bgCard: '#FFFFFF', textMain: '#0F172A', textMuted: '#64748B', accent: '#3B82F6',
    },
  },
  {
    key: 'deep-rose',
    name: 'رز عمیق',
    nameEn: 'Deep Rose & Pink',
    preview: { primary: '#DB2777', accent: '#F9A8D4', sidebar: '#3B0A24', bg: '#FFF7FB' },
    colors: {
      brand50: '#FFF1F2', brand100: '#FFE4E6', brand200: '#FECDD3', brand300: '#F9A8D4', brand400: '#F472B6',
      brand500: '#EC4899', brand600: '#DB2777', brand700: '#BE185D', brand800: '#9D174D', brand900: '#3B0A24',
      sidebarBg: '#3B0A24', sidebarDark: '#230414', sidebarLight: '#591338', sidebarText: '#F9A8D4',
      bgMain: '#FFF7FB', bgCard: '#FFFFFF', textMain: '#3B0A24', textMuted: '#834A6A', accent: '#DB2777',
    },
  },
  {
    key: 'herb-shadow',
    name: 'سبز گیاهی',
    nameEn: 'Herb Shadow',
    preview: { primary: '#407C3F', accent: '#A7D957', sidebar: '#12372A', bg: '#F2E8CF' },
    colors: {
      brand50: '#F4F9EE', brand100: '#E4F2D6', brand200: '#C7E5AD', brand300: '#A7D957', brand400: '#6FA844',
      brand500: '#407C3F', brand600: '#326331', brand700: '#254A24', brand800: '#1B361B', brand900: '#12372A',
      sidebarBg: '#12372A', sidebarDark: '#0A2119', sidebarLight: '#1E4F3D', sidebarText: '#A7D957',
      bgMain: '#F2E8CF', bgCard: '#FFFFFF', textMain: '#12372A', textMuted: '#5C7362', accent: '#407C3F',
    },
  },
  {
    key: 'utility-olive',
    name: 'زیتونی کارگاهی',
    nameEn: 'Utility Olive',
    preview: { primary: '#6B7A4A', accent: '#9AA17A', sidebar: '#1F261A', bg: '#F5F5F0' },
    colors: {
      brand50: '#F7F8F2', brand100: '#EDEFDF', brand200: '#DADDBF', brand300: '#B8C093', brand400: '#9AA17A',
      brand500: '#6B7A4A', brand600: '#525F39', brand700: '#3C4629', brand800: '#2A311C', brand900: '#1F261A',
      sidebarBg: '#1F261A', sidebarDark: '#12170F', sidebarLight: '#303B29', sidebarText: '#9AA17A',
      bgMain: '#F5F5F0', bgCard: '#FFFFFF', textMain: '#1F261A', textMuted: '#666F5E', accent: '#6B7A4A',
    },
  },
  {
    key: 'future-tech',
    name: 'تکنولوژی آینده',
    nameEn: 'Future Tech',
    preview: { primary: '#3B82F6', accent: '#CBD5E1', sidebar: '#080808', bg: '#F8FAFC' },
    colors: {
      brand50: '#F1F5F9', brand100: '#E2E8F0', brand200: '#CBD5E1', brand300: '#94A3B8', brand400: '#60A5FA',
      brand500: '#3B82F6', brand600: '#2563EB', brand700: '#1D4ED8', brand800: '#1E293B', brand900: '#080808',
      sidebarBg: '#080808', sidebarDark: '#000000', sidebarLight: '#18181B', sidebarText: '#CBD5E1',
      bgMain: '#F8FAFC', bgCard: '#FFFFFF', textMain: '#09090B', textMuted: '#64748B', accent: '#3B82F6',
    },
  },

  // ==================== ۳. پوسته‌های اصیل و کلاسیک AGR ====================
  {
    key: 'carmine-red',
    name: 'قرمز کارمین',
    nameEn: 'Carmine Red',
    preview: { primary: '#960018', accent: '#D71F1F', sidebar: '#2A0007', bg: '#FDF2F2' },
    colors: {
      brand50: '#FDF2F2', brand100: '#FDE8E8', brand200: '#FBD5D5', brand300: '#F8B4B4', brand400: '#F05252',
      brand500: '#D71F1F', brand600: '#960018', brand700: '#770013', brand800: '#52000D', brand900: '#2A0007',
      sidebarBg: '#2A0007', sidebarDark: '#170004', sidebarLight: '#42000B', sidebarText: '#F8B4B4',
      bgMain: '#FDF2F2', bgCard: '#FFFFFF', textMain: '#2A0007', textMuted: '#7D434C', accent: '#960018',
    },
  },
  {
    key: 'paris-green',
    name: 'سبز پاریس',
    nameEn: 'Paris Green',
    preview: { primary: '#50C878', accent: '#0F7D58', sidebar: '#0A2E1B', bg: '#F0FDF4' },
    colors: {
      brand50: '#F0FDF4', brand100: '#DCFCE7', brand200: '#BBF7D0', brand300: '#86EFAC', brand400: '#50C878',
      brand500: '#22C55E', brand600: '#16A34A', brand700: '#15803D', brand800: '#166534', brand900: '#0A2E1B',
      sidebarBg: '#0A2E1B', sidebarDark: '#04170D', sidebarLight: '#124A2D', sidebarText: '#86EFAC',
      bgMain: '#F0FDF4', bgCard: '#FFFFFF', textMain: '#0A2E1B', textMuted: '#4B735E', accent: '#50C878',
    },
  },
  {
    key: 'michelangelo-blue',
    name: 'آبی میکل‌آنژ',
    nameEn: 'Michelangelo Blue',
    preview: { primary: '#3B7DDD', accent: '#1E3A8A', sidebar: '#0F172A', bg: '#F0F7FF' },
    colors: {
      brand50: '#EFF6FF', brand100: '#DBEAFE', brand200: '#BFDBFE', brand300: '#93C5FD', brand400: '#60A5FA',
      brand500: '#3B7DDD', brand600: '#2563EB', brand700: '#1D4ED8', brand800: '#1E3A8A', brand900: '#0F172A',
      sidebarBg: '#0F172A', sidebarDark: '#090D1A', sidebarLight: '#1E293B', sidebarText: '#93C5FD',
      bgMain: '#F0F7FF', bgCard: '#FFFFFF', textMain: '#0F172A', textMuted: '#516B94', accent: '#3B7DDD',
    },
  },
  {
    key: 'emerald-green',
    name: 'سبز زمردی',
    nameEn: 'Emerald Green',
    preview: { primary: '#0F7D58', accent: '#50C878', sidebar: '#063324', bg: '#ECFDF5' },
    colors: {
      brand50: '#ECFDF5', brand100: '#D1FAE5', brand200: '#A7F3D0', brand300: '#6EE7B7', brand400: '#34D399',
      brand500: '#10B981', brand600: '#0F7D58', brand700: '#047857', brand800: '#065F46', brand900: '#063324',
      sidebarBg: '#063324', sidebarDark: '#021C13', sidebarLight: '#0E523B', sidebarText: '#A7F3D0',
      bgMain: '#ECFDF5', bgCard: '#FFFFFF', textMain: '#063324', textMuted: '#417362', accent: '#0F7D58',
    },
  },
  {
    key: 'chrome-yellow',
    name: 'زرد کرومی',
    nameEn: 'Chrome Yellow',
    preview: { primary: '#EAB308', accent: '#FFD300', sidebar: '#291D00', bg: '#FFFBEB' },
    colors: {
      brand50: '#FFFBEB', brand100: '#FEF3C7', brand200: '#FDE68A', brand300: '#FCD34D', brand400: '#FFD300',
      brand500: '#EAB308', brand600: '#CA8A04', brand700: '#A16207', brand800: '#854D0E', brand900: '#291D00',
      sidebarBg: '#291D00', sidebarDark: '#171000', sidebarLight: '#423000', sidebarText: '#FDE68A',
      bgMain: '#FFFBEB', bgCard: '#FFFFFF', textMain: '#291D00', textMuted: '#78612B', accent: '#EAB308',
    },
  },
];

export const DEFAULT_THEME_KEY = 'modern-saas';

export function getThemeByKey(key: string | null | undefined): Theme {
  const defaultTheme = THEMES.find((t) => t.key === DEFAULT_THEME_KEY) || THEMES[0];
  if (!key) return defaultTheme;
  return THEMES.find((t) => t.key === key) || defaultTheme;
}

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

    '--brand-500-10': hexToRgba(c.brand500, 0.1),
    '--brand-500-15': hexToRgba(c.brand500, 0.15),
    '--brand-500-20': hexToRgba(c.brand500, 0.2),
    '--brand-500-30': hexToRgba(c.brand500, 0.3),
    '--brand-500-40': hexToRgba(c.brand500, 0.4),
    '--brand-900-20': hexToRgba(c.brand900, 0.2),
    '--brand-900-30': hexToRgba(c.brand900, 0.3),
  };
}