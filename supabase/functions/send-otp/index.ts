// @ts-nocheck
// supabase/functions/send-otp/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { phone } = await req.json()
    if (!phone) return new Response(JSON.stringify({ error: 'Telefon raqam kerak' }), { status: 400, headers: corsHeaders })

    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    await supabase
      .from('otp_codes')
      .update({ status: 'expired' })
      .eq('phone', phone)
      .eq('status', 'pending')

    const { error: dbError } = await supabase.from('otp_codes').insert({
      phone,
      code,
      status: 'pending',
      expires_at: expiresAt,
    })
    if (dbError) throw new Error('Kod saqlashda xatolik: ' + dbError.message)

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')!
    const chatId = Deno.env.get('TELEGRAM_CHANNEL_ID')

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