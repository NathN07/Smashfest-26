import React, { createContext, useReducer, useContext, useEffect, useState, useMemo } from 'react';
import { 
  Trophy, Users, CalendarDays, LayoutDashboard, SettingsIcon, 
  Play, CheckCircle2, ChevronRight, X, Plus, Edit2, Shield,
  Swords, Activity, Trash2, RotateCcw, AlertTriangle, ArrowRight,
  UploadCloud, Medal, History, Check, Save, Zap
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query } from 'firebase/firestore';

const appId = typeof __app_id !== 'undefined' ? __app_id : 'smashfest-local-deploy';
const firebaseConfigStr = typeof __firebase_config !== 'undefined' ? __firebase_config : null;
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Storage key changed to auto-reset old data and load the exact requested setup
const LOCAL_STORAGE_KEY = 'smashfest_state_v3'; 

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

// Pre-loaded Teams matching exactly with the user's spreadsheet image
const INITIAL_TEAMS = [
  { id: 't1', code: 'A1', player1: 'Utpal', player2: 'Pardeep', group: 'A', seed: 1 },
  { id: 't2', code: 'A2', player1: 'Madhwan', player2: 'Utkarsh', group: 'A', seed: 2 },
  { id: 't3', code: 'A3', player1: 'Vishal', player2: 'Vineet', group: 'A', seed: 3 },
  { id: 't4', code: 'A4', player1: 'Vishwash', player2: 'Himanshu', group: 'A', seed: 4 },
  { id: 't5', code: 'A6', player1: 'Fazlu', player2: 'Chetan', group: 'A', seed: 5 },
  
  { id: 't6', code: 'B1', player1: 'Omm', player2: 'Shivam', group: 'B', seed: 1 },
  { id: 't7', code: 'B2', player1: 'Himanshu', player2: 'Ansh', group: 'B', seed: 2 },
  { id: 't8', code: 'B3', player1: 'Abhitesh', player2: 'Devansh', group: 'B', seed: 3 },
  { id: 't9', code: 'B4', player1: 'Om', player2: 'Eklavya', group: 'B', seed: 4 },
  { id: 't10', code: 'B6', player1: 'Nishant', player2: 'Taqi', group: 'B', seed: 5 },
];

const DEFAULT_SETTINGS = {
  tournamentName: "SMASHFEST '26",
  pointsWin: 2, pointsLoss: 0, bestOf: 3, pointsPerGame: 11, tables: 2,
};

