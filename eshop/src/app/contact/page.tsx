// ============================================
// BestWork - İletişim (herkese açık)
// ============================================
'use client'

import { useState, type FormEvent } from 'react'
import { Mail, Phone, MapPin, Clock, Send } from '@/lib/google-icons'
import { MainLayout } from '@/app/main-layout'
import { rawPost } from '@/lib/raw'
import toast from 'react-hot-toast'

export default function ContactPage() {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [city, setCity] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!fullName.trim()) {
      toast.error('Ad Soyad zorunludur.')
      return
    }
    if (!phone.trim()) {
      toast.error('Telefon numarası zorunludur.')
      return
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      toast.error('Geçerli bir e-posta girin.')
      return
    }
    if (message.trim().length < 10) {
      toast.error('Mesaj en az 10 karakter olmalıdır.')
      return
    }
    setSaving(true)
    try {
      const parts = fullName.trim().split(/\s+/)
      const name = parts[0] || 'Misafir'
      const surname = parts.slice(1).join(' ') || '-'
      const fullMessage = `E-posta: ${email.trim()}\nŞehir: ${city.trim() || '-'}\n\n${message.trim()}`
      await rawPost<{ ticket?: unknown }>('/tickets', {
        name,
        surname,
        phone: phone.trim(),
        message: fullMessage,
      })
      toast.success('Mesajınız iletildi. En kısa sürede dönüş yapacağız.')
      setMessage('')
      setCity('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Mesaj gönderilemedi.')
    } finally {
      setSaving(false)
    }
  }

  const inputCls =
    'w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 transition-colors'

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* FORM */}
          <div>
            <h2 className="mb-1 text-2xl font-extrabold text-gray-900">İletişim Formu</h2>
            <p className="mb-5 text-sm text-gray-500">Aşağıdaki formu doldurarak bize iletin, en kısa sürede dönüş sağlayalım.</p>

            <form onSubmit={submit} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4">
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-500">Ad Soyad *</label>
                  <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Adınız ve Soyadınız" className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-500">Telefon Numarası *</label>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05XXXXXXXXX" className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-500">E-POSTA ADRESİ *</label>
                  <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="ornek@alanadi.com" className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-500">Bulunduğunuz Şehir</label>
                  <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Şehir" className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-500">Mesajınız *</label>
                  <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} placeholder="Mesajınızı, önerinizi veya sorunuzu buraya detaylıca yazınız..." className={`${inputCls} resize-none`} />
                </div>

                <button type="submit" disabled={saving} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-700 disabled:opacity-50">
                  <Send size={16} /> {saving ? 'Gönderiliyor...' : 'Mesajı Gönder'}
                </button>
              </div>
            </form>
          </div>

          {/* İLETİŞİM BİLGİLERİ */}
          <div>
            <h2 className="mb-1 text-2xl font-extrabold text-gray-900">İletişim Bilgileri</h2>
            <p className="mb-5 text-sm text-gray-500">Bizimle doğrudan irtibata geçebileceğiniz merkez ofis ve iletişim kanallarımız.</p>

            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><Phone size={18} /></span>
                <div>
                  <p className="text-xs font-bold tracking-wide text-gray-400 uppercase">Telefon &amp; Müşteri Hizmetleri</p>
                  <p className="text-lg font-extrabold text-gray-900">444 6 126</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Mail size={18} /></span>
                <div>
                  <p className="text-xs font-bold tracking-wide text-gray-400 uppercase">E-Posta Adresi</p>
                  <a href="mailto:binsis@aymnet.com.tr" className="text-lg font-extrabold text-gray-900 hover:text-brand-600">binsis@aymnet.com.tr</a>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-600"><MapPin size={18} /></span>
                <div>
                  <p className="text-xs font-bold tracking-wide text-gray-400 uppercase">Genel Merkez Adresi</p>
                  <p className="text-sm font-semibold leading-relaxed text-gray-800">
                    Aymnet Bitkisel ve Temizlik Ürünleri İth. İhr. San. Tic. A.Ş.
                    <br />
                    Anadolu Mah. Vişne Cad. No:48 Yıldırım / BURSA
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600"><Clock size={18} /></span>
                <div>
                  <p className="text-xs font-bold tracking-wide text-gray-400 uppercase">Çalışma Saatleri</p>
                  <p className="text-sm font-semibold text-gray-800">Hafta İçi: 09:00 - 18:00</p>
                  <p className="text-sm font-semibold text-gray-800">Cumartesi: 09:00 - 14:00</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* HARİTA */}
        <div className="mt-10 overflow-hidden rounded-2xl border border-gray-100 shadow-sm">
          <iframe
            title="Konum"
            src="https://www.google.com/maps?q=Anadolu%20Mah.%20Vi%C5%9Fne%20Cad.%20No%3A48%20Y%C4%B1ld%C4%B1r%C4%B1m%20Bursa&output=embed"
            className="h-[360px] w-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>
    </MainLayout>
  )
}
