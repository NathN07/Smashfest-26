import React, { createContext, useReducer, useContext, useEffect, useState, useMemo, useRef } from 'react';
import { 
  Trophy, Users, CalendarDays, LayoutDashboard, SettingsIcon, 
  CheckCircle2, X, Plus, Edit2, Shield,
  Swords, Activity, Trash2, RotateCcw, AlertTriangle, ArrowRight,
  UploadCloud, Medal, History, Check, Save, Zap, Lock, Unlock, User, Wifi, WifiOff
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, doc, setDoc } from 'firebase/firestore';

const appId = typeof __app_id !== 'undefined' ? __app_id : 'smashfest-local-deploy';
const firebaseConfigStr = typeof __firebase_config !== 'undefined' ? __firebase_config : null;
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Storage key updated to clear old browser cache safely
const LOCAL_STORAGE_KEY = 'smashfest_state_v15_vct_final'; 

let firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

if (firebaseConfigStr) {
  try { firebaseConfig = JSON.parse(firebaseConfigStr); } catch(e) {}
}

const SYNC_ENABLED = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

const app = SYNC_ENABLED ? initializeApp(firebaseConfig) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
const stateDocRef = () => doc(db, 'artifacts', appId, 'public', 'data', 'live_tournament', 'state');

const stableStringify = (v) => JSON.stringify(v, (k, val) =>
  val && typeof val === 'object' && !Array.isArray(val)
    ? Object.keys(val).sort().reduce((o, key) => { o[key] = val[key]; return o; }, {})
    : val);

const INITIAL_TEAMS = [
  { id: 't1', code: 'A1', player1: 'Utpal', player2: 'Pardeep', group: 'A', seed: 1 },
  { id: 't2', code: 'A2', player1: 'Madhwan', player2: 'Utkarsh', group: 'A', seed: 2 },
  { id: 't3', code: 'A3', player1: 'Vishal', player2: 'Vineet', group: 'A', seed: 3 },
  { id: 't4', code: 'A4', player1: 'Vishwash', player2: 'Himanshu', group: 'A', seed: 4 },
  { id: 't5', code: 'A5', player1: 'Moksh', player2: 'Nitin', group: 'A', seed: 5 },
  { id: 't6', code: 'A6', player1: 'Fazlu', player2: 'Chetan', group: 'A', seed: 6 },
  
  { id: 't7', code: 'B1', player1: 'Omm', player2: 'Shivam', group: 'B', seed: 1 },
  { id: 't8', code: 'B2', player1: 'Himanshu', player2: 'Ansh', group: 'B', seed: 2 },
  { id: 't9', code: 'B3', player1: 'Abhitesh', player2: 'Devansh', group: 'B', seed: 3 },
  { id: 't10', code: 'B4', player1: 'Om', player2: 'Eklavya', group: 'B', seed: 4 },
  { id: 't11', code: 'B5', player1: 'Saloni', player2: 'A1', group: 'B', seed: 5 },
  { id: 't12', code: 'B6', player1: 'Nishant', player2: 'Taqi', group: 'B', seed: 6 },
];

const DEFAULT_SETTINGS = {
  tournamentName: "SMASHFEST '26",
  pointsWin: 2, pointsLoss: 0, bestOf: 3, pointsPerGame: 11, tables: 2,
};

