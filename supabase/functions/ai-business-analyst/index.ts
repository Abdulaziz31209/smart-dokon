// @ts-nocheck - Deno global types
/// <reference types="https://deno.land/x/types/index.d.ts" />

/**
 * AI Business Analyst - Kengaytirilgan versiya
 * Deno muhitida ishlaydi
 */

// Deno global type declaration
declare const Deno: {
  env: {
    get(key: string): string | undefined
  }
}

// @deno-types="https://deno.land/std@0.168.0/http/server.ts"
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// @deno-types="https://esm.sh/@supabase/supabase-js@2/dist/main/index.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  user_id: string
  action: 'analyze' | 'chat' | 'notification_check'
  product_name?: string
  cost_price?: number
  selling_price?: number
  message?: string
}

interface BusinessData {
  products: any[]
  sales: any[]
  employees: any[]
  debts: any[]
  expenses: any[]
  customers: any[]
}

interface GroqResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
}

async function getUserBusinessData(supabase: any, userId: string): Promise<BusinessData> {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  
  const [products, sales, employees, debts, expenses, customers] = await Promise.all([
    supabase.from('products').select('*').eq('user_id', userId),
    supabase.from('sales').select('*, sale_items(*)').eq('user_id', userId).gte('created_at', thirtyDaysAgo.toISOString()),
    supabase.from('employees').select('*').eq('user_id', userId),
    supabase.from('debts').select('*').eq('user_id', userId),
    supabase.from('expenses').select('*').eq('user_id', userId).gte('created_at', thirtyDaysAgo.toISOString()),
    supabase.from('customers').select('*').eq('user_id', userId)
  ])

  return {
    products: products.data || [],
    sales: sales.data || [],
    employees: employees.data || [],
    debts: debts.data || [],
    expenses: expenses.data || [],
    customers: customers.data || []
  }
}

async function checkAndUpdateChatLimit(supabase: any, userId: string, maxLimit: number = 15): Promise<{allowed: boolean, remaining: number}> {
  const today = new Date().toISOString().split('T')[0]
  
  const { data: chatUsage } = await supabase
    .from('ai_chat_usage')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .single()

  const currentCount = (chatUsage?.message_count as number) || 0
  const remaining = maxLimit - currentCount

  if (currentCount >= maxLimit) {
    return { allowed: false, remaining: 0 }
  }

  if (chatUsage) {
    await supabase.from('ai_chat_usage').update({ message_count: currentCount + 1 }).eq('id', chatUsage.id)
  } else {
    await supabase.from('ai_chat_usage').insert({ user_id: userId, date: today, message_count: 1 })
  }

  return { allowed: true, remaining: remaining - 1 }
}

async function getAIResponse(prompt: string): Promise<string> {
  const groqApiKey = Deno.env.get('GROQ_API_KEY')
  
  if (!groqApiKey) {
    throw new Error('GROQ_API_KEY topilmadi')
  }

  const systemPrompt = `Sen professional O'zbekistonlik biznes tahlilchisan va AI biznes maslahatchisan. 
MILLIY VALYUTA: O'zbekiston somi (UZS)
Til: O'zbek

Senning vazifang:
1. Tadbirkorning biznes malumotlarini tahlil qilish
2. Bozor trendlari va raqobatchilar haqida maslahat berish
3. Foydani oshirish boyicha tavsiyalar berish
4. Xodimlarni baholash va ularga bonus/ogohlantirish berish
5. Qaysi tovarlar kop sotilishi, qaysi kam sotilishi haqida malumot berish
6. Yillik oylik solishtirma tahlil (osish yoki pasayish)
7. Dokon raqobatchilardan oldinda yoki orqada ekanligini tahmin qilish
8. AI eslatmalar berish

QOIDALAR:
- Javoblar har doim ozbek tilida bolsin
- Raqamlar aniq korstatilsin
- Amaliy va foydali maslahatlar berilsin
- Muhim eslatmalar emoji bilan belgilansin
- Xulosa qisqa va londa bolsin`

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${groqApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama3-70b-8192',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2048,
    }),
  })

  if (!response.ok) {
    await response.text()
    throw new Error(`Groq API xatosi: ${response.status}`)
  }

  const data = await response.json() as GroqResponse
  return data.choices[0]?.message?.content || 'Tahlil natijasi topilmadi'
}

