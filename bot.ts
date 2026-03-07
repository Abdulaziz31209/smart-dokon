import { Bot } from "grammy";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

// .env faylini yuklash
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const { BOT_TOKEN, SUPABASE_URL, SUPABASE_KEY } = process.env;

if (!BOT_TOKEN || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ XATO: .env fayli o'qilmadi!");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const bot = new Bot(BOT_TOKEN);

bot.command("start", async (ctx) => {
  const userIdFromUrl = ctx.match; // Saytdan kelgan ID (UUID)

  if (userIdFromUrl) {
    try {
      // 1. 6 xonali tasodifiy kod yaratish
      const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();

      // 2. Bazani yangilash (ID, Username va 6 xonali kodni saqlash)
      // DIQQAT: 'verification_code' ustuni bazangizda bo'lishi kerak
      const { error } = await supabase
        .from("profiles")
        .update({ 
          telegram_id: ctx.from?.id.toString(), 
          telegram_username: ctx.from?.username || "noma'lum",
          verification_code: generatedCode // Kodni bazaga yozamiz
        })
        .eq("id", userIdFromUrl);

      if (error) throw error;

      // 3. Foydalanuvchiga xabar yuborish
      await ctx.reply(`✅ Akkauntingiz bog'landi!\n\nSizning tasdiqlash kodingiz: **${generatedCode}**`, { parse_mode: "Markdown" });
      
      console.log(`✅ Kod yuborildi: ${generatedCode} (User: ${userIdFromUrl})`);

    } catch (err) {
      console.error("Supabase xatosi:", err);
      await ctx.reply("⚠️ Bazaga yozishda xato. Ustunlar to'g'riligini tekshiring.");
    }
  } else {
    await ctx.reply("Salom! Kod olish uchun iltimos saytdagi tugmani bosing.");
  }
});

console.log("🚀 Bot ishga tushdi va kod yaratishga tayyor...");
bot.start();