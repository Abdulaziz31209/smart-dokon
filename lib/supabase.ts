import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// BRAUZERDA TEKSHIRAMIZ
console.log("--- SUPABASE DEBUG ---");
console.log("URL mavjudmi?:", !!supabaseUrl);
console.log("KEY mavjudmi?:", !!supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("XATO: Supabase o'zgaruvchilari yuklanmadi!");
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')