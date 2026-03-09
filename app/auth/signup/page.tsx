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

// ─── Telegram bot username ──────────────────────────────────────────────────
const TELEGRAM_BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? 'YourBotUsername'

// ─── Validatsiya ──────────────────────────────────────────────────────────────
const validators = {
  password:  (v: string) => v.length >= 8 && /[A-Z]/.test(v) && /[0-9]/.test(v),
  phone:     (v: string) => /^\+998\s?\d{2}\s?\d{3}\s?\d{2}\s?\d{2}$/.test(v),
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

// ✅ TUZATILDI: Telefon formatlash funksiyasi endi foydalanuvchiga xalaqit bermaydi
function formatPhone(v: string): string {
  let d = v.replace(/\D/g, '') // Faqat raqamlarni olamiz
  
  if (d.length > 0 && !d.startsWith('998')) {
    d = '998' + d
  }
  
  const n = d.slice(0, 12)
  if (n.length === 0) return ''
  
  let res = '+998'
  if (n.length > 3) res += ' ' + n.slice(3, 5)
  if (n.length > 5) res += ' ' + n.slice(5, 8)
  if (n.length > 8) res += ' ' + n.slice(8, 10)
  if (n.length > 10) res += ' ' + n.slice(10, 12)
  
  return res
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

export default function SignupPage() {
  const [step, setStep]         = useState(1)
  const [loading, setLoading]   = useState(false)
  const [globalErr, setGlobalErr] = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [otpTimer, setOtpTimer] = useState(0)
  const [mounted, setMounted]   = useState(false)
  const [otpCode, setOtpCode]   = useState('')
  const [otp, setOtp]           = useState('')
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
    if (timerRef.current) clearInterval(timerRef.current)
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

  const sendOTP = async () => {
    setGlobalErr('')
    if (!v.email)    return setGlobalErr("Email noto'g'ri formatda")
    if (!v.password) return setGlobalErr("Parol kamida 8 ta belgi, 1 katta harf va 1 raqam bo'lishi shart")
    if (!v.confirm)  return setGlobalErr("Parollar mos kelmaydi")
    if (!v.name)     return setGlobalErr("To'liq ismni kiriting")
    if (!v.store)    return setGlobalErr("Do'kon nomini kiriting")
    if (!v.phone)    return setGlobalErr("Telefon raqamni to'liq kiriting")

    setLoading(true)
    try {
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

      setOtpCode(data.code)
      startTimer(300)
      setStep(2)
    } catch (err: any) {
      setGlobalErr(err.message)
    } finally {
      setLoading(false)
    }
  }

  const verifyOTP = async () => {
    setGlobalErr('')
    if (!v.otp) return setGlobalErr("6 xonali kodni kiriting")

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

  const goStep4 = () => {
    setGlobalErr('')
    if (!v.name)  return setGlobalErr("Ism familiyani kiriting")
    if (!v.birth) return setGlobalErr("Tug'ilgan sanani kiriting (16-100 yosh)")
    if (!v.phone) return setGlobalErr("Telefon raqam noto'g'ri")
    setStep(4)
  }

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

  const telegramLink = `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${otpCode}`
  const timerMin = Math.floor(otpTimer / 60).toString().padStart(2, '0')
  const timerSec = (otpTimer % 60).toString().padStart(2, '0')

  return (
    <div className="min-h-screen bg-[#050a14] flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%]   w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-emerald-600/8 blur-[100px]" />
        <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      {/* Logo and Nav */}
      <div className="absolute top-6 left-6 flex items-center gap-2 z-10">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <span className="text-white font-black tracking-tight text-lg">Smart-Dokon</span>
      </div>
      <div className="absolute top-6 right-6 z-10">
        <Link href="/auth/login" className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-full font-bold text-sm shadow-lg transition-all active:scale-95">
          Kirish
        </Link>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Progress Bar */}
        <div className="flex gap-1.5 mb-4">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="relative flex-1 h-1 rounded-full bg-slate-800 overflow-hidden">
              <div className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
                step > s ? 'bg-emerald-500 w-full' : step === s ? 'bg-blue-500 w-full' : 'w-0'
              }`} />
            </div>
          ))}
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-8 pt-8 pb-6 border-b border-slate-800/50">
            <div className="flex items-center gap-3">
              {step > 1 && (
                <button onClick={() => { setStep(s => s - 1); setGlobalErr('') }} className="p-1.5 hover:bg-slate-800 rounded-lg transition-all text-slate-400 hover:text-white">
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight">
                  {['Hisob yaratish', 'Tasdiqlash', "Ma'lumotlar", "Do'kon"][step - 1]}
                </h1>
                <p className="text-slate-400 text-sm">
                  {['Xavfsiz hisob yarating', 'Telegram orqali tasdiqlang', 'Shaxsiy ma\'lumotlar', 'Oxirgi qadam'][step - 1]}
                </p>
              </div>
            </div>
          </div>

          {globalErr && (
            <div className="mx-8 mt-6 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" />
              <p className="text-red-400 text-sm">{globalErr}</p>
            </div>
          )}

          <div className="px-8 py-6 space-y-4">
            {step === 1 && (
              <>
                <Field label="To'liq Ism" icon={<User className="w-4 h-4" />} valid={v.name} touched={touched.name} hint={!v.name && touched.name ? "Kamida 2 belgi" : ""}>
                  <input type="text" placeholder="Ali Valiyev" className={iCls(v.name, touched.name)} onChange={e => { setFormData(f => ({ ...f, fullName: e.target.value })); touch('name') }} />
                </Field>

                <Field label="Do'kon Nomi" icon={<Store className="w-4 h-4" />} valid={v.store} touched={touched.store} hint={!v.store && touched.store ? "Do'kon nomini kiriting" : ""}>
                  <input type="text" placeholder="Smart Savdo" className={iCls(v.store, touched.store)} onChange={e => { setFormData(f => ({ ...f, storeName: e.target.value })); touch('store') }} />
                </Field>

                <Field label="Email" icon={<Lock className="w-4 h-4" />} valid={v.email} touched={touched.email} hint={!v.email && touched.email ? "Email noto'g'ri" : ""}>
                  <input type="email" placeholder="mail@example.com" className={iCls(v.email, touched.email)} value={email} onChange={e => { setEmail(e.target.value); touch('email') }} />
                </Field>

                {/* ✅ TUZATILDI: Step 1 Telefon raqam inputi */}
                <Field label="Telefon raqam" icon={<Phone className="w-4 h-4" />} valid={v.phone} touched={touched.phone} hint={!v.phone && touched.phone ? "+998 XX XXX XX XX formatida" : ""}>
                  <input 
                    type="tel" 
                    placeholder="+998 90 123 45 67" 
                    className={iCls(v.phone, touched.phone)} 
                    value={formData.phone}
                    onChange={e => {
                      const formatted = formatPhone(e.target.value)
                      setFormData(f => ({ ...f, phone: formatted }))
                      touch('phone')
                    }}
                  />
                </Field>

                <Field label="Parol" icon={<Lock className="w-4 h-4" />} valid={v.password} touched={touched.password} hint={!v.password && touched.password ? "8 belgi, Katta harf, Raqam" : ""} extra={
                  <button type="button" onClick={() => setShowPwd(!showPwd)} className="text-slate-400 p-1">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }>
                  <input type={showPwd ? "text" : "password"} placeholder="••••••••" className={iCls(v.password, touched.password)} onChange={e => { setPassword(e.target.value); touch('password') }} />
                </Field>

                <Field label="Parolni tasdiqlang" icon={<Lock className="w-4 h-4" />} valid={v.confirm} touched={touched.confirm} hint={!v.confirm && touched.confirm ? "Parollar mos emas" : ""}>
                  <input type={showPwd ? "text" : "password"} placeholder="••••••••" className={iCls(v.confirm, touched.confirm)} onChange={e => { setConfirm(e.target.value); touch('confirm') }} />
                </Field>

                <button onClick={sendOTP} disabled={loading} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Telegram orqali tasdiqlash
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <div className="bg-[#229ED9]/10 border-2 border-[#229ED9]/30 rounded-2xl p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 bg-[#229ED9] rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-[#229ED9] font-black text-sm">Botdan kodni oling</p>
                      <p className="text-slate-400 text-xs">Botga o'tib "START" bosing</p>
                    </div>
                  </div>
                  <a href={telegramLink} target="_blank" className="w-full flex items-center justify-center gap-2 bg-[#229ED9] text-white font-bold py-3 rounded-xl mb-3">
                    <ExternalLink className="w-4 h-4" /> Telegram botni ochish
                  </a>
                </div>

                <div className="space-y-2">
                  <input type="text" maxLength={6} placeholder="000000" className="w-full text-center text-4xl font-mono py-5 rounded-2xl bg-slate-800/60 border border-slate-700 text-white outline-none" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} />
                  <p className="text-center text-slate-500 text-xs">Muddati: <span className="text-blue-400 font-bold">{timerMin}:{timerSec}</span></p>
                </div>

                <button onClick={verifyOTP} disabled={loading || otp.length < 6} className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white font-bold py-3.5 rounded-xl">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Tasdiqlash
                </button>
              </>
            )}

            {step === 3 && (
              <>
                <Field label="Ism Familiya" icon={<User className="w-4 h-4" />} valid={v.name} touched={touched.s3name} hint="">
                  <input type="text" className={iCls(v.name, touched.s3name)} value={formData.fullName} onChange={e => { setFormData(f => ({ ...f, fullName: e.target.value })); touch('s3name') }} />
                </Field>

                <Field label="Tug'ilgan Sana" icon={<Calendar className="w-4 h-4" />} valid={v.birth} touched={touched.birth} hint="Yoshingiz 16+ bo'lishi kerak">
                  <input type="date" className={iCls(v.birth, touched.birth)} onChange={e => { setFormData(f => ({ ...f, birthDate: e.target.value })); touch('birth') }} />
                </Field>

                {/* ✅ TUZATILDI: Step 3 Telefon raqam inputi */}
                <Field label="Telefon raqam" icon={<Phone className="w-4 h-4" />} valid={v.phone} touched={touched.s3phone} hint="">
                  <input 
                    type="tel" 
                    className={iCls(v.phone, touched.s3phone)} 
                    value={formData.phone} 
                    onChange={e => {
                      const formatted = formatPhone(e.target.value)
                      setFormData(f => ({ ...f, phone: formatted }))
                      touch('s3phone')
                    }} 
                  />
                </Field>

                <button onClick={goStep4} className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-3.5 rounded-xl">
                  Keyingi qadam <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}

            {step === 4 && (
              <>
                <SelectField label="Do'kon turi" icon={<Store className="w-4 h-4" />} valid={v.shopType} touched={touched.shopType} hint="" value={formData.shopType} onChange={e => { setFormData(f => ({ ...f, shopType: e.target.value })); touch('shopType') }} onBlur={() => touch('shopType')} options={[
                  { value: '',           label: "Tanlang" },
                  { value: 'oziq-ovqat', label: "🛒 Oziq-ovqat" },
                  { value: 'kiyim',      label: "👗 Kiyim-kechak" },
                  { value: 'texnika',    label: "💻 Texnika" },
                  { value: 'boshqa',     label: "📦 Boshqa" },
                ]} />

                <Field label="Do'kon Nomi" icon={<Store className="w-4 h-4" />} valid={v.store} touched={touched.s4store} hint="">
                  <input type="text" className={iCls(v.store, touched.s4store)} value={formData.storeName} onChange={e => { setFormData(f => ({ ...f, storeName: e.target.value })); touch('s4store') }} />
                </Field>

                <SelectField label="Bizni qayerdan topdingiz?" icon={<MapPin className="w-4 h-4" />} valid={v.source} touched={touched.source} hint="" value={formData.source} onChange={e => { setFormData(f => ({ ...f, source: e.target.value })); touch('source') }} onBlur={() => touch('source')} options={[
                  { value: '',          label: "Tanlang" },
                  { value: 'youtube',   label: "▶️ YouTube" },
                  { value: 'instagram', label: "📸 Instagram" },
                  { value: 'telegram',  label: "✈️ Telegram" },
                  { value: 'dost',      label: "👥 Do'stlardan" },
                ]} />

                {formData.fullName && formData.storeName && formData.birthDate && (
                  <div className="p-4 bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl">
                    <p className="text-amber-400 font-black text-xs uppercase mb-1">⚠️ Login uchun Username</p>
                    <code className="text-white font-mono font-black text-lg bg-slate-900/80 px-3 py-1 rounded-lg border border-amber-500/30 block">
                      @{generateUsername(formData.fullName, formData.storeName, formData.birthDate)}
                    </code>
                  </div>
                )}

                <Field label="Promo-kod *" icon={<Tag className="w-4 h-4" />} valid={v.promoCode} touched={touched.promoCode} hint="Majburiy">
                  <input type="text" placeholder="SMART2026" className={iCls(v.promoCode, touched.promoCode)} onChange={e => { setFormData(f => ({ ...f, promoCode: e.target.value.toUpperCase() })); touch('promoCode') }} />
                </Field>

                <button onClick={finalize} disabled={loading} className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-black py-4 rounded-xl shadow-xl">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  TIZIMNI ISHGA TUSHIRISH
                </button>
              </>
            )}
          </div>

          <div className="px-8 pb-6 text-center border-t border-slate-800/50 pt-4">
            <p className="text-slate-600 text-xs">Akkauntingiz bormi? <Link href="/auth/login" className="text-blue-400 font-semibold">Kirish →</Link></p>
          </div>
        </div>
      </div>
    </div>
  )
}