import React, { createContext, useReducer, useContext, useEffect, useState, useMemo, useRef } from 'react';
import { 
  Trophy, Users, CalendarDays, LayoutDashboard, SettingsIcon, 
  CheckCircle2, X, Plus, Edit2, Shield, ListOrdered,
  Swords, Activity, Trash2, RotateCcw, AlertTriangle, ArrowRight,
  Medal, History, Check, Save, Zap, Lock, Unlock, User, Wifi, WifiOff
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, doc, setDoc } from 'firebase/firestore';

const appId = typeof __app_id !== 'undefined' ? __app_id : 'smashfest-local-deploy';
const firebaseConfigStr = typeof __firebase_config !== 'undefined' ? __firebase_config : null;
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// New key to clear frontend cache but KEEP cloud data
const LOCAL_STORAGE_KEY = 'smashfest_state_v35_restore'; 

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

// CONNECTED BACK TO V4: This is where your live data from 9:04 PM is safely stored!
const stateDocRef = () => doc(db, 'artifacts', appId, 'public', 'data', 'smashfest_final_v4', 'state');

const stableStringify = (v) => JSON.stringify(v, (k, val) =>
  val && typeof val === 'object' && !Array.isArray(val)
    ? Object.keys(val).sort().reduce((o, key) => { o[key] = val[key]; return o; }, {})
    : val);

const DEFAULT_SETTINGS = {
  tournamentName: "SMASHFEST '26",
  pointsWin: 2, pointsLoss: 0, bestOf: 3, pointsPerGame: 11, tables: 2,
};

// --- DOUBLES DATA (12-TEAM EXACT SPREADSHEET FORMAT) ---
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

const D_MATCH_TEMPLATE = (id, a, b, title) => ({
  id, isSingles: false, title, teamAId: a, teamBId: b, status: 'upcoming', scores: [], winnerId: null
});

const INITIAL_MATCHES = [
  D_MATCH_TEMPLATE('M01', 't1', 't8', 'M01 (06 Oct)'), D_MATCH_TEMPLATE('M02', 't7', 't9', 'M02 (06 Oct)'),
  D_MATCH_TEMPLATE('M03', 't2', 't11', 'M03 (07 Oct)'), D_MATCH_TEMPLATE('M04', 't4', 't10', 'M04 (07 Oct)'),
  D_MATCH_TEMPLATE('M05', 't3', 't12', 'M05 (08 Oct)'), D_MATCH_TEMPLATE('M06', 't5', 't6', 'M06 (09 Oct)'),
  
  D_MATCH_TEMPLATE('M07', null, null, 'M07 (12 Oct)'), D_MATCH_TEMPLATE('M08', null, null, 'M08 (12 Oct)'),
  D_MATCH_TEMPLATE('M09', null, null, 'M09 (13 Oct)'),
  
  D_MATCH_TEMPLATE('M10', null, null, 'M10 (12 Oct)'), D_MATCH_TEMPLATE('M11', null, null, 'M11 (13 Oct)'),
  D_MATCH_TEMPLATE('M12', null, null, 'M12 (13 Oct)'),
  
  D_MATCH_TEMPLATE('M13', null, null, 'M13 (14 Oct)'), D_MATCH_TEMPLATE('M14', null, null, 'M14 (14 Oct)'),
  D_MATCH_TEMPLATE('M15', null, null, 'M15 (14 Oct)'),
  
  D_MATCH_TEMPLATE('M16', null, null, 'M16 (14 Oct)'), D_MATCH_TEMPLATE('M17', null, null, 'M17 (14 Oct) - BYE'),
  
  D_MATCH_TEMPLATE('M18', null, null, 'M18 (14 Oct)'), D_MATCH_TEMPLATE('M19', null, null, 'M19 (14 Oct)'),
  
  D_MATCH_TEMPLATE('M20', null, null, 'M20 (15 Oct)'), D_MATCH_TEMPLATE('M21', null, null, 'M21 (15 Oct)'),
  
  D_MATCH_TEMPLATE('M22', null, null, 'M22 (16 Oct) - GRAND FINAL'),
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
  (scores || []).forEach(s => { if(checkGameWin(s.a, s.b, pointsPerGame)) { if(s.a > s.b) gamesA++; else gamesB++; } });
  if (gamesA >= req) return 'A'; if (gamesB >= req) return 'B'; return null;
};

