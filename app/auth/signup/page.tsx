'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import {
  ShieldCheck, Mail, Lock, User, Store, Calendar,
  ArrowRight, AlertCircle, Eye, EyeOff, CheckCircle2,
  XCircle, Phone, MapPin, Tag, ChevronDown, Loader2,
  ArrowLeft, Sparkles, RefreshCw
} from 'lucide-react'
import Link from 'next/link'

// ─── Validatsiya ──────────────────────────────────────────────────────────────
const validators = {
  email:     (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  password:  (v: string) => v.length >= 8 && /[A-Z]/.test(v) && /[0-9]/.test(v),
  phone:     (v: string) => /^\+998\s?\d{2}\s?\d{3}\s?\d{2}\s?\d{2}$/.test(v.replace(/\s/g, '')),
  name:      (v: string) => v.trim().length >= 2,
  shopName:  (v: string) => v.trim().length >= 2,
  birthDate: (v: string) => {
    if (!v) return false
    const age = new Date().getFullYear() - new Date(v).getFullYear()
    return age >= 16 && age <= 100
  },
  otp:       (v: string) => /^\d{6}$/.test(v),
  promoCode: (v: string) => v.trim().length >= 3,
}

function getPasswordStrength(pwd: string): { score: number; label: string; color: string } {
  let score = 0
  if (pwd.length >= 8)           score++
  if (pwd.length >= 12)          score++
  if (/[A-Z]/.test(pwd))         score++
  if (/[0-9]/.test(pwd))         score++
  if (/[^A-Za-z0-9]/.test(pwd))  score++
  if (score <= 1) return { score, label: 'Juda zaif',  color: 'bg-red-500'     }
  if (score === 2) return { score, label: 'Zaif',       color: 'bg-orange-500'  }
  if (score === 3) return { score, label: "O'rtacha",   color: 'bg-yellow-500'  }
  if (score === 4) return { score, label: 'Yaxshi',     color: 'bg-blue-500'    }
  return                  { score, label: "A'lo",       color: 'bg-emerald-500' }
}

function generateUsername(fullName: string, storeName: string, birthDate: string): string {
  const first = fullName.trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z]/g, '')
  const store = storeName.trim().split(/\s+/).slice(-1)[0].toLowerCase().replace(/[^a-z]/g, '').slice(0, 6)
  const parts = birthDate.split('-')
  const day     = parts[2] ?? '01'
  const yearEnd = (parts[0] ?? '2000').slice(-2)
  return `${first}${store}${day}${yearEnd}`
}

function formatPhone(v: string): string {
  const d = v.replace(/\D/g, '')
  if (!d.startsWith('998')) {
    const raw = d.startsWith('0') ? '998' + d.slice(1) : '998' + d
    return formatPhone(raw)
  }
  const n = d.slice(0, 12)
  const parts = ['+998']
  if (n.length > 3)  parts.push(' ' + n.slice(3, 5))
  if (n.length > 5)  parts.push(' ' + n.slice(5, 8))
  if (n.length > 8)  parts.push(' ' + n.slice(8, 10))
  if (n.length > 10) parts.push(' ' + n.slice(10, 12))
  return parts.join('')
}

function inputCls(valid: boolean, touched: boolean) {
  const base = "w-full px-4 py-3.5 rounded-xl bg-slate-800/50 text-white text-sm outline-none transition-all border placeholder:text-slate-500"
  if (!touched) return `${base} border-slate-700 focus:border-blue-500`
  return valid
    ? `${base} border-emerald-500/50 focus:border-emerald-500`
    : `${base} border-red-500/50 focus:border-red-500`
}

