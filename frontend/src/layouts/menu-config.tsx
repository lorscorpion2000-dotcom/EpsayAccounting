import {
  LayoutDashboard,
  Bell,
  CheckSquare,
  FileSpreadsheet,
  FolderKanban,
  Building2,
  FileSignature,
  ShieldCheck,
  ShoppingCart,
  Package,
  Layers,
  ArrowRightLeft,
  Truck,
  HardHat,
  AlertTriangle,
  Receipt,
  Users,
  BookOpen,
  Scale,
  Landmark,
  Wallet,
  Coins,
  DollarSign,
  CalendarCheck,
  FileText,
  PieChart,
  Settings,
  Shield,
  HelpCircle,
  DatabaseBackup,
  Trash2,
  ScrollText,
  Tags,
  SlidersHorizontal,
  FolderSync,
  Clock,
  BadgePercent,
  Warehouse,
  ClipboardList,
} from 'lucide-react';
import { getMenuPermission } from '../config/route-permissions';

export interface MenuItem {
  to: string;
  label: string;
  icon?: any;
}

export interface MenuSubSection {
  key: string;
  title: string;
  items: MenuItem[];
}

export interface MenuSection {
  key: string;
  title: string;
  icon?: any;
  items?: MenuItem[];
  subsections?: MenuSubSection[];
}

/**
 * Ù…Ø³ÛŒØ± ÙˆØ±ÙˆØ¯ÛŒ (Landing Page) Ù¾ÛŒØ´â€ŒÙØ±Ø¶ Ø¨Ø± Ø§Ø³Ø§Ø³ Ù†Ù‚Ø´ Ú©Ø§Ø±Ø¨Ø±ÛŒ
 */
export const ROLE_HOME_ROUTES: Record<string, string> = {
  CEO: '/dashboard',
  CFO: '/dashboard',
  ACCOUNTANT: '/accounting/journals',
  SITE_MANAGER: '/site-ops/daily-reports',
  WAREHOUSE_KEEPER: '/warehouse/receipts',
  PROCUREMENT_OFFICER: '/procurement/orders',
  ADMIN: '/dashboard',
};

/**
 * Ú©Ù„ÛŒØ¯ Ø¨Ø®Ø´â€ŒÙ‡Ø§ÛŒ Ù…Ø¬Ø§Ø² Ù…Ù†Ùˆ Ø¨Ù‡ ØªÙÚ©ÛŒÚ© Ù†Ù‚Ø´ Ú©Ø§Ø±Ø¨Ø±ÛŒ
 */
export const ROLE_MENU_PRESETS: Record<string, string[]> = {
  CEO: ['dashboard', 'contracts', 'reports', 'financial', 'sales-and-revenue'],
  CFO: ['dashboard', 'contracts', 'procurement', 'warehouse', 'financial', 'treasury', 'sales-and-revenue', 'reports', 'settings'],
  ACCOUNTANT: ['dashboard', 'procurement', 'warehouse', 'financial', 'treasury', 'sales-and-revenue', 'reports'],
  SITE_MANAGER: ['dashboard', 'procurement', 'warehouse', 'site-ops'],
  WAREHOUSE_KEEPER: ['dashboard', 'warehouse'],
  PROCUREMENT_OFFICER: ['dashboard', 'procurement', 'treasury'],
  ADMIN: ['dashboard', 'contracts', 'procurement', 'warehouse', 'site-ops', 'financial', 'treasury', 'sales-and-revenue', 'reports', 'settings'],
};

