// ============================================
// BestWork - Hesabım (MLM Dashboard) — bestwork/dashboard birebir taşıma
// https://mahmutgazihanarslan.com.tr/account
// Veri: BestWork API (üye dashboard + ranks + packages + sponsor + bekleyenler)
// ============================================
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Info,
  X,
  Camera,
  Link as LinkIcon,
  BadgeCheck,
  UserPlus,
  Scale,
  ShoppingCart,
  Crown,
  Users,
  GitBranch,
  Award,
  TrendingUp,
  Clock,
  Wallet,
  User,
  Plus,
  Minus,
  Trash2,
  Copy,
  Check,
  LogIn,
} from '@/lib/google-icons'
import { useAuth } from '@/contexts/AuthContext'
import { useCart } from '@/contexts/CartContext'
import { get, put, tokenStorage, formatPrice } from '@/lib/api'
import toast from 'react-hot-toast'
import AccountTopMenu from '@/components/AccountTopMenu'

const UPLOAD_BASE = 'https://mahmutgazihanarslan.com.tr'
const BW_BASE = 'https://mahmutgazihanarslan.com.tr'

/** Yükleme yolunu tam URL'e çevirir (uploads/... → https://…/uploads/...) */
function toAbs(p?: string | null): string | null {
  if (!p) return null
  if (/^https?:\/\//.test(p)) return p
  return UPLOAD_BASE + (p.startsWith('/') ? '' : '/') + p
}

/** BestWork TL değerini ₺ ile biçimlendir */
const tl = (v?: number | null) =>
  (Number(v) || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺'

/** Binlik ayraçlı tam sayı (üye sayısı / CV) */
const trn = (v?: number | null) => (Number(v) || 0).toLocaleString('tr-TR')

const TR_DATE: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' }

// ── Veri modelleri (BestWork API şekilleri) ──────────────────────────────
interface DashData {
  user?: { id?: number; name?: string; email?: string; member_code?: string; package?: string | null; rank?: string | null }
  wallet?: { id?: number; total_earned?: number; balance?: number; total_withdrawn?: number }
  monthly_earned?: number
  monthly_matched_cv?: number
  leg_cv_left_total?: number
  leg_cv_right_total?: number
  left_team_count?: number
  right_team_count?: number
  current_rank?: { id?: number; name?: string } | null
  current_package?: { id?: number; name?: string } | null
  total_referral_earnings?: number
  total_binary_earnings?: number
  total_matching_earnings?: number
  total_retail_earnings?: number
}

interface MeData {
  id?: number
  name?: string
  email?: string
  member_code?: string
  phone?: string
  role?: string
  is_active?: boolean
  current_rank_id?: number | null
  current_rank_name?: string
  package_id?: number | null
  package_name?: string
  total_pv_accumulated?: number
  total_cv_accumulated?: number
  sponsor_id?: number | null
  created_at?: string
}

interface RankData {
  id: number
  name: string
  required_left_pv: number
  required_right_pv: number
  monthly_binary_limit: number
}

interface PkgData {
  id: number
  name: string
  required_pv: number
  discount_rate: number
  cv?: number
}

interface PendingUser {
  id: number
  name: string
  member_code?: string | null
  created_at?: string | null
  pending_since?: string | null
}

interface ShopProduct {
  id: number
  name: string
  price: number // cent
  pv?: number
  cv?: number
  stock: number
  thumbnail?: string
  slug?: string
}

// ── İstatistik kartı: çevrilebilir bilgi yüzlü StatBlock ─────────────────
interface StatBlockProps {
  label: string
  value: string
  icon: React.ReactNode
  big?: boolean
  info?: string
  steps?: { filled: number; total: number }
  kalanBoxes?: { leftLabel?: string; rightLabel?: string; left: string; right: string }
  flipped?: boolean
  onFlip?: () => void
  onClick?: () => void
}

function StatBlock({ label, value, icon, big, info, steps, kalanBoxes, flipped, onFlip, onClick }: StatBlockProps) {
  return (
    <div
      onClick={onClick}
      className={`relative h-full rounded-xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md ${onClick ? 'cursor-pointer' : ''}`}
      style={{ perspective: 1000 }}
    >
      <div
        className="relative h-full w-full transition-transform duration-500"
        style={{
          transformStyle: 'preserve-3d',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* Ön yüz */}
        <div className="h-full" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
          <div className="relative flex min-h-[176px] flex-col p-3">
            {/* Bilgi butonu */}
            <button
              type="button"
              aria-label={`${label} hakkında bilgi`}
              onClick={(e) => {
                e.stopPropagation()
                onFlip?.()
              }}
              className="absolute top-3 right-3 z-[1] cursor-pointer border-none bg-transparent p-0"
            >
              <Info size={20} className="text-brand-400 transition-transform hover:scale-110" />
            </button>

            <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              {icon}
            </div>
            <p className="text-xs font-bold tracking-wider text-gray-400 uppercase">{label.toLocaleUpperCase('tr-TR')}</p>
            <p
              className="mt-0.5 leading-tight font-extrabold text-gray-900 break-words"
              style={{ fontSize: big ? '2.2rem' : '1.55rem' }}
            >
              {value}
            </p>

            {steps && (
              <div className="mt-auto flex items-center gap-0.5 pt-1.5">
                {Array.from({ length: steps.total }, (_, i) => (
                  <div
                    key={i}
                    className={`h-2 flex-grow rounded ${i < steps.filled ? 'bg-brand-500' : 'bg-gray-100'}`}
                  />
                ))}
              </div>
            )}

            {kalanBoxes && (
              <div className="mt-auto flex gap-1.5 pt-2">
                {[
                  { label: kalanBoxes.leftLabel ?? 'Sol Hat', value: kalanBoxes.left },
                  { label: kalanBoxes.rightLabel ?? 'Sağ Hat', value: kalanBoxes.right },
                ].map((b) => (
                  <div
                    key={b.label}
                    className="flex flex-grow items-center justify-center gap-1 rounded-md bg-brand-600 px-2 py-1 text-center"
                  >
                    <span className="text-[10.5px] leading-tight font-bold text-white/85">
                      {b.label} <span className="text-white">:</span>
                    </span>
                    <span className="text-[13px] leading-tight font-extrabold text-white">{b.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Arka yüz (bilgi) */}
        {info && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 rounded-xl bg-brand-600 p-3 text-center text-white"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            <Info size={30} />
            <p className="text-lg font-extrabold break-words">{value}</p>
            <p className="max-w-[230px] text-sm font-semibold">{info}</p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onFlip?.()
              }}
              className="mt-1 cursor-pointer rounded-lg border border-white/70 bg-white/10 px-2.5 py-1 text-[13px] font-bold hover:bg-white/20"
            >
              Geri Dön
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Sayfa ────────────────────────────────────────────────────────────────
export default function AccountDashboardPage() {
  const { user: ctxUser } = useAuth()
  const { cart, addToCart, updateQuantity, removeFromCart, clearCart } = useCart()

  const [dash, setDash] = useState<DashData | null>(null)
  const [me, setMe] = useState<MeData | null>(null)
  const [ranks, setRanks] = useState<RankData[]>([])
  const [packages, setPackages] = useState<PkgData[]>([])
  const [products, setProducts] = useState<ShopProduct[]>([])
  const [sponsoredCount, setSponsoredCount] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([])
  const [pendingOpen, setPendingOpen] = useState(false)
  const [pendingLoading, setPendingLoading] = useState(false)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [avatar, setAvatar] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [flippedCard, setFlippedCard] = useState<string | null>(null)
  const [copied, setCopied] = useState('')

  const flip = (label: string) => setFlippedCard((prev) => (prev === label ? null : label))

  const cartItems = cart?.items ?? []
  const cartQtyOf = (id: number) => cartItems.find((it) => Number(it.productId) === Number(id))?.quantity ?? 0

  // Paket modalı için sepetteki (pv taşıyan) ürünlerin toplamı
  const modalPV = cartItems.reduce((s, it) => s + (Number((it.product as { pv?: number })?.pv) || 0) * it.quantity, 0)
  const modalTotal = cartItems.reduce((s, it) => s + (Number(it.price) || 0) * it.quantity, 0)

  /** Dosyayı BestWork /api/upload'a yükler (multipart) */
  async function uploadAvatarFile(file: File): Promise<string> {
    const fd = new FormData()
    fd.append('file', file)
    const token = tokenStorage.getAccess()
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json?.error || 'Yükleme başarısız')
    if (!json.file_path) throw new Error('Dosya yolu alınamadı')
    return json.file_path
  }

  async function handleImageUpload(file?: File) {
    if (!file) return
    setUploading(true)
    try {
      const path = await uploadAvatarFile(file)
      const res = await put<{ image_path: string }>('/eshop/profile-image', { image_path: path })
      if (!res.success) throw new Error(res.error || 'Güncellenemedi')
      const abs = toAbs(path)
      setAvatar(abs)
      if (abs && typeof window !== 'undefined') {
        localStorage.setItem('hb_user_avatar', abs)
        window.dispatchEvent(new Event('avatar-updated'))
      }
      toast.success('Profil fotoğrafı güncellendi.')
    } catch {
      toast.error('Fotoğraf yüklenemedi.')
    } finally {
      setUploading(false)
    }
  }

  function copyText(text: string, what: string) {
    if (!text) return
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => toast.error('Kopyalanamadı.'))
    }
    setCopied(what)
    window.setTimeout(() => setCopied(''), 1600)
  }

  const go = (url: string) => {
    if (typeof window !== 'undefined') window.location.href = url
  }

  function openPendingModal() {
    setPendingOpen(true)
    setPendingLoading(true)
    get<PendingUser[]>('/eshop/pending-pool')
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setPendingUsers(res.data)
          setPendingCount(res.data.length)
        }
      })
      .catch(() => toast.error('Bekleyenler getirilemedi.'))
      .finally(() => setPendingLoading(false))
  }

  /** 5 sn'de bir + sayfa odağında sessiz tazeleme */
  function refresh() {
    get<DashData>('/eshop/dashboard')
      .then((r) => {
        if (r.success && r.data) {
          setDash(r.data)
          setError('')
        }
      })
      .catch(() => {})
    get<MeData>('/eshop/me')
      .then((r) => {
        if (r.success && r.data) setMe(r.data)
      })
      .catch(() => {})
    get<PendingUser[]>('/eshop/pending-pool')
      .then((r) => {
        if (r.success && Array.isArray(r.data)) setPendingCount(r.data.length)
      })
      .catch(() => {})
  }

  // İlk yükleme: tüm dashboard verileri
  useEffect(() => {
    let alive = true

    async function loadAll() {
      try {
        const [dRes, meRes, rRes, pkRes, spRes, pdRes, prRes, profRes] = await Promise.all([
          get<DashData>('/eshop/dashboard'),
          get<MeData>('/eshop/me'),
          get<RankData[]>('/eshop/ranks'),
          get<PkgData[]>('/eshop/packages'),
          get<{ count: number; users: unknown[] }>('/eshop/sponsored'),
          get<PendingUser[]>('/eshop/pending-pool'),
          get<{ items: ShopProduct[] }>('/eshop/products'),
          get<Record<string, unknown>>('/eshop/profile'),
        ])
        if (!alive) return

        if (dRes.success && dRes.data) setDash(dRes.data)
        if (meRes.success && meRes.data) setMe(meRes.data)
        if (rRes.success && Array.isArray(rRes.data)) setRanks(rRes.data)
        if (pkRes.success && Array.isArray(pkRes.data)) setPackages(pkRes.data)
        if (spRes.success && spRes.data) setSponsoredCount(Number(spRes.data.count) || 0)
        if (pdRes.success && Array.isArray(pdRes.data)) setPendingCount(pdRes.data.length)
        if (prRes.success && prRes.data && Array.isArray(prRes.data.items)) setProducts(prRes.data.items)
        if (profRes.success && profRes.data) {
          const img = (profRes.data as { profile_image?: string }).profile_image
          if (img) setAvatar(toAbs(img))
        }
        setError('')
      } catch {
        if (alive) setError('Dashboard verileri yüklenemedi. Lütfen sayfayı yenileyin.')
      } finally {
        if (alive) setLoading(false)
      }
    }

    loadAll()

    // Yerel saklanan avatar (varsa) hemen göster
    try {
      const stored = localStorage.getItem('hb_user_avatar')
      if (stored) setAvatar(stored)
    } catch {
      // yok say
    }

    const id = window.setInterval(refresh, 30000)
    const onFocus = () => refresh()
    window.addEventListener('focus', onFocus)
    return () => {
      alive = false
      window.clearInterval(id)
      window.removeEventListener('focus', onFocus)
    }
     
  }, [])

  // ── Türetilmiş değerler ────────────────────────────────────────────────
  const d = dash

  const fullName = me?.name || d?.user?.name || ctxUser?.fullName || ctxUser?.email || 'Üye'
  const memberCode = me?.member_code || d?.user?.member_code || ''
  const isActive = me?.is_active ?? true
  const email = me?.email || ctxUser?.email || ''

  const initials =
    fullName
      .split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toLocaleUpperCase('tr-TR') || '?'

  const currentRankId = me?.current_rank_id ?? d?.current_rank?.id ?? null
  const rankIndex = currentRankId != null ? ranks.findIndex((r) => r.id === currentRankId) : -1
  const currentRankName = (d?.user?.rank || me?.current_rank_name || 'GİRİŞİMCİ').toLocaleUpperCase('tr-TR')

  // Seviye (PV bazlı, yalnızca onaylı PV)
  const pv = Number(me?.total_pv_accumulated) || 0
  const sortedPkgs = [...packages].sort((a, b) => a.required_pv - b.required_pv)
  const pkgByName = d?.user?.package
    ? sortedPkgs.find((p) => p.name.toLocaleLowerCase('tr-TR') === d.user!.package!.toLocaleLowerCase('tr-TR'))
    : undefined
  const pickHighest = (a?: PkgData, b?: PkgData) =>
    [a, b].filter((p): p is PkgData => !!p).sort((x, y) => y.required_pv - x.required_pv)[0]

  const actualPkgByPV = [...sortedPkgs].reverse().find((p) => p.required_pv > 0 && pv >= p.required_pv)
  const actualPkg = pickHighest(actualPkgByPV, pkgByName)
  const actualPkgName = (actualPkg?.name ?? 'Girişimci').toLocaleUpperCase('tr-TR')
  const actualPkgIndex = actualPkg ? sortedPkgs.findIndex((p) => p.id === actualPkg.id) : -1
  const actualLevelIndex = actualPkgIndex >= 0 ? actualPkgIndex + 1 : 0

  // Öngörülen seviye (sepet dahil) — modal çizgileri
  const projectedPV = pv + modalPV
  const pkgByPV = [...sortedPkgs].reverse().find((p) => p.required_pv > 0 && projectedPV >= p.required_pv)
  const currentPkg = pickHighest(pkgByPV, pkgByName)
  const currentPkgName = (currentPkg?.name ?? 'Girişimci').toLocaleUpperCase('tr-TR')
  const currentPkgIndex = currentPkg ? sortedPkgs.findIndex((p) => p.id === currentPkg.id) : -1
  const levelIndex = currentPkgIndex >= 0 ? currentPkgIndex + 1 : 0

  const projectedNext = sortedPkgs.find((p) => p.required_pv > projectedPV)
  const segStart = currentPkg ? currentPkg.required_pv : 0
  const segEnd = projectedNext ? projectedNext.required_pv : 0
  const seg = segEnd - segStart
  const inSeg = seg > 0 ? Math.max(0, Math.min(seg, projectedPV - segStart)) : 0
  const currentSegPct = seg > 0 ? Math.round((inSeg / seg) * 100) : 100

  const leftTeam = Number(d?.left_team_count) || 0
  const rightTeam = Number(d?.right_team_count) || 0
  const leftCv = Number(d?.leg_cv_left_total) || 0
  const rightCv = Number(d?.leg_cv_right_total) || 0

  const registerLink = memberCode ? `${BW_BASE}/register?ref=${memberCode}` : ''

  // ── Yükleme / hata ekranları ───────────────────────────────────────────
  if (error && !dash) {
    return (
      <div className="mx-auto max-w-3xl py-10">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      </div>
    )
  }

  if (loading && !dash) {
    return (
      <div className="py-12 text-center">
        <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Üst menü — bestwork backoffice menüsü */}
      <AccountTopMenu />

      {/* ── Ana ızgara: sol profil kartı + sağ istatistikler ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Sol profil kartı */}
        <div className="lg:col-span-4 xl:col-span-3">
          <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm lg:sticky lg:top-24">
            {/* Fotoğraf */}
            <div className="group relative flex h-[190px] w-full shrink-0 items-center justify-center bg-gradient-to-br from-brand-50 to-blue-100">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatar}
                  alt={fullName}
                  className="block h-[132px] w-[132px] rounded-full border-4 border-white object-cover object-center shadow-sm transition-opacity group-hover:opacity-80"
                />
              ) : (
                <span className="flex h-[132px] w-[132px] items-center justify-center rounded-full border-4 border-white bg-brand-100 text-4xl font-extrabold text-brand-600 shadow-sm">
                  {initials}
                </span>
              )}
              <label
                aria-label="Profil fotoğrafını değiştir"
                className="absolute inset-0 flex cursor-pointer items-center justify-center"
              >
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  hidden
                  onChange={(e) => handleImageUpload(e.target.files?.[0])}
                />
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-gray-700 opacity-0 shadow-lg backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100">
                  {uploading ? (
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                  ) : (
                    <Camera size={20} />
                  )}
                </span>
              </label>
            </div>

            {/* İçerik */}
            <div className="flex flex-col items-center gap-1.5 p-4 pt-3 text-center">
              <h2 className="text-xl leading-snug font-extrabold text-gray-900 uppercase">{fullName}</h2>

              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-2.5 py-0.5 text-xs font-bold">
                  <span className={`h-2 w-2 rounded-full ${isActive ? 'bg-[#2E7D32]' : 'bg-red-500'}`} />
                  <span className={isActive ? 'text-[#2E7D32]' : 'text-red-500'}>
                    {isActive ? 'Aktif' : 'Pasif'}
                  </span>
                </span>
                {email && <span className="text-xs text-gray-400 break-all">{email}</span>}
              </div>

              <div className="mt-1 flex w-full flex-col gap-1.5">
                {memberCode && (
                  <button
                    type="button"
                    onClick={() => copyText(memberCode, 'member')}
                    className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    Üye No: <span className="font-mono">{memberCode}</span>
                    {copied === 'member' ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                  </button>
                )}
                {currentRankName !== 'GİRİŞİMCİ' && (
                  <a
                    href="/account/career"
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    Rütbe: {d?.user?.rank || me?.current_rank_name || currentRankName}
                  </a>
                )}
              </div>
            </div>

            {/* Üye kayıt linki */}
            <div className="mt-auto border-t border-gray-100 px-4 pt-2.5 pb-3.5">
              <p className="mb-1 block text-center text-[10px] font-bold tracking-[1.2px] text-gray-400 uppercase">
                Üye Kayıt Linkiniz
              </p>
              <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2 py-1.5">
                <LinkIcon size={16} className="shrink-0 text-gray-400" />
                <span className="flex-1 truncate font-mono text-xs text-gray-500">{registerLink || '—'}</span>
                <button
                  type="button"
                  onClick={() => copyText(registerLink, 'link')}
                  disabled={!registerLink}
                  className="shrink-0 cursor-pointer rounded-md border border-gray-200 px-2 py-1 text-[11px] font-bold transition-colors hover:bg-gray-100 disabled:opacity-40"
                >
                  {copied === 'link' ? 'Kopyalandı!' : 'Kopyala'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sağ istatistik blokları */}
        <div className="lg:col-span-8 xl:col-span-9">
          {/* Seviye yükseltme çağrısı — maksimum seviyeye ulaşmamış üyelere */}
          {actualLevelIndex < 5 && (
            <button
              type="button"
              onClick={() => setUpgradeOpen(true)}
              className="mb-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-base font-extrabold text-white shadow-md transition-transform duration-200 hover:-translate-y-0.5 hover:brightness-110"
            >
              Üyelik seviyenizi yükseltmek için tıklayınız
            </button>
          )}

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            <StatBlock
              label="Ünvan"
              value={currentRankName}
              steps={{ filled: rankIndex + 1, total: 12 }}
              icon={<Crown size={20} />}
              info={`${currentRankName} — Sistemdeki en yüksek kariyer unvanınız.`}
              flipped={flippedCard === 'Ünvan'}
              onFlip={() => flip('Ünvan')}
              onClick={() => go('/account/career')}
            />
            <StatBlock
              label="Güncel Kariyeriniz"
              value={currentRankName}
              icon={<BadgeCheck size={20} />}
              info="Bu ayki güncel kariyeriniz."
              flipped={flippedCard === 'Güncel Kariyeriniz'}
              onFlip={() => flip('Güncel Kariyeriniz')}
              onClick={() => go('/account/career')}
            />
            <StatBlock
              label="Seviyeniz"
              value={actualPkgName}
              steps={{ filled: actualLevelIndex, total: 5 }}
              icon={<TrendingUp size={20} className="animate-pulse" />}
              info="Alışveriş PV'niz arttıkça paketiniz ve ürün indiriminiz otomatik yükselir."
              flipped={flippedCard === 'Seviyeniz'}
              onFlip={() => flip('Seviyeniz')}
            />
            <StatBlock
              label="Sponsor Olduklarım"
              value={trn(sponsoredCount)}
              icon={<UserPlus size={20} />}
              info="Doğrudan kaydettiğiniz 1. hat üyeleriniz."
              flipped={flippedCard === 'Sponsor Olduklarım'}
              onFlip={() => flip('Sponsor Olduklarım')}
              onClick={() => go('/account/sponsor-tree')}
            />
            <StatBlock
              label="Ekibim"
              value={`${trn(leftTeam)} / ${trn(rightTeam)}`}
              kalanBoxes={{ left: trn(leftTeam), right: trn(rightTeam) }}
              icon={<GitBranch size={20} />}
              info="Binary ağacınızdaki toplam üye sayısı."
              flipped={flippedCard === 'Ekibim'}
              onFlip={() => flip('Ekibim')}
              onClick={() => go('/account/tree')}
            />
            <StatBlock
              label="Anlık Eşleşme"
              value={`${trn(d?.monthly_matched_cv)} CV`}
              kalanBoxes={{ left: trn(leftCv), right: trn(rightCv) }}
              icon={<Scale size={20} />}
              info="Kısa kol ile eşleşen puanınız."
              flipped={flippedCard === 'Anlık Eşleşme'}
              onFlip={() => flip('Anlık Eşleşme')}
              onClick={() => go('/account/binary-transactions')}
            />
            <StatBlock
              label="Kişisel Toplam Kazanç"
              value={tl(d?.wallet?.total_earned)}
              icon={<Award size={20} />}
              info="Sisteme katılımınızdan beri toplam kazancınız."
              flipped={flippedCard === 'Kişisel Toplam Kazanç'}
              onFlip={() => flip('Kişisel Toplam Kazanç')}
              onClick={() => go('/account/commissions')}
            />
            <StatBlock
              label="Yerleşim Bekleyen"
              value={trn(pendingCount)}
              icon={<Clock size={20} />}
              info="Ağaca yerleştirilmeyi bekleyen üyeler."
              flipped={flippedCard === 'Yerleşim Bekleyen'}
              onFlip={() => flip('Yerleşim Bekleyen')}
              onClick={openPendingModal}
            />
            <StatBlock
              label="Anlık Kazanç"
              value={tl(d?.monthly_earned)}
              icon={<Wallet size={20} />}
              info="Bu cari dönemde oluşan güncel hakedişiniz."
              flipped={flippedCard === 'Anlık Kazanç'}
              onFlip={() => flip('Anlık Kazanç')}
              onClick={() => go('/account/commissions?type=binary')}
            />
          </div>
        </div>
      </div>

      {/* ── Hızlı erişim (sipariş / cüzdan / adres) ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link
          href="/account/orders"
          className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 transition-shadow hover:shadow-md"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-500">
              <ShoppingCart size={20} />
            </span>
            <div>
              <p className="text-sm font-bold text-gray-800">Siparişlerim</p>
              <p className="text-xs text-gray-400">Siparişlerinizi görüntüleyin</p>
            </div>
          </div>
        </Link>
        <Link
          href="/account/wallet"
          className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 transition-shadow hover:shadow-md"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-50 text-yellow-500">
              <Wallet size={20} />
            </span>
            <div>
              <p className="text-sm font-bold text-gray-800">Cüzdanım</p>
              <p className="text-xs text-gray-400">Bakiye ve işlemleriniz</p>
            </div>
          </div>
        </Link>
        <Link
          href="/account/addresses"
          className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 transition-shadow hover:shadow-md"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-500">
              <Users size={20} />
            </span>
            <div>
              <p className="text-sm font-bold text-gray-800">Adreslerim</p>
              <p className="text-xs text-gray-400">Teslimat adreslerinizi yönetin</p>
            </div>
          </div>
        </Link>
      </div>

      <p className="text-center text-xs text-gray-400">
        Bu hesap BestWork üyelik sisteminize bağlıdır — kariyer, ekip ve kazanç verileriniz canlıdır.
      </p>

      {/* ── Yerleşim Bekleyenler Modalı ── */}
      {pendingOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setPendingOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-gray-900">Yerleşim Bekleyen Üyeler</h3>
              <button
                type="button"
                aria-label="Kapat"
                onClick={() => setPendingOpen(false)}
                className="cursor-pointer rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            {pendingLoading ? (
              <div className="py-8 text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
              </div>
            ) : pendingUsers.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">Yerleşim bekleyen üye yok.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="bg-brand-600 text-left text-white">
                      <th className="px-3 py-2 font-bold">Üye No</th>
                      <th className="px-3 py-2 font-bold">Ad Soyad</th>
                      <th className="px-3 py-2 font-bold">Kayıt Tarihi</th>
                      <th className="px-3 py-2 font-bold">Bekleme Başlangıcı</th>
                      <th className="px-3 py-2 text-center font-bold">Ağaca Yerleştir</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingUsers.map((u) => (
                      <tr key={u.id} className="border-b border-gray-100 transition-colors hover:bg-gray-50">
                        <td className="px-3 py-2 font-mono font-bold">{u.member_code || '—'}</td>
                        <td className="px-3 py-2 font-semibold">{u.name}</td>
                        <td className="px-3 py-2 text-gray-500">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString('tr-TR', TR_DATE) : '—'}
                        </td>
                        <td className="px-3 py-2 text-gray-500">
                          {u.pending_since ? new Date(u.pending_since).toLocaleDateString('tr-TR', TR_DATE) : '—'}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setPendingOpen(false)
                              go('/account/pending')
                            }}
                            className="cursor-pointer rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-brand-700"
                          >
                            Ağaca Yerleştir
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Paket Seviyenizi Yükseltin Modalı ── */}
      {upgradeOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setUpgradeOpen(false)}
        >
          <div
            className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-center text-xl font-extrabold text-gray-900">Paket Seviyenizi Yükseltin</h3>
              <button
                type="button"
                aria-label="Kapat"
                onClick={() => setUpgradeOpen(false)}
                className="cursor-pointer rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-1">
              {/* Mevcut seviye + 5 çizgi */}
              <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                <span className="text-sm font-semibold text-gray-500">Mevcut Seviye</span>
                <span className="font-extrabold text-brand-700">{currentPkgName}</span>
              </div>

              <div className="flex gap-0.5 pt-1">
                {Array.from({ length: 5 }, (_, i) => {
                  let fill = 0
                  if (i < levelIndex) fill = 100
                  else if (i === levelIndex) fill = currentSegPct
                  return (
                    <div key={i} className="h-2 flex-grow overflow-hidden rounded bg-gray-100">
                      <div
                        className="h-full rounded bg-brand-600 transition-[width] duration-700 ease-out"
                        style={{ width: `${fill}%` }}
                      />
                    </div>
                  )
                })}
              </div>

              <p className="pt-2 text-center text-xs text-gray-400">
                Paket yükseltme için ürünler <span className="font-bold text-gray-700">perakende satış fiyatından</span>{' '}
                satılır (indirim uygulanmaz).
              </p>

              {/* Ürün listesi */}
              <div className="max-h-[300px] space-y-1.5 overflow-y-auto pr-0.5">
                {products.length === 0 ? (
                  <p className="py-4 text-center text-xs text-gray-400">Ürün bulunamadı.</p>
                ) : (
                  products.map((p) => {
                    const qty = cartQtyOf(p.id)
                    const pvVal = Number(p.pv) || 0
                    return (
                      <div key={p.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-100 px-2 py-2">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100">
                          {p.thumbnail ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.thumbnail} alt={p.name} className="block h-full w-full object-cover" />
                          ) : (
                            <User size={20} className="text-gray-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold text-gray-800">{p.name}</p>
                          <p className="text-[13px] font-extrabold text-brand-600">{formatPrice(p.price)}</p>
                          <p className="text-[10px] text-gray-400">
                            {pvVal} PV · {Number(p.cv) || 0} CV
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            aria-label="Adedi azalt"
                            onClick={() => {
                              if (qty > 0) updateQuantity(Number(p.id), qty - 1)
                            }}
                            disabled={qty <= 0}
                            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-gray-200 text-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-8 text-center text-sm font-bold text-gray-800">{qty}</span>
                          <button
                            type="button"
                            aria-label="Adedi artır"
                            onClick={() => {
                              if (qty < (p.stock ?? 999)) addToCart(p as never, 1)
                            }}
                            disabled={qty >= (p.stock ?? 999)}
                            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-gray-200 text-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromCart(Number(p.id))}
                          disabled={qty <= 0}
                          className="flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-red-200 px-2 py-1.5 text-xs font-bold text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Trash2 size={14} /> Sil
                        </button>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Toplamlar */}
              <div className="mt-3 space-y-1 rounded-xl bg-gray-50 px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500">Toplam PV</span>
                  <span className="text-sm font-extrabold text-brand-700">{trn(modalPV)} PV</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500">Toplam Tutar</span>
                  <span className="text-sm font-extrabold text-brand-700">{formatPrice(modalTotal)}</span>
                </div>
              </div>

              {/* Aksiyonlar */}
              <div className="flex flex-wrap gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setUpgradeOpen(false)
                    window.location.href = '/cart'
                  }}
                  className="flex min-w-[140px] flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-700"
                >
                  <ShoppingCart size={16} /> Sepete Git
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearCart()
                    toast.success('Sepet temizlendi.')
                  }}
                  className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-bold text-red-500 transition-colors hover:bg-red-50"
                >
                  <Trash2 size={16} /> Temizle
                </button>
                <button
                  type="button"
                  onClick={() => setUpgradeOpen(false)}
                  className="cursor-pointer rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Başarı raporu gizli bağlantı ikonu (üye kayıt linki boşken gösterilmez) */}
      {!registerLink && (
        <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
          <LogIn size={14} /> Üye kayıt linki için üyelik sistemine giriş yapın.
        </div>
      )}
    </div>
  )
}
