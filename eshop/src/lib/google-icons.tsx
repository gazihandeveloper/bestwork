// ============================================
// BestWork ikonlari - Lucide-react
// Tum eshop ikonlari Lucide kaynagindan gelir (Material Symbols kaldirildi).
// ============================================
import * as Lucide from 'lucide-react'
import type { SVGProps } from 'react'

type AnyIcon = any

function resolve(name: string): any {
  const map: Record<string, string> = {
    'CheckCircle': 'CircleCheck',
    'CheckCircle2': 'CircleCheck',
    'Edit2': 'SquarePen',
    'AlertTriangle': 'TriangleAlert',
    'XCircle': 'CircleX',
    'CheckSquare': 'SquareCheck',
    'ImageIcon': 'Image',
    'Share2': 'Share2',
    'DollarSign': 'DollarSign',
    'House': 'House',
    'Wifi': 'Wifi',
    'ArrowDownLeft': 'ArrowDownLeft',
    'ArrowUpRight': 'ArrowUpRight',
    'ArrowLeft': 'ArrowLeft',
    'RefreshCw': 'RefreshCw',
    'RotateCcw': 'RotateCcw',
    'PanelBottom': 'PanelBottom',
    'SwatchBook': 'SwatchBook',
    'FolderTree': 'FolderTree',
    'GitBranch': 'GitBranch',
    'GitFork': 'GitFork',
    'Headset': 'Headset',
    'Landmark': 'Landmark',
    'LayoutDashboard': 'LayoutDashboard',
    'ListChecks': 'ListChecks',
    'Megaphone': 'Megaphone',
    'MessageSquare': 'MessageSquare',
    'MoreHorizontal': 'MoreHorizontal',
    'Network': 'Network',
    'PackagePlus': 'PackagePlus',
    'Paintbrush': 'Paintbrush',
    'Palette': 'Palette',
    'PenLine': 'PenLine',
    'Scale': 'Scale',
    'Sliders': 'Sliders',
    'Square': 'Square',
    'Ticket': 'Ticket',
    'TrendingDown': 'TrendingDown',
    'TrendingUp': 'TrendingUp',
    'Trophy': 'Trophy',
    'UserCheck': 'UserCheck',
    'UserPlus': 'UserPlus',
    'Boxes': 'Boxes',
    'Calendar': 'Calendar',
    'BarChart3': 'ChartColumnBig',
    'Bell': 'Bell',
    'CircleAlert': 'CircleAlert',
    'CircleCheck': 'CircleCheck',
    'Code': 'Code',
    'Coins': 'Coins',
    'Copy': 'Copy',
    'Link': 'Link',
    'TriangleAlert': 'TriangleAlert',
    'ChevronsLeft': 'ChevronsLeft',
    'ChevronsRight': 'ChevronsRight',
    'MessageCircle': 'MessageCircle',
    'BadgePercent': 'BadgePercent',
    'Star': 'Star',
    'Heart': 'Heart',
  };
  const target = map[name] || name
  return ((Lucide as unknown as Record<string, any>)[target] || (Lucide as unknown as Record<string, AnyIcon>)[name] || Lucide.Circle)
}

