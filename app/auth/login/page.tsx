'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  ShieldCheck, Mail, Lock, User, Eye, EyeOff,
  AlertCircle, Loader2, ArrowRight, Sparkles,
  Shield, CheckCircle2, XCircle
} from 'lucide-react'
import Link from 'next/link'

// Input stili uchun yordamchi funksiya
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
  
  // Validatsiya holatlari
  const [tUser,  setTUser]  = useState(false)
  const [tEmail, setTEmail] = useState(false)
  const [tPwd,   setTPwd]   = useState(false)
  
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState(false)
  const [mounted,  setMounted]  = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const vUser  = username.trim().length >= 3
  const vEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const vPwd   = password.length >= 6
  const allValid  = vUser && vEmail && vPwd

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    setTUser(true); setTEmail(true); setTPwd(true)
    if (!allValid) { 
        setError("Barcha maydonlarni to'g'ri to'ldiring!"); 
        return 
    }

    setLoading(true)
    try {
      // 1-QADAM: Supabase Auth (Email va Parol)
      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(), 
        password,
      })

      if (authErr) throw new Error('Email yoki Parol xato!')
      if (!authData.user) throw new Error('Foydalanuvchi topilmadi.')

      // 2-QADAM: Profiles jadvalidan foydalanuvchini tekshirish
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle()

      if (profileErr) throw new Error("Database xatoligi. RLS ruxsatini tekshiring.")
      if (!profile) {
        await supabase.auth.signOut()
        throw new Error("Profil topilmadi. Qaytadan ro'yxatdan o'ting.")
      }

      // 3-QADAM: Username tekshiruvi (Case-insensitive)
      const inputUN  = username.trim().toLowerCase().replace(/^@/, '')
      const storedUN = (profile.username ?? '').toLowerCase().replace(/^@/, '')
      
      if (inputUN !== storedUN) {
        await supabase.auth.signOut()
        throw new Error(`Username xato! Bazadagi usernameingiz: @${storedUN}`)
      }

      setSuccess(true)
      const isComplete = profile.full_name && profile.phone && profile.shop_name
      setTimeout(() => { 
        window.location.href = isComplete ? '/' : '/onboarding' 
      }, 1200)

    } catch (err: any) {
      setError(err.message)
    } finally { 
      setLoading(false) 
    }
  }

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-[#050a14] flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Fon effektlari */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-15%] right-[-5%] w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[130px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-purple-600/10 blur-[110px]" />
        <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-3xl shadow-2xl shadow-black/60 overflow-hidden">
          
          {/* Header */}
          <div className="px-8 pt-8 pb-6 border-b border-slate-800/60">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10">
                <Shield className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight">Tizimga Kirish</h1>
                <p className="text-slate-400 text-sm mt-0.5">Xavfsiz va tezkor autentifikatsiya</p>
              </div>
            </div>
          </div>

          <div className="px-8 py-7">
            {success ? (
              <div className="flex flex-col items-center py-10 gap-4">
                <CheckCircle2 className="w-16 h-16 text-emerald-400 animate-bounce" />
                <p className="text-white font-bold text-xl">Xush kelibsiz!</p>
                <div className="flex gap-1">
                  {[0,1,2].map(i => (
                    <div key={i} className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                
                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <p className="text-red-400 text-sm font-medium">{error}</p>
                  </div>
                )}

                {/* Username Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" /> Username
                    </label>
                    {tUser && (vUser ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-red-400" />)}
                  </div>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input 
                      type="text" 
                      placeholder="@username" 
                      className={iCls(tUser ? vUser : null)}
                      value={username}
                      onChange={e => { setUsername(e.target.value); setTUser(true); setError('') }}
                      onBlur={() => setTUser(true)}
                    />
                  </div>
                </div>

                {/* Email Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" /> Email
                    </label>
                    {tEmail && (vEmail ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-red-400" />)}
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input 
                      type="email" 
                      placeholder="email@example.com" 
                      className={iCls(tEmail ? vEmail : null)}
                      value={email}
                      onChange={e => { setEmail(e.target.value); setTEmail(true); setError('') }}
                      onBlur={() => setTEmail(true)}
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" /> Parol
                    </label>
                    <button type="button" onClick={() => setShowPwd(!showPwd)} className="text-blue-400 text-xs font-bold">
                      {showPwd ? 'YASHIRISH' : 'KO\'RSATISH'}
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input 
                      type={showPwd ? 'text' : 'password'} 
                      placeholder="••••••••" 
                      className={iCls(tPwd ? vPwd : null)}
                      value={password}
                      onChange={e => { setPassword(e.target.value); setTPwd(true); setError('') }}
                      onBlur={() => setTPwd(true)}
                    />
                  </div>
                </div>

                {/* 3-Qatlamli Himoya UI (Faqat Dizayn uchun) */}
                <div className="p-3.5 bg-slate-800/40 border border-slate-700/40 rounded-xl space-y-2">
                   <div className="flex items-center gap-2 mb-1">
                      <ShieldCheck className="w-4 h-4 text-blue-400" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Xavfsizlik darajasi</span>
                   </div>
                   <div className="flex gap-1.5">
                      <div className={`h-1 flex-1 rounded-full ${vEmail && vPwd ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                      <div className={`h-1 flex-1 rounded-full ${vUser ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                      <div className={`h-1 flex-1 rounded-full ${success ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                   </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading || !allValid}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold py-4 rounded-2xl text-sm shadow-lg transition-all active:scale-95"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                  {loading ? 'TEKSHIRILMOQDA...' : 'TIZIMGA KIRISH'}
                </button>
              </form>
            )}
          </div>

          <div className="px-8 pb-6 text-center border-t border-slate-800/50 pt-4">
            <p className="text-slate-600 text-xs">
              Hisobingiz yo'qmi? <Link href="/auth/signup" className="text-blue-400 font-bold">Ro'yxatdan o'tish →</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}