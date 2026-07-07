/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db';
import { Computer, Player, Rate, Transaction, Settings, SystemUser } from './src/types';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  }
});

const PORT = 3000;

app.use(express.json());

// In-memory mapping of connected sockets: pcId -> socketId
const connectedClients = new Map<string, string>();
// socketId -> pcId
const socketToPc = new Map<string, string>();

// API routes first
app.get('/api/computers', (req, res) => {
  const computers = db.getComputers();
  // Update status based on real-time sockets
  const updated = computers.map(pc => {
    const isSocketConnected = connectedClients.has(pc.id);
    if (!isSocketConnected) {
      return { ...pc, status: 'Offline' as const };
    }
    return pc;
  });
  res.json(updated);
});

app.get('/api/players', (req, res) => {
  const query = (req.query.q as string || '').toLowerCase();
  let players = db.getPlayers();
  if (query) {
    players = players.filter(p =>
      p.username.toLowerCase().includes(query) ||
      p.fullName.toLowerCase().includes(query) ||
      p.id.toLowerCase().includes(query)
    );
  }
  res.json(players);
});

app.post('/api/players', (req, res) => {
  const { username, fullName, phone, balance, membership, password } = req.body;
  const players = db.getPlayers();
  if (players.some(p => p.username.toLowerCase() === username.toLowerCase())) {
    return res.status(400).json({ error: 'Username already exists' });
  }

  const newPlayer: Player = {
    id: `PL-${String(players.length + 1).padStart(3, '0')}`,
    username,
    passwordHash: password || 'password123',
    fullName,
    phone: phone || '',
    balance: Number(balance) || 0,
    membership: membership || 'Regular',
    dateCreated: new Date().toISOString(),
    lastLogin: null,
    status: 'Active',
  };

  db.addPlayer(newPlayer);

  // Log registration transaction if balance is added
  if (newPlayer.balance > 0) {
    db.addTransaction({
      id: `TX-${Date.now()}`,
      timestamp: new Date().toISOString(),
      playerId: newPlayer.id,
      username: newPlayer.username,
      pcId: null,
      type: 'Top Up',
      amount: newPlayer.balance,
      description: `Initial balance top up on registration.`,
    });
  }

  res.status(201).json(newPlayer);
});

app.put('/api/players/:id', (req, res) => {
  const { id } = req.params;
  const { fullName, phone, membership, status } = req.body;
  const players = db.getPlayers();
  const player = players.find(p => p.id === id);
  if (!player) {
    return res.status(404).json({ error: 'Player not found' });
  }

  const updated: Player = {
    ...player,
    fullName: fullName !== undefined ? fullName : player.fullName,
    phone: phone !== undefined ? phone : player.phone,
    membership: membership !== undefined ? membership : player.membership,
    status: status !== undefined ? status : player.status,
  };

  db.updatePlayer(updated);
  res.json(updated);
});

app.delete('/api/players/:id', (req, res) => {
  const { id } = req.params;
  const player = db.getPlayers().find(p => p.id === id);
  if (!player) {
    return res.status(404).json({ error: 'Player not found' });
  }
  db.deletePlayer(id);
  res.json({ success: true, message: 'Player removed successfully' });
});

app.post('/api/players/:id/topup', (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;
  const amtVal = Number(amount);
  if (isNaN(amtVal) || amtVal <= 0) {
    return res.status(400).json({ error: 'Invalid top up amount' });
  }

  const players = db.getPlayers();
  const player = players.find(p => p.id === id);
  if (!player) {
    return res.status(404).json({ error: 'Player not found' });
  }

  player.balance += amtVal;
  db.updatePlayer(player);

  db.addTransaction({
    id: `TX-${Date.now()}`,
    timestamp: new Date().toISOString(),
    playerId: player.id,
    username: player.username,
    pcId: null,
    type: 'Top Up',
    amount: amtVal,
    description: `Topped up ${amtVal} from cashier.`,
  });

  // If player is currently logged in on a computer, dynamically extend their time!
  const computers = db.getComputers();
  const activePc = computers.find(pc => pc.playerId === player.id);
  if (activePc) {
    // Recalculate remaining time or add balance
    activePc.balance = player.balance;
    db.updateComputer(activePc);
    // Broadcast update to cashier & clients
    io.emit('server:computers', db.getComputers());
    const socketId = connectedClients.get(activePc.id);
    if (socketId) {
      io.to(socketId).emit('client:update', activePc);
    }
  }

  res.json(player);
});

