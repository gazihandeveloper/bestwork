import { cn } from "@/lib/utils";

// Lucide bileşen adı -> Google Material Symbols adı (snake_case).
// Bilinmeyen adlar "circle"e düşer (kırılma olmaz).
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
  ShieldCheck: "verified_user", Circle: "circle", Leaf: "eco",
  Eye: "visibility", EyeOff: "visibility_off", Pencil: "edit", Trash2: "delete",
  Image: "image", Upload: "upload", Clock: "schedule", Users: "group",
  TrendingUp: "trending_up", Coins: "payments", WalletIcon: "wallet",
  Activity: "monitoring", AlertTriangle: "warning", Loader2: "progress_activity",
  Loader: "progress_activity", SlidersHorizontal: "tune", MapPin: "location_on",
  Phone: "call", Mail: "email", Filter: "filter", Lock: "lock", LockKeyhole: "lock", KeyRound: "vpn_key",
  Globe: "public", FileText: "description", Download: "download", Info: "info",
  Calendar: "calendar_month", BarChart: "bar_chart", PieChart: "pie_chart",
  Target: "track_changes", Award: "emoji_events", Trophy: "emoji_events",
  Crown: "workspace_premium", Car: "directions_car", PawPrint: "pets",
  Beaker: "science", Apple: "nutrition", CupSoda: "local_cafe", MirrorRound: "face", Coffee: "coffee",
  Flower2: "local_florist", Zap: "bolt", CookingPot: "soup_kitchen",
  LayoutGrid: "grid_view", Utensils: "restaurant", Shirt: "checkroom",
  Smartphone: "smartphone", Droplets: "water_drop", Dumbbell: "fitness_center",
  Salad: "eco", Beef: "lunch_dining", Fish: "set_meal", Pill: "medication",
  Laptop: "laptop", Watch: "watch", Tv: "tv", Music: "music_note",
  Gamepad2: "sports_esports", Wine: "wine_bar", Milk: "local_drink",
  Snowflake: "ac_unit", Brush: "brush", Scissors: "content_cut",
  GlassWater: "water_drop", BadgeCheck: "verified", HandHeart: "volunteer_activism",
  Rocket: "rocket_launch", Headphones: "headphones", Timer: "timer",
  RefreshCw: "refresh", RefreshCcw: "refresh", UsersRound: "group",
  Network: "account_tree", UserPlus: "person_add", UserPlus2: "person_add",
  Gauge: "speed", HandCoins: "payments", Zap2: "bolt", PackageOpen: "inventory_2",
  ScrollText: "description", ExternalLink: "open_in_new", ChevronsUpDown: "unfold_more",
  Building2: "business", Power: "power_settings_new", Menu2: "menu", List: "list",
  HomeIcon: "home", CreditCard: "credit_card", Banknote: "payments",
  Receipt: "receipt_long", FileBarChart: "bar_chart", FileCheck: "fact_check",
  Share2: "share", Copy: "content_copy", Clipboard: "content_paste", CheckCircle: "check_circle",
  XCircle: "cancel", HelpCircle: "help", QuestionMark: "help", Settings: "settings",
  Cog: "settings", Bell: "notifications", MenuIcon: "menu", MoreHorizontal: "more_horiz",
  MoreVertical: "more_vert", SearchIcon: "search", CartIcon: "shopping_cart",
  LogOutIcon: "logout", UserIcon: "person", PlusIcon: "add", MinusIcon: "remove",
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
