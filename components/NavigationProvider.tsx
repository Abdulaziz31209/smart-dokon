'use client'

import { useEffect } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

export default function NavigationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // 1. Sahifa yuklanganda oxirgi joyni tekshirish
  useEffect(() => {
    const lastPath = localStorage.getItem('last_location')
    if (lastPath && lastPath !== pathname + (window.location.search || '')) {
      // Agar hozirgi joy saqlanganidan farq qilsa, saqlanganiga yuborish
      router.push(lastPath)
    }
  }, [])

  // 2. Har safar manzil o'zgarganda uni xotiraga yozib borish
  useEffect(() => {
    const currentFullUrl = pathname + (window.location.search || '')
    localStorage.setItem('last_location', currentFullUrl)
  }, [pathname, searchParams])

  return <>{children}</>
}