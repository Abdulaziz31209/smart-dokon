import { Bot } from "grammy";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

// .env faylini aniq manzil orqali yuklash (Hozirgi papkadan qidiradi)
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const BOT_TOKEN = process.env.BOT_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// Diagnostika: Terminalda nima borligini ko'rish uchun (Xato bo'lsa yordam beradi)
console.log("--- Diagnostika ---");
console.log("BOT_TOKEN bormi?:", BOT_TOKEN ? "✅ Ha" : "❌ Yo'q");
console.log("SUPABASE_URL bormi?:", SUPABASE_URL ? "✅ Ha" : "❌ Yo'q");
console.log("SUPABASE_KEY bormi?:", SUPABASE_KEY ? "✅ Ha" : "❌ Yo'q");
console.log("--- --- ---");

if (!BOT_TOKEN || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ XATO: .env fayli o'qilmadi yoki ichi bo'sh!");
  console.log("Hozirgi ishchi papka:", process.cwd());
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const bot = new Bot(BOT_TOKEN);

bot.command("start", async (ctx) => {
  const userIdFromUrl = ctx.match;
  if (userIdFromUrl) {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ 
          telegram_id: ctx.from?.id.toString(), 
          telegram_username: ctx.from?.username || "noma'lum" 
        })
        .eq("id", userIdFromUrl);

      if (error) throw error;
      await ctx.reply("✅ Akkauntingiz muvaffaqiyatli bog'landi!");
    } catch (err) {
      console.error("Supabase xatosi:", err);
      await ctx.reply("⚠️ Bazaga yozishda xato.");
    }
  } else {
    await ctx.reply("Salom! Saytdagi tugmani bosing.");
  }
});

console.log("🚀 Bot ishga tushdi...");
bot.start();