'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import {
  ShieldCheck, Lock, User, Store, Calendar,
  ArrowRight, AlertCircle, Eye, EyeOff, CheckCircle2,
  XCircle, Phone, MapPin, Tag, ChevronDown, Loader2,
  ArrowLeft, Sparkles, Send, ExternalLink
} from 'lucide-react'
import Link from 'next/link'

// ─── Telegram bot username (env dan olish yaxshiroq) ─────────────────────────
const TELEGRAM_BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? 'YourBotUsername'

// ─── Validatsiya ──────────────────────────────────────────────────────────────
const validators = {
  password:  (v: string) => v.length >= 8 && /[A-Z]/.test(v) && /[0-9]/.test(v),
  phone:     (v: string) => /^\+998\s?\d{2}\s?\d{3}\s?\d{2}\s?\d{2}$/.test(v.replace(/\s/g, '')),
  name:      (v: string) => v.trim().length >= 2,
  shopName:  (v: string) => v.trim().length >= 2,
  email:     (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  birthDate: (v: string) => {
    if (!v) return false
    const age = new Date().getFullYear() - new Date(v).getFullYear()
    return age >= 16 && age <= 100
  },
  otp:       (v: string) => /^\d{6}$/.test(v),
  promoCode: (v: string) => v.trim().length >= 3,
}

function getPasswordStrength(pwd: string) {
  let score = 0
  if (pwd.length >= 8)           score++
  if (pwd.length >= 12)          score++
  if (/[A-Z]/.test(pwd))         score++
  if (/[0-9]/.test(pwd))         score++
  if (/[^A-Za-z0-9]/.test(pwd))  score++
  const map = [
    { label: 'Juda zaif',  color: 'bg-red-500'     },
    { label: 'Juda zaif',  color: 'bg-red-500'     },
    { label: 'Zaif',       color: 'bg-orange-500'  },
    { label: "O'rtacha",   color: 'bg-yellow-500'  },
    { label: 'Yaxshi',     color: 'bg-blue-500'    },
    { label: "A'lo",       color: 'bg-emerald-500' },
  ]
  return { score, ...map[score] }
}

function generateUsername(fullName: string, storeName: string, birthDate: string): string {
  const first  = fullName.trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z]/g, '')
  const store  = storeName.trim().split(/\s+/).slice(-1)[0].toLowerCase().replace(/[^a-z]/g, '').slice(0, 6)
  const parts  = birthDate.split('-')
  const day    = parts[2] ?? '01'
  const yearEnd = (parts[0] ?? '2000').slice(-2)
  return `${first}${store}${day}${yearEnd}`
}

function formatPhone(v: string): string {
  // Faqat raqamlarni olib qolamiz
  const d = v.replace(/\D/g, '')
  
  // Agar hech narsa kiritilmagan bo'lsa, bo'sh qaytaramiz
  if (d.length === 0) return ''
  
  // Agar 998 bilan boshlansa, o'zgartirmaymiz
  // Aks holda 998 qo'shamiz (faqat raqam kiritilganidan so'ng)
  let raw = d
  if (!d.startsWith('998') && !d.startsWith('0')) {
    // Faqat birinchi raqam kiritilganda 998 qo'shmaymiz
    // foydalanuvchi o'zi kiritishiga ruxsat beramiz
    if (d.length > 0 && d.length <= 2) {
      raw = d
    } else if (d.length > 2) {
      raw = '998' + d
    }
  } else if (d.startsWith('0')) {
    // 0 bilan boshlansa, 998 ga almashlamiz
    raw = '998' + d.slice(1)
  } else if (d.startsWith('998')) {
    raw = d
  }
  
  const n = raw.slice(0, 12)
  const parts = ['+998']
  if (n.length > 3)  parts.push(' ' + n.slice(3, 5))
  if (n.length > 5)  parts.push(' ' + n.slice(5, 8))
  if (n.length > 8)  parts.push(' ' + n.slice(8, 10))
  if (n.length > 10) parts.push(' ' + n.slice(10, 12))
  return parts.join('')
}

