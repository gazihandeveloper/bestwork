import { api, API_URL } from "@/lib/api";

export { getErrorMessage } from "@/lib/api";

// Backend API fonksiyonları (Go backend: localhost:8080/api)

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  member_code: string;
  role: string;
  sponsor_id: number | null;
  parent_id: number | null;
  position: string | null;
  package_id: number | null;
  is_active: boolean;
  is_in_pending_pool: boolean;
  pending_since: string | null;
  current_rank_id: number | null;
  total_pv_left: number;
  total_pv_right: number;
  total_cv_left: number;
  total_cv_right: number;
  total_pv_accumulated: number;
  total_cv_accumulated: number;
  current_month_binary_earned: number;
  created_at: string;
}

export interface AuthResponse {
  user: User;
}

export interface Wallet {
  id: number;
  user_id: number;
  balance: number;
  total_earned: number;
  total_withdrawn: number;
  chip_balance: number;
  updated_at: string;
}

export interface Commission {
  id: number;
  user_id: number;
  from_user_id: number | null;
  type: "referral" | "binary" | "matching";
  amount: number;
  related_cv: number | null;
  status: string;
  created_at: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number | null;
  quantity: number;
  price: number;
  pv: number;
  cv: number;
}

export interface Order {
  id: number;
  user_id: number;
  total_amount: number;
  total_pv: number;
  total_cv: number;
  status: string;
  payment_method: string;
  created_at: string;
  items: OrderItem[];
}

export interface Product {
  id: number;
  name: string;
  price: number;
  pv: number;
  cv: number;
  stock: number;
  description: string | null;
  image_path: string | null;
  category: string | null;
  category_id?: number | null;
  category_name?: string | null;
  sku: string | null;
  created_at?: string;
}

// Kategoriler (shop filtresi; GET /categories yalnızca is_active=true döner)
export interface Category {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface PopularProduct extends Product {
  sold_quantity: number;
}

export interface WithdrawRequest {
  id: number;
  user_id: number;
  amount: number;
  method: string | null;
  status: "pending" | "approved" | "rejected";
  requested_at: string;
  processed_at: string | null;
}

export interface UserDashboard {
  user: { id: number; name: string; email: string; member_code: string; package: string | null; rank: string | null };
  wallet: Wallet;
  total_referral_earnings: number;
  total_binary_earnings: number;
  total_matching_earnings: number;
  total_retail_earnings: number;
  monthly_earned: number;
  monthly_matched_cv: number;
  leg_cv_left_total: number;
  leg_cv_right_total: number;
  monthly_match_count: number;
  left_team_count: number;
  right_team_count: number;
  left_pv: number;
  right_pv: number;
  left_cv: number;
  right_cv: number;
  recent_commissions: Commission[];
  recent_orders: Order[];
  current_rank: { id: number; name: string; monthly_binary_limit: number } | null;
  current_package: { id: number; name: string } | null;
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
  recent_users: User[];
  recent_withdraw_requests: WithdrawRequest[];
}

export interface TreeNode {
  user_id: number;
  name: string;
  member_code: string;
  position: string | null;
  package: string | null;
  rank: string | null;
  image_path: string | null;
  total_pv_accumulated: number;
  total_cv_accumulated: number;
  total_pv_left: number;
  total_pv_right: number;
  total_cv_left: number;
  total_cv_right: number;
  is_active: boolean;
  role: string;
  left_child: TreeNode | null;
  right_child: TreeNode | null;
}

/** UserInfoCard ağaç kartındaki "i" bilgi modalı için kullanıcı detayıdır. */
export interface UserInfoCard {
  user_id: number;
  name: string;
  member_code: string;
  rank: string | null;
  package: string | null;
  is_active: boolean;
  position: string | null;
  sponsor_name: string | null;
  wallet_balance: number;
  chip_balance: number;
  total_pv_left: number;
  total_pv_right: number;
  total_cv_left: number;
  total_cv_right: number;
  left_team_count: number;
  right_team_count: number;
  total_team_count: number;
}

// Auth
export async function loginUser(login: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/auth/login", { login, password });
  return data;
}

export async function registerUser(
  name: string,
  email: string,
  password: string,
  sponsorIdentifier?: string,
  role?: "user" | "customer",
  phone?: string,
  profile?: Record<string, unknown>,
): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/auth/register", {
    name,
    email,
    password,
    sponsor_identifier: sponsorIdentifier || "",
    role: role || "user",
    phone: phone || "",
    profile: profile || {},
  });
  return data;
}

