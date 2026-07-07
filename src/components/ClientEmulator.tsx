/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import socket from '../socket';
import { Computer, Rate } from '../types';
import { 
  Monitor, Lock, Unlock, Clock, Coins, LogOut, MessageSquare, 
  Gamepad2, Chrome, KeyRound, QrCode, Play, AlertTriangle, Shield,
  Volume2, Users, Send, CheckCircle, ArrowRight, UserCheck, ShieldAlert
} from 'lucide-react';

interface ClientEmulatorProps {
  currency: string;
  shopName: string;
}

const LAN_GAMES = [
  { id: 'valorant', name: 'Valorant', genre: 'FPS Shooter', desc: '5v5 tactical shooter with abilities.', color: 'from-rose-600 to-rose-950', banner: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=400&q=80' },
  { id: 'lol', name: 'League of Legends', genre: 'MOBA Strategy', desc: '5v5 arena battle strategy.', color: 'from-blue-600 to-indigo-950', banner: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&w=400&q=80' },
  { id: 'dota', name: 'Dota 2', genre: 'MOBA Strategy', desc: 'Deep tactical defense of the ancients.', color: 'from-red-600 to-red-950', banner: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=400&q=80' },
  { id: 'minecraft', name: 'Minecraft', genre: 'Sandbox Adventure', desc: 'Build, craft, explore and survive.', color: 'from-emerald-600 to-green-950', banner: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=400&q=80' },
  { id: 'gta', name: 'GTA V / FiveM', genre: 'Open World RPG', desc: 'Action filled roleplaying city server.', color: 'from-amber-600 to-yellow-950', banner: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=400&q=80' },
  { id: 'roblox', name: 'Roblox Studio', genre: 'Sandbox Platform', desc: 'Play and build custom worlds.', color: 'from-purple-600 to-purple-950', banner: 'https://images.unsplash.com/photo-1560253023-3ec5d502959f?auto=format&fit=crop&w=400&q=80' }
];

const GAME_SHOTS = [
  "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80", // fps match
  "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&w=600&q=80", // moba fight
  "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=600&q=80", // rpg raid
  "https://images.unsplash.com/photo-1560253023-3ec5d502959f?auto=format&fit=crop&w=600&q=80"  // race match
];

export default function ClientEmulator({ currency, shopName }: ClientEmulatorProps) {
  const [selectedPcId, setSelectedPcId] = useState('PC-01');
  const [pcState, setPcState] = useState<Computer | null>(null);
  
  // Login fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [selectedRateId, setSelectedRateId] = useState('');
  const [rates, setRates] = useState<Rate[]>([]);
  const [loginError, setLoginError] = useState('');

  // Alerts, announcements & interactive states
  const [localPopup, setLocalPopup] = useState<string | null>(null);
  const [globalAnnouncement, setGlobalAnnouncement] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'games' | 'browser'>('games');
  
  // Game running state
  const [launchedGame, setLaunchedGame] = useState<string | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);

  // Browser state
  const [browserUrl, setBrowserUrl] = useState('https://discord.com/app');
  const [browserHistory, setBrowserHistory] = useState<string[]>(['https://discord.com/app']);

  // Idle detection simulation
  const [isIdle, setIsIdle] = useState(false);
  const [idleTimer, setIdleTimer] = useState(30);
  const idleIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch rates
  const fetchRates = async () => {
    try {
      const res = await fetch('/api/rates');
      if (res.ok) {
        const data = await res.json();
        setRates(data);
        if (data.length > 0) setSelectedRateId(data[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  // Socket triggers and listeners
  useEffect(() => {
    // 1. Initial registration
    socket.emit('client:register', selectedPcId);

    // Heartbeat Interval (5 seconds)
    const hbInterval = setInterval(() => {
      socket.emit('client:heartbeat', selectedPcId);
    }, 5000);

    // 2. State updates from server
    socket.on('client:registered', (pc: Computer) => {
      setPcState(pc);
    });

    socket.on('client:update', (updatedPc: Computer) => {
      if (updatedPc.id === selectedPcId) {
        setPcState(updatedPc);
      }
    });

    socket.on('client:lock', () => {
      setPcState(prev => prev ? { ...prev, locked: true } : null);
    });

    socket.on('client:unlock', () => {
      setPcState(prev => prev ? { ...prev, locked: false } : null);
    });

    // 3. Forced logout
    socket.on('client:force_logout', (reason: string) => {
      setLocalPopup(`Your session ended. Reason: ${reason}`);
      setLaunchedGame(null);
      setUsername('');
      setPassword('');
      setPcState(prev => prev ? { 
        ...prev, 
        currentUser: null, 
        playerId: null, 
        status: 'Available', 
        locked: true,
        remainingTime: 0 
      } : null);
    });

    // 4. Alerts
    socket.on('client:popup', (msg: string) => {
      setLocalPopup(msg);
    });

    socket.on('client:announcement', (msg: string) => {
      setGlobalAnnouncement(msg);
      // Auto dismiss announcement in 10s
      setTimeout(() => {
        setGlobalAnnouncement(null);
      }, 10000);
    });

    // 5. Remote Screenshot response
    socket.on('client:request_screenshot', () => {
      // Pick a random gameplay screenshot to simulate what the gamer is playing!
      const randIdx = Math.floor(Math.random() * GAME_SHOTS.length);
      const chosenImage = GAME_SHOTS[randIdx];
      
      socket.emit('client:screenshot_response', {
        pcId: selectedPcId,
        imageBase64: chosenImage
      });
    });

    // Handle Login events
    socket.on('login:success', (pc: Computer) => {
      setPcState(pc);
      setLoginError('');
    });

    socket.on('login:error', (error: string) => {
      setLoginError(error);
    });

    return () => {
      clearInterval(hbInterval);
      socket.off('client:registered');
      socket.off('client:update');
      socket.off('client:lock');
      socket.off('client:unlock');
      socket.off('client:force_logout');
      socket.off('client:popup');
      socket.off('client:announcement');
      socket.off('client:request_screenshot');
      socket.off('login:success');
      socket.off('login:error');
    };
  }, [selectedPcId]);

  // Handle Client Login trigger
  const handleClientLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    
    socket.emit('client:login', {
      pcId: selectedPcId,
      username: isGuestMode ? undefined : username,
      password: isGuestMode ? undefined : password,
      isGuest: isGuestMode,
      rateId: isGuestMode ? selectedRateId : undefined
    });
  };

  const handleClientLogout = () => {
    if (confirm('Are you sure you want to end your session? Remaining credits will be saved.')) {
      socket.emit('client:logout', selectedPcId);
    }
  };

  const handleGameLaunch = (gameName: string) => {
    setIsLaunching(true);
    setLaunchedGame(null);
    setTimeout(() => {
      setIsLaunching(false);
      setLaunchedGame(gameName);
    }, 2000);
  };

  // Idle simulation ticker
  useEffect(() => {
    if (isIdle && pcState?.status === 'In Use') {
      idleIntervalRef.current = setInterval(() => {
        setIdleTimer(prev => {
          if (prev <= 1) {
            // Trigger auto logout
            socket.emit('client:logout', selectedPcId);
            setIsIdle(false);
            return 30;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (idleIntervalRef.current) {
        clearInterval(idleIntervalRef.current);
      }
      setIdleTimer(30);
    }

    return () => {
      if (idleIntervalRef.current) clearInterval(idleIntervalRef.current);
    };
  }, [isIdle, pcState]);

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6" id="client-emulator-root">
      
      {/* Simulation Selector Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-gray-900/40 p-4 border border-gray-800 rounded-xl backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-cyan-500/10 text-cyan-400 rounded-lg">
            <Monitor className="w-5 h-5 text-cyan-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold font-display text-gray-100">Terminal Hardware Emulator</h3>
            <p className="text-xs text-gray-400 mt-0.5">Toggle terminal client views to mock separate physical computer terminals.</p>
          </div>
        </div>

        {/* Station Select */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-mono">Select Station:</span>
          <select 
            value={selectedPcId} 
            onChange={(e) => {
              setSelectedPcId(e.target.value);
              setLocalPopup(null);
              setGlobalAnnouncement(null);
              setLaunchedGame(null);
            }}
            className="bg-gray-950 border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-gray-200 outline-none focus:border-cyan-500"
          >
            {Array.from({ length: 12 }, (_, i) => {
              const id = `PC-${String(i + 1).padStart(2, '0')}`;
              return <option key={id} value={id}>Simulation: {id}</option>;
            })}
          </select>
        </div>
      </div>

      {/* Global Announcement Marquee Overlay */}
      {globalAnnouncement && (
        <div className="bg-rose-950/80 border border-rose-800 text-rose-300 py-2.5 px-4 rounded-xl font-medium text-xs flex items-center gap-3 animate-pulse">
          <Volume2 className="w-4 h-4 shrink-0 text-rose-400" />
          <marquee className="font-semibold uppercase tracking-wider">{globalAnnouncement}</marquee>
        </div>
      )}

      {/* Actual Simulated Desktop Screen Frame */}
      <div className="border border-gray-800 bg-gray-950 rounded-2xl aspect-[16/10] w-full overflow-hidden relative shadow-2xl scanline-effect select-none flex flex-col justify-between">
        
        {/* Screen Bezel Header */}
        <div className="bg-gray-900 border-b border-gray-950 px-4 py-2 flex justify-between items-center z-20">
          <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Station: {selectedPcId}</span>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Status alerts */}
            {pcState?.status === 'In Use' && (
              <button 
                onClick={() => setIsIdle(!isIdle)}
                className={`text-[10px] font-mono px-2 py-0.5 rounded border transition ${
                  isIdle ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
                }`}
              >
                {isIdle ? '⚠️ Simulate Activity' : '💤 Simulate Idle'}
              </button>
            )}
            <span className="text-xs text-gray-500 font-mono">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Client content area (Render LOCK screen or ACTIVE workspace) */}
        <div className="flex-1 relative flex flex-col justify-between overflow-hidden">
          
          {pcState?.locked ? (
            /* --- LOCK SCREEN VIEW --- */
            <div className="absolute inset-0 bg-gradient-to-br from-[#090b11] via-[#0d121f] to-[#12192c] flex flex-col items-center justify-center p-6 z-30">
              
              {/* Lock card */}
              <div className="max-w-md w-full bg-gray-900/80 border border-gray-800 rounded-2xl p-6 backdrop-blur-md space-y-6 shadow-2xl relative overflow-hidden">
                
                {/* Visual Glow */}
                <div className="absolute -right-16 -top-16 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl" />
                
                <div className="text-center space-y-1.5">
                  <div className="w-12 h-12 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-cyan-500/10">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-bold font-display text-gray-100 tracking-tight">{shopName}</h2>
                  <p className="text-xs text-gray-400 font-medium">Please authenticate or login to begin your session</p>
                </div>

                {loginError && (
                  <div className="bg-rose-500/10 border border-rose-500/25 text-rose-400 p-2.5 rounded-xl text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{loginError}</span>
                  </div>
                )}

                {/* Tab select Player vs Guest */}
                <div className="grid grid-cols-2 bg-gray-950 p-1 rounded-xl border border-gray-800">
                  <button 
                    onClick={() => { setIsGuestMode(false); setLoginError(''); }}
                    className={`py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${!isGuestMode ? 'bg-cyan-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                  >
                    <UserCheck className="w-3.5 h-3.5" /> Member Login
                  </button>
                  <button 
                    onClick={() => { setIsGuestMode(true); setLoginError(''); }}
                    className={`py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${isGuestMode ? 'bg-cyan-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                  >
                    <QrCode className="w-3.5 h-3.5" /> Guest Pass
                  </button>
                </div>

                {/* Login Form */}
                <form onSubmit={handleClientLogin} className="space-y-4">
                  {!isGuestMode ? (
                    <div className="space-y-3.5">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-mono tracking-wider text-gray-500 font-medium">Username</label>
                        <input 
                          type="text" 
                          required
                          placeholder="Registered membership user"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-gray-200 outline-none focus:border-cyan-500/50"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-mono tracking-wider text-gray-500 font-medium">Session Password</label>
                        <input 
                          type="password" 
                          required
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-gray-200 outline-none focus:border-cyan-500/50"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 bg-gray-950/60 p-4 border border-gray-950 rounded-xl">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-mono tracking-wider text-gray-500 font-medium">Pre-Paid Passes</label>
                        <select 
                          value={selectedRateId} 
                          onChange={(e) => setSelectedRateId(e.target.value)}
                          className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-gray-200 outline-none focus:border-cyan-500/50"
                        >
                          {rates.map(rate => (
                            <option key={rate.id} value={rate.id}>
                              {rate.name} - {currency} {rate.price}
                            </option>
                          ))}
                        </select>
                      </div>
                      <span className="text-[10px] text-gray-500 leading-normal block">
                        * Guests must deposit cash first with the cashier. Select your purchased prepaid pass above to initialize.
                      </span>
                    </div>
                  )}

                  <button 
                    type="submit"
                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2.5 rounded-xl transition text-xs shadow-lg shadow-cyan-600/15 flex items-center justify-center gap-1.5"
                  >
                    Unlock Terminal <ArrowRight className="w-4 h-4" />
                  </button>
                </form>

                {/* QR Code login & Barcard simulation */}
                <div className="border-t border-gray-800/60 pt-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-8 h-8 text-cyan-400 bg-cyan-500/5 p-1 rounded-lg border border-cyan-500/20" />
                    <div>
                      <span className="text-[10px] font-mono text-cyan-400 block font-bold">QR LOGIN</span>
                      <p className="text-[9px] text-gray-500">Scan via Elite LAN Mobile App</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-600 font-mono">Bypass key: admin</span>
                </div>

              </div>

              {/* Safety notification footer */}
              <div className="mt-8 text-center text-[10px] text-gray-600 font-mono max-w-xs leading-normal">
                Unauthorized desktop access attempts are fully restricted and logged to the central cashier audit logs.
              </div>

            </div>
          ) : (
            /* --- LOGGED-IN ACTIVE CLIENT DASHBOARD --- */
            <div className="absolute inset-0 bg-gray-950 flex flex-col justify-between">
              
              {/* TOP SESSION HEADER STATUS */}
              <div className="bg-gray-900/60 border-b border-gray-900 p-4 flex items-center justify-between">
                
                {/* Left block */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-inner">
                    <Monitor className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-cyan-400 font-bold block uppercase tracking-wide">
                      Active Session Active
                    </span>
                    <h3 className="text-sm font-bold text-gray-100">
                      👤 {pcState?.currentUser || 'Guest Account'}
                    </h3>
                  </div>
                </div>

                {/* Center timer */}
                <div className="text-center bg-gray-950 border border-gray-900 rounded-xl px-5 py-1.5 relative overflow-hidden">
                  <span className="text-[9px] font-mono text-gray-500 block uppercase tracking-wider">
                    REMAINING CREDITS
                  </span>
                  <span className="text-2xl font-bold font-mono text-rose-400 tracking-wider">
                    {pcState ? formatTime(pcState.remainingTime) : '00:00:00'}
                  </span>
                  {/* Warning on low time */}
                  {pcState && pcState.remainingTime < 300 && (
                    <div className="absolute inset-0 bg-rose-500/5 animate-pulse pointer-events-none" />
                  )}
                </div>

                {/* Right block */}
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-[9px] font-mono text-gray-500 block uppercase">Plan Balance</span>
                    <span className="text-sm font-bold font-display text-emerald-400">
                      {currency} {pcState?.balance.toFixed(2) || '0.00'}
                    </span>
                  </div>

                  <button 
                    onClick={handleClientLogout}
                    className="flex items-center gap-1 bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/30 text-rose-400 font-bold text-xs px-3.5 py-2 rounded-xl transition"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Logout PC
                  </button>
                </div>

              </div>

              {/* MIDDLE INTERACTIVE AREA (Split tab: Games vs browser) */}
              <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-4">
                
                {/* Navigation rails */}
                <div className="bg-gray-900/30 border-r border-gray-900 p-3 space-y-2 col-span-1 flex flex-col">
                  <button 
                    onClick={() => { setActiveTab('games'); setLaunchedGame(null); }}
                    className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-bold transition ${
                      activeTab === 'games' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/10' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Gamepad2 className="w-4 h-4" /> Game Launcher
                  </button>
                  <button 
                    onClick={() => { setActiveTab('browser'); setLaunchedGame(null); }}
                    className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-bold transition ${
                      activeTab === 'browser' ? 'bg-cyan-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Chrome className="w-4 h-4" /> Safe Sandbox Web
                  </button>

                  <div className="flex-1 flex flex-col justify-end">
                    <div className="bg-gray-950/80 border border-gray-900 rounded-xl p-2.5 space-y-1.5 text-[10px] text-gray-500">
                      <span className="font-bold text-gray-400 block uppercase tracking-wider">
                        🛡️ Whitelist System
                      </span>
                      <p className="leading-normal">External software installations are sandboxed. Internet downloads are limited to whitelist.</p>
                    </div>
                  </div>
                </div>

                {/* Tab content */}
                <div className="md:col-span-3 p-4 overflow-y-auto bg-[#0b0e14]/50">
                  
                  {/* Idle warnings */}
                  {isIdle && (
                    <div className="mb-4 bg-amber-500/15 border border-amber-500/35 p-3 rounded-xl flex items-center justify-between text-xs text-amber-400 animate-pulse">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                        <span><strong>Idle detected!</strong> Terminal will auto-logout to save credits in <strong>{idleTimer}</strong> seconds.</span>
                      </div>
                      <button 
                        onClick={() => setIsIdle(false)}
                        className="bg-amber-600 text-white font-bold px-2.5 py-1 rounded-lg hover:bg-amber-500 transition text-[10px]"
                      >
                        I'm Active!
                      </button>
                    </div>
                  )}

                  {launchedGame ? (
                    /* SIMULATED ACTIVE GAME RUNNING SCREEN */
                    <div className="bg-gray-950 border border-gray-900 rounded-xl p-6 text-center space-y-6 aspect-video flex flex-col justify-center items-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-cover bg-center opacity-10 filter blur-sm" style={{ backgroundImage: `url(${LAN_GAMES.find(g=>g.name===launchedGame)?.banner})` }} />
                      
                      <div className="w-20 h-20 rounded-2xl bg-cyan-600/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 animate-pulse relative z-10 shadow-lg shadow-cyan-500/10">
                        <Gamepad2 className="w-10 h-10" />
                      </div>

                      <div className="space-y-2 relative z-10">
                        <h4 className="text-xl font-bold font-display text-gray-100">{launchedGame} is currently running</h4>
                        <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
                          Your PC performance is optimized. Game settings are configured for 240 FPS. Keep playing!
                        </p>
                      </div>

                      <button 
                        onClick={() => setLaunchedGame(null)}
                        className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-5 py-2 rounded-xl transition relative z-10"
                      >
                        Exit Game Session
                      </button>
                    </div>
                  ) : isLaunching ? (
                    /* LOADING MOCK SPLASH SCREEN */
                    <div className="bg-gray-950 border border-gray-900 rounded-xl p-8 text-center aspect-video flex flex-col justify-center items-center space-y-4">
                      <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs text-gray-400 font-mono">Syncing server shaders... Launching game framework...</span>
                    </div>
                  ) : activeTab === 'games' ? (
                    /* GAME GRID */
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Available LAN Esports Games</h4>
                        <span className="text-[10px] text-cyan-400 font-mono">240Hz FreeSync Active</span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {LAN_GAMES.map(game => (
                          <div 
                            key={game.id}
                            className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-cyan-500/30 transition group flex flex-col justify-between"
                          >
                            <div className="h-28 bg-gray-950 relative overflow-hidden">
                              <img src={game.banner} alt={game.name} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500 opacity-60" />
                              <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent" />
                              <span className="absolute left-3 bottom-3 text-[9px] uppercase font-bold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                                {game.genre}
                              </span>
                            </div>
                            <div className="p-3 flex-1 flex flex-col justify-between">
                              <div>
                                <h5 className="text-sm font-bold text-gray-100">{game.name}</h5>
                                <p className="text-[11px] text-gray-400 mt-1 leading-normal">{game.desc}</p>
                              </div>
                              <button 
                                onClick={() => handleGameLaunch(game.name)}
                                className="w-full mt-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs py-2 rounded-lg transition flex items-center justify-center gap-1.5 shadow"
                              >
                                <Play className="w-3.5 h-3.5" /> Launch Game
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* WHITELISTED BROWSER */
                    <div className="space-y-4">
                      <div className="flex items-center gap-1.5 bg-gray-900 border border-gray-800 p-2 rounded-xl">
                        <div className="flex gap-1.5 shrink-0 px-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        </div>
                        <input 
                          type="text" 
                          value={browserUrl}
                          onChange={(e) => setBrowserUrl(e.target.value)}
                          className="bg-gray-950 border border-gray-850 outline-none text-[11px] text-gray-400 px-3 py-1 rounded-lg flex-1"
                        />
                      </div>

                      {/* Mock Website layout */}
                      <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5 min-h-[300px] flex flex-col justify-center items-center text-center space-y-4">
                        <Chrome className="w-12 h-12 text-cyan-500 opacity-60" />
                        <div>
                          <h5 className="text-sm font-bold text-gray-200">Simulated Safe-Web Frame</h5>
                          <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed mt-1">
                            You are connected to Discord Web (whitelisted). Local proxy prevents DNS hijacks.
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setBrowserUrl('https://discord.com/app')}
                            className="bg-gray-950 hover:bg-gray-800 border border-gray-800 text-gray-300 text-[10px] px-3 py-1.5 rounded-lg transition"
                          >
                            Open Discord
                          </button>
                          <button 
                            onClick={() => setBrowserUrl('https://liquipedia.net')}
                            className="bg-gray-950 hover:bg-gray-800 border border-gray-800 text-gray-300 text-[10px] px-3 py-1.5 rounded-lg transition"
                          >
                            Liquipedia Esports
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>

            </div>
          )}

          {/* Interactive Modal-Toast Notifications inside screen (for messages / cashier popups) */}
          {localPopup && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-cyan-950 border border-cyan-500/40 text-cyan-200 px-5 py-3 rounded-xl shadow-xl z-50 text-xs flex items-center justify-between gap-4 max-w-sm animate-bounce">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-cyan-400 shrink-0" />
                <span>{localPopup}</span>
              </div>
              <button 
                onClick={() => setLocalPopup(null)}
                className="text-cyan-400 hover:text-white font-bold hover:underline ml-2"
              >
                Got It
              </button>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
