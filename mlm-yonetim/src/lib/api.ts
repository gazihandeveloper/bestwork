import axios from "axios";

// İzole yönetim paneli API istemcisi — BestWork canlı backend'ine bağlanır.
// Yerel geliştirmede /api → canlı API'ye proxy'lenir (next.config rewrites).
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "development" ? "/bestmanager/api" : "https://mahmutgazihanarslan.com.tr/api");

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json", "X-CSRF-Protection": "1" },
});

// Oturum sona erdiğinde (401) kullanıcıyı giriş ekranına döndür.
// /auth/login ve /user/me hariç: login başarısızlığı normaldir, /user/me ise
// girişsizken beklenen yanıttır (AuthGuard giriş ekranını gösterir).
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (
      axios.isAxiosError(err) &&
      err.response?.status === 401 &&
      typeof window !== "undefined" &&
      !err.config?.url?.includes("/auth/login") &&
      !err.config?.url?.includes("/user/me")
    ) {
      window.location.href = "/bestmanager/";
    }
    return Promise.reject(err);
  }
);

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: string } | undefined;
    return data?.error || error.message || "Beklenmeyen bir hata oluştu";
  }
  return "Beklenmeyen bir hata oluştu";
}

// ── Tipler ────────────────────────────────────────────────────────────────
export interface AdminUser {
  id: number;
  name: string;
  email: string;
  member_code: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface WithdrawRequest {
  id: number;
  user_id: number;
  amount: number;
  status: string;
  requested_at: string;
}

export interface AdminDashboard {
  total_users: number;
  active_users: number;
  pending_users: number;
  total_orders: number;
  total_revenue: number;
  total_commissions_paid: number;
  total_withdrawals: number;
  monthly_commissions: number;
  pending_commissions: number;
  net_profit: number;
  registration_growth: { date: string; count: number }[];
  recent_users: AdminUser[];
  recent_withdraw_requests: WithdrawRequest[];
}

// ── API çağrıları ─────────────────────────────────────────────────────────
export async function getMe(): Promise<AdminUser> {
  const { data } = await api.get<{ user: AdminUser }>("/user/me");
  return data.user;
}

export async function loginUser(login: string, password: string): Promise<AdminUser> {
  const { data } = await api.post<{ user: AdminUser }>("/auth/login", { login, password });
  return data.user;
}

export async function logoutUser(): Promise<void> {
  await api.post("/auth/logout");
}

export async function getAdminDashboard(): Promise<AdminDashboard> {
  const { data } = await api.get<{ dashboard: AdminDashboard }>("/admin/dashboard");
  return data.dashboard;
}

export async function listWithdrawals(): Promise<WithdrawRequest[]> {
  const { data } = await api.get<{ withdraw_requests?: WithdrawRequest[]; withdrawals?: WithdrawRequest[] }>("/admin/withdrawals");
  return data.withdraw_requests ?? data.withdrawals ?? [];
}

export async function monthlyClose(): Promise<void> {
  await api.post("/admin/monthly-close");
}

// Dönem bazlı ciro serisi (canlı: GET /admin/revenue?period=)
export interface RevenuePoint {
  date: string;
  revenue: number;
}

export async function getAdminRevenue(
  period: "daily" | "weekly" | "monthly",
  limit = 12
): Promise<RevenuePoint[]> {
  const { data } = await api.get<{ points: RevenuePoint[] }>("/admin/revenue", {
    params: { period, limit },
  });
  return data.points ?? [];
}

// ── Dashboard ek verileri (canlı) ────────────────────────────────────────
export async function getCommissionSeries(
  period: "daily" | "weekly" | "monthly",
  limit = 12
): Promise<RevenuePoint[]> {
  const { data } = await api.get<{ points: RevenuePoint[] }>("/admin/commissions-series", {
    params: { period, limit },
  });
  return data.points ?? [];
}

export interface RankDist {
  rank_name: string;
  count: number;
}

export async function getRankDistribution(): Promise<RankDist[]> {
  const { data } = await api.get<{ distribution: RankDist[] }>("/admin/rank-distribution");
  return data.distribution ?? [];
}

export interface TopProduct {
  name: string;
  quantity: number;
  revenue: number;
}

export async function getTopProducts(limit = 5): Promise<TopProduct[]> {
  const { data } = await api.get<{ products: TopProduct[] }>("/admin/top-products", {
    params: { limit },
  });
  return data.products ?? [];
}

export interface FraudDuplicate {
  field: string;
  value: string;
  count: number;
  accounts: number[];
}

export async function getFraudDuplicates(limit = 8): Promise<FraudDuplicate[]> {
  const { data } = await api.get<{ groups: FraudDuplicate[] }>("/admin/fraud/duplicates", {
    params: { limit },
  });
  return data.groups ?? [];
}

// ── Hızlı aksiyonlar ────────────────────────────────────────────────────
export async function approveWithdrawal(id: number): Promise<void> {
  await api.post(`/admin/withdrawals/${id}/approve`);
}

export async function rejectWithdrawal(id: number): Promise<void> {
  await api.post(`/admin/withdrawals/${id}/reject`);
}

export interface TopEarner {
  user_id: number;
  name: string;
  member_code: string;
  total_earned: number;
  recent_earned: number;
}

export async function listTopEarners(limit = 5): Promise<TopEarner[]> {
  const { data } = await api.get<{ earners: TopEarner[] }>("/admin/top-earners", { params: { limit } });
  return data.earners ?? [];
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
}

export async function listProducts(): Promise<Product[]> {
  const { data } = await api.get<{ products: Product[] }>("/products", { params: { limit: 200 } });
  return data.products ?? [];
}

export interface JobInfo {
  id: number;
  status: "queued" | "running" | "completed" | "failed";
  progress: number;
  total: number;
  error?: string | null;
}

export async function runBonusJob(period: "daily" | "weekly" | "monthly"): Promise<number> {
  const { data } = await api.post<{ job_id?: number }>("/admin/bonus/run", { period });
  if (!data.job_id) throw new Error("İş kimliği alınamadı");
  return data.job_id;
}

export async function getJob(jobId: number): Promise<JobInfo> {
  const { data } = await api.get<{ job: JobInfo }>(`/admin/jobs/${jobId}`);
  return data.job;
}

// ── Slider Yönetimi (hero-slides) ────────────────────────────────────────
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

export async function uploadFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const { data } = await api.post<{ file_path: string }>("/upload", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.file_path;
}

export async function listHeroSlides(): Promise<HeroSlide[]> {
  const { data } = await api.get<{ hero_slides: HeroSlide[] }>("/admin/hero-slides");
  return data.hero_slides ?? [];
}

export async function createHeroSlide(input: HeroSlideInput): Promise<HeroSlide> {
  const { data } = await api.post<{ hero_slide: HeroSlide }>("/admin/hero-slides", input);
  return data.hero_slide;
}

export async function updateHeroSlide(id: number, input: HeroSlideInput): Promise<HeroSlide> {
  const { data } = await api.put<{ hero_slide: HeroSlide }>(`/admin/hero-slides/${id}`, input);
  return data.hero_slide;
}

export async function deleteHeroSlide(id: number): Promise<void> {
  await api.delete(`/admin/hero-slides/${id}`);
}

// ── Güvenlik Şeridi (benefits) ───────────────────────────────────────────
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
  const { data } = await api.get<{ benefits: Benefit[] }>("/admin/benefits");
  return data.benefits ?? [];
}