const INITIAL_MATCHES = [
  { id: 'm1', groupId: 'B', round: 'Day 01', teamAId: 't7', teamBId: 't8', status: 'upcoming', scores: [], winnerId: null, table: 'Table 1', date: '10/06/2026', time: '10:00' },
  { id: 'm2', groupId: 'B', round: 'Day 01', teamAId: 't9', teamBId: 't10', status: 'upcoming', scores: [], winnerId: null, table: 'Table 2', date: '10/06/2026', time: '10:00' },
  { id: 'm3', groupId: 'A', round: 'Day 01', teamAId: 't2', teamBId: 't3', status: 'upcoming', scores: [], winnerId: null, table: 'Table 1', date: '10/06/2026', time: '10:30' },
  { id: 'm4', groupId: 'A', round: 'Day 01', teamAId: 't1', teamBId: 't4', status: 'upcoming', scores: [], winnerId: null, table: 'Table 2', date: '10/06/2026', time: '10:30' },
  { id: 'm5', groupId: 'B', round: 'Day 02', teamAId: 't7', teamBId: 't9', status: 'upcoming', scores: [], winnerId: null, table: 'Table 1', date: '10/07/2026', time: '10:00' },
  { id: 'm6', groupId: 'B', round: 'Day 02', teamAId: 't10', teamBId: 't12', status: 'upcoming', scores: [], winnerId: null, table: 'Table 2', date: '10/07/2026', time: '10:00' },
  { id: 'm7', groupId: 'A', round: 'Day 02', teamAId: 't2', teamBId: 't6', status: 'upcoming', scores: [], winnerId: null, table: 'Table 1', date: '10/07/2026', time: '10:30' },
  { id: 'm8', groupId: 'A', round: 'Day 02', teamAId: 't3', teamBId: 't4', status: 'upcoming', scores: [], winnerId: null, table: 'Table 2', date: '10/07/2026', time: '10:30' },
  { id: 'm9', groupId: 'B', round: 'Day 03', teamAId: 't8', teamBId: 't12', status: 'upcoming', scores: [], winnerId: null, table: 'Table 1', date: '10/08/2026', time: '10:00' },
  { id: 'm10', groupId: 'B', round: 'Day 03', teamAId: 't10', teamBId: 't11', status: 'upcoming', scores: [], winnerId: null, table: 'Table 2', date: '10/08/2026', time: '10:00' },
  { id: 'm11', groupId: 'A', round: 'Day 03', teamAId: 't4', teamBId: 't6', status: 'upcoming', scores: [], winnerId: null, table: 'Table 1', date: '10/08/2026', time: '10:30' },
  { id: 'm12', groupId: 'A', round: 'Day 03', teamAId: 't3', teamBId: 't5', status: 'upcoming', scores: [], winnerId: null, table: 'Table 2', date: '10/08/2026', time: '10:30' },
  { id: 'm13', groupId: 'B', round: 'Day 04', teamAId: 't8', teamBId: 't10', status: 'upcoming', scores: [], winnerId: null, table: 'Table 1', date: '10/09/2026', time: '10:00' },
  { id: 'm14', groupId: 'B', round: 'Day 04', teamAId: 't9', teamBId: 't11', status: 'upcoming', scores: [], winnerId: null, table: 'Table 2', date: '10/09/2026', time: '10:00' },
  { id: 'm15', groupId: 'A', round: 'Day 04', teamAId: 't5', teamBId: 't6', status: 'upcoming', scores: [], winnerId: null, table: 'Table 1', date: '10/09/2026', time: '10:30' },
  { id: 'm16', groupId: 'A', round: 'Day 04', teamAId: 't1', teamBId: 't2', status: 'upcoming', scores: [], winnerId: null, table: 'Table 2', date: '10/09/2026', time: '10:30' },
  { id: 'm17', groupId: 'B', round: 'Day 05', teamAId: 't7', teamBId: 't11', status: 'upcoming', scores: [], winnerId: null, table: 'Table 1', date: '10/12/2026', time: '10:00' },
  { id: 'm18', groupId: 'B', round: 'Day 05', teamAId: 't9', teamBId: 't12', status: 'upcoming', scores: [], winnerId: null, table: 'Table 2', date: '10/12/2026', time: '10:00' },
  { id: 'm19', groupId: 'A', round: 'Day 05', teamAId: 't1', teamBId: 't6', status: 'upcoming', scores: [], winnerId: null, table: 'Table 1', date: '10/12/2026', time: '10:30' },
  { id: 'm20', groupId: 'A', round: 'Day 05', teamAId: 't4', teamBId: 't5', status: 'upcoming', scores: [], winnerId: null, table: 'Table 2', date: '10/12/2026', time: '10:30' },
  { id: 'm21', groupId: 'B', round: 'Day 06', teamAId: 't7', teamBId: 't10', status: 'upcoming', scores: [], winnerId: null, table: 'Table 1', date: '10/13/2026', time: '10:00' },
  { id: 'm22', groupId: 'B', round: 'Day 06', teamAId: 't8', teamBId: 't9', status: 'upcoming', scores: [], winnerId: null, table: 'Table 2', date: '10/13/2026', time: '10:00' },
  { id: 'm23', groupId: 'B', round: 'Day 06', teamAId: 't11', teamBId: 't12', status: 'upcoming', scores: [], winnerId: null, table: 'Table 1', date: '10/13/2026', time: '10:30' },
  { id: 'm24', groupId: 'A', round: 'Day 06', teamAId: 't2', teamBId: 't5', status: 'upcoming', scores: [], winnerId: null, table: 'Table 2', date: '10/13/2026', time: '10:30' },
  { id: 'm25', groupId: 'A', round: 'Day 06', teamAId: 't1', teamBId: 't3', status: 'upcoming', scores: [], winnerId: null, table: 'Table 1', date: '10/13/2026', time: '11:00' },
  { id: 'm26', groupId: 'B', round: 'Day 07', teamAId: 't7', teamBId: 't12', status: 'upcoming', scores: [], winnerId: null, table: 'Table 1', date: '10/14/2026', time: '10:00' },
  { id: 'm27', groupId: 'B', round: 'Day 07', teamAId: 't8', teamBId: 't11', status: 'upcoming', scores: [], winnerId: null, table: 'Table 2', date: '10/14/2026', time: '10:00' },
  { id: 'm28', groupId: 'A', round: 'Day 07', teamAId: 't3', teamBId: 't6', status: 'upcoming', scores: [], winnerId: null, table: 'Table 1', date: '10/14/2026', time: '10:30' },
  { id: 'm29', groupId: 'A', round: 'Day 07', teamAId: 't2', teamBId: 't4', status: 'upcoming', scores: [], winnerId: null, table: 'Table 2', date: '10/14/2026', time: '10:30' },
  { id: 'm30', groupId: 'A', round: 'Day 07', teamAId: 't1', teamBId: 't5', status: 'upcoming', scores: [], winnerId: null, table: 'Table 1', date: '10/14/2026', time: '11:00' },
  { id: 'ko_qf1', groupId: 'KO', round: 'QF', teamAId: null, teamBId: null, status: 'upcoming', scores: [], winnerId: null, table: 'Table 1', date: '', time: '' },
  { id: 'ko_qf2', groupId: 'KO', round: 'QF', teamAId: null, teamBId: null, status: 'upcoming', scores: [], winnerId: null, table: 'Table 2', date: '', time: '' },
  { id: 'ko_qf3', groupId: 'KO', round: 'QF', teamAId: null, teamBId: null, status: 'upcoming', scores: [], winnerId: null, table: 'Table 1', date: '', time: '' },
  { id: 'ko_qf4', groupId: 'KO', round: 'QF', teamAId: null, teamBId: null, status: 'upcoming', scores: [], winnerId: null, table: 'Table 2', date: '', time: '' },
  { id: 'ko_sf1', groupId: 'KO', round: 'SF', teamAId: null, teamBId: null, status: 'upcoming', scores: [], winnerId: null, table: 'Center Court', date: '', time: '' },
  { id: 'ko_sf2', groupId: 'KO', round: 'SF', teamAId: null, teamBId: null, status: 'upcoming', scores: [], winnerId: null, table: 'Center Court', date: '', time: '' },
  { id: 'ko_final', groupId: 'KO', round: 'F', teamAId: null, teamBId: null, status: 'upcoming', scores: [], winnerId: null, table: 'Center Court', date: '', time: '' },
];

