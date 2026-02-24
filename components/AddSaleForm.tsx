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

      // Call the server-side RPC function for atomic transaction
      const { error } = await supabase.rpc('record_sale', {
        p_business_id: selectedProduct.business_id,
        p_employee_id: user.id,
        p_total_amount: selectedProduct.price * quantity,
        p_payment_method: 'cash',
        p_product_id: selectedProduct.id,
        p_quantity: quantity,
        p_unit_price: selectedProduct.price,
        p_unit_cost: selectedProduct.cost_price
      })

      if (error) throw error

      onSaleComplete()
      setIsOpen(false)
      setQuantity(1)
      setSelectedProductId('')
      
    } catch (error: any) {
      alert('Xatolik: ' + error.message)
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

          <div className="flex justify-between items-center py-4 border-t border-slate-800">
            <span className="text-lg text-slate-400">Jami Summa:</span>
            <span className="text-3xl font-bold text-emerald-400">${total}</span>
          </div>

          <button
            type="submit"
            disabled={loading || !selectedProduct}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Bajarilmoqda...
              </>
            ) : (
              <>
                <Check className="w-5 h-5" /> Sotish
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}