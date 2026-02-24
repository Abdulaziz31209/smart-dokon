'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  User, Phone, Calendar, Store, MapPin, Tag, Loader2,
  Sparkles, ArrowRight, AlertCircle, CheckCircle2, XCircle,
  ChevronDown
} from 'lucide-react'
import { useRouter } from 'next/navigation'

// ─── Validatsiya funksiyalari ─────────────────────────────────────────────────
const validators = {
  name: (v: string) => v.trim().length >= 2,
  phone: (v: string) => /^\+998\s?\d{2}\s?\d{3}\s?\d{2}\s?\d{2}$/.test(v.replace(/\s/g, '')),
  birthDate: (v: string) => {
    if (!v) return false
    const age = new Date().getFullYear() - new Date(v).getFullYear()
    return age >= 16 && age <= 100
  },
  shopName: (v: string) => v.trim().length >= 2,
  shopType: (v: string) => v !== '',
  promoCode: (v: string) => v.trim().length >= 3,
}

function formatPhone(v: string): string {
  const d = v.replace(/\D/g, '')
  if (!d.startsWith('998')) {
    const raw = d.startsWith('0') ? '998' + d.slice(1) : '998' + d
    return formatPhone(raw)
  }
  const n = d.slice(0, 12)
  const parts = ['+998']
  if (n.length > 3) parts.push(' ' + n.slice(3, 5))
  if (n.length > 5) parts.push(' ' + n.slice(5, 8))
  if (n.length > 8) parts.push(' ' + n.slice(8, 10))
  if (n.length > 10) parts.push(' ' + n.slice(10, 12))
  return parts.join('')
}

function generateUsername(fullName: string, storeName: string, birthDate: string): string {
  const first = fullName.trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z]/g, '')
  const store = storeName.trim().split(/\s+/).slice(-1)[0].toLowerCase().replace(/[^a-z]/g, '').slice(0, 6)
  const parts = birthDate.split('-')
  const day = parts[2] ?? '01'
  const yearEnd = (parts[0] ?? '2000').slice(-2)
  return `${first}${store}${day}${yearEnd}`
}

function inputCls(valid: boolean, touched: boolean) {
  const base = "w-full px-4 py-3.5 rounded-xl bg-slate-800/50 text-white text-sm outline-none transition-all border placeholder:text-slate-500"
  if (!touched) return `${base} border-slate-700 focus:border-blue-500`
  return valid
    ? `${base} border-emerald-500/50 focus:border-emerald-500`
    : `${base} border-red-500/50 focus:border-red-500`
}