async function analyzeProduct(supabase: any, userId: string, productName: string, costPrice: number, sellingPrice: number): Promise<string> {
  const businessData = await getUserBusinessData(supabase, userId)
  
  const profit = sellingPrice - costPrice
  const profitPercentage = ((profit / costPrice) * 100).toFixed(1)
  
  const estimatedCargoPerKg = 3.5
  const estimatedCustoms = costPrice * 0.15
  const totalCostWithCargo = costPrice + estimatedCargoPerKg + estimatedCustoms
  const realProfit = sellingPrice - totalCostWithCargo
  const realProfitPercentage = ((realProfit / totalCostWithCargo) * 100).toFixed(1)

  const productSales = businessData.sales.flatMap((s: any) => s.sale_items || [])
  const productMap = new Map<string, { quantity: number; revenue: number }>()
  productSales.forEach((item: any) => {
    const existing = productMap.get(item.product_name) || { quantity: 0, revenue: 0 }
    productMap.set(item.product_name, {
      quantity: existing.quantity + (item.quantity || 0),
      revenue: existing.revenue + (item.total_price || 0)
    })
  })

  const topProducts = Array.from(productMap.entries())
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 5)

  let productsList = 'Malumot yoq'
  if (businessData.products.length > 0) {
    productsList = businessData.products.slice(0, 10).map((p: any) => 
      `- ${p.name}: tannarx ${p.cost_price} som, sotuv ${p.selling_price} som, qoldiq ${p.quantity || 0}`
    ).join('\n')
  }

  let topProductsList = 'Malumot yoq'
  if (topProducts.length > 0) {
    topProductsList = topProducts.map(([name, data]) => 
      `- ${name}: ${data.quantity} ta, jami ${data.revenue.toLocaleString()} som`
    ).join('\n')
  }

  let employeesList = 'Malumot yoq'
  if (businessData.employees.length > 0) {
    employeesList = businessData.employees.map((e: any) => 
      `- ${e.name}: oylik ${(e.salary || 0).toLocaleString()} som, bonus ${(e.bonus || 0).toLocaleString()} som`
    ).join('\n')
  }

  const totalDebts = businessData.debts.reduce((sum: number, d: any) => sum + (d.amount || 0), 0)
  const totalExpenses = businessData.expenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0)

  const prompt = `
TAVAR TAHLILI:
- Tovar nomi: ${productName}
- Xitoydan tannarx: $${costPrice}
- Ozbekistonda sotuv narxi: $${sellingPrice}
- Sof foyda: $${profit} (${profitPercentage}%)
- Kargo + bojona bilan haqiqiy foyda: $${realProfit.toFixed(2)} (${realProfitPercentage}%)

FOYDALANUVCHINING BIZNES MALUMOTLARI:

TOVALLAR (${businessData.products.length} ta):
${productsList}

SOTUVLAR (oxirgi 30 kun):
- Jami sotuvlar soni: ${businessData.sales.length}
- Eng kop sotilgan tovarlar:
${topProductsList}

XODIMLAR (${businessData.employees.length} ta):
${employeesList}

QARZLAR:
- Jami qarz: ${totalDebts.toLocaleString()} som

XARAJATLAR (oxirgi 30 kun):
- Jami xarajat: ${totalExpenses.toLocaleString()} som

MUTAXASSIS TAHLILI:
Bu tovar uchun quyidagilarni tahlil qiling:
1. Bu tovar bozorda qancha sotilishi mumkin?
2. Xitoy bozori (1688, Alibaba) bilan solishtiring
3. Bu tovardan qancha foiz foyda kutilyapsiz?
4. Qaysi tovarlar kop foyda keltiradi?
5. Raqobatchilardan qanday ustunlik bor?

Javobni quyidagi formatda ber:
TAHIL NATIJASI:
[Toliq tahlil]

FOYDANI OSHIRISH BOYICHA MASLAHATLAR:
[Amaliy tavsiyalar]

XULOSA:
[Qisqa xulosa]
`

  return await getAIResponse(prompt)
}

