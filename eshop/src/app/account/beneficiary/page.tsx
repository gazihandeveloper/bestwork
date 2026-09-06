// ============================================
// BestWork - Varis Bilgileri (BestWork)
// ============================================
'use client'

import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import Link from 'next/link'
import { House, Trash2, Users, UserPlus } from '@/lib/google-icons'
import AccountTopMenu from '@/components/AccountTopMenu'
import { rawGet, rawPost, rawDel } from '@/lib/raw'
import toast from 'react-hot-toast'

interface Beneficiary {
  id: number
  user_id: number
  full_name: string
  relationship: string
  phone: string | null
  email: string | null
  created_at: string
}

const EMPTY = { full_name: '', relationship: '', phone: '', email: '' }

export default function BeneficiaryPage() {
  const [items, setItems] = useState<Beneficiary[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ ...EMPTY })
  const [saving, setSaving] = useState(false)

  const load = () => {
    rawGet<{ beneficiaries?: Beneficiary[] }>('/beneficiaries')
      .then((r) => {
        if (r && Array.isArray(r.beneficiaries)) setItems(r.beneficiaries)
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Varisler yüklenemedi.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const set = (k: keyof typeof EMPTY) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.full_name.trim() || !form.relationship.trim()) {
      toast.error('Ad soyad ve yakınlık derecesi zorunludur.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        full_name: form.full_name.trim(),
        relationship: form.relationship.trim(),
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
      }
      await rawPost<{ beneficiary?: Beneficiary }>('/beneficiaries', payload)
      toast.success('Varis eklendi.')
      setForm({ ...EMPTY })
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Varis eklenemedi.')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: number) => {
    if (!window.confirm('Bu varisi silmek istediğinize emin misiniz?')) return
    try {
      await rawDel<{ message?: string }>(`/beneficiaries/${id}`)
      toast.success('Varis silindi.')
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Varis silinemedi.')
    }
  }

  const inputCls =
    'w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 transition-colors'

  return (
    <div className="space-y-4">
      <AccountTopMenu />

      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Varis Bilgileri</h1>
          <p className="text-sm text-gray-400">Kazançlarınızın devredileceği varislerinizi tanımlayın.</p>
        </div>
        <Link
          href="/account"
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50"
        >
          <House size={16} /> Anasayfa
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Yeni varis formu */}
        <div className="lg:col-span-5">
          <form onSubmit={submit} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-gray-900">
              <UserPlus size={18} className="text-brand-600" /> Yeni Varis
            </h2>
            <div className="flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-500">Ad Soyad *</label>
                <input value={form.full_name} onChange={set('full_name')} placeholder="Varisin adı soyadı" className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-500">Yakınlık Derecesi *</label>
                <input value={form.relationship} onChange={set('relationship')} placeholder="Eş, Çocuk..." className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-500">Telefon</label>
                <input value={form.phone} onChange={set('phone')} placeholder="05xx xxx xx xx" className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-500">E-posta</label>
                <input value={form.email} onChange={set('email')} type="email" placeholder="ornek@mail.com" className={inputCls} />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="cursor-pointer rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
              >
                {saving ? 'Ekleniyor...' : 'Varis Ekle'}
              </button>
            </div>
          </form>
        </div>

        {/* Varis listesi */}
        <div className="lg:col-span-7">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-gray-900">
              <Users size={18} className="text-brand-600" /> Varislerim ({items.length})
            </h2>

            {loading ? (
              <div className="py-8 text-center">
                <div className="mx-auto h-7 w-7 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
              </div>
            ) : items.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">Henüz varis eklemediniz.</div>
            ) : (
              <div>
                {items.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between border-b border-gray-100 py-2.5 last:border-b-0"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        {b.full_name} <span className="text-gray-400">·</span>{' '}
                        <span className="text-xs font-bold text-brand-600">{b.relationship}</span>
                      </p>
                      <p className="text-xs text-gray-400">
                        {b.phone || '-'} · {b.email || '-'}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label="sil"
                      onClick={() => remove(b.id)}
                      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