export async function logoutUser(): Promise<void> {
  await api.post("/auth/logout");
}

// Referans kodu sistemde var mı kontrol eder (kayıt öncesi).
export async function checkReferral(code: string): Promise<{ found: boolean; name?: string; member_code?: string }> {
  try {
    const { data } = await api.get<{ found: boolean; name?: string; member_code?: string }>(
      "/referral/check",
      { params: { code } },
    );
    return data;
  } catch {
    return { found: false };
  }
}

export async function getMe(): Promise<User> {
  const { data } = await api.get<{ user: User }>("/user/me");
  return data.user;
}

// Herkese açık sessiz oturum kontrolü — 401 fırlatmaz; authenticated:false döner.
export async function getSessionStatus(): Promise<{ authenticated: boolean; user: User | null }> {
  const { data } = await api.get<{ authenticated: boolean; user: User | null }>("/user/me/status");
  return data;
}

// Üye kodundan kullanıcının temel bilgilerini getirir (ağaçta arama/navigasyon için).
export async function lookupUserByCode(code: string): Promise<{ id: number; name: string; member_code: string }> {
  const { data } = await api.get<{ user: { id: number; name: string; member_code: string } }>("/user/lookup", {
    params: { code },
  });
  return data.user;
}

// Ağaç kartındaki "i" modalı için kullanıcı detayını getirir.
export async function getUserCard(userId: number): Promise<UserInfoCard> {
  const { data } = await api.get<{ card: UserInfoCard }>("/user/card", { params: { id: userId } });
  return data.card;
}

// Profil (JSONB) ve profil görseli
export async function getProfile(): Promise<Record<string, unknown>> {
  const { data } = await api.get<{ profile: Record<string, unknown> }>("/user/profile");
  return data.profile;
}

export async function updateProfileImage(imagePath: string): Promise<void> {
  await api.put("/user/profile-image", { image_path: imagePath });
}

// Giriş tanımlayıcısına göre tema rengi (login modalı önizlemesi)
export async function getThemeByLogin(login: string): Promise<{ theme_color: string | null }> {
  const { data } = await api.get<{ theme_color: string | null }>("/theme", { params: { login } });
  return data;
}

// Tema rengini DB'ye kaydeder
export async function updateThemeColor(color: string): Promise<void> {
  await api.put("/user/theme", { color });
}

// Dashboard
export async function getDashboard(): Promise<UserDashboard> {
  const { data } = await api.get<{ dashboard: UserDashboard }>("/dashboard");
  return data.dashboard;
}

export async function getAdminDashboard(): Promise<AdminDashboard> {
  const { data } = await api.get<{ dashboard: AdminDashboard }>("/admin/dashboard");
  return data.dashboard;
}

// Siparişler
export async function getOrders(): Promise<Order[]> {
  const { data } = await api.get<{ orders: Order[] }>("/orders");
  return data.orders;
}

export async function createOrder(
  items: { product_id: number; quantity: number }[],
  paymentMethod = "eft_havale"
): Promise<Order> {
  const { data } = await api.post<{ order: Order }>("/orders", { items, payment_method: paymentMethod });
  return data.order;
}

// Ödeme bildirimleri (EFT/HAVALE)
export interface PaymentNotification {
  id: number;
  user_id: number;
  order_id: number | null;
  amount: number;
  bank_name: string | null;
  reference_no: string | null;
  note: string | null;
  file_path: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  processed_at: string | null;
  processed_by: number | null;
}

export async function createPaymentNotification(payload: {
  order_id?: number | null;
  amount: number;
  bank_name?: string;
  reference_no?: string;
  note?: string;
  file_path?: string;
}): Promise<PaymentNotification> {
  const { data } = await api.post<{ payment_notification: PaymentNotification }>("/payment-notifications", payload);
  return data.payment_notification;
}

export async function listPaymentNotifications(params?: { limit?: number; offset?: number }) {
  const { data } = await api.get<{ payment_notifications: PaymentNotification[]; total: number }>(
    "/payment-notifications",
    { params }
  );
  return data;
}

