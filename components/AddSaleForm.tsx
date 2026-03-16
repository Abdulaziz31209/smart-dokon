'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ShoppingCart, X, Loader2, Check } from 'lucide-react'

export default function AddSaleForm({ onSaleComplete }: { onSaleComplete: () => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState<any[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [quantity, setQuantity] = useState(1)
  const [isNasiya, setIsNasiya] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')

  // Fetch products when modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchProducts = async () => {
        const { data } = await supabase
          .from('products')
          .select('*')
          .gt('stock', 0) // Only show in-stock items
          .order('name')
        
        if (data) setProducts(data)
      }
      fetchProducts()
    }
  }, [isOpen])

  const selectedProduct = products.find(p => p.id === selectedProductId)
  const total = selectedProduct ? (selectedProduct.price * quantity).toFixed(2) : '0.00'

  const handleSale = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProduct) return
    
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Avtorizatsiyadan o\'tilmagan')

      // Direct insert using schema + triggers (RPC update recommended)
      // 1. Upsert employee (current user)
      const { data: employeeData } = await supabase
        .from('employees')
        .upsert({ user_id: user.id, full_name: user.user_metadata?.full_name || user.email.split('@')[0], is_active: true }, { onConflict: 'user_id' })
        .select('id')
        .single()

      const employeeId = employeeData?.id

      // 2. Upsert customer if Nasiya
      let customerId: number | null = null
      if (isNasiya && customerName) {
        const customerDetails = { name: customerName, phone: customerPhone || null }
        const { data: customerData } = await supabase
          .from('customers')
          .upsert({ 
            user_id: user.id, 
            full_name: customerName, 
            phone: customerPhone, 
            customer_details: customerDetails 
          }, { onConflict: 'user_id,full_name' })
          .select('id')
          .single()
        customerId = customerData?.id
      }

      // 3. Insert sale
      const paymentType = isNasiya ? 'debt' : 'cash'
      const paymentStatus = isNasiya ? 'unpaid' : 'paid'
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert({
          user_id: user.id,
          employee_id: employeeId,
          customer_id: customerId || null,
          total_price: parseFloat(total),
          payment_method: paymentType,
          payment_status: paymentStatus,
          customer_details: isNasiya ? { name: customerName, phone: customerPhone } : {}
        })
        .select('id')
        .single()
      if (saleError) throw saleError

      // 4. Insert sale_item
      const { error: itemError } = await supabase
        .from('sale_items')
        .insert({
          sale_id: saleData.id,
          product_id: selectedProductId,
          quantity,
          unit_price: selectedProduct.price,
          total_price: parseFloat(total)
        })
      if (itemError) throw itemError

      onSaleComplete()
      setIsOpen(false)
      setQuantity(1)
      setSelectedProductId('')
      setIsNasiya(false)
      setCustomerName('')
      setCustomerPhone('')
      
    } catch (error: any) {
      alert('Xatolik: ' + (error.message || error))
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-900/20"
      >
        <ShoppingCart className="w-5 h-5" />
        Sotuv Qilish
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl w-full max-w-lg shadow-2xl relative animate-in fade-in zoom-in duration-200">
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
        
        <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2">
          <ShoppingCart className="text-emerald-400" />
          Yangi Sotuv
        </h2>
        
        <form onSubmit={handleSale} className="space-y-6">
          <div>
            <label className="block text-slate-400 text-sm mb-2">Mahsulotni Tanlang</label>
            <select
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors appearance-none"
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
            >
              <option value="">Tanlang...</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} — ${p.price} ({p.stock} ta qoldi)
                </option>
              ))}
            </select>
          </div>

          {/* Nasiya Toggle */}
          <div className="flex items-center gap-3 p-3 bg-orange-500/10 border border-orange-500/30 rounded-xl">
            <button
              type="button"
              onClick={() => setIsNasiya(!isNasiya)}
              className={`flex-1 p-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${
                isNasiya 
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25' 
                  : 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30'
              }`}
            >
              {isNasiya ? '❌ Naqd' : '💳 Nasiya'}
            </button>
            {isNasiya && (
              <div className="text-xs text-orange-400 font-bold bg-orange-500/20 px-3 py-1 rounded-full border border-orange-500/30">
                QARZ
              </div>
            )}
          </div>

          {isNasiya && (
            <div className="space-y-3 bg-slate-950/50 p-4 rounded-xl border border-orange-800/50">
              <label className="block text-orange-400 text-sm mb-2 font-bold">Mijoz ma'lumotlari (majburiy)</label>
              <input
                required
                type="text"
                placeholder="Ism"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-slate-900 border border-orange-500/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-400 transition-colors"
              />
              <input
                type="tel"
                placeholder="Telefon (ixtiyoriy)"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-400 transition-colors"
              />
            </div>
          )}

          {selectedProduct && (
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="flex justify-between items-center mb-4">
                <span className="text-slate-400">Narxi:</span>
                <span className="font-bold text-white">${selectedProduct.price}</span>
              </div>
              
              <div>
                <label className="block text-slate-400 text-sm mb-2">Soni</label>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    min="1"
                    max={selectedProduct.stock}
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                  <span className="text-slate-500 text-sm whitespace-nowrap">
                    max: {selectedProduct.stock}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center py-4 border-t border-slate-800 bg-gradient-to-r ${
            isNasiya ? 'from-orange-500/10' : 'from-emerald-500/10'
          }">
            <span className="text-lg text-slate-400">Jami Summa:</span>
            <span className={`text-3xl font-bold ${isNasiya ? 'text-orange-400' : 'text-emerald-400'}`}>
              ${total}
            </span>
          </div>

          <button
            type="submit"
            disabled={loading || !selectedProduct || (isNasiya && !customerName)}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-slate-700 disabled:to-slate-800 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Bajarilmoqda...
              </>
            ) : isNasiya ? (
              <>
                <Check className="w-5 h-5" /> Nasiya berish
              </>
            ) : (
              <>
                <Check className="w-5 h-5" /> Naqd sotish
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}