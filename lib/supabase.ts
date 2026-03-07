import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);
const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
console.log(botUsername); // "SmartDokonSuppotr_bot" qaytaradi