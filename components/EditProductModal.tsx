'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Save, Loader2 } from 'lucide-react'

interface Product {
  id: string
  name: string
  sku: string
  price: number
  cost_price: number
  stock: number
  min_stock_level: number
}

interface EditProductModalProps {
  product: Product | null
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}

export default function EditProductModal({ product, isOpen, onClose, onUpdate }: EditProductModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<Partial<Product>>({})

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        sku: product.sku,
        price: product.price,
        cost_price: product.cost_price,
        stock: product.stock,
        min_stock_level: product.min_stock_level
      })
    }
  }, [product])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!product) return
    setLoading(true)

    try {
      const { error } = await supabase
        .from('products')
        .update(formData)
        .eq('id', product.id)

      if (error) throw error

      onUpdate()
      onClose()
    } catch (error: any) {
      alert('Xatolik: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !product) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl w-full max-w-lg shadow-2xl relative animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
        
        <h2 className="text-2xl font-bold mb-6 text-white">Mahsulotni Tahrirlash</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-slate-400 text-sm mb-1">Mahsulot Nomi</label>
            <input
              required
              type="text"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
              value={formData.name || ''}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 text-sm mb-1">SKU</label>
              <input
                type="text"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                value={formData.sku || ''}
                onChange={e => setFormData({...formData, sku: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-1">Zaxira</label>
              <input
                type="number"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                value={formData.stock || ''}
                onChange={e => setFormData({...formData, stock: parseInt(e.target.value)})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 text-sm mb-1">Tan Narx</label>
              <input
                type="number"
                step="0.01"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                value={formData.cost_price || ''}
                onChange={e => setFormData({...formData, cost_price: parseFloat(e.target.value)})}
              />
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-1">Sotuv Narxi</label>
              <input
                type="number"
                step="0.01"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                value={formData.price || ''}
                onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl mt-4 transition-all flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Saqlash
          </button>
        </form>
      </div>
    </div>
  )
}