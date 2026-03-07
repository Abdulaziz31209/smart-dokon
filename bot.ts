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
  // Telegram 'start' komandasidan keyingi yashirin ID-ni avtomatik oladi
  const payload = ctx.match; 

  if (!payload) {
    return ctx.reply("Salom! Tasdiqlash kodini olish uchun iltimos saytdagi tugma orqali qayta kiring.");
  }

  try {
    const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Bazada ID bo'yicha qidirish va yangilash
    // Payload UUID yoki raqam bo'lishidan qat'i nazar bazadan qidiradi
    const { data, error } = await supabase
      .from("profiles")
      .update({ 
        telegram_id: ctx.from?.id.toString(), 
        telegram_username: ctx.from?.username || "noma'lum",
        verification_code: generatedCode 
      })
      .eq("id", payload) // Bu yerda payload avtomatik ishlaydi
      .select();

    if (error) throw error;

    if (data && data.length > 0) {
      await ctx.reply(`✅ Akkauntingiz bog'landi!\n\nTasdiqlash kodingiz: **${generatedCode}**`, { parse_mode: "Markdown" });
      console.log(`✅ Kod yuborildi: ${generatedCode} (User ID: ${payload})`);
    } else {
      // Agar bazada bunday ID-li foydalanuvchi topilmasa
      await ctx.reply("⚠️ Kechirasiz, foydalanuvchi ma'lumotlari topilmadi. Saytdan qayta urinib ko'ring.");
    }

  } catch (err: any) {
    console.error("Supabase xatosi:", err.message);
    await ctx.reply("⚠️ Texnik xatolik yuz berdi. Iltimos, birozdan so'ng urinib ko'ring.");
  }
});

console.log("🚀 Bot ishga tushdi. Deep-linking rejasi tayyor!");
bot.start();