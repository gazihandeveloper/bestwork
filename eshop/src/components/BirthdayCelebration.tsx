/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'
// Doğum günü kutlaması (v8) — TÜM ÜYELER için kayıttaki doğum tarihine göre.
// - Üyenin profile.birth_date ay/gün'ü bugünle eşleşirse popup açılır.
// - Yılda bir kez gösterilir (kullanıcı + yıl bazlı anahtar).
// - Video: YouTube (I_76G2-hWaA); Ender için Dailymotion alternatifi korunur.
// - İlk 25 saniye oynatılır; "Teşekkür ederim" butonu tek basışta kapatır.
import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useAuth } from '@/contexts/AuthContext'

const YT_ID = 'I_76G2-hWaA'
const YT_WATCH = `https://www.youtube.com/watch?v=${YT_ID}`
const YT_THUMB = `https://img.youtube.com/vi/${YT_ID}/hqdefault.jpg`
const DM_WATCH = 'https://www.dailymotion.com/video/x9abxqo'
const FALLBACK_MS = 12 * 1000
const LIMIT_SECONDS = 25

const CONFETTI_COLORS = ['#f6c453', '#29a56c', '#ef4444', '#3b82f6', '#a855f7', '#f97316', '#ffffff']

export default function BirthdayCelebration() {
  const { user, loading } = useAuth()
  const [open, setOpen] = useState(false)
  const [origin, setOrigin] = useState('')
  const [unmuted, setUnmuted] = useState(false)
  const [fallback, setFallback] = useState(false)
  const [playedLeft, setPlayedLeft] = useState(LIMIT_SECONDS)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const gotMessage = useRef(false)
  const limitReached = useRef(false)
  const accumRef = useRef(0)
  const sinceRef = useRef<number | null>(null)

  // Doğum günü bugün mü? (kayıttaki birth_date ay/gün eşleşmesi)
  const birthDate = (user?.birth_date || '').trim()
  const now = new Date()
  const todayMD = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const birthdayToday = !!birthDate && birthDate.slice(5, 10) === todayMD

  // Özel durum: doğum tarihi kayıtlı olmayan Ender (geçiş dönemi).
  const isEnder =
    !!user &&
    (user.email?.toLowerCase() === 'best@bestwork.com' ||
      (user.fullName || '').toLowerCase().includes('ender'))
  const shouldCelebrate = birthdayToday || (isEnder && !birthDate)

  const firstName = (user?.first_name || (user?.fullName || '').split(' ')[0] || '').trim()
  const displayName = firstName || 'Değerli Üyemiz'

  const doneKey = user ? `bw_bday_${user.id}_${now.getFullYear()}` : ''

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  useEffect(() => {
    if (loading || !user || !shouldCelebrate || !doneKey) return
    try {
      if (localStorage.getItem(doneKey) === '1') return
    } catch {
      /* yoksay */
    }
    setOpen(true)
  }, [loading, user, shouldCelebrate, doneKey])

  // Gövde kaydırmasını kilitle
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  // YouTube durum mesajları + yedek ekran + 25 sn oynatma sınırı
  useEffect(() => {
    if (!open) return
    gotMessage.current = false

    const onMsg = (e: MessageEvent) => {
      if (typeof e.origin !== 'string' || !e.origin.includes('youtube.com')) return
      let d: any = e.data
      if (typeof d === 'string') {
        try {
          d = JSON.parse(d)
        } catch {
          return
        }
      }
      if (!d || typeof d !== 'object') return
      if (d.event === 'onReady' || d.event === 'onStateChange' || d.event === 'onError') {
        gotMessage.current = true
      }
      if (d.event === 'onError') setFallback(true)
      if (d.event === 'onStateChange') {
        if (d.info === 1) {
          setFallback(false)
          if (sinceRef.current == null) sinceRef.current = Date.now()
        } else {
          if (sinceRef.current != null) {
            accumRef.current += (Date.now() - sinceRef.current) / 1000
            sinceRef.current = null
          }
        }
      }
    }
    window.addEventListener('message', onMsg)

    const fallbackTimer = setTimeout(() => {
      if (!gotMessage.current) setFallback(true)
    }, FALLBACK_MS)

    const timer = setInterval(() => {
      const played =
        accumRef.current + (sinceRef.current ? (Date.now() - sinceRef.current) / 1000 : 0)
      const left = Math.max(0, LIMIT_SECONDS - played)
      setPlayedLeft(Math.ceil(left))
      if (left <= 0 && !limitReached.current) {
        limitReached.current = true
        ytCmd('pauseVideo')
      }
    }, 500)

    return () => {
      window.removeEventListener('message', onMsg)
      clearTimeout(fallbackTimer)
      clearInterval(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const ytCmd = (func: string, args: unknown[] = []) => {
    try {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func, args }),
        '*'
      )
    } catch {
      /* yoksay */
    }
  }

  // YouTube köprüsü: parent -> iframe "listening" el sıkışması.
  const ytHandshake = () => {
    const send = () => {
      try {
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ event: 'listening' }),
          '*'
        )
      } catch {
        /* yoksay */
      }
    }
    send()
    setTimeout(send, 600)
    setTimeout(send, 1600)
  }

  const sesiAc = () => {
    ytCmd('unMute')
    ytCmd('setVolume', [100])
    setUnmuted(true)
  }

  // Tek basışta kapat + bu yıl için bir daha gösterme
  const kapat = useCallback(() => {
    try {
      if (doneKey) localStorage.setItem(doneKey, '1')
    } catch {
      /* yoksay */
    }
    setOpen(false)
  }, [doneKey])

  if (!open) return null

  const iframeSrc = `https://www.youtube.com/embed/${YT_ID}?autoplay=1&mute=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1${
    origin ? `&origin=${encodeURIComponent(origin)}` : ''
  }`

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-3 sm:p-6">
      <style>{`
        @keyframes bw-confetti-fall { 0% { transform: translate3d(0,-10vh,0) rotate(0deg); opacity: 1 } 100% { transform: translate3d(var(--bw-x,0), 110vh, 0) rotate(720deg); opacity: .9 } }
        @keyframes bw-bday-pop { 0% { transform: scale(.85); opacity: 0 } 100% { transform: scale(1); opacity: 1 } }
        .bw-confetti-piece { position: fixed; top: -6vh; border-radius: 2px; animation: bw-confetti-fall linear forwards; pointer-events: none; z-index: 3001; }
      `}</style>
      <div className="absolute inset-0 bg-gray-950/80 backdrop-blur-sm" />
      {Array.from({ length: 90 }).map((_, i) => (
        <span
          key={i}
          className="bw-confetti-piece"
          style={
            {
              left: `${(i * 37) % 100}%`,
              backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
              animationDuration: `${3.2 + (i % 10) * 0.35}s`,
              animationDelay: `${(i % 12) * 0.25}s`,
              width: i % 3 === 0 ? 8 : 10,
              height: i % 4 === 0 ? 8 : 14,
              '--bw-x': `${((i % 7) - 3) * 30}px`,
            } as CSSProperties
          }
        />
      ))}
      <div
        className="relative z-[3002] w-full max-w-3xl overflow-hidden rounded-3xl shadow-2xl ring-1 ring-white/15"
        style={{
          backgroundImage: 'linear-gradient(180deg,#0E4E34 0%,#0B3B2C 55%,#07271C 100%)',
          animation: 'bw-bday-pop .45s ease-out',
        }}
      >
        <div className="pointer-events-none absolute -left-20 -top-20 h-56 w-56 rounded-full bg-[#f6c453]/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-16 h-64 w-64 rounded-full bg-[#29a56c]/25 blur-3xl" />
        <div className="relative px-5 pb-6 pt-7 text-center sm:px-10 sm:pb-8">
          <div className="text-5xl">🎂</div>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            İyi ki doğdun{' '}
            <span className="bg-gradient-to-r from-[#f6c453] to-[#ffd98a] bg-clip-text text-transparent">
              {displayName}!
            </span>{' '}
            🎉
          </h2>
          <p className="mt-2 text-sm text-white/75">
            Nice mutlu, sağlıklı ve başarılı senelere! BestWork ailesi seninle gurur duyuyor 💚
          </p>

          <div className="mx-auto mt-5 aspect-video w-full max-w-2xl overflow-hidden rounded-2xl bg-black shadow-xl ring-1 ring-white/20">
            {!fallback ? (
              origin ? (
                <iframe
                  ref={iframeRef}
                  onLoad={ytHandshake}
                  src={iframeSrc}
                  title="Doğum günün kutlu olsun"
                  className="h-full w-full"
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <div className="size-7 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                </div>
              )
            ) : (
              <div className="relative h-full w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={YT_THUMB}
                  alt="Doğum günü şarkısı"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/50 px-4">
                  <a
                    href={YT_WATCH}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-full bg-[#ff0033] px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:scale-105"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    YouTube&apos;da İzle
                  </a>
                  {isEnder && (
                    <a
                      href={DM_WATCH}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-white/80 underline-offset-2 transition hover:text-white hover:underline"
                    >
                      Alternatif: Dailymotion&apos;da Dinle →
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-col items-center gap-3">
            {!fallback && !unmuted && (
              <button
                onClick={sesiAc}
                className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/25 transition hover:bg-white/25"
              >
                🔊 Sesi Aç
              </button>
            )}

            <button
              onClick={kapat}
              className="rounded-xl bg-gradient-to-r from-[#f6c453] to-[#ffd98a] px-8 py-3 text-sm font-bold text-[#07271C] shadow-lg transition hover:brightness-105 active:scale-[.99]"
            >
              Teşekkür ederim 🎉
            </button>

            {!fallback && (
              <div className="text-[11px] text-white/45">
                🎬 İlk {LIMIT_SECONDS} saniyesi oynatılıyor
                {playedLeft > 0 && playedLeft < LIMIT_SECONDS ? ` · ${playedLeft} sn kaldı` : ''}
              </div>
            )}
            {!fallback && (
              <a
                href={YT_WATCH}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-white/45 underline-offset-2 transition hover:text-white/75 hover:underline"
              >
                Video açılmıyor mu? YouTube&apos;da izle →
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
