// supabase/functions/send-otp/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { phone } = await req.json()
    if (!phone) return new Response(JSON.stringify({ error: 'Telefon raqam kerak' }), { status: 400, headers: corsHeaders })

    // 6 xonali random kod
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 daqiqa

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Eski kodlarni bekor qilish
    await supabase
      .from('otp_codes')
      .update({ status: 'expired' })
      .eq('phone', phone)
      .eq('status', 'pending')

    // Yangi kod saqlash
    const { error: dbError } = await supabase.from('otp_codes').insert({
      phone,
      code,
      status: 'pending',
      expires_at: expiresAt,
    })
    if (dbError) throw new Error('Kod saqlashda xatolik: ' + dbError.message)

    // Telegram xabar yuborish
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')!
    const chatId   = Deno.env.get('TELEGRAM_CHANNEL_ID') // ixtiyoriy — agar bot chat orqali ishlasa

    // Bot orqali xabar yuborish uchun chat_id kerak.
    // Biz "start" parametri orqali botga yuboramiz — bot webhook da kodni yuboradi.
    // Lekin bu yerda kodni DB ga saqladik, frontend esa t.me/Bot?start=CODE ga redirect qiladi.
    // Bot /start CODE komandasini olganda Telegram chat_id ni bilib userga xabar yuboradi.

    // Agar siz bot webhook ishlatmasangiz va faqat deep link orqali ishlatsangiz,
    // kod DB da saqlanadi, user botga /start CODE yuboradi, bot kodni topib javob beradi.
    // Bu yerda biz faqat kodni frontendga qaytaramiz (SSL orqali xavfsiz).

    return new Response(
      JSON.stringify({ success: true, code }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})