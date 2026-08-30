import { cn } from "@/lib/utils";

// Lucide bileşen adı -> Google Material Symbols adı (snake_case).
const LUCIDE_TO_MATERIAL: Record<string, string> = {
  Search: "search", Plus: "add", Minus: "remove", Menu: "menu", X: "close",
  Check: "check", ChevronDown: "expand_more", ChevronUp: "expand_less",
  ChevronRight: "chevron_right", ChevronLeft: "chevron_left",
  ArrowLeft: "arrow_back", ArrowRight: "arrow_forward",
  LogOut: "logout", UserRound: "person", Home: "home", Moon: "dark_mode",
  Sun: "light_mode", ShoppingCart: "shopping_cart", ShoppingBag: "shopping_bag",
  Store: "storefront", Heart: "favorite", Sparkles: "auto_awesome",
  Truck: "local_shipping", Wallet: "account_balance_wallet", Package: "inventory_2",
  Tag: "sell", Layers: "layers", Box: "inventory_2", Gift: "card_giftcard",
  Star: "star", Flame: "local_fire_department", Shield: "shield",
  ShieldCheck: "verified_user", ShieldAlert: "gpp_maybe", Circle: "circle", Leaf: "eco",
  Eye: "visibility", EyeOff: "visibility_off", Pencil: "edit", Trash2: "delete",
  Image: "image", Upload: "upload", Clock: "schedule", Users: "group",
  TrendingUp: "trending_up", Coins: "payments", Activity: "monitoring",
  AlertTriangle: "warning", Loader2: "progress_activity", Loader: "progress_activity",
  SlidersHorizontal: "tune", MapPin: "location_on", Phone: "call", Mail: "email",
  Filter: "filter", Lock: "lock", KeyRound: "vpn_key", Globe: "public",
  FileText: "description", Download: "download", Info: "info", Calendar: "calendar_month",
  BarChart: "bar_chart", PieChart: "pie_chart", Target: "track_changes",
  Award: "emoji_events", Trophy: "emoji_events", Crown: "workspace_premium",
  Car: "directions_car", PawPrint: "pets", Beaker: "science", Apple: "nutrition",
  CupSoda: "local_cafe", MirrorRound: "face", Coffee: "coffee", Flower2: "local_florist", Zap: "bolt",
  CookingPot: "soup_kitchen", LayoutGrid: "grid_view", PanelLeft: "sidebar",
  Network: "account_tree", UserPlus: "person_add", Gauge: "speed",
  HandCoins: "payments", PackageOpen: "inventory_2", ScrollText: "description",
  ExternalLink: "open_in_new", Building2: "business", Power: "power_settings_new",
  List: "list", LayoutDashboard: "dashboard", Database: "storage", RefreshCw: "refresh",
  RefreshCcw: "refresh", CircleDollarSign: "payments", BadgeDollarSign: "paid",
  ArrowUpRight: "north_east", ArrowDownRight: "south_east", ArrowUp: "north",
  ArrowDown: "south", Columns3: "view_column", Rows3: "view_stream", GitBranch: "account_tree",
  GitFork: "account_tree", MailOpen: "mark_email_read", Send: "send",
  Inbox: "inbox", Archive: "archive", FolderOpen: "folder_open", Folder: "folder",
  FileSpreadsheet: "table_view", FileBarChart: "bar_chart", BarChart3: "bar_chart",
  LineChart: "show_chart", TrendingDown: "trending_down", Percent: "percent",
  BadgePercent: "percent", Handshake: "handshake", Users2: "group", UserMinus: "person_remove",
  ShieldCheck2: "verified_user", Fingerprint: "fingerprint", Scan: "document_scanner",
  QrCode: "qr_code", Barcode: "barcode", Printer: "print", PackageCheck: "inventory_2",
  PackageSearch: "search", PackageX: "inventory_2", Boxes: "inventory_2", Warehouse: "warehouse",
  Truck2: "local_shipping", Navigation: "navigation", Route: "alt_route", Map: "map",
  Compass: "explore", LocateFixed: "my_location", Locate: "location_searching",
  BatteryCharging: "battery_charging_full", Battery: "battery_full", Wifi: "wifi",
  WifiOff: "wifi_off", BluetoothConnected: "bluetooth_connected", Signal: "signal_cellular_4_bar",
  Smartphone2: "smartphone", Tablet: "tablet_mac", Monitor: "monitor", MonitorPlay: "smart_display",
  AudioLines: "graphic_eq", Volume2: "volume_up", VolumeX: "volume_off", Mic: "mic",
  Video: "videocam", Camera: "photo_camera", ImagePlus: "add_photo_alternate",
  FileImage: "image", FileVideo: "video_file", Music2: "music_note", Radio: "radio",
  Cast: "cast", Usb: "usb", Mouse: "mouse", Keyboard: "keyboard", Calculator: "calculate",
  Scale: "scale", Weight: "monitor_weight", Ruler: "straighten", Timer2: "timer",
  Stopwatch: "timer", AlarmClock: "alarm", CalendarClock: "event", CalendarCheck: "event_available",
  CalendarX: "event_busy", History: "history", Hourglass: "hourglass_empty",
  ListTodo: "checklist", ListChecks: "checklist", ListFilter: "filter_list", ListEnd: "format_list_numbered",
  ClipboardList: "checklist", ClipboardCheck: "fact_check", StickyNote: "sticky_note_2",
  NotebookPen: "edit_note", BookOpen: "menu_book", Bookmark: "bookmark", BookmarkCheck: "bookmark_added",
  ShieldOff: "shield", LockKeyhole: "lock", Unlock: "lock_open", Key: "vpn_key",
  Fingerprint2: "fingerprint", Bug: "bug", ShieldAlert2: "gpp_maybe", Siren: "emergency",
  FlameKindling: "local_fire_department", ZapOff: "flash_off", Plug: "power_off",
  PlugZap: "power", PowerOff: "power_off", Settings2: "tune", Wrench: "build",
  Hammer: "construction", PencilLine: "edit", PenLine: "edit", Pen: "edit_note",
  Eraser: "ink_eraser", Scissors2: "content_cut", PaintBucket: "format_paint",
  Paintbrush: "format_paint", Palette: "palette", SwatchBook: "palette",
  Droplet: "water_drop", Droplets2: "water_drop", Waves: "water", Ripple: "water",
  Anchor: "anchor", Ship: "directions_boat", Sailboat: "sailing", Plane: "flight",
  Train: "train", Bus: "directions_bus", Bike: "pedal_bike", Footprints: "directions_walk",
  PersonStanding: "accessibility_new", Accessibility: "accessibility", Baby: "child_care",
  Cat: "pets", Dog: "pets", Bird: "flutter_dash", Fish2: "set_meal", Bug2: "bug",
  Snail: "bug", Rabbit: "cruelty_free", Turtle: "bug", TreePine: "park", TreeDeciduous: "park",
  Flower: "local_florist", Flower2_2: "local_florist", Sprout: "eco", Shrub: "park",
  Cactus: "local_florist", SunMedium: "light_mode", Sunrise: "wb_twilight",
  Sunset: "wb_twilight", Cloud: "cloud", CloudRain: "water_drop", CloudSnow: "ac_unit",
  CloudLightning: "thunderstorm", CloudSun: "partly_cloudy_day", CloudMoon: "partly_cloudy",
  Umbrella: "beach_access", Snowflake2: "ac_unit", Wind: "air", Waves2: "water",
  Thermometer: "device_thermostat", ThermometerSun: "device_thermostat", Sun2: "light_mode",
  MoonStar: "dark_mode", Star2: "star", Sparkle: "auto_awesome", Asterisk: "priority_high",
  Hash: "tag", AtSign: "alternate_email", CircleDot: "radio_button_checked",
  CircleCheck: "check_circle", CircleX: "cancel", Square: "crop_square", SquareCheck: "check_box",
  SquareCheckBig: "check_box", RectangleHorizontal: "crop_16_9", RectangleVertical: "crop_9_16",
};

