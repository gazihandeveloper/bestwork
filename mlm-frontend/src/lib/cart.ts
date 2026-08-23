import type { Product } from "@/services/api";

export interface CartItem {
  product: Product;
  quantity: number;
}

const CART_KEY = "bestwork_cart";

function safeParse(raw: string | null): CartItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// localStorage'dan sepeti yükler (SSR güvenli).
export function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  return safeParse(window.localStorage.getItem(CART_KEY));
}

export function saveCart(items: CartItem[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("cart-updated"));
}

// Sepetteki toplam ürün adedini döndürür.
export function cartCount(): number {
  return loadCart().reduce((sum, c) => sum + c.quantity, 0);
}

// Ürünü sepete ekler; aynı ürün varsa adet toplanır (stok sınırıyla).
export function addToCartStorage(product: Product, quantity: number): CartItem[] {
  const items = loadCart();
  const qty = Math.max(1, Math.min(quantity, product.stock));
  const existing = items.find((c) => c.product.id === product.id);
  if (existing) {
    existing.quantity = Math.min(existing.quantity + qty, product.stock);
  } else {
    items.push({ product, quantity: qty });
  }
  saveCart(items);
  return items;
}

// Sepetteki ürünün adedini 1 azaltır (0 olursa çıkarır).
export function decrementCart(productId: number): CartItem[] {
  const items = loadCart()
    .map((c) => (c.product.id === productId ? { ...c, quantity: c.quantity - 1 } : c))
    .filter((c) => c.quantity > 0);
  saveCart(items);
  return items;
}