app.post('/api/players/:id/deduct', (req, res) => {
  const { id } = req.params;
  const { amount, reason } = req.body;
  const amtVal = Number(amount);
  if (isNaN(amtVal) || amtVal <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  const players = db.getPlayers();
  const player = players.find(p => p.id === id);
  if (!player) {
    return res.status(404).json({ error: 'Player not found' });
  }

  if (player.balance < amtVal) {
    return res.status(400).json({ error: 'Insufficient balance' });
  }

  player.balance -= amtVal;
  db.updatePlayer(player);

  db.addTransaction({
    id: `TX-${Date.now()}`,
    timestamp: new Date().toISOString(),
    playerId: player.id,
    username: player.username,
    pcId: null,
    type: 'Deduction',
    amount: amtVal,
    description: reason || 'Cashier manual deduction.',
  });

  res.json(player);
});

app.get('/api/rates', (req, res) => {
  res.json(db.getRates());
});

app.put('/api/rates', (req, res) => {
  const rates = req.body;
  if (!Array.isArray(rates)) {
    return res.status(400).json({ error: 'Rates must be an array' });
  }
  db.saveRates(rates);
  res.json({ success: true, rates: db.getRates() });
});

app.get('/api/transactions', (req, res) => {
  res.json(db.getTransactions());
});

app.get('/api/settings', (req, res) => {
  res.json(db.getSettings());
});

app.put('/api/settings', (req, res) => {
  const settings = req.body;
  db.saveSettings(settings);
  res.json({ success: true, settings: db.getSettings() });
});

// Reports API
app.get('/api/reports/dashboard', (req, res) => {
  const txs = db.getTransactions();
  const players = db.getPlayers();
  const computers = db.getComputers();

  // Sales totals
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayTxs = txs.filter(tx => new Date(tx.timestamp) >= todayStart);
  const todaySales = todayTxs
    .filter(tx => tx.type === 'Top Up' || tx.type === 'Deduction' || tx.type === 'Time Extension')
    .reduce((sum, tx) => sum + (tx.type === 'Top Up' ? tx.amount : -tx.amount), 0);

  const onlineCount = Array.from(connectedClients.keys()).length;
  const activeTimers = computers.filter(pc => pc.status === 'In Use' && !pc.isPaused).length;
  const availablePcs = computers.length - onlineCount;

  res.json({
    todaySales: Math.max(0, todaySales),
    todayPlayers: players.filter(p => p.lastLogin && new Date(p.lastLogin) >= todayStart).length,
    onlineComputers: onlineCount,
    runningTimers: activeTimers,
    availableComputers: Math.max(0, availablePcs),
  });
});

app.get('/api/reports/sales', (req, res) => {
  const txs = db.getTransactions();
  const computers = db.getComputers();
  const players = db.getPlayers();

  // Group sales by day (last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    return d;
  }).reverse();

  const dailySales = last7Days.map(day => {
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);

    const dayTxs = txs.filter(tx => {
      const ts = new Date(tx.timestamp);
      return ts >= day && ts < nextDay;
    });

    const income = dayTxs
      .filter(tx => tx.type === 'Top Up')
      .reduce((sum, tx) => sum + tx.amount, 0);

    return {
      date: day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      sales: income,
    };
  });

  // Top players based on total top-ups or login durations
  const playerSpend = new Map<string, { name: string; amount: number; visits: number }>();
  txs.forEach(tx => {
    if (tx.playerId) {
      const record = playerSpend.get(tx.playerId) || { name: tx.username, amount: 0, visits: 0 };
      if (tx.type === 'Top Up') {
        record.amount += tx.amount;
      }
      if (tx.type === 'Login') {
        record.visits += 1;
      }
      playerSpend.set(tx.playerId, record);
    }
  });

  const topPlayers = Array.from(playerSpend.entries())
    .map(([id, val]) => ({ id, ...val }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  // Most used PCs from transaction logs
  const pcUsage = new Map<string, number>();
  txs.forEach(tx => {
    if (tx.pcId) {
      pcUsage.set(tx.pcId, (pcUsage.get(tx.pcId) || 0) + 1);
    }
  });

  // Make sure all PCs have an entry
  computers.forEach(pc => {
    if (!pcUsage.has(pc.id)) {
      pcUsage.set(pc.id, 0);
    }
  });

  const mostUsedPcs = Array.from(pcUsage.entries())
    .map(([pcId, count]) => ({ pcId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  res.json({
    dailySales,
    topPlayers,
    mostUsedPcs,
  });
});

// Admin endpoint to seed a backup/restore
app.post('/api/database/backup', (req, res) => {
  const data = fs.readFileSync(path.join(process.cwd(), 'database.json'), 'utf-8');
  fs.writeFileSync(path.join(process.cwd(), 'database_backup.json'), data, 'utf-8');
  res.json({ success: true, message: 'Database backed up successfully!' });
});

app.post('/api/database/restore', (req, res) => {
  const backupPath = path.join(process.cwd(), 'database_backup.json');
  if (fs.existsSync(backupPath)) {
    const data = fs.readFileSync(backupPath, 'utf-8');
    fs.writeFileSync(path.join(process.cwd(), 'database.json'), data, 'utf-8');
    res.json({ success: true, message: 'Database restored successfully!' });
  } else {
    res.status(404).json({ error: 'No backup file found to restore.' });
  }
});


// Socket.io Real-time state management
io.on('connection', (socket: Socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // 1. Client registers as a specific PC
  socket.on('client:register', (pcId: string) => {
    connectedClients.set(pcId, socket.id);
    socketToPc.set(socket.id, pcId);

    // Update PC status to Available or preserve In Use status
    const computers = db.getComputers();
    const pc = computers.find(c => c.id === pcId);
    if (pc) {
      if (pc.status === 'Offline') {
        pc.status = 'Available';
      }
      db.updateComputer(pc);
    }

    // Broadcast updated computer list to cashier
    io.emit('server:computers', db.getComputers());
    // Send initial custom config to the client
    socket.emit('client:registered', pc);
  });

  // 2. Client Heartbeat (every 5 seconds)
  socket.on('client:heartbeat', (pcId: string) => {
    const computers = db.getComputers();
    const pc = computers.find(c => c.id === pcId);
    if (pc) {
      pc.lastHeartbeat = Date.now();
      db.updateComputer(pc);
    }
  });

  // 3. Client Client-Login (Player / Guest)
  socket.on('client:login', (data: { pcId: string; username?: string; password?: string; isGuest: boolean; rateId?: string }) => {
    const { pcId, username, password, isGuest, rateId } = data;
    const computers = db.getComputers();
    const pc = computers.find(c => c.id === pcId);
    if (!pc) return socket.emit('login:error', 'Computer profile not found.');

    if (isGuest) {
      // Guest login flow
      const rates = db.getRates();
      const selectedRate = rates.find(r => r.id === rateId) || rates[0]; // default rate
      const minutes = selectedRate.durationMinutes > 0 ? selectedRate.durationMinutes : 60;

      pc.status = 'In Use';
      pc.currentUser = 'Guest';
      pc.playerId = null;
      pc.remainingTime = minutes * 60;
      pc.totalTime = minutes * 60;
      pc.balance = 0;
      pc.rateName = selectedRate.name;
      pc.locked = false;
      pc.isPaused = false;

      db.updateComputer(pc);

      db.addTransaction({
        id: `TX-${Date.now()}`,
        timestamp: new Date().toISOString(),
        playerId: null,
        username: 'Guest',
        pcId: pc.id,
        type: 'Login',
        amount: selectedRate.price,
        description: `Guest logged in with pre-paid rate: ${selectedRate.name}`,
      });

      socket.emit('login:success', pc);
      io.emit('server:computers', db.getComputers());
    } else {
      // Player Login flow
      const players = db.getPlayers();
      const player = players.find(p => p.username.toLowerCase() === username?.toLowerCase());
      if (!player) {
        return socket.emit('login:error', 'Incorrect username or password.');
      }
      if (player.passwordHash !== password) {
        return socket.emit('login:error', 'Incorrect username or password.');
      }
      if (player.status === 'Disabled') {
        return socket.emit('login:error', 'Your account is disabled. Please contact the administrator.');
      }

      // Check balance
      if (player.balance <= 0) {
        return socket.emit('login:error', 'Insufficient balance. Please top up at the cashier desk.');
      }

      // Calculate time based on player balance and their membership / base rate
      // Base rate: 25 currency units per hour (0.416 currency per minute, ~0.007 per second)
      // VIP accounts get a 15% discount (meaning rate is cheaper, more time)
      let ratePerHour = 25;
      if (player.membership === 'VIP') ratePerHour = 20;
      else if (player.membership === 'Gold') ratePerHour = 22;
      else if (player.membership === 'Silver') ratePerHour = 23;

      const ratePerSecond = ratePerHour / 3600;
      const secondsCredit = Math.floor(player.balance / ratePerSecond);

      pc.status = 'In Use';
      pc.currentUser = player.username;
      pc.playerId = player.id;
      pc.remainingTime = Math.min(secondsCredit, 12 * 3600); // capped at 12 hours max per session
      pc.totalTime = pc.remainingTime;
      pc.balance = player.balance;
      pc.rateName = `${player.membership} Rate (${ratePerHour}/${player.membership})`;
      pc.locked = false;
      pc.isPaused = false;

      db.updateComputer(pc);

      // Save player last login
      player.lastLogin = new Date().toISOString();
      db.updatePlayer(player);

      db.addTransaction({
        id: `TX-${Date.now()}`,
        timestamp: new Date().toISOString(),
        playerId: player.id,
        username: player.username,
        pcId: pc.id,
        type: 'Login',
        amount: 0,
        description: `Player logged in with balance ${player.balance.toFixed(2)}. Allocated time: ${Math.floor(pc.remainingTime / 60)}m`,
      });

      socket.emit('login:success', pc);
      io.emit('server:computers', db.getComputers());
    }
  });

  // 4. Client manual logout
  socket.on('client:logout', (pcId: string) => {
    logoutPC(pcId, 'Manual Logout');
  });

  // 5. Timer reaches zero
  socket.on('client:timerExpired', (pcId: string) => {
    logoutPC(pcId, 'Session Expired');
  });

  // 6. Cashier triggered Actions via WebSocket
  socket.on('server:action', (payload: { pcId: string; type: string; value?: any }) => {
    const { pcId, type, value } = payload;
    const computers = db.getComputers();
    const pc = computers.find(c => c.id === pcId);
    const socketId = connectedClients.get(pcId);

    if (!pc) return;

    switch (type) {
      case 'addTime': {
        const addedSecs = Number(value) * 60;
        if (pc.status === 'In Use') {
          pc.remainingTime += addedSecs;
          pc.totalTime += addedSecs;
          db.updateComputer(pc);
          if (socketId) {
            io.to(socketId).emit('client:update', pc);
            io.to(socketId).emit('client:popup', `The cashier added ${value} minutes to your session!`);
          }
          db.addTransaction({
            id: `TX-${Date.now()}`,
            timestamp: new Date().toISOString(),
            playerId: pc.playerId,
            username: pc.currentUser || 'Guest',
            pcId: pc.id,
            type: 'Time Extension',
            amount: 0,
            description: `Cashier added ${value} mins to active session.`,
          });
        }
        break;
      }
      case 'removeTime': {
        const subSecs = Number(value) * 60;
        if (pc.status === 'In Use') {
          pc.remainingTime = Math.max(0, pc.remainingTime - subSecs);
          db.updateComputer(pc);
          if (socketId) {
            io.to(socketId).emit('client:update', pc);
            io.to(socketId).emit('client:popup', `The cashier subtracted ${value} minutes from your session.`);
          }
        }
        break;
      }
      case 'pause':
        if (pc.status === 'In Use') {
          pc.isPaused = true;
          db.updateComputer(pc);
          if (socketId) {
            io.to(socketId).emit('client:update', pc);
          }
        }
        break;
      case 'resume':
        if (pc.status === 'In Use') {
          pc.isPaused = false;
          db.updateComputer(pc);
          if (socketId) {
            io.to(socketId).emit('client:update', pc);
          }
        }
        break;
      case 'stop':
      case 'forceLogout':
        logoutPC(pcId, 'Forced Logout by Cashier');
        break;
      case 'lock':
        pc.locked = true;
        db.updateComputer(pc);
        if (socketId) io.to(socketId).emit('client:lock');
        break;
      case 'unlock':
        pc.locked = false;
        db.updateComputer(pc);
        if (socketId) io.to(socketId).emit('client:unlock');
        break;
      case 'shutdown':
        if (socketId) io.to(socketId).emit('client:shutdown');
        logoutPC(pcId, 'PC Shutdown');
        break;
      case 'restart':
        if (socketId) io.to(socketId).emit('client:restart');
        logoutPC(pcId, 'PC Restart');
        break;
      case 'popup':
        if (socketId) io.to(socketId).emit('client:popup', value || 'Message from cashier.');
        break;
      case 'announcement':
        io.emit('client:announcement', value || 'Global announcement from cashier desk.');
        break;
      case 'screenshot':
        // Trigger a fake screenshot request to return a high quality mock game visual
        if (socketId) {
          io.to(socketId).emit('client:request_screenshot');
        }
        break;
    }

    io.emit('server:computers', db.getComputers());
  });

  // Client responds with screenshots
  socket.on('client:screenshot_response', (payload: { pcId: string; imageBase64: string }) => {
    // Send it back to the active cashier channels
    io.emit('server:screenshot_ready', payload);
  });

  // 7. Socket disconnects
  socket.on('disconnect', () => {
    const pcId = socketToPc.get(socket.id);
    if (pcId) {
      connectedClients.delete(pcId);
      socketToPc.delete(socket.id);

      // Update computer status to Offline
      const computers = db.getComputers();
      const pc = computers.find(c => c.id === pcId);
      if (pc) {
        pc.status = 'Offline';
        db.updateComputer(pc);
      }
      io.emit('server:computers', db.getComputers());
      console.log(`PC Disconnected: ${pcId}`);
    }
  });
});

// Helper function to safely log out a computer
function logoutPC(pcId: string, reason: string) {
  const computers = db.getComputers();
  const pc = computers.find(c => c.id === pcId);
  const socketId = connectedClients.get(pcId);

  if (pc && pc.status === 'In Use') {
    const elapsedSeconds = pc.totalTime - pc.remainingTime;

    // If it was a registered player, calculate dynamic refund or actual deduction
    if (pc.playerId) {
      const players = db.getPlayers();
      const player = players.find(p => p.id === pc.playerId);
      if (player) {
        // Calculate rate per hour based on membership
        let ratePerHour = 25;
        if (player.membership === 'VIP') ratePerHour = 20;
        else if (player.membership === 'Gold') ratePerHour = 22;
        else if (player.membership === 'Silver') ratePerHour = 23;

        const actualCost = (elapsedSeconds / 3600) * ratePerHour;
        const refundAmount = Math.max(0, pc.balance - actualCost);

        // Deduct player actual cost and set final balance
        player.balance = Math.max(0, player.balance - actualCost);
        db.updatePlayer(player);

        db.addTransaction({
          id: `TX-${Date.now()}`,
          timestamp: new Date().toISOString(),
          playerId: player.id,
          username: player.username,
          pcId: pc.id,
          type: 'Logout',
          amount: actualCost,
          description: `${reason}. Played for ${Math.floor(elapsedSeconds / 60)}m. Deducted ${actualCost.toFixed(2)}. Final balance: ${player.balance.toFixed(2)}`,
        });
      }
    } else {
      // Guest logout
      db.addTransaction({
        id: `TX-${Date.now()}`,
        timestamp: new Date().toISOString(),
        playerId: null,
        username: 'Guest',
        pcId: pc.id,
        type: 'Logout',
        amount: 0,
        description: `${reason}. Played for ${Math.floor(elapsedSeconds / 60)}m.`,
      });
    }

    pc.status = 'Available';
    pc.currentUser = null;
    pc.playerId = null;
    pc.remainingTime = 0;
    pc.totalTime = 0;
    pc.balance = 0;
    pc.rateName = null;
    pc.locked = true;
    pc.isPaused = false;

    db.updateComputer(pc);

    // Send command to client socket to clear and lock
    if (socketId) {
      io.to(socketId).emit('client:force_logout', reason);
    }
  }
}

// Background core tick interval (updates timer countdown every 1 second)
setInterval(() => {
  const computers = db.getComputers();
  let updated = false;

  computers.forEach(pc => {
    // Only tick computers that are active and not paused
    if (pc.status === 'In Use' && !pc.isPaused && connectedClients.has(pc.id)) {
      if (pc.remainingTime > 0) {
        pc.remainingTime -= 1;
        updated = true;

        // Dynamic Balance Deduction warnings
        if (pc.playerId) {
          const players = db.getPlayers();
          const player = players.find(p => p.id === pc.playerId);
          if (player) {
            // Live update the PC balance to track real-time depletion
            let ratePerHour = 25;
            if (player.membership === 'VIP') ratePerHour = 20;
            else if (player.membership === 'Gold') ratePerHour = 22;
            else if (player.membership === 'Silver') ratePerHour = 23;

            const secondCost = ratePerHour / 3600;
            pc.balance = Math.max(0, pc.balance - secondCost);
            // Sync depletion back to the player record periodically (or at logout, but let's keep client synced)
            player.balance = pc.balance;
            db.updatePlayer(player);
          }
        }

        // Warning alerts on low balance/time
        if (pc.remainingTime === 300) { // 5 minutes remaining
          const socketId = connectedClients.get(pc.id);
          if (socketId) {
            io.to(socketId).emit('client:popup', 'Your session has only 5 minutes remaining! Please top up at the cashier.');
          }
        }

        // Safe database update
        db.updateComputer(pc);

        // Send periodic update event to that client
        const socketId = connectedClients.get(pc.id);
        if (socketId) {
          io.to(socketId).emit('client:update', pc);
        }
      } else {
        // Time expired
        logoutPC(pc.id, 'Session Expired');
        updated = true;
      }
    }
  });

  if (updated) {
    io.emit('server:computers', db.getComputers());
  }
}, 1000);

// Offline cleanup heartbeat check (every 5 seconds)
setInterval(() => {
  const computers = db.getComputers();
  let updated = false;

  computers.forEach(pc => {
    // If socket thinks it's offline but db status says Available/In Use, double check
    if (pc.status !== 'Offline') {
      const isSocketConnected = connectedClients.has(pc.id);
      if (!isSocketConnected) {
        // No socket mapped, mark as offline
        pc.status = 'Offline';
        db.updateComputer(pc);
        updated = true;
      }
    }
  });

  if (updated) {
    io.emit('server:computers', db.getComputers());
  }
}, 5000);


// Serve Vite or build output
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
