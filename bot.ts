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
  const userIdFromUrl = ctx.match; // Saytdan kelgan ID

  // 1. UUID formatini tekshirish (8-4-4-4-12 ko'rinishida bo'lishi shart)
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userIdFromUrl);

  if (userIdFromUrl && isUUID) {
    try {
      // 2. 6 xonali tasodifiy kod yaratish
      const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();

      // 3. Bazani yangilash
      const { error } = await supabase
        .from("profiles")
        .update({ 
          telegram_id: ctx.from?.id.toString(), 
          telegram_username: ctx.from?.username || "noma'lum",
          verification_code: generatedCode 
        })
        .eq("id", userIdFromUrl); // Endi bu yerda UUID xatosi chiqmaydi

      if (error) throw error;

      // 4. Foydalanuvchiga xabar yuborish
      await ctx.reply(`✅ Akkauntingiz muvaffaqiyatli bog'landi!\n\nSizning tasdiqlash kodingiz: **${generatedCode}**`, { parse_mode: "Markdown" });
      
      console.log(`✅ Kod yuborildi: ${generatedCode} (User: ${userIdFromUrl})`);

    } catch (err: any) {
      console.error("Supabase xatosi:", err.message);
      await ctx.reply("⚠️ Bazaga yozishda xato yuz berdi. Iltimos, keyinroq urinib ko'ring.");
    }
  } else {
    // Agar UUID bo'lmasa yoki shunchaki raqam kelsa (masalan 244949)
    await ctx.reply("Salom! Kod olish uchun iltimos saytdagi tugmani bosing.\n\nEslatma: Saytdan kelgan havola noto'g'ri ko'rinishda.");
    console.log(`⚠️ Noto'g'ri ID formatda keldi: ${userIdFromUrl}`);
  }
});

console.log("🚀 Bot ishga tushdi va UUID tekshiruvi yoqildi...");
bot.start();