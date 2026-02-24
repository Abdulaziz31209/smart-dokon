"use client"
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { Store, LogOut, Clock } from "lucide-react";

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  // ✅ Hydration xatosini oldini olish uchun state
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Komponent brauzerda to'liq yuklanganini bildiradi
    setMounted(true);

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        fetchProfile(session.user.id);
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setProfile(null);
    });

    return () => {
      subscription.unsubscribe();
      clearInterval(timer);
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('store_name, full_name')
      .eq('id', userId)
      .single();
    
    if (!error) setProfile(data);
  };

  return (
    <nav className="flex justify-between items-center px-8 py-3.5 bg-[#020617] border-b border-slate-800/60 sticky top-0 z-50 backdrop-blur-md">
      
      {/* CHAP TOMON */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-600/10 rounded-lg border border-blue-500/20">
          <Store className="w-5 h-5 text-blue-500" />
        </div>
        <Link href="/" className="group">
          <h1 className="text-lg font-black text-white tracking-tighter uppercase transition-colors group-hover:text-blue-400">
            {profile?.store_name ? profile.store_name : "SMART-DOKON"}
          </h1>
          <div className="h-0.5 w-0 group-hover:w-full bg-blue-500 transition-all duration-300"></div>
        </Link>
      </div>

      {/* MARKAZ: VAQT VA STATUS */}
      <div className="hidden md:flex items-center gap-6 bg-slate-900/50 px-6 py-2 rounded-2xl border border-slate-800/50">
        <div className="flex items-center gap-3 border-r border-slate-700 pr-6">
          <Clock className="w-4 h-4 text-blue-500" />
          {/* ✅ FAQAT MOUNTED BO'LGANDA VAQTNI KO'RSATAMIZ */}
          <span className="text-base font-bold font-mono text-white tracking-wider">
            {mounted ? currentTime.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "--:--:--"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.4)]"></div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Tizim Online</span>
        </div>
      </div>

      {/* O'NG TOMON */}
      <div className="flex items-center gap-4">
        {user ? (
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end border-r border-slate-800 pr-4">
              <span className="text-[11px] font-black text-blue-500 uppercase tracking-tighter leading-none mb-1">
                {profile?.full_name || "Admin"}
              </span>
              <span className="text-[10px] text-slate-500 font-medium lowercase italic leading-none">
                {user.email}
              </span>
            </div>
            
            <button 
              onClick={() => {
                supabase.auth.signOut().then(() => {
                  window.location.reload();
                })
              }}
              className="flex items-center gap-2 p-2 bg-red-500/5 hover:bg-red-500/10 text-red-500 rounded-xl transition-all border border-red-500/10 group active:scale-95"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Chiqish</span>
            </button>
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full border border-slate-800/40 flex items-center justify-center opacity-20">
             <div className="w-1.5 h-1.5 bg-slate-600 rounded-full"></div>
          </div>
        )}
      </div>
    </nav>
  );
}