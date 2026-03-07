'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { CheckCircle2, CreditCard, Loader2, Tag, Sparkles, Shield, Zap } from 'lucide-react'

const SUBSCRIPTION_PLANS = {
  monthly: { price: 199990, label: '1 Oylik', days: 30 },
  yearly:  { price: 1499990, label: 'Yillik', days: 365 },
} as const

type PlanKey = keyof typeof SUBSCRIPTION_PLANS

interface SubscriptionCheckProps {
  userId?: string | null
  children: React.ReactNode
}

// localStorage cache kaliti
const CACHE_KEY = 'sub_active'
const CACHE_EXPIRY_KEY = 'sub_active_until'
// Cache muddati: 6 soat (ms)
const CACHE_DURATION_MS = 6 * 60 * 60 * 1000

function getCachedStatus(userId: string): boolean {
  try {
    const cachedUserId = localStorage.getItem(CACHE_KEY)
    const expiryStr    = localStorage.getItem(CACHE_EXPIRY_KEY)
    if (!cachedUserId || !expiryStr) return false
    if (cachedUserId !== userId) return false          // boshqa user
    if (Date.now() > parseInt(expiryStr, 10)) return false // muddati o'tgan
    return true
  } catch {
    return false
  }
}

function setCachedStatus(userId: string) {
  try {
    localStorage.setItem(CACHE_KEY, userId)
    localStorage.setItem(CACHE_EXPIRY_KEY, String(Date.now() + CACHE_DURATION_MS))
  } catch {}
}

function clearCachedStatus() {
  try {
    localStorage.removeItem(CACHE_KEY)
    localStorage.removeItem(CACHE_EXPIRY_KEY)
  } catch {}
}

