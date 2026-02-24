import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const cookieStore = await cookies() 
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )
    
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && session?.user) {
      // Profil mavjudligini tekshiramiz - BARCHA kerakli maydonlarni
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, username, full_name, phone, birth_date, shop_name, shop_type')
        .eq('id', session.user.id)
        .single()
      
      // Onboarding sahifasiga yo'naltirish kerakmi?
      const needsOnboarding = !profile || 
        !profile.full_name || 
        !profile.phone || 
        !profile.birth_date || 
        !profile.shop_name || 
        !profile.shop_type
      
      if (needsOnboarding) {
        // Onboarding sahifasiga yuboramiz - majburiy to'ldirish uchun
        return NextResponse.redirect(`${origin}/onboarding`)
      } else {
        // Profil to'liq - bosh sahifaga yuborish
        return NextResponse.redirect(`${origin}/`)
      }
    }
  }

  // Xato bo'lsa login sahifasiga qaytarish
  return NextResponse.redirect(`${origin}/auth/login`)
}
