'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import SubscriptionCheck from '@/components/SubscriptionCheck'
import {
  Search, Filter, Edit, Trash2, AlertCircle, TrendingUp, Package,
  ShoppingCart, X, Plus, BarChart3, Calendar, Users, DollarSign,
  ArrowUpRight, Eye, FileText, Settings, Bell, Clock, Target,
  RefreshCw, Percent, Zap, Award, LineChart, PieChart, Phone,
  Mail, LogOut, ChevronDown, CheckCircle2, Save, Loader2,
  UserPlus, Briefcase, Home, ArrowDownRight, ToggleLeft, ToggleRight,
  Star, TrendingDown, Hash, CreditCard, Banknote, Globe
} from 'lucide-react'
import Link from 'next/link'

// ─── Sonlarni formatlash (hydration-safe) ────────────────────────────────────
function fmt(n: number): string {
  if (!n || n === 0) return '0'
  const s = Math.floor(Math.abs(n)).toString()
  let r = ''
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) r += ' '
    r += s[i]
  }
  return n < 0 ? '-' + r : r
}

// ─── Davr tanlovlari ─────────────────────────────────────────────────────────
const PERIODS = [
  { key: 'today',  label: 'Bugun',   days: 1  },
  { key: 'week',   label: '7 Kun',   days: 7  },
  { key: 'month',  label: '30 Kun',  days: 30 },
]

// ─── Demo ma'lumotlar (faqat login bo'lmagan holat uchun) ─────────────────────
const DEMO_PRODUCTS = [
  { id: 1,  name: 'Coca-Cola 0.5L',       sku: 'CC-500',  price: 8000,  cost: 5500,  stock: 145, min_stock_level: 50,  sold_today: 23, sold_week: 89,  sold_month: 340, category: 'Ichimliklar', active: true },
  { id: 2,  name: 'Pepsi 1L',             sku: 'PP-1000', price: 12000, cost: 8500,  stock: 87,  min_stock_level: 40,  sold_today: 18, sold_week: 72,  sold_month: 280, category: 'Ichimliklar', active: true },
  { id: 3,  name: "Lay's Chips",          sku: 'LC-001',  price: 6500,  cost: 4200,  stock: 18,  min_stock_level: 30,  sold_today: 31, sold_week: 124, sold_month: 480, category: 'Gazaklar',   active: true },
  { id: 4,  name: 'Snickers 50g',         sku: 'SN-050',  price: 4500,  cost: 3000,  stock: 234, min_stock_level: 80,  sold_today: 42, sold_week: 168, sold_month: 650, category: 'Shokolad',   active: true },
  { id: 5,  name: 'Nestle Coffee 100g',   sku: 'NC-100',  price: 25000, cost: 18000, stock: 56,  min_stock_level: 20,  sold_today: 8,  sold_week: 32,  sold_month: 125, category: 'Kofe',       active: true },
  { id: 6,  name: 'Red Bull 250ml',       sku: 'RB-250',  price: 15000, cost: 11000, stock: 12,  min_stock_level: 25,  sold_today: 19, sold_week: 76,  sold_month: 290, category: 'Energetik',  active: false },
  { id: 7,  name: 'Fanta 1L',             sku: 'FN-1000', price: 11000, cost: 7500,  stock: 98,  min_stock_level: 40,  sold_today: 15, sold_week: 60,  sold_month: 230, category: 'Ichimliklar', active: true },
  { id: 8,  name: 'Mars 50g',             sku: 'MR-050',  price: 4500,  cost: 3000,  stock: 156, min_stock_level: 80,  sold_today: 28, sold_week: 112, sold_month: 435, category: 'Shokolad',   active: true },
  { id: 9,  name: 'Pringles Original',    sku: 'PR-001',  price: 18000, cost: 13000, stock: 43,  min_stock_level: 20,  sold_today: 12, sold_week: 48,  sold_month: 185, category: 'Gazaklar',   active: true },
  { id: 10, name: 'Nescafe 3in1',         sku: 'NC-3IN1', price: 3000,  cost: 2000,  stock: 267, min_stock_level: 100, sold_today: 45, sold_week: 180, sold_month: 695, category: 'Kofe',       active: true },
]

const DEMO_EMPLOYEES = [
  { id: 1, name: 'Aliyev Sardor',    position: 'Direktor', phone: '+998 90 123 45 67', email: 'sardor@smart-dokon.uz',  salary: 8000000,  sales_today: 12450000, sales_month: 248900000, performance: 98, hours_today: 8,   is_active: true,  avatar_color: 'from-blue-500 to-purple-500',   sales_goal: 15000000 },
  { id: 2, name: 'Karimova Nilufar', position: 'Sotuvchi', phone: '+998 91 234 56 78', email: 'nilufar@smart-dokon.uz', salary: 4500000,  sales_today: 8750000,  sales_month: 175200000, performance: 94, hours_today: 8,   is_active: true,  avatar_color: 'from-pink-500 to-rose-500',     sales_goal: 6000000 },
  { id: 3, name: 'Usmonov Bekzod',   position: 'Sotuvchi', phone: '+998 93 345 67 89', email: 'bekzod@smart-dokon.uz',  salary: 4200000,  sales_today: 7340000,  sales_month: 146800000, performance: 91, hours_today: 8,   is_active: true,  avatar_color: 'from-emerald-500 to-teal-500',  sales_goal: 5500000 },
  { id: 4, name: 'Rahimova Dilnoza', position: 'Kassir',   phone: '+998 94 456 78 90', email: 'dilnoza@smart-dokon.uz', salary: 3800000,  sales_today: 6890000,  sales_month: 137600000, performance: 89, hours_today: 7.5, is_active: true,  avatar_color: 'from-orange-500 to-amber-500',  sales_goal: 0 },
  { id: 5, name: 'Tursunov Javohir', position: 'Omborchi', phone: '+998 95 567 89 01', email: 'javohir@smart-dokon.uz', salary: 3500000,  sales_today: 0,        sales_month: 0,         performance: 96, hours_today: 8,   is_active: false, avatar_color: 'from-indigo-500 to-violet-500', sales_goal: 0 },
]

const DEMO_SALES = [
  { id: 1, time: '09:15', customer: 'Xaridor #1234', items: 5, total: 45000,  payment: 'Naqd',  seller: 'Nilufar' },
  { id: 2, time: '09:32', customer: 'Xaridor #1235', items: 3, total: 28500,  payment: 'Karta', seller: 'Bekzod'  },
  { id: 3, time: '10:05', customer: 'Xaridor #1236', items: 8, total: 67000,  payment: 'Naqd',  seller: 'Nilufar' },
  { id: 4, time: '10:28', customer: 'Xaridor #1237', items: 2, total: 18000,  payment: 'Karta', seller: 'Dilnoza' },
  { id: 5, time: '11:15', customer: 'Xaridor #1238', items: 6, total: 52000,  payment: 'Naqd',  seller: 'Bekzod'  },
  { id: 6, time: '11:47', customer: 'Xaridor #1239', items: 4, total: 38500,  payment: 'Karta', seller: 'Nilufar' },
  { id: 7, time: '12:30', customer: 'Xaridor #1240', items: 7, total: 59000,  payment: 'Naqd',  seller: 'Dilnoza' },
  { id: 8, time: '13:15', customer: 'Xaridor #1241', items: 3, total: 24000,  payment: 'Karta', seller: 'Bekzod'  },
]

const DEMO_DEBTS = [
  { id: 1, customer: 'Xaridor #A001', amount: 1250000, paid: 450000, remaining: 800000, due_date: '2026-03-10', status: 'active', note: 'Elektronika' },
  { id: 2, customer: 'Cafe "Ziyo"', amount: 850000, paid: 850000, remaining: 0, due_date: '2026-02-20', status: 'paid', note: '' },
  { id: 3, customer: 'Do\'kon "Nur"', amount: 2450000, paid: 1000000, remaining: 1450000, due_date: '2026-03-05', status: 'active', note: 'Oylik hisob' },
  { id: 4, customer: 'Shaxsiy Xaridor', amount: 320000, paid: 0, remaining: 320000, due_date: '2026-02-28', status: 'active', note: '' },
]

const WEEK_CHART = [
  { day: 'Dush', v: 8750000  },
  { day: 'Sesh', v: 9850000  },
  { day: 'Chor', v: 7200000  },
  { day: 'Pay',  v: 11340000 },
  { day: 'Jum',  v: 12150000 },
  { day: 'Shan', v: 9450000  },
  { day: 'Yak',  v: 13540000 },
]

const POSITIONS = ['Direktor', 'Sotuvchi', 'Kassir', 'Omborchi', 'Xodim']
const CATEGORIES = ['Ichimliklar', 'Shokolad', 'Gazaklar', 'Kofe', 'Energetik', 'Shirinlik', 'Boshqa']

// ─── Modal wrapper ────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, icon, children, wide = false }: {
  open: boolean; onClose: () => void; title: string; icon: React.ReactNode
  children: React.ReactNode; wide?: boolean
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className={`bg-slate-800 border border-slate-700 rounded-3xl shadow-2xl w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[90vh] flex flex-col`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-700 flex-shrink-0">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">{icon}{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-xl transition-all"><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-6">{children}</div>
      </div>
    </div>
  )
}