// Pre-loaded Matches (Day 1 & Day 2 matched exactly to image, plus remaining RR and pre-built Knockouts)
const INITIAL_MATCHES = [
  // DAY 1 (10/06/2026)
  { id: 'm1', groupId: 'B', round: 'Day 01', teamAId: 't6', teamBId: 't7', status: 'upcoming', scores: [], winnerId: null, table: 'Table 1', date: '10/06/2026', time: '10:00' },
  { id: 'm2', groupId: 'B', round: 'Day 01', teamAId: 't8', teamBId: 't9', status: 'upcoming', scores: [], winnerId: null, table: 'Table 2', date: '10/06/2026', time: '10:30' },
  { id: 'm3', groupId: 'A', round: 'Day 01', teamAId: 't2', teamBId: 't3', status: 'upcoming', scores: [], winnerId: null, table: 'Table 1', date: '10/06/2026', time: '11:00' },
  { id: 'm4', groupId: 'A', round: 'Day 01', teamAId: 't1', teamBId: 't4', status: 'upcoming', scores: [], winnerId: null, table: 'Table 2', date: '10/06/2026', time: '11:30' },
  
  // DAY 2 (10/07/2026)
  { id: 'm5', groupId: 'B', round: 'Day 02', teamAId: 't6', teamBId: 't8', status: 'upcoming', scores: [], winnerId: null, table: 'Table 1', date: '10/07/2026', time: '10:00' },
  { id: 'm6', groupId: 'B', round: 'Day 02', teamAId: 't9', teamBId: 't10', status: 'upcoming', scores: [], winnerId: null, table: 'Table 2', date: '10/07/2026', time: '10:30' },
  { id: 'm7', groupId: 'A', round: 'Day 02', teamAId: 't2', teamBId: 't5', status: 'upcoming', scores: [], winnerId: null, table: 'Table 1', date: '10/07/2026', time: '11:00' },
  { id: 'm8', groupId: 'A', round: 'Day 02', teamAId: 't3', teamBId: 't4', status: 'upcoming', scores: [], winnerId: null, table: 'Table 2', date: '10/07/2026', time: '11:30' },

  // Remaining Round Robin
  { id: 'm9', groupId: 'A', round: 'Day 03', teamAId: 't1', teamBId: 't5', status: 'upcoming', scores: [], winnerId: null, table: 'Table 1', date: '10/08/2026', time: '10:00' },
  { id: 'm10', groupId: 'A', round: 'Day 03', teamAId: 't1', teamBId: 't2', status: 'upcoming', scores: [], winnerId: null, table: 'Table 2', date: '10/08/2026', time: '10:30' },
  { id: 'm11', groupId: 'B', round: 'Day 03', teamAId: 't6', teamBId: 't10', status: 'upcoming', scores: [], winnerId: null, table: 'Table 1', date: '10/08/2026', time: '11:00' },
  { id: 'm12', groupId: 'B', round: 'Day 03', teamAId: 't7', teamBId: 't8', status: 'upcoming', scores: [], winnerId: null, table: 'Table 2', date: '10/08/2026', time: '11:30' },
  { id: 'm13', groupId: 'A', round: 'Day 04', teamAId: 't4', teamBId: 't5', status: 'upcoming', scores: [], winnerId: null, table: 'Table 1', date: '10/09/2026', time: '10:00' },
  { id: 'm14', groupId: 'A', round: 'Day 04', teamAId: 't1', teamBId: 't3', status: 'upcoming', scores: [], winnerId: null, table: 'Table 2', date: '10/09/2026', time: '10:30' },
  { id: 'm15', groupId: 'B', round: 'Day 04', teamAId: 't7', teamBId: 't9', status: 'upcoming', scores: [], winnerId: null, table: 'Table 1', date: '10/09/2026', time: '11:00' },
  { id: 'm16', groupId: 'B', round: 'Day 04', teamAId: 't7', teamBId: 't10', status: 'upcoming', scores: [], winnerId: null, table: 'Table 2', date: '10/09/2026', time: '11:30' },
  { id: 'm17', groupId: 'A', round: 'Day 05', teamAId: 't3', teamBId: 't5', status: 'upcoming', scores: [], winnerId: null, table: 'Table 1', date: '10/10/2026', time: '10:00' },
  { id: 'm18', groupId: 'A', round: 'Day 05', teamAId: 't2', teamBId: 't4', status: 'upcoming', scores: [], winnerId: null, table: 'Table 2', date: '10/10/2026', time: '10:30' },
  { id: 'm19', groupId: 'B', round: 'Day 05', teamAId: 't8', teamBId: 't10', status: 'upcoming', scores: [], winnerId: null, table: 'Table 1', date: '10/10/2026', time: '11:00' },
  { id: 'm20', groupId: 'B', round: 'Day 05', teamAId: 't6', teamBId: 't9', status: 'upcoming', scores: [], winnerId: null, table: 'Table 2', date: '10/10/2026', time: '11:30' },
  
  // PRE-BUILT KNOCKOUTS (Auto Progression Enabled)
  { id: 'ko_sf1', groupId: 'KO', round: 'Semi-Final', teamAId: null, teamBId: null, status: 'upcoming', scores: [], winnerId: null, table: 'Center Court', date: '', time: '' },
  { id: 'ko_sf2', groupId: 'KO', round: 'Semi-Final', teamAId: null, teamBId: null, status: 'upcoming', scores: [], winnerId: null, table: 'Center Court', date: '', time: '' },
  { id: 'ko_final', groupId: 'KO', round: 'Grand Final', teamAId: null, teamBId: null, status: 'upcoming', scores: [], winnerId: null, table: 'Center Court', date: '', time: '' },
];

const INITIAL_STATE = {
  teams: INITIAL_TEAMS,
  matches: INITIAL_MATCHES,
  settings: DEFAULT_SETTINGS,
};

const checkGameWin = (scoreA, scoreB, pointsPerGame) => {
  const maxScore = Math.max(scoreA, scoreB);
  const diff = Math.abs(scoreA - scoreB);
  return maxScore >= pointsPerGame && diff >= 2;
};

const getMatchWinner = (scores, bestOf, pointsPerGame) => {
  let gamesA = 0, gamesB = 0;
  const requiredToWin = Math.ceil(bestOf / 2);
  scores.forEach(s => {
    if (checkGameWin(s.a, s.b, pointsPerGame)) {
      if (s.a > s.b) gamesA++; else gamesB++;
    }
  });
  if (gamesA >= requiredToWin) return 'A';
  if (gamesB >= requiredToWin) return 'B';
  return null;
};