export async function listAdminPaymentNotifications(params?: { limit?: number; offset?: number }) {
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

// Dosya yükleme (dekont)
export async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post<{ file_path: string }>("/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.file_path;
}

// Bekleyenler havuzu
export interface PendingPoolEntry {
  user: User;
  sponsor_id: number | null;
  sponsor_name: string | null;
  sponsor_member_code: string | null;
}

export async function listPendingUsers(): Promise<User[]> {
  const { data } = await api.get<{ pending_users: User[] }>("/pending-pool");
  return data.pending_users;
}

export async function placePendingUser(userId: number, position: "L" | "R"): Promise<void> {
  await api.post("/pending-pool/place", { user_id: userId, position });
}

// Boş bacağa üye koduyla yerleştirir
export async function placePendingByCode(code: string, parentId: number, position: "L" | "R"): Promise<User> {
  const { data } = await api.post<{ user: User; message: string }>("/pending-pool/place-by-code", {
    code,
    parent_id: parentId,
    position,
  });
  return data.user;
}

export async function listAdminPendingPool(): Promise<PendingPoolEntry[]> {
  const { data } = await api.get<{ pending_users: PendingPoolEntry[] }>("/admin/pending-pool");
  return data.pending_users;
}

export async function placePendingUserByAdmin(userId: number, sponsorId: number, position: "L" | "R"): Promise<void> {
  await api.post("/admin/pending-pool/place", { user_id: userId, sponsor_id: sponsorId, position });
}

// Ağaç
export interface TreeResult {
  tree: TreeNode;
  min_month: string | null;
}

export async function getTree(userId: number, depth = 3, period?: string): Promise<TreeResult> {
  const params: Record<string, unknown> = { user_id: userId, depth };
  if (period) params.month = period;
  const { data } = await api.get<{ tree: TreeNode; min_month: string | null }>("/tree", { params });
  return { tree: data.tree, min_month: data.min_month ?? null };
}

// Cüzdan
export async function createWithdrawRequest(amount: number, method: string): Promise<WithdrawRequest> {
  const { data } = await api.post<{ withdraw_request: WithdrawRequest }>("/wallet/withdraw", { amount, method });
  return data.withdraw_request;
}

// Ürünler
export async function listProducts(params?: { q?: string }): Promise<Product[]> {
  const { data } = await api.get<{ products: Product[] }>("/products", { params });
  return data.products;
}

export async function getProduct(id: number): Promise<Product> {
  const { data } = await api.get<{ product: Product }>(`/products/${id}`);
  return data.product;
}

// Aktif kategoriler (public). sort_order'a göre sıralanmış döner.
export async function listCategories(): Promise<Category[]> {
  const { data } = await api.get<{ categories: Category[] }>("/categories");
  return data.categories;
}

// Son N günde en çok satın alınan ürünler
export async function listPopularProducts(limit = 3, days = 7): Promise<PopularProduct[]> {
  const { data } = await api.get<{ products: PopularProduct[] }>("/products/popular", {
    params: { limit, days },
  });
  return data.products;
}

export async function createProduct(payload: {
  name: string;
  price: number;
  pv: number;
  cv: number;
  stock: number;
  description?: string;
  category?: string;
}): Promise<Product> {
  const { data } = await api.post<{ product: Product }>("/products", payload);
  return data.product;
}

export async function deleteProduct(id: number): Promise<void> {
  await api.delete(`/products/${id}`);
}

// Hero slider (anasayfa)
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

export async function listHeroSlides(): Promise<HeroSlide[]> {
  const { data } = await api.get<{ hero_slides: HeroSlide[] }>("/hero-slides");
  return data.hero_slides;
}

export async function listAdminHeroSlides(): Promise<HeroSlide[]> {
  const { data } = await api.get<{ hero_slides: HeroSlide[] }>("/admin/hero-slides");
  return data.hero_slides;
}

export async function createHeroSlide(payload: {
  title: string;
  subtitle?: string;
  image_path: string;
  link?: string;
  sort_order: number;
  is_active: boolean;
}): Promise<HeroSlide> {
  const { data } = await api.post<{ hero_slide: HeroSlide }>("/admin/hero-slides", payload);
  return data.hero_slide;
}

export async function updateHeroSlide(
  id: number,
  payload: {
    title: string;
    subtitle?: string;
    image_path: string;
    link?: string;
    sort_order: number;
    is_active: boolean;
  },
): Promise<HeroSlide> {
  const { data } = await api.put<{ hero_slide: HeroSlide }>(`/admin/hero-slides/${id}`, payload);
  return data.hero_slide;
}

export async function deleteHeroSlide(id: number): Promise<void> {
  await api.delete(`/admin/hero-slides/${id}`);
}

// Yüklenen dosyanın (uploads/) erişilebilir URL'ini üretir.
export function fileUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  const base = API_URL.replace(/\/api\/?$/, "");
  return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
}