export async function createBenefit(input: BenefitInput): Promise<Benefit> {
  const { data } = await api.post<{ benefit: Benefit }>("/admin/benefits", input);
  return data.benefit;
}

export async function updateBenefit(id: number, input: BenefitInput): Promise<Benefit> {
  const { data } = await api.put<{ benefit: Benefit }>(`/admin/benefits/${id}`, input);
  return data.benefit;
}

export async function deleteBenefit(id: number): Promise<void> {
  await api.delete(`/admin/benefits/${id}`);
}

// ── Kategoriler (categories) ──────────────────────────────────────────────
export interface Category {
  id: number;
  name: string;
  slug: string;
  icon: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface CategoryInput {
  name: string;
  slug?: string;
  icon?: string;
  description?: string;
  sort_order?: number;
  is_active?: boolean;
}

// Public: yalnızca is_active=true döner; all=true ise tümü (yönetim için).
export async function listCategories(all = false): Promise<Category[]> {
  const { data } = await api.get<{ categories: Category[] }>("/categories", all ? { params: { all: 1 } } : undefined);
  return data.categories ?? [];
}

export async function createCategory(input: CategoryInput): Promise<Category> {
  const { data } = await api.post<{ category: Category }>("/admin/categories", input);
  return data.category;
}

export async function updateCategory(id: number, input: CategoryInput): Promise<Category> {
  const { data } = await api.put<{ category: Category }>(`/admin/categories/${id}`, input);
  return data.category;
}

export async function deleteCategory(id: number): Promise<void> {
  await api.delete(`/admin/categories/${id}`);
}

// ── Ayarlar (settings key/value) ──────────────────────────────────────────
export async function getSettings(): Promise<Record<string, string>> {
  const { data } = await api.get<{ settings: Record<string, string> }>("/settings");
  return data.settings ?? {};
}

export async function updateSettings(settings: Record<string, string>): Promise<void> {
  await api.put("/admin/settings", { settings });
}

// ── Seviyeler (rütbeler) ───────────────────────────────────────────────────
export interface Rank {
  id: number;
  name: string;
  required_left_pv: number;
  required_right_pv: number;
  monthly_binary_limit: number;
  required_downline_rank_id?: number | null;
  required_downline_count?: number;
  personal_activity_pv?: number;
  created_at?: string;
}

export interface RankInput {
  name: string;
  required_left_pv: number;
  required_right_pv: number;
  monthly_binary_limit: number;
  required_downline_rank_id?: number | null;
  required_downline_count?: number;
  personal_activity_pv?: number;
}

export async function listRanks(): Promise<Rank[]> {
  const { data } = await api.get<{ ranks: Rank[] }>("/admin/ranks");
  return data.ranks ?? [];
}

export async function createRank(input: RankInput): Promise<Rank> {
  const { data } = await api.post<{ rank: Rank }>("/admin/ranks", input);
  return data.rank;
}

export async function updateRank(id: number, input: RankInput): Promise<Rank> {
  const { data } = await api.put<{ rank: Rank }>(`/admin/ranks/${id}`, input);
  return data.rank;
}

export async function deleteRank(id: number): Promise<void> {
  await api.delete(`/admin/ranks/${id}`);
}

// ── Siparişler ────────────────────────────────────────────────────────────
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

export async function listAdminOrders(params?: {
  limit?: number;
  offset?: number;
  status?: string;
  type?: string;
  q?: string;
}): Promise<AdminOrdersResponse> {
  const { data } = await api.get<AdminOrdersResponse>("/admin/orders", { params });
  return data;
}

export async function updateOrderStatus(
  id: number,
  status: string,
  trackingCode?: string,
  note?: string
): Promise<void> {
  await api.put(`/admin/orders/${id}/status`, { status, tracking_code: trackingCode, note });
}

// ── Ödeme bildirimleri (EFT/kart onayı) ────────────────────────────────────
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

export async function listAdminPaymentNotifications(params?: {
  limit?: number;
  offset?: number;
}): Promise<{ payment_notifications: PaymentNotification[]; total: number }> {
  const { data } = await api.get<{ payment_notifications: PaymentNotification[]; total: number }>(
    "/admin/payment-notifications",
    { params }
  );
  return data;
}

export async function approvePaymentNotification(id: number): Promise<void> {
  await api.post(`/admin/payment-notifications/${id}/approve`);
}

export async function rejectPaymentNotification(id: number): Promise<void> {
  await api.post(`/admin/payment-notifications/${id}/reject`);
}
