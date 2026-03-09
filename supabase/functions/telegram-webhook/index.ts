// @ts-nocheck
// supabase/functions/telegram-webhook/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req: Request) => {
  try {
    const body = await req.json()
    const message = body?.message
    if (!message) return new Response('ok')

    const chatId  = message.chat.id
    const text    = message.text?.trim() ?? ''
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')!

    const startMatch = text.match(/^\/start\s+(\d{6})$/)

    if (!startMatch) {
      await sendTelegram(botToken, chatId,
        '👋 Salom! Bu Smart-Dokon tasdiqlash boti.\n\nKodingizni olish uchun saytga qayting.'
      )
      return new Response('ok')
    }

    const code = startMatch[1]

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: otpRow, error } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('code', code)
      .eq('status', 'pending')
      .gte('expires_at', new Date().toISOString())
      .maybeSingle()

    if (error || !otpRow) {
      await sendTelegram(botToken, chatId,
        '❌ Kod topilmadi yoki muddati o\'tgan.\n\nSaytga qaytib yangi kod oling.'
      )
      return new Response('ok')
    }

    await sendTelegram(botToken, chatId,
      `✅ Asalomu alaykum!\n\nMana sizning kodingiz:\n\n` +
      `<code>${code}</code>\n\n` +
      `⏱ Kod 5 daqiqa davomida amal qiladi.\n` +
      `🔒 Kodni hech kimga bermang!`
    )

    return new Response('ok')
  } catch (err) {
    console.error('Webhook error:', err)
    return new Response('error', { status: 500 })
  }
})

async function sendTelegram(token: string, chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  })
}