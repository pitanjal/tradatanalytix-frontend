// @ts-nocheck
import React, { useEffect, useRef, useState } from 'react';
import { createChart, CandlestickSeries, LineSeries } from 'lightweight-charts';

// --- EMA CALCULATOR HELPER ---
function calculateEMA(data, period) {
    const emaData = [];
    const k = 2 / (period + 1);
    let ema = data[0]?.close || 0;

    for (let i = 0; i < data.length; i++) {
        ema = (data[i].close - ema) * k + ema;
        if (i >= period) {
            emaData.push({ time: data[i].time, value: ema });
        }
    }
    return emaData;
}

export default function ChartComponent({ data }) {
    const chartContainerRef = useRef(null);
    const chartRef = useRef(null);

    // State and Ref for Drawing Mode
    const [isDrawing, setIsDrawing] = useState(false);
    const isDrawingRef = useRef(false); // We need a ref so the event listener always sees the latest value

    // Toggle Draw Mode
    const toggleDrawMode = () => {
        isDrawingRef.current = !isDrawingRef.current;
        setIsDrawing(isDrawingRef.current);
    };

    useEffect(() => {
        if (!chartContainerRef.current || !data || data.length === 0) return;

        // 1. Create the Main Chart
        const chart = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.clientWidth,
            height: 400,
            layout: { background: { color: '#ffffff' }, textColor: '#333' },
            grid: { vertLines: { color: '#f0f3fa' }, horzLines: { color: '#f0f3fa' } },
            timeScale: {
                borderColor: '#cccccc',
                rightOffset: 30,
            },
        });

        // 2. Add Candlesticks
        const candlestickSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderVisible: false,
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
        });
        candlestickSeries.setData(data);

        // 3. Calculate EMAs
        const ema20Data = calculateEMA(data, 20);
        const ema50Data = calculateEMA(data, 50);
        const ema100Data = calculateEMA(data, 100);
        const ema200Data = calculateEMA(data, 200);

        // 4. Plot EMAs (Transparent)
        const ema20Series = chart.addSeries(LineSeries, { color: 'rgba(41, 98, 255, 0.5)', lineWidth: 1, title: 'EMA 20', crosshairMarkerVisible: false });
        ema20Series.setData(ema20Data);

        const ema50Series = chart.addSeries(LineSeries, { color: 'rgba(255, 109, 0, 0.5)', lineWidth: 1, title: 'EMA 50', crosshairMarkerVisible: false });
        ema50Series.setData(ema50Data);

        const ema100Series = chart.addSeries(LineSeries, { color: 'rgba(0, 200, 83, 0.5)', lineWidth: 1.5, title: 'EMA 100', crosshairMarkerVisible: false });
        ema100Series.setData(ema100Data);

        const ema200Series = chart.addSeries(LineSeries, { color: 'rgba(213, 0, 0, 0.6)', lineWidth: 2, title: 'EMA 200', crosshairMarkerVisible: false });
        ema200Series.setData(ema200Data);

        // --- CLICK HANDLER FOR DRAWING S/R LINES ---
        const handleChartClick = (param) => {
            // Only proceed if user clicked on the chart AND drawing mode is active
            if (!param.point || !isDrawingRef.current) return;

            // Convert the mouse Y pixel coordinate into an actual stock price
            const price = candlestickSeries.coordinateToPrice(param.point.y);

            if (price !== null) {
                // Draw the horizontal line
                candlestickSeries.createPriceLine({
                    price: price,
                    color: '#131722', // Dark slate for contrast
                    lineWidth: 2,
                    lineStyle: 2, // 2 = Dashed line
                    axisLabelVisible: true,
                    title: 'S/R',
                });

                // Automatically turn off drawing mode after they place one line
                isDrawingRef.current = false;
                setIsDrawing(false);
            }
        };

        // Attach the click listener
        chart.subscribeClick(handleChartClick);

        chart.timeScale().fitContent();
        chartRef.current = chart;

        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };
        window.addEventListener('resize', handleResize);

        return () => {
            chart.unsubscribeClick(handleChartClick);
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [data]);

    // --- ZOOM CONTROL HANDLERS ---
    const handleZoomIn = () => {
        if (!chartRef.current) return;
        const timeScale = chartRef.current.timeScale();
        const currentRange = timeScale.getVisibleLogicalRange();
        if (currentRange) {
            const zoomAmount = (currentRange.to - currentRange.from) * 0.1; // Zoom by 10%
            timeScale.setVisibleLogicalRange({
                from: currentRange.from + zoomAmount,
                to: currentRange.to - zoomAmount,
            });
        }
    };

    const handleZoomOut = () => {
        if (!chartRef.current) return;
        const timeScale = chartRef.current.timeScale();
        const currentRange = timeScale.getVisibleLogicalRange();
        if (currentRange) {
            const zoomAmount = (currentRange.to - currentRange.from) * 0.1;
            timeScale.setVisibleLogicalRange({
                from: currentRange.from - zoomAmount,
                to: currentRange.to + zoomAmount,
            });
        }
    };

    return (
        <div style={{ width: '100%', position: 'relative' }}>

            {/* FLOATING CHART TOOLBAR */}
            <div className="absolute top-4 left-4 z-10 flex gap-2">
                <button
                    onClick={handleZoomIn}
                    title="Zoom In"
                    className="w-8 h-8 flex items-center justify-center bg-white border border-slate-300 rounded shadow-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                    +
                </button>
                <button
                    onClick={handleZoomOut}
                    title="Zoom Out"
                    className="w-8 h-8 flex items-center justify-center bg-white border border-slate-300 rounded shadow-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                    -
                </button>

                <div className="w-px h-8 bg-slate-300 mx-1"></div> {/* Divider */}

                <button
                    onClick={toggleDrawMode}
                    className={`px-3 h-8 flex items-center justify-center border rounded shadow-sm text-xs font-bold transition-all ${isDrawing
                        ? 'bg-[#D4AF37] border-[#D4AF37] text-white'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                >
                    {isDrawing ? 'Click chart to place line' : 'Draw S/R Line'}
                </button>
            </div>

            {/* CHART CONTAINER */}
            <div ref={chartContainerRef} style={{ width: '100%', height: '400px' }} />
        </div>
    );
}