// --- CASCADE LOGICS ---
const cascadeSingles = (matches, byeId) => {
  let nm = [...(matches || [])];
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

const cascadeDoubles = (matches) => {
  let nm = [...(matches || [])];
  const w = (id) => nm.find(m=>m.id===id)?.winnerId || null;
  const l = (id) => { const m = nm.find(m=>m.id===id); return m && m.winnerId ? (m.winnerId === m.teamAId ? m.teamBId : m.teamAId) : null; };
  const set = (id, a, b) => { nm = nm.map(m => m.id === id ? { ...m, teamAId: a !== undefined ? a : m.teamAId, teamBId: b !== undefined ? b : m.teamBId } : m); };

  set('M07', w('M01'), w('M02'));
  set('M08', w('M03'), w('M04'));
  set('M09', w('M05'), w('M06'));

  set('M10', l('M01'), l('M02'));
  set('M11', l('M03'), l('M04'));
  set('M12', l('M05'), l('M06'));

  set('M13', l('M07'), w('M10'));
  set('M14', l('M08'), w('M11'));
  set('M15', l('M09'), w('M12'));

  set('M16', w('M13'), w('M14'));
  set('M17', w('M15'), null);
  set('M18', w('M16'), w('M17') || w('M15'));
  set('M19', null, w('M18')); 
  
  set('M22', w('M20'), w('M21')); 
  return nm;
};

const tournamentReducer = (state, action) => {
  switch (action.type) {
    case 'LOAD': {
      const incoming = action.payload || {};
      const mergedSinglesMatches = incoming.singlesMatches || state.singlesMatches || INITIAL_SINGLES_MATCHES;
      
      let mergedMatches = incoming.matches || INITIAL_MATCHES;
      // Smart check: If cloud data has old 'm1' format instead of 'M01', upgrade it automatically
      const isOldFormat = mergedMatches.some(m => m.id === 'ko_qf1' || m.id === 'm1');
      if (isOldFormat) mergedMatches = INITIAL_MATCHES;

      return { 
        ...INITIAL_STATE, 
        ...incoming,
        settings: incoming.settings || DEFAULT_SETTINGS,
        teams: INITIAL_TEAMS, // Ensures new doubles teams are forced
        matches: mergedMatches, // Ensures M01-M22 format is forced
        singlesTeams: incoming.singlesTeams || INITIAL_SINGLES_PLAYERS, // RETAINS YOUR REAL SINGLES DATA!
        singlesMatches: mergedSinglesMatches // RETAINS YOUR COMPLETED MATCHES!
      };
    }
    case 'UPDATE_MATCH': {
      let newM = (state.matches || []).map(m => m.id === action.payload.id ? { ...m, ...action.payload.updates } : m);
      newM = cascadeDoubles(newM);
      return { ...state, matches: newM };
    }
    case 'ADD_CUSTOM_MATCH': {
      const newMatch = {
        id: `custom_d_${crypto.randomUUID()}`, isSingles: false, title: action.payload.title || 'Custom Match',
        teamAId: action.payload.teamAId || null, teamBId: action.payload.teamBId || null,
        status: 'upcoming', scores: [], winnerId: null
      };
      return { ...state, matches: [...(state.matches || []), newMatch] };
    }
    case 'UPDATE_SINGLES_MATCH': {
      let newSm = (state.singlesMatches || []).map(m => m.id === action.payload.id ? { ...m, ...action.payload.updates } : m);
      newSm = cascadeSingles(newSm, state.singlesByeId);
      return { ...state, singlesMatches: newSm };
    }
    case 'ADD_CUSTOM_SINGLES_MATCH': {
      const newMatch = {
        id: `custom_s_${crypto.randomUUID()}`, isSingles: true, title: action.payload.title || 'Custom Match',
        teamAId: action.payload.teamAId || null, teamBId: action.payload.teamBId || null,
        status: 'upcoming', scores: [], winnerId: null
      };
      return { ...state, singlesMatches: [...(state.singlesMatches || []), newMatch] };
    }
    case 'UPDATE_SINGLES_TEAM': {
      return { ...state, singlesTeams: (state.singlesTeams || []).map(t => t.id === action.payload.id ? action.payload : t) };
    }
    case 'SET_SINGLES_BYE': {
      let newSm = cascadeSingles((state.singlesMatches || []), action.payload);
      return { ...state, singlesByeId: action.payload, singlesMatches: newSm };
    }
    case 'UPDATE_TEAM': return { ...state, teams: (state.teams || []).map(t => t.id === action.payload.id ? action.payload : t) };
    case 'ADD_TEAM': return { ...state, teams: [...(state.teams || []), { id: crypto.randomUUID(), ...action.payload }] };
    case 'DELETE_TEAM': return { ...state, teams: (state.teams || []).filter(t => t.id !== action.payload) };
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
        {(state.singlesTeams || []).map(p => (
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
  const [editingSM, setEditingSM] = useState(null);
  const [addingMatch, setAddingMatch] = useState(false);
  const dialog = useDialog();
  const getS = (matchIds) => matchIds.map(id => (state.singlesMatches || []).find(m => m.id === id));
  
  const MatchBox = ({ match, indicatorColor }) => {
    if (!match) return null;
    const tA = (state.singlesTeams || []).find(t => t.id === match.teamAId);
    const tB = (state.singlesTeams || []).find(t => t.id === match.teamBId);
    return (
      <Card className={`relative w-72 border-slate-800/80 group ${indicatorColor ? `border-l-2 ${indicatorColor}` : ''}`}>
        <div className="flex justify-between items-center mb-3">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{match.title}</div>
          <div className="flex items-center gap-2 relative">
             <span className={`text-[9px] font-bold px-2 py-1 rounded uppercase tracking-wider ${match.status==='completed'?'bg-emerald-500/10 text-emerald-400':match.status==='live'?'bg-red-500/10 text-red-400':'bg-slate-800/50 text-slate-500'}`}>{match.status}</span>
             {isSuperAdmin && (
               <div className="absolute -right-2 -top-2 opacity-0 group-hover:opacity-100 flex gap-1 z-10">
                 {match.status !== 'upcoming' && <button onClick={(e) => { e.stopPropagation(); dialog.confirm("Reset Match?", "Clear scores?", () => dispatch({type: 'UPDATE_SINGLES_MATCH', payload: {id: match.id, updates: {status: 'upcoming', scores: [], winnerId: null, liveGame: null}}}), true); }} className="p-1 bg-red-900/40 text-red-400 hover:bg-red-900/60 rounded"><RotateCcw size={12}/></button>}
                 <button onClick={(e) => { e.stopPropagation(); setEditingSM(match); }} className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"><Edit2 size={12}/></button>
               </div>
             )}
          </div>
        </div>
        <div className="space-y-3">
          <div className={`flex justify-between items-center ${match.winnerId === match.teamAId ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>
            <span className="text-sm truncate pr-2">{tA?.player1 || 'TBD'} <span className="text-[10px] opacity-40 ml-1">({tA?.code||'-'})</span></span>
            {match.status === 'completed' && match.teamAId && <span className="text-sm font-bold">{(match.scores || []).filter(s=>s.a>s.b).length}</span>}
          </div>
          <div className="h-px bg-slate-800/50"></div>
          <div className={`flex justify-between items-center ${match.winnerId === match.teamBId ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>
            <span className="text-sm truncate pr-2">{tB?.player1 || 'TBD'} <span className="text-[10px] opacity-40 ml-1">({tB?.code||'-'})</span></span>
            {match.status === 'completed' && match.teamBId && <span className="text-sm font-bold">{(match.scores || []).filter(s=>s.b>s.a).length}</span>}
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
    const w7w = (state.singlesTeams || []).find(t => t.id === (state.singlesMatches || []).find(m=>m.id==='W7')?.winnerId);
    const w8w = (state.singlesTeams || []).find(t => t.id === (state.singlesMatches || []).find(m=>m.id==='W8')?.winnerId);
    const w9w = (state.singlesTeams || []).find(t => t.id === (state.singlesMatches || []).find(m=>m.id==='W9')?.winnerId);
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
              {[w7w, w8w, w9w].filter(Boolean).map(t => (
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

  const customMatches = (state.singlesMatches || []).filter(m => m.id && m.id.startsWith('custom_'));

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white uppercase tracking-wider">VCT Bracket</h2>
          <p className="text-slate-500 text-sm mt-1">Singles Double-Elimination</p>
        </div>
        {isSuperAdmin && <Button onClick={() => setAddingMatch(true)} icon={Plus}>Add Custom Match</Button>}
      </div>
      <div className="flex gap-2 bg-[#0a0a0a] border border-slate-800 p-1 rounded-lg w-fit mb-6 overflow-x-auto">
        {[{id: 'winner', l: '🟢 Winner Side', c: 'text-emerald-400'}, {id: 'loser', l: '🟠 Loser Side', c: 'text-orange-400'}, {id: 'finals', l: '🟣 Final Stages', c: 'text-purple-400'}, ...(customMatches.length > 0 ? [{id: 'custom', l: '🟡 Custom', c: 'text-yellow-400'}] : [])].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 rounded-md font-bold text-xs tracking-widest uppercase whitespace-nowrap transition-all ${tab === t.id ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}><span className={tab===t.id?t.c:''}>{t.l}</span></button>
        ))}
      </div>
      <div className="overflow-x-auto pb-12">
        <div className="min-w-max flex gap-8">
          {tab === 'winner' && (
            <><div className="flex flex-col gap-4"><div className="text-[10px] font-bold text-emerald-500 tracking-widest uppercase mb-2">Round 1 (24 Players)</div>{getS(['M1','M2','M3','M4','M5','M6','M7','M8','M9','M10','M11','M12']).filter(Boolean).map(m => <MatchBox key={m?.id || Math.random()} match={m} indicatorColor="border-l-emerald-500" />)}</div>
              <div className="flex flex-col justify-around gap-4"><div className="text-[10px] font-bold text-emerald-500 tracking-widest uppercase mb-2">Winner Side R1</div>{getS(['W1','W2','W3','W4','W5','W6']).filter(Boolean).map(m => <MatchBox key={m?.id || Math.random()} match={m} indicatorColor="border-l-emerald-500" />)}</div>
              <div className="flex flex-col justify-around gap-4"><div className="text-[10px] font-bold text-emerald-500 tracking-widest uppercase mb-2">Winner Side R2 (Final 6)</div>{getS(['W7','W8','W9']).filter(Boolean).map(m => <MatchBox key={m?.id || Math.random()} match={m} indicatorColor="border-l-emerald-500" />)}</div></>
          )}
          {tab === 'loser' && (
            <><div className="flex flex-col gap-4"><div className="text-[10px] font-bold text-orange-500 tracking-widest uppercase mb-2">Loser Side R1</div>{getS(['L1','L2','L3','L4','L5','L6']).filter(Boolean).map(m => <MatchBox key={m?.id || Math.random()} match={m} indicatorColor="border-l-orange-500" />)}</div>
              <div className="flex flex-col justify-around gap-4"><div className="text-[10px] font-bold text-orange-500 tracking-widest uppercase mb-2">Lower Merge</div>{getS(['L7','L8','L9','L10','L11','L12']).filter(Boolean).map(m => <MatchBox key={m?.id || Math.random()} match={m} indicatorColor="border-l-orange-500" />)}</div>
              <div className="flex flex-col justify-around gap-4"><div className="text-[10px] font-bold text-orange-500 tracking-widest uppercase mb-2">Lower Side R3</div>{getS(['L13','L14','L15']).filter(Boolean).map(m => <MatchBox key={m?.id || Math.random()} match={m} indicatorColor="border-l-orange-500" />)}</div></>
          )}
          {tab === 'finals' && (
            <div className="w-full flex flex-col gap-8 items-start"><ByePanel />
              <div className="flex gap-12 items-center w-full">
                <div className="flex flex-col gap-12">
                   <div><div className="text-[10px] font-bold text-yellow-500 tracking-widest uppercase mb-2">Final Winner Stage</div>{getS(['W10']).filter(Boolean).map(m => <MatchBox key={m?.id || Math.random()} match={m} indicatorColor="border-l-yellow-500" />)}</div>
                   <div className="flex flex-col gap-4"><div className="text-[10px] font-bold text-red-500 tracking-widest uppercase mb-2">Loser Pool</div>{getS(['L16','L17']).filter(Boolean).map(m => <MatchBox key={m?.id || Math.random()} match={m} indicatorColor="border-l-red-500" />)}</div>
                </div>
                <div className="flex flex-col gap-12 justify-center h-full border-l border-slate-800/50 pl-12 relative"><div className="text-[10px] font-bold text-purple-500 tracking-widest uppercase mb-2 absolute top-0 -mt-6">Semifinals</div>{getS(['SF1','SF2']).filter(Boolean).map(m => <MatchBox key={m?.id || Math.random()} match={m} indicatorColor="border-l-purple-500" />)}</div>
                <div className="flex flex-col items-center justify-center h-full border-l border-slate-800/50 pl-12 relative"><Trophy className="text-yellow-500 mb-4 scale-150 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]"/><div className="text-[10px] font-bold text-yellow-500 tracking-widest uppercase mb-2 absolute -top-6">Grand Final</div>
                   {getS(['GF']).filter(Boolean).map(m => <MatchBox key={m?.id || Math.random()} match={m} indicatorColor="border-l-yellow-500" />)}
                   {getS(['GF'])[0]?.winnerId && ( <div className="mt-8 text-center animate-in fade-in zoom-in"><div className="text-yellow-400 font-black text-xl uppercase tracking-widest">Singles Champion</div><div className="text-white font-bold text-lg mt-1">{(state.singlesTeams || []).find(t=>t.id===getS(['GF'])[0].winnerId)?.player1}</div></div> )}
                </div>
              </div>
            </div>
          )}
          {tab === 'custom' && (
            <div className="flex flex-col gap-4">
              <div className="text-[10px] font-bold text-yellow-500 tracking-widest uppercase mb-2">Custom Matches</div>
              {customMatches.map(m => <MatchBox key={m?.id || Math.random()} match={m} indicatorColor="border-l-yellow-500" />)}
            </div>
          )}
        </div>
      </div>
      
      {isSuperAdmin && editingSM && (
        <Modal isOpen={true} onClose={() => setEditingSM(null)} title={`Edit Match Details`}>
          <form onSubmit={(e)=>{
            e.preventDefault(); const fd = new FormData(e.target);
            dispatch({type: 'UPDATE_SINGLES_MATCH', payload: {id: editingSM.id, updates: {title: fd.get('title'), teamAId: fd.get('teamAId')||null, teamBId: fd.get('teamBId')||null}}});
            setEditingSM(null);
          }} className="space-y-4">
             <div>
               <label className="block text-xs font-bold text-slate-500 mb-1">Match Title / Date</label>
               <input name="title" defaultValue={editingSM.title} required className="w-full bg-[#050505] border border-slate-800 rounded-lg px-4 py-2 text-white" />
             </div>
             <div>
               <label className="block text-xs font-bold text-slate-500 mb-1">Player 1</label>
               <select name="teamAId" defaultValue={editingSM.teamAId||''} className="w-full bg-[#050505] border border-slate-800 rounded-lg px-4 py-2 text-white"><option value="">TBD</option>{(state.singlesTeams || []).map(t=><option key={t.id} value={t.id}>{t.code} - {t.player1}</option>)}</select>
             </div>
             <div>
               <label className="block text-xs font-bold text-slate-500 mb-1">Player 2</label>
               <select name="teamBId" defaultValue={editingSM.teamBId||''} className="w-full bg-[#050505] border border-slate-800 rounded-lg px-4 py-2 text-white"><option value="">TBD</option>{(state.singlesTeams || []).map(t=><option key={t.id} value={t.id}>{t.code} - {t.player1}</option>)}</select>
             </div>
             <Button type="submit" className="w-full mt-4">Save Match</Button>
          </form>
        </Modal>
      )}

      {isSuperAdmin && addingMatch && (
        <Modal isOpen={true} onClose={() => setAddingMatch(false)} title="Create Custom Singles Match">
          <form onSubmit={(e)=>{
            e.preventDefault(); const fd = new FormData(e.target);
            dispatch({type: 'ADD_CUSTOM_SINGLES_MATCH', payload: {title: fd.get('title'), teamAId: fd.get('teamAId')||null, teamBId: fd.get('teamBId')||null}});
            setAddingMatch(false); setTab('custom');
          }} className="space-y-4">
             <div><label className="block text-xs font-bold text-slate-500 mb-1">Match Title</label><input name="title" placeholder="e.g., Special Exhibition (17 Oct)" required className="w-full bg-[#050505] border border-slate-800 rounded-lg px-4 py-2 text-white" /></div>
             <div><label className="block text-xs font-bold text-slate-500 mb-1">Player 1</label><select name="teamAId" className="w-full bg-[#050505] border border-slate-800 rounded-lg px-4 py-2 text-white"><option value="">TBD</option>{(state.singlesTeams || []).map(t=><option key={t.id} value={t.id}>{t.code} - {t.player1}</option>)}</select></div>
             <div><label className="block text-xs font-bold text-slate-500 mb-1">Player 2</label><select name="teamBId" className="w-full bg-[#050505] border border-slate-800 rounded-lg px-4 py-2 text-white"><option value="">TBD</option>{(state.singlesTeams || []).map(t=><option key={t.id} value={t.id}>{t.code} - {t.player1}</option>)}</select></div>
             <Button type="submit" className="w-full mt-4">Create Match</Button>
          </form>
        </Modal>
      )}
    </div>
  );
};

// --- NEW DOUBLES SPREADSHEET BRACKET ---
const DoublesBracket = ({ onNavigate }) => {
  const { state, dispatch, isAdmin, isSuperAdmin } = useContext(TournamentContext);
  const [tab, setTab] = useState('winner');
  const [editingDM, setEditingDM] = useState(null);
  const [addingMatch, setAddingMatch] = useState(false);
  const dialog = useDialog();
  const getD = (matchIds) => matchIds.map(id => (state.matches || []).find(m => m.id === id));
  
  const MatchBox = ({ match, indicatorColor }) => {
    if (!match) return null;
    const tA = (state.teams || []).find(t => t.id === match.teamAId);
    const tB = (state.teams || []).find(t => t.id === match.teamBId);
    return (
      <Card className={`relative w-72 border-slate-800/80 group ${indicatorColor ? `border-l-2 ${indicatorColor}` : ''}`}>
        <div className="flex justify-between items-center mb-3">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{match.title}</div>
          <div className="flex items-center gap-2 relative">
             <span className={`text-[9px] font-bold px-2 py-1 rounded uppercase tracking-wider ${match.status==='completed'?'bg-emerald-500/10 text-emerald-400':match.status==='live'?'bg-red-500/10 text-red-400':'bg-slate-800/50 text-slate-500'}`}>{match.status}</span>
             {isSuperAdmin && (
               <div className="absolute -right-2 -top-2 opacity-0 group-hover:opacity-100 flex gap-1 z-10">
                 {match.status !== 'upcoming' && <button onClick={(e) => { e.stopPropagation(); dialog.confirm("Reset Match?", "Clear scores?", () => dispatch({type: 'UPDATE_MATCH', payload: {id: match.id, updates: {status: 'upcoming', scores: [], winnerId: null, liveGame: null}}}), true); }} className="p-1 bg-red-900/40 text-red-400 hover:bg-red-900/60 rounded"><RotateCcw size={12}/></button>}
                 <button onClick={(e) => { e.stopPropagation(); setEditingDM(match); }} className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"><Edit2 size={12}/></button>
               </div>
             )}
          </div>
        </div>
        <div className="space-y-3">
          <div className={`flex justify-between items-center ${match.winnerId === match.teamAId ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>
            <span className="text-sm truncate pr-2">{tA ? `${tA.player1} & ${tA.player2}` : 'TBD'} <span className="text-[10px] opacity-40 ml-1">({tA?.code||'-'})</span></span>
            {match.status === 'completed' && match.teamAId && <span className="text-sm font-bold">{(match.scores || []).filter(s=>s.a>s.b).length}</span>}
          </div>
          <div className="h-px bg-slate-800/50"></div>
          <div className={`flex justify-between items-center ${match.winnerId === match.teamBId ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>
            <span className="text-sm truncate pr-2">{tB ? `${tB.player1} & ${tB.player2}` : 'TBD'} <span className="text-[10px] opacity-40 ml-1">({tB?.code||'-'})</span></span>
            {match.status === 'completed' && match.teamBId && <span className="text-sm font-bold">{(match.scores || []).filter(s=>s.b>s.a).length}</span>}
          </div>
        </div>
        {isAdmin && match.status !== 'completed' && match.teamAId && match.teamBId && (
          <div className="mt-4 pt-3 border-t border-slate-800/50">
            <Button className="w-full text-xs py-1.5" variant={match.status === 'live' ? 'primary' : 'secondary'} onClick={() => {
                if(match.status === 'upcoming') dispatch({ type: 'UPDATE_MATCH', payload: { id: match.id, updates: { status: 'live' } }});
                onNavigate('live_doubles', match.id);
            }}>{match.status === 'live' ? 'Resume Scoring' : 'Live Score'}</Button>
          </div>
        )}
      </Card>
    );
  };

  const customMatches = (state.matches || []).filter(m => m.id && m.id.startsWith('custom_d_'));

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white uppercase tracking-wider">Doubles VCT Bracket</h2>
          <p className="text-slate-500 text-sm mt-1">12-Team Double Elimination</p>
        </div>
        {isSuperAdmin && <Button onClick={() => setAddingMatch(true)} icon={Plus}>Add Custom Match</Button>}
      </div>
      <div className="flex gap-2 bg-[#0a0a0a] border border-slate-800 p-1 rounded-lg w-fit mb-6 overflow-x-auto">
        {[{id: 'winner', l: '🟢 Upper Bracket', c: 'text-emerald-400'}, {id: 'loser', l: '🟠 Lower Bracket', c: 'text-orange-400'}, {id: 'finals', l: '🟣 Semis & Finals', c: 'text-purple-400'}, ...(customMatches.length > 0 ? [{id: 'custom', l: '🟡 Custom', c: 'text-yellow-400'}] : [])].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 rounded-md font-bold text-xs tracking-widest uppercase whitespace-nowrap transition-all ${tab === t.id ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}><span className={tab===t.id?t.c:''}>{t.l}</span></button>
        ))}
      </div>
      <div className="overflow-x-auto pb-12">
        <div className="min-w-max flex gap-8">
          {tab === 'winner' && (
            <><div className="flex flex-col gap-4"><div className="text-[10px] font-bold text-emerald-500 tracking-widest uppercase mb-2">Round 1 (6 Matches)</div>{getD(['M01','M02','M03','M04','M05','M06']).filter(Boolean).map(m => <MatchBox key={m?.id || Math.random()} match={m} indicatorColor="border-l-emerald-500" />)}</div>
              <div className="flex flex-col justify-around gap-4"><div className="text-[10px] font-bold text-emerald-500 tracking-widest uppercase mb-2">Upper Bracket (3 Matches)</div>{getD(['M07','M08','M09']).filter(Boolean).map(m => <MatchBox key={m?.id || Math.random()} match={m} indicatorColor="border-l-emerald-500" />)}</div>
            </>
          )}
          {tab === 'loser' && (
            <><div className="flex flex-col gap-4"><div className="text-[10px] font-bold text-orange-500 tracking-widest uppercase mb-2">Lower Bracket (3 Matches)</div>{getD(['M10','M11','M12']).filter(Boolean).map(m => <MatchBox key={m?.id || Math.random()} match={m} indicatorColor="border-l-orange-500" />)}</div>
              <div className="flex flex-col justify-around gap-4"><div className="text-[10px] font-bold text-orange-500 tracking-widest uppercase mb-2">Lower Bracket R2</div>{getD(['M13','M14','M15']).filter(Boolean).map(m => <MatchBox key={m?.id || Math.random()} match={m} indicatorColor="border-l-orange-500" />)}</div>
              <div className="flex flex-col justify-around gap-4"><div className="text-[10px] font-bold text-orange-500 tracking-widest uppercase mb-2">Lower Bracket R3</div>{getD(['M16','M17']).filter(Boolean).map(m => <MatchBox key={m?.id || Math.random()} match={m} indicatorColor="border-l-orange-500" />)}</div>
            </>
          )}
          {tab === 'finals' && (
            <div className="w-full flex flex-col gap-8 items-start">
               <Card className="border-purple-500/20 bg-purple-500/5 mb-8 w-full max-w-4xl mx-auto">
                 <h3 className="text-purple-500 font-bold flex items-center gap-2 mb-2 uppercase tracking-widest text-sm"><Zap size={16}/> Admin Action Required</h3>
                 <p className="text-slate-400 text-sm">Please use the ✏️ Pencil icon to manually select the "Upper Bracket Finalist" and "Finalist" teams for M19, M20, and M21 as per the official format.</p>
               </Card>
              <div className="flex gap-12 items-center w-full">
                <div className="flex flex-col gap-12 justify-center h-full relative">
                  <div className="text-[10px] font-bold text-purple-500 tracking-widest uppercase mb-2 absolute top-0 -mt-6">Semifinal Qualifiers</div>
                  {getD(['M18', 'M19']).filter(Boolean).map(m => <MatchBox key={m?.id || Math.random()} match={m} indicatorColor="border-l-purple-500" />)}
                </div>
                <div className="flex flex-col gap-12 justify-center h-full relative border-l border-slate-800/50 pl-12">
                  <div className="text-[10px] font-bold text-purple-500 tracking-widest uppercase mb-2 absolute top-0 -mt-6">Semifinals</div>
                  {getD(['M20', 'M21']).filter(Boolean).map(m => <MatchBox key={m?.id || Math.random()} match={m} indicatorColor="border-l-purple-500" />)}
                </div>
                <div className="flex flex-col items-center justify-center h-full border-l border-slate-800/50 pl-12 relative">
                  <Trophy className="text-yellow-500 mb-4 scale-150 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]"/>
                  <div className="text-[10px] font-bold text-yellow-500 tracking-widest uppercase mb-2 absolute -top-6">Grand Final</div>
                  {getD(['M22']).filter(Boolean).map(m => <MatchBox key={m?.id || Math.random()} match={m} indicatorColor="border-l-yellow-500" />)}
                   {getD(['M22'])[0]?.winnerId && ( <div className="mt-8 text-center animate-in fade-in zoom-in"><div className="text-yellow-400 font-black text-xl uppercase tracking-widest">Doubles Champion</div><div className="text-white font-bold text-lg mt-1">{(state.teams || []).find(t=>t.id===getD(['M22'])[0].winnerId)?.player1} & {(state.teams || []).find(t=>t.id===getD(['M22'])[0].winnerId)?.player2}</div></div> )}
                </div>
              </div>
            </div>
          )}
          {tab === 'custom' && (
            <div className="flex flex-col gap-4">
              <div className="text-[10px] font-bold text-yellow-500 tracking-widest uppercase mb-2">Custom Matches</div>
              {customMatches.map(m => <MatchBox key={m?.id || Math.random()} match={m} indicatorColor="border-l-yellow-500" />)}
            </div>
          )}
        </div>
      </div>
      
      {isSuperAdmin && editingDM && (
        <Modal isOpen={true} onClose={() => setEditingDM(null)} title={`Edit Match Details`}>
          <form onSubmit={(e)=>{
            e.preventDefault(); const fd = new FormData(e.target);
            dispatch({type: 'UPDATE_MATCH', payload: {id: editingDM.id, updates: {title: fd.get('title'), teamAId: fd.get('teamAId')||null, teamBId: fd.get('teamBId')||null}}});
            setEditingDM(null);
          }} className="space-y-4">
             <div>
               <label className="block text-xs font-bold text-slate-500 mb-1">Match Title / Date</label>
               <input name="title" defaultValue={editingDM.title} required className="w-full bg-[#050505] border border-slate-800 rounded-lg px-4 py-2 text-white" />
             </div>
             <div>
               <label className="block text-xs font-bold text-slate-500 mb-1">Team 1</label>
               <select name="teamAId" defaultValue={editingDM.teamAId||''} className="w-full bg-[#050505] border border-slate-800 rounded-lg px-4 py-2 text-white"><option value="">TBD</option>{(state.teams || []).map(t=><option key={t.id} value={t.id}>{t.code} - {t.player1} & {t.player2}</option>)}</select>
             </div>
             <div>
               <label className="block text-xs font-bold text-slate-500 mb-1">Team 2</label>
               <select name="teamBId" defaultValue={editingDM.teamBId||''} className="w-full bg-[#050505] border border-slate-800 rounded-lg px-4 py-2 text-white"><option value="">TBD</option>{(state.teams || []).map(t=><option key={t.id} value={t.id}>{t.code} - {t.player1} & {t.player2}</option>)}</select>
             </div>
             <Button type="submit" className="w-full mt-4">Save Match</Button>
          </form>
        </Modal>
      )}

      {isSuperAdmin && addingMatch && (
        <Modal isOpen={true} onClose={() => setAddingMatch(false)} title="Create Custom Doubles Match">
          <form onSubmit={(e)=>{
            e.preventDefault(); const fd = new FormData(e.target);
            dispatch({type: 'ADD_CUSTOM_MATCH', payload: {title: fd.get('title'), teamAId: fd.get('teamAId')||null, teamBId: fd.get('teamBId')||null}});
            setAddingMatch(false); setTab('custom');
          }} className="space-y-4">
             <div><label className="block text-xs font-bold text-slate-500 mb-1">Match Title</label><input name="title" placeholder="e.g., Consolation Match" required className="w-full bg-[#050505] border border-slate-800 rounded-lg px-4 py-2 text-white" /></div>
             <div><label className="block text-xs font-bold text-slate-500 mb-1">Team 1</label><select name="teamAId" className="w-full bg-[#050505] border border-slate-800 rounded-lg px-4 py-2 text-white"><option value="">TBD</option>{(state.teams || []).map(t=><option key={t.id} value={t.id}>{t.code} - {t.player1} & {t.player2}</option>)}</select></div>
             <div><label className="block text-xs font-bold text-slate-500 mb-1">Team 2</label><select name="teamBId" className="w-full bg-[#050505] border border-slate-800 rounded-lg px-4 py-2 text-white"><option value="">TBD</option>{(state.teams || []).map(t=><option key={t.id} value={t.id}>{t.code} - {t.player1} & {t.player2}</option>)}</select></div>
             <Button type="submit" className="w-full mt-4">Create Match</Button>
          </form>
        </Modal>
      )}
    </div>
  );
};

const LiveScoring = ({ matchId, isSingles, onBack }) => {
  const { state, dispatch } = useContext(TournamentContext);
  const match = isSingles ? (state.singlesMatches || []).find(m => m.id === matchId) : (state.matches || []).find(m => m.id === matchId);
  const teamA = isSingles ? (state.singlesTeams || []).find(t => t.id === match?.teamAId) : (state.teams || []).find(t => t.id === match?.teamAId);
  const teamB = isSingles ? (state.singlesTeams || []).find(t => t.id === match?.teamBId) : (state.teams || []).find(t => t.id === match?.teamBId);

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
        <h2 className="text-2xl font-bold text-white flex-1">{match.title} | Live Scoring</h2>
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
  const m = isSingles ? (state.singlesMatches || []) : (state.matches || []);
  const teamsList = isSingles ? (state.singlesTeams || []) : (state.teams || []);
  const total = m.length;
  const completed = m.filter(x => x && x.status === 'completed').length;
  const live = m.filter(x => x && x.status === 'live');
  
  const todaysMatches = m.filter(match => match && match.title && (match.title.includes('6 Oct') || match.title.includes('06 Oct')) && match.status !== 'live');
  
  return (
    <div className="space-y-6 animate-in fade-in">
      <header className="mb-8"><h1 className="text-3xl font-black text-white tracking-tight uppercase">{state.settings?.tournamentName || "SMASHFEST '26"}</h1><p className="text-slate-500 mt-1">Overview • {isSingles ? 'Singles VCT' : 'Doubles VCT'}</p></header>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="flex flex-col items-center text-center p-4"><Users className="text-blue-500 mb-3" size={24} /><span className="text-3xl font-black text-white">{teamsList.length}</span><span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">{isSingles ? 'Players' : 'Teams'}</span></Card>
        <Card className="flex flex-col items-center text-center p-4"><CalendarDays className="text-purple-500 mb-3" size={24} /><span className="text-3xl font-black text-white">{total}</span><span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">Total Matches</span></Card>
        <Card className="flex flex-col items-center text-center p-4 border-emerald-500/20 bg-emerald-500/5"><CheckCircle2 className="text-emerald-500 mb-3" size={24} /><span className="text-3xl font-black text-white">{completed}</span><span className="text-[10px] text-emerald-500/70 uppercase tracking-widest font-bold mt-1">Completed</span></Card>
        <Card className="flex flex-col items-center text-center p-4 border-yellow-500/20 bg-yellow-500/5">
           <Activity className={`text-yellow-500 mb-3 ${live.length > 0 ? 'animate-pulse drop-shadow-[0_0_10px_rgba(234,179,8,0.8)]' : ''}`} size={24} />
           <span className="text-3xl font-black text-white">{live.length}</span><span className="text-[10px] text-yellow-500/70 uppercase tracking-widest font-bold mt-1">Live Now</span>
        </Card>
      </div>
      
      {live.length > 0 && (
         <div className="mt-8 animate-in fade-in slide-in-from-bottom-4">
            <h3 className="text-sm font-bold text-red-500 uppercase tracking-widest mb-4 flex items-center gap-2"><Activity size={16}/> Active Live Match</h3>
            <div className="grid md:grid-cols-2 gap-4">
               {live.map(match => {
                  const tA = isSingles ? (state.singlesTeams || []).find(t=>t.id===match.teamAId) : (state.teams || []).find(t=>t.id===match.teamAId);
                  const tB = isSingles ? (state.singlesTeams || []).find(t=>t.id===match.teamBId) : (state.teams || []).find(t=>t.id===match.teamBId);
                  let currentGameScore = match.liveGame || {a:0, b:0};
                  let setsA = (match.scores || []).filter(s => checkGameWin(s.a, s.b, state.settings?.pointsPerGame || 11) && s.a > s.b).length;
                  let setsB = (match.scores || []).filter(s => checkGameWin(s.a, s.b, state.settings?.pointsPerGame || 11) && s.b > s.a).length;
                  
                  return (
                     <Card key={match?.id || Math.random()} className="border-red-500/50 bg-gradient-to-br from-[#1a0505] to-[#0a0000] shadow-[0_0_20px_rgba(239,68,68,0.15)]">
                        <div className="flex justify-between items-center mb-4 pb-3 border-b border-red-900/50">
                           <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">{match.title}</span>
                           <span className="text-[9px] font-bold px-2 py-1 rounded bg-red-500 text-white uppercase tracking-widest animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]">LIVE NOW</span>
                        </div>
                        <div className="space-y-4">
                           <div className="flex justify-between items-center">
                              <div className="flex gap-3 items-center">
                                 <span className="w-8 h-8 rounded-full bg-red-950 flex items-center justify-center text-xs font-black text-red-400 border border-red-900/50">{tA?.code}</span>
                                 <div><div className="text-sm font-bold text-white">{tA?.player1}</div>{!isSingles && <div className="text-xs text-red-200/50">{tA?.player2}</div>}</div>
                              </div>
                              <div className="flex items-center gap-4">
                                 <div className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">S: {setsA}</div>
                                 <div className="text-3xl font-black text-white w-12 text-right">{currentGameScore?.a || 0}</div>
                              </div>
                           </div>
                           <div className="flex justify-between items-center">
                              <div className="flex gap-3 items-center">
                                 <span className="w-8 h-8 rounded-full bg-red-950 flex items-center justify-center text-xs font-black text-red-400 border border-red-900/50">{tB?.code}</span>
                                 <div><div className="text-sm font-bold text-white">{tB?.player1}</div>{!isSingles && <div className="text-xs text-red-200/50">{tB?.player2}</div>}</div>
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

      {todaysMatches.length > 0 && (
        <div className="mt-8">
           <h3 className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-4 flex items-center gap-2"><CalendarDays size={16}/> Today's Schedule (Oct 6)</h3>
           <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
             {todaysMatches.map(match => {
               const tA = isSingles ? (state.singlesTeams || []).find(t=>t.id===match.teamAId) : (state.teams || []).find(t=>t.id===match.teamAId);
               const tB = isSingles ? (state.singlesTeams || []).find(t=>t.id===match.teamBId) : (state.teams || []).find(t=>t.id===match.teamBId);
               return (
                 <Card key={match?.id || Math.random()} className={`border-l-4 ${match.status === 'completed' ? 'border-l-emerald-500' : 'border-l-blue-500'}`}>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{match.title}</span>
                      <span className={`text-[9px] font-bold px-2 py-1 rounded uppercase tracking-wider ${match.status==='completed'?'bg-emerald-500/10 text-emerald-400':'bg-slate-800/50 text-slate-500'}`}>{match.status}</span>
                    </div>
                    <div className="space-y-2">
                       <div className={`text-sm ${match.winnerId === match.teamAId ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>{tA ? (isSingles ? tA.player1 : `${tA.player1} & ${tA.player2}`) : 'TBD'}</div>
                       <div className="text-[10px] text-slate-600 font-black tracking-widest uppercase">VS</div>
                       <div className={`text-sm ${match.winnerId === match.teamBId ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>{tB ? (isSingles ? tB.player1 : `${tB.player1} & ${tB.player2}`) : 'TBD'}</div>
                    </div>
                 </Card>
               );
             })}
           </div>
        </div>
      )}
    </div>
  );
};

const PointsTable = ({ mode }) => {
  const { state } = useContext(TournamentContext);
  const isSingles = mode === 'SINGLES';
  const teams = isSingles ? (state.singlesTeams || []) : (state.teams || []);
  const matches = isSingles ? (state.singlesMatches || []) : (state.matches || []);

  const standings = useMemo(() => {
    const stats = teams.reduce((acc, t) => {
      acc[t.id] = { ...t, MP: 0, W: 0, L: 0, SW: 0, SL: 0, PTS: 0 };
      return acc;
    }, {});

    matches.forEach(m => {
      if (m.status === 'completed' && m.teamAId && m.teamBId) {
        const a = m.teamAId; const b = m.teamBId;
        if(!stats[a] || !stats[b]) return;
        stats[a].MP++; stats[b].MP++;
        let sa = 0, sb = 0;
        (m.scores || []).forEach(s => { if(s.a > s.b) sa++; else if(s.b > s.a) sb++; });
        stats[a].SW += sa; stats[a].SL += sb;
        stats[b].SW += sb; stats[b].SL += sa;

        if (m.winnerId === a) { stats[a].W++; stats[b].L++; stats[a].PTS += 2; }
        else if (m.winnerId === b) { stats[b].W++; stats[a].L++; stats[b].PTS += 2; }
      }
    });

    return Object.values(stats).sort((a, b) => {
      if (b.PTS !== a.PTS) return b.PTS - a.PTS;
      if (b.W !== a.W) return b.W - a.W;
      return (b.SW - b.SL) - (a.SW - a.SL);
    });
  }, [teams, matches]);

  return (
    <div className="space-y-6 animate-in fade-in">
      <div>
        <h2 className="text-2xl font-bold text-white uppercase tracking-wider">Points Table</h2>
        <p className="text-slate-500 text-sm mt-1">{isSingles ? 'Singles Standings' : 'Doubles Standings'}</p>
      </div>
      <Card className="overflow-x-auto p-0 border-slate-800/80">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#050505] text-[10px] uppercase tracking-widest text-slate-500 border-b border-slate-800/80">
              <th className="p-4 font-semibold w-12 text-center">Rank</th>
              <th className="p-4 font-semibold">{isSingles ? 'Player' : 'Team'}</th>
              <th className="p-4 font-semibold text-center hidden md:table-cell">Played</th>
              <th className="p-4 font-semibold text-center text-emerald-500">W</th>
              <th className="p-4 font-semibold text-center text-red-500">L</th>
              <th className="p-4 font-semibold text-center hidden md:table-cell">Sets (W-L)</th>
              <th className="p-4 font-semibold text-center text-yellow-500 text-lg">PTS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {standings.map((team, idx) => (
              <tr key={team.id} className="transition-colors hover:bg-slate-800/30">
                <td className="p-4 text-center">
                  {idx === 0 ? <span className="inline-flex w-6 h-6 items-center justify-center bg-yellow-500/20 text-yellow-500 rounded-full font-bold text-xs">1</span> :
                   idx === 1 ? <span className="inline-flex w-6 h-6 items-center justify-center bg-slate-300/20 text-slate-300 rounded-full font-bold text-xs">2</span> :
                   idx === 2 ? <span className="inline-flex w-6 h-6 items-center justify-center bg-orange-500/20 text-orange-400 rounded-full font-bold text-xs">3</span> :
                   <span className="text-slate-600 font-bold">{idx + 1}</span>}
                </td>
                <td className="p-4">
                  <div className="font-bold text-white text-sm">{team.code}</div>
                  <div className="text-[11px] text-slate-500 whitespace-nowrap">{isSingles ? team.player1 : `${team.player1} & ${team.player2}`}</div>
                </td>
                <td className="p-4 text-center text-slate-400 hidden md:table-cell">{team.MP}</td>
                <td className="p-4 text-center text-emerald-500 font-bold">{team.W}</td>
                <td className="p-4 text-center text-red-500 font-bold">{team.L}</td>
                <td className="p-4 text-center text-slate-400 text-xs hidden md:table-cell">{team.SW} - {team.SL}</td>
                <td className="p-4 text-center font-black text-white text-xl">{team.PTS}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
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

const AppLayout = () => {
  const { isAdmin, setIsAdmin, isSuperAdmin, setIsSuperAdmin } = useContext(TournamentContext);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeMatchId, setActiveMatchId] = useState(null); 
  const [showLogin, setShowLogin] = useState(false);
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('DOUBLES');
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
    { label: 'DOUBLES', items: [{ id: 'teams', i: Users, l: 'Teams (12)' }, { id: 'd_bracket', i: Swords, l: 'VCT Bracket' }, { id: 'points', i: Medal, l: 'Points Table' }] },
    { label: 'SYSTEM', items: [{ id: 'history', i: History, l: 'Hall of Fame' }, ...(isAdmin ? [{ id: 'settings', i: SettingsIcon, l: 'Settings' }] : [])] }
  ] : [
    { label: 'MAIN', items: [{ id: 'dashboard', i: LayoutDashboard, l: 'Dashboard' }] },
    { label: 'SINGLES', items: [{ id: 's_players', i: User, l: 'Players (24)' }, { id: 's_bracket', i: Swords, l: 'VCT Bracket' }, { id: 'points', i: Medal, l: 'Points Table' }] },
    { label: 'SYSTEM', items: [{ id: 'history', i: History, l: 'Hall of Fame' }, ...(isAdmin ? [{ id: 'settings', i: SettingsIcon, l: 'Settings' }] : [])] }
  ];

  return (
    <div className="flex h-screen bg-[#050505] text-slate-300 font-sans selection:bg-emerald-500/30">
      <SyncBadge />
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-800/80 bg-[#020202]">
        <div className="p-6 pb-2"><div className="flex items-center gap-3 text-white font-black text-xl tracking-tighter"><Shield className="text-red-600" size={24}/>SMASHFEST <span className="text-red-600">'26</span></div></div>
        
        <div className="px-6 mb-8 mt-4">
          <div className="flex items-center bg-[#0a0a0a] rounded-lg p-1 border border-slate-800 shadow-inner">
            <button onClick={() => { setMode('SINGLES'); handleNav('dashboard'); }} className={`flex-1 py-1.5 text-[11px] font-black tracking-widest uppercase rounded-md transition-all duration-300 ${mode === 'SINGLES' ? 'bg-white text-black shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>Singles</button>
            <button onClick={() => { setMode('DOUBLES'); handleNav('dashboard'); }} className={`flex-1 py-1.5 text-[11px] font-black tracking-widest uppercase rounded-md transition-all duration-300 ${mode === 'DOUBLES' ? 'bg-white text-black shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>Doubles</button>
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
          {activeTab === 'dashboard' && <Dashboard mode={mode} />}
          {activeTab === 's_players' && <SinglesPlayers />}
          {activeTab === 's_bracket' && <SinglesBracket onNavigate={handleNav} />}
          {activeTab === 'live_singles' && isAdmin && <LiveScoring matchId={activeMatchId} isSingles={true} onBack={() => handleNav('s_bracket')} />}
          
          {activeTab === 'teams' && <Teams />}
          {activeTab === 'd_bracket' && <DoublesBracket onNavigate={handleNav} />}
          {activeTab === 'live_doubles' && isAdmin && <LiveScoring matchId={activeMatchId} isSingles={false} onBack={() => handleNav('d_bracket')} />}
          
          {activeTab === 'points' && <PointsTable mode={mode} />}
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
