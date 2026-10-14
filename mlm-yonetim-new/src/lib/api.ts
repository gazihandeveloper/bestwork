// BestWork yönetim API istemcisi (bestmanager2) — canlı backend'e bağlanır.
// Eski paneldeki axios istemcisinin fetch tabanlı karşılığı.
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://mahmutgazihanarslan.com.tr/api";

// Görseller "/api" soneki olmadan servis edilir.
export const FILE_BASE = API_URL.replace(/\/api\/?$/, "");

export function fileUrl(p?: string | null): string {
  if (!p) return "";
  return `${FILE_BASE}${p.startsWith("/") ? "" : "/"}${p}`;
}

async function request<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
  isForm = false
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    credentials: "include",
    headers: isForm
      ? { "X-Admin-Scope": "1", "X-CSRF-Protection": "1" }
      : {
          "Content-Type": "application/json",
          "X-Admin-Scope": "1",
          "X-CSRF-Protection": "1",
        },
    body:
      body === undefined
        ? undefined
        : isForm
        ? (body as BodyInit)
        : JSON.stringify(body),
  });

  if (!res.ok) {
    let msg = "Bir sorun oluştu";
    try {
      const data = (await res.json()) as { error?: string };
      if (data?.error) msg = data.error;
    } catch {
      /* yoksay */
    }
    if (res.status === 401 && typeof window !== "undefined") {
      // basePath'ten bagimsiz: mevcut panel yolu ne ise o prefix ile signin'e git
      const m = window.location.pathname.match(/^\/(bestmanager2?|bestmanager)/);
      const prefix = m ? m[1] : "bestmanager";
      window.location.href = `/${prefix}/signin`;
    }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export interface Ticket {
  id: number;
  user_id: number | null;
  name: string;
  surname: string;
  phone: string;
  message: string;
  status: string;
  created_at: string;
  member_code?: string | null;
  assigned_to?: number | null;
  assigned_name?: string | null;
}

export async function getTicket(id: number): Promise<Ticket> {
  const data = await request<{ ticket: Ticket }>("GET", `/admin/tickets/${id}`);
  return data.ticket;
}

export async function replyTicket(id: number, message: string): Promise<Ticket> {
  const data = await request<{ ticket: Ticket }>("POST", `/admin/tickets/${id}/reply`, { message });
  return data.ticket;
}

export async function unresolveTicket(id: number): Promise<void> {
  await request("POST", `/admin/tickets/${id}/unresolve`);
}

// Üye kodu ile temel kullanıcı bilgisi (destek/üye aramaları).
export async function lookupMember(
  code: string
): Promise<{ id: number; name: string; member_code: string }> {
  const d = await request<{ user: { id: number; name: string; member_code: string } }>(
    "GET",
    `/user/lookup?code=${encodeURIComponent(code)}`
  );
  return d.user;
}

export async function listTickets(): Promise<Ticket[]> {
  const data = await request<{ tickets: Ticket[] }>("GET", "/admin/tickets");
  return data.tickets;
}

export async function resolveTicket(id: number): Promise<void> {
  await request("POST", `/admin/tickets/${id}/resolve`);
}

export async function claimTicket(id: number): Promise<Ticket> {
  const data = await request<{ ticket: Ticket }>("POST", `/admin/tickets/${id}/claim`);
  return data.ticket;
}

export function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Bir sorun oluştu";
}

// ── Tipler ────────────────────────────────────────────────────────────────
export interface Category {
  id: number;
  name: string;
  slug: string;
  icon: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  tax_id?: number | null;
  tax_title?: string | null;
  tax_rate?: number;
  created_at: string;
}

export interface CategoryInput {
  name: string;
  slug?: string;
  icon?: string;
  description?: string;
  sort_order?: number;
  is_active?: boolean;
  tax_id?: number | null;
}

