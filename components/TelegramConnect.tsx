"use client"

import { useEffect, useState } from "react"
import { supabase, botUsername } from "@/lib/supabase"

export default function TelegramConnect() {
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    // Tizimga kirgan foydalanuvchini aniqlaymiz
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  // Agar user hali yuklanmagan bo'lsa yoki kirmagan bo'lsa
  if (!user) return null

  // Botga yuboradigan havola: t.me/bot_nomi?start=user_id
  const telegramLink = `https://t.me/${botUsername}?start=${user.id}`

  return (
    <div className="p-6 bg-white rounded-lg shadow-md border border-gray-100 mt-4">
      <h3 className="text-lg font-semibold mb-2 text-gray-800">Bildirishnomalarni yoqing</h3>
      <p className="text-sm text-gray-600 mb-4">
        Sotuvlar va hisobotlarni Telegram orqali olish uchun profilingizni botga bog'lang.
      </p>
      
      <a 
        href={telegramLink} 
        target="_blank" 
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 bg-[#229ED9] text-white px-4 py-2 rounded-md hover:bg-[#1e8dbd] transition-colors"
      >
        <span>✈️ Telegramni bog'lash</span>
      </a>
    </div>
  )
}