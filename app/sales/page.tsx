'use client'

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Product, CustomerDetails } from '@/lib/sales.types';
import AddSaleForm from '@/components/AddSaleForm';
import BarcodeScanner from '@/components/BarcodeScanner';
import { ShoppingCart, Trash2, Plus, Minus, UserPlus, DollarSign } from 'lucide-react';

export default function SalesPage() {
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchBarcode, setSearchBarcode] = useState('');

  // Handle barcode scan
  const handleBarcodeScan = async (barcode: string, source: 'camera' | 'usb') => {
    console.log(`Scanned ${barcode} via ${source}`);
    setSearchBarcode(barcode);
    
    // 1. Check Supabase first
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .eq('barcode', barcode)
      .single();

    if (products) {
      // Add to cart
      addToCart(products as Product);
      return;
    }

    // 2. Fallback to OpenFoodFacts
    const res = await fetch(`/api/product/${barcode}`);
    const apiData = await res.json();

    if (apiData.found) {
      alert(`Mahsulot topildi: ${apiData.name}\nAvval qo\'shing: /add-product`);
    } else {
      alert('Mahsulot topilmadi. Qo\'lda qo\'shing.');
    }
  };

  const addToCart = (product: Product, qty = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + qty }
            : item
        );
      }
      return [...prev, { product, quantity: qty }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev =>
      prev.map(item =>
        item.product.id === productId
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item
      ).filter(item => item.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const total = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-black p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-black bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent mb-4">
            POS Sotuv
          </h1>
          <p className="text-slate-400 text-xl">Shtrix-kod skaneri bilan tez sotuv</p>
        </div>

        {/* Scanner */}
        <div className="mb-8 text-center">
          <BarcodeScanner onScan={handleBarcodeScan} />
        </div>

        {/* Cart */}
        {cart.length > 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 mb-8 backdrop-blur-sm shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <ShoppingCart className="w-8 h-8 text-emerald-400" />
              Savat ({cart.length} ta)
            </h2>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {cart.map((item) => (
                <div key={item.product.id} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-slate-700 rounded-xl flex items-center justify-center">
                      {item.product.sku || item.product.name[0]}
                    </div>
                    <div>
                      <p className="font-bold text-white">{item.product.name}</p>
                      <p className="text-emerald-400">${item.product.price}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center bg-slate-700 px-4 py-2 rounded-xl">
                      <button
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="p-2 hover:bg-slate-600 rounded-lg transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="mx-3 font-bold text-lg min-w-[2rem] text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="p-2 hover:bg-slate-600 rounded-lg transition-colors"
                        disabled={item.quantity >= item.product.stock}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="p-2 text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 pt-6 border-t border-slate-700">
              <div className="text-3xl font-black text-white flex justify-between items-center">
                <span>Jami:</span>
                <span className="text-emerald-400">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 bg-slate-900/30 border-2 border-dashed border-slate-700 rounded-3xl">
            <ShoppingCart className="w-24 h-24 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-xl">Shtrix-kod skanerlang yoki mahsulot qo'shing</p>
          </div>
        )}

        {/* Quick Sale */}
<AddSaleForm cart={cart} total={total} onSaleComplete={() => setCart([])} />
      </div>
    </div>
  );
}

