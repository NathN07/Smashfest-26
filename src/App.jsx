import React, { createContext, useReducer, useContext, useEffect, useState, useMemo } from 'react';
import { 
  Trophy, Users, CalendarDays, LayoutDashboard, SettingsIcon, 
  CheckCircle2, X, Plus, Edit2, Shield,
  Swords, Activity, Trash2, RotateCcw, AlertTriangle, ArrowRight,
  UploadCloud, Medal, History, Check, Save, Zap, Lock, Unlock, User
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query } from 'firebase/firestore';

const appId = typeof __app_id !== 'undefined' ? __app_id : 'smashfest-local-deploy';
const firebaseConfigStr = typeof __firebase_config !== 'undefined' ? __firebase_config : null;
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Storage key updated to ensure fresh load with new structure
const LOCAL_STORAGE_KEY = 'smashfest_state_v10_unified'; 

let firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

if (firebaseConfigStr) {
  try { firebaseConfig = JSON.parse(firebaseConfigStr); } catch(e) {}
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

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
  // Day 1
  { id: 'm1', groupId: 'B', round: 'Day 01', teamAId: 't7', teamBId: 't8', status: 'upcoming', scores: [], winnerId: null, table: 'Table 1', date: '10/06/2026', time: '10:00' },
  { id: 'm2', groupId: 'B', round: 'Day 01', teamAId: 't9', teamBId: 't10', status: 'upcoming', scores: [], winnerId: null, table: 'Table 2', date: '10/06/2026', time: '10:00' },
  { id: 'm3', groupId: 'A', round: 'Day 01', teamAId: 't2', teamBId: 't3', status: 'upcoming', scores: [], winnerId: null, table: 'Table 1', date: '10/06/2026', time: '10:30' },
  { id: 'm4', groupId: 'A', round: 'Day 01', teamAId: 't1', teamBId: 't4', status: 'upcoming', scores: [], winnerId: null, table: 'Table 2', date: '10/06/2026', time: '10:30' },
  // Day 2
  { id: 'm5', groupId: 'B', round: 'Day 02', teamAId: 't7', teamBId: 't9', status: 'upcoming', scores: [], winnerId: null, table: 'Table 1', date: '10/07/2026', time: '10:00' },
  { id: 'm6', groupId: 'B', round: 'Day 02', teamAId: 't10', teamBId: 't12', status: 'upcoming', scores: [], winnerId: null, table: 'Table 2', date: '10/07/2026', time: '10:00' },
  { id: 'm7', groupId: 'A', round: 'Day 02', teamAId: 't2', teamBId: 't6', status: 'upcoming', scores: [], winnerId: null, table: 'Table 1', date: '10/07/2026', time: '10:30' },
  { id: 'm8', groupId: 'A', round: 'Day 02', teamAId: 't3', teamBId: 't4', status: 'upcoming', scores: [], winnerId: null, table: 'Table 2', date: '10/07/2026', time: '10:30' },
  // Day 3
  { id: 'm9', groupId: 'B', round: 'Day 03', teamAId: 't8', teamBId: 't12', status: 'upcoming', scores: [], winnerId: null, table: 'Table 1', date: '10/08/2026', time: '10:00' },
  { id: 'm10', groupId: 'B', round: 'Day 03', teamAId: 't10', teamBId: 't11', status: 'upcoming', scores: [], winnerId: null, table: 'Table 2', date: '10/08/2026', time: '10:00' },
  { id: 'm11', groupId: 'A', round: 'Day 03', teamAId: 't4', teamBId: 't6', status: 'upcoming', scores: [], winnerId: null, table: 'Table 1', date: '10/08/2026', time: '10:30' },
  { id: 'm12', groupId: 'A', round: 'Day 03', teamAId: 't3', teamBId: 't5', status: 'upcoming', scores: [], winnerId: null, table: 'Table 2', date: '10/08/2026', time: '10:30' },
  // Day 4
  { id: 'm13', groupId: 'B', round: 'Day 04', teamAId: 't8', teamBId: 't10', status: 'upcoming', scores: [], winnerId: null, table: 'Table 1', date: '10/09/2026', time: '10:00' },
  { id: 'm14', groupId: 'B', round: 'Day 04', teamAId: 't9', teamBId: 't11', status: 'upcoming', scores: [], winnerId: null, table: 'Table 2', date: '10/09/2026', time: '10:00' },
  { id: 'm15', groupId: 'A', round: 'Day 04', teamAId: 't5', teamBId: 't6', status: 'upcoming', scores: [], winnerId: null, table: 'Table 1', date: '10/09/2026', time: '10:30' },
  { id: 'm16', groupId: 'A', round: 'Day 04', teamAId: 't1', teamBId: 't2', status: 'upcoming', scores: [], winnerId: null, table: 'Table 2', date: '10/09/2026', time: '10:30' },
  // Day 5
  { id: 'm17', groupId: 'B', round: 'Day 05', teamAId: 't7', teamBId: 't11', status: 'upcoming', scores: [], winnerId: null, table: 'Table 1', date: '10/12/2026', time: '10:00' },
  { id: 'm18', groupId: 'B', round: 'Day 05', teamAId: 't9', teamBId: 't12', status: 'upcoming', scores: [], winnerId: null, table: 'Table 2', date: '10/12/2026', time: '10:00' },
  { id: 'm19', groupId: 'A', round: 'Day 05', teamAId: 't1', teamBId: 't6', status: 'upcoming', scores: [], winnerId: null, table: 'Table 1', date: '10/12/2026', time: '10:30' },
  { id: 'm20', groupId: 'A', round: 'Day 05', teamAId: 't4', teamBId: 't5', status: 'upcoming', scores: [], winnerId: null, table: 'Table 2', date: '10/12/2026', time: '10:30' },
  // Day 6
  { id: 'm21', groupId: 'B', round: 'Day 06', teamAId: 't7', teamBId: 't10', status: 'upcoming', scores: [], winnerId: null, table: 'Table 1', date: '10/13/2026', time: '10:00' },
  { id: 'm22', groupId: 'B', round: 'Day 06', teamAId: 't8', teamBId: 't9', status: 'upcoming', scores: [], winnerId: null, table: 'Table 2', date: '10/13/2026', time: '10:00' },
  { id: 'm23', groupId: 'B', round: 'Day 06', teamAId: 't11', teamBId: 't12', status: 'upcoming', scores: [], winnerId: null, table: 'Table 1', date: '10/13/2026', time: '10:30' },
  { id: 'm24', groupId: 'A', round: 'Day 06', teamAId: 't2', teamBId: 't5', status: 'upcoming', scores: [], winnerId: null, table: 'Table 2', date: '10/13/2026', time: '10:30' },
  { id: 'm25', groupId: 'A', round: 'Day 06', teamAId: 't1', teamBId: 't3', status: 'upcoming', scores: [], winnerId: null, table: 'Table 1', date: '10/13/2026', time: '11:00' },
  // Day 7
  { id: 'm26', groupId: 'B', round: 'Day 07', teamAId: 't7', teamBId: 't12', status: 'upcoming', scores: [], winnerId: null, table: 'Table 1', date: '10/14/2026', time: '10:00' },
  { id: 'm27', groupId: 'B', round: 'Day 07', teamAId: 't8', teamBId: 't11', status: 'upcoming', scores: [], winnerId: null, table: 'Table 2', date: '10/14/2026', time: '10:00' },
  { id: 'm28', groupId: 'A', round: 'Day 07', teamAId: 't3', teamBId: 't6', status: 'upcoming', scores: [], winnerId: null, table: 'Table 1', date: '10/14/2026', time: '10:30' },
  { id: 'm29', groupId: 'A', round: 'Day 07', teamAId: 't2', teamBId: 't4', status: 'upcoming', scores: [], winnerId: null, table: 'Table 2', date: '10/14/2026', time: '10:30' },
  { id: 'm30', groupId: 'A', round: 'Day 07', teamAId: 't1', teamBId: 't5', status: 'upcoming', scores: [], winnerId: null, table: 'Table 1', date: '10/14/2026', time: '11:00' },
  // Knockouts (Doubles - QF -> SF -> Final)
  { id: 'ko_qf1', groupId: 'KO', round: 'QF', teamAId: null, teamBId: null, status: 'upcoming', scores: [], winnerId: null, table: 'Table 1', date: '', time: '' },
  { id: 'ko_qf2', groupId: 'KO', round: 'QF', teamAId: null, teamBId: null, status: 'upcoming', scores: [], winnerId: null, table: 'Table 2', date: '', time: '' },
  { id: 'ko_qf3', groupId: 'KO', round: 'QF', teamAId: null, teamBId: null, status: 'upcoming', scores: [], winnerId: null, table: 'Table 1', date: '', time: '' },
  { id: 'ko_qf4', groupId: 'KO', round: 'QF', teamAId: null, teamBId: null, status: 'upcoming', scores: [], winnerId: null, table: 'Table 2', date: '', time: '' },
  { id: 'ko_sf1', groupId: 'KO', round: 'SF', teamAId: null, teamBId: null, status: 'upcoming', scores: [], winnerId: null, table: 'Center Court', date: '', time: '' },
  { id: 'ko_sf2', groupId: 'KO', round: 'SF', teamAId: null, teamBId: null, status: 'upcoming', scores: [], winnerId: null, table: 'Center Court', date: '', time: '' },
  { id: 'ko_final', groupId: 'KO', round: 'F', teamAId: null, teamBId: null, status: 'upcoming', scores: [], winnerId: null, table: 'Center Court', date: '', time: '' },
];