// Added exactly from your poster to fix missing names
const INITIAL_SINGLES_PLAYERS = [
  { id: 's_a1', code: 'A1', player1: 'Utpal Tripathi', seed: 1 },
  { id: 's_a2', code: 'A2', player1: 'Madhwan Rai', seed: 2 },
  { id: 's_a3', code: 'A3', player1: 'Saloni Kumari', seed: 3 },
  { id: 's_a4', code: 'A4', player1: 'Fazlu', seed: 4 },
  { id: 's_a5', code: 'A5', player1: 'Pardeep Sir', seed: 5 },
  { id: 's_a6', code: 'A6', player1: 'Moksh Yadav', seed: 6 },
  { id: 's_a7', code: 'A7', player1: 'Extra Mem', seed: 7 },
  { id: 's_a8', code: 'A8', player1: 'Taqi', seed: 8 },
  { id: 's_a9', code: 'A9', player1: 'Himanshu Deb', seed: 9 },
  { id: 's_a10', code: 'A10', player1: 'Nitin Maurya', seed: 10 },
  { id: 's_a11', code: 'A11', player1: 'Abhitesh Srivastava', seed: 11 },
  { id: 's_a12', code: 'A12', player1: 'Nishant', seed: 12 },
  { id: 's_a13', code: 'A13', player1: 'Vishal', seed: 13 },
  { id: 's_a14', code: 'A14', player1: 'Omm Prakash Lenka', seed: 14 },
  { id: 's_a15', code: 'A15', player1: 'Devansh Singh', seed: 15 },
  { id: 's_a16', code: 'A16', player1: 'Karan Kamal', seed: 16 },
  { id: 's_a17', code: 'A17', player1: 'Ansh Pratap Rao', seed: 17 },
  { id: 's_a18', code: 'A18', player1: 'Utkarsh Yaduvanshi', seed: 18 },
  { id: 's_a19', code: 'A19', player1: 'Om Mishra', seed: 19 },
  { id: 's_a20', code: 'A20', player1: 'Chetan Sharma', seed: 20 },
  { id: 's_a21', code: 'A21', player1: 'Vineet K. Yadav', seed: 21 },
  { id: 's_a22', code: 'A22', player1: 'Shivam Singh', seed: 22 },
  { id: 's_a23', code: 'A23', player1: 'Eklavya', seed: 23 },
  { id: 's_a24', code: 'A24', player1: 'Vishnu K. Pandey', seed: 24 }
];

