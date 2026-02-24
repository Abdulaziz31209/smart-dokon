'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Pencil, Trash2, Search, Package } from 'lucide-react'
import Link from 'next/link'
import EditProductModal from '@/components/EditProductModal'

export default function InventoryPage() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingProduct, setEditingProduct] = useState<any>(null)

  const fetchProducts = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name')
    
    if (error) console.error(error)
    else setProducts(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Haqiqatan ham bu mahsulotni o\'chirmoqchimisiz?')) return

    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) {
      alert('Xatolik: ' + error.message)
    } else {
      fetchProducts()
    }
  }

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-3 bg-slate-900 rounded-xl border border-slate-800 hover:bg-slate-800 transition-colors">
              <ArrowLeft className="w-6 h-6 text-slate-400" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Ombor Boshqaruvi</h1>
              <p className="text-slate-400">Mahsulotlarni tahrirlash va o'chirish</p>
            </div>
          </div>
          
          <div className="relative">
            <Search className="absolute left-4 top-3.5 text-slate-500 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Qidirish..." 
              className="bg-slate-900 border border-slate-800 rounded-xl pl-12 pr-4 py-3 w-64 focus:outline-none focus:border-blue-500 transition-colors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </header>

        <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-950 text-slate-400 uppercase text-xs font-bold">
              <tr>
                <th className="p-6">Mahsulot</th>
                <th className="p-6">SKU</th>
                <th className="p-6">Narx</th>
                <th className="p-6">Zaxira</th>
                <th className="p-6 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="p-6 font-medium flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <Package className="w-5 h-5 text-blue-400" />
                    </div>
                    {product.name}
                  </td>
                  <td className="p-6 text-slate-400">{product.sku || '-'}</td>
                  <td className="p-6">${product.price}</td>
                  <td className="p-6">
                    <span className={product.stock <= (product.min_stock_level || 5) ? "text-red-400 font-bold" : "text-emerald-400"}>
                      {product.stock} ta
                    </span>
                  </td>
                  <td className="p-6 flex justify-end gap-2">
                    <button 
                      onClick={() => setEditingProduct(product)}
                      className="p-2 hover:bg-blue-500/20 rounded-lg text-blue-400 transition-colors"
                    >
                      <Pencil className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleDelete(product.id)}
                      className="p-2 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <EditProductModal 
        product={editingProduct} 
        isOpen={!!editingProduct} 
        onClose={() => setEditingProduct(null)} 
        onUpdate={fetchProducts}
      />
    </div>
  )
}