export const MENU: MenuSection[] = [
  // Û±. Ø¯Ø§Ø´Ø¨ÙˆØ±Ø¯ Ùˆ Ú©Ø§Ø±ØªØ§Ø¨Ù„
  {
    key: 'dashboard',
    title: 'Ø¯Ø§Ø´Ø¨ÙˆØ±Ø¯ Ùˆ Ú©Ø§Ø±ØªØ§Ø¨Ù„',
    icon: LayoutDashboard,
    items: [
      { to: '/dashboard', label: 'Ø¯Ø§Ø´Ø¨ÙˆØ±Ø¯ Ù…Ø¯ÛŒØ±ÛŒØªÛŒ', icon: LayoutDashboard },
      { to: '/approvals', label: 'کارتابل تأییدات', icon: CheckSquare },
      { to: '/notifications', label: 'Ø§Ø¹Ù„Ø§Ù†â€ŒÙ‡Ø§ Ùˆ ÛŒØ§Ø¯Ø¢ÙˆØ±ÛŒâ€ŒÙ‡Ø§', icon: Bell },
    ],
  },

  // Û². Ù¾Ø±ÙˆÚ˜Ù‡â€ŒÙ‡Ø§ Ùˆ Ù‚Ø±Ø§Ø±Ø¯Ø§Ø¯Ù‡Ø§
  {
    key: 'contracts',
    title: 'Ù¾Ø±ÙˆÚ˜Ù‡â€ŒÙ‡Ø§ Ùˆ Ù‚Ø±Ø§Ø±Ø¯Ø§Ø¯Ù‡Ø§',
    icon: FolderKanban,
    items: [
      { to: '/projects', label: 'Ù¾Ø±ÙˆÚ˜Ù‡â€ŒÙ‡Ø§ÛŒ Ø¹Ù…Ø±Ø§Ù†ÛŒ Ùˆ Ø³Ø§Ø®Øª', icon: Building2 },
      { to: '/contracts', label: 'Ù‚Ø±Ø§Ø±Ø¯Ø§Ø¯Ù‡Ø§ Ùˆ Ù¾ÛŒÙ…Ø§Ù†â€ŒÙ‡Ø§', icon: FileSignature },
      { to: '/contracts/templates', label: 'Ù‚Ø§Ù„Ø¨â€ŒÙ‡Ø§ÛŒ Ù‚Ø±Ø§Ø±Ø¯Ø§Ø¯', icon: FileSpreadsheet },
      { to: '/timeline/guarantees', label: 'Ø¶Ù…Ø§Ù†Øªâ€ŒÙ†Ø§Ù…Ù‡â€ŒÙ‡Ø§ÛŒ Ù¾Ø±ÙˆÚ˜Ù‡', icon: ShieldCheck },
    ],
  },

  // Û³. ØªØ¯Ø§Ø±Ú©Ø§Øª Ùˆ Ø®Ø±ÛŒØ¯
  {
    key: 'procurement',
    title: 'ØªØ¯Ø§Ø±Ú©Ø§Øª Ùˆ Ø®Ø±ÛŒØ¯',
    icon: ShoppingCart,
    items: [
      { to: '/procurement/requests', label: 'Ø¯Ø±Ø®ÙˆØ§Ø³Øªâ€ŒÙ‡Ø§ÛŒ Ø®Ø±ÛŒØ¯ Ú©Ø§Ø±Ú¯Ø§Ù‡', icon: ClipboardList },
      { to: '/procurement/orders', label: 'Ø³ÙØ§Ø±Ø´â€ŒÙ‡Ø§ÛŒ Ø®Ø±ÛŒØ¯ (Ú©Ø§Ø±Ù¾Ø±Ø¯Ø§Ø²)', icon: ShoppingCart },
      { to: '/procurement/invoices', label: 'ÙØ§Ú©ØªÙˆØ±Ù‡Ø§ÛŒ Ø®Ø±ÛŒØ¯ Ùˆ ØªØ£Ù…ÛŒÙ†', icon: Receipt },
      { to: '/procurement/supplier-payments', label: 'Ù¾Ø±Ø¯Ø§Ø®Øª Ø¨Ù‡ ØªØ£Ù…ÛŒÙ†â€ŒÚ©Ù†Ù†Ø¯Ú¯Ø§Ù†', icon: DollarSign },
    ],
  },

  // Û´. Ø§Ù†Ø¨Ø§Ø± Ùˆ Ù…Ø¯ÛŒØ±ÛŒØª Ù…ØµØ§Ù„Ø­
  {
    key: 'warehouse',
    title: 'Ø§Ù†Ø¨Ø§Ø± Ùˆ Ù…Ø¯ÛŒØ±ÛŒØª Ù…ØµØ§Ù„Ø­',
    icon: Warehouse,
    items: [
      { to: '/warehouse/warehouses', label: 'Ø§Ù†Ø¨Ø§Ø± Ù…Ø±Ú©Ø²ÛŒ Ùˆ Ù¾Ø±ÙˆÚ˜Ù‡â€ŒÙ‡Ø§', icon: Warehouse },
      { to: '/warehouse/items', label: 'Ú©Ø§ØªØ§Ù„ÙˆÚ¯ Ú©Ø§Ù„Ø§ Ùˆ Ù…ØµØ§Ù„Ø­', icon: Package },
      { to: '/warehouse/receipts', label: 'Ø±Ø³ÛŒØ¯ ÙˆØ±ÙˆØ¯ Ú©Ø§Ù„Ø§ (Ø§Ù†Ø¨Ø§Ø±Ø¯Ø§Ø±ÛŒ)', icon: Layers },
      { to: '/warehouse/issues', label: 'Ø­ÙˆØ§Ù„Ù‡ Ø®Ø±ÙˆØ¬ Ùˆ Ù…ØµØ±Ù Ù¾Ø±ÙˆÚ˜Ù‡', icon: Layers },
      { to: '/warehouse-transfers', label: 'Ø§Ù†ØªÙ‚Ø§Ù„ Ø¨ÛŒÙ† Ø§Ù†Ø¨Ø§Ø±Ù‡Ø§', icon: ArrowRightLeft },
      { to: '/inventory-counts', label: 'Ø§Ù†Ø¨Ø§Ø±Ú¯Ø±Ø¯Ø§Ù†ÛŒ Ùˆ Ú©Ø³Ø±ÛŒ/Ø§Ø¶Ø§ÙÛŒ', icon: CheckSquare },
      { to: '/warehouse/kardex', label: 'Ú©Ø§Ø±Ø¯Ú©Ø³ Ø±ÛŒØ§Ù„ÛŒ Ùˆ ØªØ¹Ø¯Ø§Ø¯ÛŒ', icon: FileSpreadsheet },
      { to: '/material-report/consumption', label: 'Ù…Ø¯ÛŒØ±ÛŒØª Ù…ØµØ§Ù„Ø­ Ù¾Ø§ÛŒ Ú©Ø§Ø±', icon: Package },
    ],
  },

  // Ûµ. Ú©Ø§Ø±Ú¯Ø§Ù‡ Ùˆ Ø¹Ù…Ù„ÛŒØ§Øª Ø§Ø¬Ø±Ø§ÛŒÛŒ
  {
    key: 'site-ops',
    title: 'Ú©Ø§Ø±Ú¯Ø§Ù‡ Ùˆ Ø¹Ù…Ù„ÛŒØ§Øª Ø§Ø¬Ø±Ø§ÛŒÛŒ',
    icon: HardHat,
    items: [
      { to: '/site-ops/daily-reports', label: 'Ú¯Ø²Ø§Ø±Ø´ Ø±ÙˆØ²Ø§Ù†Ù‡ Ø³Ø±Ù¾Ø±Ø³Øª', icon: HardHat },
      { to: '/site-ops/failed-forwardings', label: 'ØµÙ†Ø¯ÙˆÙ‚ Ø§Ø±Ø³Ø§Ù„ Ú¯Ø²Ø§Ø±Ø´Ø§Øª', icon: AlertTriangle },
      { to: '/equipment', label: 'Ù…Ø§Ø´ÛŒÙ†â€ŒØ¢Ù„Ø§Øª Ùˆ ØªØ¬Ù‡ÛŒØ²Ø§Øª Ú©Ø§Ø±Ú¯Ø§Ù‡', icon: Truck },
    ],
  },

  // Û¶. Ø­Ø³Ø§Ø¨Ø¯Ø§Ø±ÛŒ Ù…Ø§Ù„ÛŒ Ùˆ Ù¾Ø±ÙˆÚ˜Ù‡â€ŒØ§ÛŒ
  {
    key: 'financial',
    title: 'Ø­Ø³Ø§Ø¨Ø¯Ø§Ø±ÛŒ Ù…Ø§Ù„ÛŒ Ùˆ Ù¾Ø±ÙˆÚ˜Ù‡â€ŒØ§ÛŒ',
    icon: BookOpen,
    subsections: [
      {
        key: 'accounting-ops',
        title: 'Ø¹Ù…Ù„ÛŒØ§Øª Ø§Ø³Ù†Ø§Ø¯ Ùˆ Ø¯ÙØ§ØªØ±',
        items: [
          { to: '/accounting/journals', label: 'Ø§Ø³Ù†Ø§Ø¯ Ø­Ø³Ø§Ø¨Ø¯Ø§Ø±ÛŒ (Ø³Ù†Ø¯ Ø¯ÙˆØ¨Ù„)', icon: BookOpen },
          { to: '/accounting/journal-book', label: 'Ø¯ÙØªØ± Ø±ÙˆØ²Ù†Ø§Ù…Ù‡ Ø±Ø³Ù…ÛŒ', icon: FileText },
          { to: '/accounting/advanced-ledger', label: 'Ø¯ÙØªØ± Ú©Ù„ Ùˆ Ù…Ø¹ÛŒÙ† Ù¾ÛŒØ´Ø±ÙØªÙ‡', icon: FileSpreadsheet },
          { to: '/adjustments', label: 'Ø§Ø³Ù†Ø§Ø¯ ØªØ¹Ø¯ÛŒÙ„ Ùˆ Ø§ØµÙ„Ø§Ø­ÛŒ', icon: SlidersHorizontal },
          { to: '/settings/period-lock', label: 'Ø¨Ø³ØªÙ† Ø­Ø³Ø§Ø¨â€ŒÙ‡Ø§ Ùˆ Ù‚ÙÙ„ Ø¯ÙˆØ±Ù‡', icon: ShieldCheck },
        ],
      },
      {
        key: 'financial-statements',
        title: 'ØµÙˆØ±Øªâ€ŒÙ‡Ø§ÛŒ Ù…Ø§Ù„ÛŒ Ùˆ ØªØ±Ø§Ø²Ù‡Ø§',
        items: [
          { to: '/accounting/trial-balance', label: 'ØªØ±Ø§Ø² Ø¢Ø²Ù…Ø§ÛŒØ´ÛŒ (Û´ Ùˆ Û¸ Ø³ØªÙˆÙ†ÛŒ)', icon: Scale },
          { to: '/accounting/reports/detailed-trial-balance', label: 'ØªØ±Ø§Ø² ØªÙØµÛŒÙ„ÛŒ Ø­Ø³Ø§Ø¨â€ŒÙ‡Ø§', icon: Scale },
          { to: '/accounting/reports/balance-sheet', label: 'ØªØ±Ø§Ø²Ù†Ø§Ù…Ù‡ Ù…Ø§Ù„ÛŒ', icon: FileSpreadsheet },
          { to: '/accounting/reports/profit-loss', label: 'ØµÙˆØ±Øª Ø³ÙˆØ¯ Ùˆ Ø²ÛŒØ§Ù† (Ù¾Ø±ÙˆÚ˜Ù‡/Ø³ØªØ§Ø¯)', icon: PieChart },
          { to: '/accounting/reports/project-ledger', label: 'Ø±ÛŒØ² ØªÙØµÛŒÙ„ÛŒ Ø¨Ù‡ ØªÙÚ©ÛŒÚ© Ù¾Ø±ÙˆÚ˜Ù‡', icon: Layers },
          { to: '/overhead-allocations', label: 'ØªØ³Ù‡ÛŒÙ… Ù‡Ø²ÛŒÙ†Ù‡â€ŒÙ‡Ø§ÛŒ Ø¨Ø§Ù„Ø§Ø³Ø±ÛŒ', icon: BadgePercent },
          { to: '/accounting/reports/vat', label: 'Ù…Ø§Ù„ÛŒØ§Øª Ø¨Ø± Ø§Ø±Ø²Ø´ Ø§ÙØ²ÙˆØ¯Ù‡ (VAT)', icon: Receipt },
          { to: '/tax-reports', label: 'Ú¯Ø²Ø§Ø±Ø´Ø§Øª ÙØµÙ„ÛŒ Ùˆ Ù…Ø§Ù„ÛŒØ§ØªÛŒ', icon: FileSpreadsheet },
        ],
      },
    ],
  },

  // Û·. Ø®Ø²Ø§Ù†Ù‡â€ŒØ¯Ø§Ø±ÛŒ Ùˆ Ù†Ù‚Ø¯ÛŒÙ†Ú¯ÛŒ
  {
    key: 'treasury',
    title: 'Ø®Ø²Ø§Ù†Ù‡â€ŒØ¯Ø§Ø±ÛŒ Ùˆ Ù†Ù‚Ø¯ÛŒÙ†Ú¯ÛŒ',
    icon: Landmark,
    items: [
      { to: '/accounting/banks', label: 'Ø¨Ø§Ù†Ú©â€ŒÙ‡Ø§ Ùˆ ØµÙ†Ø¯ÙˆÙ‚â€ŒÙ‡Ø§ÛŒ Ø´Ø±Ú©Øª', icon: Landmark },
      { to: '/accounting/cheques', label: 'Ù…Ø¯ÛŒØ±ÛŒØª Ú†Ú©â€ŒÙ‡Ø§ÛŒ Ø¯Ø±ÛŒØ§ÙØªÛŒ/Ù¾Ø±Ø¯Ø§Ø®ØªÛŒ', icon: FileText },
      { to: '/petty-cash', label: 'ØªÙ†Ø®ÙˆØ§Ù‡â€ŒÚ¯Ø±Ø¯Ø§Ù†â€ŒÙ‡Ø§ÛŒ Ù¾Ø±ÙˆÚ˜Ù‡â€ŒÙ‡Ø§', icon: Wallet },
      { to: '/expenses', label: 'Ù‡Ø²ÛŒÙ†Ù‡â€ŒÙ‡Ø§ÛŒ Ø¬Ø§Ø±ÛŒ Ú©Ø§Ø±Ú¯Ø§Ù‡ Ùˆ Ø³ØªØ§Ø¯', icon: Coins },
      { to: '/accounting/reports/cash-flow', label: 'Ø¬Ø±ÛŒØ§Ù† ÙˆØ¬ÙˆÙ‡ Ù†Ù‚Ø¯ (Cash Flow)', icon: DollarSign },
      { to: '/partner-capital/accounts', label: 'Ø³Ø±Ù…Ø§ÛŒÙ‡ØŒ Ø³Ù‡Ù…â€ŒØ§Ù„Ø´Ø±Ú©Ù‡ Ùˆ Ø´Ø±Ú©Ø§', icon: Users },
      { to: '/accounting/fixed-assets', label: 'Ø§Ù…ÙˆØ§Ù„ Ùˆ Ø¯Ø§Ø±Ø§ÛŒÛŒâ€ŒÙ‡Ø§ÛŒ Ø«Ø§Ø¨Øª', icon: Package },
    ],
  },

  // Û¸. ÙØ±ÙˆØ´ Ùˆ ØµÙˆØ±Øªâ€ŒÙˆØ¶Ø¹ÛŒØªâ€ŒÙ‡Ø§
  {
    key: 'sales-and-revenue',
    title: 'ÙØ±ÙˆØ´ Ùˆ ØµÙˆØ±Øªâ€ŒÙˆØ¶Ø¹ÛŒØª',
    icon: Receipt,
    items: [
      { to: '/payroll/subcontractor-statements', label: 'ØµÙˆØ±Øªâ€ŒÙˆØ¶Ø¹ÛŒØª Ù¾ÛŒÙ…Ø§Ù†Ú©Ø§Ø±Ø§Ù† Ø¬Ø²Ø¡', icon: FileSpreadsheet },
      { to: '/sales/units', label: 'ÙˆØ§Ø­Ø¯Ù‡Ø§ÛŒ Ø³Ø§Ø®ØªÙ…Ø§Ù†ÛŒ Ùˆ ÙØ±ÙˆØ´', icon: Building2 },
      { to: '/sales/customers', label: 'Ø®Ø±ÛŒØ¯Ø§Ø±Ø§Ù† Ùˆ Ú©Ø§Ø±ÙØ±Ù…Ø§ÛŒØ§Ù†', icon: Users },
      { to: '/sales/contracts', label: 'Ù‚Ø±Ø§Ø±Ø¯Ø§Ø¯Ù‡Ø§ÛŒ Ù¾ÛŒØ´â€ŒÙØ±ÙˆØ´ Ùˆ ÙØ±ÙˆØ´', icon: FileSignature },
      { to: '/sales/invoices', label: 'ÙØ§Ú©ØªÙˆØ±Ù‡Ø§ÛŒ ÙØ±ÙˆØ´ Ùˆ Ø¯Ø±Ø¢Ù…Ø¯', icon: Receipt },
      { to: '/sales/receipts', label: 'Ø±Ø³ÛŒØ¯ Ø¯Ø±ÛŒØ§ÙØª ÙˆØ¬ÙˆÙ‡ ÙØ±ÙˆØ´', icon: DollarSign },
    ],
  },

  // Û¹. Ú¯Ø²Ø§Ø±Ø´Ø§Øª Ø¬Ø§Ù…Ø¹ Ù…Ø¯ÛŒØ±ÛŒØªÛŒ
  {
    key: 'reports',
    title: 'Ú¯Ø²Ø§Ø±Ø´â€ŒÙ‡Ø§ÛŒ Ø¬Ø§Ù…Ø¹',
    icon: PieChart,
    items: [
      { to: '/reports', label: 'Ù…Ø±Ú©Ø² Ø¬Ø§Ù…Ø¹ Ú¯Ø²Ø§Ø±Ø´Ø§Øª', icon: PieChart },
      { to: '/reports/project', label: 'Ú¯Ø²Ø§Ø±Ø´ ØªØ­Ù„ÛŒÙ„ÛŒ Ø¨Ù‡Ø§ÛŒ ØªÙ…Ø§Ù…â€ŒØ´Ø¯Ù‡ Ù¾Ø±ÙˆÚ˜Ù‡', icon: FolderKanban },
      { to: '/reports/contracting-revenue', label: 'Ú¯Ø²Ø§Ø±Ø´ Ø¯Ø±Ø¢Ù…Ø¯ Ùˆ Ø³ÙˆØ¯ Ù¾ÛŒÙ…Ø§Ù†Ú©Ø§Ø±ÛŒ', icon: DollarSign },
      { to: '/accounting/reports/ap-aging-detail', label: 'Ú¯Ø²Ø§Ø±Ø´ Ø³Ù†ÛŒ Ø¨Ø¯Ù‡ÛŒâ€ŒÙ‡Ø§ (Ø¨Ø³ØªØ§Ù†Ú©Ø§Ø±Ø§Ù†)', icon: FileSpreadsheet },
      { to: '/accounting/reports/ar-aging-detail', label: 'Ú¯Ø²Ø§Ø±Ø´ Ø³Ù†ÛŒ Ù…Ø·Ø§Ù„Ø¨Ø§Øª (Ø¨Ø¯Ù‡Ú©Ø§Ø±Ø§Ù†)', icon: FileSpreadsheet },
      { to: '/wip', label: 'Ú©Ù†ØªØ±Ù„ Ù¾Ø±ÙˆÚ˜Ù‡ Ùˆ Ø¨ÙˆØ¯Ø¬Ù‡â€ŒØ¨Ù†Ø¯ÛŒ', icon: Scale },
    ],
  },

  // Û±Û°. Ù¾Ø§ÛŒÙ‡â€ŒÙ‡Ø§ Ùˆ ØªÙ†Ø¸ÛŒÙ…Ø§Øª Ø³ÛŒØ³ØªÙ…
  {
    key: 'settings',
    title: 'Ù¾Ø§ÛŒÙ‡â€ŒÙ‡Ø§ Ùˆ ØªÙ†Ø¸ÛŒÙ…Ø§Øª Ø³ÛŒØ³ØªÙ…',
    icon: Settings,
    subsections: [
      {
        key: 'base-definitions',
        title: 'Ø§Ø·Ù„Ø§Ø¹Ø§Øª Ùˆ ØªØ¹Ø§Ø±ÛŒÙ Ù¾Ø§ÛŒÙ‡',
        items: [
          { to: '/settings/fiscal-years', label: 'Ø³Ø§Ù„â€ŒÙ‡Ø§ÛŒ Ù…Ø§Ù„ÛŒ', icon: CalendarCheck },
          { to: '/accounting/accounts', label: 'Ú©Ø¯ÛŒÙ†Ú¯ Ø­Ø³Ø§Ø¨â€ŒÙ‡Ø§ (Ú©Ù„ØŒ Ù…Ø¹ÛŒÙ†ØŒ ØªÙØµÛŒÙ„ÛŒ)', icon: BookOpen },
          { to: '/accounting/cost-centers', label: 'Ù…Ø±Ø§Ú©Ø² Ù‡Ø²ÛŒÙ†Ù‡ Ùˆ Ù¾Ø±ÙˆÚ˜Ù‡â€ŒÙ‡Ø§', icon: FolderKanban },
          { to: '/accounting/mappings', label: 'Ù†Ú¯Ø§Ø´Øª Ø®ÙˆØ¯Ú©Ø§Ø± Ø§Ø³Ù†Ø§Ø¯ Ø­Ø³Ø§Ø¨Ø¯Ø§Ø±ÛŒ', icon: SlidersHorizontal },
          { to: '/directory', label: 'Ø¯ÙØªØ±Ú†Ù‡ Ù…Ø®Ø§Ø·Ø¨Ø§Ù† Ùˆ Ø§Ø´Ø®Ø§Øµ', icon: Users },
          { to: '/price-lists', label: 'ÙÙ‡Ø±Ø³Øªâ€ŒØ¨Ù‡Ø§ÛŒ Ø±Ø³Ù…ÛŒ Ùˆ Ù‚ÛŒÙ…Øªâ€ŒÙ‡Ø§', icon: Tags },
          { to: '/settings/units', label: 'ÙˆØ§Ø­Ø¯Ù‡Ø§ÛŒ Ø³Ù†Ø¬Ø´ Ùˆ Ø§Ù†Ø¯Ø§Ø²Ù‡â€ŒÚ¯ÛŒØ±ÛŒ', icon: SlidersHorizontal },
          { to: '/settings/expense-categories', label: 'Ø³Ø±ÙØµÙ„â€ŒÙ‡Ø§ÛŒ Ù‡Ø²ÛŒÙ†Ù‡â€ŒÙ‡Ø§ÛŒ Ú©Ø§Ø±Ú¯Ø§Ù‡', icon: Tags },
          { to: '/timeline/permits', label: 'Ù…Ø¬ÙˆØ²Ù‡Ø§ØŒ Ø¨ÛŒÙ…Ù‡ Ùˆ Ø§Ø³Ù†Ø§Ø¯ Ù¾Ø±ÙˆÚ˜Ù‡', icon: Clock },
        ],
      },
      {
        key: 'system-management',
        title: 'Ø§Ù…Ù†ÛŒØª Ùˆ Ù†Ú¯Ù‡Ø¯Ø§Ø±ÛŒ',
        items: [
          { to: '/settings/users', label: 'Ú©Ø§Ø±Ø¨Ø±Ø§Ù† Ø³ÛŒØ³ØªÙ…', icon: Users },
          { to: '/settings/roles', label: 'Ù†Ù‚Ø´â€ŒÙ‡Ø§ Ùˆ Ù…Ø§ØªØ±ÛŒØ³ Ù…Ø¬ÙˆØ²Ù‡Ø§', icon: Shield },
          { to: '/audit', label: 'Ø±Ø¯Ù¾Ø§ÛŒ Ø¹Ù…Ù„ÛŒØ§Øª Ùˆ Ù„Ø§Ú¯â€ŒÙ‡Ø§ÛŒ Ø§Ù…Ù†ÛŒØªÛŒ', icon: ScrollText },
          { to: '/backup', label: 'Ù¾Ø´ØªÛŒØ¨Ø§Ù†â€ŒÚ¯ÛŒØ±ÛŒ Ø§Ø² Ø¯ÛŒØªØ§Ø¨ÛŒØ³', icon: DatabaseBackup },
          { to: '/data-io', label: 'ÙˆØ±ÙˆØ¯ Ùˆ Ø®Ø±ÙˆØ¬ Ú¯Ø±ÙˆÙ‡ÛŒ Ø¯Ø§Ø¯Ù‡â€ŒÙ‡Ø§ (Excel)', icon: FolderSync },
          { to: '/recycle-bin', label: 'Ø³Ø·Ù„ Ø¨Ø§Ø²ÛŒØ§ÙØª Ù…ÙˆØ§Ø±Ø¯ Ø­Ø°Ùâ€ŒØ´Ø¯Ù‡', icon: Trash2 },
          { to: '/settings/company', label: 'Ù…Ø´Ø®ØµØ§Øª Ø´Ø±Ú©Øª Ùˆ Ù…Ù‡Ø± Ùˆ Ù„ÙˆÚ¯Ùˆ', icon: Building2 },
          { to: '/settings/profile', label: 'Ù¾Ø±ÙˆÙØ§ÛŒÙ„ Ú©Ø§Ø±Ø¨Ø± Ø¬Ø§Ø±ÛŒ', icon: Users },
          { to: '/help/workflows', label: 'Ø±Ø§Ù‡Ù†Ù…Ø§ÛŒ Ú¯Ø±Ø¯Ø´â€ŒÚ©Ø§Ø±Ù‡Ø§ÛŒ Ø³ÛŒØ³ØªÙ…', icon: HelpCircle },
        ],
      },
    ],
  },
];

