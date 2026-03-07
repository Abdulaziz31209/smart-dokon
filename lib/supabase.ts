// lib/supabase.ts (yoki sizda qayerda bo'lsa)
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Buni ham export qilish kerak!
export const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
export const botToken = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;