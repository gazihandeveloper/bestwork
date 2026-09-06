// ============================================
// BestWork - Adreslerim (BestWork: localStorage tabanlı)
// ============================================
'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/app/main-layout'
import { MapPin, Plus, Pencil, Trash2 } from '@/lib/google-icons'

interface Address {
  id: number
  title: string
  fullName: string
  phone: string
  address_line: string
  city: string
  state: string
  zip: string
  country: string
  is_default: boolean
}

const KEY = 'hb_addresses_bw'

function load(): Address[] {
  if (typeof window === 'undefined') return []
  try {
    const d = localStorage.getItem(KEY)
    return d ? (JSON.parse(d) as Address[]) : []
  } catch {
    return []
  }
}

function save(items: Address[]) {
  localStorage.setItem(KEY, JSON.stringify(items))
}

const empty: Address = {
  id: 0,
  title: '',
  fullName: '',
  phone: '',
  address_line: '',
  city: '',
  state: '',
  zip: '',
  country: 'Türkiye',
  is_default: false,
}

export default function AddressesPage() {
  const [items, setItems] = useState<Address[]>([])
  const [loaded, setLoaded] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<Address>({ ...empty })
  const [notice, setNotice] = useState('')

  useEffect(() => {
    setItems(load())
    setLoaded(true)
  }, [])

  const openNew = () => {
    setEditingId(null)
    setForm({ ...empty, id: Date.now() })
    setFormOpen(true)
  }

  const openEdit = (a: Address) => {
    setEditingId(a.id)
    setForm({ ...a })
    setFormOpen(true)
  }

  const saveForm = () => {
    if (!form.title.trim() || !form.address_line.trim()) {
      setNotice('Başlık ve adres zorunludur')
      return
    }
    const list = load()
    let next: Address[]
    if (editingId) {
      next = list.map((a) => (a.id === editingId ? form : a))
    } else {
      next = [...list, form]
    }
    if (form.is_default) {
      next = next.map((a) => ({ ...a, is_default: a.id === form.id }))
    }
    save(next)
    setItems(next)
    setFormOpen(false)
    setNotice('Adres kaydedildi')
  }

  const remove = (id: number) => {
    const next = load().filter((a) => a.id !== id)
    save(next)
    setItems(next)
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Adreslerim</h1>
          <button onClick={openNew} className="inline-flex items-center gap-1.5 text-sm font-bold text-white bg-brand-500 px-4 py-2.5 rounded-lg hover:bg-brand-600 transition-colors">
            <Plus size={16} /> Yeni Adres
          </button>
        </div>

        {notice && <div className="mb-4 rounded-xl border border-brand-500/30 bg-brand-50 px-4 py-3 text-sm text-brand-700">{notice}</div>}

        {formOpen && (
          <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-4">{editingId ? 'Adresi Düzenle' : 'Yeni Adres'}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm" placeholder="Başlık (Ev, İş...)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <input className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm" placeholder="Ad Soyad" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              <input className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm" placeholder="Telefon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <input className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm" placeholder="İl" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              <input className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm" placeholder="İlçe" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
              <input className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm" placeholder="Posta Kodu" value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} />
              <textarea className="sm:col-span-2 rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm" rows={2} placeholder="Adres" value={form.address_line} onChange={(e) => setForm({ ...form, address_line: e.target.value })} />
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} /> Varsayılan yap
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={saveForm} className="text-sm font-bold text-white bg-brand-500 px-4 py-2 rounded-lg hover:bg-brand-600">Kaydet</button>
              <button onClick={() => setFormOpen(false)} className="text-sm font-bold text-gray-600 bg-gray-100 px-4 py-2 rounded-lg hover:bg-gray-200">Vazgeç</button>
            </div>
          </div>
        )}

        {loaded && items.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <MapPin size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-bold text-gray-800 mb-2">Henüz adres eklenmedi</h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((a) => (
              <div key={a.id} className="bg-white rounded-xl border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-gray-800">{a.title}</span>
                  {a.is_default && <span className="text-xs font-bold text-brand-500 bg-brand-50 px-2 py-0.5 rounded-full">Varsayılan</span>}
                </div>
                <p className="text-sm text-gray-600">{a.fullName}</p>
                <p className="text-sm text-gray-500">{a.address_line}</p>
                <p className="text-sm text-gray-500">{a.city} {a.state} {a.zip}</p>
                <p className="text-sm text-gray-500">{a.phone}</p>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => openEdit(a)} className="inline-flex items-center gap-1 text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg hover:bg-gray-200"><Pencil size={12} /> Düzenle</button>
                  <button onClick={() => remove(a.id)} className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100"><Trash2 size={12} /> Sil</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
