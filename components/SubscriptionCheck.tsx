'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { AlertCircle, CheckCircle2, CreditCard, Loader2, Tag } from 'lucide-react'

// Tipni aniqlab olamiz (bu xatoni yo'qotadi)
interface Plan {
  price: number
  label: string
  days: number
}

// as const o'rniga aniq tipdan foydalanamiz
const SUBSCRIPTION_PLANS: Record<'monthly' | 'yearly', Plan> = {
  monthly: { price: 199990, label: '1 oylik', days: 30 },
  yearly: { price: 1499990, label: 'Yillik', days: 365 },
}

interface SubscriptionCheckProps {
  userId?: string | null
  children: React.ReactNode
}

export default function SubscriptionCheck({ userId, children }: SubscriptionCheckProps) {
  const [hasSubscription, setHasSubscription] = useState<boolean | null>(null)
  const [subscription, setSubscription] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [promoResult, setPromoResult] = useState<any>(null)
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly')

  // 1. OBUNA TEKSHIRISH
  useEffect(() => {
    checkSubscription()
  }, [userId])

  const checkSubscription = async () => {
    if (!userId) {
      setHasSubscription(null)
      setSubscription(null)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .gte('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: false })
        .maybeSingle()

      if (error) throw error
      
      setSubscription(data)
      setHasSubscription(!!data)
    } catch (err) {
      console.error('Subscription error:', err)
      setHasSubscription(false)
    } finally {
      setLoading(false)
    }
  }

  // 2. PROMO KOD TEKSHIRISH
  const validatePromoCode = async () => {
    const code = promoCode.trim().toUpperCase()
    if (!code) return

    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', code)
      .eq('active', true)
      .maybeSingle()

    if (error || !data) {
      setPromoResult({ valid: false, message: 'Kod topilmadi' })
      return
    }

    if (data.max_uses && data.current_uses >= data.max_uses) {
      setPromoResult({ valid: false, message: 'Limit tugagan' })
    } else {
      setPromoResult({ ...data, valid: true, message: 'Kod faol ✓' })
    }
  }

  // 3. OBUNA SOTIB OLISH
  const handleSubscribe = async () => {
    if (!userId) return
    setProcessing(true)

    try {
      const plan = SUBSCRIPTION_PLANS[selectedPlan]
      let finalAmount = plan.price
      let discountAmount = 0
      let freeDays = 0

      if (promoResult?.valid) {
        discountAmount = promoResult.discount_percent 
          ? (plan.price * promoResult.discount_percent) / 100 
          : (promoResult.discount_amount || 0)
        finalAmount = Math.max(0, plan.price - discountAmount)
        freeDays = promoResult.free_days || 0
      }

      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + plan.days + freeDays)

      const { error } = await supabase.from('subscriptions').insert({
        user_id: userId,
        plan_type: selectedPlan,
        amount: plan.price,
        final_amount: finalAmount,
        expires_at: expiresAt.toISOString(),
        is_active: true
      })

      if (error) throw error

      if (promoResult?.valid) {
        await supabase
          .from('promo_codes')
          .update({ current_uses: (promoResult.current_uses || 0) + 1 })
          .eq('code', promoCode.trim().toUpperCase())
      }

      await checkSubscription()
    } catch (err: any) {
      alert('Xatolik: ' + err.message)
    } finally {
      setProcessing(false)
    }
  }

  // RENDER QISMI
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-900"><Loader2 className="animate-spin text-blue-500" /></div>

  if (hasSubscription === true) return <>{children}</>

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-slate-800 border border-slate-700 rounded-3xl p-8">
        <h1 className="text-3xl font-black text-white text-center mb-8">Obuna bo‘lish</h1>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {(['monthly', 'yearly'] as const).map((key) => (
            <button key={key} onClick={() => setSelectedPlan(key)} 
              className={`p-6 rounded-2xl border-2 ${selectedPlan === key ? 'border-blue-500 bg-blue-950' : 'border-slate-700'}`}>
              <div className="font-bold text-white">{SUBSCRIPTION_PLANS[key].label}</div>
              <div className="text-emerald-400 font-black">{SUBSCRIPTION_PLANS[key].price.toLocaleString()} so‘m</div>
            </button>
          ))}
        </div>

        <div className="flex gap-2 mb-6">
          <input className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white uppercase" 
            placeholder="PROMO KOD" value={promoCode} onChange={(e) => setPromoCode(e.target.value)} />
          <button onClick={validatePromoCode} className="px-6 bg-slate-700 rounded-xl text-white">Tekshir</button>
        </div>

        <button onClick={handleSubscribe} disabled={processing} 
          className="w-full py-4 bg-emerald-600 rounded-xl text-white font-bold">
          {processing ? '...' : 'Obuna bo‘lish'}
        </button>
      </div>
    </div>
  )
}