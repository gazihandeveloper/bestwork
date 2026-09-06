// ============================================
// Google Material Symbols — lucide adlarini render eder
// lucide-react yerine gecer (hicbir lucide kullanilmaz)
// ============================================

import type { CSSProperties } from 'react'

type GIconProps = {
  size?: number | string
  className?: string
  style?: CSSProperties
  fill?: string | boolean
  strokeWidth?: number | string
  [k: string]: unknown
}

function makeIcon(glyph: string) {
  return function GlyphIcon(props: GIconProps) {
    const { size = 24, className = '', style } = props
    return (
      <span
        className={`material-symbols-rounded notranslate ${className}`.trim()}
        style={{ fontSize: size, lineHeight: 1, ...style }}
        aria-hidden="true"
      >
        {glyph}
      </span>
    )
  }
}

export const AlertCircle = makeIcon('warning')
export const Apple = makeIcon('eco')
export const ArrowDownLeft = makeIcon('south_west')
export const ArrowLeft = makeIcon('arrow_back')
export const ArrowRight = makeIcon('arrow_forward')
export const ArrowUpRight = makeIcon('north_east')
export const Award = makeIcon('military_tech')
export const BadgeCheck = makeIcon('verified')
export const BarChart3 = makeIcon('bar_chart')
export const Bell = makeIcon('notifications')
export const Box = makeIcon('box')
export const Boxes = makeIcon('inventory_2')
export const Building2 = makeIcon('apartment')
export const Calendar = makeIcon('calendar_month')
export const CalendarDays = makeIcon('calendar_today')
export const Camera = makeIcon('photo_camera')
export const Check = makeIcon('check')
export const CheckCircle = makeIcon('check_circle')
export const CheckSquare = makeIcon('check_box')
export const ChevronDown = makeIcon('expand_more')
export const ChevronLeft = makeIcon('chevron_left')
export const ChevronRight = makeIcon('chevron_right')
export const ChevronsLeft = makeIcon('chevron_left')
export const ChevronsRight = makeIcon('chevron_right')
export const CircleAlert = makeIcon('warning')
export const CircleCheck = makeIcon('check_circle')
export const Clock = makeIcon('schedule')
export const Code = makeIcon('code')
export const Coffee = makeIcon('coffee')
export const Coins = makeIcon('paid')
export const Copy = makeIcon('content_copy')
export const CreditCard = makeIcon('credit_card')
export const Crown = makeIcon('workspace_premium')
export const CupSoda = makeIcon('local_cafe')
export const DollarSign = makeIcon('payments')
export const Droplets = makeIcon('water_drop')
export const Edit2 = makeIcon('edit')
export const Eye = makeIcon('visibility')
export const EyeOff = makeIcon('visibility_off')
export const FileText = makeIcon('description')
export const Filter = makeIcon('filter_list')
export const FlaskConical = makeIcon('science')
export const FolderTree = makeIcon('folder')
export const Gift = makeIcon('redeem')
export const GitBranch = makeIcon('call_split')
export const GitFork = makeIcon('hub')
export const Headset = makeIcon('headset')
export const Heart = makeIcon('favorite')
export const HeartPulse = makeIcon('monitor_heart')
export const House = makeIcon('home')
export const ImageIcon = makeIcon('image')
export const Info = makeIcon('info')
export const Landmark = makeIcon('account_balance')
export const Layers = makeIcon('layers')
export const LayoutDashboard = makeIcon('dashboard')
export const Leaf = makeIcon('eco')
export const Link = makeIcon('link')
export const ListChecks = makeIcon('checklist')
export const Lock = makeIcon('lock')
export const LogIn = makeIcon('login')
export const LogOut = makeIcon('logout')
export const Mail = makeIcon('mail')
export const MapPin = makeIcon('location_on')
export const Megaphone = makeIcon('campaign')
export const Menu = makeIcon('menu')
export const MessageSquare = makeIcon('chat')
export const Minus = makeIcon('remove')
export const MoreHorizontal = makeIcon('more_horiz')
export const Network = makeIcon('hub')
export const Package = makeIcon('package')
export const PackagePlus = makeIcon('add_box')
export const Paintbrush = makeIcon('brush')
export const Palette = makeIcon('palette')
export const PanelBottom = makeIcon('view_agenda')
export const PenLine = makeIcon('edit')
export const Pencil = makeIcon('edit')
export const Percent = makeIcon('percent')
export const Phone = makeIcon('call')
export const Pill = makeIcon('medication')
export const Plus = makeIcon('add')
export const Receipt = makeIcon('receipt_long')
export const RefreshCw = makeIcon('refresh')
export const RotateCcw = makeIcon('replay')
export const Scale = makeIcon('balance')
export const Search = makeIcon('search')
export const Send = makeIcon('send')
export const Share2 = makeIcon('share')
export const Shield = makeIcon('shield')
export const ShieldCheck = makeIcon('verified_user')
export const ShoppingBag = makeIcon('shopping_bag')
export const ShoppingCart = makeIcon('shopping_cart')
export const Sliders = makeIcon('tune')
export const Sparkles = makeIcon('auto_awesome')
export const Square = makeIcon('check_box_outline_blank')
export const Star = makeIcon('star')
export const SwatchBook = makeIcon('palette')
export const Tag = makeIcon('sell')
export const Ticket = makeIcon('confirmation_number')
export const Trash2 = makeIcon('delete')
export const TrendingDown = makeIcon('trending_down')
export const TrendingUp = makeIcon('trending_up')
export const TriangleAlert = makeIcon('warning')
export const Trophy = makeIcon('emoji_events')
export const Truck = makeIcon('local_shipping')
export const Upload = makeIcon('upload')
export const User = makeIcon('person')
export const UserCheck = makeIcon('person_check')
export const UserPlus = makeIcon('person_add')
export const Users = makeIcon('group')
export const Wallet = makeIcon('account_balance_wallet')
export const Wifi = makeIcon('wifi')
export const X = makeIcon('close')
export const XCircle = makeIcon('cancel')
export const Zap = makeIcon('bolt')
