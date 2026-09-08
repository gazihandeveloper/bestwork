// ============================================
// BestWork - EFT/HAVALE Bildirimleri — BestWork (yeni tasarım)
// ============================================
'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import {
  House, Landmark, Upload, FileText, Clock, CircleCheck, XCircle, ArrowUpRight,
} from '@/lib/google-icons'
import AccountTopMenu from '@/components/AccountTopMenu'
import { get, tokenStorage, formatPrice } from '@/lib/api'
import { rawGet, rawPost } from '@/lib/raw'
import toast from 'react-hot-toast'

interface NotifItem {
  id: number
  order_id: number | null
  amount: number
  bank_name: string | null
  reference_no: string | null
  note: string | null
  file_path: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

interface EshopOrder {
  id: number
  orderNumber?: string
  total?: number
}

const STATUS: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  pending: { label: 'Beklemede', cls: 'bg-amber-50 text-amber-700', icon: <Clock size={13} /> },
  approved: { label: 'Onaylandı', cls: 'bg-green-50 text-green-700', icon: <CircleCheck size={13} /> },
  rejected: { label: 'Reddedildi', cls: 'bg-red-50 text-red-700', icon: <XCircle size={13} /> },
}

const API_BASE = '/api'
const UPLOAD_BASE = 'https://mahmutgazihanarslan.com.tr'

export default function PaymentNotificationsPage() {
  const [items, setItems] = useState<NotifItem[]>([])
  const [orders, setOrders] = useState<EshopOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [orderId, setOrderId] = useState('')
  const [amount, setAmount] = useState('')
  const [bankName, setBankName] = useState('')
  const [referenceNo, setReferenceNo] = useState('')
  const [note, setNote] = useState('')
  const [filePath, setFilePath] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')

  const load = () => {
    rawGet<{ payment_notifications?: NotifItem[] }>('/payment-notifications')
      .then((r) => setItems(Array.isArray(r.payment_notifications) ? r.payment_notifications : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    get<EshopOrder[]>('/eshop/orders')
      .then((r) => {
        if (r.success && Array.isArray(r.data)) setOrders(r.data)
      })
      .catch(() => {})
     
  }, [])

  const pickFile = async (file?: File) => {
    if (!file) return
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const token = tokenStorage.getAccess()
      const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.file_path) throw new Error(json?.error || 'Dosya yüklenemedi')
      setFilePath(json.file_path)
      setFileName(file.name)
      toast.success('Dekont yüklendi.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Dosya yüklenemedi.')
    } finally {
      setSaving(false)
    }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const amt = Number(amount.replace(',', '.'))
    if (!amt || amt <= 0) {
      toast.error('Geçerli bir tutar girin.')
      return
    }
    if (!bankName.trim()) {
      toast.error('Banka adı zorunludur.')
      return
    }
    if (!filePath) {
      toast.error('Dekont görselini yükleyin.')
      return
    }
    setSaving(true)
    try {
      await rawPost<{ payment_notification?: NotifItem }>('/payment-notifications', {
        order_id: orderId ? Number(orderId) : null,
        amount: amt,
        bank_name: bankName.trim(),
        reference_no: referenceNo.trim() || undefined,
        note: note.trim() || undefined,
        file_path: filePath,
      })
      toast.success('Ödeme bildiriminiz iletildi, onay bekleniyor.')
      setAmount('')
      setBankName('')
      setReferenceNo('')
      setNote('')
      setOrderId('')
      setFilePath(null)
      setFileName('')
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Bildirim gönderilemedi.')
    } finally {
      setSaving(false)
    }
  }

  const inputCls =
    'w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 transition-colors'

  return (
    <div className="space-y-4">
      <AccountTopMenu />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">EFT/HAVALE Bildirimleri</h1>
          <p className="text-sm text-gray-400">Yaptığınız havale/EFT'yi dekontuyla birlikte bildirin, onay bekleyin.</p>
        </div>
        <Link
          href="/account"
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50"
        >
          <House size={16} /> Anasayfa
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Form */}
        <div className="lg:col-span-5">
          <form onSubmit={submit} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-gray-900">
              <Landmark size={18} className="text-brand-600" /> Yeni Bildirim
            </h2>
            <div className="flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-500">Sipariş (opsiyonel)</label>
                <select value={orderId} onChange={(e) => setOrderId(e.target.value)} className={inputCls}>
                  <option value="">Sipariş seçin (opsiyonel)</option>
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.orderNumber || `#${o.id}`} — {formatPrice(Number(o.total) || 0)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-500">Tutar (₺) *</label>
                <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-500">Banka Adı *</label>
                <input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Örn. Ziraat Bankası" className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-500">İşlem / Referans No</label>
                <input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} placeholder="Havale referans no" className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-500">Not</label>
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Varsa açıklama" className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-500">Dekont Görseli *</label>
                <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-200 px-4 py-5 text-center transition-colors hover:border-brand-300 hover:bg-brand-50/40">
                  <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => pickFile(e.target.files?.[0])} />
                  {filePath ? (
                    <>
                      <FileText size={22} className="text-green-600" />
                      <span className="max-w-full truncate text-xs font-bold text-green-700">{fileName}</span>
                    </>
                  ) : (
                    <>
                      <Upload size={22} className="text-brand-500" />
                      <span className="text-xs font-bold text-gray-500">Dekontu buraya sürükleyin veya seçin</span>
                      <span className="text-[10px] text-gray-400">jpg / png / webp · maks 5MB</span>
                    </>
                  )}
                </label>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="cursor-pointer rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
              >
                {saving ? 'Gönderiliyor...' : 'Bildirimi Gönder'}
              </button>
            </div>
          </form>
        </div>

        {/* Liste */}
        <div className="lg:col-span-7">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-lg font-bold text-gray-900">Bildirimlerim ({items.length})</h2>
            {loading ? (
              <div className="py-8 text-center">
                <div className="mx-auto h-7 w-7 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
              </div>
            ) : items.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">Henüz bildirim göndermediniz.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {items.map((n) => {
                  const st = STATUS[n.status] ?? { label: n.status, cls: 'bg-gray-100 text-gray-600', icon: <Clock size={13} /> }
                  return (
                    <div key={n.id} className="rounded-xl border border-gray-100 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${st.cls}`}>
                            {st.icon} {st.label}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(n.created_at).toLocaleDateString('tr-TR')} {new Date(n.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <span className="text-sm font-extrabold text-gray-900">
                          {Number(n.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
                        <span className="inline-flex items-center gap-1"><Landmark size={12} /> {n.bank_name || '—'}</span>
                        {n.reference_no && <span>Ref: {n.reference_no}</span>}
                        {n.order_id != null && <span>Sipariş #{n.order_id}</span>}
                        {n.note && <span className="truncate">{n.note}</span>}
                        {n.file_path && (
                          <a
                            href={`${UPLOAD_BASE}/${n.file_path.replace(/^\//, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-0.5 font-bold text-brand-600 hover:underline"
                          >
                            Dekont <ArrowUpRight size={12} />
                          </a>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