async function handleAIChat(supabase: any, userId: string, message: string, chatHistory: any[]): Promise<string> {
  const businessData = await getUserBusinessData(supabase, userId)
  
  const totalRevenue = businessData.sales.reduce((sum: number, s: any) => sum + (s.total_amount || 0), 0)
  const totalExpenses = businessData.expenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0)
  const netProfit = totalRevenue - totalExpenses

  const employeePerformance = businessData.employees.map((e: any) => {
    const empSales = businessData.sales.filter((s: any) => s.employee_id === e.id)
    const empRevenue = empSales.reduce((sum: number, s: any) => sum + (s.total_amount || 0), 0)
    return {
      name: e.name,
      salary: e.salary || 0,
      sales: empRevenue,
      performance: empRevenue > (e.salary || 0) * 3 ? 'yaxshi' : 'norma',
      suggestion: empRevenue > (e.salary || 0) * 5 ? 'bonus berish' : 'rivojlantirish kerak'
    }
  })

  const totalDebts = businessData.debts.reduce((sum: number, d: any) => sum + (d.amount || 0), 0)

  let chatHistoryText = 'Oldingi suhbat yoq'
  if (chatHistory.length > 0) {
    chatHistoryText = chatHistory.slice(-5).map((h: any) => 
      `${h.role}: ${h.content.substring(0, 100)}...`
    ).join('\n')
  }

  const prompt = `
FOYDALANUVCHI XABARI: "${message}"

FOYDALANUVCHINING BIZNES HOLATI:

UMUMIY KORSKATKICHLAR (oxirgi 30 kun):
- Jami sotuvlar: ${totalRevenue.toLocaleString()} som
- Jami xarajatlar: ${totalExpenses.toLocaleString()} som
- Sof foyda: ${netProfit.toLocaleString()} som

TOVALLAR:
- Jami tovarlar soni: ${businessData.products.length}
- Jami qoldiq: ${businessData.products.reduce((sum: number, p: any) => sum + (p.quantity || 0), 0)} ta

XODIMLAR BAHOLAMASI:
${employeePerformance.map(e => `- ${e.name}: sotuv ${e.sales.toLocaleString()} som, baho: ${e.performance} - ${e.suggestion}`).join('\n') || 'Xodimlar yoq'}

QARZLAR:
- Jami qarz: ${totalDebts.toLocaleString()} som

Mijozlar soni: ${businessData.customers.length}

SONGI SUHBAT TARIXI:
${chatHistoryText}

VAZIFA:
Foydalanuvchiga uning biznesi haqida malumot bering va savoliga javob bering. 

Javob faqat ozbek tilida bolsin.
`

  return await getAIResponse(prompt)
}