// Avantaj kartları (anasayfa)
export interface Benefit {
  id: number;
  title: string;
  description: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export async function listBenefits(): Promise<Benefit[]> {
  const { data } = await api.get<{ benefits: Benefit[] }>("/benefits");
  return data.benefits;
}

export async function listAdminBenefits(): Promise<Benefit[]> {
  const { data } = await api.get<{ benefits: Benefit[] }>("/admin/benefits");
  return data.benefits;
}

export async function createBenefit(payload: {
  title: string;
  description: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
}): Promise<Benefit> {
  const { data } = await api.post<{ benefit: Benefit }>("/admin/benefits", payload);
  return data.benefit;
}

export async function updateBenefit(
  id: number,
  payload: {
    title: string;
    description: string;
    icon: string;
    sort_order: number;
    is_active: boolean;
  },
): Promise<Benefit> {
  const { data } = await api.put<{ benefit: Benefit }>(`/admin/benefits/${id}`, payload);
  return data.benefit;
}

export async function deleteBenefit(id: number): Promise<void> {
  await api.delete(`/admin/benefits/${id}`);
}

// Site ayarları (kurumsal içerik vb.)
export async function getSettings(): Promise<Record<string, string>> {
  const { data } = await api.get<{ settings: Record<string, string> }>("/settings");
  return data.settings;
}

export async function saveSettings(settings: Record<string, string>): Promise<void> {
  await api.put("/admin/settings", { settings });
}

// Çekim talepleri (admin)
export async function listWithdrawals(): Promise<WithdrawRequest[]> {
  const { data } = await api.get<{ withdraw_requests: WithdrawRequest[] }>("/admin/withdrawals");
  return data.withdraw_requests;
}

export async function approveWithdrawal(id: number): Promise<void> {
  await api.post(`/admin/withdrawals/${id}/approve`);
}

export async function rejectWithdrawal(id: number): Promise<void> {
  await api.post(`/admin/withdrawals/${id}/reject`);
}

// Aylık kapanış (admin)
export async function monthlyClose(): Promise<void> {
  await api.post("/admin/monthly-close");
}

// Banka hesapları
export interface BankAccount {
  id: number;
  user_id: number;
  bank_name: string;
  iban: string;
  account_name: string;
  is_active: boolean;
  created_at: string;
}

export async function listBankAccounts(): Promise<BankAccount[]> {
  const { data } = await api.get<{ bank_accounts: BankAccount[] }>("/bank-accounts");
  return data.bank_accounts;
}

export async function createBankAccount(payload: {
  bank_name: string;
  iban: string;
  account_name: string;
}): Promise<BankAccount> {
  const { data } = await api.post<{ bank_account: BankAccount }>("/bank-accounts", payload);
  return data.bank_account;
}

export async function updateBankAccount(id: number, payload: { bank_name: string; iban: string; account_name: string }): Promise<void> {
  await api.put(`/bank-accounts/${id}`, payload);
}

export async function deleteBankAccount(id: number): Promise<void> {
  await api.delete(`/bank-accounts/${id}`);
}

// Varis bilgileri
export interface Beneficiary {
  id: number;
  user_id: number;
  full_name: string;
  relationship: string;
  phone: string | null;
  email: string | null;
  created_at: string;
}

export async function listBeneficiaries(): Promise<Beneficiary[]> {
  const { data } = await api.get<{ beneficiaries: Beneficiary[] }>("/beneficiaries");
  return data.beneficiaries;
}

export async function createBeneficiary(payload: {
  full_name: string;
  relationship: string;
  phone?: string;
  email?: string;
}): Promise<Beneficiary> {
  const { data } = await api.post<{ beneficiary: Beneficiary }>("/beneficiaries", payload);
  return data.beneficiary;
}

export async function deleteBeneficiary(id: number): Promise<void> {
  await api.delete(`/beneficiaries/${id}`);
}

// Şifre değiştir
export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  await api.post("/auth/change-password", { old_password: oldPassword, new_password: newPassword });
}

