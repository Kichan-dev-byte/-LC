/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Settings } from '../types';
import { 
  Settings as SettingsIcon, Save, Database, ShieldCheck, RefreshCw, 
  Trash2, HelpCircle, HardDrive, Bell, Eye, CheckCircle, AlertTriangle
} from 'lucide-react';

interface SystemSettingsProps {
  settings: Settings;
  onSaveSettings: (settings: Settings) => void;
}

export default function SystemSettings({ settings, onSaveSettings }: SystemSettingsProps) {
  const [shopName, setShopName] = useState(settings.shopName);
  const [currency, setCurrency] = useState(settings.currency);
  const [language, setLanguage] = useState(settings.language);
  const [darkMode, setDarkMode] = useState(settings.darkMode);
  const [autoBackup, setAutoBackup] = useState(settings.autoBackup);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    setShopName(settings.shopName);
    setCurrency(settings.currency);
    setLanguage(settings.language);
    setDarkMode(settings.darkMode);
    setAutoBackup(settings.autoBackup);
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      shopName,
      currency,
      language,
      darkMode,
      autoBackup
    });
    setMsgType('success');
    setMsg('Shop configurations successfully applied.');
    setTimeout(() => setMsg(''), 4000);
  };

  const handleBackup = async () => {
    setLoading(true);
    setMsg('');
    try {
      const res = await fetch('/api/database/backup', { method: 'POST' });
      if (res.ok) {
        setMsgType('success');
        setMsg('Database backup snapshot saved to database_backup.json successfully!');
      } else {
        setMsgType('error');
        setMsg('Backup failed.');
      }
    } catch (e) {
      setMsgType('error');
      setMsg('Failed to contact server.');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (confirm('CAUTION: Restoring will overwrite all current players, computers, and transactions with the backup. Proceed?')) {
      setLoading(true);
      setMsg('');
      try {
        const res = await fetch('/api/database/restore', { method: 'POST' });
        if (res.ok) {
          setMsgType('success');
          setMsg('Database snapshot restored successfully! Please refresh cashier dashboard.');
          window.location.reload();
        } else {
          setMsgType('error');
          setMsg('No valid backup file found to restore.');
        }
      } catch (e) {
        setMsgType('error');
        setMsg('Failed to contact server.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111318] p-4 border border-[#1F2937] rounded-xl">
        <div>
          <h3 className="text-base font-bold font-display text-white">System Configurations</h3>
          <p className="text-xs text-slate-400 mt-1">Configure shop branding, local currency parameters, and perform system database backups.</p>
        </div>
      </div>

      {msg && (
        <div className={`p-4 rounded-xl text-xs flex items-center gap-3 border ${
          msgType === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
        }`}>
          {msgType === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
          <span>{msg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Core Settings Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-[#111318] border border-[#1F2937] rounded-xl p-5 space-y-4 shadow-lg">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 border-b border-[#1F2937] pb-2 flex items-center gap-2">
              <SettingsIcon className="w-4 h-4 text-indigo-400" /> Branding & Currency
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
              
              <div className="space-y-1 col-span-2">
                <label className="text-slate-400 font-medium">Gaming Center Shop Name</label>
                <input 
                  type="text" 
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full bg-[#0A0B0D] border border-[#1F2937] rounded-lg px-3.5 py-2 outline-none focus:border-indigo-500 text-slate-200"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Local Currency Label</label>
                <select 
                  value={currency} 
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-[#0A0B0D] border border-[#1F2937] rounded-lg px-3.5 py-2 outline-none focus:border-indigo-500 text-slate-200"
                >
                  <option value="PHP">PHP (₱)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="INR">INR (₹)</option>
                  <option value="IDR">IDR (Rp)</option>
                  <option value="MYR">MYR (RM)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-medium">System Language</label>
                <select 
                  value={language} 
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full bg-[#0A0B0D] border border-[#1F2937] rounded-lg px-3.5 py-2 outline-none focus:border-indigo-500 text-slate-200"
                >
                  <option value="English">English</option>
                  <option value="Spanish">Español</option>
                  <option value="Filipino">Filipino</option>
                  <option value="Indonesian">Bahasa Indonesia</option>
                </select>
              </div>

              <div className="col-span-2 space-y-3 pt-2">
                <div className="flex items-center justify-between p-3 bg-[#0A0B0D] border border-[#1F2937] rounded-xl">
                  <div>
                    <span className="font-semibold text-slate-200 block">Dark Mode Aesthetic</span>
                    <span className="text-[10px] text-slate-500">Enable modern neon dark skin across all cashier and client terminals.</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={darkMode}
                    onChange={(e) => setDarkMode(e.target.checked)}
                    className="w-4 h-4 accent-indigo-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-[#0A0B0D] border border-[#1F2937] rounded-xl">
                  <div>
                    <span className="font-semibold text-slate-200 block">Automatic DB Backups</span>
                    <span className="text-[10px] text-slate-500">Enable local automatic database integrity verification during server ticks.</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={autoBackup}
                    onChange={(e) => setAutoBackup(e.target.checked)}
                    className="w-4 h-4 accent-indigo-500 cursor-pointer"
                  />
                </div>
              </div>

            </div>

            <div className="pt-3 border-t border-[#1F2937] flex justify-end">
              <button 
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-5 py-2 rounded-lg transition shadow-lg shadow-indigo-900/10 flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" /> Save System Settings
              </button>
            </div>
          </form>
        </div>

        {/* Database Snapshots Panel */}
        <div className="lg:col-span-1">
          <div className="bg-[#111318] border border-[#1F2937] rounded-xl p-5 space-y-4 shadow-lg">
            <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 border-b border-[#1F2937] pb-2 flex items-center gap-2">
              <Database className="w-4 h-4 text-rose-500" /> Database Administration
            </h4>

            <p className="text-xs text-slate-400 leading-normal">
              Directly perform local backups and restorations of players, times, computer grid layouts, and sales records.
            </p>

            <div className="space-y-2.5 pt-2">
              <button 
                onClick={handleBackup}
                disabled={loading}
                className="w-full bg-[#1F2937] hover:bg-[#2D3748] border border-[#374151] text-slate-200 text-xs py-2.5 rounded-lg font-bold transition flex items-center justify-center gap-1.5 shadow"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <HardDrive className="w-4 h-4 text-emerald-400" />}
                Backup Database Now
              </button>

              <button 
                onClick={handleRestore}
                disabled={loading}
                className="w-full bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900 text-rose-400 text-xs py-2.5 rounded-lg font-bold transition flex items-center justify-center gap-1.5 shadow"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 text-rose-400" />}
                Restore From Backup
              </button>
            </div>

            <div className="bg-[#0A0B0D] border border-[#1F2937] rounded-lg p-3 text-[10px] text-slate-500 leading-normal">
              <strong>Emergency Note:</strong> Performing database restoration replaces the operational store. If any client is currently playing, their session credits will reload instantly to reflect the backup timestamp.
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
