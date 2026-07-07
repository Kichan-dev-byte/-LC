/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { Computer, Player, Rate, Transaction, Settings, SystemUser } from '../src/types';

const DB_PATH = path.join(process.cwd(), 'database.json');

interface DatabaseSchema {
  computers: Computer[];
  players: Player[];
  rates: Rate[];
  transactions: Transaction[];
  settings: Settings;
  systemUsers: SystemUser[];
}

const DEFAULT_RATES: Rate[] = [
  { id: 'rate-1', name: '30 Minutes', durationMinutes: 30, price: 15, type: 'Regular' },
  { id: 'rate-2', name: '1 Hour', durationMinutes: 60, price: 25, type: 'Regular' },
  { id: 'rate-3', name: '2 Hours', durationMinutes: 120, price: 45, type: 'Regular' },
  { id: 'rate-4', name: '3 Hours', durationMinutes: 180, price: 60, type: 'Regular' },
  { id: 'rate-5', name: 'Overnight (8 hrs)', durationMinutes: 480, price: 120, type: 'Night' },
  { id: 'rate-6', name: 'Custom / Open Time', durationMinutes: -1, price: 30, type: 'Regular' }, // price per hour
];

const DEFAULT_COMPUTERS: Computer[] = Array.from({ length: 12 }, (_, i) => {
  const id = `PC-${String(i + 1).padStart(2, '0')}`;
  return {
    id,
    name: `Computer ${String(i + 1).padStart(2, '0')}`,
    status: 'Offline',
    currentUser: null,
    playerId: null,
    remainingTime: 0,
    totalTime: 0,
    balance: 0,
    rateName: null,
    locked: true,
    isPaused: false,
    lastHeartbeat: 0,
  };
});

const DEFAULT_PLAYERS: Player[] = [
  {
    id: 'PL-001',
    username: 'john_regular',
    passwordHash: 'password123', // Clean text or hash for simulation ease
    fullName: 'John Doe',
    phone: '555-0199',
    balance: 100,
    membership: 'Regular',
    dateCreated: new Date().toISOString(),
    lastLogin: null,
    status: 'Active',
  },
  {
    id: 'PL-002',
    username: 'sarah_vip',
    passwordHash: 'password123',
    fullName: 'Sarah Connor',
    phone: '555-0144',
    balance: 350,
    membership: 'VIP',
    dateCreated: new Date().toISOString(),
    lastLogin: null,
    status: 'Active',
  },
  {
    id: 'PL-003',
    username: 'alex_gold',
    passwordHash: 'password123',
    fullName: 'Alex Mercer',
    phone: '555-0177',
    balance: 50,
    membership: 'Gold',
    dateCreated: new Date().toISOString(),
    lastLogin: null,
    status: 'Active',
  },
];

const DEFAULT_SYSTEM_USERS: SystemUser[] = [
  { id: 'sys-1', username: 'admin', fullName: 'Main Administrator', role: 'Admin', status: 'Active' },
  { id: 'sys-2', username: 'cashier', fullName: 'Shift Cashier', role: 'Cashier', status: 'Active' },
];

const DEFAULT_SETTINGS: Settings = {
  shopName: 'Elite LAN Gaming Center',
  currency: 'PHP',
  language: 'English',
  darkMode: true,
  autoBackup: true,
};

function readDB(): DatabaseSchema {
  try {
    if (!fs.existsSync(DB_PATH)) {
      const initialData: DatabaseSchema = {
        computers: DEFAULT_COMPUTERS,
        players: DEFAULT_PLAYERS,
        rates: DEFAULT_RATES,
        transactions: [],
        settings: DEFAULT_SETTINGS,
        systemUsers: DEFAULT_SYSTEM_USERS,
      };
      fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2), 'utf-8');
      return initialData;
    }
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading database file, returning defaults', error);
    return {
      computers: DEFAULT_COMPUTERS,
      players: DEFAULT_PLAYERS,
      rates: DEFAULT_RATES,
      transactions: [],
      settings: DEFAULT_SETTINGS,
      systemUsers: DEFAULT_SYSTEM_USERS,
    };
  }
}

function writeDB(data: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing to database file', error);
  }
}

export const db = {
  // Computers
  getComputers(): Computer[] {
    return readDB().computers;
  },
  saveComputers(computers: Computer[]) {
    const data = readDB();
    data.computers = computers;
    writeDB(data);
  },
  updateComputer(computer: Computer) {
    const data = readDB();
    const idx = data.computers.findIndex(c => c.id === computer.id);
    if (idx !== -1) {
      data.computers[idx] = computer;
      writeDB(data);
    }
  },

  // Players
  getPlayers(): Player[] {
    return readDB().players;
  },
  savePlayers(players: Player[]) {
    const data = readDB();
    data.players = players;
    writeDB(data);
  },
  addPlayer(player: Player) {
    const data = readDB();
    data.players.push(player);
    writeDB(data);
  },
  updatePlayer(player: Player) {
    const data = readDB();
    const idx = data.players.findIndex(p => p.id === player.id);
    if (idx !== -1) {
      data.players[idx] = player;
      writeDB(data);
    }
  },
  deletePlayer(playerId: string) {
    const data = readDB();
    data.players = data.players.filter(p => p.id !== playerId);
    writeDB(data);
  },

  // Rates
  getRates(): Rate[] {
    return readDB().rates;
  },
  saveRates(rates: Rate[]) {
    const data = readDB();
    data.rates = rates;
    writeDB(data);
  },

  // Transactions
  getTransactions(): Transaction[] {
    return readDB().transactions;
  },
  addTransaction(tx: Transaction) {
    const data = readDB();
    data.transactions.unshift(tx); // Newest first
    writeDB(data);
  },

  // Settings
  getSettings(): Settings {
    return readDB().settings;
  },
  saveSettings(settings: Settings) {
    const data = readDB();
    data.settings = settings;
    writeDB(data);
  },

  // System Users
  getSystemUsers(): SystemUser[] {
    return readDB().systemUsers;
  },
  saveSystemUsers(users: SystemUser[]) {
    const data = readDB();
    data.systemUsers = users;
    writeDB(data);
  }
};
