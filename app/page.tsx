// @ts-nocheck
"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { LineChart, Home, Bot, Calendar, ArrowRight, ArrowUpDown, MessageSquare, X, BarChart2, ChevronLeft, ChevronRight, Coins, Gauge, TrendingUp, Scale, Percent, Zap, Building2, GripHorizontal } from "lucide-react";
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

  // Adjustable Fundamentals Height State (Draggable Splitter)
  const [fundamentalsHeight, setFundamentalsHeight] = useState(126);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartYRef = useRef(0);
  const startHeightRef = useRef(126);

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartYRef.current = e.clientY;
    startHeightRef.current = fundamentalsHeight;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    dragStartYRef.current = e.touches[0].clientY;
    startHeightRef.current = fundamentalsHeight;
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - dragStartYRef.current;
      // Dragging UP (deltaY < 0) increases fundamentals, dragging DOWN (deltaY > 0) decreases it
      const newHeight = Math.min(Math.max(startHeightRef.current - deltaY, 40), 380);
      setFundamentalsHeight(newHeight);
    };

    const handleTouchMove = (e: TouchEvent) => {
      const deltaY = e.touches[0].clientY - dragStartYRef.current;
      const newHeight = Math.min(Math.max(startHeightRef.current - deltaY, 40), 380);
      setFundamentalsHeight(newHeight);
    };

    const handleDragEnd = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleDragEnd);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleDragEnd);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleDragEnd);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleDragEnd);
    };
  }, [isDragging]);

  const fetchApi = async (endpoint: string) => {
    try {
      const localRes = await fetch(`http://localhost:8000${endpoint}`, { signal: AbortSignal.timeout(2000) });
      if (localRes.ok) return localRes;
    } catch (e) {
      // Local server unavailable or timed out, fallback to Render
    }
    return fetch(`https://tradatanalytix-backend.onrender.com${endpoint}`);
  };

  const formatValue = (val: any, type: 'currency' | 'pe' | 'percent' | 'ratio' | 'turnover') => {
    if (val === null || val === undefined || val === '' || val === -99) return 'N/A';
    const num = Number(val);
    if (isNaN(num)) return 'N/A';

    switch (type) {
      case 'currency':
        return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
      case 'pe':
        return num.toFixed(2);
      case 'percent':
        return `${num > 0 ? '+' : ''}${num.toFixed(2)}%`;
      case 'ratio':
        return `${num.toFixed(2)}x`;
      case 'turnover':
        return `${num.toFixed(2)}x`;
      default:
        return num.toString();
    }
  };

  const fetchStockData = async () => {
    setLoading(true);
    try {
      const res = await fetchApi(`/api/swing-momentum?date=${selectedDate}`);
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

  // Automatically fetch the latest available data on load
  useEffect(() => {
    const fetchLatestData = async () => {
      setLoading(true);
      let attempts = 0;
      let dateToTry = new Date();

      while (attempts < 7) {
        const dateStr = dateToTry.toISOString().split("T")[0];
        try {
          const res = await fetchApi(`/api/swing-momentum?date=${dateStr}`);
          const result = await res.json();
          if (result.data && result.data.length > 0) {
            setStockData(result.data);
            setSelectedDate(dateStr); // Update the date picker to the date that actually has data
            setCurrentPage(1);
            setLoading(false);
            return;
          }
        } catch (error) {
          console.error(`Failed to fetch data for ${dateStr}`, error);
        }

        // Go back one day and try again
        dateToTry.setDate(dateToTry.getDate() - 1);
        attempts++;
      }

      // If no data found in the last 7 days, just stop loading
      setLoading(false);
    };

    fetchLatestData();
  }, []);

  const handleRowClick = async (stock: any) => {
    setSelectedStock(stock);
    setChartData(null);
    setIsChartLoading(true);

    try {
      const instrument = stock.name;
      const res = await fetchApi(`/api/stock-history/${encodeURIComponent(instrument)}`);

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
    <div className={`h-screen bg-[#f8f9fa] flex flex-col font-sans relative overflow-hidden ${isDragging ? 'select-none cursor-row-resize' : ''}`}>

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
      <div className="bg-white border-b border-gray-200 px-6 py-2 flex space-x-2 z-10 shrink-0 overflow-x-auto">
        {["Swing Momentum", "Portfolio Analysis"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded text-sm font-semibold flex items-center space-x-2 whitespace-nowrap transition-all ${activeTab === tab
              ? "bg-slate-800 text-white shadow"
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              }`}
          >
            {tab === "Swing Momentum" ? <Home size={15} /> : <LineChart size={15} />}
            <span>{tab}</span>
          </button>
        ))}
      </div>

      {/* FIX 1: Responsive Main Container 
        Mobile: flex-col, allows scrolling (overflow-y-auto).
        Desktop: lg:grid, locks height (lg:overflow-hidden) to prevent dual-scrollbars. 
      */}
      <main className="flex-1 min-h-0 p-4 flex flex-col lg:grid lg:grid-cols-12 gap-4 overflow-y-auto lg:overflow-hidden">

        {/* LEFT COLUMN - TABLE */}
        <div className="lg:col-span-5 flex flex-col gap-4 shrink-0 lg:shrink min-h-[500px] lg:min-h-0 lg:h-full">

          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-end justify-between shrink-0">
            <div className="flex flex-col gap-1.5 w-[60%] sm:w-2/3">
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
              className="bg-[#D4AF37] hover:bg-[#c4a130] text-white px-4 sm:px-5 py-1.5 rounded font-bold text-sm flex items-center gap-2 transition-colors shadow-sm whitespace-nowrap"
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

            <div className="flex-1 overflow-auto bg-white min-h-0">
              <table className="w-full text-left border-collapse min-w-[400px]">
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
                    <tr><td colSpan={4} className="text-center py-12 text-slate-400 font-medium">No scans available</td></tr>
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
              <div className="flex items-center gap-2 text-slate-600 font-medium hidden sm:flex">
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
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
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

        {/* RIGHT COLUMN - CHART & METRICS */}
        {/* Generous min-height ensures chart never feels squashed on small screens */}
        <div className="lg:col-span-7 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col shrink-0 lg:shrink min-h-[580px] sm:min-h-[640px] lg:min-h-0 lg:h-full overflow-hidden">

          <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-slate-50 z-10 shrink-0">
            <div className="flex items-center gap-2">
              <BarChart2 size={16} className="text-[#D4AF37]" />
              <h2 className="font-bold text-slate-700 text-sm truncate">
                {selectedStock ? `${selectedStock.name} - 1Y History` : "Interactive Chart"}
              </h2>
            </div>
            {selectedStock && (
              <span className="text-xs font-mono font-bold bg-slate-800 text-white px-2.5 py-1 rounded shrink-0">
                ₹{selectedStock.Breakout_price}
              </span>
            )}
          </div>

          {/* Chart occupies major height/length of the panel */}
          <div className={`flex-1 min-h-[160px] bg-white relative w-full ${isDragging ? 'pointer-events-none select-none' : ''}`}>
            {selectedStock && chartData && !isChartLoading ? (
              <div className="absolute inset-0 p-4">
                <ChartComponent data={chartData} />
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <BarChart2 size={48} className={`mb-4 ${isChartLoading ? 'text-[#D4AF37] animate-pulse' : 'text-slate-300'}`} />
                <p className="text-slate-500 font-medium px-4 text-center text-sm">
                  {isChartLoading ? "Loading real Upstox data..." : "Select a stock from the table to view its chart"}
                </p>
              </div>
            )}
          </div>

          {/* DRAGGABLE RESIZER HANDLE */}
          {selectedStock && (
            <div
              onMouseDown={handleDragStart}
              onTouchStart={handleTouchStart}
              onDoubleClick={() => setFundamentalsHeight(126)}
              className="h-3.5 -my-1 cursor-row-resize flex items-center justify-center z-20 group relative select-none hover:bg-[#D4AF37]/10 active:bg-[#D4AF37]/25 transition-colors"
              title="Drag up or down to adjust chart & fundamentals height (Double-click to reset)"
            >
              <div className="w-full border-t border-slate-200 group-hover:border-[#D4AF37]/70 group-active:border-[#D4AF37] transition-colors relative flex items-center justify-center">
                <div className="absolute px-2.5 py-0.5 bg-white group-hover:bg-[#D4AF37] group-active:bg-[#D4AF37] border border-slate-300 group-hover:border-[#D4AF37] rounded-full transition-all flex items-center gap-1 shadow-2xs">
                  <GripHorizontal size={13} className="text-slate-400 group-hover:text-white transition-colors" />
                </div>
              </div>
            </div>
          )}

          {/* COMPANY FUNDAMENTALS SECTION - User-Adjustable Drag Height */}
          {selectedStock && (
            <div
              style={{ height: `${fundamentalsHeight}px` }}
              className={`p-2 sm:p-2.5 bg-gradient-to-b from-slate-50/95 to-slate-100/60 shrink-0 flex flex-col gap-1.5 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent] ${
                isDragging ? '' : 'transition-[height] duration-75'
              }`}
            >
              {/* Header */}
              <div className="sticky top-0 bg-slate-50/95 backdrop-blur-xs flex items-center justify-between z-10 pb-0.5">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#D4AF37] ring-4 ring-[#D4AF37]/20" />
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 size={13} className="text-[#D4AF37]" />
                    Company Fundamentals
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                    {fundamentalsHeight >= 190
                      ? "• All metrics shown (drag to adjust)"
                      : fundamentalsHeight <= 60
                      ? "• Collapsed (drag up to expand)"
                      : "• Drag bar or scroll for more"}
                  </span>
                </div>
                {selectedStock['Industry Name'] && (
                  <span className="text-[11px] font-semibold text-slate-600 bg-white border border-slate-200/90 shadow-2xs px-2 py-0.5 rounded-full truncate max-w-[200px]">
                    {selectedStock['Industry Name']}
                  </span>
                )}
              </div>

              {/* 6 Fundamentals Cards Grid - 2 rows x 3 columns */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">

                {/* 1. Market Cap */}
                <div className="bg-white rounded-lg border border-slate-200/80 p-2 shadow-2xs hover:border-[#D4AF37]/60 hover:shadow-xs transition-all duration-150 flex flex-col justify-between h-[68px]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="p-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200/50">
                        <Coins size={11} />
                      </div>
                      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
                        Market Cap
                      </span>
                    </div>
                    <span className="text-[9px] font-bold font-mono text-slate-400 bg-slate-100 px-1 py-0.2 rounded">
                      Cr
                    </span>
                  </div>
                  <div className="text-base font-extrabold text-slate-800 tracking-tight leading-tight my-0.5 truncate">
                    {formatValue(selectedStock['Market Capitalization'], 'currency')}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium truncate flex items-center justify-between">
                    <span>Valuation Size</span>
                  </div>
                </div>

                {/* 2. P/E (TTM) */}
                <div className="bg-white rounded-lg border border-slate-200/80 p-2 shadow-2xs hover:border-[#D4AF37]/60 hover:shadow-xs transition-all duration-150 flex flex-col justify-between h-[68px]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="p-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-200/50">
                        <Gauge size={11} />
                      </div>
                      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
                        P/E Ratio
                      </span>
                    </div>
                    <span className="text-[9px] font-bold font-mono text-slate-400 bg-slate-100 px-1 py-0.2 rounded">
                      TTM
                    </span>
                  </div>
                  <div className={`text-base font-extrabold tracking-tight leading-tight my-0.5 truncate ${Number(selectedStock['PE TTM Price to Earnings']) < 0 ? 'text-rose-600' : 'text-slate-800'
                    }`}>
                    {formatValue(selectedStock['PE TTM Price to Earnings'], 'pe')}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium truncate flex items-center justify-between">
                    <span>{Number(selectedStock['PE TTM Price to Earnings']) < 0 ? 'Negative (Loss)' : 'Multiple'}</span>
                  </div>
                </div>

                {/* 3. ROE (Annual) */}
                <div className="bg-white rounded-lg border border-slate-200/80 p-2 shadow-2xs hover:border-[#D4AF37]/60 hover:shadow-xs transition-all duration-150 flex flex-col justify-between h-[68px]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="p-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-200/50">
                        <TrendingUp size={11} />
                      </div>
                      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
                        ROE
                      </span>
                    </div>
                    <span className="text-[9px] font-bold font-mono text-slate-400 bg-slate-100 px-1 py-0.2 rounded">
                      Annual
                    </span>
                  </div>
                  <div className={`text-base font-extrabold tracking-tight leading-tight my-0.5 truncate ${Number(selectedStock['ROE Annual %']) > 15
                      ? 'text-emerald-600'
                      : Number(selectedStock['ROE Annual %']) > 0
                        ? 'text-emerald-700'
                        : Number(selectedStock['ROE Annual %']) < 0
                          ? 'text-rose-600'
                          : 'text-slate-800'
                    }`}>
                    {formatValue(selectedStock['ROE Annual %'], 'percent')}
                  </div>
                  <div className="text-[10px] font-medium truncate flex items-center justify-between">
                    <span className={Number(selectedStock['ROE Annual %']) > 15 ? 'text-emerald-600 font-semibold' : 'text-slate-400'}>
                      {Number(selectedStock['ROE Annual %']) > 15 ? 'High Return (>15%)' : 'Return on Equity'}
                    </span>
                  </div>
                </div>

                {/* 4. Total Debt to Total Equity Annual */}
                <div className="bg-white rounded-lg border border-slate-200/80 p-2 shadow-2xs hover:border-[#D4AF37]/60 hover:shadow-xs transition-all duration-150 flex flex-col justify-between h-[68px]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="p-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200/50">
                        <Scale size={11} />
                      </div>
                      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
                        Debt / Equity
                      </span>
                    </div>
                    <span className="text-[9px] font-bold font-mono text-slate-400 bg-slate-100 px-1 py-0.2 rounded">
                      Annual
                    </span>
                  </div>
                  <div className={`text-base font-extrabold tracking-tight leading-tight my-0.5 truncate ${Number(selectedStock['Total Debt to Total Equity Annual']) <= 0.5
                      ? 'text-emerald-600'
                      : Number(selectedStock['Total Debt to Total Equity Annual']) <= 1.2
                        ? 'text-slate-800'
                        : 'text-amber-600'
                    }`}>
                    {formatValue(selectedStock['Total Debt to Total Equity Annual'], 'ratio')}
                  </div>
                  <div className="text-[10px] font-medium truncate flex items-center justify-between">
                    {(() => {
                      const de = Number(selectedStock['Total Debt to Total Equity Annual']);
                      if (isNaN(de) || selectedStock['Total Debt to Total Equity Annual'] == null) return <span className="text-slate-400">Leverage</span>;
                      if (de === 0) return <span className="text-emerald-600 font-semibold">Zero Debt</span>;
                      if (de <= 0.5) return <span className="text-emerald-600 font-semibold">Low Leverage</span>;
                      if (de <= 1.2) return <span className="text-slate-500">Moderate</span>;
                      return <span className="text-amber-600 font-semibold">High Leverage</span>;
                    })()}
                  </div>
                </div>

                {/* 5. Net Profit Margin Annual % */}
                <div className="bg-white rounded-lg border border-slate-200/80 p-2 shadow-2xs hover:border-[#D4AF37]/60 hover:shadow-xs transition-all duration-150 flex flex-col justify-between h-[68px]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="p-0.5 rounded bg-teal-50 text-teal-600 border border-teal-200/50">
                        <Percent size={11} />
                      </div>
                      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
                        Net Margin
                      </span>
                    </div>
                    <span className="text-[9px] font-bold font-mono text-slate-400 bg-slate-100 px-1 py-0.2 rounded">
                      Annual
                    </span>
                  </div>
                  <div className={`text-base font-extrabold tracking-tight leading-tight my-0.5 truncate ${Number(selectedStock['Net Profit Margin Annual %']) > 10
                      ? 'text-emerald-600'
                      : Number(selectedStock['Net Profit Margin Annual %']) > 0
                        ? 'text-teal-700'
                        : Number(selectedStock['Net Profit Margin Annual %']) < 0
                          ? 'text-rose-600'
                          : 'text-slate-800'
                    }`}>
                    {formatValue(selectedStock['Net Profit Margin Annual %'], 'percent')}
                  </div>
                  <div className="text-[10px] font-medium truncate flex items-center justify-between">
                    {(() => {
                      const npm = Number(selectedStock['Net Profit Margin Annual %']);
                      if (isNaN(npm) || selectedStock['Net Profit Margin Annual %'] == null) return <span className="text-slate-400">Profitability</span>;
                      if (npm > 15) return <span className="text-emerald-600 font-semibold">High Margin</span>;
                      if (npm > 0) return <span className="text-teal-600 font-semibold">Profitable</span>;
                      return <span className="text-rose-600 font-semibold">Net Loss</span>;
                    })()}
                  </div>
                </div>

                {/* 6. Asset Turnover Annual % */}
                <div className="bg-white rounded-lg border border-slate-200/80 p-2 shadow-2xs hover:border-[#D4AF37]/60 hover:shadow-xs transition-all duration-150 flex flex-col justify-between h-[68px]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="p-0.5 rounded bg-purple-50 text-purple-600 border border-purple-200/50">
                        <Zap size={11} />
                      </div>
                      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
                        Asset Turnover
                      </span>
                    </div>
                    <span className="text-[9px] font-bold font-mono text-slate-400 bg-slate-100 px-1 py-0.2 rounded">
                      Annual
                    </span>
                  </div>
                  <div className={`text-base font-extrabold tracking-tight leading-tight my-0.5 truncate ${Number(selectedStock['Asset Turnover Annual %']) >= 1.0
                      ? 'text-purple-700'
                      : 'text-slate-800'
                    }`}>
                    {formatValue(selectedStock['Asset Turnover Annual %'], 'turnover')}
                  </div>
                  <div className="text-[10px] font-medium truncate flex items-center justify-between">
                    {(() => {
                      const at = Number(selectedStock['Asset Turnover Annual %']);
                      if (isNaN(at) || selectedStock['Asset Turnover Annual %'] == null) return <span className="text-slate-400">Efficiency</span>;
                      if (at >= 1.0) return <span className="text-purple-600 font-semibold">High Efficiency</span>;
                      return <span className="text-slate-500">Asset Heavy</span>;
                    })()}
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      </main>

      {/* FLOATING AI CHAT WIDGET */}
      <div className={`fixed bottom-24 right-4 sm:right-6 w-[90vw] sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col h-[500px] z-50 transition-all duration-300 transform origin-bottom-right ${isChatOpen ? "scale-100 opacity-100" : "scale-0 opacity-0 pointer-events-none"
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
        className="fixed bottom-6 right-4 sm:right-6 bg-slate-900 hover:bg-slate-800 text-white p-4 rounded-full shadow-2xl z-50 transition-transform hover:scale-105 active:scale-95 flex items-center justify-center group"
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