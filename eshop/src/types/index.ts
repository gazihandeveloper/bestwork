// ============================================
// BestWork - Tip Tanımlamaları
// ============================================

/** API yanıt formatı */
export interface ApiResponse<T = unknown> {
  success: boolean
  data: T
  error?: string
  message?: string
}

/** Sayfalama */
export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

/** Sayfalı yanıt */
export interface PaginatedResponse<T> {
  items: T[]
  pagination: Pagination
}

// ============================================
// Ürün
// ============================================
export interface Product {
  id: number
  name: string
  slug: string
  description: string
  price: number // cent (2999 = 29.99 TL)
  comparePrice?: number // cent
  costPrice?: number // cent (admin için)
  images: string[]
  thumbnail: string
  categoryId: number
  category?: Category
  brandId?: number
  brand?: Brand
  stock: number
  sku: string
  barcode?: string
  weight?: number
  unit?: string
  tags: string[]
  rating: number
  reviewCount: number
  isActive: boolean
  isFeatured: boolean
  seoTitle?: string
  seoDescription?: string
  createdAt: string
  updatedAt: string
}

/** Sepet ürünü */
export interface CartItem {
  id: number
  productId: number
  product: Product
  quantity: number
  price: number // sepete eklenme anındaki fiyat
}

/** Sepet */
export interface Cart {
  id: number
  userId?: number
  sessionId?: string
  items: CartItem[]
  subtotal: number
  discount?: number
  total: number
  couponCode?: string
  couponDiscount?: number
}

// ============================================
// Kategori & Marka
// ============================================
export interface Category {
  id: number
  name: string
  slug: string
  description?: string
  image?: string
  parentId?: number
  children?: Category[]
  productCount?: number
  isActive: boolean
}

export interface Brand {
  id: number
  name: string
  slug: string
  logo?: string
  description?: string
  productCount?: number
  isActive: boolean
}

// ============================================
// Sipariş
// ============================================
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded'

export interface OrderItem {
  id: number
  productId: number
  productName: string
  productImage: string
  quantity: number
  price: number
  total: number
}

export interface Order {
  id: number
  orderNumber: string
  userId: number
  status: OrderStatus
  items: OrderItem[]
  subtotal: number
  shipping: number
  discount: number
  total: number
  couponCode?: string
  couponDiscount?: number
  shippingAddress: Address
  billingAddress?: Address
  paymentMethod: string
  paymentStatus: string
  notes?: string
  trackingNumber?: string
  created_at?: string
  createdAt?: string
  updated_at?: string
  updatedAt?: string
}

// ============================================
// Adres
// ============================================
export interface Address {
  id: number
  userId: number
  title: string
  fullName: string
  phone: string
  city: string
  district: string
  neighborhood?: string
  street: string
  address: string
  zipCode?: string
  isDefault: boolean
  createdAt: string
}

// ============================================
// Kullanıcı
// ============================================
export interface User {
  id: string
  email: string
  first_name?: string
  last_name?: string
  fullName?: string
  phone?: string
  avatar_url?: string
  role: 'customer' | 'admin'
  isActive?: boolean
  created_at?: string
  updated_at?: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

// ============================================
// Cüzdan
// ============================================
export interface Wallet {
  id: number
  userId: number
  balance: number // cent
  totalEarned: number
  totalWithdrawn: number
  createdAt: string
  updatedAt: string
}

export type WalletTransactionType =
  | 'commission'
  | 'referral'
  | 'withdrawal'
  | 'refund'
  | 'bonus'
  | 'adjustment'

export type WalletTransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled'

export interface WalletTransaction {
  id: number
  walletId: number
  type: WalletTransactionType
  amount: number
  balanceBefore: number
  balanceAfter: number
  description: string
  status: WalletTransactionStatus
  referenceId?: number
  referenceType?: string
  created_at?: string
  createdAt?: string
}

// ============================================
// Admin Dashboard
// ============================================
export interface DashboardStats {
  total_orders: number
  total_revenue: number
  total_customers: number
  pending_orders: number
  total_products: number
  daily_orders: number
  monthly_revenue: number
  pendingOrders?: number
  totalOrders?: number
  totalRevenue?: number
  totalProducts?: number
  totalUsers?: number
  dailyOrders?: number
  monthlyRevenue?: number
  recent_orders?: { id: string; orderNumber: string; status: string; total: number; created_at: string }[]
  recentOrders?: Order[]
  top_products?: { id: string; name: string; price: number }[]
  topProducts?: Product[]
}
