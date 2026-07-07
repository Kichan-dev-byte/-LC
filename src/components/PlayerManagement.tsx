/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Player, Transaction } from '../types';
import { 
  Plus, Search, Edit2, Trash2, Coins, ArrowUpRight, ArrowDownRight, 
  History, UserPlus, Phone, Calendar, ShieldCheck, Filter, AlertCircle
} from 'lucide-react';

interface PlayerManagementProps {
  currency: string;
}

export default function PlayerManagement({ currency }: PlayerManagementProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTier, setSelectedTier] = useState<string>('All');
  
  // Modals / Forms state
  const [showAddForm, setShowAddForm] = useState(false);
  const [showTopUpForm, setShowTopUpForm] = useState(false);
  const [showDeductForm, setShowDeductForm] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [actionPlayer, setActionPlayer] = useState<Player | null>(null);

  // Form Fields
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [initialBalance, setInitialBalance] = useState('0');
  const [membership, setMembership] = useState<'Regular' | 'Silver' | 'Gold' | 'VIP'>('Regular');
  
  const [amount, setAmount] = useState('');
  const [deductReason, setDeductReason] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchPlayers = async () => {
    try {
      const res = await fetch(`/api/players?q=${encodeURIComponent(searchTerm)}`);
      if (res.ok) {
        const data = await res.json();
        setPlayers(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTransactions = async () => {
    try {
      const res = await fetch('/api/transactions');
      if (res.ok) {
        const data = await res.json();
        setTransactions(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchPlayers();
    fetchTransactions();
  }, [searchTerm]);

  const handleRegisterPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username.trim() || !fullName.trim()) {
      setErrorMsg('Username and Full Name are required.');
      return;
    }

    try {
      const endpoint = editingPlayer ? `/api/players/${editingPlayer.id}` : '/api/players';
      const method = editingPlayer ? 'PUT' : 'POST';
      const body = editingPlayer 
        ? { fullName, phone, membership }
        : { username, fullName, phone, balance: initialBalance, membership, password };

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const err = await res.json();
        setErrorMsg(err.error || 'Server error occurred.');
        return;
      }

      // Success
      fetchPlayers();
      fetchTransactions();
      resetForm();
    } catch (e) {
      setErrorMsg('Failed to reach backend server.');
    }
  };

  const handleDeletePlayer = async (id: string) => {
    if (confirm('Are you sure you want to permanently delete this member? All credits will be lost.')) {
      try {
        const res = await fetch(`/api/players/${id}`, { method: 'DELETE' });
        if (res.ok) {
          fetchPlayers();
          fetchTransactions();
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleTopUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionPlayer || !amount || Number(amount) <= 0) return;

    try {
      const res = await fetch(`/api/players/${actionPlayer.id}/topup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(amount) })
      });

      if (res.ok) {
        fetchPlayers();
        fetchTransactions();
        setShowTopUpForm(false);
        setActionPlayer(null);
        setAmount('');
      } else {
        const err = await res.json();
        alert(err.error || 'Top up failed');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionPlayer || !amount || Number(amount) <= 0) return;

    try {
      const res = await fetch(`/api/players/${actionPlayer.id}/deduct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(amount), reason: deductReason })
      });

      if (res.ok) {
        fetchPlayers();
        fetchTransactions();
        setShowDeductForm(false);
        setActionPlayer(null);
        setAmount('');
        setDeductReason('');
      } else {
        const err = await res.json();
        alert(err.error || 'Deduction failed');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const startEdit = (player: Player) => {
    setEditingPlayer(player);
    setUsername(player.username);
    setFullName(player.fullName);
    setPhone(player.phone);
    setMembership(player.membership);
    setShowAddForm(true);
  };

  const resetForm = () => {
    setEditingPlayer(null);
    setUsername('');
    setFullName('');
    setPhone('');
    setPassword('');
    setInitialBalance('0');
    setMembership('Regular');
    setShowAddForm(false);
    setErrorMsg('');
  };

  // Tier Colors
  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'VIP': return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'Gold': return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'Silver': return 'bg-slate-500/10 text-slate-300 border-slate-500/30';
      default: return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
    }
  };

  const filteredPlayers = players.filter(p => selectedTier === 'All' || p.membership === selectedTier);

  return (
    <div className="space-y-6">
      
      {/* Top action block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111318] p-4 border border-[#1F2937] rounded-xl">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search by ID, Name or Username..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#0A0B0D] border border-[#1F2937] focus:border-indigo-500/50 outline-none text-sm text-slate-200 pl-9 pr-4 py-1.5 rounded-lg w-72 transition-all"
            />
          </div>

          <div className="flex items-center gap-1 bg-[#0A0B0D] border border-[#1F2937] px-2.5 py-1.5 rounded-lg">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select 
              value={selectedTier} 
              onChange={(e) => setSelectedTier(e.target.value)}
              className="bg-transparent text-xs text-slate-400 outline-none pr-1"
            >
              <option value="All">All Tiers</option>
              <option value="Regular">Regular</option>
              <option value="Silver">Silver</option>
              <option value="Gold">Gold</option>
              <option value="VIP">VIP</option>
            </select>
          </div>
        </div>

        <button 
          onClick={() => { resetForm(); setShowAddForm(true); }}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-4 py-2 rounded-lg font-bold transition shadow-lg shadow-indigo-900/10"
        >
          <UserPlus className="w-4 h-4" /> Register New Player
        </button>
      </div>

      {/* Main Splitscreen Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Members List */}
        <div className="xl:col-span-2 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Registered Members ({filteredPlayers.length})
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPlayers.length > 0 ? (
              filteredPlayers.map((player) => (
                <div 
                  key={player.id}
                  className="bg-[#111318] border border-[#1F2937] rounded-xl p-4 flex flex-col justify-between hover:border-indigo-500/30 transition duration-300 relative overflow-hidden group shadow-lg"
                >
                  {/* Membership badge top-right */}
                  <span className={`absolute right-4 top-4 text-[10px] font-bold px-2 py-0.5 rounded-full border ${getTierColor(player.membership)}`}>
                    {player.membership}
                  </span>

                  <div>
                    <span className="text-[10px] font-mono text-slate-500 block mb-1">ID: {player.id}</span>
                    <h4 className="text-base font-bold font-display text-white group-hover:text-indigo-400 transition-colors">
                      {player.fullName}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">@{player.username}</p>

                    <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-[#1F2937] text-xs">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Phone className="w-3.5 h-3.5 text-slate-600" />
                        <span className="truncate">{player.phone || 'No phone'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Calendar className="w-3.5 h-3.5 text-slate-600" />
                        <span className="truncate">{new Date(player.dateCreated).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Pricing Balance and Actions */}
                  <div className="mt-5 flex items-center justify-between border-t border-[#1F2937] pt-3">
                    <div>
                      <span className="text-[10px] text-slate-500 font-mono block">SAVED CASH BALANCE</span>
                      <span className="text-lg font-bold font-display text-emerald-400">
                        {currency} {player.balance.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex gap-1.5">
                      <button 
                        onClick={() => { setActionPlayer(player); setShowTopUpForm(true); }}
                        className="p-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 rounded-lg text-xs font-bold transition flex items-center gap-1 px-2.5"
                        title="Top Up Balance"
                      >
                        <Coins className="w-3.5 h-3.5" /> + Top Up
                      </button>
                      <button 
                        onClick={() => { setActionPlayer(player); setShowDeductForm(true); }}
                        className="p-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 rounded-lg text-xs font-bold transition"
                        title="Deduct Balance"
                      >
                        Deduct
                      </button>
                      <button 
                        onClick={() => startEdit(player)}
                        className="p-1.5 bg-[#1F2937] hover:bg-[#2D3748] border border-[#374151] text-slate-400 hover:text-white rounded-lg transition"
                        title="Edit Account Details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleDeletePlayer(player.id)}
                        className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 rounded-lg transition"
                        title="Delete Member Account"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 bg-[#111318] border border-[#1F2937] rounded-xl p-8 text-center text-slate-500">
                No players match your filters.
              </div>
            )}
          </div>
        </div>

        {/* Real-time Transactions Feed */}
        <div className="xl:col-span-1 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <History className="w-4 h-4 text-indigo-400" /> Cashier & Player Audit Trail
          </h3>

          <div className="bg-[#111318] border border-[#1F2937] rounded-xl p-4 max-h-[580px] overflow-y-auto space-y-3">
            {transactions.length > 0 ? (
              transactions.map((tx) => {
                const isPositive = tx.type === 'Top Up' || tx.type === 'Time Extension';
                const isNegative = tx.type === 'Deduction';
                return (
                  <div key={tx.id} className="bg-[#0A0B0D] p-3 rounded-lg border border-[#1F2937] space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-slate-500">{new Date(tx.timestamp).toLocaleTimeString()}</span>
                      <span className={`font-semibold px-1.5 py-0.5 rounded ${
                        tx.type === 'Login' ? 'bg-indigo-500/10 text-indigo-400' :
                        tx.type === 'Logout' ? 'bg-slate-800 text-slate-400' :
                        tx.type === 'Top Up' ? 'bg-emerald-500/10 text-emerald-400' :
                        'bg-amber-500/10 text-amber-400'
                      }`}>
                        {tx.type}
                      </span>
                    </div>

                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="text-xs font-bold text-slate-200">@{tx.username}</span>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{tx.description}</p>
                      </div>
                      
                      {tx.amount > 0 && (
                        <span className={`text-xs font-mono font-bold whitespace-nowrap ${isPositive ? 'text-emerald-400' : isNegative ? 'text-rose-400' : 'text-slate-400'}`}>
                          {isPositive ? '+' : '-'}{currency} {tx.amount.toFixed(0)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-xs text-slate-500 font-mono">
                No system transactions registered yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Register / Edit Player */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111318] border border-[#1F2937] rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold font-display text-white border-b border-[#1F2937] pb-2">
              {editingPlayer ? `Modify Account: ${editingPlayer.fullName}` : 'Register New Gaming Account'}
            </h3>

            {errorMsg && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-2.5 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleRegisterPlayer} className="space-y-3 text-xs text-slate-300">
              {!editingPlayer && (
                <>
                  <div className="space-y-1">
                    <label className="text-slate-400 font-medium">Desired Username *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. cyber_samurai"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-[#0A0B0D] border border-[#1F2937] rounded-lg px-3 py-2 outline-none focus:border-indigo-500 text-slate-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400 font-medium">Session Password *</label>
                    <input 
                      type="password" 
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#0A0B0D] border border-[#1F2937] rounded-lg px-3 py-2 outline-none focus:border-indigo-500 text-slate-200"
                    />
                  </div>
                </>
              )}

              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Full Name (Legal Profile) *</label>
                <input 
                  type="text" 
                  placeholder="e.g. John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-[#0A0B0D] border border-[#1F2937] rounded-lg px-3 py-2 outline-none focus:border-indigo-500 text-slate-200"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Phone Number (For Alerts)</label>
                <input 
                  type="text" 
                  placeholder="e.g. +63 912 345 6789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-[#0A0B0D] border border-[#1F2937] rounded-lg px-3 py-2 outline-none focus:border-indigo-500 text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">Membership Tier</label>
                  <select 
                    value={membership} 
                    onChange={(e) => setMembership(e.target.value as any)}
                    className="w-full bg-[#0A0B0D] border border-[#1F2937] rounded-lg px-3 py-2 outline-none focus:border-indigo-500 text-slate-200"
                  >
                    <option value="Regular">Regular (Base)</option>
                    <option value="Silver">Silver Tier (5% Disc)</option>
                    <option value="Gold">Gold Tier (10% Disc)</option>
                    <option value="VIP">VIP Tier (20% Disc)</option>
                  </select>
                </div>

                {!editingPlayer && (
                  <div className="space-y-1">
                    <label className="text-slate-400 font-medium">Initial Cash Deposit</label>
                    <input 
                      type="number" 
                      placeholder="0.00"
                      value={initialBalance}
                      onChange={(e) => setInitialBalance(e.target.value)}
                      className="w-full bg-[#0A0B0D] border border-[#1F2937] rounded-lg px-3 py-2 outline-none focus:border-indigo-500 text-slate-200"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-[#1F2937] mt-4">
                <button 
                  type="button" 
                  onClick={resetForm}
                  className="flex-1 bg-[#1F2937] hover:bg-[#2D3748] text-slate-300 py-2 rounded-lg font-bold transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg font-bold transition"
                >
                  {editingPlayer ? 'Apply Changes' : 'Confirm & Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Top Up Cash Balance */}
      {showTopUpForm && actionPlayer && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111318] border border-[#1F2937] rounded-xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold font-display text-white border-b border-[#1F2937] pb-2">
              💰 Deposit Cash Credits: @{actionPlayer.username}
            </h3>

            <div className="bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20 text-xs text-slate-400">
              Current Saved Balance: <span className="font-bold text-emerald-400 font-mono">{currency} {actionPlayer.balance.toFixed(2)}</span>
            </div>

            <form onSubmit={handleTopUpSubmit} className="space-y-3 text-xs text-slate-300">
              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Top Up Deposit Amount ({currency})</label>
                <input 
                  type="number" 
                  placeholder="Enter Cash deposit value..."
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-[#0A0B0D] border border-[#1F2937] rounded-lg px-3.5 py-2.5 outline-none focus:border-emerald-500 text-sm text-emerald-400 font-bold font-mono"
                />
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-[#1F2937] mt-4">
                <button 
                  type="button" 
                  onClick={() => { setShowTopUpForm(false); setActionPlayer(null); setAmount(''); }}
                  className="flex-1 bg-[#1F2937] hover:bg-[#2D3748] text-slate-300 py-2 rounded-lg font-medium transition"
                >
                  Discard
                </button>
                <button 
                  type="submit" 
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg font-bold transition"
                >
                  Confirm Credit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Deduct Cash Balance */}
      {showDeductForm && actionPlayer && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111318] border border-[#1F2937] rounded-xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold font-display text-white border-b border-[#1F2937] pb-2">
              Deduct Cash Credits: @{actionPlayer.username}
            </h3>

            <div className="bg-rose-500/10 p-3 rounded-lg border border-rose-500/20 text-xs text-slate-400">
              Current Available Balance: <span className="font-bold text-rose-400 font-mono">{currency} {actionPlayer.balance.toFixed(2)}</span>
            </div>

            <form onSubmit={handleDeductSubmit} className="space-y-3 text-xs text-slate-300">
              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Deduction Amount ({currency})</label>
                <input 
                  type="number" 
                  placeholder="0.00"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-[#0A0B0D] border border-[#1F2937] rounded-lg px-3.5 py-2.5 outline-none focus:border-rose-500 text-sm text-rose-400 font-bold font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Reason for Debit</label>
                <input 
                  type="text" 
                  placeholder="e.g. Food / Drinks purchase"
                  required
                  value={deductReason}
                  onChange={(e) => setDeductReason(e.target.value)}
                  className="w-full bg-[#0A0B0D] border border-[#1F2937] rounded-lg px-3 py-2 outline-none focus:border-rose-500 text-slate-200"
                />
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-[#1F2937] mt-4">
                <button 
                  type="button" 
                  onClick={() => { setShowDeductForm(false); setActionPlayer(null); setAmount(''); setDeductReason(''); }}
                  className="flex-1 bg-[#1F2937] hover:bg-[#2D3748] text-slate-300 py-2 rounded-lg font-medium transition"
                >
                  Discard
                </button>
                <button 
                  type="submit" 
                  className="flex-1 bg-rose-600 hover:bg-rose-500 text-white py-2 rounded-lg font-bold transition"
                >
                  Deduct Credit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