function iCls(valid: boolean, touched: boolean) {
  const base = "w-full px-4 py-3.5 rounded-xl bg-slate-800/60 text-white text-sm outline-none transition-all border placeholder:text-slate-500 font-medium"
  if (!touched) return `${base} border-slate-700 focus:border-blue-500`
  return valid ? `${base} border-emerald-500/60 focus:border-emerald-500` : `${base} border-red-500/50 focus:border-red-500`
}

// ─── Field wrapper ─────────────────────────────────────────────────────────────
function Field({ label, icon, valid, touched, hint, extra, children }: {
  label: string; icon: React.ReactNode; valid: boolean; touched: boolean
  hint: string; extra?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <span className="text-slate-600">{icon}</span>{label}
        </label>
        <div className="flex items-center gap-2">
          {extra}
          {touched && (valid
            ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            : <XCircle className="w-4 h-4 text-red-400" />)}
        </div>
      </div>
      {children}
      {hint && <p className="text-red-400 text-xs">{hint}</p>}
    </div>
  )
}

function SelectField({ label, icon, valid, touched, hint, value, onChange, onBlur, options }: {
  label: string; icon: React.ReactNode; valid: boolean; touched: boolean
  hint: string; value: string
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  onBlur: () => void
  options: { value: string; label: string }[]
}) {
  const base = "w-full px-4 py-3.5 rounded-xl bg-slate-800/60 text-sm outline-none transition-all border appearance-none cursor-pointer"
  const cls = !touched
    ? `${base} border-slate-700 text-slate-400 focus:border-blue-500`
    : valid
      ? `${base} border-emerald-500/60 text-white focus:border-emerald-500`
      : `${base} border-red-500/50 text-white focus:border-red-500`
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <span className="text-slate-600">{icon}</span>{label}
        </label>
        {touched && (valid ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-red-400" />)}
      </div>
      <div className="relative">
        <select className={cls} value={value} onChange={onChange} onBlur={onBlur}>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
      </div>
      {hint && <p className="text-red-400 text-xs">{hint}</p>}
    </div>
  )
}

// ─── Asosiy komponent ─────────────────────────────────────────────────────────
export default function SignupPage() {
  const [step, setStep]         = useState(1)
  const [loading, setLoading]   = useState(false)
  const [globalErr, setGlobalErr] = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [otpTimer, setOtpTimer] = useState(0)
  const [mounted, setMounted]   = useState(false)
  const [otpCode, setOtpCode]   = useState('')        // botdan kelgan kod (5 daqiqa amal qiladi)
  const [otp, setOtp]           = useState('')        // user kiritgan kod
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [formData, setFormData] = useState({
    fullName: '', storeName: '', birthDate: '',
    phone: '', shopType: '', source: '', promoCode: ''
  })
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const touch = (k: string) => setTouched(p => ({ ...p, [k]: true }))

  useEffect(() => { setMounted(true) }, [])

  const startTimer = (sec = 300) => {
    setOtpTimer(sec)
    timerRef.current = setInterval(() => {
      setOtpTimer(t => {
        if (t <= 1) { clearInterval(timerRef.current!); return 0 }
        return t - 1
      })
    }, 1000)
  }

  const v = {
    email:    validators.email(email),
    password: validators.password(password),
    confirm:  confirm === password && confirm.length > 0,
    name:     validators.name(formData.fullName),
    store:    validators.shopName(formData.storeName),
    birth:    validators.birthDate(formData.birthDate),
    phone:    validators.phone(formData.phone),
    otp:      validators.otp(otp),
    shopType: formData.shopType !== '',
    source:   formData.source !== '',
    promoCode: validators.promoCode(formData.promoCode),
  }
  const pwdStr = getPasswordStrength(password)

  // ── QADAM 1 → 2: Telefon orqali OTP yuborish ────────────────────────────────
  const sendOTP = async () => {
    setGlobalErr('')
    if (!v.email)    return setGlobalErr("Email noto'g'ri formatda")
    if (!v.password) return setGlobalErr("Parol kamida 8 ta belgi, 1 katta harf va 1 raqam bo'lishi shart")
    if (!v.confirm)  return setGlobalErr("Parollar mos kelmaydi")
    if (!v.name)     return setGlobalErr("To'liq ismni kiriting (kamida 2 belgi)")
    if (!v.store)    return setGlobalErr("Do'kon nomini kiriting")
    if (!v.phone)    return setGlobalErr("Telefon raqamni +998 XX XXX XX XX formatida kiriting")

    setLoading(true)
    try {
      // Edge Function chaqirish
      const res  = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ phone: formData.phone }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error ?? 'Xatolik yuz berdi')

      // Kod frontendda vaqtincha saqlanadi — faqat tekshirish uchun
      setOtpCode(data.code)
      startTimer(300)
      setStep(2)
    } catch (err: any) {
      setGlobalErr(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── QADAM 2: OTP tekshirish ──────────────────────────────────────────────────
  const verifyOTP = async () => {
    setGlobalErr('')
    if (!v.otp) return setGlobalErr("6 xonali kodni to'liq kiriting")

    setLoading(true)
    try {
      const res  = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ phone: formData.phone, code: otp }),
      })
      const data = await res.json()
      if (!res.ok || !data.valid) throw new Error(data.error ?? 'Kod xato yoki muddati o\'tgan')

      // Email + parol bilan Supabase auth yaratish
      const { error: signUpErr } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { full_name: formData.fullName } }
      })
      if (signUpErr) throw new Error(signUpErr.message)

      setStep(3)
    } catch (err: any) {
      setGlobalErr(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── QADAM 3 → 4 ─────────────────────────────────────────────────────────────
  const goStep4 = () => {
    setGlobalErr('')
    if (!v.name)  return setGlobalErr("Ism familiyani kiriting")
    if (!v.birth) return setGlobalErr("To'g'ri tug'ilgan sanani kiriting (16–100 yosh)")
    if (!v.phone) return setGlobalErr("Telefon raqam noto'g'ri")
    setStep(4)
  }

  // ── QADAM 4: Profil yakunlash ────────────────────────────────────────────────
  const finalize = async () => {
    setGlobalErr('')
    if (!v.shopType)  return setGlobalErr("Do'kon turini tanlang")
    if (!v.store)     return setGlobalErr("Do'kon nomini kiriting")
    if (!v.source)    return setGlobalErr("Bizni qayerdan topganingizni tanlang")
    if (!v.promoCode) return setGlobalErr("Promo-kod kiritilishi shart")

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Foydalanuvchi topilmadi")

      const username = generateUsername(formData.fullName, formData.storeName, formData.birthDate)
      const { error } = await supabase.from('profiles').upsert({
        id:         user.id,
        username,
        full_name:  formData.fullName,
        phone:      formData.phone,
        birth_date: formData.birthDate,
        shop_type:  formData.shopType,
        shop_name:  formData.storeName,
        source:     formData.source,
        promo_code: formData.promoCode || null,
        email:      email.trim().toLowerCase(),
      })
      if (error) throw new Error("Profil saqlashda xatolik: " + error.message)

      window.location.href = '/'
    } catch (err: any) {
      setGlobalErr(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) return null

  // Telegram deep link
  const telegramLink = `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${otpCode}`
  // Timer formatlash
  const timerMin = Math.floor(otpTimer / 60).toString().padStart(2, '0')
  const timerSec = (otpTimer % 60).toString().padStart(2, '0')

  return (
    <div className="min-h-screen bg-[#050a14] flex items-center justify-center p-4 relative overflow-hidden">

      {/* Orqa fon */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%]   w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-emerald-600/8 blur-[100px]" />
        <div className="absolute top-[40%] left-[60%]    w-[300px] h-[300px] rounded-full bg-purple-600/6 blur-[80px]" />
        <div className="absolute inset-0 opacity-[0.025]"
          style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      {/* Logo */}
      <div className="absolute top-6 left-6 flex items-center gap-2 z-10">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <span className="text-white font-black tracking-tight text-lg">Smart-Dokon</span>
      </div>
      <div className="absolute top-6 right-6 z-10">
        <Link href="/auth/login"
          className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-full font-bold text-sm shadow-lg transition-all active:scale-95">
          Kirish
        </Link>
      </div>

      <div className="w-full max-w-md relative z-10">

        {/* Progress */}
        <div className="flex gap-1.5 mb-4">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="relative flex-1 h-1 rounded-full bg-slate-800 overflow-hidden">
              <div className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
                step > s ? 'bg-emerald-500 w-full' : step === s ? 'bg-blue-500 w-full' : 'w-0'
              }`} />
            </div>
          ))}
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-3xl shadow-2xl shadow-black/60 overflow-hidden">

          {/* Header */}
          <div className="px-8 pt-8 pb-6 border-b border-slate-800/50">
            <div className="flex items-center gap-3">
              {step > 1 && (
                <button onClick={() => { setStep(s => s - 1); setGlobalErr('') }}
                  className="p-1.5 hover:bg-slate-800 rounded-lg transition-all text-slate-400 hover:text-white">
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight">
                  {['Hisob yaratish', 'Telegram orqali tasdiqlang', "Shaxsiy ma'lumotlar", "Do'kon sozlamalari"][step - 1]}
                </h1>
                <p className="text-slate-400 text-sm mt-0.5">
                  {[
                    'Xavfsiz hisob yarating',
                    'Telegram botdan kelgan kodni kiriting',
                    "Iltimos to'liq ma'lumot kiriting",
                    "Oxirgi qadam — deyarli tayyor!"
                  ][step - 1]}
                </p>
              </div>
            </div>
          </div>

          {/* Xato */}
          {globalErr && (
            <div className="mx-8 mt-6 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{globalErr}</p>
            </div>
          )}

          <div className="px-8 py-6 space-y-4">

            {/* ══ QADAM 1 ══ */}
            {step === 1 && (
              <>
                <Field label="To'liq Ism" icon={<User className="w-4 h-4" />}
                  valid={v.name} touched={touched.name}
                  hint={!v.name && touched.name ? "Kamida 2 ta belgi" : ""}>
                  <input type="text" placeholder="Ali Valiyev"
                    className={iCls(v.name, touched.name)}
                    onChange={e => { setFormData(f => ({ ...f, fullName: e.target.value })); touch('name') }}
                    onBlur={() => touch('name')} />
                </Field>

                <Field label="Do'kon Nomi" icon={<Store className="w-4 h-4" />}
                  valid={v.store} touched={touched.store}
                  hint={!v.store && touched.store ? "Do'kon nomini kiriting" : ""}>
                  <input type="text" placeholder="Smart Tech Savdo"
                    className={iCls(v.store, touched.store)}
                    onChange={e => { setFormData(f => ({ ...f, storeName: e.target.value })); touch('store') }}
                    onBlur={() => touch('store')} />
                </Field>

                <Field label="Email" icon={<Lock className="w-4 h-4" />}
                  valid={v.email} touched={touched.email}
                  hint={!v.email && touched.email ? "To'g'ri email kiriting" : ""}>
                  <input type="email" placeholder="example@mail.com"
                    className={iCls(v.email, touched.email)} value={email}
                    onChange={e => { setEmail(e.target.value); touch('email') }}
                    onBlur={() => touch('email')} />
                </Field>

                <Field label="Telefon raqam" icon={<Phone className="w-4 h-4" />}
                  valid={v.phone} touched={touched.phone}
                  hint={!v.phone && touched.phone ? "+998 XX XXX XX XX formatida kiriting" : ""}>
                  <input type="tel" placeholder="+998 90 123 45 67"
                    className={iCls(v.phone, touched.phone)} value={formData.phone}
                    onChange={e => {
                      const raw = e.target.value.replace(/[^\d+]/g, '')
                      if (raw.length <= 1) { setFormData(f => ({ ...f, phone: '' })); return }
                      setFormData(f => ({ ...f, phone: formatPhone(raw) })); touch('phone')
                    }}
                    onBlur={() => touch('phone')} />
                </Field>

                <Field label="Parol" icon={<Lock className="w-4 h-4" />}
                  valid={v.password} touched={touched.password}
                  hint={!v.password && touched.password ? "Kamida 8 belgi, 1 katta harf, 1 raqam" : ""}
                  extra={
                    <button type="button" onClick={() => setShowPwd(p => !p)}
                      className="text-slate-400 hover:text-slate-200 transition-colors p-1">
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }>
                  <input type={showPwd ? "text" : "password"} placeholder="Min. 8 belgi + raqam + HARF"
                    className={iCls(v.password, touched.password)}
                    onChange={e => { setPassword(e.target.value); touch('password') }}
                    onBlur={() => touch('password')} />
                </Field>

                {password.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map(i => (
                        <div key={i} className={`flex-1 h-1 rounded-full transition-all duration-300 ${i <= pwdStr.score ? pwdStr.color : 'bg-slate-700'}`} />
                      ))}
                    </div>
                    <p className="text-xs font-semibold text-slate-400">Parol kuchi: <span className="text-white">{pwdStr.label}</span></p>
                  </div>
                )}

                <Field label="Parolni tasdiqlang" icon={<Lock className="w-4 h-4" />}
                  valid={v.confirm} touched={touched.confirm}
                  hint={!v.confirm && touched.confirm ? "Parollar mos kelmaydi" : ""}>
                  <input type={showPwd ? "text" : "password"} placeholder="Parolni qaytaring"
                    className={iCls(v.confirm, touched.confirm)}
                    onChange={e => { setConfirm(e.target.value); touch('confirm') }}
                    onBlur={() => touch('confirm')} />
                </Field>

                <button onClick={sendOTP} disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl text-sm shadow-lg shadow-blue-900/30 transition-all active:scale-95 mt-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {loading ? 'Yuborilmoqda...' : 'Telegram orqali tasdiqlash'}
                </button>
              </>
            )}

            {/* ══ QADAM 2: Telegram OTP ══ */}
            {step === 2 && (
              <>
                {/* Telegram redirect kartasi */}
                <div className="bg-[#229ED9]/10 border-2 border-[#229ED9]/30 rounded-2xl p-5">
                  <div className="flex items-start gap-3 mb-4">
                    {/* Telegram ikona */}
                    <div className="w-10 h-10 bg-[#229ED9] rounded-xl flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-[#229ED9] font-black text-sm">Telegram bot orqali tasdiqlang</p>
                      <p className="text-slate-400 text-xs mt-0.5">Quyidagi tugmani bosing va botdan kodni oling</p>
                    </div>
                  </div>

                  <a href={telegramLink} target="_blank" rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 bg-[#229ED9] hover:bg-[#1e8ec4] text-white font-bold py-3 rounded-xl text-sm transition-all active:scale-95 mb-3">
                    <ExternalLink className="w-4 h-4" />
                    Telegram botni ochish
                  </a>

                  <div className="bg-slate-900/60 rounded-xl p-3 space-y-2">
                    <p className="text-slate-300 text-xs font-semibold">Qanday ishlaydi:</p>
                    {[
                      'Yuqoridagi tugmani bosing',
                      'Telegram ilovasi ochiladi',
                      '"START" tugmasini bosing',
                      'Bot sizga 6 xonali kod yuboradi',
                      'Kodni quyiga kiriting',
                    ].map((s, i) => (
                      <div key={i} className="flex items-center gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-black text-slate-400">{i + 1}</span>
                        </div>
                        <span className="text-slate-400 text-xs">{s}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* OTP kiritish */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Botdan kelgan 6 xonali kod
                  </label>
                  <input
                    type="text" inputMode="numeric" maxLength={6} placeholder="000000"
                    className={`w-full text-center text-4xl font-mono py-5 rounded-2xl bg-slate-800/60 border transition-all outline-none tracking-[0.5em] ${
                      otp.length === 6
                        ? v.otp ? 'border-emerald-500 text-emerald-400' : 'border-red-500 text-red-400'
                        : 'border-slate-700 text-white focus:border-blue-500'
                    }`}
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  />
                  {otpTimer > 0 && (
                    <p className="text-center text-slate-500 text-xs">
                      Kod muddati: <span className="text-blue-400 font-bold font-mono">{timerMin}:{timerSec}</span>
                    </p>
                  )}
                  {otpTimer === 0 && (
                    <p className="text-center text-red-400 text-xs">Kod muddati tugadi. Qayta yuboring.</p>
                  )}
                </div>

                <button onClick={verifyOTP} disabled={loading || !v.otp || otpTimer === 0}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl text-sm shadow-lg shadow-emerald-900/30 transition-all active:scale-95">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {loading ? 'Tekshirilmoqda...' : 'Tasdiqlash'}
                </button>

                <button onClick={() => { setStep(1); setOtp(''); setGlobalErr('') }}
                  className="w-full text-slate-500 hover:text-slate-300 text-sm font-semibold transition-all py-1 text-center">
                  ← Ma'lumotlarni tahrirlash
                </button>
              </>
            )}

            {/* ══ QADAM 3: Shaxsiy ma'lumotlar ══ */}
            {step === 3 && (
              <>
                <Field label="To'liq Ism Familiya" icon={<User className="w-4 h-4" />}
                  valid={v.name} touched={touched.s3name}
                  hint={!v.name && touched.s3name ? "Kamida 2 ta belgi" : ""}>
                  <input type="text" placeholder="Ali Valiyev" defaultValue={formData.fullName}
                    className={iCls(v.name, touched.s3name)}
                    onChange={e => { setFormData(f => ({ ...f, fullName: e.target.value })); touch('s3name') }}
                    onBlur={() => touch('s3name')} />
                </Field>

                <Field label="Tug'ilgan Sana" icon={<Calendar className="w-4 h-4" />}
                  valid={v.birth} touched={touched.birth}
                  hint={!v.birth && touched.birth ? "Yoshingiz 16–100 oralig'ida bo'lishi kerak" : ""}>
                  <input type="date"
                    max={new Date(new Date().setFullYear(new Date().getFullYear() - 16)).toISOString().split('T')[0]}
                    min={new Date(new Date().setFullYear(new Date().getFullYear() - 100)).toISOString().split('T')[0]}
                    className={iCls(v.birth, touched.birth)}
                    onChange={e => { setFormData(f => ({ ...f, birthDate: e.target.value })); touch('birth') }}
                    onBlur={() => touch('birth')} />
                </Field>

                {/* ✅ TUZATILDI: readOnly olib tashlandi, onChange qo'shildi — telefon raqam endi ko'rinadi */}
                <Field label="Telefon raqam" icon={<Phone className="w-4 h-4" />}
                  valid={v.phone} touched={touched.s3phone}
                  hint={!v.phone && touched.s3phone ? "+998 XX XXX XX XX formatida kiriting" : ""}>
                  <input type="tel" placeholder="+998 90 123 45 67"
                    className={iCls(v.phone, touched.s3phone)} value={formData.phone}
                    onChange={e => {
                      const raw = e.target.value.replace(/[^\d+]/g, '')
                      if (raw.length <= 1) { setFormData(f => ({ ...f, phone: '' })); return }
                      setFormData(f => ({ ...f, phone: formatPhone(raw) }))
                      touch('s3phone')
                    }}
                    onBlur={() => touch('s3phone')} />
                </Field>

                <button onClick={goStep4} disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl text-sm shadow-lg shadow-blue-900/30 transition-all active:scale-95">
                  <ArrowRight className="w-4 h-4" />
                  Do'kon ma'lumotlariga o'tish
                </button>
              </>
            )}

            {/* ══ QADAM 4: Do'kon sozlamalari ══ */}
            {step === 4 && (
              <>
                <SelectField label="Do'kon turi" icon={<Store className="w-4 h-4" />}
                  valid={v.shopType} touched={touched.shopType}
                  hint={!v.shopType && touched.shopType ? "Do'kon turini tanlang" : ""}
                  value={formData.shopType}
                  onChange={e => { setFormData(f => ({ ...f, shopType: e.target.value })); touch('shopType') }}
                  onBlur={() => touch('shopType')}
                  options={[
                    { value: '',           label: "Do'kon turini tanlang" },
                    { value: 'oziq-ovqat', label: "🛒 Oziq-ovqat" },
                    { value: 'kiyim',      label: "👗 Kiyim-kechak" },
                    { value: 'texnika',    label: "💻 Texnika va elektronika" },
                    { value: 'dorixona',   label: "💊 Dorixona" },
                    { value: 'qurilish',   label: "🏗️ Qurilish materiallari" },
                    { value: 'kosmetika',  label: "💄 Kosmetika" },
                    { value: 'bolalar',    label: "🧸 Bolalar tovarlari" },
                    { value: 'boshqa',     label: "📦 Boshqa" },
                  ]} />

                <Field label="Do'kon Nomi" icon={<Store className="w-4 h-4" />}
                  valid={v.store} touched={touched.s4store}
                  hint={!v.store && touched.s4store ? "Do'kon nomini kiriting" : ""}>
                  <input type="text" placeholder="Smart Tech Savdo" defaultValue={formData.storeName}
                    className={iCls(v.store, touched.s4store)}
                    onChange={e => { setFormData(f => ({ ...f, storeName: e.target.value })); touch('s4store') }}
                    onBlur={() => touch('s4store')} />
                </Field>

                <SelectField label="Bizni qayerdan topdingiz?" icon={<MapPin className="w-4 h-4" />}
                  valid={v.source} touched={touched.source}
                  hint={!v.source && touched.source ? "Manba tanlang" : ""}
                  value={formData.source}
                  onChange={e => { setFormData(f => ({ ...f, source: e.target.value })); touch('source') }}
                  onBlur={() => touch('source')}
                  options={[
                    { value: '',          label: "Manba tanlang" },
                    { value: 'trening',   label: "📚 Trening yoki kurs" },
                    { value: 'biznesmen', label: "🤝 Boshqa biznesmendan" },
                    { value: 'youtube',   label: "▶️ YouTube" },
                    { value: 'instagram', label: "📸 Instagram" },
                    { value: 'telegram',  label: "✈️ Telegram" },
                    { value: 'google',    label: "🔍 Google" },
                    { value: 'dost',      label: "👥 Do'st / tanishdan" },
                  ]} />

                {/* Username preview */}
                {formData.fullName && formData.storeName && formData.birthDate && (
                  <div className="p-4 bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-amber-500/20 rounded-lg flex-shrink-0 mt-0.5">
                        <ShieldCheck className="w-5 h-5 text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-amber-400 font-black text-sm uppercase tracking-wide mb-1">⚠️ Sizning Login Username'ingiz</p>
                        <code className="text-white font-mono font-black text-lg bg-slate-900/80 px-3 py-1 rounded-lg border border-amber-500/30 break-all block mb-2">
                          @{generateUsername(formData.fullName, formData.storeName, formData.birthDate)}
                        </code>
                        <p className="text-amber-300/80 text-xs">🔐 Tizimga kirish uchun yagona identifikator</p>
                        <p className="text-amber-300/80 text-xs">✏️ Keyinchalik o'zgartirib bo'lmaydi</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Promo kod */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-slate-600" />
                      Promo-kod <span className="text-red-400 normal-case ml-1">* majburiy</span>
                    </label>
                    {touched.promoCode && (v.promoCode
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      : <XCircle className="w-4 h-4 text-red-400" />)}
                  </div>
                  <input type="text" placeholder="SMART2026"
                    className={`w-full px-4 py-3.5 rounded-xl bg-slate-800/60 font-mono uppercase text-sm outline-none transition-all border font-medium ${
                      !touched.promoCode
                        ? 'border-slate-700 text-white focus:border-blue-500'
                        : v.promoCode
                          ? 'border-emerald-500/60 text-emerald-300 focus:border-emerald-500'
                          : 'border-red-500/50 text-red-300 focus:border-red-500'
                    }`}
                    onChange={e => { setFormData(f => ({ ...f, promoCode: e.target.value.toUpperCase() })); touch('promoCode') }}
                    onBlur={() => touch('promoCode')} />
                  {touched.promoCode && !v.promoCode && <p className="text-red-400 text-xs">Promo-kod kiritilishi shart (kamida 3 belgi)</p>}
                  {touched.promoCode && v.promoCode  && <p className="text-emerald-400 text-xs">✓ Promo-kod qabul qilindi</p>}
                </div>

                <button onClick={finalize} disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black py-4 rounded-xl text-base shadow-xl shadow-emerald-900/30 transition-all active:scale-95 disabled:opacity-60 mt-2">
                  {loading
                    ? <><Loader2 className="w-5 h-5 animate-spin" />Saqlanmoqda...</>
                    : <><Sparkles className="w-5 h-5" />TIZIMNI ISHGA TUSHIRISH</>}
                </button>
              </>
            )}

          </div>

          {/* Footer */}
          <div className="px-8 pb-6 text-center border-t border-slate-800/50 pt-4">
            <p className="text-slate-600 text-xs">
              Akkauntingiz bormi?{' '}
              <Link href="/auth/login" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
                Kirish →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}