const calculateGroupStandings = (teams, matches, settings) => {
  const standings = teams.reduce((acc, team) => {
    acc[team.id] = { ...team, MP: 0, W: 0, L: 0, GW: 0, GL: 0, GD: 0, PTS: 0, pointDiff: 0 };
    return acc;
  }, {});

  matches.forEach(match => {
    if (match.status === 'completed' && match.teamBId && match.groupId !== 'KO') {
      const a = match.teamAId;
      const b = match.teamBId;
      if (!standings[a] || !standings[b]) return;
      
      standings[a].MP++; standings[b].MP++;
      let gamesA = 0, gamesB = 0;
      let pointsA = 0, pointsB = 0;

      match.scores.forEach(s => {
        pointsA += s.a; pointsB += s.b;
        if (s.a > s.b) gamesA++; else if (s.b > s.a) gamesB++;
      });

      standings[a].GW += gamesA; standings[a].GL += gamesB;
      standings[b].GW += gamesB; standings[b].GL += gamesA;
      standings[a].pointDiff += (pointsA - pointsB);
      standings[b].pointDiff += (pointsB - pointsA);

      if (match.winnerId === a) {
        standings[a].W++; standings[b].L++;
        standings[a].PTS += settings.pointsWin; standings[b].PTS += settings.pointsLoss;
      } else if (match.winnerId === b) {
        standings[b].W++; standings[a].L++;
        standings[b].PTS += settings.pointsWin; standings[a].PTS += settings.pointsLoss;
      }
    }
  });

  return Object.values(standings).map(t => {
    t.GD = t.GW - t.GL;
    return t;
  }).sort((a, b) => {
    if (b.PTS !== a.PTS) return b.PTS - a.PTS;
    if (b.W !== a.W) return b.W - a.W;
    if (b.GD !== a.GD) return b.GD - a.GD;
    return b.pointDiff - a.pointDiff;
  });
};

const tournamentReducer = (state, action) => {
  switch (action.type) {
    case 'LOAD': return { ...INITIAL_STATE, ...action.payload };
    case 'ADD_CUSTOM_MATCH':
      return { ...state, matches: [...state.matches, { id: `custom_${crypto.randomUUID()}`, ...action.payload, status: 'upcoming', scores: [], winnerId: null }] };
    case 'UPDATE_TEAM':
      return { ...state, teams: state.teams.map(t => t.id === action.payload.id ? action.payload : t) };
    case 'ADD_TEAM':
      return { ...state, teams: [...state.teams, { id: crypto.randomUUID(), ...action.payload }] };
    case 'DELETE_TEAM':
      return { ...state, teams: state.teams.filter(t => t.id !== action.payload) };
      
    case 'UPDATE_MATCH': {
      const { id, updates } = action.payload;
      let newMatches = state.matches.map(m => m.id === id ? { ...m, ...updates } : m);

      // AUTO PROGRESSION TO GRAND FINAL
      if (updates.status === 'completed' && updates.winnerId) {
        if (id === 'ko_sf1' || id === 'ko_sf2') {
           const sf1Winner = newMatches.find(m => m.id === 'ko_sf1')?.winnerId || null;
           const sf2Winner = newMatches.find(m => m.id === 'ko_sf2')?.winnerId || null;
           newMatches = newMatches.map(m => m.id === 'ko_final' ? { ...m, teamAId: sf1Winner, teamBId: sf2Winner } : m);
        }
      }
      return { ...state, matches: newMatches };
    }

    case 'QUALIFY_KNOCKOUTS': {
      const { a1, a2, b1, b2 } = action.payload;
      const newMatches = state.matches.map(m => {
        if(m.id === 'ko_sf1') return { ...m, teamAId: a1, teamBId: b2 };
        if(m.id === 'ko_sf2') return { ...m, teamAId: b1, teamBId: a2 };
        return m;
      });
      return { ...state, matches: newMatches };
    }

    case 'UPDATE_SETTINGS': return { ...state, settings: { ...state.settings, ...action.payload } };
    case 'RESET_ALL': return INITIAL_STATE;
    default: return state;
  }
};

const TournamentContext = createContext();

const TournamentProvider = ({ children }) => {
  const [state, dispatch] = useReducer(tournamentReducer, INITIAL_STATE);
  const [isLoaded, setIsLoaded] = useState(false);
  const [dbUser, setDbUser] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) dispatch({ type: 'LOAD', payload: JSON.parse(saved) });
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  }, [state, isLoaded]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (initialAuthToken) setDbUser((await signInWithCustomToken(auth, initialAuthToken)).user);
        else setDbUser((await signInAnonymously(auth)).user);
      } catch (e) {}
    };
    initAuth();
  }, []);

  if (!isLoaded) return <div className="h-screen bg-slate-950 text-slate-400 flex items-center justify-center">Loading...</div>;

  return (
    <TournamentContext.Provider value={{ state, dispatch, dbUser }}>
      {children}
    </TournamentContext.Provider>
  );
};

const Card = ({ children, className = '' }) => <div className={`bg-slate-900 border border-slate-800 rounded-xl p-6 ${className}`}>{children}</div>;