export const AlertCircle: AnyIcon = resolve('AlertCircle')
export const Apple: AnyIcon = resolve('Apple')
export const ArrowDownLeft: AnyIcon = resolve('ArrowDownLeft')
export const ArrowLeft: AnyIcon = resolve('ArrowLeft')
export const ArrowRight: AnyIcon = resolve('ArrowRight')
export const ArrowUpRight: AnyIcon = resolve('ArrowUpRight')
export const Award: AnyIcon = resolve('Award')
export const BadgeCheck: AnyIcon = resolve('BadgeCheck')
export const BarChart3: AnyIcon = resolve('BarChart3')
export const Bell: AnyIcon = resolve('Bell')
export const Box: AnyIcon = resolve('Box')
export const Boxes: AnyIcon = resolve('Boxes')
export const Building2: AnyIcon = resolve('Building2')
export const Calendar: AnyIcon = resolve('Calendar')
export const CalendarDays: AnyIcon = resolve('CalendarDays')
export const Camera: AnyIcon = resolve('Camera')
export const Check: AnyIcon = resolve('Check')
export const CheckCircle: AnyIcon = resolve('CheckCircle')
export const CheckSquare: AnyIcon = resolve('CheckSquare')
export const ChevronDown: AnyIcon = resolve('ChevronDown')
export const ChevronLeft: AnyIcon = resolve('ChevronLeft')
export const ChevronRight: AnyIcon = resolve('ChevronRight')
export const ChevronsLeft: AnyIcon = resolve('ChevronsLeft')
export const ChevronsRight: AnyIcon = resolve('ChevronsRight')
export const CircleAlert: AnyIcon = resolve('CircleAlert')
export const CircleCheck: AnyIcon = resolve('CircleCheck')
export const Clock: AnyIcon = resolve('Clock')
export const Code: AnyIcon = resolve('Code')
export const Coffee: AnyIcon = resolve('Coffee')
export const Coins: AnyIcon = resolve('Coins')
export const Copy: AnyIcon = resolve('Copy')
export const CreditCard: AnyIcon = resolve('CreditCard')
export const Crown: AnyIcon = resolve('Crown')
export const CupSoda: AnyIcon = resolve('CupSoda')
export const DollarSign: AnyIcon = resolve('DollarSign')
export const Droplets: AnyIcon = resolve('Droplets')
export const Edit2: AnyIcon = resolve('Edit2')
export const Eye: AnyIcon = resolve('Eye')
export const EyeOff: AnyIcon = resolve('EyeOff')
export const FileText: AnyIcon = resolve('FileText')
export const Filter: AnyIcon = resolve('Filter')
export const FlaskConical: AnyIcon = resolve('FlaskConical')
export const FolderTree: AnyIcon = resolve('FolderTree')
export const Gift: AnyIcon = resolve('Gift')
export const GitBranch: AnyIcon = resolve('GitBranch')
export const GitFork: AnyIcon = resolve('GitFork')
export const Headset: AnyIcon = resolve('Headset')
export const Heart: AnyIcon = resolve('Heart')
export const HeartPulse: AnyIcon = resolve('HeartPulse')
export const House: AnyIcon = resolve('House')
export const ImageIcon: AnyIcon = resolve('ImageIcon')
export const Info: AnyIcon = resolve('Info')
export const Landmark: AnyIcon = resolve('Landmark')
export const Layers: AnyIcon = resolve('Layers')
export const LayoutDashboard: AnyIcon = resolve('LayoutDashboard')
export const Leaf: AnyIcon = resolve('Leaf')
export const Link: AnyIcon = resolve('Link')
export const ListChecks: AnyIcon = resolve('ListChecks')
export const Lock: AnyIcon = resolve('Lock')
export const LogIn: AnyIcon = resolve('LogIn')
export const LogOut: AnyIcon = resolve('LogOut')
export const Mail: AnyIcon = resolve('Mail')
export const MapPin: AnyIcon = resolve('MapPin')
export const Megaphone: AnyIcon = resolve('Megaphone')
export const Menu: AnyIcon = resolve('Menu')
export const MessageSquare: AnyIcon = resolve('MessageSquare')
export const Minus: AnyIcon = resolve('Minus')
export const MoreHorizontal: AnyIcon = resolve('MoreHorizontal')
export const Network: AnyIcon = resolve('Network')
export const Package: AnyIcon = resolve('Package')
export const PackagePlus: AnyIcon = resolve('PackagePlus')
export const Paintbrush: AnyIcon = resolve('Paintbrush')
export const Palette: AnyIcon = resolve('Palette')
export const PanelBottom: AnyIcon = resolve('PanelBottom')
export const PenLine: AnyIcon = resolve('PenLine')
export const Pencil: AnyIcon = resolve('Pencil')
export const Percent: AnyIcon = resolve('Percent')
export const Phone: AnyIcon = resolve('Phone')
export const Pill: AnyIcon = resolve('Pill')
export const Plus: AnyIcon = resolve('Plus')
export const Receipt: AnyIcon = resolve('Receipt')
export const RefreshCw: AnyIcon = resolve('RefreshCw')
export const RotateCcw: AnyIcon = resolve('RotateCcw')
export const Scale: AnyIcon = resolve('Scale')
export const Search: AnyIcon = resolve('Search')
export const Send: AnyIcon = resolve('Send')
export const Share2: AnyIcon = resolve('Share2')
export const Shield: AnyIcon = resolve('Shield')
export const ShieldCheck: AnyIcon = resolve('ShieldCheck')
export const ShoppingBag: AnyIcon = resolve('ShoppingBag')
export const ShoppingCart: AnyIcon = resolve('ShoppingCart')
export const Sliders: AnyIcon = resolve('Sliders')
export const Sparkles: AnyIcon = resolve('Sparkles')
export const Square: AnyIcon = resolve('Square')
export const Star: AnyIcon = resolve('Star')
export const SwatchBook: AnyIcon = resolve('SwatchBook')
export const Tag: AnyIcon = resolve('Tag')
export const Ticket: AnyIcon = resolve('Ticket')
export const Trash2: AnyIcon = resolve('Trash2')
export const TrendingDown: AnyIcon = resolve('TrendingDown')
export const TrendingUp: AnyIcon = resolve('TrendingUp')
export const TriangleAlert: AnyIcon = resolve('TriangleAlert')
export const Trophy: AnyIcon = resolve('Trophy')
export const Truck: AnyIcon = resolve('Truck')
export const Upload: AnyIcon = resolve('Upload')
export const User: AnyIcon = resolve('User')
export const UserCheck: AnyIcon = resolve('UserCheck')
export const UserPlus: AnyIcon = resolve('UserPlus')
export const Users: AnyIcon = resolve('Users')
export const Wallet: AnyIcon = resolve('Wallet')
export const Wifi: AnyIcon = resolve('Wifi')
export const X: AnyIcon = resolve('X')
export const XCircle: AnyIcon = resolve('XCircle')
export const Zap: AnyIcon = resolve('Zap')