const INITIAL_SINGLES_PLAYERS = Array.from({length: 24}).map((_, i) => ({
  id: `s_a${i+1}`, code: `A${i+1}`, player1: `Player ${i+1}`, seed: i+1
}));

const S_MATCH_TEMPLATE = (id, a, b, title) => ({
  id, isSingles: true, title, teamAId: a, teamBId: b, status: 'upcoming', scores: [], winnerId: null
});

const INITIAL_SINGLES_MATCHES = [
  S_MATCH_TEMPLATE('M1', 's_a1', 's_a24', 'M1 (1 v 24)'), S_MATCH_TEMPLATE('M2', 's_a12', 's_a13', 'M2 (12 v 13)'),
  S_MATCH_TEMPLATE('M3', 's_a6', 's_a19', 'M3 (6 v 19)'), S_MATCH_TEMPLATE('M4', 's_a7', 's_a18', 'M4 (7 v 18)'),
  S_MATCH_TEMPLATE('M5', 's_a4', 's_a21', 'M5 (4 v 21)'), S_MATCH_TEMPLATE('M6', 's_a9', 's_a16', 'M6 (9 v 16)'),
  S_MATCH_TEMPLATE('M7', 's_a5', 's_a20', 'M7 (5 v 20)'), S_MATCH_TEMPLATE('M8', 's_a8', 's_a17', 'M8 (8 v 17)'),
  S_MATCH_TEMPLATE('M9', 's_a3', 's_a22', 'M9 (3 v 22)'), S_MATCH_TEMPLATE('M10', 's_a10', 's_a15', 'M10 (10 v 15)'),
  S_MATCH_TEMPLATE('M11', 's_a2', 's_a23', 'M11 (2 v 23)'), S_MATCH_TEMPLATE('M12', 's_a11', 's_a14', 'M12 (11 v 14)'),
  
  S_MATCH_TEMPLATE('W1', null, null, 'W1 (Win M1 v Win M2)'), S_MATCH_TEMPLATE('W2', null, null, 'W2 (Win M3 v Win M4)'),
  S_MATCH_TEMPLATE('W3', null, null, 'W3 (Win M5 v Win M6)'), S_MATCH_TEMPLATE('W4', null, null, 'W4 (Win M7 v Win M8)'),
  S_MATCH_TEMPLATE('W5', null, null, 'W5 (Win M9 v Win M10)'), S_MATCH_TEMPLATE('W6', null, null, 'W6 (Win M11 v Win M12)'),

  S_MATCH_TEMPLATE('L1', null, null, 'L1 (Los M1 v Los M2)'), S_MATCH_TEMPLATE('L2', null, null, 'L2 (Los M3 v Los M4)'),
  S_MATCH_TEMPLATE('L3', null, null, 'L3 (Los M5 v Los M6)'), S_MATCH_TEMPLATE('L4', null, null, 'L4 (Los M7 v Los M8)'),
  S_MATCH_TEMPLATE('L5', null, null, 'L5 (Los M9 v Los M10)'), S_MATCH_TEMPLATE('L6', null, null, 'L6 (Los M11 v Los M12)'),

  S_MATCH_TEMPLATE('W7', null, null, 'W7 (Win W1 v Win W2)'), S_MATCH_TEMPLATE('W8', null, null, 'W8 (Win W3 v Win W4)'),
  S_MATCH_TEMPLATE('W9', null, null, 'W9 (Win W5 v Win W6)'),

  S_MATCH_TEMPLATE('L7', null, null, 'L7 (Win L1 v Los W1)'), S_MATCH_TEMPLATE('L8', null, null, 'L8 (Win L2 v Los W2)'),
  S_MATCH_TEMPLATE('L9', null, null, 'L9 (Win L3 v Los W3)'), S_MATCH_TEMPLATE('L10', null, null, 'L10 (Win L4 v Los W4)'),
  S_MATCH_TEMPLATE('L11', null, null, 'L11 (Win L5 v Los W5)'), S_MATCH_TEMPLATE('L12', null, null, 'L12 (Win L6 v Los W6)'),
  S_MATCH_TEMPLATE('L13', null, null, 'L13 (Win L7 v Win L8)'), S_MATCH_TEMPLATE('L14', null, null, 'L14 (Win L9 v Win L10)'),
  S_MATCH_TEMPLATE('L15', null, null, 'L15 (Win L11 v Win L12)'),

  S_MATCH_TEMPLATE('L16', null, null, 'L16 (Los W7 v Los W8)'), S_MATCH_TEMPLATE('L17', null, null, 'L17 (Los W9 v Los W10)'),
  S_MATCH_TEMPLATE('W10', null, null, 'W10 (Final Winner Stage)'),

  S_MATCH_TEMPLATE('SF1', null, null, 'SF1 (BYE v Win L17)'), S_MATCH_TEMPLATE('SF2', null, null, 'SF2 (Win W10 v Win L16)'),
  S_MATCH_TEMPLATE('GF', null, null, 'GRAND FINAL (Win SF1 v Win SF2)'),
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
      if (!standings[a] || !standings[b]) return; // Safety check
      
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

  set('W1', w('M1'), w('M2')); set('L1', l('M1'), l('M2')); set('W2', w('M3'), w('M4')); set('L2', l('M3'), l('M4'));
  set('W3', w('M5'), w('M6')); set('L3', l('M5'), l('M6')); set('W4', w('M7'), w('M8')); set('L4', l('M7'), l('M8'));
  set('W5', w('M9'), w('M10')); set('L5', l('M9'), l('M10')); set('W6', w('M11'), w('M12')); set('L6', l('M11'), l('M12'));
  set('W7', w('W1'), w('W2')); set('L7', w('L1'), l('W1')); set('W8', w('W3'), w('W4')); set('L8', w('L2'), l('W2'));
  set('W9', w('W5'), w('W6')); set('L9', w('L3'), l('W3')); set('L10', w('L4'), l('W4')); set('L11', w('L5'), l('W5')); set('L12', w('L6'), l('W6'));
  set('L13', w('L7'), w('L8')); set('L14', w('L9'), w('L10')); set('L15', w('L11'), w('L12'));
  set('L16', l('W7'), l('W8')); set('L17', l('W9'), l('W10')); 

  const w7w = w('W7'); const w8w = w('W8'); const w9w = w('W9');
  if (byeId && [w7w, w8w, w9w].includes(byeId)) {
     const others = [w7w, w8w, w9w].filter(id => id && id !== byeId);
     set('W10', others[0] || null, others[1] || null); set('SF1', byeId, w('L17'));
  } else { set('W10', null, null); set('SF1', null, w('L17')); }
  set('SF2', w('W10'), w('L16')); set('GF', w('SF1'), w('SF2'));
  return nm;
};

const cascadeDoublesKnockouts = (matches) => {
  let newM = [...matches];
  const w = (id) => newM.find(m => m.id === id)?.winnerId || null;
  newM = newM.map(m => {
    if(m.id==='ko_sf1') return {...m, teamAId: w('ko_qf1')||m.teamAId, teamBId: w('ko_qf2')||m.teamBId};
    if(m.id==='ko_sf2') return {...m, teamAId: w('ko_qf3')||m.teamAId, teamBId: w('ko_qf4')||m.teamBId};
    if(m.id==='ko_final') return {...m, teamAId: w('ko_sf1')||m.teamAId, teamBId: w('ko_sf2')||m.teamBId};
    return m;
  });
  return newM;
};

