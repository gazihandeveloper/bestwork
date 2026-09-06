// ============================================
// BestWork - Güvenlik Şeridi (benefits) — admin yönetimli
// ============================================
'use client'

import { useEffect, useState } from 'react'
import { Truck, ShieldCheck, Boxes, Headset, Star } from '@/lib/google-icons'
import { rawGet } from '@/lib/raw'

interface Benefit {
  id: number
  title: string
  description: string
  icon: string
  sort_order: number
  is_active: boolean
}

function iconFor(name?: string) {
  const n = (name || '').toLowerCase()
  if (n.includes('ship') || n.includes('truck') || n.includes('kargo')) return Truck
  if (n.includes('lock') || n.includes('pay') || n.includes('secure') || n.includes('güven')) return ShieldCheck
  if (n.includes('pv') || n.includes('cv') || n.includes('box')) return Boxes
  if (n.includes('support') || n.includes('destek') || n.includes('7/24')) return Headset
  return Star
}

export function BenefitStrip() {
  const [items, setItems] = useState<Benefit[]>([])

  useEffect(() => {
    rawGet<{ benefits?: Benefit[] }>('/benefits')
      .then((r) => setItems(Array.isArray(r.benefits) ? r.benefits : []))
      .catch(() => {})
  }, [])

  if (items.length === 0) return null

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((b) => {
        const Icon = iconFor(b.icon)
        return (
          <div key={b.id} className="flex flex-col items-center gap-2 p-3 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Icon size={20} />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-gray-800">{b.title}</h3>
              <p className="text-xs text-gray-400">{b.description}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
