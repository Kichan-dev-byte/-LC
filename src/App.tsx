/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Monitor, Users, ShieldAlert, Coins, History, TrendingUp, Settings as SettingsIcon,
  LayoutGrid, Laptop, Columns, Play, MessageSquare, Plus, RefreshCw, LogOut, Radio
} from 'lucide-react';

import { Settings } from './types';
import CashierDashboard from './components/CashierDashboard';
import PlayerManagement from './components/PlayerManagement';
import ReportsPanel from './components/ReportsPanel';
import RatesConfig from './components/RatesConfig';
import ClientEmulator from './components/ClientEmulator';
import SystemSettings from './components/SystemSettings';

export default function App() {
  // Main view modes: 'cashier' | 'client' | 'splitscreen'
  const [viewMode, setViewMode] = useState<'cashier' | 'client' | 'splitscreen'>('splitscreen');
  
  // Cashier internal tabs: 'dashboard' | 'players' | 'rates' | 'reports' | 'settings'
  const [cashierTab, setCashierTab] = useState<'dashboard' | 'players' | 'rates' | 'reports' | 'settings'>('dashboard');

  // Core settings synced from backend
  const [settings, setSettings] = useState<Settings>({
    shopName: 'Elite LAN Gaming Center',
    currency: 'PHP',
    language: 'English',
    darkMode: true,
    autoBackup: true,
  });

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (e) {
      console.error('Failed to load system settings', e);
    }
  };

  const handleSaveSettings = async (updated: Settings) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        setSettings(updated);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0B0D] text-slate-200 flex flex-col justify-between" id="lan-app-root">
      
      {/* Dynamic Upper Navigation Header */}
      <header className="border-b border-[#1F2937] bg-[#111318] px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 z-40 sticky top-0">
        
        {/* Shop logo and title */}
        <div className="flex items-center gap-3 select-none">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-display font-black text-lg shadow-lg shadow-indigo-500/10">
              LC
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border border-gray-950"></span>
            </span>
          </div>

          <div>
            <h1 className="text-base font-extrabold tracking-tight font-display text-white uppercase">
              {settings.shopName}
            </h1>
            <p className="text-[10px] text-indigo-400 font-mono tracking-widest uppercase flex items-center gap-1">
              <Radio className="w-2.5 h-2.5 text-indigo-500 animate-pulse" /> Core LAN Controller Active
            </p>
          </div>
        </div>

        {/* Global Workspace Mode select tabs */}
        <div className="flex bg-[#0A0B0D] p-1.5 rounded-xl border border-[#1F2937] shadow-inner">
          {[
            { id: 'splitscreen', label: 'Dual Sandbox (Review View)', icon: Columns },
            { id: 'cashier', label: 'Cashier Master Console', icon: Laptop },
            { id: 'client', label: 'Client PC Terminal', icon: Monitor },
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => setViewMode(mode.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition duration-300 ${
                viewMode === mode.id 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <mode.icon className="w-4 h-4" />
              <span className="hidden md:inline">{mode.label}</span>
            </button>
          ))}
        </div>

      </header>

      {/* Main Workspace Frame container */}
      <main className="flex-1 p-6 relative overflow-hidden">
        
        <AnimatePresence mode="wait">
          
          {viewMode === 'splitscreen' && (
            /* --- SPLIT SCREEN INTERACTIVE REVIEW VIEW --- */
            <motion.div 
              key="splitscreen"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-start"
            >
              {/* Left Side Cashier Workspace (3 of 5 cols) */}
              <div className="xl:col-span-3 space-y-6 border border-[#1F2937] bg-[#111318] p-5 rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.3)]">
                <div className="flex items-center justify-between border-b border-[#1F2937] pb-3">
                  <h2 className="text-sm font-bold font-display uppercase tracking-wider text-indigo-400">
                    Live Cashier Management Console
                  </h2>
                  <div className="flex gap-1 bg-[#0A0B0D] p-1 rounded-lg border border-[#1F2937] text-[10px] font-bold">
                    <button 
                      onClick={() => setCashierTab('dashboard')} 
                      className={`px-2 py-1 rounded ${cashierTab === 'dashboard' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-white'}`}
                    >
                      Grid
                    </button>
                    <button 
                      onClick={() => setCashierTab('players')} 
                      className={`px-2 py-1 rounded ${cashierTab === 'players' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-white'}`}
                    >
                      Members
                    </button>
                  </div>
                </div>

                {cashierTab === 'dashboard' && <CashierDashboard currency={settings.currency} />}
                {cashierTab === 'players' && <PlayerManagement currency={settings.currency} />}
              </div>

              {/* Right Side Client Workspace (2 of 5 cols) */}
              <div className="xl:col-span-2 space-y-4 border border-[#1F2937] bg-[#111318] p-5 rounded-2xl sticky top-24 shadow-[0_0_20px_rgba(0,0,0,0.3)]">
                <div className="flex items-center justify-between border-b border-[#1F2937] pb-3">
                  <h2 className="text-sm font-bold font-display uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-rose-500 animate-pulse" /> Live Client Monitor Screen
                  </h2>
                  <span className="text-[10px] font-mono text-slate-500 uppercase">Interactive Sandbox</span>
                </div>

                <ClientEmulator currency={settings.currency} shopName={settings.shopName} />
              </div>
            </motion.div>
          )}

          {viewMode === 'cashier' && (
            /* --- CASHIER MASTER WORKSPACE FULL SCREEN --- */
            <motion.div 
              key="cashier"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Cashier internal secondary tabs */}
              <div className="flex flex-wrap gap-2.5 bg-[#111318] p-2 border border-[#1F2937] rounded-xl max-w-max select-none">
                {[
                  { id: 'dashboard', label: 'Computers Grid', icon: LayoutGrid },
                  { id: 'players', label: 'Member Registry', icon: Users },
                  { id: 'rates', label: 'Rates Config', icon: Coins },
                  { id: 'reports', label: 'Sales & Audits', icon: TrendingUp },
                  { id: 'settings', label: 'Branding & DB', icon: SettingsIcon },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setCashierTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition duration-300 ${
                      cashierTab === tab.id 
                        ? 'bg-indigo-600/10 border border-indigo-500/20 text-indigo-400' 
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Render Tab Contents */}
              <div className="mt-4">
                {cashierTab === 'dashboard' && <CashierDashboard currency={settings.currency} />}
                {cashierTab === 'players' && <PlayerManagement currency={settings.currency} />}
                {cashierTab === 'rates' && <RatesConfig currency={settings.currency} />}
                {cashierTab === 'reports' && <ReportsPanel currency={settings.currency} />}
                {cashierTab === 'settings' && <SystemSettings settings={settings} onSaveSettings={handleSaveSettings} />}
              </div>
            </motion.div>
          )}

          {viewMode === 'client' && (
            /* --- CLIENT MONITOR FULL SCREEN --- */
            <motion.div 
              key="client"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-5xl mx-auto"
            >
              <ClientEmulator currency={settings.currency} shopName={settings.shopName} />
            </motion.div>
          )}

        </AnimatePresence>

      </main>

      {/* Global footer */}
      <footer className="border-t border-[#1F2937] bg-[#111318] py-4 px-6 text-center text-[10px] text-slate-500 font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-2 select-none">
        <span>© 2026 {settings.shopName} LLC. Elite LAN Administration Core.</span>
        <span>Secure Session Tunnel 100% active on port 3000.</span>
      </footer>

    </div>
  );
}
