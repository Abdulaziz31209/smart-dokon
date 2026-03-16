// @ts-nocheck
// supabase/functions/telegram-webhook/index.ts - Full Telegram Bot Webhook (no local server needed)
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
    const username = message.from?.username || "noma'lum"

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Case 1: Plain /start - Generate new OTP and send
    if (text === '/start') {
      try {
        const telegramId = message.from?.id.toString()!

        // Expire old pending codes
        await supabase
          .from('otp_codes')
          .update({ status: 'expired' })
          .eq('telegram_id', telegramId)
          .eq('status', 'pending')

        // Generate new 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString()
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()

        // Insert new code
        const { error } = await supabase.from('otp_codes').insert({
          telegram_id: telegramId,
          telegram_username: username,
          code,
          status: 'pending',
          expires_at: expiresAt
        })

        if (error) throw error

        await sendTelegram(botToken, chatId,
          `Salom @${username}! Kod: <code>${code}</code> 5 daqiqa ichida kiriting.`
        )
      } catch (err) {
        console.error('OTP generation error:', err)
        await sendTelegram(botToken, chatId, 'Xatolik. /start qayta bosing.')
      }
      return new Response('ok')
    }

    // Case 2: /start <code> - Verify and send code
    const startMatch = text.match(/^\/start\s+(\d{6})$/)
    if (startMatch) {
      const code = startMatch[1]

      const { data: otpRow, error } = await supabase
        .from('otp_codes')
        .select('*')
        .eq('code', code)
        .eq('status', 'pending')
        .gte('expires_at', new Date().toISOString())
        .maybeSingle()

      if (error || !otpRow) {
        await sendTelegram(botToken, chatId, 'Kod muddati o\'tgan yoki topilmadi.')
        return new Response('ok')
      }

      await sendTelegram(botToken, chatId,
        `Sizning kodingiz: <code>${code}</code> 5 daqiqa amal qiladi.`
      )
      return new Response('ok')
    }

    // Default
    await sendTelegram(botToken, chatId, '/start bosing')
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