const tournamentReducer = (state, action) => {
  switch (action.type) {
    case 'LOAD': return { ...INITIAL_STATE, ...action.payload };
    case 'UPDATE_MATCH': {
      let newM = state.matches.map(m => m.id === action.payload.id ? { ...m, ...action.payload.updates } : m);
      newM = cascadeDoublesKnockouts(newM);
      return { ...state, matches: newM };
    }
    case 'UPDATE_SINGLES_MATCH': {
      let newSm = state.singlesMatches.map(m => m.id === action.payload.id ? { ...m, ...action.payload.updates } : m);
      newSm = cascadeSingles(newSm, state.singlesByeId);
      return { ...state, singlesMatches: newSm };
    }
    case 'UPDATE_SINGLES_TEAM': {
      return { ...state, singlesTeams: state.singlesTeams.map(t => t.id === action.payload.id ? action.payload : t) };
    }
    case 'SET_SINGLES_BYE': {
      let newSm = cascadeSingles(state.singlesMatches, action.payload);
      return { ...state, singlesByeId: action.payload, singlesMatches: newSm };
    }
    case 'UPDATE_TEAM': return { ...state, teams: state.teams.map(t => t.id === action.payload.id ? action.payload : t) };
    case 'ADD_TEAM': return { ...state, teams: [...state.teams, { id: crypto.randomUUID(), ...action.payload }] };
    case 'DELETE_TEAM': return { ...state, teams: state.teams.filter(t => t.id !== action.payload) };
    case 'ADD_CUSTOM_MATCH': {
       const newMatch = {
          id: `custom_${crypto.randomUUID()}`, groupId: action.payload.groupId, round: 'Custom',
          teamAId: action.payload.teamAId, teamBId: action.payload.teamBId, status: 'upcoming', scores: [], winnerId: null,
          table: action.payload.table || 'Table 1', date: action.payload.date || '', time: action.payload.time || '12:00'
        };
        return { ...state, matches: [...state.matches, newMatch] };
    }
    case 'GENERATE_KNOCKOUTS': {
      const stA = calculateGroupStandings(state.teams.filter(t=>t.group==='A'), state.matches, state.settings);
      const stB = calculateGroupStandings(state.teams.filter(t=>t.group==='B'), state.matches, state.settings);
      let newMatches = [...state.matches];
      
      const updateKO = (id, a, b) => {
         newMatches = newMatches.map(m => m.id === id ? { ...m, teamAId: a || null, teamBId: b || null } : m);
      };
      
      updateKO('ko_qf1', stA[0]?.id, stB[3]?.id);
      updateKO('ko_qf2', stB[1]?.id, stA[2]?.id);
      updateKO('ko_qf3', stB[0]?.id, stA[3]?.id);
      updateKO('ko_qf4', stA[1]?.id, stB[2]?.id);
      
      return { ...state, matches: cascadeDoublesKnockouts(newMatches) };
    }
    case 'FORCE_CASCADE_KNOCKOUTS': return { ...state, matches: cascadeDoublesKnockouts(state.matches) };
    case 'RESET_ALL': return INITIAL_STATE;
    default: return state;
  }
};

const TournamentContext = createContext();

const TournamentProvider = ({ children }) => {
  const [state, dispatch] = useReducer(tournamentReducer, INITIAL_STATE);
  const [isLoaded, setIsLoaded] = useState(false);
  const [dbUser, setDbUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) dispatch({ type: 'LOAD', payload: JSON.parse(saved) });
    setIsLoaded(true);
  }, []);

  useEffect(() => { if (isLoaded) localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state)); }, [state, isLoaded]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (initialAuthToken) setDbUser((await signInWithCustomToken(auth, initialAuthToken)).user);
        else setDbUser((await signInAnonymously(auth)).user);
      } catch (e) {}
    }; initAuth();
  }, []);

  if (!isLoaded) return <div className="h-screen bg-[#050505] flex items-center justify-center text-slate-400 font-mono tracking-widest text-sm">LOADING ASSETS...</div>;

  return (
    <TournamentContext.Provider value={{ state, dispatch, dbUser, isAdmin, setIsAdmin, isSuperAdmin, setIsSuperAdmin }}>
      {children}
    </TournamentContext.Provider>
  );
};

