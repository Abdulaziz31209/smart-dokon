'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import {
  ShieldCheck, Mail, Lock, User, Eye, EyeOff,
  AlertCircle, Loader2, ArrowRight, Sparkles,
  Shield, CheckCircle2, XCircle, Clock
} from 'lucide-react'
import Link from 'next/link'

const MAX_ATTEMPTS = 5
const LOCKOUT_SEC  = 120
const STORAGE_KEY  = 'sd_login_meta'

function getLoginMeta(): { attempts: number; lockedUntil: number } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : { attempts: 0, lockedUntil: 0 }
  } catch { return { attempts: 0, lockedUntil: 0 } }
}
function setLoginMeta(d: { attempts: number; lockedUntil: number }) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(d))
}
function resetLoginMeta() { localStorage.removeItem(STORAGE_KEY) }

function iCls(valid: boolean | null) {
  const base = "w-full pl-11 pr-4 py-4 rounded-2xl text-white text-sm outline-none transition-all duration-200 border font-medium placeholder:text-slate-600 bg-slate-800/60"
  if (valid === null) return `${base} border-slate-700 focus:border-blue-500`
  if (valid)          return `${base} border-emerald-500/60 focus:border-emerald-500`
  return                     `${base} border-red-500/50 focus:border-red-500`
}

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [tUser,  setTUser]  = useState(false)
  const [tEmail, setTEmail] = useState(false)
  const [tPwd,   setTPwd]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState(false)
  const [mounted,  setMounted]  = useState(false)
  const [attempts,    setAttempts]    = useState(0)
  const [lockedUntil, setLockedUntil] = useState(0)
  const [countdown,   setCountdown]   = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setMounted(true)
    const meta = getLoginMeta()
    setAttempts(meta.attempts)
    setLockedUntil(meta.lockedUntil)
    if (meta.lockedUntil > Date.now()) startCountdown(meta.lockedUntil)
  }, [])

  const startCountdown = useCallback((until: number) => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      const left = Math.ceil((until - Date.now()) / 1000)
      if (left <= 0) {
        clearInterval(timerRef.current!)
        setCountdown(0); setLockedUntil(0); resetLoginMeta()
      } else { setCountdown(left) }
    }, 1000)
  }, [])

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  const vUser  = username.trim().length >= 3
  const vEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const vPwd   = password.length >= 6
  const isLocked  = lockedUntil > Date.now()
  const remaining = MAX_ATTEMPTS - attempts
  const allValid  = vUser && vEmail && vPwd

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (isLocked) { setError(`Tizim ${countdown} soniyaga bloklangan.`); return }
    setTUser(true); setTEmail(true); setTPwd(true)
    if (!allValid) { setError("Barcha maydonlarni to'g'ri to'ldiring!"); return }
    setLoading(true)
    try {
      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(), password,
      })
      if (authErr || !authData.user) throw new Error('EMAIL yoki PAROL xato!')

      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('id, username, full_name, phone, birth_date, shop_name, shop_type, is_active')
        .eq('id', authData.user.id)
        .single()
      if (profileErr || !profile) {
        await supabase.auth.signOut()
        throw new Error("Profil topilmadi. Texnik yordam bilan bog'laning.")
      }

      const inputUN  = username.trim().toLowerCase().replace(/^@/, '')
      const storedUN = (profile.username ?? '').toLowerCase()
      if (inputUN !== storedUN) {
        await supabase.auth.signOut()
        throw new Error("USERNAME xato! Ro'yxatdan o'tishda berilgan kodni kiriting.")
      }
      if (profile.is_active === false) {
        await supabase.auth.signOut()
        throw new Error("Hisobingiz o'chirilgan. Administrator bilan bog'laning.")
      }

      const needsOnboarding = !profile.full_name || !profile.phone || !profile.birth_date || !profile.shop_name || !profile.shop_type
      resetLoginMeta(); setAttempts(0); setSuccess(true)
      setTimeout(() => { window.location.href = needsOnboarding ? '/onboarding' : '/' }, 1200)
    } catch (err: any) {
      const meta = getLoginMeta()
      const newAttempts = meta.attempts + 1
      setAttempts(newAttempts)
      let newLocked = meta.lockedUntil
      if (newAttempts >= MAX_ATTEMPTS) {
        newLocked = Date.now() + LOCKOUT_SEC * 1000
        setLockedUntil(newLocked); startCountdown(newLocked)
      }
      setLoginMeta({ attempts: newAttempts, lockedUntil: newLocked })
      setError(err.message || "Noma'lum xatolik yuz berdi")
    } finally { setLoading(false) }
  }

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-[#050a14] flex items-center justify-center p-4 relative overflow-hidden">

      {/* Orqa fon */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-15%] right-[-5%] w-[500px] h-[500px] rounded-full bg-blue-600/8 blur-[130px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-purple-600/8 blur-[110px]" />
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
        <Link href="/auth/signup"
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-full font-bold text-sm shadow-lg transition-all active:scale-95">
          Ro'yxatdan o'tish
        </Link>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-3xl shadow-2xl shadow-black/60 overflow-hidden">

          {/* Header */}
          <div className="px-8 pt-8 pb-6 border-b border-slate-800/60">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${isLocked ? 'bg-red-500/15' : 'bg-blue-500/10'}`}>
                <Shield className={`w-6 h-6 ${isLocked ? 'text-red-400' : 'text-blue-400'}`} />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight">
                  {success ? 'Muvaffaqiyatli!' : isLocked ? 'Bloklangan' : 'Tizimga Kirish'}
                </h1>
                <p className="text-slate-400 text-sm mt-0.5">
                  {success ? "Bosh sahifaga yo'naltirilmoqda..."
                    : isLocked ? `${countdown}s dan so'ng qayta urinib ko'ring`
                    : '3 qatlamli xavfsiz autentifikatsiya'}
                </p>
              </div>
            </div>
          </div>

          <div className="px-8 py-7">

            {/* Muvaffaqiyat */}
            {success && (
              <div className="flex flex-col items-center py-6 gap-4">
                <div className="w-16 h-16 bg-emerald-500/15 border-2 border-emerald-500/30 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <div className="text-center">
                  <p className="text-white font-bold text-lg">Xush kelibsiz!</p>
                  <p className="text-slate-400 text-sm mt-1">Yuklanmoqda...</p>
                </div>
                <div className="flex gap-1">
                  {[0,1,2].map(i => (
                    <div key={i} className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}

            {/* Bloklangan */}
            {!success && isLocked && (
              <div className="flex flex-col items-center py-6 gap-4">
                <div className="w-16 h-16 bg-red-500/15 border-2 border-red-500/30 rounded-full flex items-center justify-center">
                  <Clock className="w-8 h-8 text-red-400" />
                </div>
                <div className="text-center">
                  <p className="text-white font-bold text-lg">Kirish vaqtincha bloklandi</p>
                  <p className="text-slate-400 text-sm mt-1">{MAX_ATTEMPTS} ta muvaffaqiyatsiz urinishdan so'ng</p>
                </div>
                <div className="px-6 py-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-center">
                  <p className="text-red-300 text-xs mb-1">Qolgan vaqt</p>
                  <p className="text-red-400 font-black text-4xl font-mono">
                    {Math.floor(countdown / 60).toString().padStart(2, '0')}:{(countdown % 60).toString().padStart(2, '0')}
                  </p>
                </div>
              </div>
            )}

            {/* Login forma */}
            {!success && !isLocked && (
              <form onSubmit={handleLogin} className="space-y-4">

                {error && (
                  <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-red-400 text-sm font-semibold">{error}</p>
                      {attempts > 0 && attempts < MAX_ATTEMPTS && (
                        <p className="text-red-400/60 text-xs mt-0.5">
                          Qolgan urinishlar: <span className="font-bold text-red-400">{remaining}</span> ta
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {attempts > 0 && attempts < MAX_ATTEMPTS && !error && (
                  <div className="p-3 bg-amber-500/8 border border-amber-500/20 rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <p className="text-amber-400/80 text-xs">
                      Ehtiyot bo'ling! <span className="font-bold text-amber-400">{remaining} ta</span> urinish qoldi
                    </p>
                  </div>
                )}

                {/* Username */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />Username
                    </label>
                    {tUser && (vUser
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      : <XCircle className="w-4 h-4 text-red-400" />)}
                  </div>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                      <User className="w-4 h-4" />
                    </div>
                    <input type="text" placeholder="@username" autoComplete="username"
                      className={iCls(tUser ? vUser : null)} value={username}
                      onChange={e => { setUsername(e.target.value); setTUser(true); setError('') }}
                      onBlur={() => setTUser(true)} />
                  </div>
                  {tUser && !vUser && <p className="text-red-400 text-xs">Kamida 3 ta belgi bo'lishi kerak</p>}
                  <p className="text-slate-600 text-xs">Ro'yxatdan o'tishda berilgan username — parol kabi muhim!</p>
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" />Email
                    </label>
                    {tEmail && (vEmail
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      : <XCircle className="w-4 h-4 text-red-400" />)}
                  </div>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input type="email" placeholder="example@mail.com" autoComplete="email"
                      className={iCls(tEmail ? vEmail : null)}
                      onChange={e => { setEmail(e.target.value); setTEmail(true); setError('') }}
                      onBlur={() => setTEmail(true)} />
                  </div>
                  {tEmail && !vEmail && <p className="text-red-400 text-xs">To'g'ri email kiriting</p>}
                </div>

                {/* Parol */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />Parol
                    </label>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setShowPwd(p => !p)}
                        className="text-slate-500 hover:text-slate-300 transition-colors p-0.5">
                        {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      {tPwd && (vPwd
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        : <XCircle className="w-4 h-4 text-red-400" />)}
                    </div>
                  </div>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input type={showPwd ? 'text' : 'password'} placeholder="••••••••" autoComplete="current-password"
                      className={iCls(tPwd ? vPwd : null)}
                      onChange={e => { setPassword(e.target.value); setTPwd(true); setError('') }}
                      onBlur={() => setTPwd(true)} />
                  </div>
                  {tPwd && !vPwd && <p className="text-red-400 text-xs">Parol kamida 6 ta belgi</p>}
                </div>

                {/* 3 qatlamli himoya */}
                <div className="p-3.5 bg-slate-800/40 border border-slate-700/40 rounded-xl">
                  <div className="flex items-center gap-2 mb-2.5">
                    <ShieldCheck className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">3 Qatlamli Himoya</span>
                  </div>
                  <div className="space-y-2">
                    {[
                      { label: 'Email + Parol', done: vEmail && vPwd, desc: 'Supabase Auth' },
                      { label: 'Username',      done: vUser,          desc: 'DB taqqoslash' },
                      { label: 'Hisob holati',  done: false,          desc: 'Faollik tekshiruv' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2.5">
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${item.done ? 'bg-emerald-500/20 border-emerald-500/50' : 'bg-slate-700/50 border-slate-600'}`}>
                          {item.done
                            ? <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            : <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />}
                        </div>
                        <span className={`text-xs font-semibold ${item.done ? 'text-emerald-400' : 'text-slate-500'}`}>{item.label}</span>
                        <span className="text-slate-700 text-xs ml-auto">{item.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button type="submit" disabled={loading || !allValid}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl text-sm shadow-lg shadow-blue-900/30 transition-all active:scale-95">
                  {loading
                    ? <><Loader2 className="w-4 h-4 animate-spin" />Tekshirilmoqda...</>
                    : <><ArrowRight className="w-4 h-4" />TIZIMGA KIRISH</>}
                </button>
              </form>
            )}
          </div>

          {/* Footer */}
          <div className="px-8 pb-6 text-center border-t border-slate-800/50 pt-4">
            <p className="text-slate-600 text-xs">
              Hisobingiz yo'qmi?{' '}
              <Link href="/auth/signup" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
                Ro'yxatdan o'tish →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}