const Button = ({ children, onClick, variant = 'primary', className = '', icon: Icon, type = "button", disabled=false }) => {
  const base = "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all active:scale-95 disabled:opacity-50";
  const variants = {
    primary: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20",
    secondary: "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700",
    danger: "bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20",
  };
  return <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${className}`}>{Icon && <Icon size={18} />}{children}</button>;
};

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1"><X size={20}/></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

const DialogContext = createContext();
const DialogProvider = ({ children }) => {
  const [dialog, setDialog] = useState(null);
  const confirm = (title, message, onConfirm, isDanger = false) => setDialog({ type: 'confirm', title, message, onConfirm, isDanger });
  const alert = (title, message) => setDialog({ type: 'alert', title, message });
  const close = () => setDialog(null);

  return (
    <DialogContext.Provider value={{ confirm, alert }}>
      {children}
      {dialog && (
        <Modal isOpen={true} onClose={close} title={dialog.title}>
          <p className="text-slate-300 mb-6">{dialog.message}</p>
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

const QuickScoreForm = ({ match, onClose }) => {
  const { state, dispatch } = useContext(TournamentContext);
  const dialog = useDialog();

  const handleQuickScore = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const scores = [];
    for(let i=0; i<state.settings.bestOf; i++) {
      const a = parseInt(fd.get(`g${i}a`));
      const b = parseInt(fd.get(`g${i}b`));
      if(!isNaN(a) && !isNaN(b)) scores.push({a, b});
    }
    if(scores.length === 0) { dialog.alert("Error", "Enter at least one game score."); return; }
    
    const winnerLetter = getMatchWinner(scores, state.settings.bestOf, state.settings.pointsPerGame);
    let winnerId = null;
    if (winnerLetter === 'A') winnerId = match.teamAId;
    if (winnerLetter === 'B') winnerId = match.teamBId;

    dispatch({ type: 'UPDATE_MATCH', payload: { id: match.id, updates: { scores, status: 'completed', winnerId } } });
    onClose();
    dialog.alert("Success", "Scores uploaded & teams progressed!");
  };

  return (
    <Modal isOpen={!!match} onClose={onClose} title="Quick Score Upload">
      <form onSubmit={handleQuickScore} className="space-y-4">
        <div className="flex justify-between items-center text-sm font-bold text-slate-400 mb-2 px-4 border-b border-slate-800 pb-4">
          <span className="w-1/2 text-right pr-4 text-white truncate">{state.teams.find(t=>t.id===match.teamAId)?.code} - {state.teams.find(t=>t.id===match.teamAId)?.player1}</span>
          <span className="text-emerald-500">VS</span>
          <span className="w-1/2 text-left pl-4 text-white truncate">{state.teams.find(t=>t.id===match.teamBId)?.code} - {state.teams.find(t=>t.id===match.teamBId)?.player1}</span>
        </div>
        {Array.from({length: state.settings.bestOf}).map((_, i) => (
          <div key={i} className="flex gap-4 items-center justify-center">
            <span className="text-xs font-bold text-slate-500 w-12">Game {i+1}</span>
            <input type="number" name={`g${i}a`} className="w-20 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white text-center focus:outline-none focus:border-emerald-500" placeholder="0" />
            <span className="text-slate-500">-</span>
            <input type="number" name={`g${i}b`} className="w-20 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white text-center focus:outline-none focus:border-emerald-500" placeholder="0" />
          </div>
        ))}
        <Button type="submit" className="w-full mt-6" variant="primary">Submit Score</Button>
      </form>
    </Modal>
  );
};

const Dashboard = ({ onNavigate }) => {
  const { state } = useContext(TournamentContext);
  const groups = state.matches.filter(m => m.groupId !== 'KO');
  const completed = groups.filter(m => m.status === 'completed').length;
  const live = state.matches.filter(m => m.status === 'live');
  
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <header className="mb-8">
        <h1 className="text-3xl font-black text-white tracking-tight uppercase">{state.settings.tournamentName}</h1>
        <p className="text-slate-400 mt-1">Live Tournament Dashboard</p>
      </header>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="flex flex-col items-center text-center p-4">
          <Users className="text-blue-400 mb-2" size={28} />
          <span className="text-3xl font-bold text-white">{state.teams.length}</span>
          <span className="text-xs text-slate-400 font-semibold mt-1">TEAMS</span>
        </Card>
        <Card className="flex flex-col items-center text-center p-4">
          <CalendarDays className="text-purple-400 mb-2" size={28} />
          <span className="text-3xl font-bold text-white">{groups.length}</span>
          <span className="text-xs text-slate-400 font-semibold mt-1">GROUP MATCHES</span>
        </Card>
        <Card className="flex flex-col items-center text-center p-4 border-emerald-500/20 bg-emerald-500/5">
          <CheckCircle2 className="text-emerald-400 mb-2" size={28} />
          <span className="text-3xl font-bold text-white">{completed}</span>
          <span className="text-xs text-emerald-500/70 font-semibold mt-1">COMPLETED</span>
        </Card>
        <Card className="flex flex-col items-center text-center p-4 border-yellow-500/20 bg-yellow-500/5">
          <Activity className="text-yellow-400 mb-2" size={28} />
          <span className="text-3xl font-bold text-white">{live.length}</span>
          <span className="text-xs text-yellow-500/70 font-semibold mt-1">LIVE NOW</span>
        </Card>
      </div>
    </div>
  );
};

const Fixtures = ({ onNavigate }) => {
  const { state, dispatch } = useContext(TournamentContext);
  const [tab, setTab] = useState('ALL');
  const [quickScoreMatch, setQuickScoreMatch] = useState(null);

  const filteredMatches = state.matches.filter(m => {
    if (m.groupId === 'KO') return false; 
    if (tab === 'ALL') return true;
    return m.groupId === tab;
  });

  const byRound = filteredMatches.reduce((acc, m) => {
    if (!acc[m.round]) acc[m.round] = [];
    acc[m.round].push(m);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Tournament Fixtures</h2>
      </div>

      <div className="flex gap-2 bg-slate-900 p-1 rounded-lg w-fit mb-6">
        {['ALL', 'A', 'B'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-md font-bold text-sm transition-all ${tab === t ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>
            {t === 'ALL' ? 'ALL GROUPS' : `GROUP ${t}`}
          </button>
        ))}
      </div>

      <div className="space-y-8">
        {Object.entries(byRound).map(([round, matches]) => (
          <div key={round} className="space-y-4">
            <h3 className="text-emerald-500 font-bold tracking-wider text-sm flex items-center gap-2">
              {round.toUpperCase()}
              <div className="flex-1 h-px bg-slate-800 ml-2"></div>
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {matches.map(m => {
                const teamA = state.teams.find(t => t.id === m.teamAId);
                const teamB = state.teams.find(t => t.id === m.teamBId);
                return (
                  <Card key={m.id} className="relative overflow-hidden group border-slate-800/80">
                    {m.status === 'live' && <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>}
                    {m.status === 'completed' && <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>}
                    
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex gap-2 items-center text-[11px] text-slate-400">
                        <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-white">{m.table}</span>
                        <span>{m.date} | {m.time}</span>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-1 rounded uppercase tracking-wider ${m.status==='completed'?'bg-emerald-500/10 text-emerald-400':m.status==='live'?'bg-red-500/10 text-red-400':'bg-slate-800 text-slate-400'}`}>
                        {m.status}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className={`flex justify-between items-center ${m.winnerId === teamA.id ? 'text-emerald-400 font-bold' : 'text-slate-200'}`}>
                        <div className="flex gap-2 items-center">
                          <span className="w-6 text-sm opacity-50">{teamA.code}</span>
                          <span className="text-sm truncate max-w-[120px]">{teamA.player1} & {teamA.player2}</span>
                        </div>
                        {m.status === 'completed' && <span className="text-lg">{m.scores.filter(s=>s.a>s.b).length}</span>}
                      </div>
                      <div className={`flex justify-between items-center ${m.winnerId === teamB.id ? 'text-emerald-400 font-bold' : 'text-slate-200'}`}>
                        <div className="flex gap-2 items-center">
                          <span className="w-6 text-sm opacity-50">{teamB.code}</span>
                          <span className="text-sm truncate max-w-[120px]">{teamB.player1} & {teamB.player2}</span>
                        </div>
                        {m.status === 'completed' && <span className="text-lg">{m.scores.filter(s=>s.b>s.a).length}</span>}
                      </div>
                    </div>

                    {m.status !== 'completed' && (
                      <div className="mt-4 pt-4 border-t border-slate-800 flex gap-2">
                        <Button className="flex-1 text-xs py-1.5" variant={m.status === 'live' ? 'primary' : 'secondary'} onClick={() => {
                            if(m.status === 'upcoming') dispatch({ type: 'UPDATE_MATCH', payload: { id: m.id, updates: { status: 'live' } }});
                            onNavigate('live', m.id);
                          }}>Live</Button>
                        <Button className="flex-1 text-xs py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border-none" onClick={() => setQuickScoreMatch(m)}>
                          Quick Score
                        </Button>
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      {quickScoreMatch && <QuickScoreForm match={quickScoreMatch} onClose={() => setQuickScoreMatch(null)} />}
    </div>
  );
};

