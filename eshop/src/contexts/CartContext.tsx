// ============================================
// BestWork - Sepet Context (BestWork: localStorage tabanlı)
// ============================================
'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import type { Cart, CartItem, Product } from '@/types'
import toast from 'react-hot-toast'

const CART_KEY = 'hb_cart_bw'

interface CartContextType {
  cart: Cart | null
  loading: boolean
  itemCount: number
  addToCart: (product: Product, quantity?: number) => Promise<void>
  updateQuantity: (itemId: number, quantity: number) => Promise<void>
  removeFromCart: (itemId: number) => Promise<void>
  clearCart: () => Promise<void>
  refreshCart: () => Promise<void>
}

const CartContext = createContext<CartContextType | undefined>(undefined)

function loadCart(): Cart | null {
  if (typeof window === 'undefined') return null
  try {
    const data = localStorage.getItem(CART_KEY)
    return data ? (JSON.parse(data) as Cart) : null
  } catch {
    return null
  }
}

function persistCart(cart: Cart | null) {
  if (!cart) {
    localStorage.removeItem(CART_KEY)
    return
  }
  localStorage.setItem(CART_KEY, JSON.stringify(cart))
}

function computeTotals(items: CartItem[]) {
  const subtotal = items.reduce((sum, it) => sum + it.price * it.quantity, 0)
  return { items, subtotal, discount: 0, total: subtotal }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setCart(loadCart())
    setLoading(false)
  }, [])

  const refreshCart = useCallback(async () => {
    setCart(loadCart())
  }, [])

  const addToCart = async (product: Product, quantity = 1) => {
    const cur = loadCart() || { id: 0, items: [] as CartItem[], subtotal: 0, total: 0 }
    const items = [...cur.items]
    const existing = items.find((it) => Number(it.productId) === Number(product.id))
    if (existing) {
      existing.quantity += quantity
    } else {
      items.push({
        id: Number(product.id),
        productId: Number(product.id),
        product,
        quantity,
        price: product.price,
      })
    }
    const next = { ...cur, ...computeTotals(items) } as Cart
    persistCart(next)
    setCart(next)
    toast.success(`${product.name} sepete eklendi`)
  }

  const updateQuantity = async (itemId: number, quantity: number) => {
    const cur = loadCart()
    if (!cur) return
    const items = cur.items
      .map((it) => (Number(it.id) === Number(itemId) ? { ...it, quantity } : it))
      .filter((it) => it.quantity > 0)
    const next = { ...cur, ...computeTotals(items) } as Cart
    persistCart(next)
    setCart(next)
  }

  const removeFromCart = async (itemId: number) => {
    const cur = loadCart()
    if (!cur) return
    const items = cur.items.filter((it) => Number(it.id) !== Number(itemId))
    const next = { ...cur, ...computeTotals(items) } as Cart
    persistCart(next)
    setCart(next)
  }

  const clearCart = async () => {
    persistCart(null)
    setCart(null)
  }

  const itemCount = cart?.items?.reduce((n, it) => n + it.quantity, 0) || 0

  return (
    <CartContext.Provider
      value={{ cart, loading, itemCount, addToCart, updateQuantity, removeFromCart, clearCart, refreshCart }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