const S_MATCH_TEMPLATE = (id, a, b, title) => ({
  id, isSingles: true, title, teamAId: a, teamBId: b, status: 'upcoming', scores: [], winnerId: null
});

const INITIAL_SINGLES_MATCHES = [
  S_MATCH_TEMPLATE('M1', 's_a1', 's_a24', 'M1 (6 Oct)'), S_MATCH_TEMPLATE('M2', 's_a12', 's_a13', 'M2 (6 Oct)'),
  S_MATCH_TEMPLATE('M3', 's_a6', 's_a19', 'M3 (6 Oct)'), S_MATCH_TEMPLATE('M4', 's_a7', 's_a18', 'M4 (6 Oct)'),
  S_MATCH_TEMPLATE('M5', 's_a4', 's_a21', 'M5 (6 Oct)'), S_MATCH_TEMPLATE('M6', 's_a9', 's_a16', 'M6 (6 Oct)'),
  S_MATCH_TEMPLATE('M7', 's_a5', 's_a20', 'M7 (9 Oct)'), S_MATCH_TEMPLATE('M8', 's_a8', 's_a17', 'M8 (7 Oct)'),
  S_MATCH_TEMPLATE('M9', 's_a3', 's_a22', 'M9 (7 Oct)'), S_MATCH_TEMPLATE('M10', 's_a10', 's_a15', 'M10 (7 Oct)'),
  S_MATCH_TEMPLATE('M11', 's_a2', 's_a23', 'M11 (7 Oct)'), S_MATCH_TEMPLATE('M12', 's_a11', 's_a14', 'M12 (7 Oct)'),
  
  S_MATCH_TEMPLATE('W1', null, null, 'W1 (8 Oct)'), S_MATCH_TEMPLATE('W2', null, null, 'W2 (8 Oct)'),
  S_MATCH_TEMPLATE('W3', null, null, 'W3 (8 Oct)'), S_MATCH_TEMPLATE('W4', null, null, 'W4 (9 Oct)'),
  S_MATCH_TEMPLATE('W5', null, null, 'W5 (9 Oct)'), S_MATCH_TEMPLATE('W6', null, null, 'W6 (7 Oct)'),

  S_MATCH_TEMPLATE('L1', null, null, 'L1 (8 Oct)'), S_MATCH_TEMPLATE('L2', null, null, 'L2 (8 Oct)'),
  S_MATCH_TEMPLATE('L3', null, null, 'L3 (8 Oct)'), S_MATCH_TEMPLATE('L4', null, null, 'L4 (9 Oct)'),
  S_MATCH_TEMPLATE('L5', null, null, 'L5 (9 Oct)'), S_MATCH_TEMPLATE('L6', null, null, 'L6 (9 Oct)'),

  S_MATCH_TEMPLATE('W7', null, null, 'W7 (12 Oct)'), S_MATCH_TEMPLATE('W8', null, null, 'W8 (12 Oct)'),
  S_MATCH_TEMPLATE('W9', null, null, 'W9 (12 Oct)'),

  S_MATCH_TEMPLATE('L7', null, null, 'L7 (12 Oct)'), S_MATCH_TEMPLATE('L8', null, null, 'L8 (12 Oct)'),
  S_MATCH_TEMPLATE('L9', null, null, 'L9 (12 Oct)'), S_MATCH_TEMPLATE('L10', null, null, 'L10 (13 Oct)'),
  S_MATCH_TEMPLATE('L11', null, null, 'L11 (13 Oct)'), S_MATCH_TEMPLATE('L12', null, null, 'L12 (13 Oct)'),
  S_MATCH_TEMPLATE('L13', null, null, 'L13 (13 Oct)'), S_MATCH_TEMPLATE('L14', null, null, 'L14 (13 Oct)'),
  S_MATCH_TEMPLATE('L15', null, null, 'L15 (14 Oct)'),

  S_MATCH_TEMPLATE('L16', null, null, 'L16 (14 Oct)'), S_MATCH_TEMPLATE('L17', null, null, 'L17 (14 Oct)'),
  S_MATCH_TEMPLATE('W10', null, null, 'W10 (13 Oct)'),

  S_MATCH_TEMPLATE('SF1', null, null, 'SF1 (15 Oct)'), S_MATCH_TEMPLATE('SF2', null, null, 'SF2 (15 Oct)'),
  S_MATCH_TEMPLATE('GF', null, null, 'GRAND FINAL (16 Oct)'),
];

