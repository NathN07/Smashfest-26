import React, { createContext, useReducer, useContext, useEffect, useState, useRef, useMemo } from 'react';
import {
  Trophy, Users, CalendarDays, LayoutDashboard, SettingsIcon,
  CheckCircle2, X, Plus, Edit2, Shield,
  Swords, Activity, Trash2, RotateCcw, AlertTriangle, ArrowRight,
  Medal, History, Zap, Lock, Unlock, User, Wifi, WifiOff, ListOrdered, ChevronUp
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, query, doc, setDoc } from 'firebase/firestore';

const appId = typeof __app_id !== 'undefined' ? __app_id : 'smashfest-local-deploy';
const firebaseConfigStr = typeof __firebase_config !== 'undefined' ? __firebase_config : null;
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Same keys as before so existing singles data is NOT lost (doubles gets auto-migrated, see LOAD)
const LOCAL_STORAGE_KEY = 'smashfest_state_v20_final_master';

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

const stateDocRef = () => doc(db, 'artifacts', appId, 'public', 'data', 'smashfest_final_v4', 'state');

const stableStringify = (v) => JSON.stringify(v, (k, val) =>
  val && typeof val === 'object' && !Array.isArray(val)
    ? Object.keys(val).sort().reduce((o, key) => { o[key] = val[key]; return o; }, {})
    : val);

// ---------- DATE HELPERS ----------
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' }) : 'No date';
const fmtDateShort = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'No date';

const DEFAULT_SETTINGS = {
  tournamentName: "SMASHFEST '26",
  pointsWin: 2, pointsLoss: 0, bestOf: 3, pointsPerGame: 11, tables: 2,
};

// --- DOUBLES DATA (12 TEAMS) ---
const INITIAL_TEAMS = [
  { id: 't1', code: '1', player1: 'Omm Prakash Lenka', player2: 'Shivam Singh', seed: 1 },
  { id: 't2', code: '2', player1: 'Himanshu Deb', player2: 'Ansh Pratap Ra', seed: 2 },
  { id: 't3', code: '3', player1: 'Abhitesh Srivastava', player2: 'Devansh Singh', seed: 3 },
  { id: 't4', code: '4', player1: 'Om Mishra', player2: 'Eklavya', seed: 4 },
  { id: 't5', code: '5', player1: 'Saloni Kumari', player2: 'A1', seed: 5 },
  { id: 't6', code: '6', player1: 'Nishant Sir', player2: 'Taqi Sir', seed: 6 },
  { id: 't7', code: '7', player1: 'Utpal Tripathi', player2: 'Pardeep Sir', seed: 7 },
  { id: 't8', code: '8', player1: 'Madhwan Rai', player2: 'Utkarsh Yaduvanshi', seed: 8 },
  { id: 't9', code: '9', player1: 'Vishal', player2: 'Vineet Kumar Yadav', seed: 9 },
  { id: 't10', code: '10', player1: 'Vishwash Singh', player2: 'Himanshu Maurya', seed: 10 },
  { id: 't11', code: '11', player1: 'Moksh Yadav', player2: 'Nitin Maurya', seed: 11 },
  { id: 't12', code: '12', player1: 'Fazlu Sir', player2: 'Chetan Sir', seed: 12 },
];

// Doubles match: srcA/srcB describe where the team comes from ({t:'W'|'L', m:'M01'} or {t:'BYE'})
const W = (m) => ({ t: 'W', m });
const L = (m) => ({ t: 'L', m });
const DM = (id, day, round, a, b, srcA, srcB, extra = {}) => ({
  id, isSingles: false, title: id, round, date: `2026-10-${day}`,
  teamAId: a || null, teamBId: b || null, srcA: srcA || null, srcB: srcB || null,
  manualA: false, manualB: false,
  status: 'upcoming', scores: [], winnerId: null, ...extra
});

const DOUBLES_VERSION = 2;

const INITIAL_MATCHES = [
  DM('M01', '06', 'Round 1', 't1', 't8'),
  DM('M02', '06', 'Round 1', 't7', 't9'),
  DM('M03', '07', 'Round 1', 't2', 't11'),
  DM('M04', '07', 'Round 1', 't4', 't10'),
  DM('M05', '08', 'Round 1', 't3', 't12'),
  DM('M06', '09', 'Round 1', 't5', 't6'),
  DM('M07', '12', 'Upper Bracket', null, null, W('M01'), W('M02')),
  DM('M08', '12', 'Upper Bracket', null, null, W('M03'), W('M04')),
  DM('M09', '13', 'Upper Bracket', null, null, W('M05'), W('M06')),
  DM('M10', '12', 'Lower Bracket', null, null, L('M01'), L('M02')),
  DM('M11', '13', 'Lower Bracket', null, null, L('M03'), L('M04')),
  DM('M12', '13', 'Lower Bracket', null, null, L('M05'), L('M06')),
  DM('M13', '14', 'Lower Bracket', null, null, L('M07'), W('M10')),
  DM('M14', '14', 'Lower Bracket', null, null, L('M08'), W('M11')),
  DM('M15', '14', 'Lower Bracket', null, null, L('M09'), W('M12')),
  DM('M16', '14', 'Lower Bracket', null, null, W('M13'), W('M14')),
  DM('M17', '14', 'Lower Bracket', null, null, W('M15'), { t: 'BYE' }, { isBye: true }),
  DM('M18', '14', 'Semifinal Qualifier', null, null, W('M16'), W('M17')),
  // Upper Bracket Finalist slots are set manually by admin (see "Finalist Slots" panel)
  DM('M19', '14', 'Semifinal Qualifier', null, null, null, W('M18')),
  DM('M20', '15', 'Semifinal', null, null, null, W('M19')),
  DM('M21', '15', 'Semifinal', null, null, null, null),
  DM('M22', '16', 'Grand Final', null, null, W('M20'), W('M21')),
];

// --- SINGLES DATA (24-PLAYER VCT FORMAT) ---
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

// Titles like "M1 (6 Oct)" -> title "M1" + date "2026-10-06" (old saved data is converted automatically)
const normalizeSinglesMatch = (m) => {
  if (m.date) return m;
  const r = /^(.*?)\s*\((\d{1,2}) Oct\)\s*$/.exec(m.title || '');
  if (!r) return m;
  return { ...m, title: r[1], date: `2026-10-${String(r[2]).padStart(2, '0')}` };
};

const RAW_SINGLES_MATCHES = [
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
const INITIAL_SINGLES_MATCHES = RAW_SINGLES_MATCHES.map(normalizeSinglesMatch);

const INITIAL_STATE = {
  teams: INITIAL_TEAMS, matches: INITIAL_MATCHES, settings: DEFAULT_SETTINGS,
  singlesTeams: INITIAL_SINGLES_PLAYERS, singlesMatches: INITIAL_SINGLES_MATCHES, singlesByeId: null,
  doublesVersion: DOUBLES_VERSION
};

const checkGameWin = (scoreA, scoreB, pointsPerGame) => Math.max(scoreA, scoreB) >= pointsPerGame && Math.abs(scoreA - scoreB) >= 2;
const getMatchWinner = (scores, bestOf, pointsPerGame) => {
  let gamesA = 0, gamesB = 0; const req = Math.ceil(bestOf / 2);
  scores.forEach(s => { if(checkGameWin(s.a, s.b, pointsPerGame)) { if(s.a > s.b) gamesA++; else gamesB++; } });
  if (gamesA >= req) return 'A'; if (gamesB >= req) return 'B'; return null;
};

// --- SINGLES CASCADE LOGIC (Untouched) ---
const cascadeSingles = (matches, byeId) => {
  let nm = [...matches];
  const w = (id) => nm.find(m=>m.id===id)?.winnerId || null;
  const l = (id) => { const m = nm.find(m=>m.id===id); return m && m.winnerId ? (m.winnerId === m.teamAId ? m.teamBId : m.teamAId) : null; };
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

// --- DOUBLES CASCADE LOGIC (data driven: every match knows where its teams come from) ---
const resolveSrc = (list, src) => {
  if (!src || src.t === 'BYE') return null;
  const m = list.find(x => x.id === src.m);
  if (!m || !m.winnerId) return null;
  if (src.t === 'W') return m.winnerId;
  if (!m.teamAId || !m.teamBId) return null;
  return m.winnerId === m.teamAId ? m.teamBId : m.teamAId;
};

const cascadeDoubles = (matches) => {
  const nm = matches.map(m => ({ ...m }));
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < nm.length; i++) {
      const m = nm[i];
      if (m.srcA && !m.manualA) m.teamAId = resolveSrc(nm, m.srcA);
      if (m.srcB && !m.manualB) m.teamBId = resolveSrc(nm, m.srcB);
      if (m.isBye) {
        if (m.teamAId) { m.status = 'completed'; m.winnerId = m.teamAId; m.scores = []; m.liveGame = null; }
        else { m.status = 'upcoming'; m.winnerId = null; m.scores = []; }
      }
    }
  }
  return nm;
};

