// ============================================
// BestWork - Destek / İletişim — BestWork (yeni tasarım)
// ============================================
'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { House, Headset, Mail, Phone, Send, CircleAlert, Receipt } from '@/lib/google-icons'
import AccountTopMenu from '@/components/AccountTopMenu'
import { rawPost, rawGet } from '@/lib/raw'
import { get, post } from '@/lib/api'
import toast from 'react-hot-toast'

interface MeBrief {
  name?: string
  email?: string
  phone?: string
}

export default function ContactPage() {
  const [name, setName] = useState('')
  const [surname, setSurname] = useState('')
  const [phone, setPhone] = useState('')
  const [memberCode, setMemberCode] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [fisler, setFisler] = useState<any[]>([])
  const [selFis, setSelFis] = useState<any | null>(null)
  const [fisReply, setFisReply] = useState('')
  const [fisSending, setFisSending] = useState(false)

  const loadTickets = () => {
    get<any[]>('/eshop/tickets')
      .then((r) => {
        if (r.success && Array.isArray(r.data)) setFisler(r.data)
      })
      .catch(() => {})
  }

  useEffect(() => {
    loadTickets()
     
  }, [])

  const openFis = (f: any) => {
    setSelFis(f)
    get<any>(`/eshop/tickets/${f.id}`)
      .then((r) => {
        if (r.success && r.data) setSelFis(r.data)
      })
      .catch(() => {})
  }

  const sendFisReply = () => {
    if (!selFis || !fisReply.trim()) return
    setFisSending(true)
    post<any>(`/eshop/tickets/${selFis.id}/reply`, { message: fisReply.trim() })
      .then((r) => {
        if (r.success && r.data) {
          setSelFis(r.data)
          setFisReply('')
          loadTickets()
        }
      })
      .catch(() => {})
      .finally(() => setFisSending(false))
  }

  useEffect(() => {
    get<MeBrief>('/eshop/me')
      .then((r) => {
        if (r.success && r.data) {
          const parts = (r.data.name || '').split(' ')
          setName(parts[0] || '')
          setSurname(parts.slice(1).join(' ') || '')
          setPhone(r.data.phone || '')
          setMemberCode((r.data as any).member_code || '')
        }
      })
      .catch(() => {})
  }, [])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Üye bilgileriniz yükleniyor, lütfen tekrar deneyin.')
      return
    }
    if (message.trim().length < 10) {
      toast.error('Mesaj en az 10 karakter olmalıdır.')
      return
    }
    setSaving(true)
    try {
      await rawPost<{ ticket?: unknown }>('/tickets', {
        name: name.trim(),
        surname: surname.trim() || '-',
        phone: phone.trim() || '-',
        message: message.trim(),
      })
      toast.success('Mesajınız iletildi. En kısa sürede dönüş yapacağız.')
      setMessage('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Mesaj gönderilemedi.')
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
        <h1 className="flex items-center gap-2 text-2xl font-extrabold text-gray-900">
          <Headset size={24} className="text-brand-600" /> Destek / İletişim
        </h1>
        <Link
          href="/account"
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50"
        >
          <House size={16} /> Anasayfa
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* İletişim bilgileri */}
        <div className="lg:col-span-5">
          <div className="flex h-full flex-col gap-3">
            <div className="rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-700 p-6 text-white shadow-md">
              <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
                <Headset size={26} />
              </span>
              <h2 className="text-xl font-extrabold">Size nasıl yardımcı olabiliriz?</h2>
              <p className="mt-1 text-sm leading-relaxed text-white/85">
                Sorularınız, önerileriniz veya sorunlarınız için mesaj gönderin; destek ekibimiz
                en kısa sürede sizinle iletişime geçsin.
              </p>
            </div>

            <div className="flex flex-1 flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-extrabold tracking-wide text-gray-500 uppercase">İletişim Kanalları</h3>
              <div className="flex flex-col gap-3 text-sm">
                <a
                  href="mailto:info@mahmutgazihanarslan.com.tr"
                  className="flex items-center gap-3 rounded-xl border border-gray-100 px-3 py-2.5 transition-colors hover:bg-brand-50/50"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    <Mail size={17} />
                  </span>
                  <div>
                    <p className="text-[10px] font-bold tracking-wide text-gray-400 uppercase">E-posta</p>
                    <p className="font-semibold text-gray-800">info@mahmutgazihanarslan.com.tr</p>
                  </div>
                </a>
                <a
                  href="tel:+905000000000"
                  className="flex items-center gap-3 rounded-xl border border-gray-100 px-3 py-2.5 transition-colors hover:bg-brand-50/50"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50 text-green-600">
                    <Phone size={17} />
                  </span>
                  <div>
                    <p className="text-[10px] font-bold tracking-wide text-gray-400 uppercase">Telefon</p>
                    <p className="font-semibold text-gray-800">Destek hattı</p>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Mesaj formu */}
        <div className="lg:col-span-7">
          <form onSubmit={submit} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-gray-900">Mesaj Gönder</h2>

            <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-600">
              <span className="font-bold text-gray-800">Gönderen:</span>
              <span className="font-semibold">{name ? [name, surname].filter(Boolean).join(' ') : 'Üye'}</span>
              <span className="text-gray-300">-</span>
              <span className="font-mono text-xs">{phone || '—'}</span>
              <span className="text-gray-300">-</span>
              <span className="font-mono text-xs font-bold text-gray-700">{memberCode || '—'}</span>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-500">Mesajınız * (en az 10 karakter)</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  placeholder="Sorunuzu veya talebinizi yazın..."
                  className={`${inputCls} resize-none`}
                />
              </div>
            </div>

            <div className="mt-2 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              <CircleAlert size={15} className="shrink-0" />
              Destek talepleri ortalama 72 saat içerisinde yanıtlanır.
            </div>

            <button
              type="submit"
              disabled={saving}
              className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
            >
              <Send size={16} /> {saving ? 'Gönderiliyor...' : 'Mesajı Gönder'}
            </button>
          </form>
        </div>
      </div>

      {/* Fişlerim */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-gray-900">
          <Receipt size={18} className="text-brand-600" /> Destek Kayıtlarım ({fisler.length})
        </h2>
        {fisler.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">Henüz talep oluşturmadınız.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {fisler.map((f) => {
              const st = f.status === 'closed' ? { t: 'Kapalı', c: 'bg-gray-100 text-gray-600' }
                : f.status === 'resolved' ? { t: 'Çözüldü', c: 'bg-green-50 text-green-700' }
                : { t: 'Açık', c: 'bg-blue-50 text-blue-700' }
              return (
                <div key={f.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" onClick={() => openFis(f)} className="cursor-pointer font-mono text-xs font-bold text-brand-600 hover:underline">
                        BW-{memberCode || 'U'}-{f.id}
                      </button>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${st.c}`}>{st.t}</span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">{f.message}</p>
                    <p className="mt-0.5 text-xs text-gray-400">{new Date(f.created_at).toLocaleDateString('tr-TR')} {new Date(f.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Talep yazışma modalı */}
      {selFis && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/50 p-4" onClick={() => setSelFis(null)}>
          <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
              <div>
                <p className="font-mono text-sm font-bold text-brand-600">BW-{memberCode || 'U'}-{selFis.id}</p>
                <p className="text-xs text-gray-400">Destek Talebi</p>
              </div>
              <button type="button" onClick={() => setSelFis(null)} className="cursor-pointer rounded-lg p-1 text-gray-400 hover:bg-gray-100">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <p className="text-sm whitespace-pre-wrap leading-relaxed text-gray-700">{selFis.message}</p>
            </div>
            <div className="flex gap-2 border-t border-gray-100 p-4">
              <textarea
                value={fisReply}
                onChange={(e) => setFisReply(e.target.value)}
                rows={2}
                placeholder="Yanıt yazın..."
                className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
              />
              <button type="button" disabled={fisSending || !fisReply.trim()} onClick={sendFisReply}
                className="cursor-pointer rounded-lg bg-brand-600 px-4 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-50">
                Gönder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
