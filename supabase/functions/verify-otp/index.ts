// @ts-nocheck
// supabase/functions/verify-otp/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { phone, code } = await req.json()
    if (!phone || !code) {
      return new Response(JSON.stringify({ error: 'phone va code kerak' }), { status: 400, headers: corsHeaders })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: otpRow, error } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('phone', phone)
      .eq('code', code.trim())
      .eq('status', 'pending')
      .gte('expires_at', new Date().toISOString())
      .maybeSingle()

    if (error || !otpRow) {
      return new Response(
        JSON.stringify({ valid: false, error: "Kod xato yoki muddati o'tgan" }),
        { status: 400, headers: corsHeaders }
      )
    }

    await supabase
      .from('otp_codes')
      .update({ status: 'used' })
      .eq('id', otpRow.id)

    return new Response(
      JSON.stringify({ valid: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: corsHeaders }
    )
  }
})