async function generateNotifications(supabase: any, userId: string): Promise<any[]> {
  const notifications: any[] = []
  const businessData = await getUserBusinessData(supabase, userId)
  
  // 1. Tovarlar tugayotgani
  const lowStockProducts = businessData.products.filter((p: any) => (p.quantity || 0) < 10)
  if (lowStockProducts.length > 0) {
    const productNames = lowStockProducts.map((p: any) => p.name).join(', ')
    notifications.push({
      title: 'Tovarlar tugayapti',
      message: `Quyidagi tovarlar kam qolgan: ${productNames}. Buyurtma berishni unutmang!`,
      type: 'warning'
    })
  }

  // 2. Xodimlarni baholash
  if (businessData.employees.length > 0) {
    const topPerformers = businessData.employees.filter((e: any) => {
      const empSales = businessData.sales.filter((s: any) => s.employee_id === e.id)
      const empRevenue = empSales.reduce((sum: number, s: any) => sum + (s.total_amount || 0), 0)
      return empRevenue > (e.salary || 0) * 5
    })

    if (topPerformers.length > 0) {
      const performerNames = topPerformers.map((e: any) => e.name).join(', ')
      notifications.push({
        title: 'Eng yaxshi xodimlar',
        message: `Bu oyda alo natija korsatgan xodimlar: ${performerNames}. Ularga bonus berishni korib chiqing!`,
        type: 'success'
      })
    }
  }

  // 3. Qarzlar
  const totalDebts = businessData.debts.reduce((sum: number, d: any) => sum + (d.amount || 0), 0)
  if (totalDebts > 10000000) {
    notifications.push({
      title: 'Katta qarz',
      message: `Jami qarzlaringiz ${totalDebts.toLocaleString()} som. Qarzni kamaytirish boyicha reja tuzing.`,
      type: 'warning'
    })
  }

  // 4. Oylik solishtirma
  const currentMonth = new Date().getMonth()
  const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1
  
  const currentMonthSales = businessData.sales.filter((s: any) => {
    const date = new Date(s.created_at)
    return date.getMonth() === currentMonth
  })
  
  const lastMonthSales = businessData.sales.filter((s: any) => {
    const date = new Date(s.created_at)
    return date.getMonth() === lastMonth
  })

  const currentRevenue = currentMonthSales.reduce((sum: number, s: any) => sum + (s.total_amount || 0), 0)
  const lastRevenue = lastMonthSales.reduce((sum: number, s: any) => sum + (s.total_amount || 0), 0)
  
  if (lastRevenue > 0) {
    const changePercent = ((currentRevenue - lastRevenue) / lastRevenue * 100)
    const isPositive = changePercent > 0
    const trend = isPositive ? 'osish' : 'pasayish'
    const trendMessage = isPositive ? 'Ajoyib natija' : 'Etiboringizni qaratish kerak'
    
    notifications.push({
      title: isPositive ? 'Osish' : 'Pasayish',
      message: `Otxan oyga nisbatan sotuvlar ${Math.abs(changePercent).toFixed(1)}% ${trend} korsatdi. ${trendMessage}!`,
      type: isPositive ? 'success' : 'info'
    })
  }

  // 5. Raqobatchilar
  notifications.push({
    title: 'Raqobatchilar tahlili',
    message: 'Bozorda yangi raqobatchilar paydo bolishi mumkin. Narxlarni va sifatni nazorat qiling.',
    type: 'info'
  })

  return notifications
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id, action, product_name, cost_price, selling_price, message }: RequestBody = await req.json()

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id kerak' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    let result: any = {}

    switch (action) {
      case 'analyze':
        if (!product_name || !cost_price || !selling_price) {
          return new Response(
            JSON.stringify({ error: 'product_name, cost_price, selling_price kerak' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const limitCheck = await checkAndUpdateChatLimit(supabase, user_id)
        if (!limitCheck.allowed) {
          return new Response(
            JSON.stringify({ 
              error: 'Kunlik limit tugadi', 
              remaining: 0,
              message: 'Ertaga qayta urinib koring yoki premium ga oting'
            }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const analysis = await analyzeProduct(supabase, user_id, product_name, cost_price, selling_price)
        
        await supabase.from('notifications').insert({
          user_id,
          title: `Tahlil: ${product_name}`,
          message: analysis,
          type: 'ai_analysis',
          is_read: false
        })

        result = { success: true, analysis, remaining: limitCheck.remaining }
        break

      case 'chat':
        if (!message) {
          return new Response(
            JSON.stringify({ error: 'message kerak' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const chatLimitCheck = await checkAndUpdateChatLimit(supabase, user_id)
        if (!chatLimitCheck.allowed) {
          return new Response(
            JSON.stringify({ 
              error: 'Kunlik limit tugadi', 
              remaining: 0,
              message: 'Ertaga qayta urinib koring'
            }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data: chatHistory } = await supabase
          .from('ai_chat_history')
          .select('*')
          .eq('user_id', user_id)
          .order('created_at', { ascending: false })
          .limit(10)

        const aiResponse = await handleAIChat(supabase, user_id, message, chatHistory || [])

        await supabase.from('ai_chat_history').insert({
          user_id,
          message,
          response: aiResponse,
          created_at: new Date().toISOString()
        })

        result = { success: true, response: aiResponse, remaining: chatLimitCheck.remaining }
        break

      case 'notification_check':
        const notifications = await generateNotifications(supabase, user_id)
        
        for (const notif of notifications) {
          await supabase.from('notifications').insert({
            user_id,
            title: notif.title,
            message: notif.message,
            type: notif.type,
            is_read: false
          })
        }

        result = { success: true, notifications }
        break

      default:
        return new Response(
          JSON.stringify({ error: 'Notogri action. Foydalaning: analyze, chat, yoki notification_check' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: unknown) {
    const error = err as Error
    console.error('Xatolik:', error.message)
    
    return new Response(
      JSON.stringify({ error: error.message || 'Nomajum xatolik yuz berdi' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})