// ─── Input helper ─────────────────────────────────────────────────────────────
const inp = "w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
const sel = "w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"

// ─── Ana komponent ────────────────────────────────────────────────────────────
export default function SmartDokon() {
  const [user, setUser]     = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [recentSales, setRecentSales] = useState<any[]>([])
  const [debts, setDebts] = useState<any[]>([])
  const [analytics, setAnalytics] = useState<any>({
    totalSales: 0,
    totalProfit: 0,
    totalStockValue: 0,
    transactionCount: 0,
    avgCheck: 0
  })
  const [weeklyChart, setWeeklyChart] = useState<any[]>([])
  const [employeeKPIs, setEmployeeKPIs] = useState<any[]>([])
  const [goals, setGoals] = useState<any>({ daily: 15000000, weekly: 100000000, monthly: 400000000 })
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  // View & period
  const [view, setView]     = useState('bugun')
  const [period, setPeriod] = useState('today')
  const [search, setSearch] = useState('')

  // Modals
  const [modal, setModal] = useState<string | null>(null)
  const [editItem, setEditItem] = useState<any>(null)
  const [editDebtItem, setEditDebtItem] = useState<any>(null)

  // Forms
  const [prodForm, setProdForm] = useState({ name: '', sku: '', price: '', cost: '', stock: '', min_stock_level: '', category: 'Ichimliklar' })
  const [empForm, setEmpForm]   = useState({ name: '', position: 'Sotuvchi', phone: '', email: '', salary: '', sales_goal: '' })
  const [saleForm, setSaleForm] = useState({ product_id: '', employee_id: '', qty: '1', payment: 'Naqd' })
  const [goalForm, setGoalForm] = useState({ daily: '', weekly: '', monthly: '' })
  const [debtForm, setDebtForm] = useState({ customer: '', amount: '', due_date: '', note: '' })
  const [settingsForm, setSettingsForm] = useState({ shop_name: '', phone: '', currency: 'UZS', notifications: true })
  const [saving, setSaving] = useState(false)
  const [toast, setToast]   = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  // Auth prompt
  const [authPrompt, setAuthPrompt] = useState(false)

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    setMounted(true)
    init()
  }, [])

  // Period o'zgarganda real ma'lumotlarni yangilash
  useEffect(() => {
    if (user) {
      fetchAnalytics()
    }
  }, [period, user])

  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      setUser(session.user)
      // Fetch profile and check onboarding status
      await fetchProfile(session.user.id)
      
      // Fetch REAL data only for authenticated users (RLS will filter by user_id)
      await Promise.all([
        fetchProducts(),
        fetchEmployees(),
        fetchSales(),
        fetchAnalytics(),
        fetchWeeklyChart(),
        fetchEmployeeKPIs(),
        fetchDebts()
      ])
      
      // NO demo data fallback for logged-in users - they should only see their own data
    } else {
      // DEMO MODE: Only show demo data for unauthenticated users
      setProducts(DEMO_PRODUCTS)
      setEmployees(DEMO_EMPLOYEES)
      setDebts(DEMO_DEBTS)
    }
    setLoading(false)
  }

  const fetchProfile = async (uid: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).single()
    if (data) {
      setProfile(data)
      setSettingsForm({ shop_name: data.shop_name || '', phone: data.phone || '', currency: 'UZS', notifications: true })
    }
  }

  const fetchProducts = async () => {
    // RLS - faqat joriy foydalanuvchining ma'lumotlarini oladi
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching products:', error)
      return
    }
    
    // Faqat real ma'lumotlarni ko'rsatamiz (demo yo'q)
    setProducts(data || [])
  }

  const fetchEmployees = async () => {
    // RLS - faqat joriy foydalanuvchining ma'lumotlarini oladi
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching employees:', error)
      return
    }
    
    // Faqat real ma'lumotlarni ko'rsatamiz (demo yo'q)
    setEmployees(data || [])
  }

  const fetchDebts = async () => {
    if (!user) return
    const { data, error } = await supabase
      .from('debts')
      .select('*')
      .eq('user_id', user.id)
      .order('due_date', { ascending: true })
    
    if (error) {
      console.error('Error fetching debts:', error)
      return
    }
    setDebts(data || [])
  }

  // ── REAL-TIME DATA FETCHING ───────────────────────────────────────────────
  const fetchSales = async () => {
    if (!user) return
    // Fetch sales with employee and product details
    const { data, error } = await supabase
      .from('sales')
      .select(`
        *,
        employees (name),
        sale_items (
          *,
          products (name)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (error) {
      console.warn('Eslatma: Sotuvlar hozircha yuklanmadi.', error.message);
      return [];
    }
    
    setRecentSales(data || [])
  }

  const fetchAnalytics = async () => {
    if (!user) return
    
    // Get date range for the current period
    const now = new Date()
    let startDate: Date
    
    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    }

    // Fetch sales for the period
    const { data: salesData, error: salesError } = await supabase
      .from('sales')
      .select('*, sale_items(*)')
      .eq('user_id', user.id)
      .gte('sale_date', startDate.toISOString())
    
    if (salesError) {
      console.error('Error fetching analytics:', salesError)
      return
    }

    // Fetch products for stock value calculation
    const { data: productsData } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', user.id)

    // Calculate analytics
    let totalSales = 0
    let totalProfit = 0
    let transactionCount = salesData?.length || 0
    
    if (salesData) {
      for (const sale of salesData) {
        totalSales += sale.total_price || 0
        if (sale.sale_items && sale.sale_items.length > 0) {
          for (const item of sale.sale_items) {
            // Get product cost for profit calculation
            const product = productsData?.find(p => p.id === item.product_id)
            const cost = (product?.cost || product?.price * 0.7 || 0)
            totalProfit += (item.unit_price - cost) * item.quantity
          }
        }
      }
    }

    const totalStockValue = (productsData || []).reduce((sum, p) => {
      return sum + (p.price || 0) * (p.stock || 0)
    }, 0)

    const avgCheck = transactionCount > 0 ? totalSales / transactionCount : 0

    setAnalytics({
      totalSales,
      totalProfit,
      totalStockValue,
      transactionCount,
      avgCheck
    })
  }

  const fetchWeeklyChart = async () => {
    if (!user) return
    
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    
    // Fetch sales for the last 7 days grouped by day
    const { data, error } = await supabase
      .from('sales')
      .select('sale_date, total_price')
      .eq('user_id', user.id)
      .gte('sale_date', weekAgo.toISOString())
    
    if (error) {
      console.error('Error fetching weekly chart:', error)
      return
    }

    // Group by day of week
    const dayGroups: { [key: string]: number } = {
      'Dush': 0, 'Sesh': 0, 'Chor': 0, 'Pay': 0, 'Jum': 0, 'Shan': 0, 'Yak': 0
    }
    const dayKeys = ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan']
    
    if (data) {
      for (const sale of data) {
        const date = new Date(sale.sale_date)
        const dayIndex = date.getDay()
        const dayName = dayKeys[dayIndex]
        dayGroups[dayName] = (dayGroups[dayName] || 0) + (sale.total_price || 0)
      }
    }

    const chartData = dayKeys.map(day => ({
      day,
      v: dayGroups[day] || 0
    }))

    setWeeklyChart(chartData)
  }

  const fetchEmployeeKPIs = async () => {
    if (!user) return
    
    // Get today's date range
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    // Fetch all employees
    const { data: employeesData, error: empError } = await supabase
      .from('employees')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
    
    if (empError || !employeesData) {
      console.error('Error fetching employees for KPIs:', empError)
      return
    }

    // Fetch today's sales
    const { data: salesData } = await supabase
      .from('sales')
      .select('*, sale_items(*)')
      .eq('user_id', user.id)
      .gte('sale_date', todayStart.toISOString())

    // Fetch inventory logs for warehouse workers
    const { data: inventoryLogs } = await supabase
      .from('inventory_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', todayStart.toISOString())

    // Fetch all monthly sales for all employees at once (avoid await in map)
    const { data: allMonthSales } = await supabase
      .from('sales')
      .select('employee_id, total_price')
      .eq('user_id', user.id)
      .gte('sale_date', monthStart.toISOString())

    // Calculate KPIs for each employee
    const kpis = employeesData.map(emp => {
      const empSales = (salesData || []).filter(s => s.employee_id === emp.id)
      const todaySales = empSales.reduce((sum, s) => sum + (s.total_price || 0), 0)
      const transactionCount = empSales.length
      
      // Get monthly sales for this employee from pre-fetched data
      const empMonthSales = (allMonthSales || []).filter(s => s.employee_id === emp.id)
      const monthSalesTotal = empMonthSales.reduce((sum, s) => sum + (s.total_price || 0), 0)

      // Calculate performance based on role
      let performance = 0
      switch (emp.position) {
        case 'Sotuvchi':
          // Sales performance based on employee-specific daily goal
          const goal = emp.sales_goal || 5000000
          performance = goal > 0 ? Math.min(100, Math.round((todaySales / goal) * 100)) : 0
          break
        case 'Kassir':
          // Transaction count performance (target: 50 transactions per day)
          performance = Math.min(100, (transactionCount / 50) * 100)
          break
        case 'Omborchi':
          // Inventory operations performance
          const empLogs = (inventoryLogs || []).filter(l => l.product_id)
          performance = Math.min(100, (empLogs.length / 20) * 100)
          break
        default:
          performance = 0
      }

      return {
        ...emp,
        sales_today: todaySales,
        sales_month: monthSalesTotal,
        performance: Math.round(performance),
        transactions: transactionCount
      }
    })

    setEmployeeKPIs(kpis)
  }

  const guard = () => {
    if (!user) { setAuthPrompt(true); setTimeout(() => setAuthPrompt(false), 4000); return false }
    return true
  }

const logout = async () => { 
  await supabase.auth.signOut(); 
  // '/auth/login' o'rniga shunchaki bosh sahifaga qaytaring
  window.location.href = '/'; 
}
  // ── Mahsulot CRUD ──────────────────────────────────────────────────────────
  const openAddProduct = () => {
    if (!guard()) return
    setProdForm({ name: '', sku: '', price: '', cost: '', stock: '', min_stock_level: '', category: 'Ichimliklar' })
    setEditItem(null)
    setModal('product')
  }

  const openEditProduct = (p: any) => {
    if (!guard()) return
    setProdForm({ name: p.name, sku: p.sku || '', price: String(p.price), cost: String(p.cost || ''), stock: String(p.stock), min_stock_level: String(p.min_stock_level || ''), category: p.category || 'Ichimliklar' })
    setEditItem(p)
    setModal('product')
  }

  const saveProduct = async () => {
    if (!prodForm.name || !prodForm.price || !prodForm.stock) return showToast('Majburiy maydonlarni to\'ldiring!', 'err')
    setSaving(true)
    const payload = {
      name: prodForm.name, sku: prodForm.sku,
      price: Number(prodForm.price), cost: Number(prodForm.cost) || 0,
      stock: Number(prodForm.stock), min_stock_level: Number(prodForm.min_stock_level) || 10,
      category: prodForm.category, user_id: user.id,
    }
    const { error } = editItem
      ? await supabase.from('products').update(payload).eq('id', editItem.id)
      : await supabase.from('products').insert([payload])
    setSaving(false)
    if (error) return showToast('Xatolik: ' + error.message, 'err')
    showToast(editItem ? 'Mahsulot yangilandi!' : 'Mahsulot qo\'shildi!')
    setModal(null); fetchProducts()
  }

  const deleteProduct = async (id: any) => {
    if (!guard()) return
    if (!confirm('O\'chirilsinmi?')) return
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (!error) { showToast('O\'chirildi!'); fetchProducts() }
    else showToast('Xatolik!', 'err')
  }

  const toggleProductActive = async (p: any) => {
    if (!guard()) return
    await supabase.from('products').update({ active: !p.active }).eq('id', p.id)
    fetchProducts()
  }

  // ── Xodim CRUD ─────────────────────────────────────────────────────────────
  const openAddEmployee = () => {
    if (!guard()) return
    setEmpForm({ name: '', position: 'Sotuvchi', phone: '', email: '', salary: '', sales_goal: '' })
    setEditItem(null)
    setModal('employee')
  }

  const openEditEmployee = (e: any) => {
    if (!guard()) return
    setEmpForm({ name: e.name, position: e.position, phone: e.phone || '', email: e.email || '', salary: String(e.salary || ''), sales_goal: String(e.sales_goal || '') })
    setEditItem(e)
    setModal('employee')
  }

  const saveEmployee = async () => {
    if (!empForm.name || !empForm.position) return showToast('Ism va lavozimni kiriting!', 'err')
    setSaving(true)
    const payload = { name: empForm.name, position: empForm.position, phone: empForm.phone, email: empForm.email, salary: Number(empForm.salary) || 0, sales_goal: Number(empForm.sales_goal) || 0, user_id: user.id, is_active: true }
    const { error } = editItem
      ? await supabase.from('employees').update(payload).eq('id', editItem.id)
      : await supabase.from('employees').insert([payload])
    setSaving(false)
    if (error) return showToast('Xatolik: ' + error.message, 'err')
    showToast(editItem ? 'Xodim yangilandi!' : 'Xodim qo\'shildi!')
    setModal(null); fetchEmployees()
  }

  const deleteEmployee = async (id: any) => {
    if (!guard()) return
    if (!confirm('O\'chirilsinmi?')) return
    await supabase.from('employees').delete().eq('id', id)
    showToast('O\'chirildi!'); fetchEmployees()
  }

  const toggleEmployeeActive = async (e: any) => {
    if (!guard()) return
    await supabase.from('employees').update({ is_active: !e.is_active }).eq('id', e.id)
    fetchEmployees()
  }

  // ── Qarz CRUD ──────────────────────────────────────────────────────────────
  const openAddDebt = () => {
    if (!guard()) return
    setDebtForm({ customer: '', amount: '', due_date: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10), note: '' })
    setEditDebtItem(null)
    setModal('debt')
  }

  const openEditDebt = (d: any) => {
    if (!guard()) return
    setDebtForm({ 
      customer: d.customer, 
      amount: String(d.amount), 
      due_date: d.due_date ? d.due_date.split('T')[0] : '', 
      note: d.note || '' 
    })
    setEditDebtItem(d)
    setModal('debt')
  }

  const saveDebt = async () => {
    if (!debtForm.customer || !debtForm.amount) return showToast('Xaridor va summani kiriting!', 'err')
    setSaving(true)
    const amt = Number(debtForm.amount)

    if (!user) {
      // Demo rejimda lokal update
      if (editDebtItem) {
        setDebts(prev => prev.map(d => d.id === editDebtItem.id ? {
          ...d,
          customer: debtForm.customer,
          amount: amt,
          due_date: debtForm.due_date,
          note: debtForm.note
        } : d))
      } else {
        const maxId = debts.length ? Math.max(...debts.map((d: any) => d.id)) : 0
        const newDebt = {
          id: maxId + 1,
          customer: debtForm.customer,
          amount: amt,
          paid: 0,
          remaining: amt,
          due_date: debtForm.due_date,
          note: debtForm.note,
          status: 'active'
        }
        setDebts(prev => [...prev, newDebt])
      }
      setSaving(false)
      showToast(editDebtItem ? 'Qarz yangilandi!' : 'Qarz qo\'shildi!')
      setModal(null)
      return
    }

    const payload = {
      customer: debtForm.customer,
      amount: amt,
      paid: editDebtItem ? (editDebtItem.paid || 0) : 0,
      remaining: amt - (editDebtItem ? (editDebtItem.paid || 0) : 0),
      due_date: debtForm.due_date,
      note: debtForm.note,
      user_id: user.id,
      status: 'active'
    }
    const { error } = editDebtItem
      ? await supabase.from('debts').update(payload).eq('id', editDebtItem.id)
      : await supabase.from('debts').insert([payload])
    setSaving(false)
    if (error) return showToast('Xatolik: ' + error.message, 'err')
    showToast(editDebtItem ? 'Qarz yangilandi!' : 'Qarz qo\'shildi!')
    setModal(null)
    fetchDebts()
  }

  const deleteDebt = async (id: any) => {
    if (!confirm('Qarz o\'chirilsinmi?')) return
    if (!user) {
      setDebts(prev => prev.filter(d => d.id !== id))
      showToast('O\'chirildi!')
      return
    }
    if (!guard()) return
    const { error } = await supabase.from('debts').delete().eq('id', id)
    if (!error) { showToast('O\'chirildi!'); fetchDebts() }
    else showToast('Xatolik!', 'err')
  }

  const handlePayDebt = async (id: number) => {
    const debt = debts.find((d: any) => d.id === id)
    if (!debt) return
    const rem = debt.remaining !== undefined ? debt.remaining : (debt.amount - (debt.paid || 0))
    const payStr = prompt(`Qoldiq: ${fmt(rem)} so'm\nTo'lanadigan miqdor (so'm):`, String(Math.min(500000, rem)))
    if (!payStr || payStr.trim() === '') return
    const payAmt = Number(payStr)
    if (isNaN(payAmt) || payAmt <= 0 || payAmt > rem) {
      return showToast(payAmt > rem ? 'Qoldiqdan ortiq to\'lov!' : 'Noto\'g\'ri summa!', 'err')
    }

    if (!user) {
      // Demo lokal update
      setDebts(prev => prev.map((d: any) => d.id === id ? {
        ...d,
        paid: (d.paid || 0) + payAmt,
        remaining: (d.amount - ((d.paid || 0) + payAmt)),
        status: (d.amount - ((d.paid || 0) + payAmt)) <= 0 ? 'paid' : 'active'
      } : d))
      showToast(`${fmt(payAmt)} so'm to'landi!`)
      return
    }

    if (!guard()) return
    setSaving(true)
    const newPaid = (debt.paid || 0) + payAmt
    const newRem = debt.amount - newPaid
    const { error } = await supabase.from('debts').update({
      paid: newPaid,
      remaining: newRem,
      status: newRem <= 0 ? 'paid' : 'active'
    }).eq('id', id)
    setSaving(false)
    if (!error) {
      showToast(`${fmt(payAmt)} so'm to'landi!`)
      fetchDebts()
    } else showToast('Xatolik!', 'err')
  }

  // ── Sotuv ──────────────────────────────────────────────────────────────────
  const openSale = () => {
    if (!guard()) return
    // Set default employee if available
    const defaultEmployee = employees.find(e => e.is_active !== false)
    setSaleForm({ 
      product_id: products[0]?.id || '', 
      employee_id: defaultEmployee?.id || '', 
      qty: '1', 
      payment: 'Naqd' 
    })
    setModal('sale')
  }

  const saveSale = async () => {
    if (!saleForm.product_id || !saleForm.employee_id) return showToast('Mahsulot va xodimni tanlang!', 'err')
    if (!saleForm.qty) return showToast('Miqdorni kiriting!', 'err')
    const prod = products.find(p => String(p.id) === String(saleForm.product_id))
    if (!prod) return showToast('Mahsulot topilmadi!', 'err')
    const qty  = Number(saleForm.qty)
    if (qty > prod.stock) return showToast(`Zaxirada faqat ${prod.stock} dona bor!`, 'err')
    if (!user?.id) return showToast('Foydalanuvchi aniqlanmadi!', 'err')
    
    setSaving(true)
    
    try {
      console.log('Saving sale with user_id:', user.id)
      console.log('Employee ID:', saleForm.employee_id)
      console.log('Product ID:', saleForm.product_id)
      
      // Step 1: Insert into sales table
      const { data: saleData, error: saleError } = await supabase.from('sales').insert([{
        employee_id: saleForm.employee_id,
        total_price: prod.price * qty,
        payment_method: saleForm.payment,
        user_id: user.id,
        sale_date: new Date().toISOString(),
      }]).select().single()
      
      if (saleError) {
        console.error('To\'liq xatolik ob\'ekti:', saleError);
        
        const errorMessage = saleError.hint?.includes('employee_id') || saleError.message?.includes('employee_id')
          ? "Ma'lumotlar bazasida 'employee_id' ustuni topilmadi. SQL Editor-da ustunni yarating."
          : (saleError.message || "Sotuvni saqlashda xatolik yuz berdi");
          
        throw new Error(errorMessage);
      }      
      console.log('Sale created:', saleData)
      
      // Step 2: Insert into sale_items table (this will trigger stock reduction via DB trigger)
      const { error: itemError } = await supabase.from('sale_items').insert([{
        sale_id: saleData.id,
        product_id: saleForm.product_id,
        quantity: qty,
        unit_price: prod.price,
      }])
      
      if (itemError) {
        console.error('Sale item insert error:', itemError)
        // Rollback: delete the sale if item fails
        await supabase.from('sales').delete().eq('id', saleData.id)
        throw new Error(itemError.message || itemError.details || JSON.stringify(itemError))
      }
      
      showToast(`Sotuv amalga oshirildi! +${fmt(prod.price * qty)} so'm`)
      setModal(null)
      
      // Refresh all data
      await Promise.all([
        fetchProducts(),
        fetchSales(),
        fetchAnalytics(),
        fetchWeeklyChart(),
        fetchEmployeeKPIs(),
        fetchDebts()
      ])
    } catch (error: any) {
      console.error('Sale error:', error)
      const errorMsg = error.message || error.error_description || JSON.stringify(error) || 'Noma\'lum xatolik'
      showToast('Xatolik: ' + errorMsg, 'err')
    }
    
    setSaving(false)
  }

  // ── Maqsad ─────────────────────────────────────────────────────────────────
  const openGoals = () => {
    if (!guard()) return
    setGoalForm({ daily: String(goals.daily), weekly: String(goals.weekly), monthly: String(goals.monthly) })
    setModal('goals')
  }

  const saveGoals = async () => {
    const newGoals = { daily: Number(goalForm.daily) || 0, weekly: Number(goalForm.weekly) || 0, monthly: Number(goalForm.monthly) || 0 }
    setGoals(newGoals)
    if (user) {
      await supabase.from('profiles').update({ goals: newGoals }).eq('id', user.id)
    }
    showToast('Maqsadlar saqlandi!')
    setModal(null)
  }

  // ── Sozlamalar ─────────────────────────────────────────────────────────────
  const openSettings = () => { if (!guard()) return; setModal('settings') }

  const saveSettings = async () => {
    if (!user) return
    setSaving(true)
    const { error } = await supabase.from('profiles').update({
      shop_name: settingsForm.shop_name, phone: settingsForm.phone,
    }).eq('id', user.id)
    setSaving(false)
    if (!error) { showToast('Sozlamalar saqlandi!'); fetchProfile(user.id) }
    else showToast('Xatolik!', 'err')
  }

  // ── Hisoblashlar ───────────────────────────────────────────────────────────
  const soldKey = period === 'today' ? 'sold_today' : period === 'week' ? 'sold_week' : 'sold_month'
  const filteredProds = products.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase())
  )

  const sales      = products.reduce((a, p) => a + (p[soldKey] || 0) * (p.price || 0), 0)
  const cost       = products.reduce((a, p) => a + (p[soldKey] || 0) * (p.cost || p.price * 0.7 || 0), 0)
  const profit     = sales - cost
  const margin     = sales > 0 ? ((profit / sales) * 100).toFixed(1) : '0'
  const txCount    = products.reduce((a, p) => a + (p[soldKey] || 0), 0)
  const avgCheck   = txCount > 0 ? Math.round(sales / txCount) : 0
  const totalValue = products.reduce((a, p) => a + (p.price || 0) * (p.stock || 0), 0)
  const lowStock   = products.filter(p => (p.stock || 0) <= (p.min_stock_level || 10))
  const goalTarget = period === 'today' ? goals.daily : period === 'week' ? goals.weekly : goals.monthly

  // REAL vs DEMO uchun samarali ko'rsatkichlar (1-talabni hal qilish)
  const effectiveSales = user ? (analytics.totalSales || 0) : sales
  const effectiveProfit = user ? (analytics.totalProfit || 0) : profit
  const effectiveTxCount = user ? (analytics.transactionCount || 0) : txCount
  const effectiveAvgCheck = user ? Math.round(analytics.avgCheck || 0) : avgCheck
  const effectiveCost = user ? (effectiveSales - effectiveProfit) : cost
  const effectiveMargin = effectiveSales > 0 ? ((effectiveProfit / effectiveSales) * 100).toFixed(1) : '0'
  const effectiveGoalPct = goalTarget > 0 ? Math.min(100, Math.round((effectiveSales / goalTarget) * 100)) : 0

  if (!mounted) return null

  // ─── JSX ──────────────────────────────────────────────────────────────────
  const mainContent = (
    <div className="min-h-screen bg-slate-900 text-white">

      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      {toast && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-bold border transition-all ${toast.type === 'ok' ? 'bg-emerald-900/90 border-emerald-500/50 text-emerald-300' : 'bg-red-900/90 border-red-500/50 text-red-300'}`}>
          {toast.type === 'ok' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* ── Auth Prompt ─────────────────────────────────────────────────────── */}
      {authPrompt && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-blue-700 to-purple-700 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-blue-400/50">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-bold text-sm">Kirish talab qilinadi!</p>
            <p className="text-xs opacity-80">Bu funksiya faqat ro'yxatdan o'tganlar uchun</p>
          </div>
          <Link href="/auth/login" className="ml-3 px-4 py-1.5 bg-white text-blue-700 rounded-lg font-bold text-sm hover:bg-blue-50 transition-all">Kirish</Link>
        </div>
      )}

      {/* ── NAV ─────────────────────────────────────────────────────────────── */}
      <nav className="bg-slate-950 border-b border-slate-800 px-4 py-3 sticky top-0 z-40">
        <div className="max-w-[1920px] mx-auto flex flex-wrap items-center justify-between gap-2">

          {/* Logo */}
          <div>
            <h1 className="text-xl font-black bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              {user && profile?.shop_name ? profile.shop_name : 'Aqlli-Dokon'}
            </h1>
            <p className="text-slate-500 text-xs">{user ? `@${profile?.username || ''}` : 'Demo rejim'}</p>
          </div>

          {/* Period tanlov */}
          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl">
            {PERIODS.map(p => (
              <button key={p.key} onClick={() => setPeriod(p.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${period === p.key ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                {p.label}
              </button>
            ))}
          </div>

          {/* View tugmalari */}
          <div className="flex items-center gap-1">
            {[
              { k: 'bugun',      icon: <Home     className="w-4 h-4" />, l: 'Bosh'      },
              { k: 'ombor',      icon: <Package  className="w-4 h-4" />, l: 'Ombor'     },
              { k: 'xodimlar',   icon: <Users    className="w-4 h-4" />, l: 'Xodimlar'  },
              { k: 'hisobotlar', icon: <FileText className="w-4 h-4" />, l: 'Hisobot'   },
              { k: 'qarzlar',    icon: <CreditCard className="w-4 h-4" />, l: 'Qarzlar' },
            ].map(it => (
              <button key={it.k} onClick={() => setView(it.k)}
                className={`px-3 py-2 rounded-xl text-sm transition-all flex items-center gap-1.5 ${view === it.k ? 'bg-slate-700 text-white font-semibold' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                {it.icon}{it.l}
              </button>
            ))}
          </div>

          {/* O'ng tomondagi tugmalar */}
          <div className="flex items-center gap-2">
            <button onClick={openGoals} title="Maqsadlar" className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all" ><Target className="w-4 h-4 text-amber-400" /></button>
            <button onClick={openSettings} title="Sozlamalar" className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all"><Settings className="w-4 h-4 text-slate-300" /></button>

            <button onClick={openSale} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold flex items-center gap-1.5 text-sm transition-all">
              <ShoppingCart className="w-4 h-4" />Sotuv
            </button>
            <button onClick={openAddProduct} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold flex items-center gap-1.5 text-sm transition-all">
              <Plus className="w-4 h-4" />Mahsulot
            </button>

            {user ? (
              <button onClick={logout} className="p-2 bg-slate-800 hover:bg-red-900/40 rounded-xl transition-all" title="Chiqish"><LogOut className="w-4 h-4 text-red-400" /></button>
            ) : (
              <Link href="/auth/login" className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-bold text-sm transition-all hover:opacity-90">Kirish</Link>
            )}
          </div>
        </div>
      </nav>

      {/* Demo banner */}
      {!user && (
        <div className="bg-amber-900/30 border-b border-amber-700/40 px-4 py-2.5">
          <div className="max-w-[1920px] mx-auto flex items-center justify-between gap-3">
            <p className="text-amber-200 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span><strong>Demo rejim</strong> — barcha ma'lumotlar namunaviy. Haqiqiy ma'lumotlar uchun</span>
              <Link href="/auth/signup" className="underline font-bold text-amber-400">ro'yxatdan o'ting</Link>
            </p>
            <Link href="/auth/signup" className="px-3 py-1 bg-amber-500 text-slate-900 rounded-lg text-xs font-bold whitespace-nowrap hover:bg-amber-400 transition-all">Boshlash →</Link>
          </div>
        </div>
      )}

      {/* ── MAIN ────────────────────────────────────────────────────────────── */}
      <main className="max-w-[1920px] mx-auto p-4 space-y-4">

        {/* ═══════════════ BUGUN / DASHBOARD VIEW ═══════════════ */}
        {view === 'bugun' && (
          <>
            {/* Maqsad progress banner */}
            {goalTarget > 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-amber-400" />
                    <span className="text-white font-bold">{PERIODS.find(p => p.key === period)?.label} Maqsad</span>
                    <span className="text-amber-400 font-black">{effectiveGoalPct}%</span>
                  </div>
                  <div className="text-right">
                    <span className="text-emerald-400 font-bold text-sm">{fmt(effectiveSales)}</span>
                    <span className="text-slate-500 text-sm"> / {fmt(goalTarget)} so'm</span>
                  </div>
                </div>
                <div className="bg-slate-700 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-3 rounded-full transition-all duration-700 ${effectiveGoalPct >= 100 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : effectiveGoalPct >= 70 ? 'bg-gradient-to-r from-blue-500 to-cyan-400' : effectiveGoalPct >= 40 ? 'bg-gradient-to-r from-amber-500 to-yellow-400' : 'bg-gradient-to-r from-red-500 to-orange-400'}`}
                    style={{ width: `${effectiveGoalPct}%` }}
                  />
                </div>
                {effectiveGoalPct >= 100 && <p className="text-emerald-400 text-xs mt-1 font-bold">🎉 Maqsad bajarildi!</p>}
              </div>
            )}

            {/* KPI kartalar — 5 ustun */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
              {[
                { label: 'Savdo', val: `${fmt(effectiveSales)} so'm`,    icon: <DollarSign className="w-5 h-5 text-emerald-400" />, bg: 'bg-emerald-500/15', sub: period === 'today' ? `${fmt(effectiveTxCount)} ta tranzaksiya` : period === 'week' ? `7 kunlik ko'rsatkich` : `30 kunlik ko'rsatkich`, subColor: 'text-emerald-400' },
                { label: 'Foyda', val: `${fmt(effectiveProfit)} so'm`,   icon: <TrendingUp className="w-5 h-5 text-blue-400" />,    bg: 'bg-blue-500/15',    sub: `Marja: ${effectiveMargin}%`, subColor: 'text-blue-400' },
                { label: 'Tranzaksiya', val: `${fmt(effectiveTxCount)} ta`, icon: <ShoppingCart className="w-5 h-5 text-purple-400" />, bg: 'bg-purple-500/15', sub: `O'rtacha: ${fmt(effectiveAvgCheck)} so'm`, subColor: 'text-purple-400' },
                { label: 'Ombor qiymati', val: `${fmt(totalValue)} so'm`, icon: <Package className="w-5 h-5 text-indigo-400" />, bg: 'bg-indigo-500/15', sub: `${products.length} xil mahsulot`, subColor: 'text-indigo-400' },
                { label: 'Kam zaxira', val: `${lowStock.length} ta`, icon: <AlertCircle className="w-5 h-5 text-orange-400" />, bg: 'bg-orange-500/15', sub: 'Diqqat talab qiladi', subColor: 'text-orange-400' },
              ].map((kpi, i) => (
                <div key={i} className="bg-slate-800 border border-slate-700 hover:border-slate-500 rounded-2xl p-4 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2 ${kpi.bg} rounded-xl`}>{kpi.icon}</div>
                    {!user && <span className="text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold">DEMO</span>}
                  </div>
                  <p className="text-slate-400 text-xs mb-1">{kpi.label}</p>
                  <p className="text-white font-black text-lg leading-tight mb-1">{kpi.val}</p>
                  <p className={`text-xs ${kpi.subColor}`}>{kpi.sub}</p>
                </div>
              ))}
            </div>

            {/* 2-qator: grafik + kategoriyalar */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

              {/* 7 kunlik grafik */}
              <div className="xl:col-span-2 bg-slate-800 border border-slate-700 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-white flex items-center gap-2"><BarChart3 className="w-5 h-5 text-blue-400" />Haftalik Savdo</h3>
                  {!user && <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded font-bold">DEMO</span>}
                </div>
                <div className="h-48 flex items-end gap-2">
                  {WEEK_CHART.map(item => {
                    const h = Math.round((item.v / Math.max(...WEEK_CHART.map(c => c.v), 1)) * 100)
                    return (
                      <div key={item.day} className="flex-1 flex flex-col items-center gap-1.5">
                        <div className="w-full relative group flex items-end" style={{ height: '160px' }}>
                          <div className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg hover:from-blue-400 hover:to-cyan-400 transition-all cursor-pointer" style={{ height: `${h}%` }} />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 opacity-0 group-hover:opacity-100 bg-slate-950 border border-slate-700 px-2 py-1 rounded-lg text-xs whitespace-nowrap z-10 pointer-events-none">
                            <p className="text-white font-bold">{fmt(item.v)} so'm</p>
                          </div>
                        </div>
                        <span className="text-xs text-slate-500">{item.day}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Top mahsulotlar */}
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-white flex items-center gap-2"><Star className="w-5 h-5 text-amber-400" />Top Mahsulotlar</h3>
                  {!user && <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded font-bold">DEMO</span>}
                </div>
                <div className="space-y-2">
                  {[...products].sort((a, b) => (b[soldKey] || 0) - (a[soldKey] || 0)).slice(0, 6).map((p, i) => (
                    <div key={p.id} className="flex items-center gap-3 p-2 hover:bg-slate-700/50 rounded-xl transition-all">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 ${i === 0 ? 'bg-amber-500 text-slate-900' : i === 1 ? 'bg-slate-400 text-slate-900' : i === 2 ? 'bg-amber-700 text-white' : 'bg-slate-700 text-slate-400'}`}>{i+1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold truncate">{p.name}</p>
                        <p className="text-emerald-400 text-xs">{fmt((p[soldKey] || 0) * p.price)} so'm</p>
                      </div>
                      <span className="text-slate-400 text-xs flex-shrink-0">{p[soldKey] || 0} ta</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 3-qator: sotuv tarixi + kam zaxira */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

              {/* Sotuv tarixi */}
              <div className="xl:col-span-2 bg-slate-800 border border-slate-700 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-white flex items-center gap-2"><Clock className="w-5 h-5 text-blue-400" />So'nggi Sotuvlar</h3>
                  <div className="flex items-center gap-2">
                    {!user && <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded font-bold">DEMO</span>}
                    <span className="text-xs text-slate-400">Jami: {DEMO_SALES.length} ta</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[500px] text-sm">
                    <thead><tr className="border-b border-slate-700">
                      {['Vaqt', 'Xaridor', 'Mahsulotlar', 'Narx', "To'lov", 'Sotuvchi'].map(h => (
                        <th key={h} className="pb-2 text-left text-xs text-slate-400 font-semibold px-2">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody className="divide-y divide-slate-800">
                      {DEMO_SALES.map(s => (
                        <tr key={s.id} className="hover:bg-slate-700/30 transition-all">
                          <td className="py-2 px-2 font-mono text-slate-400 text-xs">{s.time}</td>
                          <td className="py-2 px-2 text-slate-300">{s.customer}</td>
                          <td className="py-2 px-2 text-slate-400 text-xs">{s.items} dona</td>
                          <td className="py-2 px-2 text-emerald-400 font-bold">{fmt(s.total)} so'm</td>
                          <td className="py-2 px-2">
                            <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${s.payment === 'Naqd' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>{s.payment}</span>
                          </td>
                          <td className="py-2 px-2 text-slate-400">{s.seller}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t border-slate-700">
                      <tr className="bg-slate-900/50">
                        <td colSpan={2} className="py-3 px-2 text-slate-300 font-bold">Jami:</td>
                        <td className="py-3 px-2 text-slate-300 font-bold">{DEMO_SALES.reduce((a, s) => a + s.items, 0)} dona</td>
                        <td className="py-3 px-2 text-emerald-400 font-black">{fmt(DEMO_SALES.reduce((a, s) => a + s.total, 0))} so'm</td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Kam zaxira ogohlantirish */}
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
                <h3 className="font-bold text-white flex items-center gap-2 mb-4">
                  <AlertCircle className="w-5 h-5 text-red-400" />Kam Zaxira
                  {lowStock.length > 0 && <span className="ml-auto bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded-full font-bold">{lowStock.length}</span>}
                </h3>
                {lowStock.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">Barcha mahsulotlar yetarli!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {lowStock.slice(0, 6).map(p => (
                      <div key={p.id} className="flex items-center justify-between p-2 bg-red-500/10 border border-red-500/20 rounded-xl">
                        <div>
                          <p className="text-white text-sm font-semibold">{p.name}</p>
                          <p className="text-red-400 text-xs">Min: {p.min_stock_level} dona</p>
                        </div>
                        <div className="text-right">
                          <p className="text-red-400 font-black">{p.stock}</p>
                          <p className="text-slate-500 text-xs">qoldi</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Oylik statistika qatorlari */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { label: 'Daromad', val: fmt(effectiveSales), sub: 'so\'m', icon: <DollarSign className="w-5 h-5 text-emerald-400" />, color: 'text-emerald-400' },
                { label: 'Foyda',   val: fmt(effectiveProfit), sub: 'so\'m', icon: <Award className="w-5 h-5 text-blue-400" />,    color: 'text-blue-400'    },
                { label: 'Xarajat', val: fmt(effectiveCost),   sub: 'so\'m', icon: <TrendingDown className="w-5 h-5 text-red-400" />, color: 'text-red-400'  },
              ].map((item, i) => (
                <div key={i} className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-2">{item.icon}<p className="text-slate-400 text-sm">{item.label}</p></div>
                  <p className={`text-3xl font-black ${item.color}`}>{item.val} <span className="text-lg text-slate-500">{item.sub}</span></p>
                  {!user && <span className="text-xs text-amber-500/70">Demo ma'lumot</span>}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ═══════════════ OMBOR VIEW ═══════════════ */}
        {view === 'ombor' && (
          <>
            <div className="flex gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
                <input type="text" placeholder="Qidirish..." className={`${inp} pl-9`} value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <button onClick={openAddProduct} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold flex items-center gap-2 text-sm transition-all">
                <Plus className="w-4 h-4" />Yangi Mahsulot
              </button>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead className="bg-slate-900 border-b border-slate-700">
                    <tr>{['Mahsulot', 'SKU', 'Kategoriya', 'Narxi', 'Tannarx', 'Zaxira', 'Bugun', 'Oy', 'Holat', 'Amallar'].map(h =>
                      <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">{h}</th>
                    )}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {loading ? (
                      <tr><td colSpan={10} className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin text-blue-400 mx-auto" /></td></tr>
                    ) : filteredProds.length === 0 ? (
                      <tr><td colSpan={10} className="py-12 text-center text-slate-500">Mahsulot topilmadi</td></tr>
                    ) : filteredProds.map(p => (
                      <tr key={p.id} className="hover:bg-slate-700/40 transition-all">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0">{p.name?.charAt(0)}</div>
                            <div>
                              <p className="font-semibold text-white">{p.name}</p>
                              {!user && <span className="text-xs text-amber-400">Demo</span>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3"><span className="font-mono text-xs bg-slate-900 px-2 py-1 rounded-lg text-slate-300">{p.sku || '-'}</span></td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{p.category || '-'}</td>
                        <td className="px-4 py-3 text-emerald-400 font-bold">{fmt(p.price)}</td>
                        <td className="px-4 py-3 text-slate-400">{fmt(p.cost || Math.round(p.price * 0.7))}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-lg text-xs font-bold ${(p.stock || 0) <= (p.min_stock_level || 10) ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/50' : 'bg-blue-500/20 text-blue-400'}`}>{p.stock}</span>
                        </td>
                        <td className="px-4 py-3 text-cyan-400 font-semibold">{p.sold_today || 0}</td>
                        <td className="px-4 py-3 text-purple-400 font-semibold">{p.sold_month || 0}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => toggleProductActive(p)} className="transition-all">
                            {p.active !== false
                              ? <ToggleRight className="w-6 h-6 text-emerald-400" />
                              : <ToggleLeft  className="w-6 h-6 text-slate-600"   />}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => openEditProduct(p)} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"><Edit className="w-3.5 h-3.5" /></button>
                            <button onClick={() => deleteProduct(p.id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ═══════════════ XODIMLAR VIEW ═══════════════ */}
        {view === 'xodimlar' && (
          <>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-xl font-bold text-white flex items-center gap-2"><Users className="w-5 h-5 text-blue-400" />Xodimlar ({employees.length})</h2>
              <button onClick={openAddEmployee} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold flex items-center gap-2 text-sm transition-all">
                <UserPlus className="w-4 h-4" />Xodim qo'shish
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {employees.length === 0 ? (
                <div className="col-span-3 text-center py-16 bg-slate-800 rounded-2xl border border-slate-700">
                  <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">Xodimlar yo'q. Birinchi xodimni qo'shing!</p>
                  <button onClick={openAddEmployee} className="mt-4 px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-sm transition-all">Xodim qo'shish</button>
                </div>
              ) : employees.map(emp => (
                <div key={emp.id} className={`bg-slate-800 border rounded-2xl p-5 transition-all ${emp.is_active !== false ? 'border-slate-700 hover:border-blue-500/50' : 'border-slate-700/50 opacity-60'}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 bg-gradient-to-br ${emp.avatar_color || 'from-blue-500 to-purple-600'} rounded-xl flex items-center justify-center font-black text-lg flex-shrink-0`}>
                        {emp.name?.split(' ').slice(0, 2).map((n: string) => n[0]).join('') || '?'}
                      </div>
                      <div>
                        <h3 className="text-white font-bold">{emp.name}</h3>
                        <p className="text-slate-400 text-sm">{emp.position}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => toggleEmployeeActive(emp)} title={emp.is_active !== false ? 'O\'chirish' : 'Yoqish'}>
                        {emp.is_active !== false
                          ? <ToggleRight className="w-6 h-6 text-emerald-400" />
                          : <ToggleLeft  className="w-6 h-6 text-slate-600"   />}
                      </button>
                      <button onClick={() => openEditEmployee(emp)} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => deleteEmployee(emp.id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-sm mb-4">
                    {emp.phone && <div className="flex items-center gap-2 text-slate-300"><Phone className="w-3.5 h-3.5 text-slate-500" />{emp.phone}</div>}
                    {emp.email && <div className="flex items-center gap-2 text-slate-300"><Mail  className="w-3.5 h-3.5 text-slate-500" />{emp.email}</div>}
                    {emp.salary > 0 && <div className="flex items-center gap-2 text-slate-300"><DollarSign className="w-3.5 h-3.5 text-slate-500" />Maosh: <span className="font-bold text-white">{fmt(emp.salary)} so'm</span></div>}
                  </div>

                  {(emp.sales_today > 0 || emp.performance > 0) && (
                    <div className="border-t border-slate-700 pt-3 space-y-2">
                      {emp.sales_today > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Bugungi savdo</span>
                          <span className="text-emerald-400 font-bold">{fmt(emp.sales_today)} so'm</span>
                        </div>
                      )}
                      {emp.sales_month > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Oylik savdo</span>
                          <span className="text-blue-400 font-bold">{fmt(emp.sales_month)} so'm</span>
                        </div>
                      )}
                      {emp.sales_goal > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Kunlik maqsad</span>
                          <span className="text-amber-400 font-bold">{fmt(emp.sales_goal)} so'm</span>
                        </div>
                      )}
                      {emp.performance > 0 && (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Performance</span>
                            <span className="text-purple-400 font-bold">{emp.performance}%</span>
                          </div>
                          <div className="bg-slate-700 rounded-full h-1.5">
                            <div className="bg-gradient-to-r from-purple-500 to-blue-500 h-1.5 rounded-full" style={{ width: `${emp.performance}%` }} />
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  <div className="mt-3 pt-3 border-t border-slate-700/50 flex items-center justify-between">
                    <span className="text-slate-500 text-xs flex items-center gap-1"><Clock className="w-3 h-3" />{emp.hours_today || 8}s</span>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${emp.is_active !== false ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                      <span className={`text-xs font-semibold ${emp.is_active !== false ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {emp.is_active !== false ? 'Aktiv' : 'Nofaol'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ═══════════════ HISOBOTLAR VIEW ═══════════════ */}
        {view === 'hisobotlar' && (
          <>
            <h2 className="text-xl font-bold text-white flex items-center gap-2"><FileText className="w-5 h-5 text-blue-400" />Hisobotlar</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {[
                { label: 'Jami Savdo',   val: fmt(effectiveSales),         sub: 'so\'m',     color: 'text-emerald-400', icon: <DollarSign className="w-6 h-6" /> },
                { label: 'Jami Foyda',   val: fmt(effectiveProfit),        sub: 'so\'m',     color: 'text-blue-400',    icon: <Award className="w-6 h-6" /> },
                { label: 'Foyda Marja',  val: effectiveMargin,             sub: '%',         color: 'text-purple-400',  icon: <Percent className="w-6 h-6" /> },
                { label: 'Savdo soni',   val: fmt(effectiveTxCount),       sub: 'ta',        color: 'text-cyan-400',    icon: <ShoppingCart className="w-6 h-6" /> },
                { label: 'O\'rtacha chek', val: fmt(effectiveAvgCheck),    sub: 'so\'m',     color: 'text-amber-400',   icon: <CreditCard className="w-6 h-6" /> },
                { label: 'Ombor qiymati', val: fmt(totalValue),   sub: 'so\'m',     color: 'text-indigo-400',  icon: <Package className="w-6 h-6" /> },
                { label: 'Mahsulotlar',  val: String(products.length), sub: 'tur',  color: 'text-teal-400',    icon: <Hash className="w-6 h-6" /> },
                { label: 'Xodimlar',     val: String(employees.filter(e => e.is_active !== false).length), sub: 'aktiv', color: 'text-rose-400', icon: <Users className="w-6 h-6" /> },
              ].map((item, i) => (
                <div key={i} className="bg-slate-800 border border-slate-700 rounded-2xl p-5 hover:border-slate-600 transition-all">
                  <div className="flex items-center gap-3 mb-3 text-slate-500">{item.icon}<span className="text-sm">{item.label}</span></div>
                  <p className={`text-3xl font-black ${item.color}`}>{item.val} <span className="text-slate-500 text-base font-normal">{item.sub}</span></p>
                </div>
              ))}
            </div>

            {/* Davr bo'yicha taqqoslash */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2"><LineChart className="w-5 h-5 text-purple-400" />Davr Taqqoslashi</h3>
              <div className="grid grid-cols-3 gap-4">
                {PERIODS.map(p => {
                  const k = p.key === 'today' ? 'sold_today' : p.key === 'week' ? 'sold_week' : 'sold_month'
                  const s = products.reduce((a, pr) => a + (pr[k] || 0) * (pr.price || 0), 0)
                  const prof = products.reduce((a, pr) => a + (pr[k] || 0) * ((pr.price || 0) - (pr.cost || pr.price * 0.7 || 0)), 0)
                  return (
                    <div key={p.key} className={`p-4 rounded-xl border transition-all cursor-pointer ${period === p.key ? 'bg-blue-600/20 border-blue-500/50' : 'bg-slate-900/50 border-slate-700 hover:border-slate-600'}`} onClick={() => setPeriod(p.key)}>
                      <p className="text-slate-400 text-sm mb-2">{p.label}</p>
                      <p className="text-white font-black text-xl">{fmt(s)} <span className="text-slate-500 text-sm font-normal">so'm</span></p>
                      <p className="text-emerald-400 text-sm mt-1">Foyda: {fmt(prof)}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            {!user && (
              <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-700/40 rounded-2xl p-8 text-center">
                <FileText className="w-12 h-12 text-blue-400 mx-auto mb-3" />
                <h3 className="text-xl font-bold text-white mb-2">Batafsil Hisobotlar</h3>
                <p className="text-slate-400 mb-4">To'liq moliyaviy tahlil va eksport funksiyasi uchun ro'yxatdan o'ting</p>
                <Link href="/auth/signup" className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all">Ro'yxatdan o'tish</Link>
              </div>
            )}
          </>
        )}

        {/* ═══════════════ QARZLAR VIEW (2-talab) ═══════════════ */}
        {view === 'qarzlar' && (
          <>
            <div className="flex gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
                <input type="text" placeholder="Xaridor bo'yicha qidirish..." className={`${inp} pl-9`} value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <button onClick={openAddDebt} className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 rounded-xl font-bold flex items-center gap-2 text-sm transition-all">
                <Plus className="w-4 h-4" />Yangi Qarz
              </button>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-sm">
                  <thead className="bg-slate-900 border-b border-slate-700">
                    <tr>{['Xaridor', 'Umumiy Qarz', 'To\'langan', 'Qoldiq', 'Muddat', 'Holat', 'Amallar'].map(h =>
                      <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">{h}</th>
                    )}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {debts.filter((d: any) => d.customer.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
                      <tr><td colSpan={7} className="py-12 text-center text-slate-500">Qarz topilmadi</td></tr>
                    ) : debts.filter((d: any) => d.customer.toLowerCase().includes(search.toLowerCase())).map((d: any) => {
                      const rem = d.remaining !== undefined ? d.remaining : (d.amount - (d.paid || 0))
                      const isOverdue = new Date(d.due_date) < new Date() && rem > 0
                      return (
                        <tr key={d.id} className="hover:bg-slate-700/40 transition-all">
                          <td className="px-4 py-3 font-semibold text-white">{d.customer}</td>
                          <td className="px-4 py-3 text-red-400 font-bold">{fmt(d.amount)} so'm</td>
                          <td className="px-4 py-3 text-emerald-400 font-bold">{fmt(d.paid || 0)} so'm</td>
                          <td className="px-4 py-3">
                            <span className={`font-bold ${rem > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>{fmt(rem)} so'm</span>
                          </td>
                          <td className="px-4 py-3 text-slate-400">
                            {new Date(d.due_date).toLocaleDateString('uz-UZ')}
                            {isOverdue && <span className="ml-2 text-red-400 text-xs"> (kechikkan)</span>}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${d.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' : isOverdue ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                              {d.status === 'paid' ? 'To\'langan' : isOverdue ? 'Kechikkan' : 'Faol'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <button onClick={() => openEditDebt(d)} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg"><Edit className="w-3.5 h-3.5" /></button>
                              <button onClick={() => deleteDebt(d.id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                              {rem > 0 && <button onClick={() => handlePayDebt(d.id)} className="p-1.5 text-emerald-400 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg font-semibold text-xs">To'lash</button>}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-900/70">
                      <td colSpan={3} className="py-3 px-4 font-bold text-slate-300">Jami qarz:</td>
                      <td className="py-3 px-4 font-black text-red-400">{fmt(debts.reduce((sum: number, d: any) => sum + (d.remaining !== undefined ? d.remaining : d.amount - (d.paid||0)), 0 ))} so'm</td>
                      <td colSpan={3}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </>
        )}
      </main>

      {/* ═══════════════ MODALS ═══════════════ */}

      {/* Mahsulot qo'shish/tahrirlash */}
      <Modal open={modal === 'product'} onClose={() => setModal(null)}
        title={editItem ? 'Mahsulotni Tahrirlash' : "Yangi Mahsulot Qo'shish"}
        icon={<Package className="w-5 h-5 text-blue-400" />}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Nomi *</label>
              <input className={inp} placeholder="Coca-Cola 0.5L" value={prodForm.name} onChange={e => setProdForm(f => ({...f, name: e.target.value}))} />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">SKU</label>
              <input className={inp} placeholder="CC-500" value={prodForm.sku} onChange={e => setProdForm(f => ({...f, sku: e.target.value}))} />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Kategoriya</label>
              <select className={sel} value={prodForm.category} onChange={e => setProdForm(f => ({...f, category: e.target.value}))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Sotuv Narxi (so'm) *</label>
              <input className={inp} type="number" placeholder="8000" value={prodForm.price} onChange={e => setProdForm(f => ({...f, price: e.target.value}))} />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Tannarx (so'm)</label>
              <input className={inp} type="number" placeholder="5500" value={prodForm.cost} onChange={e => setProdForm(f => ({...f, cost: e.target.value}))} />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Zaxira (dona) *</label>
              <input className={inp} type="number" placeholder="50" value={prodForm.stock} onChange={e => setProdForm(f => ({...f, stock: e.target.value}))} />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Min. Zaxira</label>
              <input className={inp} type="number" placeholder="10" value={prodForm.min_stock_level} onChange={e => setProdForm(f => ({...f, min_stock_level: e.target.value}))} />
            </div>
          </div>
          {prodForm.price && prodForm.cost && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-sm">
              <p className="text-emerald-400">Foyda: <strong>{fmt(Number(prodForm.price) - Number(prodForm.cost))} so'm</strong> ({Math.round(((Number(prodForm.price) - Number(prodForm.cost)) / Number(prodForm.price)) * 100)}%)</p>
            </div>
          )}
          <button onClick={saveProduct} disabled={saving} className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saqlanmoqda...' : editItem ? 'Yangilash' : "Qo'shish"}
          </button>
        </div>
      </Modal>

      {/* Xodim qo'shish/tahrirlash (3-talab - maqsad qo'shildi) */}
      <Modal open={modal === 'employee'} onClose={() => setModal(null)}
        title={editItem ? 'Xodimni Tahrirlash' : "Xodim Qo'shish"}
        icon={<Users className="w-5 h-5 text-blue-400" />}>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">To'liq Ism *</label>
            <input className={inp} placeholder="Ali Valiyev" value={empForm.name} onChange={e => setEmpForm(f => ({...f, name: e.target.value}))} />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Lavozim *</label>
            <select className={sel} value={empForm.position} onChange={e => setEmpForm(f => ({...f, position: e.target.value}))}>
              {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Telefon</label>
              <input className={inp} placeholder="+998 90 123 45 67" value={empForm.phone} onChange={e => setEmpForm(f => ({...f, phone: e.target.value}))} />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Maosh (so'm)</label>
              <input className={inp} type="number" placeholder="4500000" value={empForm.salary} onChange={e => setEmpForm(f => ({...f, salary: e.target.value}))} />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Kunlik savdo maqsadi (so'm)</label>
            <input className={inp} type="number" placeholder="5000000" value={empForm.sales_goal} onChange={e => setEmpForm(f => ({...f, sales_goal: e.target.value}))} />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Email</label>
            <input className={inp} type="email" placeholder="xodim@email.com" value={empForm.email} onChange={e => setEmpForm(f => ({...f, email: e.target.value}))} />
          </div>
          <button onClick={saveEmployee} disabled={saving} className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saqlanmoqda...' : editItem ? 'Yangilash' : "Qo'shish"}
          </button>
        </div>
      </Modal>

      {/* Sotuv modali */}
      <Modal open={modal === 'sale'} onClose={() => setModal(null)}
        title="Yangi Sotuv" icon={<ShoppingCart className="w-5 h-5 text-emerald-400" />} wide>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Xodim *</label>
            <select className={sel} value={saleForm.employee_id} onChange={e => setSaleForm(f => ({...f, employee_id: e.target.value}))}>
              <option value="">Xodimni tanlang...</option>
              {employees.filter(e => e.is_active !== false).map(e => (
                <option key={e.id} value={e.id}>{e.name} — {e.position}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Mahsulot *</label>
            <select className={sel} value={saleForm.product_id} onChange={e => setSaleForm(f => ({...f, product_id: e.target.value}))}>
              <option value="">Mahsulotni tanlang...</option>
              {products.filter(p => p.active !== false && (p.stock || 0) > 0).map(p => (
                <option key={p.id} value={p.id}>{p.name} — {fmt(p.price)} so'm (Zaxira: {p.stock})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Miqdor *</label>
              <input className={inp} type="number" min="1" value={saleForm.qty} onChange={e => setSaleForm(f => ({...f, qty: e.target.value}))} />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">To'lov turi</label>
              <select className={sel} value={saleForm.payment} onChange={e => setSaleForm(f => ({...f, payment: e.target.value}))}>
                <option value="Naqd">💵 Naqd</option>
                <option value="Karta">💳 Karta</option>
                <option value="Payme">📱 Payme</option>
                <option value="Click">📱 Click</option>
              </select>
            </div>
          </div>

          {/* Sotuv jami */}
          {saleForm.product_id && saleForm.qty && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl">
              {(() => {
                const prod = products.find(p => String(p.id) === String(saleForm.product_id))
                const total = (prod?.price || 0) * Number(saleForm.qty)
                const profitItem = ((prod?.price || 0) - (prod?.cost || (prod?.price || 0) * 0.7)) * Number(saleForm.qty)
                return (
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Narx:</span>
                      <span className="text-white font-bold">{fmt(prod?.price || 0)} so'm × {saleForm.qty}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 text-sm">Jami:</span>
                      <span className="text-emerald-400 font-black text-lg">{fmt(total)} so'm</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Foyda:</span>
                      <span className="text-blue-400 font-bold">{fmt(profitItem)} so'm</span>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}

          <button onClick={saveSale} disabled={saving || !saleForm.product_id || !saleForm.employee_id} className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
            {saving ? 'Amalga oshirilmoqda...' : 'Sotuvni Tasdiqlash'}
          </button>
        </div>
      </Modal>

      {/* Maqsad qo'yish */}
      <Modal open={modal === 'goals'} onClose={() => setModal(null)}
        title="Savdo Maqsadlari" icon={<Target className="w-5 h-5 text-amber-400" />}>
        <div className="space-y-4">
          <p className="text-slate-400 text-sm">Har bir davr uchun savdo maqsadini kiriting. Progress bosh sahifada ko'rinadi.</p>
          {[
            { label: 'Kunlik Maqsad', key: 'daily',   ph: '15 000 000', cur: goals.daily   },
            { label: 'Haftalik Maqsad', key: 'weekly', ph: '100 000 000', cur: goals.weekly },
            { label: 'Oylik Maqsad', key: 'monthly',   ph: '400 000 000', cur: goals.monthly},
          ].map(item => (
            <div key={item.key}>
              <label className="text-xs font-bold text-slate-400 uppercase mb-1 block flex items-center justify-between">
                {item.label}
                <span className="text-slate-600 normal-case font-normal">Hozir: {fmt(item.cur)} so'm</span>
              </label>
              <input className={inp} type="number" placeholder={item.ph}
                value={(goalForm as any)[item.key]}
                onChange={e => setGoalForm(f => ({...f, [item.key]: e.target.value}))} />
            </div>
          ))}
          <button onClick={saveGoals} className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2">
            <Target className="w-4 h-4" />Maqsadlarni Saqlash
          </button>
        </div>
      </Modal>

      {/* Qarz qo'shish/tahrirlash (2-talab) */}
      <Modal open={modal === 'debt'} onClose={() => setModal(null)}
        title={editDebtItem ? 'Qarzni Tahrirlash' : 'Yangi Qarz Qo\'shish'}
        icon={<CreditCard className="w-5 h-5 text-rose-400" />}>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Xaridor nomi *</label>
            <input className={inp} placeholder="Xaridor ism yoki do'kon" value={debtForm.customer} onChange={e => setDebtForm(f => ({...f, customer: e.target.value}))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Qarz summasi (so'm) *</label>
              <input className={inp} type="number" placeholder="1250000" value={debtForm.amount} onChange={e => setDebtForm(f => ({...f, amount: e.target.value}))} />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Muddat (sana)</label>
              <input className={inp} type="date" value={debtForm.due_date} onChange={e => setDebtForm(f => ({...f, due_date: e.target.value}))} />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Eslatma / Izoh</label>
            <textarea className={`${inp} h-24 resize-y`} placeholder="Qarz sababi..." value={debtForm.note} onChange={e => setDebtForm(f => ({...f, note: e.target.value}))} />
          </div>
          <button onClick={saveDebt} disabled={saving} className="w-full py-3 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saqlanmoqda...' : editDebtItem ? 'Yangilash' : "Qo'shish"}
          </button>
        </div>
      </Modal>

      {/* Sozlamalar */}
      <Modal open={modal === 'settings'} onClose={() => setModal(null)}
        title="Tizim Sozlamalari" icon={<Settings className="w-5 h-5 text-slate-300" />} wide>
        <div className="space-y-6">

          {/* Do'kon ma'lumotlari */}
          <div>
            <h3 className="text-white font-bold mb-3 flex items-center gap-2"><Briefcase className="w-4 h-4 text-blue-400" />Do'kon Ma'lumotlari</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Do'kon Nomi</label>
                <input className={inp} placeholder="Smart Dokon" value={settingsForm.shop_name} onChange={e => setSettingsForm(f => ({...f, shop_name: e.target.value}))} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Telefon</label>
                <input className={inp} placeholder="+998 90 000 00 00" value={settingsForm.phone} onChange={e => setSettingsForm(f => ({...f, phone: e.target.value}))} />
              </div>
            </div>
          </div>

          {/* Profil ma'lumotlari */}
          {user && profile && (
            <div>
              <h3 className="text-white font-bold mb-3 flex items-center gap-2"><Users className="w-4 h-4 text-purple-400" />Profil</h3>
              <div className="bg-slate-900 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-400">Username</span><span className="text-white font-mono">@{profile.username}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Email</span><span className="text-white">{user.email}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Do'kon turi</span><span className="text-white capitalize">{profile.shop_type}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Promo-kod</span><span className="text-blue-400 font-mono">{profile.promo_code || '—'}</span></div>
              </div>
            </div>
          )}

          {/* Xavfli zona */}
          <div>
            <h3 className="text-red-400 font-bold mb-3 flex items-center gap-2"><AlertCircle className="w-4 h-4" />Xavfli Zona</h3>
            <button onClick={logout} className="w-full py-3 bg-red-900/30 hover:bg-red-900/50 border border-red-700/50 text-red-400 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2">
              <LogOut className="w-4 h-4" />Tizimdan Chiqish
            </button>
          </div>

          <button onClick={saveSettings} disabled={saving || !user} className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>
      </Modal>

    </div>
  )

  // Agar foydalanuvchi kirgan bo'lsa va profil mavjud bo'lsa, obuna tekshiruvini qo'llaymiz
  if (user && profile) {
    return (
      <SubscriptionCheck userId={user.id}>
        {mainContent}
      </SubscriptionCheck>
    )
  }

  // Demo rejim yoki profil to'liq emas - obuna tekshiruvisiz
  return mainContent
}