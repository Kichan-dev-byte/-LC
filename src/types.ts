/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PCStatus = 'Available' | 'In Use' | 'Offline';

export interface Computer {
  id: string; // e.g. "PC-01"
  name: string; // e.g. "PC 01"
  status: PCStatus;
  currentUser: string | null;
  playerId: string | null;
  remainingTime: number; // in seconds
  totalTime: number; // in seconds
  balance: number;
  rateName: string | null;
  locked: boolean;
  isPaused: boolean;
  lastHeartbeat: number;
}

export interface Player {
  id: string;
  username: string;
  passwordHash: string;
  fullName: string;
  phone: string;
  balance: number;
  membership: 'Regular' | 'Silver' | 'Gold' | 'VIP';
  dateCreated: string;
  lastLogin: string | null;
  status: 'Active' | 'Disabled';
}

export interface Rate {
  id: string;
  name: string;
  durationMinutes: number; // -1 for custom/open time
  price: number;
  type: 'Regular' | 'Silver' | 'Gold' | 'VIP' | 'Promo' | 'Night';
}

export interface Transaction {
  id: string;
  timestamp: string;
  playerId: string | null;
  username: string;
  pcId: string | null;
  type: 'Login' | 'Logout' | 'Top Up' | 'Deduction' | 'Time Extension' | 'Refund';
  amount: number;
  description: string;
}

export interface Settings {
  shopName: string;
  currency: string;
  language: string;
  darkMode: boolean;
  autoBackup: boolean;
}

export interface SystemUser {
  id: string;
  username: string;
  fullName: string;
  role: 'Admin' | 'Cashier';
  status: 'Active' | 'Disabled';
}
