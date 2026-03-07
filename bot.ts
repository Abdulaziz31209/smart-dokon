import { Bot } from "grammy";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const { BOT_TOKEN, SUPABASE_URL, SUPABASE_KEY } = process.env;

if (!BOT_TOKEN || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ XATO: .env fayli o'qilmadi!");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const bot = new Bot(BOT_TOKEN);

bot.command("start", async (ctx) => {
  const payload = ctx.match; // Bu yerda '244949' keladi

  if (!payload) {
    return ctx.reply("Salom! Tasdiqlash kodini olish uchun iltimos saytdagi tugma orqali qayta kiring.");
  }

  try {
    const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();

    // MUHIM: Endi 'id' (UUID) emas, 'user_number' (Text/BigInt) ustuni orqali qidiramiz
    const { data, error } = await supabase
      .from("profiles")
      .update({ 
        telegram_id: ctx.from?.id.toString(), 
        telegram_username: ctx.from?.username || "noma'lum",
        verification_code: generatedCode 
      })
      .eq("user_number", payload) // Qidiruv ustuni o'zgartirildi
      .select();

    if (error) throw error;

    if (data && data.length > 0) {
      await ctx.reply(`✅ Akkauntingiz bog'landi!\n\nTasdiqlash kodingiz: **${generatedCode}**`, { parse_mode: "Markdown" });
      console.log(`✅ Kod yuborildi: ${generatedCode} (User Number: ${payload})`);
    } else {
      // Agar bazada 'user_number' ustunida '244949' topilmasa
      await ctx.reply("⚠️ Foydalanuvchi topilmadi. Saytdan qayta urinib ko'ring yoki ma'lumotlar bazada borligini tekshiring.");
      console.log(`⚠️ User topilmadi: ${payload}`);
    }

  } catch (err: any) {
    console.error("Supabase xatosi:", err.message);
    await ctx.reply("⚠️ Bazada xatolik yuz berdi. Ustun nomini (user_number) tekshiring.");
  }
});

console.log("🚀 Bot ishga tushdi. user_number orqali qidirish yoqildi!");
bot.start();