export function materialName(name: string): string {
  const key = name.replace(/Icon$/, "");
  if (LUCIDE_TO_MATERIAL[key]) return LUCIDE_TO_MATERIAL[key];
  // snake_case (doğrudan material sembol adı) ise aynen döndür
  if (/^[a-z0-9_]+$/.test(name)) return name;
  // Bilinmeyen PascalCase (eski lucide adı) -> circle (metin gözükmesin)
  return "circle";
}

// Google Material Symbols tabanlı ikon. name: Lucide bileşen adı VEYA doğrudan
// material sembol adı (snake_case) olabilir; bilinmeyenler "circle"a düşer.
export function MaterialIcon({
  name,
  className,
  size,
}: {
  name: string;
  className?: string;
  size?: number;
}) {
  // className içindeki size-N / w-N / h-N sınıflarını font-size'a çevir (glyph doğru boyutlansın).
  let fs = size;
  let cls = className ?? "";
  const m = cls.match(/(?:^|\s)size-(\d+)/);
  if (m) fs = Number(m[1]) * 4;
  const tw = cls.match(/(?:^|\s)w-(\d+)/);
  const th = cls.match(/(?:^|\s)h-(\d+)/);
  if (tw && th) fs = Math.max(Number(tw[1]), Number(th[1])) * 4;
  cls = cls.replace(/(?:^|\s)(size|w|h)-(\d+)(?=\s|$)/g, " ").replace(/\s+/g, " ").trim();
  return (
    <span
      className={cn("material-symbols-rounded pointer-events-none select-none leading-none", cls)}
      style={fs ? { fontSize: fs } : undefined}
      aria-hidden
    >
      {materialName(name)}
    </span>
  );
}
