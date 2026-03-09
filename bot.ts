import { Bot } from "grammy";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const bot = new Bot(process.env.BOT_TOKEN!);
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

bot.command("start", async (ctx) => {
  try {
    const telegramId = ctx.from?.id.toString()!;
    const username = ctx.from?.username || "noma'lum";

    // 6 xonali random kod yaratish
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 daqiqa

    // Eski kodlarni bekor qilish
    await supabase
      .from("otp_codes")
      .update({ status: "expired" })
      .eq("telegram_id", telegramId)
      .eq("status", "pending");

    // Yangi kodni DB ga saqlash
    const { error } = await supabase.from("otp_codes").insert({
      telegram_id: telegramId,
      telegram_username: username,
      code,
      status: "pending",
      expires_at: expiresAt,
    });

    if (error) throw error;

    // Foydalanuvchiga kodni yuborish
    await ctx.reply(
      `👋 Salom, @${username}!\n\n` +
      `🔑 Sizning kirish kodingiz:\n\n` +
      `<code>${code}</code>\n\n` +
      `⏱ Kod <b>5 daqiqa</b> amal qiladi.\n` +
      `🔒 Kodni hech kimga bermang!\n\n` +
      `➡️ Saytga o'tib shu kodni kiriting.`,
      { parse_mode: "HTML" }
    );

  } catch (err: any) {
    console.error("Xatolik:", err.message);
    await ctx.reply("⚠️ Xatolik yuz berdi. Qaytadan /start bosing.");
  }
});

// Boshqa xabarlar uchun
bot.on("message", async (ctx) => {
  await ctx.reply(
    "Kod olish uchun /start ni bosing 👇",
    { parse_mode: "HTML" }
  );
});

console.log("🚀 Bot ishga tushdi!");
bot.start();