export interface Tax {
  id: number;
  title: string;
  rate: number;
  sort_order: number;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface TaxInput {
  title: string;
  rate: number;
  sort_order?: number;
  status?: string;
}

export interface Product {
  id: number;
  name: string;
  stock: number;
  price: number;
  pv: number;
  cv: number;
  category_id?: number | null;
  category_name?: string | null;
  sku?: string | null;
  description?: string | null;
  image_path?: string | null;
  category?: string | null;
  created_at?: string;
}

export interface AdminOrderItem {
  id: number;
  product_id: number | null;
  quantity: number;
  price: number;
  pv: number;
  cv: number;
  product_name?: string | null;
  image_path?: string | null;
}

export interface AdminOrder {
  id: number;
  user_id: number;
  total_amount: number;
  total_pv: number;
  total_cv: number;
  status: string;
  payment_method: string;
  created_at: string;
  tracking_code?: string | null;
  items: AdminOrderItem[];
  user_name?: string | null;
  user_member_code?: string | null;
}

export interface AdminOrdersResponse {
  orders: AdminOrder[];
  total: number;
  limit: number;
  offset: number;
}

export interface PaymentNotification {
  id: number;
  user_id: number;
  order_id: number | null;
  amount: number;
  bank_name: string | null;
  reference_no: string | null;
  note: string | null;
  file_path: string | null;
  status: string;
  created_at: string;
  processed_at: string | null;
  processed_by: number | null;
}

// ── Ayarlar ───────────────────────────────────────────────────────────────
export async function getSettings(): Promise<Record<string, string>> {
  const data = await request<{ settings: Record<string, string> }>("GET", "/settings");
  return data.settings ?? {};
}

export async function updateSettings(settings: Record<string, string>): Promise<void> {
  await request("PUT", "/admin/settings", { settings });
}

// ── Flashout (zayıf kol / binary aylık tavan) ──────────────────────────────
export interface FlashoutRules {
  monthly_limit: number;
  daily_limit: number;
  weekly_limit: number;
}

export async function getFlashout(): Promise<FlashoutRules> {
  const data = await request<{ flashout: FlashoutRules }>("GET", "/admin/flashout");
  return data.flashout;
}

export async function setFlashout(rules: FlashoutRules): Promise<void> {
  await request("PUT", "/admin/flashout", rules);
}

// ── Kategoriler ───────────────────────────────────────────────────────────
export async function listCategories(all = false): Promise<Category[]> {
  const data = await request<{ categories: Category[] }>(
    "GET",
    all ? "/categories?all=1" : "/categories"
  );
  return data.categories ?? [];
}

export async function createCategory(input: CategoryInput): Promise<Category> {
  const data = await request<{ category: Category }>("POST", "/admin/categories", input);
  return data.category;
}

export async function updateCategory(id: number, input: CategoryInput): Promise<Category> {
  const data = await request<{ category: Category }>("PUT", `/admin/categories/${id}`, input);
  return data.category;
}

export async function deleteCategory(id: number): Promise<void> {
  await request("DELETE", `/admin/categories/${id}`);
}

// ── Vergiler (KDV) ────────────────────────────────────────────────────────
export async function listTaxes(activeOnly = false): Promise<Tax[]> {
  const data = await request<{ taxes: Tax[] }>(
    "GET",
    `/admin/taxes${activeOnly ? "?active=1" : ""}`
  );
  return data.taxes ?? [];
}

export async function createTax(input: TaxInput): Promise<Tax> {
  const data = await request<{ tax: Tax }>("POST", "/admin/taxes", input);
  return data.tax;
}

export async function updateTax(id: number, input: TaxInput): Promise<Tax> {
  const data = await request<{ tax: Tax }>("PUT", `/admin/taxes/${id}`, input);
  return data.tax;
}

export async function deleteTax(id: number): Promise<void> {
  await request("DELETE", `/admin/taxes/${id}`);
}

// ── Kazanç Planı / Network Ayarları ───────────────────────────────────────
export interface EarningPlanRate {
  rank_id: number;
  depth: number;
  rate: number;
}

export interface EarningPlan {
  id: number;
  code: string;
  title: string;
  description: string | null;
  payout_type: string;
  max_rate: number;
  scope: string;
  period: string;
  activity_mode: string;
  check_matching: boolean;
  depth: number;
  sort_order: number;
  is_active: boolean;
  rates?: EarningPlanRate[];
}

export interface EarningPlanInput {
  code: string;
  title: string;
  description?: string | null;
  payout_type: string;
  max_rate: number;
  scope: string;
  period: string;
  activity_mode: string;
  check_matching: boolean;
  depth: number;
  sort_order?: number;
  is_active?: boolean;
  rates: EarningPlanRate[];
}

export async function listEarningPlans(): Promise<EarningPlan[]> {
  const data = await request<{ plans: EarningPlan[] }>("GET", "/admin/earning-plans");
  return data.plans ?? [];
}

export async function createEarningPlan(input: EarningPlanInput): Promise<EarningPlan> {
  const data = await request<{ plan: EarningPlan }>("POST", "/admin/earning-plans", input);
  return data.plan;
}

export async function updateEarningPlan(id: number, input: EarningPlanInput): Promise<EarningPlan> {
  const data = await request<{ plan: EarningPlan }>("PUT", `/admin/earning-plans/${id}`, input);
  return data.plan;
}

export async function deleteEarningPlan(id: number): Promise<void> {
  await request("DELETE", `/admin/earning-plans/${id}`);
}

export interface Rank {
  id: number;
  name: string;
  required_left_pv: number;
  required_right_pv: number;
  monthly_binary_limit: number;
  required_downline_rank_id: number | null;
  required_downline_count: number;
  personal_activity_pv: number;
  career_bonus_amount: number;
}

export async function listRanks(): Promise<Rank[]> {
  const data = await request<{ ranks: Rank[] }>("GET", "/ranks");
  return data.ranks ?? [];
}

export interface RankInput {
  name: string;
  required_left_pv: number;
  required_right_pv: number;
  monthly_binary_limit: number;
  required_downline_rank_id: number | null;
  required_downline_count: number;
  personal_activity_pv: number;
  career_bonus_amount: number;
}

export async function updateRank(id: number, input: RankInput): Promise<Rank> {
  const data = await request<{ rank: Rank }>("PUT", `/admin/ranks/${id}`, input);
  return data.rank;
}

// ── Kariyer (rütbe) yönetimi — admin CRUD ────────────────────────────────
export async function listAdminRanks(): Promise<Rank[]> {
  const data = await request<{ ranks: Rank[] }>("GET", "/admin/ranks");
  return data.ranks ?? [];
}

export async function createRank(input: RankInput): Promise<Rank> {
  const data = await request<{ rank: Rank }>("POST", "/admin/ranks", input);
  return data.rank;
}

export async function deleteRank(id: number): Promise<void> {
  await request("DELETE", `/admin/ranks/${id}`);
}

// ── Kariyer dağılımı ve aylık kazanımlar ─────────────────────────────────
export interface CareerMember {
  id: number;
  name: string;
  member_code: string;
}

export interface CareerRank {
  id: number;
  name: string;
  count: number;
  members: CareerMember[];
}

export interface CareerMonthlyUser extends CareerMember {
  achieved_at: string;
}

export interface CareerMonthlyGroup {
  rank_id: number;
  rank_name: string;
  users: CareerMonthlyUser[];
}

export async function listCareers(): Promise<CareerRank[]> {
  const d = await request<{ ranks: CareerRank[] }>("GET", "/admin/careers");
  return d.ranks ?? [];
}

export async function listCareerMonthly(
  start: string,
  end: string
): Promise<CareerMonthlyGroup[]> {
  const d = await request<{ groups: CareerMonthlyGroup[] }>(
    "GET",
    `/admin/careers/monthly?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
  );
  return d.groups ?? [];
}

// ── Kazanç sıralaması (tarih aralığı; en çok / en az kazananlar) ─────────
export interface CareerEarningUser {
  id: number;
  name: string;
  member_code: string;
  total: number;
}

export async function listCareerEarnings(
  start: string,
  end: string,
  order: "top" | "bottom",
  limit = 100
): Promise<CareerEarningUser[]> {
  const d = await request<{ users: CareerEarningUser[] }>(
    "GET",
    `/admin/careers/earnings?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&order=${order}&limit=${limit}`
  );
  return d.users ?? [];
}

// ── PV sıralaması (tarih aralığı) ─────────────────────────────────────────
export interface CareerPvUser {
  id: number;
  name: string;
  member_code: string;
  total_pv: number;
}

export async function listCareerPvTop(
  start: string,
  end: string,
  limit = 100
): Promise<CareerPvUser[]> {
  const d = await request<{ users: CareerPvUser[] }>(
    "GET",
    `/admin/careers/pv-top?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&limit=${limit}`
  );
  return d.users ?? [];
}

// ── CV (komisyon hacmi) sıralaması (tarih aralığı) ───────────────────────
export interface CareerCvUser {
  id: number;
  name: string;
  member_code: string;
  total_cv: number;
}

export async function listCareerCvTop(
  start: string,
  end: string,
  limit = 100
): Promise<CareerCvUser[]> {
  const d = await request<{ users: CareerCvUser[] }>(
    "GET",
    `/admin/careers/cv-top?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&limit=${limit}`
  );
  return d.users ?? [];
}

// ── Ürünler ───────────────────────────────────────────────────────────────
export async function listProducts(): Promise<Product[]> {
  const data = await request<{ products: Product[] }>("GET", "/products?limit=200");
  return data.products ?? [];
}

export interface ProductInput {
  name: string;
  sku?: string;
  stock: number;
  pv: number;
  cv: number;
  price: number;
  description?: string;
  image_path?: string;
  category_id?: number | null;
  category?: string;
}

export async function createProduct(input: ProductInput): Promise<void> {
  await request("POST", "/admin/products", input);
}

export async function updateProduct(id: number, input: ProductInput): Promise<void> {
  await request("PUT", `/admin/products/${id}`, input);
}

export async function deleteProduct(id: number): Promise<void> {
  await request("DELETE", `/admin/products/${id}`);
}

export async function uploadFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const data = await request<{ file_path: string }>("POST", "/upload", fd, true);
  return data.file_path;
}

// ── Siparişler ────────────────────────────────────────────────────────────
export async function listAdminOrders(params?: {
  limit?: number;
  offset?: number;
  status?: string;
  type?: string;
  q?: string;
}): Promise<AdminOrdersResponse> {
  const qs = new URLSearchParams();
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  if (params?.status) qs.set("status", params.status);
  if (params?.q) qs.set("q", params.q);
  const q = qs.toString();
  const data = await request<AdminOrdersResponse>("GET", `/admin/orders${q ? `?${q}` : ""}`);
  return data;
}

export async function updateOrderStatus(
  id: number,
  status: string,
  trackingCode?: string,
  note?: string
): Promise<void> {
  await request("PUT", `/admin/orders/${id}/status`, {
    status,
    tracking_code: trackingCode,
    note,
  });
}

export async function listAdminPaymentNotifications(params?: {
  limit?: number;
  offset?: number;
}): Promise<{ payment_notifications: PaymentNotification[]; total: number }> {
  const qs = new URLSearchParams();
  if (params?.limit) qs.set("limit", String(params.limit));
  const q = qs.toString();
  return request("GET", `/admin/payment-notifications${q ? `?${q}` : ""}`);
}

export async function approvePaymentNotification(id: number): Promise<void> {
  await request("POST", `/admin/payment-notifications/${id}/approve`);
}

export async function rejectPaymentNotification(id: number): Promise<void> {
  await request("POST", `/admin/payment-notifications/${id}/reject`);
}

// ── Slider (hero-slides) ──────────────────────────────────────────────────
export interface HeroSlide {
  id: number;
  title: string;
  subtitle: string | null;
  description: string | null;
  image_path: string;
  link: string | null;
  primary_button_text: string | null;
  primary_button_link: string | null;
  secondary_button_text: string | null;
  secondary_button_link: string | null;
  show_buttons: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface HeroSlideInput {
  title: string;
  subtitle?: string;
  description?: string;
  image_path: string;
  link?: string;
  primary_button_text?: string;
  primary_button_link?: string;
  secondary_button_text?: string;
  secondary_button_link?: string;
  show_buttons: boolean;
  sort_order: number;
  is_active: boolean;
}

export async function listHeroSlides(): Promise<HeroSlide[]> {
  const data = await request<{ hero_slides: HeroSlide[] }>("GET", "/admin/hero-slides");
  return data.hero_slides ?? [];
}

export async function createHeroSlide(input: HeroSlideInput): Promise<HeroSlide> {
  const data = await request<{ hero_slide: HeroSlide }>("POST", "/admin/hero-slides", input);
  return data.hero_slide;
}

export async function updateHeroSlide(id: number, input: HeroSlideInput): Promise<HeroSlide> {
  const data = await request<{ hero_slide: HeroSlide }>("PUT", `/admin/hero-slides/${id}`, input);
  return data.hero_slide;
}

export async function deleteHeroSlide(id: number): Promise<void> {
  await request("DELETE", `/admin/hero-slides/${id}`);
}

// ── Güvenlik Şeridi (benefits) ────────────────────────────────────────────
export interface Benefit {
  id: number;
  title: string;
  description: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface BenefitInput {
  title: string;
  description: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
}

export async function listBenefits(): Promise<Benefit[]> {
  const data = await request<{ benefits: Benefit[] }>("GET", "/admin/benefits");
  return data.benefits ?? [];
}

export async function createBenefit(input: BenefitInput): Promise<Benefit> {
  const data = await request<{ benefit: Benefit }>("POST", "/admin/benefits", input);
  return data.benefit;
}

export async function updateBenefit(id: number, input: BenefitInput): Promise<Benefit> {
  const data = await request<{ benefit: Benefit }>("PUT", `/admin/benefits/${id}`, input);
  return data.benefit;
}

export async function deleteBenefit(id: number): Promise<void> {
  await request("DELETE", `/admin/benefits/${id}`);
}

// ── Oturum (me) ────────────────────────────────────────────────────────────
export interface AdminMe {
  id?: number;
  name?: string;
  email?: string;
  phone?: string | null;
  member_code?: string;
  role?: string;
}

const meState: {
  at: number;
  value: AdminMe | null;
  inflight: Promise<AdminMe | null> | null;
} = { at: 0, value: null, inflight: null };

// Ayni anda cagrilar tek istege dusurulur (dedup) + 60 sn TTL.
export function getMe(force = false): Promise<AdminMe | null> {
  const now = Date.now();
  if (!force && meState.value !== null && now - meState.at < 60_000) {
    return Promise.resolve(meState.value);
  }
  if (!force && meState.inflight) return meState.inflight;
  meState.inflight = request<{ user: AdminMe }>("GET", "/user/me")
    .then((d) => {
      meState.value = d?.user ?? null;
      meState.at = Date.now();
      return meState.value;
    })
    .catch(() => {
      meState.value = null;
      meState.at = Date.now();
      return null;
    })
    .finally(() => {
      meState.inflight = null;
    });
  return meState.inflight;
}


/** PV/CV değerini biçimlendirir: küsurat varsa gösterir (100 · 25,5 · 12,75). */
export function formatPV(value?: number | string | null): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString("tr-TR", { maximumFractionDigits: 2 });
}

// ── Üyeler (admin) ────────────────────────────────────────────────────────
export interface AdminUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  member_code: string;
  role: string;
  sponsor_id: number | null;
  sponsor_name?: string | null;
  sponsor_code?: string | null;
  parent_id: number | null;
  position: string | null;
  package_id: number | null;
  is_active: boolean;
  is_in_pending_pool: boolean;
  pending_since?: string | null;
  current_rank_id: number | null;
  total_pv_left: number;
  total_pv_right: number;
  total_cv_left: number;
  total_cv_right: number;
  total_pv_accumulated: number;
  total_cv_accumulated: number;
  current_month_binary_earned?: number;
  current_month_platinum_count?: number;
  created_at: string;
  updated_at?: string;
}

export interface AdminUsersResponse {
  users: AdminUser[];
  total: number;
  limit: number;
  offset: number;
}

export async function listAdminUsers(params?: {
  q?: string;
  role?: string;
  limit?: number;
  offset?: number;
}): Promise<AdminUsersResponse> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set("q", params.q);
  if (params?.role) qs.set("role", params.role);
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  const q = qs.toString();
  return request<AdminUsersResponse>("GET", `/admin/users${q ? `?${q}` : ""}`);
}

export async function updateUserStatus(
  id: number,
  isActive: boolean,
  reason = ""
): Promise<void> {
  await request("PUT", `/admin/users/${id}/status`, { is_active: isActive, reason });
}

// ── Çalışan Rolleri (RBAC) ────────────────────────────────────────────────
export interface StaffMember {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  menus: string[];
  birim?: string | null;
}

export interface StaffInput {
  name: string;
  email: string;
  phone: string;
  password?: string;
  menus: string[];
}

export async function listStaff(): Promise<StaffMember[]> {
  const d = await request<{ staff: StaffMember[] }>("GET", "/admin/staff");
  return d.staff ?? [];
}

export async function createStaff(input: StaffInput): Promise<void> {
  await request("POST", "/admin/staff", input);
}

export async function updateStaff(id: number, input: StaffInput): Promise<void> {
  await request("PUT", `/admin/staff/${id}`, input);
}

export async function deleteStaff(id: number): Promise<void> {
  await request("DELETE", `/admin/staff/${id}`);
}

export async function getMyMenuPermissions(): Promise<{ role: string; menus: string[] }> {
  return request<{ role: string; menus: string[] }>("GET", "/admin/me/permissions");
}

// ── Ürün Yorumları (moderasyon) ─────────────────────────────────────────
export interface AdminProductReview {
  id: number;
  product_id: number;
  product_name: string;
  author: string;
  rating: number;
  comment: string;
  is_approved: boolean;
  created_at: string;
}

export interface AdminReviewCounts {
  pending: number;
  approved: number;
  total: number;
}

export async function listAdminReviews(
  status: "pending" | "approved" | "all"
): Promise<{ items: AdminProductReview[]; counts: AdminReviewCounts }> {
  return request<{ items: AdminProductReview[]; counts: AdminReviewCounts }>(
    "GET",
    `/admin/product-reviews?status=${status}`
  );
}

export async function approveAdminReview(id: number): Promise<void> {
  await request("PATCH", `/admin/product-reviews/${id}/approve`, {});
}

export async function unapproveAdminReview(id: number): Promise<void> {
  await request("PATCH", `/admin/product-reviews/${id}/unapprove`, {});
}

export async function deleteAdminReview(id: number): Promise<void> {
  await request("DELETE", `/admin/product-reviews/${id}`);
}

// ── Üye sayaçları (ağaç özeti) ──────────────────────────────────────────
export interface MemberCounts {
  total: number;
  active: number;
  passive: number;
  /** Şirket ağacının kök üye kimliği (panel ağacı buradan yüklenir). */
  root_id?: number | null;
}

export async function getMemberCounts(): Promise<MemberCounts> {
  return request<MemberCounts>("GET", "/admin/member-counts");
}

// ── Panel tercihleri (hesaba bağlı, DB'de saklanır) ─────────────────────
export interface UserPreferences {
  preferences: Record<string, unknown>;
}

export async function getMyPreferences(): Promise<UserPreferences> {
  return request<UserPreferences>("GET", "/admin/me/preferences");
}

export async function setMyPreference(key: string, value: unknown): Promise<void> {
  await request("PUT", `/admin/me/preferences/${encodeURIComponent(key)}`, { value });
}

// ── PV/CV/Komisyon serisi (dashboard grafiği) ──────────────────────────
export type ActivityPeriod = "daily" | "weekly" | "monthly" | "yearly" | "2y" | "5y" | "10y";

export interface ActivityPoint {
  date: string;
  pv: number;
  cv: number;
  commission: number;
  revenue: number;
  profit: number;
}

export async function getActivitySeries(period: ActivityPeriod, points?: number): Promise<ActivityPoint[]> {
  const extra = points ? `&points=${points}` : "";
  const d = await request<{ points: ActivityPoint[] }>(
    "GET",
    `/admin/activity-series?period=${period}${extra}`
  );
  return d.points ?? [];
}

export type ActivityBucket = "day" | "week" | "month" | "year";

/** Belirli tarih aralığı (YYYY-MM-DD, bitiş dahil) — karşılaştırma sayfası. */
export async function getActivitySeriesRange(
  bucket: ActivityBucket,
  from: string,
  to: string
): Promise<ActivityPoint[]> {
  const d = await request<{ points: ActivityPoint[] }>(
    "GET",
    `/admin/activity-series?bucket=${bucket}&from=${from}&to=${to}`
  );
  return d.points ?? [];
}

// ─────────────────────────────────────────────────────────────────────
// İSTATİSTİK SAYFALARI — Üye / Ciro / Karlılık / Prim / Puan
// ─────────────────────────────────────────────────────────────────────

export type StatsBucket = "hour" | "day" | "week" | "month" | "year";

export interface StatsPoint {
  date: string;
  new_members: number;
  active_members: number;
  orders: number;
  revenue: number;
  commission: number;
  commission_count: number;
  commission_members: number;
  pv: number;
  cv: number;
}

export interface StatsSummaryData {
  total_members: number;
  active_members: number;
  passive_members: number;
  new_today: number;
  new_this_week: number;
  new_this_month: number;
  new_this_year: number;
  total_revenue: number;
  total_commission: number;
  total_pv: number;
  total_cv: number;
}

export interface StatsLeaderRow {
  id: number;
  name: string;
  count: number;
  total: number;
}

/** İstatistik serisi — bucket: hour|day|week|month|year, from/to: YYYY-MM-DD. */
export async function getStatsSeries(
  bucket: StatsBucket,
  from: string,
  to: string
): Promise<StatsPoint[]> {
  const d = await request<{ points: StatsPoint[] }>(
    "GET",
    `/admin/stats-series?bucket=${bucket}&from=${from}&to=${to}`
  );
  return d.points ?? [];
}

/** Tüm zamanların özeti (KPI kartları). */
export async function getStatsSummary(): Promise<StatsSummaryData> {
  return request<StatsSummaryData>("GET", "/admin/stats-summary");
}

/** Lider listesi — kind: sponsors (üye getiren) | earners (prim alan). */
export async function getStatsLeaders(
  kind: "sponsors" | "earners",
  from: string,
  to: string,
  limit = 10
): Promise<StatsLeaderRow[]> {
  const d = await request<{ leaders: StatsLeaderRow[] }>(
    "GET",
    `/admin/stats-leaders?kind=${kind}&from=${from}&to=${to}&limit=${limit}`
  );
  return d.leaders ?? [];
}

// ─────────────────────────────────────────────────────────────────────
// KAMPANYA VE PROMOSYONLAR
// ─────────────────────────────────────────────────────────────────────

export interface PromotionRankRule {
  rank_id: number;
  short_leg_target: number;
  personal_pv_quota: number;
}

export interface Promotion {
  id: number;
  type: "kampanya" | "promosyon";
  name: string;
  description: string;
  period_months: number;
  starts_at: string;
  ends_at: string;
  personal_pv_quota: number;
  short_leg_target: number;
  rank_rules: PromotionRankRule[];
  is_active: boolean;
  created_at: string;
}

export interface PromotionInput {
  type: string;
  name: string;
  description: string;
  period_months: number;
  starts_at: string;
  ends_at: string;
  personal_pv_quota: number;
  short_leg_target: number;
  rank_rules: PromotionRankRule[];
  is_active?: boolean;
}

export interface PromotionMember {
  id: number;
  name: string;
  rank_id: number;
  rank_name: string;
  left_pv: number;
  right_pv: number;
  short_leg: number;
  personal_pv: number;
  target: number;
  qualified: boolean;
}

export async function listPromotions(): Promise<Promotion[]> {
  const d = await request<{ promotions: Promotion[] }>("GET", "/admin/promotions");
  return d.promotions ?? [];
}

export async function createPromotion(input: PromotionInput): Promise<void> {
  await request("POST", "/admin/promotions", input);
}

export async function updatePromotion(id: number, input: PromotionInput): Promise<void> {
  await request("PUT", `/admin/promotions/${id}`, input);
}

export async function deletePromotion(id: number): Promise<void> {
  await request("DELETE", `/admin/promotions/${id}`);
}

export async function setPromotionActive(id: number, is_active: boolean): Promise<void> {
  await request("POST", `/admin/promotions/${id}/active`, { is_active });
}

export async function getPromotionMembers(id: number): Promise<PromotionMember[]> {
  const d = await request<{ members: PromotionMember[] }>("GET", `/admin/promotions/${id}/members`);
  return d.members ?? [];
}

// ─────────────────────────────────────────────────────────────────────
// ÇEKİM TALEPLERİ
// ─────────────────────────────────────────────────────────────────────

export interface WithdrawRequest {
  id: number;
  user_id: number;
  amount: number;
  method: string | null;
  status: string; // pending | approved | rejected
  requested_at: string;
  processed_at: string | null;
  /** panelde zenginleştirme için (opsiyonel) */
  member_name?: string | null;
  member_code?: string | null;
}

export async function listWithdrawals(): Promise<WithdrawRequest[]> {
  const d = await request<{ withdraw_requests?: WithdrawRequest[]; withdrawals?: WithdrawRequest[] }>(
    "GET",
    "/admin/withdrawals"
  );
  return d.withdraw_requests ?? d.withdrawals ?? [];
}

export async function approveWithdrawal(id: number): Promise<void> {
  await request("POST", `/admin/withdrawals/${id}/approve`);
}

export async function rejectWithdrawal(id: number): Promise<void> {
  await request("POST", `/admin/withdrawals/${id}/reject`);
}

// ─────────────────────────────────────────────────────────────────────
// DUYURULAR
// ─────────────────────────────────────────────────────────────────────

export interface Announcement {
  id: number;
  title: string;
  body: string;
  audience: string;
  is_active: boolean;
  created_at: string;
}

export interface AnnouncementInput {
  title: string;
  body: string;
  audience?: string;
  is_active?: boolean;
}

export async function listAnnouncements(): Promise<Announcement[]> {
  const d = await request<{ announcements: Announcement[] }>("GET", "/admin/announcements");
  return d.announcements ?? [];
}

export async function createAnnouncement(input: AnnouncementInput): Promise<void> {
  await request("POST", "/admin/announcements", input);
}

export async function updateAnnouncement(id: number, input: AnnouncementInput): Promise<void> {
  await request("PUT", `/admin/announcements/${id}`, input);
}

export async function deleteAnnouncement(id: number): Promise<void> {
  await request("DELETE", `/admin/announcements/${id}`);
}

// ─────────────────────────────────────────────────────────────────────
// ÜYE YÖNETİMİ — cüzdan, rütbe/rol/sponsor, PV/CV (super_admin kilitli uçlar)
// ─────────────────────────────────────────────────────────────────────

export interface AdminWallet {
  id: number;
  user_id: number;
  balance: number;
  total_earned: number;
  total_withdrawn: number;
  chip_balance: number;
  blocked_balance: number;
  updated_at: string;
}

export interface WalletTransaction {
  id: number;
  user_id: number;
  amount: number;
  type: string;
  description?: string | null;
  created_at: string;
}

export async function getAdminWallet(
  userId: number
): Promise<{ wallet: AdminWallet | null; transactions: WalletTransaction[] }> {
  const d = await request<{ wallet: AdminWallet; transactions: WalletTransaction[] }>(
    "GET",
    `/admin/wallet/${userId}`
  );
  return { wallet: d.wallet ?? null, transactions: d.transactions ?? [] };
}

export async function adminWalletAdjust(input: {
  user_id: number;
  amount: number;
  action: "add" | "subtract" | "block" | "unblock";
  reason: string;
}): Promise<AdminWallet | null> {
  const d = await request<{ wallet: AdminWallet }>("POST", "/admin/wallet/adjust", input);
  return d.wallet ?? null;
}

export async function updateUserRank(id: number, rankId: number, reason = ""): Promise<void> {
  await request("PUT", `/admin/users/${id}/rank`, { rank_id: rankId, reason });
}

export async function updateUserRole(id: number, role: string, reason = ""): Promise<void> {
  await request("PUT", `/admin/users/${id}/role`, { role, reason });
}

export async function changeSponsor(id: number, sponsorId: number, reason = ""): Promise<void> {
  await request("PUT", `/admin/users/${id}/sponsor`, { sponsor_id: sponsorId, reason });
}

export async function adjustPVAndCV(
  id: number,
  input: { pv_left?: number; pv_right?: number; cv_left?: number; cv_right?: number; reason: string }
): Promise<void> {
  await request("POST", `/admin/users/${id}/adjust-pv-cv`, input);
}

// ─────────────────────────────────────────────────────────────────────
// DENETİM KAYITLARI (audit / correction)
// ─────────────────────────────────────────────────────────────────────

export interface AuditLogRow {
  id: number;
  admin_id: number | null;
  admin_name: string | null;
  action: string;
  target_type: string;
  target_id: number | null;
  reason: string | null;
  meta: unknown;
  created_at: string;
}

export interface AuditLogsResponse {
  logs: AuditLogRow[];
  total: number;
  limit: number;
  offset: number;
}

export async function listAuditLogs(params?: {
  limit?: number;
  offset?: number;
  action?: string;
}): Promise<AuditLogsResponse> {
  const qs = new URLSearchParams();
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  if (params?.action) qs.set("action", params.action);
  const q = qs.toString();
  return request<AuditLogsResponse>("GET", `/admin/audit-logs${q ? `?${q}` : ""}`);
}

export async function listCorrectionLogs(params?: {
  limit?: number;
  offset?: number;
}): Promise<AuditLogsResponse> {
  const qs = new URLSearchParams();
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  const q = qs.toString();
  return request<AuditLogsResponse>("GET", `/admin/correction-logs${q ? `?${q}` : ""}`);
}

// ─────────────────────────────────────────────────────────────────────
// AY SONU / İŞLER (jobs) / FLASHOUT LOGLARI
// ─────────────────────────────────────────────────────────────────────

export interface JobRun {
  id: number;
  job_type: string;
  status: string;
  progress: number;
  total: number;
  meta: unknown;
  error: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

export interface FlashoutLog {
  id: number;
  user_id: number;
  [k: string]: unknown;
}

export async function monthlyClose(): Promise<{ executed: boolean; message?: string }> {
  return request<{ executed: boolean; message?: string }>("POST", "/admin/monthly-close", {});
}

export async function listJobs(limit = 20): Promise<JobRun[]> {
  const d = await request<{ jobs: JobRun[] }>("GET", `/admin/jobs?limit=${limit}`);
  return d.jobs ?? [];
}

export async function getJob(id: number): Promise<JobRun | null> {
  const d = await request<{ job: JobRun }>("GET", `/admin/jobs/${id}`);
  return d.job ?? null;
}

export async function listFlashoutLogs(): Promise<FlashoutLog[]> {
  const d = await request<{ logs?: FlashoutLog[]; flashout_logs?: FlashoutLog[] }>(
    "GET",
    "/admin/flashout/logs"
  );
  return d.logs ?? d.flashout_logs ?? [];
}

// ─────────────────────────────────────────────────────────────────────
// BEKLEYEN HAVUZ (pending pool)
// ─────────────────────────────────────────────────────────────────────

export interface PendingUser {
  user_id: number;
  name?: string;
  member_code?: string;
  sponsor_id?: number | null;
  sponsor_name?: string | null;
  pending_since?: string | null;
  [k: string]: unknown;
}

export async function listPendingPool(): Promise<PendingUser[]> {
  const d = await request<{ pending_users: PendingUser[] }>("GET", "/admin/pending-pool");
  return d.pending_users ?? [];
}

export async function placePendingUser(input: {
  user_id: number;
  sponsor_id: number;
  position: "left" | "right";
}): Promise<void> {
  await request("POST", "/admin/pending-pool/place", input);
}

// ─────────────────────────────────────────────────────────────────────
// GÜVENLİK / FRAUD / BONUS
// ─────────────────────────────────────────────────────────────────────

export interface FraudGroup {
  key: string;
  count: number;
  members?: { id: number; name: string; member_code: string }[];
  [k: string]: unknown;
}

export async function fraudDuplicates(limit = 50): Promise<FraudGroup[]> {
  const d = await request<{ groups: FraudGroup[] }>(
    "GET",
    `/admin/fraud/duplicates?limit=${limit}`
  );
  return d.groups ?? [];
}

export async function fraudMatches(limit = 50): Promise<unknown[]> {
  const d = await request<{ matches?: unknown[] }>("GET", `/admin/fraud/matches?limit=${limit}`);
  return d.matches ?? [];
}

export async function fraudScan(): Promise<void> {
  await request("POST", "/admin/fraud/scan", {});
}

export async function simulateBonus(): Promise<unknown> {
  return request("POST", "/admin/bonus/simulate", {});
}

export async function runBonusJob(): Promise<{ job_id: number; status: string }> {
  return request<{ job_id: number; status: string }>("POST", "/admin/bonus/run", {});
}
