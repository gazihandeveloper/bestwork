// ============================================
// BestWork - Favoriler Context (localStorage tabanlı)
// Sepet gibi tamamen istemci tarafında tutulur; üye girişi gerektirmez.
// ============================================
'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react'
import type { Product } from '@/types'
import toast from 'react-hot-toast'

const FAV_KEY = 'hb_favorites_bw'
const MAX_FAVORITES = 100

export interface FavoriteItem {
  id: number
  product: Product
  addedAt: string
}

interface FavoritesContextType {
  items: FavoriteItem[]
  count: number
  isFavorite: (productId: number) => boolean
  toggleFavorite: (product: Product) => void
  removeFavorite: (productId: number) => void
  clearFavorites: () => void
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined)

function loadFavorites(): FavoriteItem[] {
  if (typeof window === 'undefined') return []
  try {
    const data = localStorage.getItem(FAV_KEY)
    const parsed = data ? JSON.parse(data) : []
    return Array.isArray(parsed) ? (parsed as FavoriteItem[]) : []
  } catch {
    return []
  }
}

function persistFavorites(items: FavoriteItem[]) {
  localStorage.setItem(FAV_KEY, JSON.stringify(items))
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<FavoriteItem[]>([])

  useEffect(() => {
    setItems(loadFavorites())
  }, [])

  const isFavorite = (productId: number) =>
    items.some((it) => Number(it.id) === Number(productId))

  const toggleFavorite = (product: Product) => {
    const cur = loadFavorites()
    const exists = cur.some((it) => Number(it.id) === Number(product.id))
    let next: FavoriteItem[]

    if (exists) {
      next = cur.filter((it) => Number(it.id) !== Number(product.id))
      toast.success(`${product.name} favorilerden çıkarıldı`, { id: 'fav-toggle', duration: 1500 })
    } else {
      if (cur.length >= MAX_FAVORITES) {
        toast.error(`Favori sınırı (${MAX_FAVORITES} ürün) doldu`, { id: 'fav-toggle' })
        return
      }
      next = [{ id: Number(product.id), product, addedAt: new Date().toISOString() }, ...cur]
      toast.success(`${product.name} favorilere eklendi`, { id: 'fav-toggle', duration: 1500 })
    }

    persistFavorites(next)
    setItems(next)
  }

  const removeFavorite = (productId: number) => {
    const cur = loadFavorites()
    const next = cur.filter((it) => Number(it.id) !== Number(productId))
    persistFavorites(next)
    setItems(next)
  }

  const clearFavorites = () => {
    persistFavorites([])
    setItems([])
  }

  return (
    <FavoritesContext.Provider
      value={{ items, count: items.length, isFavorite, toggleFavorite, removeFavorite, clearFavorites }}
    >
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites() {
  const context = useContext(FavoritesContext)
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider')
  }
  return context
}
