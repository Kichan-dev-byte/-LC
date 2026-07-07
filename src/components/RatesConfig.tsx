/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Rate } from '../types';
import { 
  Plus, Edit, Trash2, Coins, Clock, ShieldAlert, Check, X,
  Tag, Info
} from 'lucide-react';

interface RatesConfigProps {
  currency: string;
}

export default function RatesConfig({ currency }: RatesConfigProps) {
  const [rates, setRates] = useState<Rate[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [price, setPrice] = useState('');
  const [type, setType] = useState<Rate['type']>('Regular');

  const fetchRates = async () => {
    try {
      const res = await fetch('/api/rates');
      if (res.ok) {
        const data = await res.json();
        setRates(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  const handleSaveRates = async (updatedRates: Rate[]) => {
    try {
      const res = await fetch('/api/rates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedRates)
      });
      if (res.ok) {
        setRates(updatedRates);
        resetForm();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddRate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price) return;

    const newRate: Rate = {
      id: `rate-${Date.now()}`,
      name,
      durationMinutes: durationMinutes ? Number(durationMinutes) : -1, // -1 is custom
      price: Number(price),
      type
    };

    const updated = [...rates, newRate];
    handleSaveRates(updated);
  };

  const handleEditRate = (rate: Rate) => {
    setEditingId(rate.id);
    setName(rate.name);
    setDurationMinutes(rate.durationMinutes === -1 ? '' : String(rate.durationMinutes));
    setPrice(String(rate.price));
    setType(rate.type);
    setIsEditing(true);
  };

  const handleUpdateRate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;

    const updated = rates.map(r => {
      if (r.id === editingId) {
        return {
          ...r,
          name,
          durationMinutes: durationMinutes ? Number(durationMinutes) : -1,
          price: Number(price),
          type
        };
      }
      return r;
    });

    handleSaveRates(updated);
  };

  const handleDeleteRate = (id: string) => {
    if (confirm('Delete this rate package? Clients won\'t be able to buy it anymore.')) {
      const updated = rates.filter(r => r.id !== id);
      handleSaveRates(updated);
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setName('');
    setDurationMinutes('');
    setPrice('');
    setType('Regular');
  };

  const getTierTagColor = (t: string) => {
    switch (t) {
      case 'VIP': return 'bg-purple-500/10 text-purple-400 border-purple-500/25';
      case 'Gold': return 'bg-amber-500/10 text-amber-400 border-amber-500/25';
      case 'Night': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25';
      case 'Promo': return 'bg-rose-500/10 text-rose-400 border-rose-500/25';
      default: return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25';
    }
  };

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111318] p-4 border border-[#1F2937] rounded-xl">
        <div>
          <h3 className="text-base font-bold font-display text-white">Rates & Packages Manager</h3>
          <p className="text-xs text-slate-400 mt-1">Configure pre-paid rates, hourly rates, and membership packages.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Active Rates list */}
        <div className="xl:col-span-2 space-y-4">
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">Active Packages</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rates.map(rate => (
              <div 
                key={rate.id}
                className="bg-[#111318] border border-[#1F2937] rounded-xl p-4 flex flex-col justify-between hover:border-indigo-500/30 transition shadow-lg"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-white">{rate.name}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${getTierTagColor(rate.type)}`}>
                      {rate.type}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-3 font-mono">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    {rate.durationMinutes === -1 ? (
                      <span className="text-indigo-400 font-bold">Custom Open Time Session</span>
                    ) : (
                      <span>Preallocated {rate.durationMinutes} minutes</span>
                    )}
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-[#1F2937] pt-3">
                  <div>
                    <span className="text-[10px] text-slate-500 font-mono block">PLAN COST</span>
                    <span className="text-lg font-bold font-display text-emerald-400">
                      {currency} {rate.price} {rate.durationMinutes === -1 && <span className="text-xs text-slate-400 font-normal">/ hr</span>}
                    </span>
                  </div>

                  <div className="flex gap-1.5">
                    <button 
                      onClick={() => handleEditRate(rate)}
                      className="p-1.5 bg-[#1F2937] hover:bg-[#2D3748] border border-[#374151] text-slate-400 hover:text-white rounded-lg transition"
                      title="Edit Plan"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => handleDeleteRate(rate.id)}
                      className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 rounded-lg transition"
                      title="Delete Plan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Create / Edit Form */}
        <div className="xl:col-span-1">
          <div className="bg-[#111318] border border-[#1F2937] rounded-xl p-5 space-y-4 shadow-lg">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              {isEditing ? '🔧 Modify Package Details' : '➕ Construct Rate Package'}
            </h4>

            <form onSubmit={isEditing ? handleUpdateRate : handleAddRate} className="space-y-3.5 text-xs text-slate-300">
              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Package Label / Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. 1 Hour Standard"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#0A0B0D] border border-[#1F2937] rounded-lg px-3 py-2 outline-none focus:border-indigo-500 text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">Preallocated Mins</label>
                  <input 
                    type="number" 
                    placeholder="Empty for custom"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    className="w-full bg-[#0A0B0D] border border-[#1F2937] rounded-lg px-3 py-2 outline-none focus:border-indigo-500 text-slate-200 font-mono"
                  />
                  <span className="text-[9px] text-slate-500 block mt-0.5">Leave blank for Open Time</span>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">Price ({currency})</label>
                  <input 
                    type="number" 
                    placeholder="0"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full bg-[#0A0B0D] border border-[#1F2937] rounded-lg px-3 py-2 outline-none focus:border-indigo-500 text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Package Tier / Group Type</label>
                <select 
                  value={type} 
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full bg-[#0A0B0D] border border-[#1F2937] rounded-lg px-3 py-2 outline-none focus:border-indigo-500 text-slate-200"
                >
                  <option value="Regular">Regular Package</option>
                  <option value="Silver">Silver Package</option>
                  <option value="Gold">Gold Package</option>
                  <option value="VIP">VIP Exclusive Package</option>
                  <option value="Promo">Promo Bundle Package</option>
                  <option value="Night">Nightshift Promo Rate</option>
                </select>
              </div>

              <div className="pt-2 flex gap-2">
                {isEditing && (
                  <button 
                    type="button" 
                    onClick={resetForm}
                    className="flex-1 bg-[#1F2937] hover:bg-[#2D3748] text-slate-300 py-2 rounded-lg font-bold transition flex items-center justify-center gap-1"
                  >
                    <X className="w-4 h-4" /> Discard
                  </button>
                )}
                <button 
                  type="submit" 
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-bold transition flex items-center justify-center gap-1 shadow-lg shadow-indigo-900/10"
                >
                  <Check className="w-4 h-4" /> {isEditing ? 'Apply Package' : 'Register Package'}
                </button>
              </div>
            </form>

            <div className="bg-[#0A0B0D] border border-[#1F2937] rounded-lg p-3 text-[10px] text-slate-500 leading-normal flex gap-2">
              <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <span>
                <strong>Hourly calculations</strong> are computed dynamically at logout for players utilizing open time balances. Registered VIPs, Golds, and Silvers automatically inherit discounts specified in their accounts.
              </span>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