// ─── Sub-komponentlar ─────────────────────────────────────────────────────────
function Field({ label, icon, children, valid, touched, hint, extra }: {
  label: string; icon: React.ReactNode; children: React.ReactNode
  valid: boolean; touched: boolean; hint: string; extra?: React.ReactNode
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
      {hint && <p className="text-red-400 text-xs ml-0.5">{hint}</p>}
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
  const base = "w-full px-4 py-3.5 rounded-xl bg-slate-800/50 text-sm outline-none transition-all border appearance-none cursor-pointer"
  const cls = !touched
    ? `${base} border-slate-700 text-slate-400 focus:border-blue-500`
    : valid
      ? `${base} border-emerald-500/50 text-white focus:border-emerald-500`
      : `${base} border-red-500/50 text-white focus:border-red-500`
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <span className="text-slate-600">{icon}</span>{label}
        </label>
        {touched && (valid
          ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          : <XCircle className="w-4 h-4 text-red-400" />)}
      </div>
      <div className="relative">
        <select className={cls} value={value} onChange={onChange} onBlur={onBlur}>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
      </div>
      {hint && <p className="text-red-400 text-xs ml-0.5">{hint}</p>}
    </div>
  )
}

function ActionButton({ onClick, loading, label, icon, disabled }: {
  onClick: () => void; loading: boolean; label: string
  icon: React.ReactNode; disabled?: boolean
}) {
  return (
    <button onClick={onClick} disabled={loading || disabled}
      className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl text-sm shadow-lg shadow-blue-900/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-1">
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {label}
    </button>
  )
}