export function findActiveSection(pathname: string): string {
  if (!pathname) return '';

  let bestMatchKey = '';
  let maxMatchLength = 0;

  for (const section of MENU) {
    if (section.items) {
      for (const item of section.items) {
        if (pathname === item.to || pathname.startsWith(item.to + '/')) {
          if (item.to.length > maxMatchLength) {
            maxMatchLength = item.to.length;
            bestMatchKey = section.key;
          }
        }
      }
    }

    if (section.subsections) {
      for (const sub of section.subsections) {
        if (sub.items) {
          for (const item of sub.items) {
            if (pathname === item.to || pathname.startsWith(item.to + '/')) {
              if (item.to.length > maxMatchLength) {
                maxMatchLength = item.to.length;
                bestMatchKey = section.key;
              }
            }
          }
        }
      }
    }
  }

  return bestMatchKey;
}

export function buildFilteredMenu(
  hasPermission: (code: string) => boolean,
  role?: string
): MenuSection[] {
  const allowedSections = role && ROLE_MENU_PRESETS[role] ? ROLE_MENU_PRESETS[role] : null;

  const result: MenuSection[] = [];

  for (const section of MENU) {
    if (allowedSections && !allowedSections.includes(section.key)) {
      continue;
    }

    let filteredItems: MenuItem[] | undefined = undefined;
    let filteredSubsections: MenuSubSection[] | undefined = undefined;

    if (section.items) {
      filteredItems = section.items
        .filter((item) => {
          const code = getMenuPermission(item.to);
          if (!code) return true;
          return hasPermission(code);
        })
        .map((item) => {
          if (item.to === '/approvals' && !hasPermission('approvals.update')) {
            return { ...item, label: 'کارتابل من' };
          }
          return item;
        });
    }

    if (section.subsections) {
      filteredSubsections = section.subsections
        .map((sub) => ({
          ...sub,
          items: sub.items.filter((item) => {
            const code = getMenuPermission(item.to);
            if (!code) return true;
            return hasPermission(code);
          }),
        }))
        .filter((sub) => sub.items.length > 0);
    }

    if ((filteredItems && filteredItems.length > 0) || (filteredSubsections && filteredSubsections.length > 0)) {
      result.push({
        ...section,
        items: filteredItems,
        subsections: filteredSubsections,
      });
    }
  }

  return result;
}

