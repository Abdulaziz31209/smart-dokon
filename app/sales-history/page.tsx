'use client'

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { SalesRow } from "@/lib/sales.types";
import { Loader2, Download, Filter, BarChart3, CalendarIcon } from "lucide-react";

const DATE_PRESETS = [
  { label: "Bugun", value: "today", fromDays: 1 },
  { label: "7 kun", value: "7d", fromDays: 7 },
  { label: "1 oy", value: "1m", fromDays: 30 },
  { label: "1 yil", value: "1y", fromDays: 365 },
  { label: "5 yil", value: "5y", fromDays: 1825 },
  { label: "10 yil", value: "10y", fromDays: 3652 },
  { label: "50 yil", value: "50y", fromDays: 18250 },
];

export default function SalesHistoryPage() {
  const [sales, setSales] = useState<SalesRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const [toDate, setToDate] = useState(new Date());
  const [preset, setPreset] = useState("7d");
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    fetchSales();
  }, [fromDate, toDate]);

  const fetchSales = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const fromStr = fromDate.toISOString().split('T')[0];
    const toStr = toDate.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from("sales_history")
      .select("*")
      .gte("date", fromStr)
      .lte("date", toStr)
      .order("date", { ascending: false })
      .limit(1000);

    if (data) {
      setSales(data as SalesRow[]);
    }
    if (error) console.error(error);
    setLoading(false);
  };

  const applyPreset = (value: string) => {
    const found = DATE_PRESETS.find(p => p.value === value);
    if (found) {
      const from = new Date();
      from.setDate(from.getDate() - found.fromDays);
      setFromDate(from);
      setPreset(value);
      setShowCalendar(false);
    }
  };

  const cashTotal = sales.reduce((sum, s) => s.payment_type === "cash" ? sum + (s.total || 0) : sum, 0);
  const debtTotal = sales.reduce((sum, s) => s.payment_type === "debt" ? sum + (s.total || 0) : sum, 0);
  const unpaidDebt = sales.filter(s => s.payment_type === "debt" && s.status === "unpaid").reduce((sum, s) => sum + (s.total || 0), 0);

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent mb-2">
            Sotuv Tarixi
          </h1>
          <p className="text-slate-400">Global date filter. Accurate data isolation by timestamp.</p>
        </div>
      </div>

      {/* Date Filter */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-800 bg-slate-950/50">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
            <div className="flex items-center gap-2 text-xl font-bold text-white">
              <Filter className="w-5 h-5" />
              <span>Date Range: {fromDate.toLocaleDateString()} - {toDate.toLocaleDateString()}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {DATE_PRESETS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => applyPreset(p.value)}
                  className={`px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-md ${
                    preset === p.value
                      ? "bg-emerald-600 text-white shadow-emerald-500/25"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:shadow-lg"
                  }`}
                >
                  {p.label}
                </button>
              ))}
              <button
                onClick={() => setShowCalendar(!showCalendar)}
                className="p-2 hover:bg-slate-700 rounded-xl transition-all flex items-center gap-1 text-slate-400 hover:text-white"
              >
                <CalendarIcon className="w-4 h-4" />
                <span className="text-xs font-bold">Custom</span>
              </button>
            </div>
          </div>
        </div>
        {showCalendar && (
          <div className="p-8 bg-slate-950 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div>
              <label className="text-sm font-bold text-slate-400 mb-4 block">From Date</label>
              <input
                type="date"
                value={fromDate.toISOString().split('T')[0]}
                onChange={(e) => setFromDate(new Date(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-4 text-white text-lg font-bold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 transition-all"
              />
            </div>
            <div>
              <label className="text-sm font-bold text-slate-400 mb-4 block">To Date</label>
              <input
                type="date"
                value={toDate.toISOString().split('T')[0]}
                onChange={(e) => setToDate(new Date(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-4 text-white text-lg font-bold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 transition-all"
              />
            </div>
            <button
              onClick={() => {
                fetchSales();
                setShowCalendar(false);
              }}
              className="md:col-span-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 px-8 rounded-xl shadow-lg shadow-emerald-500/25 transition-all w-full text-lg"
            >
              Apply Filter
            </button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-emerald-600/20 to-teal-600/20 border border-emerald-500/30 rounded-2xl p-6 shadow-2xl backdrop-blur-sm">
          <div className="text-3xl font-black text-emerald-400 mb-2">${Math.round(cashTotal).toLocaleString()}</div>
          <div className="text-emerald-300 font-medium text-lg">Naqd Sotuvlar</div>
        </div>
        <div className="bg-gradient-to-br from-orange-500/20 to-yellow-500/20 border border-orange-500/30 rounded-2xl p-6 shadow-2xl backdrop-blur-sm">
          <div className="text-3xl font-black text-orange-400 mb-2">${Math.round(debtTotal).toLocaleString()}</div>
          <div className="text-orange-300 font-medium text-lg">Jami Qarzlar</div>
        </div>
        <div className="bg-gradient-to-br from-red-500/20 to-rose-500/20 border border-red-500/30 rounded-2xl p-6 shadow-2xl backdrop-blur-sm">
          <div className="text-3xl font-black text-red-400 mb-2">${Math.round(unpaidDebt).toLocaleString()}</div>
          <div className="text-red-300 font-medium text-lg">To'lanmagan ⚠️</div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-slate-900/80 border border-slate-800/50 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-800 bg-gradient-to-r from-slate-800 to-slate-900/50">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-black bg-gradient-to-r from-slate-200 to-slate-300 bg-clip-text text-transparent flex items-center gap-3">
              <BarChart3 className="w-7 h-7" />
              Sotuvlar Ro'yxati ({sales.length} ta yozuv)
            </h3>
            <button className="flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold shadow-lg transition-all text-sm">
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-950/50 border-b-2 border-slate-700">
                <th className="p-5 text-left font-black text-slate-200 text-sm uppercase tracking-wider">Sana</th>
                <th className="p-5 text-left font-black text-slate-200 text-sm uppercase tracking-wider">Mahsulot</th>
                <th className="p-5 text-left font-black text-slate-200 text-sm uppercase tracking-wider">Miqdor</th>
                <th className="p-5 text-right font-black text-slate-200 text-sm uppercase tracking-wider">Jami</th>
                <th className="p-5 text-left font-black text-slate-200 text-sm uppercase tracking-wider">Xodim</th>
                <th className="p-5 text-left font-black text-slate-200 text-sm uppercase tracking-wider">To'lov Turi</th>
                <th className="p-5 text-left font-black text-slate-200 text-sm uppercase tracking-wider">Holati</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <Loader2 className="w-12 h-12 animate-spin mx-auto mb-6 text-emerald-500" />
                    <div className="text-xl font-bold text-slate-400">Ma'lumotlar yuklanmoqda...</div>
                  </td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <div className="text-2xl font-bold text-slate-500 mb-4">📊</div>
                    <div className="text-xl font-bold text-slate-400">Tanlangan davr uchun sotuvlar yo'q</div>
                  </td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors group">
                    <td className="p-5 font-mono text-slate-300 group-hover:text-white">{new Date(sale.date).toLocaleDateString('uz-UZ')}</td>
                    <td className="p-5 font-semibold text-white max-w-xs truncate">{sale.item}</td>
                    <td className="p-5 text-emerald-400 font-bold">{sale.qty}x</td>
                    <td className={`p-5 text-right font-black text-2xl ${
                      sale.payment_type === 'debt' ? 'text-orange-400' : 'text-emerald-400'
                    }`}>${sale.total.toFixed(0)}</td>
                    <td className="p-5 text-slate-300">{sale.employee || 'N/A'}</td>
                    <td className="p-5">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${
                        sale.payment_type === "debt"
                          ? "bg-orange-500/20 text-orange-400 border-2 border-orange-500/40 shadow-md"
                          : "bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/40 shadow-md"
                      }`}>
                        {sale.payment_type === 'debt' ? 'Qarz' : 'Naqd'}
                      </span>
                    </td>
                    <td className="p-5">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${
                        sale.status === "unpaid"
                          ? "bg-red-500/20 text-red-400 border-2 border-red-500/40 shadow-md"
                          : "bg-green-500/20 text-green-400 border-2 border-green-500/40 shadow-md"
                      }`}>
                        {sale.status === 'unpaid' ? 'To\'lanmagan' : 'To\'langan'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {sales.length > 0 && (
          <div className="p-6 bg-slate-950/50 border-t border-slate-800">
            <div className="text-sm text-slate-500 text-center">
              Pagination & realtime updates coming soon...
            </div>
          </div>
        )}
      </div>

      {showCalendar && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowCalendar(false)}
        />
      )}
    </div>
  );
}