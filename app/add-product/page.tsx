'use client'

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Product } from '@/lib/sales.types';
import EditProductModal from '@/components/EditProductModal';
import BarcodeScanner from '@/components/BarcodeScanner';
import { Plus, Zap } from 'lucide-react';

export default function AddProductPage() {
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');

  const handleBarcodeScan = async (barcode: string) => {
    // Check if exists
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('barcode', barcode)
      .single();

    if (data) {
      alert('Bu shtrix-kod allaqachon mavjud!');
      return;
    }

    // OpenFoodFacts lookup
    const res = await fetch(`/api/product/${barcode}`);
    const apiData = await res.json();

    if (apiData.found) {
      const newProduct: Product = {
        id: '',
        name: apiData.name,
        sku: '',
        barcode,
        price: 0,
        cost_price: 0,
        stock: 0,
        min_stock_level: 0,
        product_metadata: apiData.metadata
      };
      setEditingProduct(newProduct);
      setIsModalOpen(true);
    } else {
      // Empty form with barcode
      setEditingProduct({
        id: '',
        name: '',
        sku: '',
        barcode,
        price: 0,
        cost_price: 0,
        stock: 0,
        min_stock_level: 0
      });
      setIsModalOpen(true);
    }
  };

  const handleProductSaved = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setBarcodeInput('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-black p-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent mb-4">
            Yangi Mahsulot
          </h1>
          <p className="text-slate-400 text-xl">Shtrix-kod skanerlab avto to\'ldiring</p>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 backdrop-blur-sm shadow-2xl mb-8 text-center">
          <BarcodeScanner onScan={handleBarcodeScan} />
          <div className="mt-6 p-4 bg-slate-800/30 rounded-2xl">
            <p className="text-slate-400 mb-2">Yoki qo\'lda:</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Shtrix-kod kiriting..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                onKeyDown={async (e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    await handleBarcodeScan(barcodeInput);
                  }
                }}
              />
              <button
                onClick={() => handleBarcodeScan(barcodeInput)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all"
              >
                <Zap className="w-5 h-5 inline" />
              </button>
            </div>
          </div>
        </div>

        <EditProductModal
          product={editingProduct}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onUpdate={handleProductSaved}
        />

        <div className="text-center">
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-lg shadow-indigo-900/20 transition-all flex items-center gap-3 mx-auto"
          >
            <Plus className="w-6 h-6" />
            Qo\'lda yangi mahsulot
          </button>
        </div>
      </div>
    </div>
  );
}