const INITIAL_STATE = {
  teams: INITIAL_TEAMS, matches: INITIAL_MATCHES, settings: DEFAULT_SETTINGS,
  singlesTeams: INITIAL_SINGLES_PLAYERS, singlesMatches: INITIAL_SINGLES_MATCHES, singlesByeId: null
};

const checkGameWin = (scoreA, scoreB, pointsPerGame) => Math.max(scoreA, scoreB) >= pointsPerGame && Math.abs(scoreA - scoreB) >= 2;
const getMatchWinner = (scores, bestOf, pointsPerGame) => {
  let gamesA = 0, gamesB = 0; const req = Math.ceil(bestOf / 2);
  scores.forEach(s => { if(checkGameWin(s.a, s.b, pointsPerGame)) { if(s.a > s.b) gamesA++; else gamesB++; } });
  if (gamesA >= req) return 'A'; if (gamesB >= req) return 'B'; return null;
};

const calculateGroupStandings = (teams, matches, settings) => {
  const standings = teams.reduce((acc, team) => {
    acc[team.id] = { ...team, MP: 0, W: 0, L: 0, GW: 0, GL: 0, GD: 0, PTS: 0, pointDiff: 0 };
    return acc;
  }, {});

  matches.forEach(match => {
    if (match.status === 'completed' && match.teamAId && match.teamBId) {
      const a = match.teamAId; const b = match.teamBId;
      if (!standings[a] || !standings[b]) return;
      
      standings[a].MP++; standings[b].MP++;
      let gamesA = 0, gamesB = 0; let pointsA = 0, pointsB = 0;
      match.scores.forEach(s => { pointsA += s.a; pointsB += s.b; if (s.a > s.b) gamesA++; else if (s.b > s.a) gamesB++; });
      standings[a].GW += gamesA; standings[a].GL += gamesB; standings[b].GW += gamesB; standings[b].GL += gamesA;
      standings[a].pointDiff += (pointsA - pointsB); standings[b].pointDiff += (pointsB - pointsA);
      
      if (match.winnerId === a) { standings[a].W++; standings[b].L++; standings[a].PTS += settings.pointsWin; standings[b].PTS += settings.pointsLoss; } 
      else if (match.winnerId === b) { standings[b].W++; standings[a].L++; standings[b].PTS += settings.pointsWin; standings[a].PTS += settings.pointsLoss; }
    }
  });

  return Object.values(standings).map(t => { t.GD = t.GW - t.GL; return t; }).sort((a, b) => {
    if (b.PTS !== a.PTS) return b.PTS - a.PTS;
    if (b.W !== a.W) return b.W - a.W;
    if (b.GD !== a.GD) return b.GD - a.GD;
    return b.pointDiff - a.pointDiff;
  });
};

const cascadeSingles = (matches, byeId) => {
  let nm = [...matches];
  const w = (id) => nm.find(m=>m.id===id)?.winnerId || null;
  const l = (id) => {
    const m = nm.find(m=>m.id===id);
    return m && m.winnerId ? (m.winnerId === m.teamAId ? m.teamBId : m.teamAId) : null;
  };
  const set = (id, a, b) => { nm = nm.map(m => m.id === id ? { ...m, teamAId: a !== undefined ? a : m.teamAId, teamBId: b !== undefined ? b : m.teamBId } : m); };

  set('W1', w('M1'), w('M2')); set('L1', l('M1'), l('M2')); set('W2', w('M3'), w('M4')); set
