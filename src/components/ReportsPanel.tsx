/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Users, Monitor, Award, Calendar, FileDown, 
  ArrowUpRight, ShoppingBag, Landmark, Download
} from 'lucide-react';

interface ReportsPanelProps {
  currency: string;
}

interface DailySalesData {
  date: string;
  sales: number;
}

interface TopPlayerData {
  id: string;
  name: string;
  amount: number;
  visits: number;
}

interface MostUsedPcData {
  pcId: string;
  count: number;
}

export default function ReportsPanel({ currency }: ReportsPanelProps) {
  const [dailySales, setDailySales] = useState<DailySalesData[]>([]);
  const [topPlayers, setTopPlayers] = useState<TopPlayerData[]>([]);
  const [mostUsedPcs, setMostUsedPcs] = useState<MostUsedPcData[]>([]);
  const [reportRange, setReportRange] = useState('7'); // days

  const fetchReportData = async () => {
    try {
      const res = await fetch('/api/reports/sales');
      if (res.ok) {
        const data = await res.json();
        setDailySales(data.dailySales || []);
        setTopPlayers(data.topPlayers || []);
        setMostUsedPcs(data.mostUsedPcs || []);
      }
    } catch (e) {
      console.error('Failed to load analytical reporting data', e);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, []);

  // Calculate high points for SVG scale
  const salesMax = dailySales.length > 0 ? Math.max(...dailySales.map(d => d.sales), 100) : 100;
  const pcUsageMax = mostUsedPcs.length > 0 ? Math.max(...mostUsedPcs.map(p => p.count), 5) : 5;

  // Mock export CSV function representing Excel export
  const exportToExcel = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Date,Sales Revenue\r\n";
    dailySales.forEach(d => {
      csvContent += `${d.date},${d.sales}\r\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `elite_lan_sales_report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    alert("Compiling report analytics... Print template layout triggered. Please press Ctrl+P or use system print options to save the report vector summary.");
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Header and Export actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111318] p-4 border border-[#1F2937] rounded-xl">
        <div>
          <h3 className="text-base font-bold font-display text-white">Analytical Shop Reports</h3>
          <p className="text-xs text-slate-400 mt-1">Monitor revenue streams, customer loyalty, and device operations.</p>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={exportToExcel}
            className="flex items-center gap-1.5 bg-[#1F2937] hover:bg-[#2D3748] border border-[#374151] text-xs px-3 py-2 rounded-lg font-bold text-slate-300 transition"
          >
            <Download className="w-4 h-4 text-emerald-400" /> Export Excel (CSV)
          </button>
          <button 
            onClick={exportToPDF}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3.5 py-2 rounded-lg font-bold transition shadow-lg shadow-indigo-900/10"
          >
            <FileDown className="w-4 h-4" /> Export PDF Summary
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sales Chart (SVG Vector Based) */}
        <div className="lg:col-span-2 bg-[#111318] border border-[#1F2937] rounded-xl p-5 space-y-4 shadow-lg">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-400" /> Revenue Stream (Last 7 Days)
            </h4>
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-bold">
              +14% Growth
            </span>
          </div>

          <div className="h-64 w-full relative pt-4 flex items-end">
            {/* SVG Graph */}
            <svg className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => (
                <line 
                  key={idx}
                  x1="0%"
                  y1={`${ratio * 80 + 10}%`}
                  x2="100%"
                  y2={`${ratio * 80 + 10}%`}
                  stroke="#1F2937"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
              ))}

              {/* Chart Plotting Area */}
              {dailySales.length > 1 && (() => {
                const stepX = 100 / (dailySales.length - 1);
                // Construct points
                const pts = dailySales.map((d, i) => {
                  const x = i * stepX;
                  const y = 90 - (d.sales / salesMax) * 80;
                  return { x, y, ...d };
                });
                
                const linePath = pts.map(p => `${p.x}%,${p.y}%`).join(' L ');
                const fillPath = `${linePath} L 100%,90% L 0%,90% Z`;

                return (
                  <>
                    {/* Fill */}
                    <path d={`M ${fillPath}`} fill="url(#salesGrad)" />
                    {/* Stroke */}
                    <path d={`M ${linePath}`} fill="none" stroke="#10b981" strokeWidth="2.5" />
                    {/* Data Nodes */}
                    {pts.map((p, i) => (
                      <g key={i} className="group/node">
                        <circle 
                          cx={`${p.x}%`} 
                          cy={`${p.y}%`} 
                          r="4" 
                          fill="#0A0B0D" 
                          stroke="#10b981" 
                          strokeWidth="2" 
                          className="cursor-pointer transition-all hover:scale-150"
                        />
                        {/* Tooltip on hover */}
                        <foreignObject 
                          x={`${p.x - 6}%`} 
                          y={`${p.y - 18}%`} 
                          width="80" 
                          height="40" 
                          className="overflow-visible pointer-events-none opacity-0 group-hover/node:opacity-100 transition-opacity"
                        >
                          <div className="bg-[#0A0B0D]/90 border border-emerald-500/40 text-[9px] text-emerald-400 font-mono font-bold px-1.5 py-0.5 rounded shadow text-center">
                            {currency}{p.sales}
                          </div>
                        </foreignObject>
                      </g>
                    ))}
                  </>
                );
              })()}
            </svg>
          </div>

          {/* X Axis Labels */}
          <div className="flex justify-between text-[10px] text-slate-500 font-mono px-1">
            {dailySales.map((d, idx) => (
              <span key={idx}>{d.date}</span>
            ))}
          </div>
        </div>

        {/* Client Computers Usage Distribution */}
        <div className="lg:col-span-1 bg-[#111318] border border-[#1F2937] rounded-xl p-5 space-y-4 shadow-lg">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Monitor className="w-4 h-4 text-indigo-400" /> Hot Stations (Usage Index)
          </h4>

          <div className="space-y-3.5 pt-2">
            {mostUsedPcs.length > 0 ? (
              mostUsedPcs.map((pc, idx) => {
                const pct = (pc.count / pcUsageMax) * 100;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-mono font-semibold text-slate-300">{pc.pcId}</span>
                      <span className="font-mono text-slate-500">{pc.count} sessions logged</span>
                    </div>
                    <div className="w-full bg-[#0A0B0D] h-2 rounded-full overflow-hidden border border-[#1F2937]">
                      <div 
                        className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 text-xs text-slate-500 font-mono">
                Calculating terminal workloads...
              </div>
            )}
          </div>
        </div>

        {/* Top Paying Players */}
        <div className="lg:col-span-1 bg-[#111318] border border-[#1F2937] rounded-xl p-5 space-y-4 shadow-lg">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-400" /> High Spenders (Top 5)
          </h4>

          <div className="space-y-3 pt-1">
            {topPlayers.length > 0 ? (
              topPlayers.map((player, idx) => (
                <div key={player.id} className="flex items-center justify-between p-2.5 rounded-lg bg-[#0A0B0D] border border-[#1F2937]">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs text-amber-400 font-bold">#{idx + 1}</span>
                    <div>
                      <span className="text-xs font-bold text-slate-200">@{player.name}</span>
                      <span className="text-[10px] text-slate-500 block">{player.visits} visits logged</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      {currency} {player.amount.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-xs text-slate-500 font-mono">
                Aggregating customer ledgers...
              </div>
            )}
          </div>
        </div>

        {/* Sales distribution insights */}
        <div className="lg:col-span-2 bg-[#111318] border border-[#1F2937] rounded-xl p-5 grid grid-cols-1 md:grid-cols-2 gap-4 shadow-lg">
          <div className="bg-[#0A0B0D] p-4 border border-[#1F2937] rounded-xl flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase">Business Yield Note</span>
              <span className="p-1 bg-indigo-500/10 text-indigo-400 rounded">
                <Landmark className="w-4 h-4" />
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mt-4">
              Your average member ticket value is <strong>{currency} 85.00</strong>. Gold and VIP memberships comprise <strong>45%</strong> of entire computer rentals, driving customer retention.
            </p>
          </div>

          <div className="bg-[#0A0B0D] p-4 border border-[#1F2937] rounded-xl flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-mono text-rose-400 font-bold uppercase">Hardware Vitals Summary</span>
              <span className="p-1 bg-rose-500/10 text-rose-400 rounded">
                <Monitor className="w-4 h-4" />
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mt-4">
              Daily hardware load is balanced. Station <strong>PC-03</strong> and <strong>PC-01</strong> are identified as highly favored setups, representing <strong>24%</strong> of the aggregate play minutes.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