const tournamentReducer = (state, action) => {
  switch (action.type) {
    case 'LOAD': {
      const p = action.payload || {};
      let merged = { ...INITIAL_STATE, ...p };
      // Doubles fixtures were changed -> move old saved doubles matches to the new fixture list
      if (p.doublesVersion !== DOUBLES_VERSION) {
        merged.matches = INITIAL_MATCHES;
        merged.doublesVersion = DOUBLES_VERSION;
      }
      merged.matches = cascadeDoubles(merged.matches);
      merged.singlesMatches = (merged.singlesMatches || []).map(normalizeSinglesMatch);
      return merged;
    }
    case 'UPDATE_MATCH': {
      let newM = state.matches.map(m => m.id === action.payload.id ? { ...m, ...action.payload.updates } : m);
      newM = cascadeDoubles(newM);
      return { ...state, matches: newM };
    }
    case 'UPDATE_SINGLES_MATCH': {
      let newSm = state.singlesMatches.map(m => m.id === action.payload.id ? { ...m, ...action.payload.updates } : m);
      newSm = cascadeSingles(newSm, state.singlesByeId);
      return { ...state, singlesMatches: newSm };
    }
    case 'ADD_MATCH': {
      const { isSingles, match, afterId } = action.payload;
      const key = isSingles ? 'singlesMatches' : 'matches';
      const list = [...state[key]];
      const idx = afterId ? list.findIndex(m => m.id === afterId) : -1;
      if (idx >= 0) list.splice(idx + 1, 0, match); else list.push(match);
      return { ...state, [key]: isSingles ? list : cascadeDoubles(list) };
    }
    case 'DELETE_MATCH': {
      const { isSingles, id } = action.payload;
      const key = isSingles ? 'singlesMatches' : 'matches';
      const list = state[key].filter(m => !(m.id === id && m.custom));
      return { ...state, [key]: isSingles ? list : cascadeDoubles(list) };
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
  const [syncStatus, setSyncStatus] = useState(SYNC_ENABLED ? 'connecting' : 'off');
  const [remoteReady, setRemoteReady] = useState(!SYNC_ENABLED);
  const lastSyncedRef = useRef(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) dispatch({ type: 'LOAD', payload: JSON.parse(saved) });
    } catch (e) {}
    setIsLoaded(true);
  }, []);

  useEffect(() => { if (isLoaded) localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state)); }, [state, isLoaded]);

  useEffect(() => {
    if (!SYNC_ENABLED) return;
    const initAuth = async () => {
      try {
        if (initialAuthToken) setDbUser((await signInWithCustomToken(auth, initialAuthToken)).user);
        else setDbUser((await signInAnonymously(auth)).user);
      } catch (e) { setSyncStatus('error'); }
    }; initAuth();
  }, []);

  useEffect(() => {
    if (!SYNC_ENABLED || !dbUser) return;
    const unsub = onSnapshot(stateDocRef(), (snap) => {
      setSyncStatus('live');
      setRemoteReady(true);
      if (!snap.exists()) return;
      if (snap.metadata.hasPendingWrites) return;
      const remote = snap.data().state;
      if (!remote) return;
      const remoteJson = stableStringify(remote);
      if (remoteJson === lastSyncedRef.current) return;
      lastSyncedRef.current = remoteJson;
      dispatch({ type: 'LOAD', payload: remote });
    }, () => setSyncStatus('error'));
    return unsub;
  }, [dbUser]);

  useEffect(() => {
    if (!SYNC_ENABLED || !isLoaded || !remoteReady || !isAdmin || !dbUser) return;
    const json = stableStringify(state);
    if (json === lastSyncedRef.current) return;
    const t = setTimeout(async () => {
      try {
        await setDoc(stateDocRef(), { state: JSON.parse(JSON.stringify(state)), updatedAt: Date.now() });
        lastSyncedRef.current = json;
        setSyncStatus('live');
      } catch (e) { setSyncStatus('error'); }
    }, 250);
    return () => clearTimeout(t);
  }, [state, isLoaded, remoteReady, isAdmin, dbUser]);

  if (!isLoaded) return <div className="h-screen bg-[#050505] flex items-center justify-center text-slate-400 font-mono tracking-widest text-sm">LOADING ASSETS...</div>;

  return (
    <TournamentContext.Provider value={{ state, dispatch, dbUser, isAdmin, setIsAdmin, isSuperAdmin, setIsSuperAdmin, syncStatus }}>
      {children}
    </TournamentContext.Provider>
  );
};

// ---------- SMALL HELPERS ----------
const findEntrant = (state, isSingles, id) => (isSingles ? state.singlesTeams : state.teams).find(t => t.id === id);
const entrantName = (t, isSingles) => t ? (isSingles ? t.player1 : `${t.player1} & ${t.player2}`) : 'TBD';

// ---------- ANIMATION KIT (no extra libraries needed) ----------
// Reveals an element with a smooth animation the first time it scrolls into view.
const Reveal = ({ children, delay = 0, dir = 'up', className = '', threshold = 0.08, as: Tag = 'div' }) => {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') { setShown(true); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { setShown(true); io.disconnect(); } });
    }, { threshold, rootMargin: '0px 0px -3% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  const dirCls = dir === 'left' ? 'sf-left' : dir === 'right' ? 'sf-right' : dir === 'zoom' ? 'sf-zoom' : '';
  return (
    <Tag ref={ref} style={delay ? { '--d': `${delay}ms` } : undefined} className={`sf-reveal ${dirCls} ${shown ? 'sf-in' : ''} ${className}`}>
      {children}
    </Tag>
  );
};

// Number that counts up when it scrolls into view (and animates again when the value changes).
const CountUp = ({ value, className = '' }) => {
  const ref = useRef(null);
  const shown = useRef(0);
  const [n, setN] = useState(0);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') { setSeen(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!seen) return;
    const from = shown.current, to = Number(value) || 0;
    if (from === to) { setN(to); return; }
    let raf; const t0 = performance.now(); const dur = 900;
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      const v = Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3)));
      shown.current = v; setN(v);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [seen, value]);
  return <span ref={ref} className={className}>{n}</span>;
};

const STAGGER_CSS = Array.from({ length: 12 }, (_, i) => `.sf-root .flex-col > .sf-reveal:nth-child(${i + 2}){transition-delay:${Math.min(i * 60, 300)}ms}`).join('\n');

