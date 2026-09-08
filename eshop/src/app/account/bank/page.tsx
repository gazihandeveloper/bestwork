// ============================================
// BestWork - Banka Bilgilerim (BestWork)
// ============================================
'use client'

import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import Link from 'next/link'
import { House, Trash2, Pencil, Landmark, X } from '@/lib/google-icons'
import AccountTopMenu from '@/components/AccountTopMenu'
import { rawGet, rawPost, rawPut, rawDel } from '@/lib/raw'
import toast from 'react-hot-toast'

interface BankAccount {
  id: number
  user_id: number
  bank_name: string
  iban: string
  account_name: string
  is_active: boolean
  created_at: string
}

const EMPTY = { bank_name: '', iban: '', account_name: '' }

export default function BankPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ ...EMPTY })
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<BankAccount | null>(null)

  const load = () => {
    rawGet<{ bank_accounts?: BankAccount[] }>('/bank-accounts')
      .then((r) => {
        if (r && Array.isArray(r.bank_accounts)) setAccounts(r.bank_accounts)
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Hesaplar yüklenemedi.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
     
  }, [])

  const set = (k: keyof typeof EMPTY) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const validate = (): string | null => {
    if (!form.bank_name.trim()) return 'Banka adı zorunludur.'
    if (!form.iban.trim()) return 'IBAN zorunludur.'
    if (form.iban.replace(/\s+/g, '').length < 15) return 'IBAN en az 15 karakter olmalıdır.'
    if (!form.account_name.trim()) return 'Hesap sahibi zorunludur.'
    return null
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const err = validate()
    if (err) {
      toast.error(err)
      return
    }
    setSaving(true)
    try {
      const payload = {
        bank_name: form.bank_name.trim(),
        iban: form.iban.replace(/\s+/g, ' ').trim(),
        account_name: form.account_name.trim(),
      }
      if (editing) {
        await rawPut<{ message?: string }>(`/bank-accounts/${editing.id}`, payload)
        toast.success('Banka hesabı güncellendi.')
        setEditing(null)
      } else {
        await rawPost<{ bank_account?: BankAccount }>('/bank-accounts', payload)
        toast.success('Banka hesabı eklendi.')
      }
      setForm({ ...EMPTY })
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : editing ? 'Güncellenemedi.' : 'Eklenemedi.')
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (a: BankAccount) => {
    setEditing(a)
    setForm({ bank_name: a.bank_name, iban: a.iban, account_name: a.account_name })
  }

  const remove = async (id: number) => {
    if (!window.confirm('Bu hesabı pasife almak istediğinize emin misiniz?')) return
    try {
      await rawDel<{ message?: string }>(`/bank-accounts/${id}`)
      toast.success('Hesap pasife alındı.')
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Hesap pasife alınamadı.')
    }
  }

  const inputCls =
    'w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 transition-colors'

  const renderForm = (onSubmit: (e: FormEvent) => void) => (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <div>
        <label className="mb-1 block text-xs font-bold text-gray-500">Banka Adı *</label>
        <input value={form.bank_name} onChange={set('bank_name')} placeholder="Örn. Ziraat Bankası" className={inputCls} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-bold text-gray-500">IBAN *</label>
        <input value={form.iban} onChange={set('iban')} placeholder="TR00 0000 0000 0000 0000 0000 00" className={inputCls} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-bold text-gray-500">Hesap Sahibi *</label>
        <input value={form.account_name} onChange={set('account_name')} placeholder="Ad Soyad" className={inputCls} />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="cursor-pointer rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
      >
        {saving ? (editing ? 'Kaydediliyor...' : 'Ekleniyor...') : editing ? 'Kaydet' : 'Ekle'}
      </button>
    </form>
  )

  return (
    <div className="space-y-4">
      <AccountTopMenu />

      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-gray-900">Banka Bilgilerim</h1>
        <Link
          href="/account"
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50"
        >
          <House size={16} /> Anasayfa
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Yeni hesap */}
        <div className="lg:col-span-5">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-gray-900">
              <Landmark size={18} className="text-brand-600" /> Yeni Hesap Ekle
            </h2>
            {renderForm(submit)}
          </div>
        </div>

        {/* Hesaplar */}
        <div className="lg:col-span-7">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-lg font-bold text-gray-900">Hesaplarım ({accounts.length})</h2>
            {loading ? (
              <div className="py-8 text-center">
                <div className="mx-auto h-7 w-7 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
              </div>
            ) : accounts.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">Henüz banka hesabı eklemediniz.</div>
            ) : (
              <div>
                {accounts.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between border-b border-gray-100 py-2.5 last:border-b-0"
                  >
                    <div>
                      <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-gray-800">
                        {a.bank_name}
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            a.is_active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          {a.is_active ? 'Aktif' : 'Pasif'}
                        </span>
                      </p>
                      <p className="text-xs text-gray-400">
                        {a.account_name} · <span className="font-mono">{a.iban}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {a.is_active && (
                        <button
                          type="button"
                          aria-label="düzenle"
                          onClick={() => openEdit(a)}
                          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-brand-50 hover:text-brand-600"
                        >
                          <Pencil size={16} />
                        </button>
                      )}
                      <button
                        type="button"
                        aria-label="sil"
                        onClick={() => remove(a.id)}
                        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Düzenleme modalı */}
      {editing && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setEditing(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Banka Hesabını Düzenle</h3>
              <button
                type="button"
                aria-label="Kapat"
                onClick={() => setEditing(null)}
                className="cursor-pointer rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            {renderForm(submit)}
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="mt-2 w-full cursor-pointer rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50"
            >
              Vazgeç
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