export default function SubscriptionCheck({ userId, children }: SubscriptionCheckProps) {
  const [status, setStatus]             = useState<'loading' | 'active' | 'inactive'>('loading')
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>('monthly')
  const [promoCode, setPromoCode]       = useState('')
  const [promoMsg, setPromoMsg]         = useState<{ ok: boolean; text: string } | null>(null)
  const [promoData, setPromoData]       = useState<any>(null)
  const [processing, setProcessing]     = useState(false)

  useEffect(() => { checkSub() }, [userId])

  /* ── 1. OBUNA TEKSHIRISH ── */
  async function checkSub() {
    if (!userId) { setStatus('inactive'); return }

    // Avval cache'dan tekshir — sahifa yangilanganda shu ishlaydi
    if (getCachedStatus(userId)) {
      setStatus('active')
      return
    }

    // Cache yo'q yoki muddati o'tgan — Supabase'dan tekshir
    try {
      const { data } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .gte('expires_at', new Date().toISOString())
        .maybeSingle()

      if (data) {
        setCachedStatus(userId)   // topildi → cache'ga yoz
        setStatus('active')
      } else {
        clearCachedStatus()
        setStatus('inactive')
      }
    } catch {
      // Supabase xatosi bo'lsa ham foydalanuvchini bloklama
      // Agar oldin cache bo'lmagan bo'lsa inactive ko'rsat
      setStatus('inactive')
    }
  }

  /* ── 2. PROMO KOD TEKSHIRISH ── */
  async function validatePromo() {
    const code = promoCode.trim().toUpperCase()
    if (!code) return

    if (code === 'FREE2026' || code === 'DEMO') {
      setPromoData({ type: 'free', free_days: 9999 })
      setPromoMsg({ ok: true, text: 'Bepul kirish faollashtirildi! 🎉' })
      return
    }

    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', code)
        .eq('active', true)
        .maybeSingle()

      if (error || !data) {
        setPromoMsg({ ok: false, text: 'Promo kod topilmadi' })
        setPromoData(null)
        return
      }
      if (data.max_uses && data.current_uses >= data.max_uses) {
        setPromoMsg({ ok: false, text: 'Bu kodning limiti tugagan' })
        setPromoData(null)
        return
      }
      setPromoData(data)
      setPromoMsg({ ok: true, text: 'Promo kod qabul qilindi ✓' })
    } catch {
      setPromoMsg({ ok: false, text: 'Xatolik yuz berdi' })
      setPromoData(null)
    }
  }

  /* ── 3. OBUNA / BEPUL FAOLLASHTIRISH ── */
  async function handleSubscribe() {
    if (!userId) return
    setProcessing(true)
    try {
      const plan        = SUBSCRIPTION_PLANS[selectedPlan]
      const isFree      = promoData?.type === 'free'
      const freeDays    = promoData?.free_days ?? 0

      let discountAmount = 0
      if (promoData && !isFree) {
        discountAmount = promoData.discount_percent
          ? Math.round((plan.price * promoData.discount_percent) / 100)
          : (promoData.discount_amount ?? 0)
      }
      const finalAmount = isFree ? 0 : Math.max(0, plan.price - discountAmount)

      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + (isFree ? freeDays : plan.days))

      const { error } = await supabase.from('subscriptions').insert({
        user_id:         userId,
        plan_type:       selectedPlan,
        amount:          plan.price,
        discount_amount: discountAmount,
        final_amount:    finalAmount,
        promo_code:      promoCode.trim().toUpperCase() || null,
        expires_at:      expiresAt.toISOString(),
        is_active:       true,
      })
      if (error) throw error

      // Promo ishlatilishini yangilash
      if (promoData && promoData.type !== 'free' && promoCode) {
        await supabase
          .from('promo_codes')
          .update({ current_uses: (promoData.current_uses ?? 0) + 1 })
          .eq('code', promoCode.trim().toUpperCase())
      }

      // Muvaffaqiyatli — cache'ga yoz va sahifani ko'rsat
      setCachedStatus(userId)
      setStatus('active')
    } catch (err: any) {
      alert('Xatolik: ' + (err.message ?? 'Noma\'lum xato'))
    } finally {
      setProcessing(false)
    }
  }

  /* ── HISOB-KITOB ── */
  const plan         = SUBSCRIPTION_PLANS[selectedPlan]
  const isFreePromo  = promoData?.type === 'free'
  const discountAmount = promoData && !isFreePromo
    ? promoData.discount_percent
      ? Math.round((plan.price * promoData.discount_percent) / 100)
      : (promoData.discount_amount ?? 0)
    : isFreePromo ? plan.price : 0
  const finalAmount = Math.max(0, plan.price - discountAmount)

  /* ══════════════════════════════════ RENDER ══════════════════════════════════ */

  if (status === 'loading')
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0f1e]">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-400" />
      </div>
    )

  if (status === 'active') return <>{children}</>

  /* ── OBUNA SAHIFASI ── */
  return (
    <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center p-4">

      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg">

        {/* HEADER */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-medium mb-4">
            <Shield className="w-4 h-4" /> Premium kirish
          </div>
          <h1 className="text-4xl font-black text-white mb-2 tracking-tight">
            Obuna bo'ling
          </h1>
          <p className="text-slate-400 text-sm">
            Barcha funksiyalardan to'liq foydalanish uchun
          </p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur border border-slate-700/50 rounded-3xl p-6 shadow-2xl shadow-black/40">

          {/* REJALAR */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {(Object.keys(SUBSCRIPTION_PLANS) as PlanKey[]).map((key) => {
              const p      = SUBSCRIPTION_PLANS[key]
              const active = selectedPlan === key
              return (
                <button
                  key={key}
                  onClick={() => setSelectedPlan(key)}
                  className={`relative p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
                    active
                      ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  }`}
                >
                  {key === 'yearly' && (
                    <span className="absolute -top-2.5 left-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                      TEJAMKOR
                    </span>
                  )}
                  <p className="text-slate-300 text-xs font-semibold uppercase tracking-wider mb-1">
                    {p.label}
                  </p>
                  <p className="text-white font-black text-xl leading-none">
                    {p.price.toLocaleString('uz-UZ')}
                    <span className="text-slate-400 text-xs font-normal ml-1">so'm</span>
                  </p>
                  {active && (
                    <CheckCircle2 className="absolute top-3 right-3 w-4 h-4 text-indigo-400" />
                  )}
                </button>
              )
            })}
          </div>

          {/* PROMO KOD */}
          <div className="mb-5">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              <Tag className="w-3.5 h-3.5" /> Promo kod
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Masalan: FREE2026"
                value={promoCode}
                onChange={(e) => {
                  setPromoCode(e.target.value.toUpperCase())
                  setPromoMsg(null)
                  setPromoData(null)
                }}
                onKeyDown={(e) => e.key === 'Enter' && validatePromo()}
                className="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all uppercase tracking-widest"
              />
              <button
                onClick={validatePromo}
                className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-xl text-white text-sm font-bold transition-all"
              >
                Tekshir
              </button>
            </div>
            {promoMsg && (
              <p className={`mt-2 text-xs font-medium ${promoMsg.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                {promoMsg.text}
              </p>
            )}
          </div>

          {/* NARX JADVALI */}
          <div className="bg-slate-800/60 rounded-2xl p-4 mb-5 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Narx</span>
              <span className="text-white font-semibold">{plan.price.toLocaleString('uz-UZ')} so'm</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Chegirma</span>
                <span className="text-emerald-400 font-semibold">
                  −{discountAmount.toLocaleString('uz-UZ')} so'm
                </span>
              </div>
            )}
            <div className="border-t border-slate-700 pt-2 flex justify-between items-center">
              <span className="text-white font-bold">To'lov</span>
              <span className={`font-black text-2xl ${isFreePromo ? 'text-emerald-400' : 'text-indigo-300'}`}>
                {isFreePromo ? 'BEPUL 🎉' : `${finalAmount.toLocaleString('uz-UZ')} so'm`}
              </span>
            </div>
          </div>

          {/* TUGMA */}
          <button
            onClick={handleSubscribe}
            disabled={processing}
            className={`w-full py-3.5 rounded-xl font-black text-white text-base transition-all duration-200 flex items-center justify-center gap-2 shadow-lg
              ${isFreePromo
                ? 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 shadow-emerald-900/30'
                : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-indigo-900/30'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {processing ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Yuklanmoqda...</>
            ) : isFreePromo ? (
              <><Sparkles className="w-5 h-5" /> Bepul Faollashtirish</>
            ) : (
              <><CreditCard className="w-5 h-5" /> Obuna Bo'lish</>
            )}
          </button>

          <p className="text-center text-slate-600 text-xs mt-4">
            Obuna faollashtirilgandan so'ng barcha funksiyalar ochiladi
          </p>
        </div>

        {/* XUSUSIYATLAR */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { icon: <Zap className="w-4 h-4" />, text: 'Tezkor kirish' },
            { icon: <Shield className="w-4 h-4" />, text: 'Xavfsiz to\'lov' },
            { icon: <CheckCircle2 className="w-4 h-4" />, text: 'Kafolatlangan' },
          ].map((f, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 p-3 bg-slate-900/50 rounded-2xl border border-slate-800">
              <span className="text-indigo-400">{f.icon}</span>
              <span className="text-slate-400 text-xs text-center">{f.text}</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}