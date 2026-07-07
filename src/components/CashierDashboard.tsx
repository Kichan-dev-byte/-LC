/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import socket from '../socket';
import { Computer, Rate } from '../types';
import { 
  Monitor, Play, Pause, Lock, Unlock, Clock, Coins, LogOut, 
  MessageSquare, Power, RotateCw, AlertTriangle, Send, ShieldAlert,
  Search, Plus, ShieldCheck, Gamepad2, Eye, LayoutGrid, Radio, Users
} from 'lucide-react';

interface CashierDashboardProps {
  currency: string;
}

export default function CashierDashboard({ currency }: CashierDashboardProps) {
  const [computers, setComputers] = useState<Computer[]>([]);
  const [rates, setRates] = useState<Rate[]>([]);
  const [selectedPc, setSelectedPc] = useState<Computer | null>(null);
  const [messageText, setMessageText] = useState('');
  const [announcementText, setAnnouncementText] = useState('');
  const [addTimeValue, setAddTimeValue] = useState('30');
  const [customTimeMinutes, setCustomTimeMinutes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dashboard states
  const [vitals, setVitals] = useState({
    todaySales: 0,
    todayPlayers: 0,
    onlineComputers: 0,
    runningTimers: 0,
    availableComputers: 0
  });

  // Screenshot states
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // Fetch computers and dashboard stats
  const fetchVitals = async () => {
    try {
      const res = await fetch('/api/reports/dashboard');
      if (res.ok) {
        const data = await res.json();
        setVitals(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchComputersAndRates = async () => {
    try {
      const pcRes = await fetch('/api/computers');
      if (pcRes.ok) {
        const data = await pcRes.json();
        setComputers(data);
      }
      const rateRes = await fetch('/api/rates');
      if (rateRes.ok) {
        const data = await rateRes.json();
        setRates(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchComputersAndRates();
    fetchVitals();

    // Listen to real-time updates from server
    socket.on('server:computers', (updatedComputers: Computer[]) => {
      setComputers(updatedComputers);
      
      // Update selected PC details live if open
      if (selectedPc) {
        const current = updatedComputers.find(c => c.id === selectedPc.id);
        if (current) setSelectedPc(current);
      }
      
      // Recalculate stats
      const online = updatedComputers.filter(c => c.status !== 'Offline').length;
      const running = updatedComputers.filter(c => c.status === 'In Use' && !c.isPaused).length;
      const available = updatedComputers.filter(c => c.status === 'Available').length;
      setVitals(prev => ({
        ...prev,
        onlineComputers: online,
        runningTimers: running,
        availableComputers: available
      }));
    });

    // Handle screen capture returns
    socket.on('server:screenshot_ready', (payload: { pcId: string; imageBase64: string }) => {
      if (selectedPc && selectedPc.id === payload.pcId) {
        setScreenshotPreview(payload.imageBase64);
        setIsCapturing(false);
      }
    });

    return () => {
      socket.off('server:computers');
      socket.off('server:screenshot_ready');
    };
  }, [selectedPc]);

  // Actions dispatcher
  const triggerAction = (pcId: string, type: string, value?: any) => {
    socket.emit('server:action', { pcId, type, value });
    fetchVitals(); // refresh sales/stats dynamically
  };

  const handleSendGlobalAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementText.trim()) return;
    socket.emit('server:action', { pcId: '', type: 'announcement', value: announcementText });
    setAnnouncementText('');
    alert('Announcement broadcasted to all active computer clients.');
  };

  const handleSendSinglePopup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPc || !messageText.trim()) return;
    triggerAction(selectedPc.id, 'popup', messageText);
    setMessageText('');
  };

  const requestClientScreenshot = () => {
    if (!selectedPc) return;
    setIsCapturing(true);
    setScreenshotPreview(null);
    triggerAction(selectedPc.id, 'screenshot');
  };

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Bulk actions
  const bulkLockAll = () => {
    if (confirm('Are you sure you want to lock ALL computers?')) {
      computers.forEach(pc => triggerAction(pc.id, 'lock'));
    }
  };

  const bulkUnlockAll = () => {
    if (confirm('Are you sure you want to unlock ALL computers?')) {
      computers.forEach(pc => triggerAction(pc.id, 'unlock'));
    }
  };

  // Filter PCs
  const filteredComputers = computers.filter(pc => 
    pc.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (pc.currentUser && pc.currentUser.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6" id="cashier-dashboard-root">
      
      {/* Vitals Bento-Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { title: "Today's Revenue", value: `${currency} ${vitals.todaySales.toLocaleString()}`, color: "text-emerald-400", sub: "Live cashier register", icon: Coins },
          { title: "Active Players", value: vitals.todayPlayers, color: "text-indigo-400", sub: "Logged in members today", icon: Users },
          { title: "PCs Online", value: vitals.onlineComputers, color: "text-amber-400", sub: "Active Socket connections", icon: Monitor },
          { title: "Active Sessions", value: vitals.runningTimers, color: "text-indigo-400", sub: "Active countdown timers", icon: Clock },
          { title: "Available PCs", value: vitals.availableComputers, color: "text-emerald-400", sub: "Ready for guest/member login", icon: ShieldCheck },
        ].map((item, index) => (
          <div key={index} className="bg-[#111318] border border-[#1F2937] rounded-xl p-4 flex flex-col justify-between hover:border-indigo-500/30 transition duration-300 relative overflow-hidden group">
            <div className="absolute right-2 top-2 text-slate-700 opacity-20 group-hover:opacity-30 transition duration-300">
              <item.icon className="w-8 h-8" />
            </div>
            <span className="text-[10px] text-slate-500 font-semibold tracking-widest uppercase">{item.title}</span>
            <div className="mt-2">
              <span className={`text-2xl font-bold font-display ${item.color}`}>{item.value}</span>
              <p className="text-[10px] text-slate-500 mt-1">{item.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111318] p-4 border border-[#1F2937] rounded-xl">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search PC or Active User..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#0A0B0D] border border-[#1F2937] focus:border-indigo-500/50 outline-none text-sm text-slate-200 pl-9 pr-4 py-1.5 rounded-lg w-64 transition-all"
            />
          </div>
          <span className="text-xs text-slate-500 font-mono">
            Filtered {filteredComputers.length} of {computers.length} PCs
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <button 
            onClick={bulkUnlockAll}
            className="flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-500 text-xs px-3 py-1.5 rounded-lg font-medium transition"
          >
            <Unlock className="w-3.5 h-3.5" /> Unlock All PCs
          </button>
          <button 
            onClick={bulkLockAll}
            className="flex items-center gap-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-500 text-xs px-3 py-1.5 rounded-lg font-medium transition"
          >
            <Lock className="w-3.5 h-3.5" /> Lock All PCs
          </button>
        </div>
      </div>

      {/* Main Grid & Control Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Computer Cards Grid */}
        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredComputers.map((pc) => {
            const isOffline = pc.status === 'Offline';
            const isAvailable = pc.status === 'Available';
            const isInUse = pc.status === 'In Use';
            
            // Progress percentage for session timer
            const pct = pc.totalTime > 0 ? (pc.remainingTime / pc.totalTime) * 100 : 0;

            return (
              <div 
                key={pc.id}
                onDoubleClick={() => setSelectedPc(pc)}
                onClick={() => setSelectedPc(pc)}
                className={`group cursor-pointer rounded-xl border relative transition-all duration-300 bg-[#111318] select-none flex flex-col justify-between ${
                  selectedPc?.id === pc.id ? 'border-indigo-500 ring-1 ring-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.15)] bg-[#14161d]' : 
                  isOffline ? 'border-gray-800/80 hover:border-gray-700 opacity-60 grayscale' :
                  isAvailable ? 'border-[#1F2937] hover:border-indigo-500/50' :
                  'border-emerald-500/30 ring-1 ring-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.05)]'
                }`}
              >
                {/* Status indicator pill top-right */}
                <div className="absolute top-3 right-3 flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${
                    isOffline ? 'bg-slate-600' :
                    isAvailable ? 'bg-indigo-500 animate-pulse' :
                    pc.isPaused ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500 animate-pulse'
                  }`} />
                  <span className="text-[10px] font-mono font-medium text-slate-500 uppercase">
                    {isOffline ? 'OFFLINE' : isAvailable ? 'READY' : pc.isPaused ? 'PAUSED' : 'ACTIVE'}
                  </span>
                </div>

                {/* Card Top */}
                <div className="p-4 flex-1">
                  <div className="flex items-center gap-2.5">
                    <Monitor className={`w-5 h-5 ${
                      isOffline ? 'text-slate-600' :
                      isAvailable ? 'text-indigo-400' : 'text-emerald-400'
                    }`} />
                    <div>
                      <h4 className="text-sm font-semibold font-display text-white group-hover:text-indigo-400 transition-colors">
                        {pc.name}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-mono">{pc.id}</p>
                    </div>
                  </div>

                  {/* Status Box */}
                  <div className="mt-4 bg-[#0A0B0D] p-3 rounded-lg border border-[#1F2937] flex flex-col justify-center min-h-[58px]">
                    {isInUse ? (
                      <>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-300 font-medium truncate max-w-[100px]" title={pc.currentUser || ''}>
                            👤 {pc.currentUser}
                          </span>
                          <span className="font-mono text-emerald-400 font-semibold">
                            {formatTime(pc.remainingTime)}
                          </span>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full bg-slate-800 h-1 rounded-full mt-2 overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-1000 ${pc.isPaused ? 'bg-amber-400' : 'bg-emerald-500'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </>
                    ) : isAvailable ? (
                      <div className="text-center py-1">
                        <span className="text-[11px] text-indigo-400 font-medium uppercase tracking-wider block">
                          PC Idle / Available
                        </span>
                        <span className="text-[10px] text-slate-500 mt-0.5 block">Double-click to manage</span>
                      </div>
                    ) : (
                      <div className="text-center py-1">
                        <span className="text-[11px] text-slate-600 font-medium uppercase tracking-wider block">
                          Connection Offline
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Bottom Quick Controls (only if PC is not offline) */}
                {!isOffline && (
                  <div className="p-2 border-t border-[#1F2937] bg-[#0A0B0D]/40 flex items-center justify-between gap-1">
                    {isInUse ? (
                      <>
                        <button 
                          onClick={(e) => { e.stopPropagation(); triggerAction(pc.id, pc.isPaused ? 'resume' : 'pause'); }}
                          className="flex-1 hover:bg-[#1C1E24] text-slate-400 hover:text-white p-1 rounded transition text-[10px] font-medium flex items-center justify-center gap-1"
                        >
                          {pc.isPaused ? <Play className="w-3 h-3 text-emerald-400" /> : <Pause className="w-3 h-3 text-amber-400" />}
                          {pc.isPaused ? 'Resume' : 'Pause'}
                        </button>
                        <div className="w-[1px] h-4 bg-[#1F2937]" />
                        <button 
                          onClick={(e) => { e.stopPropagation(); triggerAction(pc.id, 'addTime', 30); }}
                          className="flex-1 hover:bg-[#1C1E24] text-indigo-400 hover:text-indigo-300 p-1 rounded transition text-[10px] font-medium flex items-center justify-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> +30m
                        </button>
                        <div className="w-[1px] h-4 bg-[#1F2937]" />
                        <button 
                          onClick={(e) => { e.stopPropagation(); if (confirm(`Force log out session on ${pc.name}?`)) triggerAction(pc.id, 'forceLogout'); }}
                          className="flex-1 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 p-1 rounded transition text-[10px] font-medium flex items-center justify-center gap-1"
                        >
                          <LogOut className="w-3 h-3" /> Eject
                        </button>
                      </>
                    ) : (
                      <div className="w-full flex justify-between gap-1.5">
                        <button 
                          onClick={(e) => { e.stopPropagation(); triggerAction(pc.id, pc.locked ? 'unlock' : 'lock'); }}
                          className="flex-1 hover:bg-[#1C1E24] text-slate-400 hover:text-white py-1 rounded transition text-[10px] font-medium flex items-center justify-center gap-1"
                        >
                          {pc.locked ? <Unlock className="w-3 h-3 text-emerald-400" /> : <Lock className="w-3 h-3 text-rose-400" />}
                          {pc.locked ? 'Unlock Screen' : 'Lock Screen'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Remote Control sidebar Panel */}
        <div className="lg:col-span-1 space-y-4">
          {selectedPc ? (
            <div className="bg-[#111318] border border-[#1F2937] rounded-xl p-4 space-y-4 shadow-xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#1F2937] pb-3">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${selectedPc.status === 'In Use' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                    <Monitor className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold font-display text-white">{selectedPc.name}</h3>
                    <p className="text-[10px] text-slate-500 font-mono">{selectedPc.id} Inspector</p>
                  </div>
                </div>
                <button 
                  onClick={() => { setSelectedPc(null); setScreenshotPreview(null); }}
                  className="text-slate-500 hover:text-slate-300 text-xs px-2 py-0.5 hover:bg-[#1A1D24] rounded"
                >
                  Close
                </button>
              </div>

              {/* Status details */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-[#0A0B0D] p-3 rounded-lg border border-[#1F2937]">
                <div>
                  <span className="text-slate-500">Status</span>
                  <p className="font-semibold text-slate-200">{selectedPc.status}</p>
                </div>
                <div>
                  <span className="text-slate-500">Screen Lock</span>
                  <p className={`font-semibold ${selectedPc.locked ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {selectedPc.locked ? '🔒 Locked' : '🔓 Unlocked'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Logged User</span>
                  <p className="font-semibold text-slate-200 truncate">{selectedPc.currentUser || 'None'}</p>
                </div>
                <div>
                  <span className="text-slate-500">Rate Plan</span>
                  <p className="font-semibold text-slate-200 truncate">{selectedPc.rateName || 'N/A'}</p>
                </div>
                <div className="col-span-2 border-t border-[#1F2937] pt-2 mt-1">
                  <span className="text-slate-500">Time / Credits Available</span>
                  <p className="font-mono text-emerald-400 font-semibold text-lg mt-0.5">
                    {formatTime(selectedPc.remainingTime)}
                  </p>
                </div>
              </div>

              {/* Screenshot capture simulator */}
              {selectedPc.status === 'In Use' && (
                <div className="border border-[#1F2937] bg-[#0A0B0D] rounded-lg p-2.5 overflow-hidden relative">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <Radio className="w-2.5 h-2.5 text-indigo-500 animate-pulse" /> Remote Screen Capture
                    </span>
                    <button 
                      onClick={requestClientScreenshot}
                      disabled={isCapturing}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 transition flex items-center gap-1 hover:underline"
                    >
                      <Eye className="w-2.5 h-2.5" /> {isCapturing ? 'Capturing...' : 'Capture Now'}
                    </button>
                  </div>
                  <div className="aspect-video bg-[#0A0B0D] border border-[#1F2937] rounded overflow-hidden flex items-center justify-center relative">
                    {screenshotPreview ? (
                      <img src={screenshotPreview} alt="Client Screen" className="w-full h-full object-cover" />
                    ) : isCapturing ? (
                      <div className="text-center p-3 animate-pulse">
                        <span className="text-xs text-slate-500 font-mono">Connecting pipeline...</span>
                      </div>
                    ) : (
                      <div className="text-center p-3">
                        <Gamepad2 className="w-6 h-6 text-slate-700 mx-auto mb-1 opacity-50" />
                        <span className="text-[10px] text-slate-600 font-mono block">No active preview loaded</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Controls */}
              {selectedPc.status === 'In Use' ? (
                <div className="space-y-2">
                  <span className="text-[10px] font-mono font-medium text-slate-500 uppercase tracking-wider block">
                    Active Session Controls
                  </span>
                  
                  {/* Timer operations */}
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => triggerAction(selectedPc.id, selectedPc.isPaused ? 'resume' : 'pause')}
                      className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                        selectedPc.isPaused 
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20' 
                          : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                      }`}
                    >
                      {selectedPc.isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                      {selectedPc.isPaused ? 'Resume PC' : 'Pause PC'}
                    </button>
                    <button 
                      onClick={() => { if (confirm('Log out player? Remaining cash balance will be saved.')) triggerAction(selectedPc.id, 'stop'); }}
                      className="flex items-center justify-center gap-1.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 py-1.5 rounded-lg text-xs font-semibold transition"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Stop Session
                    </button>
                  </div>

                  {/* Add Time Box */}
                  <div className="border border-[#1F2937] bg-[#0A0B0D] p-2.5 rounded-lg space-y-2">
                    <span className="text-[10px] font-mono text-slate-500 uppercase">Extend Time Credit</span>
                    <div className="flex gap-1.5">
                      <select 
                        value={addTimeValue} 
                        onChange={(e) => setAddTimeValue(e.target.value)}
                        className="bg-[#0A0B0D] border border-[#1F2937] rounded px-2 py-1 text-xs text-slate-300 outline-none focus:border-indigo-500/50 flex-1"
                      >
                        <option value="15">15 Minutes</option>
                        <option value="30">30 Minutes</option>
                        <option value="60">1 Hour</option>
                        <option value="120">2 Hours</option>
                        <option value="180">3 Hours</option>
                      </select>
                      <button 
                        onClick={() => triggerAction(selectedPc.id, 'addTime', addTimeValue)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1 rounded transition flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add
                      </button>
                    </div>
                    {/* Subtract Time */}
                    <div className="flex gap-1.5">
                      <input 
                        type="number" 
                        placeholder="Mins to subtract..."
                        value={customTimeMinutes}
                        onChange={(e) => setCustomTimeMinutes(e.target.value)}
                        className="bg-[#0A0B0D] border border-[#1F2937] rounded px-2 py-1 text-xs text-slate-300 outline-none focus:border-indigo-500/50 flex-1 w-20"
                      />
                      <button 
                        onClick={() => {
                          if (customTimeMinutes) {
                            triggerAction(selectedPc.id, 'removeTime', customTimeMinutes);
                            setCustomTimeMinutes('');
                          }
                        }}
                        className="bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-400 text-xs px-2.5 py-1 rounded transition"
                      >
                        Deduct
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 bg-[#0A0B0D] p-3 rounded-lg border border-[#1F2937]">
                  <span className="text-[10px] font-mono font-medium text-slate-500 uppercase tracking-wider block">
                    Remote Administrative Operations
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => triggerAction(selectedPc.id, selectedPc.locked ? 'unlock' : 'lock')}
                      className="flex items-center justify-center gap-1.5 bg-[#1F2937] hover:bg-[#2D3748] border border-[#374151] text-slate-200 py-1.5 rounded-lg text-xs font-semibold transition"
                    >
                      {selectedPc.locked ? <Unlock className="w-3.5 h-3.5 text-emerald-400" /> : <Lock className="w-3.5 h-3.5 text-rose-400" />}
                      {selectedPc.locked ? 'Unlock Screen' : 'Lock Screen'}
                    </button>
                    <button 
                      onClick={() => triggerAction(selectedPc.id, 'popup', 'Attention player, cashier is ready.')}
                      className="flex items-center justify-center gap-1.5 bg-[#1F2937] hover:bg-[#2D3748] border border-[#374151] text-slate-200 py-1.5 rounded-lg text-xs font-semibold transition"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-indigo-400" /> Send Alert
                    </button>
                  </div>
                </div>
              )}

              {/* Popups & Message Sender */}
              {selectedPc.status !== 'Offline' && (
                <form onSubmit={handleSendSinglePopup} className="space-y-2 border-t border-[#1F2937] pt-3">
                  <span className="text-[10px] font-mono font-medium text-slate-500 uppercase tracking-wider block">
                    Push Popup Alert
                  </span>
                  <div className="flex gap-1.5">
                    <input 
                      type="text" 
                      placeholder="Type alert message..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      className="bg-[#0A0B0D]/80 border border-[#1F2937] focus:border-indigo-500/50 outline-none text-xs text-slate-200 px-2.5 py-1.5 rounded-lg flex-1 transition"
                    />
                    <button 
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg transition"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>
              )}

              {/* Power State Controls */}
              <div className="border-t border-[#1F2937] pt-3 space-y-2">
                <span className="text-[10px] font-mono font-medium text-slate-500 uppercase tracking-wider block">
                  Power State Command
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => { if (confirm(`Initiate hardware reboot command on ${selectedPc.name}?`)) triggerAction(selectedPc.id, 'restart'); }}
                    className="flex items-center justify-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 py-1 rounded text-xs font-medium transition"
                  >
                    <RotateCw className="w-3.5 h-3.5 animate-spin-slow" /> Reboot Client
                  </button>
                  <button 
                    onClick={() => { if (confirm(`Send immediate ACPI power down signal to ${selectedPc.name}?`)) triggerAction(selectedPc.id, 'shutdown'); }}
                    className="flex items-center justify-center gap-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 py-1 rounded text-xs font-medium transition"
                  >
                    <Power className="w-3.5 h-3.5" /> Power Off
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#111318] border border-[#1F2937] rounded-xl p-5 text-center space-y-4">
              <Monitor className="w-8 h-8 text-slate-700 mx-auto opacity-60" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Remote Terminal Inspector</h4>
                <p className="text-[11px] text-slate-500 mt-1 max-w-[180px] mx-auto">
                  Click or double-click any active client computer card to load the remote console workspace.
                </p>
              </div>
            </div>
          )}

          {/* Broadcast Announcement panel */}
          <div className="bg-[#111318] border border-[#1F2937] rounded-xl p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 mb-3 flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-rose-500 animate-pulse" /> Shop-Wide Broadcast
            </h4>
            <form onSubmit={handleSendGlobalAnnouncement} className="space-y-2">
              <textarea 
                placeholder="Type global notification to show on all active clients..."
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                rows={3}
                className="w-full bg-[#0A0B0D] border border-[#1F2937] focus:border-rose-500/50 outline-none text-xs text-slate-200 p-2.5 rounded-lg transition resize-none"
              />
              <button 
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 rounded-lg transition flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" /> Push Announcement
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
