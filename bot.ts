import { Bot } from "grammy";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const { BOT_TOKEN, SUPABASE_URL, SUPABASE_KEY } = process.env;

const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);
const bot = new Bot(BOT_TOKEN!);

// /start komandasi - startCode ni qabul qiladi
bot.command("start", async (ctx) => {
  try {
    const telegramId = ctx.from?.id.toString();
    const username = ctx.from?.username || "noma'lum";
    
    // Start parametridan kodni olish (masalan: /start 123456)
    const startArgs = ctx.match?.split(" ") || [];
    const startCode = startArgs[1]; // Foydalanuvchi yuborgan kod

    // Agar kod yuborilgan bo'lsa - tekshirish
    if (startCode) {
      // otp_codes jadvalidan kodni izlash
      const { data: otpRecord, error: otpError } = await supabase
        .from("otp_codes")
        .select("*")
        .eq("code", startCode)
        .eq("status", "pending")
        .gte("expires_at", new Date().toISOString())
        .maybeSingle();

      if (otpError) throw otpError;

      if (otpRecord) {
        // Kod to'g'ri - foydalanuvchini tasdiqlash
        await supabase
          .from("otp_codes")
          .update({ status: "used" })
          .eq("id", otpRecord.id);

        // Profilni yangilash
        await supabase
          .from("profiles")
          .upsert({
            telegram_id: telegramId,
            telegram_username: username,
            phone: otpRecord.phone,
          }, { onConflict: "telegram_id" });

        await ctx.reply(
          `✅ *Tasdiqlash muvaffaqiyatli!*\n\nSiz Smart-Dokon.Ai ga muvaffaqiyatli bog'landingiz.\n\nEndi saytga kirib ro'yxatdan o'tishingiz mumkin.`,
          { parse_mode: "Markdown" }
        );
        
        console.log(`✅ Foydalanuvchi tasdiqlandi: ${telegramId}, Telefon: ${otpRecord.phone}`);
        return;
      } else {
        // Kod xato yoki muddati o'tgan
        await ctx.reply(
          `❌ *Kod xato yoki muddati o'tgan!*\n\nIltimos, saytdan qayta kod oling va uni yuboring.`,
          { parse_mode: "Markdown" }
        );
        return;
      }
    }

    // Agar kod yuborilmagan bo'lsa - yangi kod so'rash
    await ctx.reply(
      `👋 *Salom! Smart-Dokon.Ai botiga xush kelibsiz!*\n\nRo'yxatdan o'tish uchun saytdan kod oling va uni menga yuboring.\n\nMasalan: /start 123456`,
      { parse_mode: "Markdown" }
    );

  } catch (err: any) {
    console.error("Xatolik:", err.message);
    await ctx.reply("⚠️ Kechirasiz, xato yuz berdi. Qayta urinib ko'ring.");
  }
});

// Matnli xabarlarni qabul qilish - foydalanuvchi kodi
bot.on("message:text", async (ctx) => {
  try {
    const telegramId = ctx.from?.id.toString();
    const username = ctx.from?.username || "noma'lum";
    const userCode = ctx.message.text.trim();

    // Kodni tekshirish
    const { data: otpRecord, error: otpError } = await supabase
      .from("otp_codes")
      .select("*")
      .eq("code", userCode)
      .eq("status", "pending")
      .gte("expires_at", new Date().toISOString())
      .maybeSingle();

    if (otpError) throw otpError;

    if (otpRecord) {
      // Kod to'g'ri - foydalanuvchini tasdiqlash
      await supabase
        .from("otp_codes")
        .update({ status: "used" })
        .eq("id", otpRecord.id);

      // Profilni yangilash
      await supabase
        .from("profiles")
        .upsert({
          telegram_id: telegramId,
          telegram_username: username,
          phone: otpRecord.phone,
        }, { onConflict: "telegram_id" });

      await ctx.reply(
        `✅ *Tasdiqlash muvaffaqiyatli!*\n\nSiz Smart-Dokon.Ai ga muvaffaqiyatli bog'landingiz.\n\nEndi saytga kirib ro'yxatdan o'tishingiz mumkin.`,
        { parse_mode: "Markdown" }
      );
      
      console.log(`✅ Foydalanuvchi tasdiqlandi: ${telegramId}, Telefon: ${otpRecord.phone}`);
    } else {
      // Kod xato
      await ctx.reply(
        `❌ *Kod xato yoki muddati o'tgan!*\n\nIltimos, saytdan to'g'ri kodni kiriting.`,
        { parse_mode: "Markdown" }
      );
    }
  } catch (err: any) {
    console.error("Xatolik:", err.message);
    await ctx.reply("⚠️ Xato yuz berdi. Qayta urinib ko'ring.");
  }
});

bot.start();