const KnockoutBracket = ({ onNavigate }) => {
  const { state, dispatch, dbUser } = useContext(TournamentContext);
  const dialog = useDialog();
  const [quickScoreMatch, setQuickScoreMatch] = useState(null);
  
  const handleQualify = () => {
    const stA = calculateGroupStandings(state.teams.filter(t=>t.group==='A'), state.matches, state.settings);
    const stB = calculateGroupStandings(state.teams.filter(t=>t.group==='B'), state.matches, state.settings);
    if(stA.length < 2 || stB.length < 2) { dialog.alert("Not Ready", "Need at least 2 teams in each group."); return; }
    
    dialog.confirm("Lock Groups & Qualify?", "This will push the Top 2 teams from Group A and B into the Semi-Finals.", () => {
       dispatch({ type: 'QUALIFY_KNOCKOUTS', payload: { a1: stA[0].id, a2: stA[1].id, b1: stB[0].id, b2: stB[1].id } });
    });
  };

  const publishToCloud = async (winner, runnerUp) => {
    if (!dbUser) return dialog.alert("Error", "Connect to cloud first.");
    try {
      const ref = collection(db, 'artifacts', appId, 'public', 'data', 'past_tournaments');
      await addDoc(ref, { tournamentName: state.settings.tournamentName, date: new Date().toISOString(), winner: winner, runnerUp: runnerUp, createdAt: Date.now() });
      dialog.alert("Success!", "Published to Hall of Fame.");
    } catch (e) { dialog.alert("Error", "Failed to publish."); }
  };

  const sf1 = state.matches.find(m => m.id === 'ko_sf1');
  const sf2 = state.matches.find(m => m.id === 'ko_sf2');
  const finalMatch = state.matches.find(m => m.id === 'ko_final');

  const MatchBox = ({ match, title }) => {
    if (!match) return null;
    const tA = state.teams.find(t => t.id === match.teamAId);
    const tB = state.teams.find(t => t.id === match.teamBId);
    const isClickable = match.teamAId && match.teamBId;

    return (
      <Card className="relative overflow-hidden w-72 lg:w-80 border-slate-700/50 shadow-xl bg-slate-900/90 backdrop-blur">
        {match.status === 'live' && <div className="absolute top-0 left-0 w-1 h-full bg-red-500 animate-pulse"></div>}
        {match.status === 'completed' && <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500"></div>}
        
        <div className="flex justify-between items-center mb-3">
          <div className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest">{title}</div>
          <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${match.status==='completed'?'bg-emerald-500/10 text-emerald-400':match.status==='live'?'bg-red-500/10 text-red-400':'bg-slate-800 text-slate-400'}`}>
            {match.status}
          </span>
        </div>

        <div className="space-y-3">
          <div className={`flex justify-between items-center ${match.winnerId === match.teamAId ? 'text-emerald-400 font-bold' : 'text-slate-200'}`}>
            <div className="flex gap-2 items-center">
              <span className="w-6 text-sm opacity-50">{tA?.code || '-'}</span>
              <span className="text-sm truncate max-w-[120px]">{tA?.player1 || 'TBD'} {tA?.player2 ? `& ${tA.player2}` : ''}</span>
            </div>
            {match.status === 'completed' && match.teamAId && <span className="text-lg">{match.scores.filter(s=>s.a>s.b).length}</span>}
          </div>
          <div className={`flex justify-between items-center ${match.winnerId === match.teamBId ? 'text-emerald-400 font-bold' : 'text-slate-200'}`}>
            <div className="flex gap-2 items-center">
              <span className="w-6 text-sm opacity-50">{tB?.code || '-'}</span>
              <span className="text-sm truncate max-w-[120px]">{tB?.player1 || 'TBD'} {tB?.player2 ? `& ${tB.player2}` : ''}</span>
            </div>
            {match.status === 'completed' && match.teamBId && <span className="text-lg">{match.scores.filter(s=>s.b>s.a).length}</span>}
          </div>
        </div>

        {match.status !== 'completed' && isClickable && (
          <div className="mt-4 pt-4 border-t border-slate-800 flex gap-2">
            <Button className="flex-1 text-xs py-1.5" variant={match.status === 'live' ? 'primary' : 'secondary'} onClick={() => {
                if(match.status === 'upcoming') dispatch({ type: 'UPDATE_MATCH', payload: { id: match.id, updates: { status: 'live' } }});
                onNavigate('live', match.id);
              }}>Live Score</Button>
            <Button className="flex-1 text-xs py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300" onClick={() => setQuickScoreMatch(match)}>
              Quick Score
            </Button>
          </div>
        )}
      </Card>
    )
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Knockout Bracket</h2>
        <Button onClick={handleQualify} icon={Zap} variant="primary">Qualify Top Teams</Button>
      </div>

      <div className="overflow-x-auto pb-12">
        <div className="min-w-[800px] flex justify-center items-center gap-12 mt-12">
          {/* Semifinals */}
          <div className="flex flex-col gap-16 relative">
            <MatchBox match={sf1} title="Semifinal 1 (A1 vs B2)" />
            <MatchBox match={sf2} title="Semifinal 2 (B1 vs A2)" />
            <svg className="absolute left-full top-0 w-12 h-full pointer-events-none -z-10 text-slate-700">
               <path d="M0,80 L24,80 L24,240 L0,240" fill="none" stroke="currentColor" strokeWidth="2" />
               <path d="M24,160 L48,160" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>
          {/* Final */}
          <div className="flex flex-col justify-center">
            <div className="flex flex-col items-center relative">
              <Trophy className={`mb-4 transition-all duration-1000 ${finalMatch?.winnerId ? 'text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)] scale-125' : 'text-yellow-700/50'}`} size={48} />
              <MatchBox match={finalMatch} title="GRAND FINAL" />
              {finalMatch?.winnerId && (
                <div className="absolute top-full mt-4 text-center animate-in fade-in slide-in-from-top-4 flex flex-col items-center gap-4 w-full">
                  <div>
                    <div className="text-yellow-400 font-black text-xl">CHAMPIONS</div>
                    <div className="text-white font-bold">{state.teams.find(t=>t.id===finalMatch.winnerId)?.player1}</div>
                  </div>
                  <Button onClick={() => publishToCloud(state.teams.find(t=>t.id===finalMatch.winnerId), state.teams.find(t=>t.id===(finalMatch.winnerId===finalMatch.teamAId?finalMatch.teamBId:finalMatch.teamAId)))} icon={UploadCloud} variant="primary">Publish</Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {quickScoreMatch && <QuickScoreForm match={quickScoreMatch} onClose={() => setQuickScoreMatch(null)} />}
    </div>
  );
};

const StandingsTable = ({ group, title }) => {
  const { state } = useContext(TournamentContext);
  const teams = state.teams.filter(t => t.group === group);
  const standings = useMemo(() => calculateGroupStandings(teams, state.matches, state.settings), [teams, state.matches, state.settings]);

  return (
    <Card className="overflow-x-auto p-0">
      <div className="p-4 border-b border-slate-800 bg-slate-900/80"><h3 className="font-black text-xl text-white">{title}</h3></div>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-900 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
            <th className="p-4 w-12 text-center">Pos</th><th className="p-4">Team</th>
            <th className="p-4 text-center">MP</th><th className="p-4 text-center">W</th><th className="p-4 text-center">L</th>
            <th className="p-4 text-center text-emerald-400">PTS</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/50">
          {standings.map((team, idx) => (
            <tr key={team.id} className={`hover:bg-slate-800/30 ${idx < 2 ? 'bg-emerald-900/5' : ''}`}>
              <td className="p-4 text-center">{idx < 2 ? <span className={`inline-flex w-6 h-6 items-center justify-center rounded-full font-bold text-sm ${idx===0?'bg-yellow-500/20 text-yellow-500':'bg-slate-300/20 text-slate-300'}`}>{idx+1}</span> : <span className="text-slate-500 font-bold">{idx + 1}</span>}</td>
              <td className="p-4"><div className="font-bold text-white">{team.code}</div><div className="text-xs text-slate-400">{team.player1} & {team.player2}</div></td>
              <td className="p-4 text-center text-slate-300">{team.MP}</td><td className="p-4 text-center text-emerald-400">{team.W}</td><td className="p-4 text-center text-red-400">{team.L}</td>
              <td className="p-4 text-center font-black text-white text-lg">{team.PTS}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
};

const Settings = () => {
  const { state, dispatch } = useContext(TournamentContext);
  const dialog = useDialog();
  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold text-white mb-6">Tournament Settings</h2>
      <Card className="mt-8 border-red-500/20 bg-red-500/5">
        <h3 className="text-red-500 font-bold flex items-center gap-2 mb-4"><AlertTriangle size={18}/> Hard Reset</h3>
        <p className="text-slate-400 text-sm mb-4">Erases all current scores and progress, reverting to the original scheduled fixtures.</p>
        <Button onClick={() => dialog.confirm("Reset Tournament?", "Are you sure?", () => { dispatch({ type: 'RESET_ALL' }); }, true)} variant="danger">Reset Matches</Button>
      </Card>
    </div>
  );
};

const Teams = () => {
  const { state } = useContext(TournamentContext);
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {state.teams.map(team => (
        <Card key={team.id} className="relative group hover:border-emerald-500/50 transition-colors">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center font-black text-white">{team.code}</div>
            <div><div className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Group {team.group}</div></div>
          </div>
          <div className="font-semibold text-slate-200">{team.player1} <span className="text-slate-500 text-xs mx-1">&</span> {team.player2}</div>
        </Card>
      ))}
    </div>
  );
};

const LiveScoring = ({ matchId, onBack }) => {
  const { state, dispatch } = useContext(TournamentContext);
  const match = state.matches.find(m => m.id === matchId);
  const teamA = state.teams.find(t => t.id === match?.teamAId);
  const teamB = state.teams.find(t => t.id === match?.teamBId);
  const [scores, setScores] = useState(match?.scores || []);
  const [currentGame, setCurrentGame] = useState({ a: 0, b: 0 });

  if (!match || !teamA || !teamB) return <div className="p-8 text-center text-slate-400">Match not found.</div>;

  const handleScore = (t, d) => setCurrentGame(p => ({ ...p, [t]: Math.max(0, p[t] + d) }));
  const handleFinishMatch = () => {
    let fS = [...scores];
    if (currentGame.a > 0 || currentGame.b > 0) fS.push(currentGame);
    const winnerLetter = getMatchWinner(fS, state.settings.bestOf, state.settings.pointsPerGame);
    dispatch({ type: 'UPDATE_MATCH', payload: { id: match.id, updates: { scores: fS, status: 'completed', winnerId: winnerLetter === 'A' ? teamA.id : winnerLetter === 'B' ? teamB.id : null } } });
    onBack();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300"><ArrowRight className="rotate-180" size={20} /></button>
        <h2 className="text-2xl font-bold text-white flex-1">Live Match Scoring</h2>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        {[{t: teamA, key: 'a', color: 'emerald'}, {t: teamB, key: 'b', color: 'blue'}].map(({t, key, color}) => (
          <div key={key} className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 flex flex-col items-center">
            <h3 className="text-xl font-bold text-white text-center mb-1">{t.code}</h3>
            <p className="text-slate-400 text-sm text-center h-6">{t.player1} & {t.player2}</p>
            <div className="text-[120px] leading-none font-black text-white my-8 select-none">{currentGame[key]}</div>
            <div className="flex gap-4 w-full">
              {key === 'a' ? (
                <><button onClick={()=>handleScore(key,-1)} className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl text-2xl text-slate-300">-</button><button onClick={()=>handleScore(key,1)} className={`flex-[3] py-4 bg-${color}-600 hover:bg-${color}-500 rounded-2xl text-4xl text-white`}>+</button></>
              ) : (
                <><button onClick={()=>handleScore(key,1)} className={`flex-[3] py-4 bg-${color}-600 hover:bg-${color}-500 rounded-2xl text-4xl text-white`}>+</button><button onClick={()=>handleScore(key,-1)} className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl text-2xl text-slate-300">-</button></>
              )}
            </div>
          </div>
        ))}
      </div>
      <Button onClick={handleFinishMatch} variant="primary" className="w-full py-4 text-lg bg-emerald-600 text-white">Complete Match</Button>
    </div>
  );
};

const AppLayout = () => {
  const [activeTab, setActiveTab] = useState('fixtures');
  const [activeMatchId, setActiveMatchId] = useState(null); 

  const handleNav = (id, matchId=null) => { setActiveTab(id); if(matchId) setActiveMatchId(matchId); };
  const navs = [
    { id: 'dashboard', i: LayoutDashboard, l: 'Dashboard' }, { id: 'fixtures', i: CalendarDays, l: 'Fixtures' },
    { id: 'standings', i: Trophy, l: 'Standings' }, { id: 'knockout', i: Swords, l: 'Knockout' },
    { id: 'teams', i: Users, l: 'Teams' }, { id: 'settings', i: SettingsIcon, l: 'Settings' }
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-slate-300 font-sans selection:bg-emerald-500/30">
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-800 bg-slate-950/50">
        <div className="p-6 flex items-center gap-3 text-emerald-500 font-black text-xl"><Shield size={28}/> SMASHFEST</div>
        <nav className="flex-1 px-4 space-y-2 mt-4">{navs.map(n => <button key={n.id} onClick={()=>handleNav(n.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab===n.id?'bg-emerald-500/10 text-emerald-400 font-bold':'hover:bg-slate-900 font-medium'}`}><n.i size={20}/>{n.l}</button>)}</nav>
      </aside>
      <main className="flex-1 overflow-y-auto pb-24 md:pb-0 relative">
        <div className="max-w-6xl mx-auto p-4 md:p-8">
          {activeTab === 'dashboard' && <Dashboard onNavigate={handleNav} />}
          {activeTab === 'fixtures' && <Fixtures onNavigate={handleNav} />}
          {activeTab === 'standings' && <div className="grid lg:grid-cols-2 gap-8"><StandingsTable group="A" title="GROUP A"/><StandingsTable group="B" title="GROUP B"/></div>}
          {activeTab === 'knockout' && <KnockoutBracket onNavigate={handleNav} />}
          {activeTab === 'teams' && <Teams />}
          {activeTab === 'settings' && <Settings />}
          {activeTab === 'live' && <LiveScoring matchId={activeMatchId} onBack={() => handleNav('fixtures')} />}
        </div>
      </main>
      <div className="md:hidden fixed bottom-0 w-full bg-slate-950 border-t border-slate-800 flex justify-around p-2 pb-safe z-50 overflow-x-auto">
        {navs.map(n => <button key={n.id} onClick={()=>handleNav(n.id)} className={`flex-shrink-0 flex flex-col items-center p-2 rounded-lg min-w-[64px] ${activeTab===n.id?'text-emerald-400':'text-slate-500'}`}><n.i size={20}/><span className="text-[10px] mt-1">{n.l}</span></button>)}
      </div>
    </div>
  );
};

export default function App() { return <DialogProvider><TournamentProvider><AppLayout /></TournamentProvider></DialogProvider>; }
