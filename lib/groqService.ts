import Groq from "groq-sdk";

// Groq SDK ni sozlash
const groq = new Groq({ 
  apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY // .env dagi nom bilan bir xil bo'lsin
});

/**
 * Biznes tahlilchi agenti
 * @param modelType - 'smart' (aqlli tahlil), 'fast' (tezkor xabar), 'deep' (chuqur mantiq)
 * @param data - Foydalanuvchi do'konidagi ma'lumotlar
 */
export async function aiBusinessAnalyst(modelType: 'smart' | 'fast' | 'deep', data: string) {
  
  // Sizning talablaringizga mos eng kuchli modellar ro'yxati
  const models = {
    smart: "llama3-70b-8192",      // Meta-ning eng aqlli modeli (Tahlil uchun zo'r)
    fast: "llama3-8b-8192",        // Juda tez (Oddiy bildirishnomalar uchun)
    deep: "mixtral-8x7b-32768"     // Katta hajmdagi ma'lumotlarni o'qish uchun
  };

  const response = await groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content: `Sen professional O'zbekistonlik biznes tahlilchisan. 
        Sening vazifang:
        1. Foydalanuvchi tovarlarini Xitoy (1688, Alibaba) narxlari bilan solishtirish.
        2. Kargo va bojxona xarajatlarini hisobga olib, foyda necha foizga oshishini (masalan: 25%) ko'rsatish.
        3. Bozor trendlarini va raqobatchilarning holatini (talab bor/yo'q) tahlil qilish.
        4. Biznesmenga eng yaxshi yechimni qisqa va londa SMS formatida berish.
        Javob faqat o'zbek tilida bo'lsin.`
      },
      { 
        role: "user", 
        content: data 
      }
    ],
    model: models[modelType],
    temperature: 0.7, // Ijodkorlik va aniqlik balansi
  });

  return response.choices[0]?.message?.content;
}