const SF_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Space+Grotesk:wght@500;600;700&display=swap');
html .sf-root{font-family:'Inter',ui-sans-serif,system-ui,sans-serif}
.sf-root h1,.sf-root h2,.sf-root h3{font-family:'Space Grotesk','Inter',ui-sans-serif,system-ui,sans-serif;letter-spacing:-0.01em}
.sf-root *{scrollbar-width:thin;scrollbar-color:#27303f transparent}

/* scroll reveal */
.sf-reveal{opacity:0;transform:translateY(30px) scale(.98);transition:opacity .75s cubic-bezier(.2,.7,.2,1),transform .75s cubic-bezier(.2,.7,.2,1);transition-delay:var(--d,0ms);will-change:opacity,transform}
.sf-reveal.sf-left{transform:translateX(-36px)}
.sf-reveal.sf-right{transform:translateX(36px)}
.sf-reveal.sf-zoom{transform:scale(.92)}
.sf-reveal.sf-in{opacity:1;transform:none;will-change:auto}
${STAGGER_CSS}

/* cards, buttons */
.sf-card{transition:transform .35s cubic-bezier(.2,.7,.2,1),filter .35s}
.sf-card:hover{transform:translateY(-3px);filter:brightness(1.1)}
.sf-card.sf-static:hover{transform:none;filter:none}
.sf-btn{position:relative;overflow:hidden}
.sf-btn::after{content:'';position:absolute;inset:0;background:linear-gradient(120deg,transparent 30%,rgba(255,255,255,.18) 50%,transparent 70%);transform:translateX(-120%);transition:transform .6s}
.sf-btn:hover::after{transform:translateX(120%)}

/* page + modal + rows */
@keyframes sf-page{from{opacity:0;transform:translateY(12px)}}
.sf-page{animation:sf-page .5s cubic-bezier(.2,.7,.2,1) backwards}
@keyframes sf-pop{from{opacity:0;transform:scale(.92) translateY(14px)}}
.sf-pop{animation:sf-pop .3s cubic-bezier(.2,.9,.3,1.15) backwards}
@keyframes sf-fadein{from{opacity:0}}
.sf-fade{animation:sf-fadein .22s backwards}
@keyframes sf-row{from{opacity:0;transform:translateX(-22px)}}
.sf-row{animation:sf-row .55s cubic-bezier(.2,.7,.2,1) backwards;animation-delay:var(--d,0ms)}
.sf-row:hover td{background:rgba(255,255,255,.03)}
@keyframes sf-bump{0%{transform:scale(1.22);color:#34d399}100%{transform:scale(1)}}
.sf-bump{animation:sf-bump .35s cubic-bezier(.2,.9,.3,1.2)}

/* decorative */
.sf-progress{position:fixed;top:0;left:0;right:0;height:3px;z-index:45;transform-origin:left;transform:scaleX(0);background:linear-gradient(90deg,#34d399,#facc15,#ef4444);box-shadow:0 0 12px rgba(52,211,153,.6);pointer-events:none}
.sf-blobs{position:fixed;top:0;bottom:0;left:0;right:0;z-index:0;pointer-events:none;overflow:hidden;will-change:transform}
.sf-blobs::before{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);background-size:44px 44px;-webkit-mask-image:radial-gradient(ellipse at 50% 0%,#000 15%,transparent 75%);mask-image:radial-gradient(ellipse at 50% 0%,#000 15%,transparent 75%)}
.sf-blobs span{position:absolute;border-radius:9999px}
.sf-blobs span:nth-child(1){width:520px;height:520px;top:-120px;right:-80px;background:radial-gradient(circle,rgba(16,185,129,.18),transparent 65%);animation:sf-drift 18s ease-in-out infinite alternate}
.sf-blobs span:nth-child(2){width:620px;height:620px;bottom:-220px;left:-120px;background:radial-gradient(circle,rgba(168,85,247,.14),transparent 65%);animation:sf-drift 22s ease-in-out infinite alternate-reverse}
.sf-blobs span:nth-child(3){width:420px;height:420px;top:40%;left:55%;background:radial-gradient(circle,rgba(250,204,21,.08),transparent 65%);animation:sf-drift 26s ease-in-out infinite alternate}
@keyframes sf-drift{from{transform:translate3d(0,0,0) scale(1)}to{transform:translate3d(60px,40px,0) scale(1.18)}}
@media(min-width:768px){.sf-progress,.sf-blobs{left:16rem}}

.sf-gradient-text{background:linear-gradient(90deg,#ffffff,#34d399,#facc15,#ffffff);background-size:300% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent;animation:sf-shimmer 9s linear infinite}
@keyframes sf-shimmer{to{background-position:300% 0}}
.sf-dot{display:inline-block;width:7px;height:7px;border-radius:9999px;background:#34d399;animation:sf-ping 2s infinite}
@keyframes sf-ping{0%{box-shadow:0 0 0 0 rgba(52,211,153,.6)}100%{box-shadow:0 0 0 10px rgba(52,211,153,0)}}
.sf-hero-line{height:2px;border-radius:2px;background:linear-gradient(90deg,#34d399,transparent);animation:sf-line 1.1s .3s cubic-bezier(.2,.7,.2,1) both}
@keyframes sf-line{from{width:0}to{width:140px}}
.sf-live-glow{animation:sf-live 2.2s ease-in-out infinite}
@keyframes sf-live{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,.0)}50%{box-shadow:0 0 26px 2px rgba(239,68,68,.28)}}
.sf-trophy{animation:sf-trophy 3s ease-in-out infinite}
@keyframes sf-trophy{0%,100%{filter:drop-shadow(0 0 8px rgba(250,204,21,.35))}50%{filter:drop-shadow(0 0 24px rgba(250,204,21,.85))}}
.sf-float{animation:sf-float 4s ease-in-out infinite}
@keyframes sf-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
.sf-shield{filter:drop-shadow(0 0 8px rgba(220,38,38,.6))}
.sf-nav-bar{position:absolute;left:0;top:22%;bottom:22%;width:3px;border-radius:3px;background:linear-gradient(#34d399,#facc15);animation:sf-bar .35s cubic-bezier(.2,.7,.2,1)}
@keyframes sf-bar{from{transform:scaleY(0)}}

@media (prefers-reduced-motion: reduce){
  .sf-reveal{opacity:1!important;transform:none!important;transition:none!important}
  .sf-root *,.sf-root *::before,.sf-root *::after{animation-duration:.01ms!important;animation-iteration-count:1!important}
}
`;
const GlobalStyles = () => <style>{SF_CSS}</style>;

const Card = ({ children, className = '', onClick, reveal = false, delay = 0 }) => {
  const el = <div onClick={onClick} className={`sf-card bg-[#0a0a0a] border border-slate-800/60 rounded-xl p-6 shadow-sm ${reveal ? 'h-full' : ''} ${className}`}>{children}</div>;
  return reveal ? <Reveal delay={delay} className="h-full">{el}</Reveal> : el;
};
const Button = ({ children, onClick, variant = 'primary', className = '', icon: Icon, type = "button", disabled=false }) => {
  const base = "sf-btn inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all active:scale-95 disabled:opacity-50 text-sm";
  const variants = { primary: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20", secondary: "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700", danger: "bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20", };
  return <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${className}`}>{Icon && <Icon size={16} />}{children}</button>;
};

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="sf-fade fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="sf-pop bg-[#0a0a0a] border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
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

// ---------- SHARED MATCH CARD ----------
const MatchCard = ({ match, isSingles, indicatorColor, onNavigate, onEdit, full = false }) => {
  const { state, dispatch, isAdmin, isSuperAdmin } = useContext(TournamentContext);
  const dialog = useDialog();
  if (!match) return null;
  const updateType = isSingles ? 'UPDATE_SINGLES_MATCH' : 'UPDATE_MATCH';
  const tA = findEntrant(state, isSingles, match.teamAId);
  const tB = findEntrant(state, isSingles, match.teamBId);
  const isToday = match.date && match.date === todayKey();
  const scoreA = (match.scores || []).filter(s => s.a > s.b).length;
  const scoreB = (match.scores || []).filter(s => s.b > s.a).length;

  return (
    <Card className={`relative ${full ? 'w-full' : 'w-72'} border-slate-800/80 group ${match.status === 'live' ? 'sf-live-glow' : ''} ${indicatorColor ? `border-l-2 ${indicatorColor}` : ''} ${isToday ? 'ring-1 ring-amber-400/60 shadow-[0_0_20px_rgba(251,191,36,0.15)]' : ''}`}>
      <div className="flex justify-between items-start mb-3 gap-2">
        <div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{match.title}{match.round ? <span className="text-slate-600"> • {match.round}</span> : null}</div>
          <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1.5">
            <CalendarDays size={10}/> {fmtDateShort(match.date)}
            {isToday && <span className="text-[9px] font-black text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded uppercase tracking-widest">Today</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 relative">
          <span className={`text-[9px] font-bold px-2 py-1 rounded uppercase tracking-wider ${match.status==='completed'?'bg-emerald-500/10 text-emerald-400':match.status==='live'?'bg-red-500/10 text-red-400':'bg-slate-800/50 text-slate-500'}`}>{match.isBye ? 'bye' : match.status}</span>
          {isSuperAdmin && (
            <div className="absolute -right-2 -top-2 opacity-0 group-hover:opacity-100 flex gap-1 z-10">
              {match.status !== 'upcoming' && !match.isBye && <button onClick={(e) => { e.stopPropagation(); dialog.confirm("Reset Match?", "Clear scores?", () => dispatch({type: updateType, payload: {id: match.id, updates: {status: 'upcoming', scores: [], winnerId: null, liveGame: null}}}), true); }} className="p-1 bg-red-900/40 text-red-400 hover:bg-red-900/60 rounded"><RotateCcw size={12}/></button>}
              <button onClick={(e) => { e.stopPropagation(); onEdit && onEdit(match); }} className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"><Edit2 size={12}/></button>
            </div>
          )}
        </div>
      </div>
      <div className="space-y-3">
        <div className={`flex justify-between items-center ${match.winnerId && match.winnerId === match.teamAId ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>
          <span className="text-sm truncate pr-2">{entrantName(tA, isSingles)} <span className="text-[10px] opacity-40 ml-1">({tA?.code||'-'})</span></span>
          {match.status === 'completed' && match.teamAId && !match.isBye && <span className="text-sm font-bold">{scoreA}</span>}
        </div>
        <div className="h-px bg-slate-800/50"></div>
        <div className={`flex justify-between items-center ${match.winnerId && match.winnerId === match.teamBId ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>
          <span className="text-sm truncate pr-2">{match.isBye ? 'BYE' : entrantName(tB, isSingles)} {!match.isBye && <span className="text-[10px] opacity-40 ml-1">({tB?.code||'-'})</span>}</span>
          {match.status === 'completed' && match.teamBId && !match.isBye && <span className="text-sm font-bold">{scoreB}</span>}
        </div>
      </div>
      {isAdmin && match.status !== 'completed' && match.teamAId && match.teamBId && onNavigate && (
        <div className="mt-4 pt-3 border-t border-slate-800/50">
          <Button className="w-full text-xs py-1.5" variant={match.status === 'live' ? 'primary' : 'secondary'} onClick={() => {
              if(match.status === 'upcoming') dispatch({ type: updateType, payload: { id: match.id, updates: { status: 'live' } }});
              onNavigate(isSingles ? 'live_singles' : 'live_doubles', match.id);
          }}>{match.status === 'live' ? 'Resume Scoring' : 'Live Score'}</Button>
        </div>
      )}
    </Card>
  );
};

// ---------- SUPER ADMIN: EDIT MATCH (title, round, date, teams, delete) ----------
const MatchEditModal = ({ match, isSingles, onClose }) => {
  const { state, dispatch } = useContext(TournamentContext);
  const dialog = useDialog();
  const entrants = isSingles ? state.singlesTeams : state.teams;
  const updateType = isSingles ? 'UPDATE_SINGLES_MATCH' : 'UPDATE_MATCH';
  const hasAutoA = !isSingles && match.srcA;
  const hasAutoB = !isSingles && match.srcB;
  const defA = hasAutoA && !match.manualA ? '__auto' : (match.teamAId || '');
  const defB = hasAutoB && !match.manualB ? '__auto' : (match.teamBId || '');

  const submit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const vA = fd.get('teamAId'); const vB = fd.get('teamBId');
    const updates = { title: (fd.get('title') || '').trim() || match.title, round: (fd.get('round') || '').trim(), date: fd.get('date') || null };
    let changedTeams = false;
    if (vA !== '__auto') {
      const nA = vA || null;
      if (nA !== match.teamAId) changedTeams = true;
      updates.teamAId = nA; if (!isSingles) updates.manualA = !!match.srcA;
    } else { updates.manualA = false; }
    if (vB !== '__auto') {
      const nB = vB || null;
      if (nB !== match.teamBId) changedTeams = true;
      updates.teamBId = nB; if (!isSingles) updates.manualB = !!match.srcB;
    } else { updates.manualB = false; }
    if (changedTeams && match.status !== 'upcoming') { updates.status = 'upcoming'; updates.scores = []; updates.winnerId = null; updates.liveGame = null; }
    dispatch({ type: updateType, payload: { id: match.id, updates } });
    onClose();
  };

  const sel = "w-full bg-[#050505] border border-slate-800 rounded-lg px-4 py-2 text-white";
  const lab = "block text-xs font-bold text-slate-500 mb-1";
  return (
    <Modal isOpen={true} onClose={onClose} title={`Edit ${match.title}`}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div><label className={lab}>Match Label</label><input name="title" defaultValue={match.title} required className={sel} /></div>
          <div><label className={lab}>Round / Stage</label><input name="round" defaultValue={match.round || ''} className={sel} /></div>
        </div>
        <div><label className={lab}>Date</label><input type="date" name="date" defaultValue={match.date || ''} className={sel} /></div>
        <div>
          <label className={lab}>{isSingles ? 'Player 1' : 'Team A'}</label>
          <select name="teamAId" defaultValue={defA} className={sel}>
            {hasAutoA && <option value="__auto">Auto (from bracket)</option>}
            <option value="">TBD</option>
            {entrants.map(t => <option key={t.id} value={t.id}>{t.code} - {entrantName(t, isSingles)}</option>)}
          </select>
        </div>
        <div>
          <label className={lab}>{isSingles ? 'Player 2' : 'Team B'}</label>
          <select name="teamBId" defaultValue={defB} className={sel} disabled={!!match.isBye}>
            {hasAutoB && <option value="__auto">Auto (from bracket)</option>}
            <option value="">TBD</option>
            {entrants.map(t => <option key={t.id} value={t.id}>{t.code} - {entrantName(t, isSingles)}</option>)}
          </select>
        </div>
        <div className="flex gap-3 pt-2">
          {match.custom && <Button variant="danger" icon={Trash2} onClick={() => dialog.confirm('Delete Match?', `${match.title} will be removed permanently.`, () => { dispatch({ type: 'DELETE_MATCH', payload: { isSingles, id: match.id } }); onClose(); }, true)}>Delete</Button>}
          <Button type="submit" className="flex-1">Save Changes</Button>
        </div>
      </form>
    </Modal>
  );
};

// ---------- SUPER ADMIN: ADD MATCH (anywhere in the list) ----------
const AddMatchModal = ({ isSingles, onClose }) => {
  const { state, dispatch } = useContext(TournamentContext);
  const entrants = isSingles ? state.singlesTeams : state.teams;
  const matches = isSingles ? state.singlesMatches : state.matches;

  const submit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const match = {
      id: `X${Date.now().toString(36)}`, isSingles, custom: true,
      title: (fd.get('title') || '').trim() || 'Extra Match',
      round: (fd.get('round') || '').trim() || 'Extra',
      date: fd.get('date') || null,
      teamAId: fd.get('teamAId') || null, teamBId: fd.get('teamBId') || null,
      srcA: null, srcB: null, manualA: false, manualB: false,
      status: 'upcoming', scores: [], winnerId: null
    };
    dispatch({ type: 'ADD_MATCH', payload: { isSingles, match, afterId: fd.get('afterId') || null } });
    onClose();
  };
  const sel = "w-full bg-[#050505] border border-slate-800 rounded-lg px-4 py-2 text-white";
  const lab = "block text-xs font-bold text-slate-500 mb-1";
  return (
    <Modal isOpen={true} onClose={onClose} title="Add New Match">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div><label className={lab}>Match Label</label><input name="title" placeholder="e.g. Exhibition 1" required className={sel} /></div>
          <div><label className={lab}>Round / Stage</label><input name="round" placeholder="Extra" className={sel} /></div>
        </div>
        <div><label className={lab}>Date</label><input type="date" name="date" defaultValue={todayKey()} className={sel} /></div>
        <div><label className={lab}>{isSingles ? 'Player 1' : 'Team A'}</label>
          <select name="teamAId" className={sel}><option value="">TBD</option>{entrants.map(t => <option key={t.id} value={t.id}>{t.code} - {entrantName(t, isSingles)}</option>)}</select></div>
        <div><label className={lab}>{isSingles ? 'Player 2' : 'Team B'}</label>
          <select name="teamBId" className={sel}><option value="">TBD</option>{entrants.map(t => <option key={t.id} value={t.id}>{t.code} - {entrantName(t, isSingles)}</option>)}</select></div>
        <div><label className={lab}>Place it after</label>
          <select name="afterId" defaultValue="" className={sel}><option value="">At the end</option>{matches.map(m => <option key={m.id} value={m.id}>{m.title}{m.round ? ` (${m.round})` : ''}</option>)}</select></div>
        <Button type="submit" className="w-full" icon={Plus}>Add Match</Button>
      </form>
    </Modal>
  );
};

// ---------- STANDINGS ----------
const computeStandings = (entrants, matches, settings) => {
  const rows = {};
  entrants.forEach(t => { rows[t.id] = { t, p: 0, w: 0, l: 0, sw: 0, sl: 0, pf: 0, pa: 0, pts: 0 }; });
  matches.forEach(m => {
    if (m.status !== 'completed' || m.isBye || !m.winnerId || !m.teamAId || !m.teamBId) return;
    const a = rows[m.teamAId], b = rows[m.teamBId];
    if (!a || !b) return;
    let swA = 0, swB = 0, pa = 0, pb = 0;
    (m.scores || []).forEach(s => { pa += s.a; pb += s.b; if (s.a > s.b) swA++; else if (s.b > s.a) swB++; });
    a.p++; b.p++;
    a.sw += swA; a.sl += swB; b.sw += swB; b.sl += swA;
    a.pf += pa; a.pa += pb; b.pf += pb; b.pa += pa;
    const win = m.winnerId === m.teamAId ? a : b;
    const lose = win === a ? b : a;
    win.w++; lose.l++;
  });
  return Object.values(rows).map(r => ({ ...r, sd: r.sw - r.sl, pd: r.pf - r.pa, pts: r.w * settings.pointsWin + r.l * settings.pointsLoss }))
    .sort((x, y) => y.pts - x.pts || y.sd - x.sd || y.pd - x.pd || x.t.seed - y.t.seed);
};

const Standings = ({ mode }) => {
  const { state } = useContext(TournamentContext);
  const isSingles = mode === 'SINGLES';
  const rows = computeStandings(isSingles ? state.singlesTeams : state.teams, isSingles ? state.singlesMatches : state.matches, state.settings);
  const th = "px-3 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center";
  return (
    <div className="space-y-6 animate-in fade-in">
      <div>
        <h2 className="text-2xl font-bold text-white uppercase tracking-wider">Standings</h2>
        <p className="text-slate-500 text-sm mt-1">{isSingles ? 'Singles' : 'Doubles'} Points Table • Win = {state.settings.pointsWin} pts, Loss = {state.settings.pointsLoss} pts</p>
      </div>
      <Card reveal className="p-0 overflow-hidden sf-static">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-[#050505] border-b border-slate-800">
              <tr>
                <th className={th}>#</th>
                <th className={`${th} text-left`}>{isSingles ? 'Player' : 'Team'}</th>
                <th className={th}>P</th><th className={th}>W</th><th className={th}>L</th>
                <th className={th}>Sets</th><th className={th}>Set +/-</th>
                <th className={th}>Pts For-Ag</th><th className={th}>Pt +/-</th>
                <th className={`${th} text-emerald-500`}>PTS</th>
                <th className={th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const out = r.l >= 2;
                return (
                  <tr key={r.t.id} style={{ '--d': `${Math.min(i, 14) * 45}ms` }} className={`sf-row border-b border-slate-800/50 ${i < 3 && r.p > 0 ? 'bg-emerald-500/5' : ''} ${out ? 'opacity-50' : ''}`}>
                    <td className="px-3 py-3 text-center font-black text-slate-400">{i + 1}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 shrink-0 rounded-full bg-slate-800/60 flex items-center justify-center text-[11px] font-black text-slate-300">{r.t.code}</span>
                        <span className="font-semibold text-slate-200">{entrantName(r.t, isSingles)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center text-slate-300">{r.p}</td>
                    <td className="px-3 py-3 text-center text-emerald-400 font-bold">{r.w}</td>
                    <td className="px-3 py-3 text-center text-red-400 font-bold">{r.l}</td>
                    <td className="px-3 py-3 text-center text-slate-300">{r.sw}-{r.sl}</td>
                    <td className="px-3 py-3 text-center text-slate-400">{r.sd > 0 ? `+${r.sd}` : r.sd}</td>
                    <td className="px-3 py-3 text-center text-slate-300">{r.pf}-{r.pa}</td>
                    <td className="px-3 py-3 text-center text-slate-400">{r.pd > 0 ? `+${r.pd}` : r.pd}</td>
                    <td className="px-3 py-3 text-center text-lg font-black text-white">{r.pts}</td>
                    <td className="px-3 py-3 text-center">
                      <span className={`text-[9px] font-bold px-2 py-1 rounded uppercase tracking-wider ${out ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>{out ? 'Eliminated' : 'Active'}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="text-slate-600 text-xs">Ranking: Points → Set difference → Point difference. A side is shown as Eliminated after 2 losses (double elimination). BYE matches are not counted.</p>
    </div>
  );
};

// ---------- SCHEDULE (everyone sees it, super admin can edit / add) ----------
const Schedule = ({ mode, onNavigate }) => {
  const { state, isSuperAdmin } = useContext(TournamentContext);
  const isSingles = mode === 'SINGLES';
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const matches = (isSingles ? state.singlesMatches : state.matches).filter(m => !m.isBye);
  const today = todayKey();

  const sorted = matches.map((m, idx) => ({ m, idx })).sort((a, b) => (a.m.date || '9999').localeCompare(b.m.date || '9999') || a.idx - b.idx).map(x => x.m);
  const groups = [];
  sorted.forEach(m => {
    const key = m.date || 'none';
    const g = groups.find(x => x.key === key);
    if (g) g.items.push(m); else groups.push({ key, items: [m] });
  });

  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white uppercase tracking-wider">Match Schedule</h2>
          <p className="text-slate-500 text-sm mt-1">{isSingles ? 'Singles' : 'Doubles'} • all fixtures by date</p>
        </div>
        {isSuperAdmin && <Button icon={Plus} onClick={() => setAdding(true)}>Add Match</Button>}
      </div>

      {groups.map(g => (
        <div key={g.key}>
          <div className="flex items-center gap-3 mb-4">
            <h3 className={`text-sm font-black uppercase tracking-widest ${g.key === today ? 'text-amber-400' : 'text-slate-400'}`}>{g.key === 'none' ? 'No date set' : fmtDate(g.key)}</h3>
            {g.key === today && <span className="text-[9px] font-black text-amber-400 bg-amber-400/10 px-2 py-1 rounded uppercase tracking-widest">Today</span>}
            <div className="flex-1 h-px bg-slate-800/60"></div>
            <span className="text-[10px] text-slate-600 font-bold">{g.items.length} match{g.items.length > 1 ? 'es' : ''}</span>
          </div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {g.items.map((m, i) => (
              <Reveal key={m.id} delay={Math.min(i, 5) * 70}>
                <MatchCard match={m} isSingles={isSingles} full indicatorColor={m.custom ? 'border-l-blue-500' : 'border-l-slate-700'} onNavigate={onNavigate} onEdit={setEditing} />
              </Reveal>
            ))}
          </div>
        </div>
      ))}

      {isSuperAdmin && editing && <MatchEditModal match={editing} isSingles={isSingles} onClose={() => setEditing(null)} />}
      {isSuperAdmin && adding && <AddMatchModal isSingles={isSingles} onClose={() => setAdding(false)} />}
    </div>
  );
};

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
        {state.singlesTeams.map((p, i) => (
          <Card key={p.id} reveal delay={(i % 8) * 60} className="relative group hover:border-slate-600 transition-colors">
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
  const [editingSM, setEditingSM] = useState(null);
  const getS = (matchIds) => matchIds.map(id => state.singlesMatches.find(m => m.id === id));

  // Stable component (so cards don't remount / re-animate on every score update)
  const bracketRef = useRef({});
  bracketRef.current = { onNavigate, onEdit: setEditingSM };
  const MB = useMemo(() => ({ match, indicatorColor }) => (
    <Reveal>
      <MatchCard match={match} isSingles indicatorColor={indicatorColor}
        onNavigate={(...a) => bracketRef.current.onNavigate && bracketRef.current.onNavigate(...a)}
        onEdit={(m) => bracketRef.current.onEdit && bracketRef.current.onEdit(m)} />
    </Reveal>
  ), []);

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
            <><div className="flex flex-col gap-4"><div className="text-[10px] font-bold text-emerald-500 tracking-widest uppercase mb-2">Round 1 (24 Players)</div>{getS(['M1','M2','M3','M4','M5','M6','M7','M8','M9','M10','M11','M12']).map(m => <MB key={m?.id} match={m} indicatorColor="border-l-emerald-500" />)}</div>
              <div className="flex flex-col justify-around gap-4"><div className="text-[10px] font-bold text-emerald-500 tracking-widest uppercase mb-2">Winner Side R1</div>{getS(['W1','W2','W3','W4','W5','W6']).map(m => <MB key={m?.id} match={m} indicatorColor="border-l-emerald-500" />)}</div>
              <div className="flex flex-col justify-around gap-4"><div className="text-[10px] font-bold text-emerald-500 tracking-widest uppercase mb-2">Winner Side R2 (Final 6)</div>{getS(['W7','W8','W9']).map(m => <MB key={m?.id} match={m} indicatorColor="border-l-emerald-500" />)}</div></>
          )}
          {tab === 'loser' && (
            <><div className="flex flex-col gap-4"><div className="text-[10px] font-bold text-orange-500 tracking-widest uppercase mb-2">Loser Side R1</div>{getS(['L1','L2','L3','L4','L5','L6']).map(m => <MB key={m?.id} match={m} indicatorColor="border-l-orange-500" />)}</div>
              <div className="flex flex-col justify-around gap-4"><div className="text-[10px] font-bold text-orange-500 tracking-widest uppercase mb-2">Lower Merge</div>{getS(['L7','L8','L9','L10','L11','L12']).map(m => <MB key={m?.id} match={m} indicatorColor="border-l-orange-500" />)}</div>
              <div className="flex flex-col justify-around gap-4"><div className="text-[10px] font-bold text-orange-500 tracking-widest uppercase mb-2">Lower Side R3</div>{getS(['L13','L14','L15']).map(m => <MB key={m?.id} match={m} indicatorColor="border-l-orange-500" />)}</div></>
          )}
          {tab === 'finals' && (
            <div className="w-full flex flex-col gap-8 items-start"><ByePanel />
              <div className="flex gap-12 items-center w-full">
                <div className="flex flex-col gap-12">
                   <div><div className="text-[10px] font-bold text-yellow-500 tracking-widest uppercase mb-2">Final Winner Stage</div><MB match={getS(['W10'])[0]} indicatorColor="border-l-yellow-500" /></div>
                   <div className="flex flex-col gap-4"><div className="text-[10px] font-bold text-red-500 tracking-widest uppercase mb-2">Loser Pool</div>{getS(['L16','L17']).map(m => <MB key={m?.id} match={m} indicatorColor="border-l-red-500" />)}</div>
                </div>
                <div className="flex flex-col gap-12 justify-center h-full border-l border-slate-800/50 pl-12 relative"><div className="text-[10px] font-bold text-purple-500 tracking-widest uppercase mb-2 absolute top-0 -mt-6">Semifinals</div>{getS(['SF1','SF2']).map(m => <MB key={m?.id} match={m} indicatorColor="border-l-purple-500" />)}</div>
                <div className="flex flex-col items-center justify-center h-full border-l border-slate-800/50 pl-12 relative"><Trophy className="sf-trophy text-yellow-500 mb-4 scale-150"/><div className="text-[10px] font-bold text-yellow-500 tracking-widest uppercase mb-2 absolute -top-6">Grand Final</div><MB match={getS(['GF'])[0]} indicatorColor="border-l-yellow-500" />
                   {getS(['GF'])[0]?.winnerId && ( <div className="mt-8 text-center animate-in fade-in zoom-in"><div className="text-yellow-400 font-black text-xl uppercase tracking-widest">Singles Champion</div><div className="text-white font-bold text-lg mt-1">{state.singlesTeams.find(t=>t.id===getS(['GF'])[0].winnerId)?.player1}</div></div> )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {isSuperAdmin && editingSM && <MatchEditModal match={editingSM} isSingles={true} onClose={() => setEditingSM(null)} />}
    </div>
  );
};

// --- DOUBLES BRACKET (12-TEAM, 22 MATCHES) ---
const DoublesBracket = ({ onNavigate }) => {
  const { state, dispatch, isAdmin, isSuperAdmin } = useContext(TournamentContext);
  const [tab, setTab] = useState('winner');
  const [editingDM, setEditingDM] = useState(null);
  const getD = (matchIds) => matchIds.map(id => state.matches.find(m => m.id === id)).filter(Boolean);
  // Stable component (so cards don't remount / re-animate on every score update)
  const bracketRef = useRef({});
  bracketRef.current = { onNavigate, onEdit: setEditingDM };
  const MB = useMemo(() => ({ match, indicatorColor }) => (
    <Reveal>
      <MatchCard match={match} isSingles={false} indicatorColor={indicatorColor}
        onNavigate={(...a) => bracketRef.current.onNavigate && bracketRef.current.onNavigate(...a)}
        onEdit={(m) => bracketRef.current.onEdit && bracketRef.current.onEdit(m)} />
    </Reveal>
  ), []);

  // Manual semifinal slots (Upper Bracket Finalists etc.)
  const ubWinners = ['M07','M08','M09'].map(id => state.matches.find(m => m.id === id)?.winnerId).filter(Boolean).map(id => state.teams.find(t => t.id === id)).filter(Boolean);
  const SlotPicker = ({ label, matchId, side, options }) => {
    const m = state.matches.find(x => x.id === matchId);
    if (!m) return null;
    const field = side === 'A' ? 'teamAId' : 'teamBId';
    return (
      <div>
        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-widest">{label}</label>
        <select value={m[field] || ''} disabled={!isAdmin} onChange={(e) => dispatch({ type: 'UPDATE_MATCH', payload: { id: matchId, updates: { [field]: e.target.value || null } } })}
          className="w-full bg-[#050505] border border-slate-800 rounded-lg px-3 py-2 text-white text-sm">
          <option value="">TBD</option>
          {options.map(t => <option key={t.id} value={t.id}>{t.code} - {t.player1} & {t.player2}</option>)}
        </select>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white uppercase tracking-wider">Doubles VCT Bracket</h2>
          <p className="text-slate-500 text-sm mt-1">12-Team Double Elimination • 22 Matches</p>
        </div>
      </div>
      <div className="flex gap-2 bg-[#0a0a0a] border border-slate-800 p-1 rounded-lg w-fit mb-6 overflow-x-auto">
        {[{id: 'winner', l: '🟢 Upper Bracket', c: 'text-emerald-400'}, {id: 'loser', l: '🟠 Lower Bracket', c: 'text-orange-400'}, {id: 'finals', l: '🟣 Semis & Finals', c: 'text-purple-400'}].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 rounded-md font-bold text-xs tracking-widest uppercase whitespace-nowrap transition-all ${tab === t.id ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}><span className={tab===t.id?t.c:''}>{t.l}</span></button>
        ))}
      </div>
      <div className="overflow-x-auto pb-12">
        <div className="min-w-max flex gap-8">
          {tab === 'winner' && (
            <><div className="flex flex-col gap-4"><div className="text-[10px] font-bold text-emerald-500 tracking-widest uppercase mb-2">Round 1 (6 Matches)</div>{getD(['M01','M02','M03','M04','M05','M06']).map(m => <MB key={m.id} match={m} indicatorColor="border-l-emerald-500" />)}</div>
              <div className="flex flex-col justify-around gap-4"><div className="text-[10px] font-bold text-emerald-500 tracking-widest uppercase mb-2">Upper Bracket (3 Matches)</div>{getD(['M07','M08','M09']).map(m => <MB key={m.id} match={m} indicatorColor="border-l-emerald-500" />)}</div>
            </>
          )}
          {tab === 'loser' && (
            <><div className="flex flex-col justify-around gap-4"><div className="text-[10px] font-bold text-orange-500 tracking-widest uppercase mb-2">Lower R1 (3 Matches)</div>{getD(['M10','M11','M12']).map(m => <MB key={m.id} match={m} indicatorColor="border-l-orange-500" />)}</div>
              <div className="flex flex-col justify-around gap-4"><div className="text-[10px] font-bold text-orange-500 tracking-widest uppercase mb-2">Lower R2 (3 Matches)</div>{getD(['M13','M14','M15']).map(m => <MB key={m.id} match={m} indicatorColor="border-l-orange-500" />)}</div>
              <div className="flex flex-col justify-around gap-4"><div className="text-[10px] font-bold text-orange-500 tracking-widest uppercase mb-2">Lower R3 (2 Matches)</div>{getD(['M16','M17']).map(m => <MB key={m.id} match={m} indicatorColor="border-l-orange-500" />)}</div>
            </>
          )}
          {tab === 'finals' && (
            <div className="w-full flex flex-col gap-8 items-start">
              {isAdmin && (
                <Card className="border-yellow-500/20 bg-yellow-500/5 w-full max-w-4xl">
                  <h3 className="text-yellow-500 font-bold flex items-center gap-2 mb-1 uppercase tracking-widest text-sm"><Zap size={16}/> Finalist Slots</h3>
                  <p className="text-slate-500 text-xs mb-4">Upper Bracket Finalists are placed here manually once M07, M08 and M09 are done.</p>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <SlotPicker label="M19 • UB Finalist" matchId="M19" side="A" options={ubWinners} />
                    <SlotPicker label="M20 • UB Finalist" matchId="M20" side="A" options={ubWinners} />
                    <SlotPicker label="M21 • UB Finalist" matchId="M21" side="A" options={ubWinners} />
                    <SlotPicker label="M21 • Finalist" matchId="M21" side="B" options={state.teams} />
                  </div>
                </Card>
              )}
              <div className="flex gap-12 items-center w-full">
                <div className="flex flex-col gap-4 justify-center"><div className="text-[10px] font-bold text-pink-500 tracking-widest uppercase mb-2">Semifinal Qualifiers</div>{getD(['M18','M19']).map(m => <MB key={m.id} match={m} indicatorColor="border-l-pink-500" />)}</div>
                <div className="flex flex-col gap-12 justify-center h-full border-l border-slate-800/50 pl-12 relative"><div className="text-[10px] font-bold text-purple-500 tracking-widest uppercase mb-2 absolute top-0 -mt-6">Semifinals</div>{getD(['M20', 'M21']).map(m => <MB key={m.id} match={m} indicatorColor="border-l-purple-500" />)}</div>
                <div className="flex flex-col items-center justify-center h-full border-l border-slate-800/50 pl-12 relative"><Trophy className="sf-trophy text-yellow-500 mb-4 scale-150"/><div className="text-[10px] font-bold text-yellow-500 tracking-widest uppercase mb-2 absolute -top-6">Grand Final</div><MB match={getD(['M22'])[0]} indicatorColor="border-l-yellow-500" />
                   {getD(['M22'])[0]?.winnerId && ( <div className="mt-8 text-center animate-in fade-in zoom-in"><div className="text-yellow-400 font-black text-xl uppercase tracking-widest">Doubles Champion</div><div className="text-white font-bold text-lg mt-1">{state.teams.find(t=>t.id===getD(['M22'])[0].winnerId)?.player1} & {state.teams.find(t=>t.id===getD(['M22'])[0].winnerId)?.player2}</div></div> )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {isSuperAdmin && editingDM && <MatchEditModal match={editingDM} isSingles={false} onClose={() => setEditingDM(null)} />}
    </div>
  );
};

const LiveScoring = ({ matchId, isSingles, onBack }) => {
  const { state, dispatch } = useContext(TournamentContext);
  const match = isSingles ? state.singlesMatches.find(m => m.id === matchId) : state.matches.find(m => m.id === matchId);
  const teamA = isSingles ? state.singlesTeams.find(t => t.id === match?.teamAId) : state.teams.find(t => t.id === match?.teamAId);
  const teamB = isSingles ? state.singlesTeams.find(t => t.id === match?.teamBId) : state.teams.find(t => t.id === match?.teamBId);

  const [scores, setScores] = useState(match?.scores || []);
  const [currentGame, setCurrentGame] = useState(match?.liveGame || { a: 0, b: 0 });
  const updateType = isSingles ? 'UPDATE_SINGLES_MATCH' : 'UPDATE_MATCH';

  if (!match || !teamA || !teamB) return <div className="p-8 text-center text-slate-500">Match not ready.</div>;

  const handleScore = (team, delta) => {
    const next = { ...currentGame, [team]: Math.max(0, currentGame[team] + delta) };
    setCurrentGame(next);
    dispatch({ type: updateType, payload: { id: match.id, updates: { liveGame: next, status: 'live' } } });
  };

  const handleNextGame = () => {
    const newScores = [...scores, currentGame];
    setScores(newScores); setCurrentGame({ a: 0, b: 0 });
    dispatch({ type: updateType, payload: { id: match.id, updates: { scores: newScores, liveGame: { a: 0, b: 0 } } } });
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

    dispatch({ type: updateType, payload: { id: match.id, updates: { scores: finalScores, status: 'completed', winnerId, liveGame: null } } });
    onBack();
  };

  const cGA = scores.filter(s => checkGameWin(s.a, s.b, state.settings.pointsPerGame) && s.a > s.b).length;
  const cGB = scores.filter(s => checkGameWin(s.a, s.b, state.settings.pointsPerGame) && s.b > s.a).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-right-4">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300"><ArrowRight className="rotate-180" size={20} /></button>
        <h2 className="text-2xl font-bold text-white flex-1">{match.title} <span className="text-slate-500 text-sm font-medium">Live Scoring</span></h2>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-[#0a0a0a] border border-slate-800 rounded-3xl p-6 flex flex-col items-center">
          <h3 className="text-xl font-bold text-white text-center mb-1">{teamA.code}</h3>
          <p className="text-slate-500 text-sm text-center h-10">{teamA.player1} {!isSingles && <><br/>{teamA.player2}</>}</p>
          <div className="text-xs font-black tracking-widest uppercase text-emerald-500 mt-4 bg-emerald-500/10 px-4 py-1.5 rounded-md">Sets Won: {cGA}</div>
          <div key={`a${currentGame.a}`} className="sf-bump text-[120px] leading-none font-black text-white my-8 select-none">{currentGame.a}</div>
          <div className="flex gap-4 w-full">
            <button onClick={() => handleScore('a', -1)} className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 rounded-xl text-2xl font-bold text-slate-300">-</button>
            <button onClick={() => handleScore('a', 1)} className="flex-[3] py-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-4xl font-bold text-white">+</button>
          </div>
        </div>
        <div className="bg-[#0a0a0a] border border-slate-800 rounded-3xl p-6 flex flex-col items-center">
          <h3 className="text-xl font-bold text-white text-center mb-1">{teamB.code}</h3>
          <p className="text-slate-500 text-sm text-center h-10">{teamB.player1} {!isSingles && <><br/>{teamB.player2}</>}</p>
          <div className="text-xs font-black tracking-widest uppercase text-blue-500 mt-4 bg-blue-500/10 px-4 py-1.5 rounded-md">Sets Won: {cGB}</div>
          <div key={`b${currentGame.b}`} className="sf-bump text-[120px] leading-none font-black text-white my-8 select-none">{currentGame.b}</div>
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

const Dashboard = ({ mode, onNavigate }) => {
  const { state, dispatch, isAdmin } = useContext(TournamentContext);
  const isSingles = mode === 'SINGLES';
  const m = (isSingles ? state.singlesMatches : state.matches).filter(x => !x.isBye);
  const total = m.length;
  const completed = m.filter(x => x.status === 'completed').length;
  const live = m.filter(x => x.status === 'live');
  const updateType = isSingles ? 'UPDATE_SINGLES_MATCH' : 'UPDATE_MATCH';

  const [today, setToday] = useState(todayKey());
  useEffect(() => { const t = setInterval(() => setToday(todayKey()), 60000); return () => clearInterval(t); }, []);

  const todayMatches = m.filter(x => x.date === today && x.status !== 'live');
  const nextDate = m.filter(x => x.date && x.date > today && x.status !== 'completed').map(x => x.date).sort()[0];
  const nextMatches = nextDate ? m.filter(x => x.date === nextDate && x.status !== 'completed') : [];

  const MiniMatch = ({ match, accent }) => {
    const tA = findEntrant(state, isSingles, match.teamAId);
    const tB = findEntrant(state, isSingles, match.teamBId);
    const sA = (match.scores || []).filter(s => s.a > s.b).length;
    const sB = (match.scores || []).filter(s => s.b > s.a).length;
    const done = match.status === 'completed';
    return (
      <Card className={`${accent ? 'border-amber-400/40 bg-gradient-to-br from-[#0a0a0a] to-[#14110a] shadow-[0_0_25px_rgba(251,191,36,0.08)]' : 'border-slate-800'}`}>
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800/80">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{match.title}{match.round ? ` • ${match.round}` : ''}</span>
          <span className={`text-[9px] font-bold px-2 py-1 rounded uppercase tracking-widest ${done ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800/60 text-slate-400'}`}>{done ? 'Completed' : 'Upcoming'}</span>
        </div>
        <div className="space-y-3">
          {[{ t: tA, id: match.teamAId, s: sA }, { t: tB, id: match.teamBId, s: sB }].map((r, i) => (
            <div key={i} className={`flex justify-between items-center ${done && match.winnerId === r.id ? 'text-emerald-400 font-bold' : 'text-slate-200'}`}>
              <div className="flex gap-3 items-center min-w-0">
                <span className="w-8 h-8 shrink-0 rounded-full bg-slate-800 flex items-center justify-center text-xs font-black text-slate-400">{r.t?.code || '-'}</span>
                <span className="text-sm font-semibold truncate">{entrantName(r.t, isSingles)}</span>
              </div>
              {done && <span className="text-xl font-black">{r.s}</span>}
            </div>
          ))}
        </div>
        {isAdmin && !done && match.teamAId && match.teamBId && (
          <Button className="w-full text-xs py-1.5 mt-4" variant="secondary" onClick={() => {
            if (match.status === 'upcoming') dispatch({ type: updateType, payload: { id: match.id, updates: { status: 'live' } } });
            onNavigate(isSingles ? 'live_singles' : 'live_doubles', match.id);
          }}>Live Score</Button>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <Reveal dir="zoom">
        <header className="mb-8 relative">
          <div className="text-[10px] font-black tracking-[0.35em] text-emerald-400/80 uppercase mb-3 flex items-center gap-2"><span className="sf-dot"></span>{fmtDate(today)}</div>
          <h1 className="sf-gradient-text text-4xl md:text-6xl font-black tracking-tight uppercase leading-none">{state.settings.tournamentName}</h1>
          <p className="text-slate-500 mt-3">Overview • {isSingles ? 'Singles VCT' : 'Doubles VCT'}</p>
          <div className="sf-hero-line mt-5"></div>
        </header>
      </Reveal>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card reveal delay={0} className="flex flex-col items-center text-center p-4"><Users className="text-blue-500 mb-3" size={24} /><CountUp className="text-3xl font-black text-white" value={isSingles ? state.singlesTeams.length : state.teams.length} /><span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">{isSingles ? 'Players' : 'Teams'}</span></Card>
        <Card reveal delay={90} className="flex flex-col items-center text-center p-4"><CalendarDays className="text-purple-500 mb-3" size={24} /><CountUp className="text-3xl font-black text-white" value={total} /><span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">Total Matches</span></Card>
        <Card reveal delay={180} className="flex flex-col items-center text-center p-4 border-emerald-500/20 bg-emerald-500/5"><CheckCircle2 className="text-emerald-500 mb-3" size={24} /><CountUp className="text-3xl font-black text-white" value={completed} /><span className="text-[10px] text-emerald-500/70 uppercase tracking-widest font-bold mt-1">Completed</span></Card>
        <Card reveal delay={270} className="flex flex-col items-center text-center p-4 border-yellow-500/20 bg-yellow-500/5">
           <Activity className={`text-yellow-500 mb-3 ${live.length > 0 ? 'animate-pulse drop-shadow-[0_0_10px_rgba(234,179,8,0.8)]' : ''}`} size={24} />
           <CountUp className="text-3xl font-black text-white" value={live.length} /><span className="text-[10px] text-yellow-500/70 uppercase tracking-widest font-bold mt-1">Live Now</span>
        </Card>
      </div>

      {live.length > 0 && (
         <div className="mt-8 animate-in fade-in slide-in-from-bottom-4">
            <h3 className="text-sm font-bold text-yellow-500 uppercase tracking-widest mb-4 flex items-center gap-2"><Activity size={16}/> Active Match Status</h3>
            <div className="grid md:grid-cols-2 gap-4">
               {live.map((match, li) => {
                  const tA = findEntrant(state, isSingles, match.teamAId);
                  const tB = findEntrant(state, isSingles, match.teamBId);
                  let currentGameScore = match.liveGame || {a:0, b:0};
                  let setsA = (match.scores || []).filter(s => checkGameWin(s.a, s.b, state.settings.pointsPerGame) && s.a > s.b).length;
                  let setsB = (match.scores || []).filter(s => checkGameWin(s.a, s.b, state.settings.pointsPerGame) && s.b > s.a).length;

                  return (
                     <Card key={match.id} reveal delay={li * 90} className="sf-live-glow border-yellow-500/30 bg-gradient-to-br from-[#0a0a0a] to-[#0d0d00]">
                        <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800/80">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{match.title}{match.round ? ` • ${match.round}` : ''}</span>
                           <span className="text-[9px] font-bold px-2 py-1 rounded bg-red-500/10 text-red-500 uppercase tracking-widest animate-pulse">LIVE</span>
                        </div>
                        <div className="space-y-4">
                           <div className="flex justify-between items-center">
                              <div className="flex gap-3 items-center">
                                 <span className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-black text-slate-400">{tA?.code}</span>
                                 <div><div className="text-sm font-bold text-white">{tA?.player1}</div>{!isSingles && <div className="text-xs text-slate-500">{tA?.player2}</div>}</div>
                              </div>
                              <div className="flex items-center gap-4">
                                 <div className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">S: {setsA}</div>
                                 <div className="text-3xl font-black text-white w-12 text-right">{currentGameScore?.a || 0}</div>
                              </div>
                           </div>
                           <div className="flex justify-between items-center">
                              <div className="flex gap-3 items-center">
                                 <span className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-black text-slate-400">{tB?.code}</span>
                                 <div><div className="text-sm font-bold text-white">{tB?.player1}</div>{!isSingles && <div className="text-xs text-slate-500">{tB?.player2}</div>}</div>
                              </div>
                              <div className="flex items-center gap-4">
                                 <div className="text-xs font-bold text-blue-500 bg-blue-500/10 px-2 py-1 rounded">S: {setsB}</div>
                                 <div className="text-3xl font-black text-white w-12 text-right">{currentGameScore?.b || 0}</div>
                              </div>
                           </div>
                        </div>
                     </Card>
                  )
               })}
            </div>
         </div>
      )}

      {/* TODAY'S MATCHES (shown below live matches) */}
      {todayMatches.length > 0 && (
        <div className="mt-8 animate-in fade-in slide-in-from-bottom-4">
          <h3 className="text-sm font-bold text-amber-400 uppercase tracking-widest mb-4 flex items-center gap-2"><CalendarDays size={16}/> Today's Matches • {fmtDate(today)}</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {todayMatches.map((match, i) => <Reveal key={match.id} delay={i * 90}><MiniMatch match={match} accent /></Reveal>)}
          </div>
        </div>
      )}

      {todayMatches.length === 0 && live.length === 0 && (
        <div className="mt-8">
          <Card className="text-center py-8 text-slate-600 font-mono tracking-widest text-xs uppercase border-dashed border-slate-800">No matches scheduled today</Card>
        </div>
      )}

      {nextMatches.length > 0 && (
        <div className="mt-8 animate-in fade-in">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><ArrowRight size={16}/> Next Matchday • {fmtDate(nextDate)}</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {nextMatches.map((match, i) => <Reveal key={match.id} delay={i * 90}><MiniMatch match={match} /></Reveal>)}
          </div>
        </div>
      )}
    </div>
  );
};

const Teams = () => {
  const { state, dispatch, isSuperAdmin } = useContext(TournamentContext);
  const [editingTeam, setEditingTeam] = useState(null);

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center mb-6">
        <div><h2 className="text-2xl font-bold text-white uppercase tracking-wider">Doubles Teams</h2><p className="text-slate-500 text-sm mt-1">12-Team VCT Roster</p></div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {state.teams.map((team, i) => (
          <Card key={team.id} reveal delay={(i % 8) * 60} className="relative group hover:border-slate-700 transition-all">
            {isSuperAdmin && ( <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => setEditingTeam(team)} className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"><Edit2 size={14}/></button></div> )}
            <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 bg-slate-800/50 rounded-full flex items-center justify-center font-black text-slate-300">{team.code}</div><div><div className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Seed {team.seed}</div></div></div>
            <div className="space-y-1"><div className="font-semibold text-slate-200">{team.player1}</div><div className="text-[10px] text-slate-600 font-bold tracking-widest uppercase">AND</div><div className="font-semibold text-slate-200">{team.player2}</div></div>
          </Card>
        ))}
      </div>
      {isSuperAdmin && editingTeam && (
        <Modal isOpen={true} onClose={() => setEditingTeam(null)} title="Edit Team">
          <form onSubmit={(e) => {
            e.preventDefault(); const fd = new FormData(e.target);
            dispatch({ type: 'UPDATE_TEAM', payload: { ...editingTeam, player1: fd.get('player1'), player2: fd.get('player2') } });
            setEditingTeam(null);
          }} className="space-y-4">
            <div><label className="block text-xs font-bold text-slate-500 mb-1">Player 1</label><input name="player1" defaultValue={editingTeam.player1} required className="w-full bg-[#050505] border border-slate-800 rounded-lg px-4 py-2 text-white" /></div>
            <div><label className="block text-xs font-bold text-slate-500 mb-1">Player 2</label><input name="player2" defaultValue={editingTeam.player2} required className="w-full bg-[#050505] border border-slate-800 rounded-lg px-4 py-2 text-white" /></div>
            <Button type="submit" className="w-full mt-6">Save</Button>
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
          <Button onClick={() => dialog.confirm("Factory Reset", "Erase EVERYTHING?", () => { dispatch({ type: 'RESET_ALL' }); setTimeout(() => window.location.reload(), 1000); }, true)} variant="danger">Factory Reset Tournament</Button>
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
    if (!SYNC_ENABLED || !dbUser) { setLoading(false); return; }
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'past_tournaments'));
    const unsub = onSnapshot(q, (s) => { setHistory(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.createdAt - a.createdAt)); setLoading(false); }, () => setLoading(false));
    return unsub;
  }, [dbUser]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in">
      <header className="mb-8 text-center flex flex-col items-center"><Medal className="sf-float text-yellow-500 mb-4" size={48} /><h2 className="text-3xl font-black text-white uppercase">Hall of Fame</h2></header>
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

const SyncBadge = () => {
  const { syncStatus, isAdmin } = useContext(TournamentContext);
  const map = {
    live: { icon: Wifi, text: isAdmin ? 'Broadcasting live' : 'Live', cls: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
    connecting: { icon: Wifi, text: 'Connecting...', cls: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10 animate-pulse' },
    error: { icon: WifiOff, text: 'Sync error', cls: 'text-red-400 border-red-500/30 bg-red-500/10' },
    off: { icon: WifiOff, text: 'Offline mode', cls: 'text-slate-400 border-slate-700 bg-slate-800/50' },
  }[syncStatus];
  const Icon = map.icon;
  return <div className={`fixed top-3 right-3 z-40 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest backdrop-blur ${map.cls}`}><Icon size={12}/>{map.text}</div>;
};

const AppLayout = () => {
  const { isAdmin, setIsAdmin, isSuperAdmin, setIsSuperAdmin } = useContext(TournamentContext);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeMatchId, setActiveMatchId] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('DOUBLES');
  const mainRef = useRef(null);
  const barRef = useRef(null);
  const blobsRef = useRef(null);
  const rafRef = useRef(0);
  const [showTop, setShowTop] = useState(false);

  // Scroll-linked effects: progress bar, parallax background, back-to-top button
  const onScroll = () => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      const el = mainRef.current;
      if (!el) return;
      const max = el.scrollHeight - el.clientHeight;
      const p = max > 0 ? el.scrollTop / max : 0;
      if (barRef.current) barRef.current.style.transform = `scaleX(${p})`;
      if (blobsRef.current) blobsRef.current.style.transform = `translate3d(0, ${-el.scrollTop * 0.12}px, 0)`;
      const next = el.scrollTop > 400;
      setShowTop(prev => (prev === next ? prev : next));
    });
  };
  useEffect(() => { if (mainRef.current) mainRef.current.scrollTo({ top: 0 }); }, [activeTab]);
  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);
  const dialog = useDialog();

  const handleNav = (tab, matchId = null) => { setActiveTab(tab); if(matchId) setActiveMatchId(matchId); };

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === 'SmashFestIOISuper') { setIsAdmin(true); setIsSuperAdmin(true); setShowLogin(false); setPassword(''); }
    else if (password === 'SmashFest') { setIsAdmin(true); setIsSuperAdmin(false); setShowLogin(false); setPassword(''); }
    else { dialog.alert('Error', 'Incorrect password.'); setPassword(''); }
  };

  const systemItems = [{ id: 'history', i: History, l: 'Hall of Fame' }, ...(isAdmin ? [{ id: 'settings', i: SettingsIcon, l: 'Settings' }] : [])];
  const navGroups = mode === 'DOUBLES' ? [
    { label: 'MAIN', items: [{ id: 'dashboard', i: LayoutDashboard, l: 'Dashboard' }, { id: 'schedule', i: CalendarDays, l: isSuperAdmin ? 'Schedule & Manager' : 'Schedule' }, { id: 'standings', i: ListOrdered, l: 'Standings' }] },
    { label: 'DOUBLES', items: [{ id: 'teams', i: Users, l: 'Teams (12)' }, { id: 'd_bracket', i: Swords, l: 'VCT Bracket' }] },
    { label: 'SYSTEM', items: systemItems }
  ] : [
    { label: 'MAIN', items: [{ id: 'dashboard', i: LayoutDashboard, l: 'Dashboard' }, { id: 'schedule', i: CalendarDays, l: isSuperAdmin ? 'Schedule & Manager' : 'Schedule' }, { id: 'standings', i: ListOrdered, l: 'Standings' }] },
    { label: 'SINGLES', items: [{ id: 's_players', i: User, l: 'Players (24)' }, { id: 's_bracket', i: Swords, l: 'VCT Bracket' }] },
    { label: 'SYSTEM', items: systemItems }
  ];
  const flatItems = navGroups.flatMap(g => g.items);

  const switchMode = (m) => { setMode(m); handleNav('dashboard'); };
  const doLogout = () => { setIsAdmin(false); setIsSuperAdmin(false); handleNav('dashboard'); };

  return (
    <div className="sf-root flex h-screen bg-[#050505] text-slate-300 font-sans selection:bg-emerald-500/30">
      <GlobalStyles />
      <SyncBadge />
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-800/80 bg-[#020202] relative z-20">
        <div className="p-6 pb-2"><div className="flex items-center gap-3 text-white font-black text-xl tracking-tighter"><Shield className="sf-shield text-red-600" size={24}/>SMASHFEST <span className="text-red-600">'26</span></div></div>

        <div className="px-6 mb-8 mt-4">
          <div className="flex items-center bg-[#0a0a0a] rounded-lg p-1 border border-slate-800 shadow-inner">
            <button
              onClick={() => switchMode('SINGLES')}
              className={`flex-1 py-1.5 text-[11px] font-black tracking-widest uppercase rounded-md transition-all duration-300 ${mode === 'SINGLES' ? 'bg-white text-black shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Singles
            </button>
            <button
              onClick={() => switchMode('DOUBLES')}
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
                  {grp.items.map(n => <button key={n.id} onClick={()=>handleNav(n.id)} className={`relative w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 text-sm font-medium ${activeTab===n.id?'bg-slate-800/50 text-white shadow-sm border border-slate-700/50':'hover:bg-[#0a0a0a] hover:translate-x-1 text-slate-400'}`}>{activeTab===n.id && <span className="sf-nav-bar"></span>}<n.i size={16} className={activeTab===n.id?'text-emerald-500':''}/>{n.l}</button>)}
                </div>
             </div>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-800/80">
          {isAdmin ? <button onClick={doLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest bg-red-950/30 text-red-500 border border-red-900/30 hover:bg-red-900/40 transition-colors"><Unlock size={14}/> Logout {isSuperAdmin ? 'SuperAdmin' : 'Admin'}</button>
           : <button onClick={() => setShowLogin(true)} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest bg-slate-800/50 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700/50"><Lock size={14}/> Admin Login</button>}
        </div>
      </aside>

      <main ref={mainRef} onScroll={onScroll} className="flex-1 overflow-y-auto overflow-x-hidden pb-24 md:pb-0 relative">
        <div ref={barRef} className="sf-progress"></div>
        <div ref={blobsRef} className="sf-blobs" aria-hidden="true"><span></span><span></span><span></span></div>
        {/* Mobile header: mode switch + admin login */}
        <div className="md:hidden sticky top-0 z-30 bg-[#050505]/95 backdrop-blur border-b border-slate-800/80 px-4 py-3 flex items-center gap-3">
          <div className="flex items-center bg-[#0a0a0a] rounded-lg p-1 border border-slate-800">
            <button onClick={() => switchMode('SINGLES')} className={`px-3 py-1 text-[10px] font-black tracking-widest uppercase rounded-md ${mode === 'SINGLES' ? 'bg-white text-black' : 'text-slate-500'}`}>Singles</button>
            <button onClick={() => switchMode('DOUBLES')} className={`px-3 py-1 text-[10px] font-black tracking-widest uppercase rounded-md ${mode === 'DOUBLES' ? 'bg-white text-black' : 'text-slate-500'}`}>Doubles</button>
          </div>
          <div className="flex-1"></div>
          {isAdmin ? <button onClick={doLogout} className="p-2 rounded-lg bg-red-950/30 text-red-500 border border-red-900/30"><Unlock size={14}/></button>
           : <button onClick={() => setShowLogin(true)} className="p-2 rounded-lg bg-slate-800/50 text-slate-300 border border-slate-700/50"><Lock size={14}/></button>}
        </div>

        <div key={activeTab} className="sf-page relative z-10 max-w-7xl mx-auto p-4 md:p-8 pt-8 md:pt-12">
          {activeTab === 'dashboard' && <Dashboard mode={mode} onNavigate={handleNav} />}
          {activeTab === 'schedule' && <Schedule mode={mode} onNavigate={handleNav} />}
          {activeTab === 'standings' && <Standings mode={mode} />}
          {activeTab === 's_players' && <SinglesPlayers />}
          {activeTab === 's_bracket' && <SinglesBracket onNavigate={handleNav} />}
          {activeTab === 'live_singles' && isAdmin && <LiveScoring matchId={activeMatchId} isSingles={true} onBack={() => handleNav('s_bracket')} />}

          {activeTab === 'teams' && <Teams />}
          {activeTab === 'd_bracket' && <DoublesBracket onNavigate={handleNav} />}
          {activeTab === 'live_doubles' && isAdmin && <LiveScoring matchId={activeMatchId} isSingles={false} onBack={() => handleNav('d_bracket')} />}

          {activeTab === 'history' && <HallOfFame />}
          {activeTab === 'settings' && isAdmin && <Settings />}
        </div>
      </main>

      {/* Back to top */}
      <button type="button" aria-label="Back to top" onClick={() => mainRef.current && mainRef.current.scrollTo({ top: 0, behavior: 'smooth' })}
        className={`fixed right-4 bottom-20 md:bottom-6 z-40 p-3 rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-900/40 hover:bg-emerald-500 transition-all duration-300 ${showTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
        <ChevronUp size={18} />
      </button>

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-[#020202]/95 backdrop-blur border-t border-slate-800/80 flex overflow-x-auto">
        {flatItems.map(n => (
          <button key={n.id} onClick={() => handleNav(n.id)} className={`flex-1 min-w-[64px] flex flex-col items-center gap-1 py-2.5 text-[9px] font-bold uppercase tracking-wider ${activeTab === n.id ? 'text-emerald-400' : 'text-slate-500'}`}>
            <n.i size={18}/>{n.l.split(' ')[0]}
          </button>
        ))}
      </nav>

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
