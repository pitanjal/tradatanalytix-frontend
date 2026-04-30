// @ts-nocheck
"use client";

import React, { useState, useMemo } from "react";
import { LineChart, Home, Bot, Calendar, ArrowRight, ArrowUpDown, MessageSquare, X, BarChart2, ChevronLeft, ChevronRight } from "lucide-react";
import ChartComponent from './ChartComponent';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("Swing Momentum");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [stockData, setStockData] = useState<any[]>([]);
  const [selectedStock, setSelectedStock] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  // New Chart State
  const [chartData, setChartData] = useState<any | null>(null);
  const [isChartLoading, setIsChartLoading] = useState(false);

  // Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: string; text: string }[]>([]);

  // Sorting & Pagination State
  const [sortConfig, setSortConfig] = useState<{ key: string | null, direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchStockData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`https://tradatanalytix-backend.onrender.com/api/swing-momentum?date=${selectedDate}`);
      const result = await res.json();
      setStockData(result.data || []);
      setCurrentPage(1);
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch data", error);
      setLoading(false);
      alert("Could not connect to Python backend! Is your FastAPI server running?");
    }
  };

  // --- ROW CLICK HANDLER (REAL API) ---
  const handleRowClick = async (stock: any) => {
    setSelectedStock(stock);
    setChartData(null);
    setIsChartLoading(true);

    try {
      const instrument = stock.name;
      const res = await fetch(`https://tradatanalytix-backend.onrender.com/api/stock-history/${encodeURIComponent(instrument)}`);

      if (!res.ok) throw new Error("Failed to fetch historical data");

      const data = await res.json();
      setChartData(data);
    } catch (error) {
      console.error("Chart fetch error:", error);
      alert(`Could not load chart data for ${stock.name}. Ensure the Upstox API is responding.`);
    } finally {
      setIsChartLoading(false);
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput) return;
    const newHistory = [...chatHistory, { role: "user", text: chatInput }];
    setChatHistory(newHistory);
    setChatInput("");
    setTimeout(() => {
      setChatHistory([...newHistory, { role: "assistant", text: "AI is analyzing the current chart context..." }]);
    }, 1000);
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  const sortedStocks = useMemo(() => {
    let sortableItems = [...stockData];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (typeof aValue === 'string') aValue = aValue.toLowerCase();
        if (typeof bValue === 'string') bValue = bValue.toLowerCase();

        if (aValue === -99 || aValue == null) aValue = sortConfig.direction === 'asc' ? Infinity : -Infinity;
        if (bValue === -99 || bValue == null) bValue = sortConfig.direction === 'asc' ? Infinity : -Infinity;

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [stockData, sortConfig]);

  const totalPages = Math.ceil(sortedStocks.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedStocks.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  return (
    // FIX 1: h-screen strictly locks the height to exactly 1 viewport. 
    <div className="h-screen bg-[#f8f9fa] flex flex-col font-sans relative overflow-hidden">

      {/* HEADER */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between z-10 shadow-sm shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 bg-[#D4AF37] rounded flex items-center justify-center text-white font-bold text-xl shadow-inner">
            T
          </div>
          <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">
            TraDat<span className="text-[#D4AF37]">Analytix</span>
          </h1>
        </div>
      </header>

      {/* TABS */}
      <div className="bg-white border-b border-gray-200 px-6 py-2 flex space-x-2 z-10 shrink-0">
        {["Swing Momentum", "Portfolio Analysis"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded text-sm font-semibold flex items-center space-x-2 transition-all ${activeTab === tab
              ? "bg-slate-800 text-white shadow"
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              }`}
          >
            {tab === "Swing Momentum" ? <Home size={15} /> : <LineChart size={15} />}
            <span>{tab}</span>
          </button>
        ))}
      </div>

      {/* FIX 2: flex-1 min-h-0 perfectly fills the remaining space WITHOUT stretching */}
      <main className="flex-1 min-h-0 p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-hidden">

        {/* LEFT COLUMN */}
        <div className="lg:col-span-5 flex flex-col gap-4 h-full min-h-0">

          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-end justify-between shrink-0">
            <div className="flex flex-col gap-1.5 w-2/3">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Scan Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2 text-slate-400" size={16} />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="pl-9 pr-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37] outline-none w-full text-sm font-semibold text-slate-700"
                />
              </div>
            </div>
            <button
              onClick={fetchStockData}
              className="bg-[#D4AF37] hover:bg-[#c4a130] text-white px-5 py-1.5 rounded font-bold text-sm flex items-center gap-2 transition-colors shadow-sm"
            >
              {loading ? "Loading..." : "Run Scan"}
            </button>
          </div>

          {/* TABLE CONTAINER */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col min-h-0 overflow-hidden">

            <div className="p-3 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
              <h2 className="font-bold text-slate-700 text-sm">Market Scans</h2>
              <span className="text-xs font-bold bg-slate-200 text-slate-700 px-2.5 py-0.5 rounded-full">
                {stockData.length} Total
              </span>
            </div>

            <div className="flex-1 overflow-y-auto bg-white min-h-0">
              <table className="w-full text-left border-collapse">
                <thead className="bg-white text-slate-500 uppercase text-[10px] tracking-wider sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-4 py-3 font-bold cursor-pointer hover:bg-slate-50 border-b border-slate-200" onClick={() => handleSort('name')}>
                      <div className="flex items-center gap-1">Symbol <ArrowUpDown size={12} className="text-slate-400" /></div>
                    </th>
                    <th className="px-4 py-3 font-bold cursor-pointer hover:bg-slate-50 border-b border-slate-200" onClick={() => handleSort('Breakout_price')}>
                      <div className="flex items-center gap-1">Price <ArrowUpDown size={12} className="text-slate-400" /></div>
                    </th>
                    <th className="px-4 py-3 font-bold cursor-pointer hover:bg-slate-50 border-b border-slate-200" onClick={() => handleSort('Days since consolidation')}>
                      <div className="flex items-center gap-1">Range Days <ArrowUpDown size={12} className="text-slate-400" /></div>
                    </th>
                    <th className="px-4 py-3 font-bold cursor-pointer hover:bg-slate-50 border-b border-slate-200" onClick={() => handleSort('dist_ema_200')}>
                      <div className="flex items-center gap-1">Dist 200 EMA <ArrowUpDown size={12} className="text-slate-400" /></div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[13px]">
                  {currentItems.length === 0 && (
                    <tr><td colSpan="4" className="text-center py-12 text-slate-400 font-medium">No scans available</td></tr>
                  )}
                  {currentItems.map((stock, idx) => (
                    <tr
                      key={idx}
                      onClick={() => handleRowClick(stock)}
                      className={`cursor-pointer transition-colors ${selectedStock?.name === stock.name ? "bg-[#D4AF37]/10" : "hover:bg-slate-50"
                        }`}
                    >
                      <td className="px-4 py-2.5 font-bold text-slate-800">
                        {stock.name || "Unknown"}
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-slate-600 tabular-nums">
                        ₹{stock.Breakout_price || "N/A"}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-slate-500 tabular-nums">
                        {stock['Days since consolidation'] ?? "N/A"}
                      </td>
                      <td className={`px-4 py-2.5 font-bold tabular-nums ${stock.dist_ema_200 > 0 ? "text-emerald-600" : stock.dist_ema_200 < 0 && stock.dist_ema_200 !== -99 ? "text-rose-600" : "text-slate-400"
                        }`}>
                        {stock.dist_ema_200 === -99 || stock.dist_ema_200 == null
                          ? "N/A"
                          : `${parseFloat(stock.dist_ema_200).toFixed(2)}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-[13px] shrink-0">
              <div className="flex items-center gap-2 text-slate-600 font-medium">
                <span>Show</span>
                <select
                  value={itemsPerPage}
                  onChange={handlePageSizeChange}
                  className="border border-slate-300 bg-white rounded px-2 py-1 text-slate-700 outline-none focus:border-[#D4AF37]"
                >
                  <option value={10}>10</option>
                  <option value={30}>30</option>
                  <option value={50}>50</option>
                </select>
                <span>rows</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-slate-500 font-medium">
                  Page <span className="font-bold text-slate-700">{currentPage}</span> of {totalPages || 1}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1 rounded border border-slate-300 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="p-1 rounded border border-slate-300 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-7 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full min-h-0 overflow-hidden">
          <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-slate-50 z-10 shrink-0">
            <div className="flex items-center gap-2">
              <BarChart2 size={16} className="text-[#D4AF37]" />
              <h2 className="font-bold text-slate-700 text-sm">
                {selectedStock ? `${selectedStock.name} - 1Y History` : "Interactive Chart"}
              </h2>
            </div>
            {selectedStock && (
              <span className="text-xs font-mono font-bold bg-slate-800 text-white px-2.5 py-1 rounded">
                ₹{selectedStock.Breakout_price}
              </span>
            )}
          </div>

          <div className="flex-1 bg-white flex items-center justify-center relative w-full min-h-0 p-4">
            {selectedStock && chartData && !isChartLoading ? (
              <div className="absolute inset-0 pt-4 px-2 pb-2">
                <ChartComponent data={chartData} />
              </div>
            ) : (
              <div className="text-center">
                <BarChart2 size={48} className={`mx-auto mb-4 ${isChartLoading ? 'text-[#D4AF37] animate-pulse' : 'text-slate-300'}`} />
                <p className="text-slate-500 font-medium">
                  {isChartLoading ? "Loading real Upstox data..." : "Select a stock from the table to view its chart"}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* FLOATING AI CHAT WIDGET */}
      <div className={`fixed bottom-24 right-6 w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col h-[500px] z-50 transition-all duration-300 transform origin-bottom-right ${isChatOpen ? "scale-100 opacity-100" : "scale-0 opacity-0 pointer-events-none"
        }`}>
        <div className="bg-slate-900 rounded-t-2xl p-4 flex items-center justify-between text-white shadow-md z-10">
          <div className="flex items-center gap-2">
            <div className="bg-[#D4AF37] p-1.5 rounded-full">
              <Bot size={18} className="text-white" />
            </div>
            <div>
              <h2 className="font-bold text-sm tracking-wide">Stock-AI Analyst</h2>
              <p className="text-[10px] text-slate-400 font-medium">Powered by Gemini</p>
            </div>
          </div>
          <button onClick={() => setIsChatOpen(false)} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 p-4 overflow-y-auto bg-[#f8f9fa] flex flex-col gap-4">
          {chatHistory.length === 0 && (
            <div className="text-center mt-10">
              <Bot size={32} className="text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-medium">I can analyze technicals, fundamentals, and recent sentiment.</p>
            </div>
          )}
          {chatHistory.map((msg, idx) => (
            <div key={idx} className={`p-3 rounded-xl max-w-[85%] text-sm shadow-sm font-medium ${msg.role === "user"
              ? "bg-[#D4AF37] text-white self-end rounded-br-none"
              : "bg-white border border-slate-200 text-slate-700 self-start rounded-bl-none"
              }`}>
              {msg.text}
            </div>
          ))}
        </div>

        <form onSubmit={handleChatSubmit} className="p-3 bg-white border-t border-slate-200 rounded-b-2xl flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Ask about this setup..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-[#D4AF37] outline-none transition-all"
          />
          <button type="submit" className="bg-slate-900 text-white p-2.5 rounded-lg hover:bg-slate-800 transition-colors shadow-sm">
            <ArrowRight size={18} />
          </button>
        </form>
      </div>

      <button
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="fixed bottom-6 right-6 bg-slate-900 hover:bg-slate-800 text-white p-4 rounded-full shadow-2xl z-50 transition-transform hover:scale-105 active:scale-95 flex items-center justify-center group"
      >
        {isChatOpen ? (
          <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
        ) : (
          <MessageSquare size={24} className="group-hover:-translate-y-1 transition-transform duration-300" />
        )}
        {!isChatOpen && (
          <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-[#D4AF37] border-2 border-[#f8f9fa] rounded-full"></span>
        )}
      </button>

    </div>
  );
}