// İletişim (ticket)
export interface Ticket {
  id: number;
  user_id: number | null;
  name: string;
  surname: string;
  phone: string;
  message: string;
  status: string;
  created_at: string;
}

export async function createTicket(payload: {
  name: string;
  surname: string;
  phone: string;
  message: string;
}): Promise<Ticket> {
  const { data } = await api.post<{ ticket: Ticket }>("/tickets", payload);
  return data.ticket;
}

// Sponsor olduklarım
export async function listSponsored(): Promise<User[]> {
  const { data } = await api.get<{ users: User[] }>("/user/sponsored");
  return data.users;
}

// Kariyer takibi
export interface CareerProgress {
  rank_id: number;
  rank_name: string;
  achieved_at: string;
  is_active: boolean;
}

export async function listCareer(): Promise<CareerProgress[]> {
  const { data } = await api.get<{ career: CareerProgress[] }>("/user/career");
  return data.career;
}

// Rütbeler (kariyer seviyeleri)
export interface Rank {
  id: number;
  name: string;
  required_left_pv: number;
  required_right_pv: number;
  monthly_binary_limit: number;
}

export async function getRanks(): Promise<Rank[]> {
  const { data } = await api.get<{ ranks: Rank[] }>("/ranks");
  return data.ranks;
}

// Liderlik (matching) primleri
export async function listLeadershipBonuses(limit = 20, offset = 0): Promise<{ commissions: Commission[]; total: number }> {
  const { data } = await api.get<{ commissions: Commission[]; total: number }>("/commissions", {
    params: { type: "matching", limit, offset },
  });
  return data;
}

// Perakende (müşteri) kazançları
export interface RetailEarningItem {
  commission_id: number;
  customer_id: number;
  customer_name: string;
  customer_member_code: string;
  order_id: number | null;
  order_amount: number | null;
  related_cv: number | null;
  amount: number;
  created_at: string;
}

export interface RetailSummary {
  total_amount: number;
  order_count: number;
  total_cv: number;
}

export interface RetailEarningsResponse {
  summary: RetailSummary;
  items: RetailEarningItem[];
  total: number;
  limit: number;
  offset: number;
}

export async function getRetailEarnings(params?: {
  month?: string;
  limit?: number;
  offset?: number;
}): Promise<RetailEarningsResponse> {
  const { data } = await api.get<RetailEarningsResponse>("/retail-earnings", { params });
  return data;
}

// Binary hareketleri
export interface BinaryTransaction {
  id: number;
  user_id: number;
  position: "L" | "R";
  transaction_type: "add" | "deduct" | "reset";
  pv: number;
  cv: number;
  description: string | null;
  related_order_id: number | null;
  created_at: string;
}

export interface BinaryTransactionsResponse {
  transactions: BinaryTransaction[];
  total: number;
  limit: number;
  offset: number;
}

export async function listBinaryTransactions(params?: {
  position?: "L" | "R";
  transaction_type?: "add" | "deduct" | "reset";
  limit?: number;
  offset?: number;
}): Promise<BinaryTransactionsResponse> {
  const { data } = await api.get<BinaryTransactionsResponse>("/binary-transactions", { params });
  return data;
}

// Sponsorluk ağacı
export interface SponsorTreeNode {
  user_id: number;
  name: string;
  email: string;
  member_code: string;
  role: string;
  package_id: number | null;
  package_name: string;
  is_active: boolean;
  is_in_pending_pool: boolean;
  total_pv_accumulated: number;
  child_count: number;
  children: SponsorTreeNode[];
}

export async function getSponsorTree(userId?: number, depth?: number): Promise<SponsorTreeNode> {
  const { data } = await api.get<{ tree: SponsorTreeNode }>("/sponsor-tree", {
    params: { user_id: userId, depth },
  });
  return data.tree;
}