const Card = ({ children, className = '', onClick }) => <div onClick={onClick} className={`bg-[#0a0a0a] border border-slate-800/60 rounded-xl p-6 shadow-sm ${className}`}>{children}</div>;
const Button = ({ children, onClick, variant = 'primary', className = '', icon: Icon, type = "button", disabled=false }) => {
  const base = "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all active:scale-95 disabled:opacity-50 text-sm";
  const variants = { primary: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20", secondary: "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700", danger: "bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20", };
  return <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${className}`}>{Icon && <Icon size={16} />}{children}</button>;
};

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0a0a0a] border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in duration-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-800/50">
          <h3 className="text-sm font-bold text-white tracking-widest uppercase">{title}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white p-1"><X size={20}/></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

const DialogContext = createContext();
const DialogProvider = ({ children }) => {
  const [dialog, setDialog] = useState(null);
  const confirm = (title, message, onConfirm, isDanger=false) => setDialog({ type: 'confirm', title, message, onConfirm, isDanger });
  const alert = (title, message) => setDialog({ type: 'alert', title, message });
  const close = () => setDialog(null);
  return (
    <DialogContext.Provider value={{ confirm, alert }}>
      {children}
      {dialog && (
        <Modal isOpen={true} onClose={close} title={dialog.title}>
          <p className="text-slate-300 mb-6 text-sm">{dialog.message}</p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={close}>Cancel</Button>
            {dialog.type === 'confirm' && <Button variant={dialog.isDanger ? 'danger' : 'primary'} onClick={() => { dialog.onConfirm(); close(); }}>Confirm</Button>}
          </div>
        </Modal>
      )}
    </DialogContext.Provider>
  );
};
const useDialog = () => useContext(DialogContext);

const SinglesPlayers = () => {
  const { state, dispatch, isSuperAdmin } = useContext(TournamentContext);
  const [editing, setEditing] = useState(null);

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white uppercase tracking-wider text-white">Singles Roster</h2>
          <p className="text-slate-500 text-sm mt-1">24-Player VCT Format</p>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {state.singlesTeams.map(p => (
          <Card key={p.id} className="relative group hover:border-slate-600 transition-colors">
            {isSuperAdmin && (
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setEditing(p)} className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"><Edit2 size={14}/></button>
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-800/50 rounded-full flex items-center justify-center font-black text-slate-300">{p.code}</div>
              <div><div className="text-[10px] text-emerald-500 font-bold tracking-widest uppercase">Seed {p.seed}</div><div className="font-semibold text-slate-200">{p.player1}</div></div>
            </div>
          </Card>
        ))}
      </div>
      {isSuperAdmin && editing && (
        <Modal isOpen={true} onClose={() => setEditing(null)} title="Edit Singles Player">
          <form onSubmit={(e) => {
            e.preventDefault();
            dispatch({ type: 'UPDATE_SINGLES_TEAM', payload: { ...editing, player1: new FormData(e.target).get('player1') } });
            setEditing(null);
          }} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Player Name</label>
              <input name="player1" defaultValue={editing.player1} required className="w-full bg-[#050505] border border-slate-800 rounded-lg px-4 py-2 text-white" />
            </div>
            <Button type="submit" className="w-full">Save Changes</Button>
          </form>
        </Modal>
      )}
    </div>
  );
};

const SinglesBracket = ({ onNavigate }) => {
  const { state, dispatch, isAdmin, isSuperAdmin } = useContext(TournamentContext);
  const [tab, setTab] = useState('winner');
  const dialog = useDialog();
  const getS = (matchIds) => matchIds.map(id => state.singlesMatches.find(m => m.id === id));
  
  const MatchBox = ({ match, indicatorColor }) => {
    if (!match) return null;
    const tA = state.singlesTeams.find(t => t.id === match.teamAId);
    const tB = state.singlesTeams.find(t => t.id === match.teamBId);
    return (
      <Card className={`relative w-72 border-slate-800/80 group ${indicatorColor ? `border-l-2 ${indicatorColor}` : ''}`}>
        <div className="flex justify-between items-center mb-3">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{match.title}</div>
          <div className="flex items-center gap-2 relative">
             <span className={`text-[9px] font-bold px-2 py-1 rounded uppercase tracking-wider ${match.status==='completed'?'bg-emerald-500/10 text-emerald-400':match.status==='live'?'bg-red-500/10 text-red-400':'bg-slate-800/50 text-slate-500'}`}>{match.status}</span>
             {isSuperAdmin && match.status !== 'upcoming' && (
               <button onClick={() => dialog.confirm("Reset Match?", "Clear scores?", () => dispatch({type: 'UPDATE_SINGLES_MATCH', payload: {id: match.id, updates: {status: 'upcoming', scores: [], winnerId: null}}}), true)} className="absolute -right-2 -top-2 opacity-0 group-hover:opacity-100 p-1 bg-red-900/40 text-red-400 hover:bg-red-900/60 rounded z-10"><RotateCcw size={12}/></button>
             )}
          </div>
        </div>
        <div className="space-y-3">
          <div className={`flex justify-between items-center ${match.winnerId === match.teamAId ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>
            <span className="text-sm truncate pr-2">{tA?.player1 || 'TBD'} <span className="text-[10px] opacity-40 ml-1">({tA?.code||'-'})</span></span>
            {match.status === 'completed' && match.teamAId && <span className="text-sm font-bold">{match.scores.filter(s=>s.a>s.b).length}</span>}
          </div>
          <div className="h-px bg-slate-800/50"></div>
          <div className={`flex justify-between items-center ${match.winnerId === match.teamBId ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>
            <span className="text-sm truncate pr-2">{tB?.player1 || 'TBD'} <span className="text-[10px] opacity-40 ml-1">({tB?.code||'-'})</span></span>
            {match.status === 'completed' && match.teamBId && <span className="text-sm font-bold">{match.scores.filter(s=>s.b>s.a).length}</span>}
          </div>
        </div>
        {isAdmin && match.status !== 'completed' && match.teamAId && match.teamBId && (
          <div className="mt-4 pt-3 border-t border-slate-800/50">
            <Button className="w-full text-xs py-1.5" variant={match.status === 'live' ? 'primary' : 'secondary'} onClick={() => {
                if(match.status === 'upcoming') dispatch({ type: 'UPDATE_SINGLES_MATCH', payload: { id: match.id, updates: { status: 'live' } }});
                onNavigate('live_singles', match.id);
            }}>{match.status === 'live' ? 'Resume Scoring' : 'Live Score'}</Button>
          </div>
        )}
      </Card>
    );
  };

  const ByePanel = () => {
    const w7w = state.singlesTeams.find(t => t.id === state.singlesMatches.find(m=>m.id==='W7')?.winnerId);
    const w8w = state.singlesTeams.find(t => t.id === state.singlesMatches.find(m=>m.id==='W8')?.winnerId);
    const w9w = state.singlesTeams.find(t => t.id === state.singlesMatches.find(m=>m.id==='W9')?.winnerId);
    const ready = w7w && w8w && w9w;

    return (
      <Card className="border-yellow-500/20 bg-yellow-500/5 mb-8 w-full max-w-4xl mx-auto">
        <h3 className="text-yellow-500 font-bold flex items-center gap-2 mb-4 uppercase tracking-widest text-sm"><Zap size={16}/> Semifinal BYE Selection</h3>
        {!ready ? (
          <p className="text-slate-500 text-sm">Complete W7, W8, and W9 on the Winner Side to unlock BYE selection.</p>
        ) : (
          <div>
            <p className="text-slate-400 text-sm mb-4">Select which of the final 3 Winner-Side players gets a direct BYE to the Semifinal (SF1).</p>
            <div className="flex gap-4">
              {[w7w, w8w, w9w].map(t => (
                <button key={t.id} onClick={() => isAdmin && dispatch({ type: 'SET_SINGLES_BYE', payload: t.id })}
                  className={`flex-1 p-4 rounded-xl border transition-all font-bold ${state.singlesByeId === t.id ? 'border-yellow-500 bg-yellow-500/20 text-yellow-400' : 'border-slate-800 bg-[#050505] text-slate-400 hover:border-slate-600'}`}
                >
                  {t.player1}
                  {state.singlesByeId === t.id && <div className="text-[10px] mt-1 text-yellow-500 uppercase tracking-widest">BYE Granted</div>}
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white uppercase tracking-wider">VCT Bracket</h2>
          <p className="text-slate-500 text-sm mt-1">Singles Double-Elimination</p>
        </div>
      </div>
      <div className="flex gap-2 bg-[#0a0a0a] border border-slate-800 p-1 rounded-lg w-fit mb-6 overflow-x-auto">
        {[{id: 'winner', l: '🟢 Winner Side', c: 'text-emerald-400'}, {id: 'loser', l: '🟠 Loser Side', c: 'text-orange-400'}, {id: 'finals', l: '🟣 Final Stages', c: 'text-purple-400'}].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 rounded-md font-bold text-xs tracking-widest uppercase whitespace-nowrap transition-all ${tab === t.id ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}><span className={tab===t.id?t.c:''}>{t.l}</span></button>
        ))}
      </div>
      <div className="overflow-x-auto pb-12">
        <div className="min-w-max flex gap-8">
          {tab === 'winner' && (
            <><div className="flex flex-col gap-4"><div className="text-[10px] font-bold text-emerald-500 tracking-widest uppercase mb-2">Round 1 (24 Players)</div>{getS(['M1','M2','M3','M4','M5','M6','M7','M8','M9','M10','M11','M12']).map(m => <MatchBox key={m.id} match={m} indicatorColor="border-l-emerald-500" />)}</div>
              <div className="flex flex-col justify-around gap-4"><div className="text-[10px] font-bold text-emerald-500 tracking-widest uppercase mb-2">Winner Side R1</div>{getS(['W1','W2','W3','W4','W5','W6']).map(m => <MatchBox key={m.id} match={m} indicatorColor="border-l-emerald-500" />)}</div>
              <div className="flex flex-col justify-around gap-4"><div className="text-[10px] font-bold text-emerald-500 tracking-widest uppercase mb-2">Winner Side R2 (Final 6)</div>{getS(['W7','W8','W9']).map(m => <MatchBox key={m.id} match={m} indicatorColor="border-l-emerald-500" />)}</div></>
          )}
          {tab === 'loser' && (
            <><div className="flex flex-col gap-4"><div className="text-[10px] font-bold text-orange-500 tracking-widest uppercase mb-2">Loser Side R1</div>{getS(['L1','L2','L3','L4','L5','L6']).map(m => <MatchBox key={m.id} match={m} indicatorColor="border-l-orange-500" />)}</div>
              <div className="flex flex-col justify-around gap-4"><div className="text-[10px] font-bold text-orange-500 tracking-widest uppercase mb-2">Lower Merge</div>{getS(['L7','L8','L9','L10','L11','L12']).map(m => <MatchBox key={m.id} match={m} indicatorColor="border-l-orange-500" />)}</div>
              <div className="flex flex-col justify-around gap-4"><div className="text-[10px] font-bold text-orange-500 tracking-widest uppercase mb-2">Lower Side R3</div>{getS(['L13','L14','L15']).map(m => <MatchBox key={m.id} match={m} indicatorColor="border-l-orange-500" />)}</div></>
          )}
          {tab === 'finals' && (
            <div className="w-full flex flex-col gap-8 items-start"><ByePanel />
              <div className="flex gap-12 items-center w-full">
                <div className="flex flex-col gap-12">
                   <div><div className="text-[10px] font-bold text-yellow-500 tracking-widest uppercase mb-2">Final Winner Stage</div><MatchBox match={getS(['W10'])[0]} indicatorColor="border-l-yellow-500" /></div>
                   <div className="flex flex-col gap-4"><div className="text-[10px] font-bold text-red-500 tracking-widest uppercase mb-2">Loser Pool</div>{getS(['L16','L17']).map(m => <MatchBox key={m.id} match={m} indicatorColor="border-l-red-500" />)}</div>
                </div>
                <div className="flex flex-col gap-12 justify-center h-full border-l border-slate-800/50 pl-12 relative"><div className="text-[10px] font-bold text-purple-500 tracking-widest uppercase mb-2 absolute top-0 -mt-6">Semifinals</div>{getS(['SF1','SF2']).map(m => <MatchBox key={m.id} match={m} indicatorColor="border-l-purple-500" />)}</div>
                <div className="flex flex-col items-center justify-center h-full border-l border-slate-800/50 pl-12 relative"><Trophy className="text-yellow-500 mb-4 scale-150 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]"/><div className="text-[10px] font-bold text-yellow-500 tracking-widest uppercase mb-2 absolute -top-6">Grand Final</div><MatchBox match={getS(['GF'])[0]} indicatorColor="border-l-yellow-500" />
                   {getS(['GF'])[0]?.winnerId && ( <div className="mt-8 text-center animate-in fade-in zoom-in"><div className="text-yellow-400 font-black text-xl uppercase tracking-widest">Singles Champion</div><div className="text-white font-bold text-lg mt-1">{state.singlesTeams.find(t=>t.id===getS(['GF'])[0].winnerId)?.player1}</div></div> )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const LiveScoring = ({ matchId, isSingles, onBack }) => {
  const { state, dispatch } = useContext(TournamentContext);
  const match = isSingles ? state.singlesMatches.find(m => m.id === matchId) : state.matches.find(m => m.id === matchId);
  const teamA = isSingles ? state.singlesTeams.find(t => t.id === match?.teamAId) : state.teams.find(t => t.id === match?.teamAId);
  const teamB = isSingles ? state.singlesTeams.find(t => t.id === match?.teamBId) : state.teams.find(t => t.id === match?.teamBId);

  const [scores, setScores] = useState(match?.scores || []);
  const [currentGame, setCurrentGame] = useState({ a: 0, b: 0 });

  if (!match || !teamA || !teamB) return <div className="p-8 text-center text-slate-500">Match not ready.</div>;

  const handleScore = (team, delta) => setCurrentGame(prev => ({ ...prev, [team]: Math.max(0, prev[team] + delta) }));

  const handleNextGame = () => {
    const newScores = [...scores, currentGame];
    setScores(newScores); setCurrentGame({ a: 0, b: 0 });
    dispatch({ type: isSingles ? 'UPDATE_SINGLES_MATCH' : 'UPDATE_MATCH', payload: { id: match.id, updates: { scores: newScores } } });
  };

  const handleFinishMatch = () => {
    let finalScores = [...scores];
    if (currentGame.a > 0 || currentGame.b > 0) finalScores.push(currentGame);
    const winnerLetter = getMatchWinner(finalScores, state.settings.bestOf, state.settings.pointsPerGame);
    let winnerId = winnerLetter === 'A' ? teamA.id : winnerLetter === 'B' ? teamB.id : null;
    
    if(!winnerId && finalScores.length>0) {
      let sa=0, sb=0, pa=0, pb=0;
      finalScores.forEach(s=>{ pa+=s.a; pb+=s.b; if(s.a>s.b)sa++; else sb++; });
      if(sa>sb) winnerId = teamA.id; else if (sb>sa) winnerId = teamB.id; else if(pa>pb) winnerId = teamA.id; else winnerId = teamB.id;
    }

    dispatch({ type: isSingles ? 'UPDATE_SINGLES_MATCH' : 'UPDATE_MATCH', payload: { id: match.id, updates: { scores: finalScores, status: 'completed', winnerId } } });
    onBack();
  };

  const cGA = scores.filter(s => checkGameWin(s.a, s.b, state.settings.pointsPerGame) && s.a > s.b).length;
  const cGB = scores.filter(s => checkGameWin(s.a, s.b, state.settings.pointsPerGame) && s.b > s.a).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-right-4">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300"><ArrowRight className="rotate-180" size={20} /></button>
        <h2 className="text-2xl font-bold text-white flex-1">{isSingles ? match.title : 'Live Scoring'}</h2>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-[#0a0a0a] border border-slate-800 rounded-3xl p-6 flex flex-col items-center">
          <h3 className="text-xl font-bold text-white text-center mb-1">{teamA.code}</h3>
          <p className="text-slate-500 text-sm text-center h-10">{teamA.player1} {!isSingles && <><br/>{teamA.player2}</>}</p>
          <div className="text-xs font-black tracking-widest uppercase text-emerald-500 mt-4 bg-emerald-500/10 px-4 py-1.5 rounded-md">Sets Won: {cGA}</div>
          <div className="text-[120px] leading-none font-black text-white my-8 select-none">{currentGame.a}</div>
          <div className="flex gap-4 w-full">
            <button onClick={() => handleScore('a', -1)} className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 rounded-xl text-2xl font-bold text-slate-300">-</button>
            <button onClick={() => handleScore('a', 1)} className="flex-[3] py-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-4xl font-bold text-white">+</button>
          </div>
        </div>
        <div className="bg-[#0a0a0a] border border-slate-800 rounded-3xl p-6 flex flex-col items-center">
          <h3 className="text-xl font-bold text-white text-center mb-1">{teamB.code}</h3>
          <p className="text-slate-500 text-sm text-center h-10">{teamB.player1} {!isSingles && <><br/>{teamB.player2}</>}</p>
          <div className="text-xs font-black tracking-widest uppercase text-blue-500 mt-4 bg-blue-500/10 px-4 py-1.5 rounded-md">Sets Won: {cGB}</div>
          <div className="text-[120px] leading-none font-black text-white my-8 select-none">{currentGame.b}</div>
          <div className="flex gap-4 w-full">
             <button onClick={() => handleScore('b', 1)} className="flex-[3] py-4 bg-blue-600 hover:bg-blue-500 rounded-xl text-4xl font-bold text-white">+</button>
             <button onClick={() => handleScore('b', -1)} className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 rounded-xl text-2xl font-bold text-slate-300">-</button>
          </div>
        </div>
      </div>
      <div className="flex gap-4 pt-4">
        <Button onClick={handleNextGame} variant="secondary" className="flex-1 py-4 text-sm tracking-widest uppercase font-bold">Save Set</Button>
        <Button onClick={handleFinishMatch} variant="primary" className="flex-1 py-4 text-sm tracking-widest uppercase font-bold">Complete Match</Button>
      </div>
    </div>
  );
};

const Dashboard = ({ mode }) => {
  const { state } = useContext(TournamentContext);
  const isSingles = mode === 'SINGLES';
  const m = isSingles ? state.singlesMatches : state.matches.filter(x => x.groupId !== 'KO');
  const total = m.length;
  const completed = m.filter(x => x.status === 'completed').length;
  const live = m.filter(x => x.status === 'live');
  
  return (
    <div className="space-y-6 animate-in fade-in">
      <header className="mb-8"><h1 className="text-3xl font-black text-white tracking-tight uppercase">{state.settings.tournamentName}</h1><p className="text-slate-500 mt-1">Overview • {isSingles ? 'Singles VCT' : 'Doubles Division'}</p></header>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="flex flex-col items-center text-center p-4"><Users className="text-blue-500 mb-3" size={24} /><span className="text-3xl font-black text-white">{isSingles ? state.singlesTeams.length : state.teams.length}</span><span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">{isSingles ? 'Players' : 'Teams'}</span></Card>
        <Card className="flex flex-col items-center text-center p-4"><CalendarDays className="text-purple-500 mb-3" size={24} /><span className="text-3xl font-black text-white">{total}</span><span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">Total Matches</span></Card>
        <Card className="flex flex-col items-center text-center p-4 border-emerald-500/20 bg-emerald-500/5"><CheckCircle2 className="text-emerald-500 mb-3" size={24} /><span className="text-3xl font-black text-white">{completed}</span><span className="text-[10px] text-emerald-500/70 uppercase tracking-widest font-bold mt-1">Completed</span></Card>
        <Card className="flex flex-col items-center text-center p-4 border-yellow-500/20 bg-yellow-500/5"><Activity className="text-yellow-500 mb-3" size={24} /><span className="text-3xl font-black text-white">{live.length}</span><span className="text-[10px] text-yellow-500/70 uppercase tracking-widest font-bold mt-1">Live Now</span></Card>
      </div>
    </div>
  );
};

const Teams = () => {
  const { state, dispatch, isSuperAdmin } = useContext(TournamentContext);
  const dialog = useDialog();
  const [editingTeam, setEditingTeam] = useState(null);
  const handleSave = (e) => {
    e.preventDefault(); const fd = new FormData(e.target);
    const data = { id: editingTeam.id || crypto.randomUUID(), code: fd.get('code'), player1: fd.get('player1'), player2: fd.get('player2'), group: fd.get('group'), seed: parseInt(fd.get('seed')) || 0 };
    dispatch({ type: editingTeam.id ? 'UPDATE_TEAM' : 'ADD_TEAM', payload: data });
    setEditingTeam(null);
  };
  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center mb-6">
        <div><h2 className="text-2xl font-bold text-white uppercase tracking-wider">Doubles Teams</h2><p className="text-slate-500 text-sm mt-1">Group A & B Roster</p></div>
        {isSuperAdmin && <Button onClick={() => setEditingTeam({})} icon={Plus}>Add Team</Button>}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {state.teams.map(team => (
          <Card key={team.id} className="relative group hover:border-slate-700 transition-all">
            {isSuperAdmin && ( <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => setEditingTeam(team)} className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"><Edit2 size={14}/></button><button onClick={() => dialog.confirm("Delete?", "Remove team?", () => dispatch({type:'DELETE_TEAM', payload: team.id}), true)} className="p-1.5 bg-red-900/20 hover:bg-red-900/40 text-red-400 rounded"><Trash2 size={14}/></button></div> )}
            <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 bg-slate-800/50 rounded-full flex items-center justify-center font-black text-slate-300">{team.code}</div><div><div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Group {team.group}</div><div className="text-[10px] text-slate-600">Seed {team.seed}</div></div></div>
            <div className="space-y-1"><div className="font-semibold text-slate-200">{team.player1}</div><div className="text-[10px] text-slate-600 font-bold tracking-widest uppercase">AND</div><div className="font-semibold text-slate-200">{team.player2}</div></div>
          </Card>
        ))}
      </div>
      {isSuperAdmin && editingTeam && (
        <Modal isOpen={true} onClose={() => setEditingTeam(null)} title={editingTeam.id ? 'Edit Team' : 'New Team'}>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-bold text-slate-500 mb-1">Code</label><input name="code" defaultValue={editingTeam.code} required className="w-full bg-[#050505] border border-slate-800 rounded-lg px-4 py-2 text-white" /></div><div><label className="block text-xs font-bold text-slate-500 mb-1">Group</label><select name="group" defaultValue={editingTeam.group || 'A'} className="w-full bg-[#050505] border border-slate-800 rounded-lg px-4 py-2 text-white"><option value="A">Group A</option><option value="B">Group B</option></select></div></div>
            <div><label className="block text-xs font-bold text-slate-500 mb-1">Player 1</label><input name="player1" defaultValue={editingTeam.player1} required className="w-full bg-[#050505] border border-slate-800 rounded-lg px-4 py-2 text-white" /></div>
            <div><label className="block text-xs font-bold text-slate-500 mb-1">Player 2</label><input name="player2" defaultValue={editingTeam.player2} required className="w-full bg-[#050505] border border-slate-800 rounded-lg px-4 py-2 text-white" /></div>
            <Button type="submit" className="w-full mt-6">Save</Button>
          </form>
        </Modal>
      )}
    </div>
  );
};

const Fixtures = ({ onNavigate }) => {
  const { state, dispatch, isAdmin, isSuperAdmin } = useContext(TournamentContext);
  const [tab, setTab] = useState('ALL');
  const dialog = useDialog();

  const filteredMatches = state.matches.filter(m => m.groupId !== 'KO' && (tab === 'ALL' || m.groupId === tab));
  const byRound = filteredMatches.reduce((acc, m) => { if (!acc[m.round]) acc[m.round] = []; acc[m.round].push(m); return acc; }, {});

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6"><div><h2 className="text-2xl font-bold text-white uppercase tracking-wider">Doubles Fixtures</h2><p className="text-slate-500 text-sm mt-1">Group Stage Matches</p></div></div>
      <div className="flex gap-2 bg-[#0a0a0a] border border-slate-800 p-1 rounded-lg w-fit mb-6">
        {['ALL', 'A', 'B'].map(t => (<button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-md font-bold text-[11px] tracking-widest uppercase transition-all ${tab === t ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}>{t === 'ALL' ? 'ALL GROUPS' : `GROUP ${t}`}</button>))}
      </div>
      <div className="space-y-8">
        {Object.entries(byRound).map(([round, matches]) => (
          <div key={round} className="space-y-4">
            <h3 className="text-emerald-500 font-bold tracking-widest text-[11px] flex items-center gap-2 uppercase">{round}<div className="flex-1 h-px bg-slate-800/50 ml-2"></div></h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {matches.map(m => {
                const teamA = state.teams.find(t => t.id === m.teamAId); const teamB = state.teams.find(t => t.id === m.teamBId);
                return (
                  <Card key={m.id} className="relative overflow-hidden group hover:border-slate-700 transition-colors">
                    {m.status === 'live' && <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>}{m.status === 'completed' && <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>}
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex gap-2 items-center text-[10px] text-slate-500 font-bold uppercase tracking-widest"><span className="bg-slate-800/50 px-2 py-0.5 rounded">{m.table}</span><span>{m.date ? `${m.date} | ` : ''}{m.time}</span></div>
                      <div className="flex gap-2 relative">
                        <span className={`text-[9px] font-bold px-2 py-1 rounded uppercase tracking-wider ${m.status==='completed'?'bg-emerald-500/10 text-emerald-400':m.status==='live'?'bg-red-500/10 text-red-400':'bg-slate-800/50 text-slate-500'}`}>{m.status}</span>
                        {isSuperAdmin && m.status !== 'upcoming' && (<button onClick={() => dialog.confirm("Reset?", "Clear scores?", () => dispatch({type: 'UPDATE_MATCH', payload: {id: m.id, updates: {status: 'upcoming', scores: [], winnerId: null}}}), true)} className="absolute -right-2 -top-2 opacity-0 group-hover:opacity-100 p-1 bg-red-900/40 text-red-400 hover:bg-red-900/60 rounded z-10"><RotateCcw size={12}/></button>)}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className={`flex justify-between items-center ${m.winnerId === teamA?.id ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}><div className="flex gap-2 items-center"><span className="w-6 text-xs opacity-40 font-mono">{teamA?.code}</span><span className="text-sm truncate max-w-[120px]">{teamA?.player1}</span></div>{m.status === 'completed' && (<span className="text-lg font-black">{m.scores.filter(s=>s.a>s.b).length}</span>)}</div>
                      <div className={`flex justify-between items-center ${m.winnerId === teamB?.id ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}><div className="flex gap-2 items-center"><span className="w-6 text-xs opacity-40 font-mono">{teamB?.code}</span><span className="text-sm truncate max-w-[120px]">{teamB?.player1}</span></div>{m.status === 'completed' && (<span className="text-lg font-black">{m.scores.filter(s=>s.b>s.a).length}</span>)}</div>
                    </div>
                    {isAdmin && m.status !== 'completed' && (
                      <div className="mt-4 pt-4 border-t border-slate-800/50"><Button className="w-full text-xs py-1.5 uppercase tracking-widest font-bold" variant={m.status === 'live' ? 'primary' : 'secondary'} onClick={() => { if(m.status === 'upcoming') dispatch({ type: 'UPDATE_MATCH', payload: { id: m.id, updates: { status: 'live' } }}); onNavigate('live', m.id); }}>{m.status === 'live' ? 'Resume Scoring' : 'Live Scoring'}</Button></div>
                    )}
                  </Card>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const StandingsTable = ({ group, title }) => {
  const { state } = useContext(TournamentContext);
  const teams = state.teams.filter(t => t.group === group);
  const standings = useMemo(() => calculateGroupStandings(teams, state.matches, state.settings), [teams, state.matches, state.settings]);

  return (
    <Card className="overflow-x-auto p-0 border-slate-800/80">
      <div className="p-4 border-b border-slate-800/80 bg-slate-900/40"><h3 className="font-black text-lg text-white uppercase tracking-widest">{title}</h3></div>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-[#050505] text-[10px] uppercase tracking-widest text-slate-500 border-b border-slate-800/80">
            <th className="p-4 font-semibold w-12 text-center">Pos</th><th className="p-4 font-semibold">Team</th><th className="p-4 font-semibold text-center">MP</th><th className="p-4 font-semibold text-center">W</th><th className="p-4 font-semibold text-center">L</th><th className="p-4 font-semibold text-center text-emerald-500">PTS</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/50">
          {standings.map((team, idx) => (
            <tr key={team.id} className={`transition-colors hover:bg-slate-800/30 ${idx < 4 ? 'bg-emerald-900/5' : ''}`}>
              <td className="p-4 text-center">{idx === 0 ? <span className="inline-flex w-6 h-6 items-center justify-center bg-yellow-500/20 text-yellow-500 rounded-full font-bold text-xs">1</span> : idx === 1 ? <span className="inline-flex w-6 h-6 items-center justify-center bg-slate-300/20 text-slate-300 rounded-full font-bold text-xs">2</span> : <span className="text-slate-600 font-bold">{idx + 1}</span>}</td>
              <td className="p-4"><div className="font-bold text-white text-sm">{team.code}</div><div className="text-[11px] text-slate-500 whitespace-nowrap">{team.player1} & {team.player2}</div></td>
              <td className="p-4 text-center text-slate-400">{team.MP}</td><td className="p-4 text-center text-emerald-500 font-bold">{team.W}</td><td className="p-4 text-center text-red-500 font-bold">{team.L}</td><td className="p-4 text-center font-black text-white text-lg">{team.PTS}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
};
const Standings = () => (<div className="space-y-6 animate-in fade-in"><div><h2 className="text-2xl font-bold text-white uppercase tracking-wider">Doubles Standings</h2><p className="text-slate-500 text-sm mt-1">Top 4 from each group qualify</p></div><div className="grid lg:grid-cols-2 gap-8"><StandingsTable group="A" title="GROUP A" /><StandingsTable group="B" title="GROUP B" /></div></div>);

const KnockoutBracket = ({ onNavigate }) => {
  const { state, dispatch, isAdmin, isSuperAdmin } = useContext(TournamentContext);
  const dialog = useDialog();
  const getM = (id) => state.matches.find(m => m.id === id);
  const [editingKO, setEditingKO] = useState(null);

  const MatchBox = ({ match, title }) => {
    if (!match) return <Card className="flex flex-col justify-center items-center h-32 border-dashed border-slate-800 bg-[#050505] w-72"><span className="text-slate-600 font-bold text-[10px] tracking-widest uppercase">{title}</span><span className="text-slate-700 text-xs mt-1">TBD</span></Card>;
    const teamA = state.teams.find(t => t.id === match.teamAId); const teamB = state.teams.find(t => t.id === match.teamBId);
    return (
      <Card className="relative overflow-hidden group w-72 border-slate-800/80 hover:border-slate-600 transition-colors">
        <div className="flex justify-between items-center mb-3">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{title}</div>
          <div className="flex items-center gap-2 relative">
             <span className={`text-[9px] font-bold px-2 py-1 rounded uppercase tracking-wider ${match.status==='completed'?'bg-emerald-500/10 text-emerald-400':match.status==='live'?'bg-red-500/10 text-red-400':'bg-slate-800/50 text-slate-500'}`}>{match.status}</span>
             {isSuperAdmin && (
               <div className="absolute -right-2 -top-2 opacity-0 group-hover:opacity-100 flex gap-1 z-10">
                 {match.status !== 'upcoming' && <button onClick={() => dialog.confirm("Reset?", "Clear?", () => dispatch({type: 'UPDATE_MATCH', payload: {id: match.id, updates: {status: 'upcoming', scores: [], winnerId: null}}}), true)} className="p-1 bg-red-900/40 text-red-400 hover:bg-red-900/60 rounded"><RotateCcw size={12}/></button>}
                 <button onClick={() => setEditingKO(match)} className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"><Edit2 size={12}/></button>
               </div>
             )}
          </div>
        </div>
        <div className="space-y-3">
          <div className={`flex justify-between items-center ${match.winnerId === match.teamAId ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}><div className="flex gap-2 items-center"><span className="w-6 text-[10px] opacity-40 font-mono">{teamA?.code || '?'}</span><span className="text-sm truncate max-w-[120px]">{teamA?.player1 || 'TBD'}</span></div>{match.status === 'completed' && match.teamAId && <span className="text-lg font-black">{match.scores.filter(s=>s.a>s.b).length}</span>}</div>
          <div className={`flex justify-between items-center ${match.winnerId === match.teamBId ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}><div className="flex gap-2 items-center"><span className="w-6 text-[10px] opacity-40 font-mono">{teamB?.code || '?'}</span><span className="text-sm truncate max-w-[120px]">{teamB?.player1 || 'TBD'}</span></div>{match.status === 'completed' && match.teamBId && <span className="text-lg font-black">{match.scores.filter(s=>s.b>s.a).length}</span>}</div>
        </div>
        {isAdmin && match.status !== 'completed' && match.teamAId && match.teamBId && (
          <div className="mt-4 pt-4 border-t border-slate-800/50"><Button className="w-full text-xs py-1.5 uppercase tracking-widest font-bold" variant={match.status === 'live' ? 'primary' : 'secondary'} onClick={() => { if(match.status === 'upcoming') dispatch({ type: 'UPDATE_MATCH', payload: { id: match.id, updates: { status: 'live' } }}); onNavigate('live', match.id); }}>{match.status === 'live' ? 'Resume Scoring' : 'Live Scoring'}</Button></div>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center mb-6">
        <div><h2 className="text-2xl font-bold text-white uppercase tracking-wider">Knockout Bracket</h2><p className="text-slate-500 text-sm mt-1">Quarter-Finals to Grand Final</p></div>
        <div className="flex gap-2">
          {isSuperAdmin && <Button onClick={() => dispatch({type: 'FORCE_CASCADE_KNOCKOUTS'})} icon={Activity} variant="secondary">Auto-Fix Bracket</Button>}
          {isAdmin && <Button onClick={() => dialog.confirm("Qualify Teams?", "Pull top 8?", () => dispatch({type:'GENERATE_KNOCKOUTS'}))} icon={Zap}>Qualify Top 8</Button>}
        </div>
      </div>
      <div className="overflow-x-auto pb-12">
        <div className="min-w-max flex gap-12 mt-8 items-center">
          <div className="flex flex-col gap-8"><MatchBox match={getM('ko_qf1')} title="QF1 (A1 VS B4)"/><MatchBox match={getM('ko_qf2')} title="QF2 (B2 VS A3)"/><MatchBox match={getM('ko_qf3')} title="QF3 (B1 VS A4)"/><MatchBox match={getM('ko_qf4')} title="QF4 (A2 VS B3)"/></div>
          <div className="flex flex-col gap-24 justify-center relative"><MatchBox match={getM('ko_sf1')} title="SF1 (WINNER QF1 VS QF2)"/><MatchBox match={getM('ko_sf2')} title="SF2 (WINNER QF3 VS QF4)"/></div>
          <div className="flex flex-col items-center justify-center relative"><Trophy className={`mb-4 transition-all duration-1000 ${getM('ko_final')?.winnerId ? 'text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)] scale-125' : 'text-yellow-700/30'}`} size={48} /><MatchBox match={getM('ko_final')} title="GRAND FINAL"/></div>
        </div>
      </div>
      {isSuperAdmin && editingKO && (
        <Modal isOpen={true} onClose={() => setEditingKO(null)} title={`Override ${editingKO.id}`}>
          <form onSubmit={(e)=>{
            e.preventDefault(); const fd = new FormData(e.target);
            dispatch({type: 'UPDATE_MATCH', payload: {id: editingKO.id, updates: {teamAId: fd.get('teamAId')||null, teamBId: fd.get('teamBId')||null}}});
            setEditingKO(null);
          }} className="space-y-4">
             <select name="teamAId" defaultValue={editingKO.teamAId||''} className="w-full bg-[#050505] border border-slate-800 rounded-lg px-4 py-2 text-white"><option value="">TBD</option>{state.teams.map(t=><option key={t.id} value={t.id}>{t.code} - {t.player1}</option>)}</select>
             <select name="teamBId" defaultValue={editingKO.teamBId||''} className="w-full bg-[#050505] border border-slate-800 rounded-lg px-4 py-2 text-white"><option value="">TBD</option>{state.teams.map(t=><option key={t.id} value={t.id}>{t.code} - {t.player1}</option>)}</select>
             <Button type="submit" className="w-full mt-4">Save Override</Button>
          </form>
        </Modal>
      )}
    </div>
  );
};

const Settings = () => {
  const { state, dispatch, isSuperAdmin } = useContext(TournamentContext);
  const dialog = useDialog();
  return (
    <div className="max-w-2xl space-y-8 animate-in fade-in">
      <div><h2 className="text-2xl font-bold text-white uppercase tracking-wider">System Settings</h2><p className="text-slate-500 text-sm mt-1">Administration Panel</p></div>
      <Card className="border-blue-500/20 bg-blue-500/5">
        <h3 className="text-blue-500 font-bold flex items-center gap-2 mb-4 tracking-widest uppercase text-xs">Local Backup & Restore</h3>
        <p className="text-slate-400 text-sm mb-4">Save state JSON or load backup.</p>
        <div className="flex gap-4"><Button onClick={() => {
          const a = document.createElement('a'); a.href = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state)); a.download = `backup_${Date.now()}.json`; a.click();
        }} variant="secondary">Export JSON</Button>
        <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-slate-800 text-white hover:bg-slate-700 text-sm">Import JSON <input type="file" accept=".json" className="hidden" onChange={(e)=>{
           const f = e.target.files[0]; if(!f) return; const r = new FileReader(); r.onload = (ev) => { try { dispatch({type: 'LOAD', payload: JSON.parse(ev.target.result)}); } catch(err){} }; r.readAsText(f); e.target.value='';
        }} /></label></div>
      </Card>
      {isSuperAdmin && (
        <Card className="border-red-500/20 bg-red-500/5">
          <h3 className="text-red-500 font-bold flex items-center gap-2 mb-4 tracking-widest uppercase text-xs"><AlertTriangle size={16}/> Danger Zone</h3>
          <Button onClick={() => dialog.confirm("Factory Reset", "Erase EVERYTHING?", () => { dispatch({ type: 'RESET_ALL' }); window.location.reload(); }, true)} variant="danger">Factory Reset Tournament</Button>
        </Card>
      )}
    </div>
  );
}

const HallOfFame = () => {
  const { dbUser } = useContext(TournamentContext);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!dbUser) return;
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'past_tournaments'));
    const unsub = onSnapshot(q, (s) => { setHistory(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.createdAt - a.createdAt)); setLoading(false); }, () => setLoading(false));
    return unsub;
  }, [dbUser]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in">
      <header className="mb-8 text-center flex flex-col items-center"><Medal className="text-yellow-500 mb-4" size={48} /><h2 className="text-3xl font-black text-white uppercase">Hall of Fame</h2></header>
      {loading ? <div className="text-center text-slate-600 font-mono tracking-widest text-xs py-12 animate-pulse">LOADING LEGENDS...</div> : history.length === 0 ? <Card className="text-center py-12 text-slate-600 font-mono tracking-widest text-xs uppercase border-dashed border-slate-800">No tournaments published yet.</Card> : (
        <div className="grid gap-6">
          {history.map(t => (
             <div key={t.id} className="bg-gradient-to-r from-[#0a0a0a] to-[#050505] border border-slate-800 rounded-2xl p-6 shadow-xl flex justify-between items-center">
               <div><div className="text-emerald-500 font-bold text-[10px] tracking-widest uppercase">{new Date(t.date).toLocaleDateString()}</div><h3 className="text-2xl font-black text-white uppercase">{t.tournamentName}</h3></div>
               <div className="text-right"><div className="text-yellow-400 font-bold text-lg flex items-center justify-end gap-2"><Trophy size={16} /> {t.winner.code}</div><div className="text-slate-400 text-sm">{t.winner.p1} & {t.winner.p2}</div></div>
             </div>
          ))}
        </div>
      )}
    </div>
  );
};

const AppLayout = () => {
  const { isAdmin, setIsAdmin, isSuperAdmin, setIsSuperAdmin } = useContext(TournamentContext);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeMatchId, setActiveMatchId] = useState(null); 
  const [showLogin, setShowLogin] = useState(false);
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('DOUBLES'); // 'SINGLES' | 'DOUBLES'
  const dialog = useDialog();

  const handleNav = (tab, matchId = null) => { setActiveTab(tab); if(matchId) setActiveMatchId(matchId); };

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === 'SmashFestIOISuper') { setIsAdmin(true); setIsSuperAdmin(true); setShowLogin(false); setPassword(''); } 
    else if (password === 'SmashFest') { setIsAdmin(true); setIsSuperAdmin(false); setShowLogin(false); setPassword(''); } 
    else { dialog.alert('Error', 'Incorrect password.'); setPassword(''); }
  };

  const navGroups = mode === 'DOUBLES' ? [
    { label: 'MAIN', items: [{ id: 'dashboard', i: LayoutDashboard, l: 'Dashboard' }] },
    { label: 'DOUBLES', items: [{ id: 'teams', i: Users, l: 'Teams' }, { id: 'fixtures', i: CalendarDays, l: 'Fixtures' }, { id: 'standings', i: Trophy, l: 'Standings' }, { id: 'knockout', i: Activity, l: 'Knockout' }] },
    { label: 'SYSTEM', items: [{ id: 'history', i: History, l: 'Hall of Fame' }, ...(isAdmin ? [{ id: 'settings', i: SettingsIcon, l: 'Settings' }] : [])] }
  ] : [
    { label: 'MAIN', items: [{ id: 'dashboard', i: LayoutDashboard, l: 'Dashboard' }] },
    { label: 'SINGLES', items: [{ id: 's_players', i: User, l: 'Players (24)' }, { id: 's_bracket', i: Swords, l: 'VCT Bracket' }] },
    { label: 'SYSTEM', items: [{ id: 'history', i: History, l: 'Hall of Fame' }, ...(isAdmin ? [{ id: 'settings', i: SettingsIcon, l: 'Settings' }] : [])] }
  ];

  return (
    <div className="flex h-screen bg-[#050505] text-slate-300 font-sans selection:bg-emerald-500/30">
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-800/80 bg-[#020202]">
        <div className="p-6 pb-2"><div className="flex items-center gap-3 text-white font-black text-xl tracking-tighter"><Shield className="text-red-600" size={24}/>SMASHFEST <span className="text-red-600">'26</span></div></div>
        
        {/* The Toggle Switch from User Screenshot */}
        <div className="px-6 mb-8 mt-4">
          <div className="flex items-center bg-[#0a0a0a] rounded-lg p-1 border border-slate-800 shadow-inner">
            <button
              onClick={() => { setMode('SINGLES'); handleNav('dashboard'); }}
              className={`flex-1 py-1.5 text-[11px] font-black tracking-widest uppercase rounded-md transition-all duration-300 ${mode === 'SINGLES' ? 'bg-white text-black shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Singles
            </button>
            <button
              onClick={() => { setMode('DOUBLES'); handleNav('dashboard'); }}
              className={`flex-1 py-1.5 text-[11px] font-black tracking-widest uppercase rounded-md transition-all duration-300 ${mode === 'DOUBLES' ? 'bg-white text-black shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Doubles
            </button>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-6 overflow-y-auto pb-6">
          {navGroups.map(grp => (
             <div key={grp.label}>
                <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2 pl-4">{grp.label}</div>
                <div className="space-y-1">
                  {grp.items.map(n => <button key={n.id} onClick={()=>handleNav(n.id)} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-sm font-medium ${activeTab===n.id?'bg-slate-800/50 text-white shadow-sm border border-slate-700/50':'hover:bg-[#0a0a0a] text-slate-400'}`}><n.i size={16} className={activeTab===n.id?'text-emerald-500':''}/>{n.l}</button>)}
                </div>
             </div>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-800/80">
          {isAdmin ? <button onClick={() => { setIsAdmin(false); setIsSuperAdmin(false); handleNav('dashboard'); }} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest bg-red-950/30 text-red-500 border border-red-900/30 hover:bg-red-900/40 transition-colors"><Unlock size={14}/> Logout {isSuperAdmin ? 'SuperAdmin' : 'Admin'}</button>
           : <button onClick={() => setShowLogin(true)} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest bg-slate-800/50 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700/50"><Lock size={14}/> Admin Login</button>}
        </div>
      </aside>
      
      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-24 md:pb-0 relative">
        <div className="max-w-7xl mx-auto p-4 md:p-8 pt-8 md:pt-12">
          {/* Universal Dashboard adapts to mode */}
          {activeTab === 'dashboard' && <Dashboard mode={mode} />}
          
          {/* Singles Pages */}
          {activeTab === 's_players' && <SinglesPlayers />}
          {activeTab === 's_bracket' && <SinglesBracket onNavigate={handleNav} />}
          {activeTab === 'live_singles' && isAdmin && <LiveScoring matchId={activeMatchId} isSingles={true} onBack={() => handleNav('s_bracket')} />}
          
          {/* Doubles Pages */}
          {activeTab === 'teams' && <Teams />}
          {activeTab === 'fixtures' && <Fixtures onNavigate={handleNav} />}
          {activeTab === 'standings' && <Standings />}
          {activeTab === 'knockout' && <KnockoutBracket onNavigate={handleNav} />}
          {activeTab === 'live' && isAdmin && <LiveScoring matchId={activeMatchId} isSingles={false} onBack={() => handleNav('fixtures')} />}

          {/* System Pages */}
          {activeTab === 'history' && <HallOfFame />}
          {activeTab === 'settings' && isAdmin && <Settings />}
        </div>
      </main>

      <Modal isOpen={showLogin} onClose={() => setShowLogin(false)} title="Administrator Unlock">
        <form onSubmit={handleLogin} className="space-y-4">
          <input type="password" placeholder="Enter security passphrase" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus className="w-full bg-[#050505] border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500 font-mono tracking-widest text-center" />
          <Button type="submit" className="w-full py-3" variant="primary">Authenticate</Button>
        </form>
      </Modal>
    </div>
  );
};

export default function App() { return <DialogProvider><TournamentProvider><AppLayout /></TournamentProvider></DialogProvider>; }
