import { Bot } from "grammy";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const { BOT_TOKEN, SUPABASE_URL, SUPABASE_KEY } = process.env;

const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);
const bot = new Bot(BOT_TOKEN!);

bot.command("start", async (ctx) => {
  try {
    // 1. 6 xonali tasodifiy kod yaratish
    const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
    const telegramId = ctx.from?.id.toString();
    const username = ctx.from?.username || "noma'lum";

    // 2. Supabase-da foydalanuvchini telegram_id orqali yangilash yoki yaratish (Upsert)
    // Bu usulda UUID bo'lishi shart emas, bot foydalanuvchini Telegram ID-sidan taniydi
    const { data, error } = await supabase
      .from("profiles")
      .upsert({ 
        telegram_id: telegramId, 
        telegram_username: username,
        verification_code: generatedCode 
      }, { onConflict: 'telegram_id' }) // Agar bu ID bo'lsa yangila, bo'lmasa yarat
      .select();

    if (error) throw error;

    // 3. Foydalanuvchiga kodni yuborish
    await ctx.reply(`Salom! Sizning tasdiqlash kodingiz:\n\n**${generatedCode}**`, { parse_mode: "Markdown" });
    
    console.log(`✅ Kod yuborildi: ${generatedCode} (User: ${telegramId})`);

  } catch (err: any) {
    console.error("Xatolik yuz berdi:", err.message);
    await ctx.reply("⚠️ Kechirasiz, kodni generatsiya qilishda xato yuz berdi.");
  }
});

console.log("🚀 Bot ishga tushdi. Endi hamma kod olishi mumkin!");
bot.start();