// ─── Asosiy komponent ─────────────────────────────────────────────────────────
export default function SignupPage() {
  const [step, setStep]           = useState(1)
  const [loading, setLoading]     = useState(false)
  const [globalErr, setGlobalErr] = useState('')
  const [showPwd, setShowPwd]     = useState(false)
  const [otpTimer, setOtpTimer]   = useState(0)
  const [mounted, setMounted]     = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [email, setEmail]       = useState('')
  const [otp, setOtp]           = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [formData, setFormData] = useState({
    fullName: '', storeName: '', birthDate: '',
    phone: '', shopType: '', source: '', promoCode: ''
  })
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const touch = (key: string) => setTouched(p => ({ ...p, [key]: true }))

  useEffect(() => {
    setMounted(true)
    // Google OAuth dan kelgan bo'lsa foydalanuvchi ma'lumotlarini olish
    const params = new URLSearchParams(window.location.search)
    if (params.get('step') === '3') {
      setStep(3)
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          if (user.email) setEmail(user.email)
          const name = user.user_metadata?.full_name || user.user_metadata?.name
          if (name) setFormData(f => ({ ...f, fullName: name }))
        }
      })
    }
  }, [])

  const startTimer = () => {
    setOtpTimer(60)
    timerRef.current = setInterval(() => {
      setOtpTimer(t => {
        if (t <= 1) { clearInterval(timerRef.current!); return 0 }
        return t - 1
      })
    }, 1000)
  }

  const v = {
    email:     validators.email(email),
    password:  validators.password(password),
    confirm:   confirm === password && confirm.length > 0,
    name:      validators.name(formData.fullName),
    store:     validators.shopName(formData.storeName),
    birth:     validators.birthDate(formData.birthDate),
    phone:     validators.phone(formData.phone),
    otp:       validators.otp(otp),
    shopType:  formData.shopType !== '',
    source:    formData.source !== '',
    promoCode: validators.promoCode(formData.promoCode),
  }
  const pwdStr = getPasswordStrength(password)

  // QADAM 1 → 2: OTP yuborish
  const sendOTP = async () => {
    setGlobalErr('')
    if (!v.email)    return setGlobalErr("Email noto'g'ri formatda")
    if (!v.password) return setGlobalErr("Parol kamida 8 ta belgi, 1 ta katta harf va 1 ta raqam bo'lishi shart")
    if (!v.confirm)  return setGlobalErr("Parollar mos kelmaydi")
    if (!v.name)     return setGlobalErr("To'liq ism kamida 2 ta belgi bo'lishi kerak")
    if (!v.store)    return setGlobalErr("Do'kon nomi kamida 2 ta belgi bo'lishi kerak")
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true }
    })
    setLoading(false)
    if (error) { setGlobalErr(error.message); return }
    startTimer()
    setStep(2)
  }

  // QADAM 2: OTP tasdiqlash
  const verifyOTP = async () => {
    setGlobalErr('')
    if (!v.otp) { setGlobalErr("6 xonali kodni to'liq kiriting"); return }
    setLoading(true)
    const { data: { session }, error } = await supabase.auth.verifyOtp({
      email, token: otp, type: 'email'
    })
    setLoading(false)
    if (error) { setGlobalErr("Kod xato yoki muddati o'tgan!"); return }
    if (session) {
      if (password) await supabase.auth.updateUser({ password })
      setStep(3)
    }
  }

  // QADAM 3 → 4
  const goStep4 = () => {
    setGlobalErr('')
    if (!v.name)  return setGlobalErr("Ism familiyani to'liq kiriting (kamida 2 ta belgi)")
    if (!v.birth) return setGlobalErr("To'g'ri tug'ilgan sanani kiriting (yoshingiz 16–100 bo'lishi kerak)")
    if (!v.phone) return setGlobalErr("Telefon raqamni +998 XX XXX XX XX formatida kiriting")
    setStep(4)
  }

  // QADAM 4: Yakunlash
  const finalize = async () => {
    setGlobalErr('')
    if (!v.shopType) return setGlobalErr("Do'kon turini tanlang")
    if (!v.store)    return setGlobalErr("Do'kon nomini kiriting")
    if (!v.source)   return setGlobalErr("Bizni qayerdan topganingizni tanlang")
    if (!v.promoCode) return setGlobalErr("Promo-kod kiritilishi shart! (kamida 3 ta belgi)")
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
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
      })
      if (error) { setGlobalErr("Profil saqlashda xatolik: " + error.message); setLoading(false); return }
    }
    setLoading(false)
    window.location.href = '/'
  }

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-[#050a14] flex items-center justify-center p-4 relative overflow-hidden">

      {/* Orqa fon */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-emerald-600/8 blur-[100px]" />
        <div className="absolute top-[40%] left-[60%] w-[300px] h-[300px] rounded-full bg-purple-600/6 blur-[80px]" />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      {/* Logo */}
      <div className="absolute top-6 left-6 flex items-center gap-2 z-10">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <span className="text-white font-black tracking-tight text-lg">Smart-Dokon</span>
      </div>

      {/* Top-right: Login link */}
      <div className="absolute top-6 right-6 z-10">
        <Link href="/auth/login"
          className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-full font-bold text-sm shadow-lg transition-all active:scale-95">
          Kirish
        </Link>
      </div>

      <div className="w-full max-w-md relative z-10">

        {/* Progress bar */}
        <div className="flex gap-1.5 mb-4">
          {[1, 2, 3, 4].map((s, i) => (
            <div key={i} className="relative flex-1 h-1 rounded-full bg-slate-800 overflow-hidden">
              <div className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
                step > s ? 'bg-emerald-500 w-full' :
                step === s ? 'bg-blue-500 w-full' : 'w-0'
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
                  {['Hisob yaratish', 'Emailni tasdiqlang', "Shaxsiy ma'lumotlar", "Do'kon sozlamalari"][step - 1]}
                </h1>
                <p className="text-slate-400 text-sm mt-0.5">
                  {[
                    'Xavfsiz hisob yarating',
                    `Tasdiqlash kodi ${email} ga yuborildi`,
                    "Iltimos to'liq ma'lumot kiriting",
                    "Oxirgi qadam — deyarli tayyor!"
                  ][step - 1]}
                </p>
              </div>
            </div>
          </div>

          {/* Global xato */}
          {globalErr && (
            <div className="mx-8 mt-6 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{globalErr}</p>
            </div>
          )}

          <div className="px-8 py-6 space-y-4">

            {/* ═══ QADAM 1: Email, parol, ism, do'kon nomi ═══ */}
            {step === 1 && (
              <>
                <Field label="To'liq Ism" icon={<User className="w-4 h-4" />}
                  valid={v.name} touched={touched.name}
                  hint={!v.name && touched.name ? "Kamida 2 ta belgi kiriting" : ""}>
                  <input type="text" placeholder="Ali Valiyev"
                    className={inputCls(v.name, touched.name)}
                    onChange={e => { setFormData(f => ({ ...f, fullName: e.target.value })); touch('name') }}
                    onBlur={() => touch('name')} />
                </Field>

                <Field label="Do'kon Nomi" icon={<Store className="w-4 h-4" />}
                  valid={v.store} touched={touched.store}
                  hint={!v.store && touched.store ? "Do'kon nomini kiriting" : ""}>
                  <input type="text" placeholder="Smart Tech Savdo"
                    className={inputCls(v.store, touched.store)}
                    onChange={e => { setFormData(f => ({ ...f, storeName: e.target.value })); touch('store') }}
                    onBlur={() => touch('store')} />
                </Field>

                <Field label="Email manzil" icon={<Mail className="w-4 h-4" />}
                  valid={v.email} touched={touched.email}
                  hint={!v.email && touched.email ? "To'g'ri email kiriting (example@mail.com)" : ""}>
                  <input type="email" placeholder="example@mail.com"
                    className={inputCls(v.email, touched.email)} value={email}
                    onChange={e => { setEmail(e.target.value); touch('email') }}
                    onBlur={() => touch('email')} />
                </Field>

                <Field label="Parol" icon={<Lock className="w-4 h-4" />}
                  valid={v.password} touched={touched.password}
                  hint={!v.password && touched.password ? "Kamida 8 belgi, 1 katta harf va 1 raqam" : ""}
                  extra={
                    <button type="button" onClick={() => setShowPwd(p => !p)}
                      className="text-slate-400 hover:text-slate-200 transition-colors p-1">
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }>
                  <input type={showPwd ? "text" : "password"} placeholder="Min. 8 belgi + raqam + HARF"
                    className={inputCls(v.password, touched.password)}
                    onChange={e => { setPassword(e.target.value); touch('password') }}
                    onBlur={() => touch('password')} />
                </Field>

                {/* Parol kuchi */}
                {password.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className={`flex-1 h-1 rounded-full transition-all duration-300 ${i <= pwdStr.score ? pwdStr.color : 'bg-slate-700'}`} />
                      ))}
                    </div>
                    <p className={`text-xs font-semibold ${
                      pwdStr.score <= 1 ? 'text-red-400' : pwdStr.score === 2 ? 'text-orange-400' :
                      pwdStr.score === 3 ? 'text-yellow-400' : pwdStr.score === 4 ? 'text-blue-400' : 'text-emerald-400'
                    }`}>Parol kuchi: {pwdStr.label}</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      {[
                        { ok: password.length >= 8,          txt: "8+ belgi" },
                        { ok: /[A-Z]/.test(password),        txt: "Katta harf" },
                        { ok: /[0-9]/.test(password),        txt: "Raqam" },
                        { ok: /[^A-Za-z0-9]/.test(password), txt: "Maxsus belgi" },
                      ].map(r => (
                        <div key={r.txt} className="flex items-center gap-1.5">
                          {r.ok ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <XCircle className="w-3 h-3 text-slate-600" />}
                          <span className={`text-xs ${r.ok ? 'text-emerald-400' : 'text-slate-500'}`}>{r.txt}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Field label="Parolni tasdiqlang" icon={<Lock className="w-4 h-4" />}
                  valid={v.confirm} touched={touched.confirm}
                  hint={!v.confirm && touched.confirm ? "Parollar mos kelmaydi" : ""}>
                  <input type={showPwd ? "text" : "password"} placeholder="Parolni qaytaring"
                    className={inputCls(v.confirm, touched.confirm)}
                    onChange={e => { setConfirm(e.target.value); touch('confirm') }}
                    onBlur={() => touch('confirm')} />
                </Field>

                <ActionButton onClick={sendOTP} loading={loading}
                  label={loading ? "Yuborilmoqda..." : "Tasdiqlash kodini olish"}
                  icon={<ArrowRight className="w-4 h-4" />} />

                {/* Google */}
                <div className="flex items-center gap-3 py-1">
                  <div className="flex-1 h-px bg-slate-800" />
                  <span className="text-slate-600 text-xs font-bold uppercase tracking-wider">yoki</span>
                  <div className="flex-1 h-px bg-slate-800" />
                </div>

                <button type="button" disabled={loading}
                  onClick={async () => {
                    setGlobalErr(''); setLoading(true)
                    const { error } = await supabase.auth.signInWithOAuth({
                      provider: 'google',
                      options: {
                        redirectTo: `${window.location.origin}/auth/callback`,
                        queryParams: { access_type: 'offline', prompt: 'consent' },
                      }
                    })
                    if (error) { setGlobalErr('Google orqali kirishda xatolik: ' + error.message); setLoading(false) }
                  }}
                  className="w-full flex items-center justify-center gap-3 border border-slate-700 hover:border-slate-500 hover:bg-slate-800/50 py-3 rounded-xl transition-all font-semibold text-slate-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google orqali ro'yxatdan o'tish
                </button>
              </>
            )}

            {/* ═══ QADAM 2: OTP ═══ */}
            {step === 2 && (
              <>
                <div className="text-center py-2">
                  <div className="inline-flex p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20 mb-4">
                    <Mail className="w-8 h-8 text-blue-400" />
                  </div>
                  <p className="text-slate-400 text-sm">
                    <span className="text-white font-semibold">{email}</span> pochtangizga<br />6 xonali kod yuborildi
                  </p>
                </div>

                <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} placeholder="000000"
                  className={`w-full text-center text-4xl font-mono py-5 rounded-2xl bg-slate-800/50 border transition-all outline-none tracking-[0.5em] ${
                    otp.length === 6
                      ? v.otp ? 'border-emerald-500 text-emerald-400' : 'border-red-500 text-red-400'
                      : 'border-slate-700 text-white focus:border-blue-500'
                  }`}
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} />

                <ActionButton onClick={verifyOTP} loading={loading}
                  label={loading ? "Tekshirilmoqda..." : "Tasdiqlash"}
                  icon={<CheckCircle2 className="w-4 h-4" />}
                  disabled={!v.otp} />

                <div className="text-center">
                  {otpTimer > 0 ? (
                    <p className="text-slate-500 text-sm">Qayta yuborish: <span className="text-blue-400 font-bold">{otpTimer}s</span></p>
                  ) : (
                    <button onClick={sendOTP}
                      className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 text-sm font-semibold transition-all mx-auto">
                      <RefreshCw className="w-3.5 h-3.5" />Kodni qayta yuborish
                    </button>
                  )}
                </div>

                <button onClick={() => { setStep(1); setOtp(''); setGlobalErr('') }}
                  className="w-full text-slate-500 hover:text-slate-300 text-sm font-semibold transition-all py-1">
                  ← Ma'lumotlarni tahrirlash
                </button>
              </>
            )}

            {/* ═══ QADAM 3: Shaxsiy ma'lumotlar ═══ */}
            {step === 3 && (
              <>
                <Field label="To'liq Ism Familiya" icon={<User className="w-4 h-4" />}
                  valid={v.name} touched={touched.s3name}
                  hint={!v.name && touched.s3name ? "Kamida 2 ta belgi" : ""}>
                  <input type="text" placeholder="Ali Valiyev" defaultValue={formData.fullName}
                    className={inputCls(v.name, touched.s3name)}
                    onChange={e => { setFormData(f => ({ ...f, fullName: e.target.value })); touch('s3name') }}
                    onBlur={() => touch('s3name')} />
                </Field>

                <Field label="Tug'ilgan Sana" icon={<Calendar className="w-4 h-4" />}
                  valid={v.birth} touched={touched.birth}
                  hint={!v.birth && touched.birth ? "Yoshingiz 16–100 oralig'ida bo'lishi kerak" : ""}>
                  <input type="date"
                    max={new Date(new Date().setFullYear(new Date().getFullYear() - 16)).toISOString().split('T')[0]}
                    min={new Date(new Date().setFullYear(new Date().getFullYear() - 100)).toISOString().split('T')[0]}
                    className={inputCls(v.birth, touched.birth)}
                    onChange={e => { setFormData(f => ({ ...f, birthDate: e.target.value })); touch('birth') }}
                    onBlur={() => touch('birth')} />
                </Field>

                <Field label="Telefon raqam" icon={<Phone className="w-4 h-4" />}
                  valid={v.phone} touched={touched.phone}
                  hint={!v.phone && touched.phone ? "+998 XX XXX XX XX formatida kiriting" : ""}>
                  <input type="tel" placeholder="+998 90 123 45 67"
                    className={inputCls(v.phone, touched.phone)} value={formData.phone}
                    onChange={e => {
                      const raw = e.target.value.replace(/[^\d+]/g, '')
                      if (raw.length <= 1) { setFormData(f => ({ ...f, phone: '' })); return }
                      setFormData(f => ({ ...f, phone: formatPhone(raw) })); touch('phone')
                    }}
                    onBlur={() => touch('phone')} />
                </Field>

                <ActionButton onClick={goStep4} loading={false}
                  label="Do'kon ma'lumotlariga o'tish"
                  icon={<ArrowRight className="w-4 h-4" />} />
              </>
            )}

            {/* ═══ QADAM 4: Do'kon sozlamalari ═══ */}
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
                    className={inputCls(v.store, touched.s4store)}
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
                        <p className="text-amber-400 font-black text-sm uppercase tracking-wide mb-1">
                          ⚠️ Sizning Login Username'ingiz
                        </p>
                        <code className="text-white font-mono font-black text-lg bg-slate-900/80 px-3 py-1 rounded-lg border border-amber-500/30 break-all block mb-2">
                          @{generateUsername(formData.fullName, formData.storeName, formData.birthDate)}
                        </code>
                        <p className="text-amber-300/80 text-xs">🔐 Tizimga kirish uchun <strong>yagona identifikator</strong></p>
                        <p className="text-amber-300/80 text-xs">✏️ Keyinchalik <strong>o'zgartirib bo'lmaydi</strong></p>
                        <p className="text-amber-300/80 text-xs">💾 <strong>Parol kabi saqlab qo'ying</strong></p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Promo kod */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Tag className="w-4 h-4 text-slate-600" />
                      Promo-kod
                      <span className="text-red-400 font-bold normal-case ml-1">* majburiy</span>
                    </label>
                    {touched.promoCode && (v.promoCode
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      : <XCircle className="w-4 h-4 text-red-400" />)}
                  </div>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                      <Tag className="w-4 h-4" />
                    </div>
                    <input type="text" placeholder="SMART2026"
                      className={`w-full pl-10 pr-4 py-3.5 rounded-xl outline-none font-mono uppercase text-sm transition-all ${
                        !touched.promoCode
                          ? 'bg-blue-500/5 border border-blue-500/30 text-blue-300 focus:border-blue-500/60'
                          : v.promoCode
                            ? 'bg-emerald-500/5 border border-emerald-500/40 text-emerald-300 focus:border-emerald-500'
                            : 'bg-red-500/5 border border-red-500/40 text-red-300 focus:border-red-500'
                      }`}
                      onChange={e => { setFormData(f => ({ ...f, promoCode: e.target.value.toUpperCase() })); touch('promoCode') }}
                      onBlur={() => touch('promoCode')} />
                  </div>
                  {touched.promoCode && !v.promoCode && <p className="text-red-400 text-xs mt-1 ml-0.5">Promo-kod kiritilishi shart (kamida 3 ta belgi)</p>}
                  {touched.promoCode && v.promoCode  && <p className="text-emerald-400 text-xs mt-1 ml-0.5">✓ Promo-kod qabul qilindi</p>}
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