// ─── Komponentlar ────────────────────────────────────────────────────────────
function Field({ label, icon, children, valid, touched, hint }: {
  label: string; icon: React.ReactNode; children: React.ReactNode
  valid: boolean; touched: boolean; hint: string
}) {
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

// ─── Asosiy komponent ─────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [globalErr, setGlobalErr] = useState('')
  const [user, setUser] = useState<any>(null)
  const [mounted, setMounted] = useState(false)

  const [formData, setFormData] = useState({
    fullName: '',
    birthDate: '',
    phone: '',
    shopType: '',
    shopName: '',
    source: '',
    promoCode: ''
  })
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const touch = (key: string) => setTouched(p => ({ ...p, [key]: true }))

  useEffect(() => {
    setMounted(true)
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user) {
        // Foydalanuvchi tizimga kirgan emas - login sahifasiga
        router.push('/auth/login')
        return
      }

      setUser(session.user)

      // Profile ma'lumotlarini tekshirish
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (profile) {
        // Profil mavjud - kerakli maydonlarni to'ldirish
        setFormData({
          fullName: profile.full_name || '',
          birthDate: profile.birth_date || '',
          phone: profile.phone || '',
          shopType: profile.shop_type || '',
          shopName: profile.shop_name || '',
          source: profile.source || '',
          promoCode: profile.promo_code || ''
        })

        // Agar barcha majburiy maydonlar to'ldirilgan bo'lsa
        if (profile.full_name && profile.phone && profile.birth_date && profile.shop_name && profile.shop_type) {
          router.push('/')
          return
        }
      }
    } catch (error) {
      console.error('Error checking user:', error)
      router.push('/auth/login')
    } finally {
      setLoading(false)
    }
  }

  const v = {
    name: validators.name(formData.fullName),
    phone: validators.phone(formData.phone),
    birth: validators.birthDate(formData.birthDate),
    shopName: validators.shopName(formData.shopName),
    shopType: validators.shopType(formData.shopType),
    promoCode: validators.promoCode(formData.promoCode),
  }

  const handleSubmit = async () => {
    setGlobalErr('')
    
    // Validatsiya
    if (!v.name) return setGlobalErr("Ism familiyani to'liq kiriting")
    if (!v.birth) return setGlobalErr("To'g'ri tug'ilgan sanani kiriting")
    if (!v.phone) return setGlobalErr("Telefon raqamni to'liq kiriting")
    if (!v.shopName) return setGlobalErr("Do'kon nomini kiriting")
    if (!v.shopType) return setGlobalErr("Do'kon turini tanlang")
    if (!v.promoCode) return setGlobalErr("Promo-kod kiritilishi shart")

    if (!user) return setGlobalErr("Foydalanuvchi topilmadi. Qayta kirishni urinib ko'ring.")

    setSaving(true)
    try {
      const username = generateUsername(formData.fullName, formData.shopName, formData.birthDate)

      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        username,
        full_name: formData.fullName,
        phone: formData.phone,
        birth_date: formData.birthDate,
        shop_type: formData.shopType,
        shop_name: formData.shopName,
        source: formData.source || null,
        promo_code: formData.promoCode || null,
      }, { onConflict: 'id' })

      if (error) {
        console.error('Profile save error:', error)
        setGlobalErr("Ma'lumotlarni saqlashda xatolik: " + error.message)
        setSaving(false)
        return
      }

      // Muvaffaqiyatli saqlandi - dashboardga
      router.push('/')
    } catch (error: any) {
      console.error('Submit error:', error)
      setGlobalErr(error.message || "Noma'lum xatolik yuz berdi")
    } finally {
      setSaving(false)
    }
  }

  if (!mounted) return null
  if (loading) {
    return (
      <div className="min-h-screen bg-[#050a14] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050a14] flex items-center justify-center p-4 relative overflow-hidden">

      {/* Orqa fon */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-emerald-600/8 blur-[100px]" />
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

      <div className="w-full max-w-md relative z-10">

        {/* Warning banner */}
        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-400 font-bold text-sm">Ma'lumotlar to'liq emas!</p>
              <p className="text-amber-300/80 text-xs mt-1">
                Tizimdan to'liq foydalanish uchun quyidagi maydonlarni to'ldiring.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-3xl shadow-2xl shadow-black/60 overflow-hidden">

          {/* Header */}
          <div className="px-8 pt-8 pb-6 border-b border-slate-800/50">
            <h1 className="text-2xl font-black text-white tracking-tight">
              Profilni To'ldiring
            </h1>
            <p className="text-slate-400 text-sm mt-0.5">
              Quyidagi ma'lumotlarni to'ldiring va tizimdan foydalaning
            </p>
          </div>

          {/* Global xato */}
          {globalErr && (
            <div className="mx-8 mt-6 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{globalErr}</p>
            </div>
          )}

          <div className="px-8 py-6 space-y-4">

            {/* Ism Familiya */}
            <Field label="To'liq Ism" icon={<User className="w-4 h-4" />}
              valid={v.name} touched={touched.fullName}
              hint={!v.name && touched.fullName ? "Kamida 2 ta belgi" : ""}>
              <input type="text" placeholder="Ali Valiyev"
                className={inputCls(v.name, touched.fullName)}
                value={formData.fullName}
                onChange={e => { setFormData(f => ({ ...f, fullName: e.target.value })); touch('fullName') }}
                onBlur={() => touch('fullName')} />
            </Field>

            {/* Tug'ilgan sana */}
            <Field label="Tug'ilgan Sana" icon={<Calendar className="w-4 h-4" />}
              valid={v.birth} touched={touched.birthDate}
              hint={!v.birth && touched.birthDate ? "Yoshingiz 16-100 oralig'ida bo'lishi kerak" : ""}>
              <input type="date"
                max={new Date(new Date().setFullYear(new Date().getFullYear() - 16)).toISOString().split('T')[0]}
                min={new Date(new Date().setFullYear(new Date().getFullYear() - 100)).toISOString().split('T')[0]}
                className={inputCls(v.birth, touched.birthDate)}
                value={formData.birthDate}
                onChange={e => { setFormData(f => ({ ...f, birthDate: e.target.value })); touch('birthDate') }}
                onBlur={() => touch('birthDate')} />
            </Field>

            {/* Telefon */}
            <Field label="Telefon raqam" icon={<Phone className="w-4 h-4" />}
              valid={v.phone} touched={touched.phone}
              hint={!v.phone && touched.phone ? "+998 XX XXX XX XX formatida" : ""}>
              <input type="tel" placeholder="+998 90 123 45 67"
                className={inputCls(v.phone, touched.phone)}
                value={formData.phone}
                onChange={e => {
                  const raw = e.target.value.replace(/[^\d+]/g, '')
                  if (raw.length <= 1) { setFormData(f => ({ ...f, phone: '' })); return }
                  setFormData(f => ({ ...f, phone: formatPhone(raw) })); touch('phone')
                }}
                onBlur={() => touch('phone')} />
            </Field>

            {/* Do'kon turi */}
            <SelectField label="Do'kon turi" icon={<Store className="w-4 h-4" />}
              valid={v.shopType} touched={touched.shopType}
              hint={!v.shopType && touched.shopType ? "Do'kon turini tanlang" : ""}
              value={formData.shopType}
              onChange={e => { setFormData(f => ({ ...f, shopType: e.target.value })); touch('shopType') }}
              onBlur={() => touch('shopType')}
              options={[
                { value: '', label: "Do'kon turini tanlang" },
                { value: 'oziq-ovqat', label: "🛒 Oziq-ovqat" },
                { value: 'kiyim', label: "👗 Kiyim-kechak" },
                { value: 'texnika', label: "💻 Texnika va elektronika" },
                { value: 'dorixona', label: "💊 Dorixona" },
                { value: 'qurilish', label: "🏗️ Qurilish materiallari" },
                { value: 'kosmetika', label: "💄 Kosmetika" },
                { value: 'bolalar', label: "🧸 Bolalar tovarlari" },
                { value: 'boshqa', label: "📦 Boshqa" },
              ]} />

            {/* Do'kon nomi */}
            <Field label="Do'kon Nomi" icon={<Store className="w-4 h-4" />}
              valid={v.shopName} touched={touched.shopName}
              hint={!v.shopName && touched.shopName ? "Do'kon nomini kiriting" : ""}>
              <input type="text" placeholder="Smart Tech Savdo"
                className={inputCls(v.shopName, touched.shopName)}
                value={formData.shopName}
                onChange={e => { setFormData(f => ({ ...f, shopName: e.target.value })); touch('shopName') }}
                onBlur={() => touch('shopName')} />
            </Field>

            {/* Manba */}
            <SelectField label="Bizni qayerdan topdingiz?" icon={<MapPin className="w-4 h-4" />}
              valid={true} touched={touched.source}
              hint=""
              value={formData.source}
              onChange={e => { setFormData(f => ({ ...f, source: e.target.value })); touch('source') }}
              onBlur={() => touch('source')}
              options={[
                { value: '', label: "Manba tanlang (ixtiyoriy)" },
                { value: 'trening', label: "📚 Trening yoki kurs" },
                { value: 'biznesmen', label: "🤝 Boshqa biznesmendan" },
                { value: 'youtube', label: "▶️ YouTube" },
                { value: 'instagram', label: "📸 Instagram" },
                { value: 'telegram', label: "✈️ Telegram" },
                { value: 'google', label: "🔍 Google" },
                { value: 'dost', label: "👥 Do'st / tanishdan" },
              ]} />

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
                  value={formData.promoCode}
                  onChange={e => { setFormData(f => ({ ...f, promoCode: e.target.value.toUpperCase() })); touch('promoCode') }}
                  onBlur={() => touch('promoCode')} />
              </div>
              {touched.promoCode && !v.promoCode && <p className="text-red-400 text-xs mt-1 ml-0.5">Promo-kod kamida 3 ta belgi</p>}
            </div>

            {/* Submit button */}
            <button onClick={handleSubmit} disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black py-4 rounded-xl text-base shadow-xl shadow-emerald-900/30 transition-all active:scale-95 disabled:opacity-60 mt-2">
              {saving
                ? <><Loader2 className="w-5 h-5 animate-spin" />Saqlanmoqda...</>
                : <><Sparkles className="w-5 h-5" />DAVOM ETISH</>}
            </button>

          </div>

        </div>
      </div>
    </div>
  )
}
