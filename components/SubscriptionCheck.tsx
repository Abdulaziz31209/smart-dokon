'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, CreditCard, Calendar, Tag, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

interface SubscriptionCheckProps {
  userId: string
  children: React.ReactNode
}

const SUBSCRIPTION_PLANS = {
  monthly: { price: 199990, label: '1 oylik', days: 30 },
  yearly: { price: 149999, label: 'Har oy (yillik)', days: 365, total: 1799988 }
}

export default function SubscriptionCheck({ userId, children }: SubscriptionCheckProps) {
  const [hasSubscription, setHasSubscription] = useState<boolean | null>(null)
  const [subscription, setSubscription] = useState<any>(null)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [promoResult, setPromoResult] = useState<any>(null)
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly')

  useEffect(() => {
    checkSubscription()
  }, [userId])

  const checkSubscription = async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.rpc('has_active_subscription', {
        p_user_id: userId
      })

      if (error) throw error

      if (data) {
        const { data: subData } = await supabase.rpc('get_active_subscription', {
          p_user_id: userId
        })
        if (subData && subData.length > 0) {
          setSubscription(subData[0])
          setHasSubscription(true)
        } else {
          setHasSubscription(false)
        }
      } else {
        setHasSubscription(false)
      }
    } catch (err) {
      console.error('Subscription check error:', err)
      setHasSubscription(false)
    } finally {
      setLoading(false)
    }
  }

  const validatePromoCode = async () => {
    if (!promoCode.trim()) {
      setPromoResult(null)
      return
    }

    try {
      const { data, error } = await supabase.rpc('validate_promo_code', {
        p_code: promoCode.trim().toUpperCase()
      })

      if (error) throw error

      if (data && data.length > 0 && data[0].valid) {
        setPromoResult(data[0])
      } else {
        setPromoResult({ valid: false, message: data?.[0]?.message || 'Promo kod topilmadi' })
      }
    } catch (err: any) {
      setPromoResult({ valid: false, message: err.message || 'Xatolik yuz berdi' })
    }
  }

  const handleSubscribe = async () => {
    if (!userId) return

    setProcessing(true)
    try {
      const plan = SUBSCRIPTION_PLANS[selectedPlan]
      let finalAmount = plan.price
      let discountAmount = 0
      let freeDays = 0

      if (promoResult?.valid) {
        if (promoResult.discount_percent > 0) {
          discountAmount = (plan.price * promoResult.discount_percent) / 100
          finalAmount = plan.price - discountAmount
        } else if (promoResult.discount_amount > 0) {
          discountAmount = promoResult.discount_amount
          finalAmount = Math.max(0, plan.price - discountAmount)
        }
        if (promoResult.free_days > 0) {
          freeDays = promoResult.free_days
        }
      }

      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + plan.days + freeDays)

      const { error } = await supabase.from('subscriptions').insert({
        user_id: userId,
        plan_type: selectedPlan,
        amount: plan.price,
        promo_code: promoCode.trim().toUpperCase() || null,
        discount_amount: discountAmount,
        final_amount: finalAmount,
        expires_at: expiresAt.toISOString(),
        is_active: true
      })

      if (error) throw error

      // Promo kodni yangilash
      if (promoCode && promoResult?.valid) {
        await supabase.rpc('increment_promo_usage', { p_code: promoCode.trim().toUpperCase() })
      }

      await checkSubscription()
      setShowModal(false)
      setPromoCode('')
      setPromoResult(null)
    } catch (err: any) {
      alert('Xatolik: ' + err.message)
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    )
  }

  // Agar obuna mavjud bo'lsa, kontentni ko'rsatamiz
  if (hasSubscription && subscription) {
    return <>{children}</>
  }

  // Agar obuna tekshiruvi xato bo'lsa yoki hali tekshirilmagan bo'lsa, kontentni ko'rsatamiz (demo rejim uchun)
  if (hasSubscription === null) {
    return <>{children}</>
  }

  // Obuna modal
  return (
    <>
      {/* Bloklangan ekran */}
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-slate-800 border border-slate-700 rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex p-4 bg-red-500/10 rounded-2xl border border-red-500/20 mb-4">
              <AlertCircle className="w-12 h-12 text-red-400" />
            </div>
            <h1 className="text-3xl font-black text-white mb-2">Obuna Talab Qilinadi</h1>
            <p className="text-slate-400">
              Tizimdan foydalanish uchun obuna bo'lishingiz kerak
            </p>
          </div>

          {/* Obuna rejalari */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {(['monthly', 'yearly'] as const).map((planKey) => {
              const plan = SUBSCRIPTION_PLANS[planKey]
              const isSelected = selectedPlan === planKey
              return (
                <button
                  key={planKey}
                  onClick={() => setSelectedPlan(planKey)}
                  className={`p-6 rounded-2xl border-2 transition-all text-left ${
                    isSelected
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-slate-700 bg-slate-900/50 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-white font-bold text-lg">{plan.label}</h3>
                    {isSelected && <CheckCircle2 className="w-5 h-5 text-blue-400" />}
                  </div>
                  <p className="text-3xl font-black text-emerald-400 mb-1">
                    {plan.price.toLocaleString('uz-UZ')} <span className="text-sm text-slate-400">so'm</span>
                  </p>
                  {planKey === 'yearly' && 'total' in plan && (
  <p className="text-xs text-slate-500 line-through mb-1">
    {Number(plan.total).toLocaleString('uz-UZ')} so'm
  </p>
)}
                  <p className="text-sm text-slate-400">{plan.days} kun</p>
                </button>
              )
            })}   
          </div>

          {/* Promo kod */}
          <div className="mb-6">
            <label className="text-sm font-bold text-slate-400 uppercase mb-2 block flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Promo kod (ixtiyoriy)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="PROMO2026"
                value={promoCode}
                onChange={(e) => {
                  setPromoCode(e.target.value.toUpperCase())
                  setPromoResult(null)
                }}
                onBlur={validatePromoCode}
                className="flex-1 px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm uppercase"
              />
              <button
                onClick={validatePromoCode}
                className="px-4 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-bold text-sm transition-all"
              >
                Tekshirish
              </button>
            </div>
            {promoResult && (
              <p className={`text-xs mt-2 ${promoResult.valid ? 'text-emerald-400' : 'text-red-400'}`}>
                {promoResult.valid ? '✓ ' + promoResult.message : '✗ ' + promoResult.message}
              </p>
            )}
          </div>

          {/* Jami */}
          <div className="bg-slate-900/50 rounded-xl p-4 mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-400">Narx:</span>
              <span className="text-white font-bold">
                {SUBSCRIPTION_PLANS[selectedPlan].price.toLocaleString('uz-UZ')} so'm
              </span>
            </div>
            {promoResult?.valid && promoResult.discount_amount > 0 && (
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-400">Chegirma:</span>
                <span className="text-emerald-400 font-bold">
                  -{promoResult.discount_amount.toLocaleString('uz-UZ')} so'm
                </span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t border-slate-700">
              <span className="text-white font-bold">Jami:</span>
              <span className="text-emerald-400 font-black text-xl">
                {(() => {
                  const plan = SUBSCRIPTION_PLANS[selectedPlan]
                  let final = plan.price
                  if (promoResult?.valid) {
                    if (promoResult.discount_percent > 0) {
                      final = plan.price - (plan.price * promoResult.discount_percent) / 100
                    } else if (promoResult.discount_amount > 0) {
                      final = Math.max(0, plan.price - promoResult.discount_amount)
                    }
                  }
                  return final.toLocaleString('uz-UZ')
                })()} so'm
              </span>
            </div>
          </div>

          {/* To'lov tugmasi */}
          <button
            onClick={handleSubscribe}
            disabled={processing}
            className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black rounded-xl text-lg shadow-xl shadow-emerald-900/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {processing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                To'lanmoqda...
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                Obuna Bo'lish
              </>
            )}
          </button>

          <p className="text-xs text-slate-500 text-center mt-4">
            To'lov amalga oshirilgandan so'ng, obuna avtomatik faollashtiriladi
          </p>
        </div>
      </div>
    </>
  )
}
