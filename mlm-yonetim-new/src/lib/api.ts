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
}

export async function getTicket(id: number): Promise<Ticket> {
  const data = await request<{ ticket: Ticket }>("GET", `/admin/tickets/${id}`);
  return data.ticket;
}

export async function replyTicket(id: number, message: string): Promise<Ticket> {
  const data = await request<{ ticket: Ticket }>("POST", `/admin/tickets/${id}/reply`, { message });
  return data.ticket;
}

export async function listTickets(): Promise<Ticket[]> {
  const data = await request<{ tickets: Ticket[] }>("GET", "/admin/tickets");
  return data.tickets;
}

export async function resolveTicket(id: number): Promise<void> {
  await request("POST", `/admin/tickets/${id}/resolve`);
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
