import React, { createContext, useReducer, useContext, useEffect, useState, useMemo } from 'react';
import { 
  Trophy, Users, CalendarDays, LayoutDashboard, SettingsIcon, 
  Play, CheckCircle2, ChevronRight, X, Plus, Edit2, Shield,
  Swords, Activity, Trash2, RotateCcw, AlertTriangle, ArrowRight,
  UploadCloud, Medal, History, Check, Save
} from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query } from 'firebase/firestore';

// Safely handle environment variables for both Canvas and Vercel deployments
const appId = typeof __app_id !== 'undefined' ? __app_id : 'smashfest-local-deploy';
const firebaseConfigStr = typeof __firebase_config !== 'undefined' ? __firebase_config : null;
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

let firebaseConfig = {
  // If deploying to Vercel, replace these with your actual Firebase Project config!
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

if (firebaseConfigStr) {
  try {
    firebaseConfig = JSON.parse(firebaseConfigStr);
  } catch(e) { console.error("Could not parse injected Firebase config"); }
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const INITIAL_TEAMS = [
  { id: 't1', code: 'D1', player1: 'Utpal Tripathi', player2: 'Pardeep Sir', group: 'A', seed: 1 },
  { id: 't2', code: 'D5', player1: 'Madhwan Rai', player2: 'Utkarsh Yaduvanshi', group: 'A', seed: 2 },
  { id: 't3', code: 'D3', player1: 'Vishal', player2: 'Vineet Kumar Yadav', group: 'A', seed: 3 },
  { id: 't4', code: 'D4', player1: 'Vishwash Singh', player2: 'Himanshu Maurya', group: 'A', seed: 4 },
  { id: 't5', code: 'D7', player1: 'Moksh Yadav', player2: 'Nitin Maurya', group: 'A', seed: 5 },
  { id: 't6', code: 'D6', player1: 'Omm Prakash Lenka', player2: 'Shivam Singh', group: 'B', seed: 1 },
  { id: 't7', code: 'D2', player1: 'Himanshu Deb', player2: 'Ansh Pratap Ra', group: 'B', seed: 2 },
  { id: 't8', code: 'D9', player1: 'Abhitesh Srivastava', player2: 'Devansh Singh', group: 'B', seed: 3 },
  { id: 't9', code: 'D10', player1: 'Om Mishra', player2: 'Eklavya', group: 'B', seed: 4 },
  { id: 't10', code: 'D8', player1: 'Saloni Kumari', player2: 'A1', group: 'B', seed: 5 },
];

const DEFAULT_SETTINGS = {
  tournamentName: "SMASHFEST '26",
  pointsWin: 2,
  pointsLoss: 0,
  bestOf: 3,
  pointsPerGame: 11,
  tables: 2,
  matchDuration: 20,
  startTime: '09:00',
};

const INITIAL_STATE = {
  teams: INITIAL_TEAMS,
  matches: [],
  settings: DEFAULT_SETTINGS,
  knockout: {
    sf1: null,
    sf2: null,
    final: null,
    thirdPlace: null,
  }
};

// Utility: Round Robin Generator
const generateRoundRobin = (teams, groupId, startTable, startTimeStr, matchDuration) => {
  const matches = [];
  const teamIds = teams.map(t => t.id);
  if (teamIds.length % 2 !== 0) teamIds.push(null); // Dummy team for BYE
  const n = teamIds.length;
  const rounds = n - 1;
  const half = n / 2;

  let currentTime = new Date(`2026-01-01T${startTimeStr}:00`);

  for (let round = 0; round < rounds; round++) {
    let matchCount = 0;
    for (let i = 0; i < half; i++) {
      const teamA = teamIds[i];
      const teamB = teamIds[n - 1 - i];
      
      if (teamA && teamB) {
        matches.push({
          id: `m_${groupId}_r${round+1}_${i}`,
          groupId,
          round: round + 1,
          teamAId: teamA,
          teamBId: teamB,
          status: 'upcoming',
          scores: [],
          winnerId: null,
          table: `Table ${(matchCount % 4) + 1}`,
          time: currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        matchCount++;
      } else {
        matches.push({
          id: `bye_${groupId}_r${round+1}_${i}`,
          groupId,
          round: round + 1,
          teamAId: teamA || teamB,
          teamBId: null,
          status: 'bye',
        });
      }
    }
    currentTime = new Date(currentTime.getTime() + matchDuration * 60000);
    teamIds.splice(1, 0, teamIds.pop());
  }
  return matches;
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
      if (s.a > s.b) gamesA++;
      else gamesB++;
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
    if (match.status === 'completed' && match.teamBId) {
      const a = match.teamAId;
      const b = match.teamBId;
      
      standings[a].MP++;
      standings[b].MP++;

      let gamesA = 0, gamesB = 0;
      let pointsA = 0, pointsB = 0;

      match.scores.forEach(s => {
        pointsA += s.a;
        pointsB += s.b;
        if (s.a > s.b) gamesA++;
        else if (s.b > s.a) gamesB++;
      });

      standings[a].GW += gamesA;
      standings[a].GL += gamesB;
      standings[b].GW += gamesB;
      standings[b].GL += gamesA;

      standings[a].pointDiff += (pointsA - pointsB);
      standings[b].pointDiff += (pointsB - pointsA);

      if (match.winnerId === a) {
        standings[a].W++;
        standings[b].L++;
        standings[a].PTS += settings.pointsWin;
        standings[b].PTS += settings.pointsLoss;
      } else if (match.winnerId === b) {
        standings[b].W++;
        standings[a].L++;
        standings[b].PTS += settings.pointsWin;
        standings[a].PTS += settings.pointsLoss;
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
    case 'LOAD':
      return { ...INITIAL_STATE, ...action.payload };
      
    case 'ADD_CUSTOM_MATCH': {
      const newMatch = {
        id: `custom_${crypto.randomUUID()}`,
        groupId: action.payload.groupId,
        round: 'Custom',
        teamAId: action.payload.teamAId,
        teamBId: action.payload.teamBId,
        status: 'upcoming',
        scores: [],
        winnerId: null,
        table: action.payload.table || 'Table 1',
        date: action.payload.date || '',
        time: action.payload.time || '12:00'
      };
      return { ...state, matches: [...state.matches, newMatch] };
    }

    case 'ADD_BULK_MATCHES': {
      return { ...state, matches: [...state.matches, ...action.payload] };
    }

    case 'GENERATE_FIXTURES': {
      const groupA = state.teams.filter(t => t.group === 'A');
      const groupB = state.teams.filter(t => t.group === 'B');
      const matchesA = generateRoundRobin(groupA, 'A', 1, state.settings.startTime, state.settings.matchDuration);
      const matchesB = generateRoundRobin(groupB, 'B', 3, state.settings.startTime, state.settings.matchDuration);
      return { ...state, matches: [...matchesA, ...matchesB], knockout: INITIAL_STATE.knockout };
    }

    case 'UPDATE_TEAM': {
      const updatedTeams = state.teams.map(t => t.id === action.payload.id ? action.payload : t);
      return { ...state, teams: updatedTeams };
    }

    case 'ADD_TEAM':
      return { ...state, teams: [...state.teams, { id: crypto.randomUUID(), ...action.payload }] };

    case 'DELETE_TEAM':
      return { ...state, teams: state.teams.filter(t => t.id !== action.payload) };

    case 'UPDATE_MATCH': {
      const { id, updates } = action.payload;
      let newMatches = state.matches.map(m => m.id === id ? { ...m, ...updates } : m);

      // Auto-progression logic for Knockouts
      if (updates.status === 'completed' && updates.winnerId) {
        if (id === state.knockout.sf1 || id === state.knockout.sf2) {
           const sf1Winner = newMatches.find(m => m.id === state.knockout.sf1)?.winnerId || null;
           const sf2Winner = newMatches.find(m => m.id === state.knockout.sf2)?.winnerId || null;
           
           newMatches = newMatches.map(m => {
             if (m.id === state.knockout.final) {
               return { ...m, teamAId: sf1Winner, teamBId: sf2Winner };
             }
             return m;
           });
        }
      }

      return {
        ...state,
        matches: newMatches
      };
    }

    case 'GENERATE_KNOCKOUTS': {
      const stA = calculateGroupStandings(state.teams.filter(t=>t.group==='A'), state.matches, state.settings);
      const stB = calculateGroupStandings(state.teams.filter(t=>t.group==='B'), state.matches, state.settings);
      
      const sf1 = {
        id: 'ko_sf1', groupId: 'KO', round: 'SF',
        teamAId: stA[0].id, teamBId: astB[1].id,
        status: 'upcoming', scores: [], winnerId: null, table: 'Table 1', time: '14:00'
      };
      const sf2 = {
        id: 'ko_sf2', groupId: 'KO', round: 'SF',
        teamAId: stB[0].id, teamBId: stA[1].id,
        status: 'upcoming', scores: [], winnerId: null, table: 'Table 2', time: '14:00'
      };
      const final = {
        id: 'ko_final', groupId: 'KO', round: 'F',
        teamAId: null, teamBId: null, 
        status: 'upcoming', scores: [], winnerId: null, table: 'Table 1', time: '16:00'
      };
      
      const newMatches = state.matches.filter(m => m.groupId !== 'KO');
      newMatches.push(sf1, sf2, final);

      return {
        ...state,
        matches: newMatches,
        knockout: { ...state.knockout, sf1: sf1.id, sf2: sf2.id, final: final.id }
      };
    }

    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };

    case 'RESET_ALL':
      return INITIAL_STATE;

    default:
      return state;
  }
};

const TournamentContext = createContext();

const TournamentProvider = ({ children }) => {
  const [state, dispatch] = useReducer(tournamentReducer, INITIAL_STATE);
  const [isLoaded, setIsLoaded] = useState(false);
  const [dbUser, setDbUser] = useState(null);

  // Load from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem('smashfest_state');
    if (saved) {
      dispatch({ type: 'LOAD', payload: JSON.parse(saved) });
    }
    setIsLoaded(true);
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('smashfest_state', JSON.stringify(state));
    }
  }, [state, isLoaded]);

  // Authenticate Firebase
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (initialAuthToken) {
          const cred = await signInWithCustomToken(auth, initialAuthToken);
          setDbUser(cred.user);
        } else {
          const cred = await signInAnonymously(auth);
          setDbUser(cred.user);
        }
      } catch (error) {
        console.error("Auth error", error);
      }
    };
    initAuth();
  }, []);

  if (!isLoaded) return <div className="h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading Tournament...</div>;

  return (
    <TournamentContext.Provider value={{ state, dispatch, dbUser }}>
      {children}
    </TournamentContext.Provider>
  );
};

const Card = ({ children, className = '' }) => (
  <div className={`bg-slate-900 border border-slate-800 rounded-xl p-6 ${className}`}>
    {children}
  </div>
);

const Button = ({ children, onClick, variant = 'primary', className = '', icon: Icon, type = "button", disabled=false }) => {
  const base = "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none";
  const variants = {
    primary: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20",
    secondary: "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700",
    danger: "bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20",
    ghost: "hover:bg-slate-800 text-slate-300 hover:text-white"
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${className}`}>
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
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

// Custom Confirm/Alert Dialog to avoid browser prompts
const DialogContext = createContext();
const DialogProvider = ({ children }) => {
  const [dialog, setDialog] = useState(null);

  const confirm = (title, message, onConfirm, isDanger = false) => {
    setDialog({ type: 'confirm', title, message, onConfirm, isDanger });
  };
  const alert = (title, message) => {
    setDialog({ type: 'alert', title, message });
  };
  const close = () => setDialog(null);

  return (
    <DialogContext.Provider value={{ confirm, alert }}>
      {children}
      {dialog && (
        <Modal isOpen={true} onClose={close} title={dialog.title}>
          <p className="text-slate-300 mb-6">{dialog.message}</p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={close}>Cancel</Button>
            {dialog.type === 'confirm' && (
              <Button 
                variant={dialog.isDanger ? 'danger' : 'primary'} 
                onClick={() => { dialog.onConfirm(); close(); }}
              >
                Confirm
              </Button>
            )}
          </div>
        </Modal>
      )}
    </DialogContext.Provider>
  );
};
const useDialog = () => useContext(DialogContext);

const Dashboard = ({ onNavigate }) => {
  const { state } = useContext(TournamentContext);
  const totalMatches = state.matches.filter(m => m.teamBId !== null).length;
  const completed = state.matches.filter(m => m.status === 'completed').length;
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
          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold mt-1">Teams</span>
        </Card>
        <Card className="flex flex-col items-center text-center p-4">
          <CalendarDays className="text-purple-400 mb-2" size={28} />
          <span className="text-3xl font-bold text-white">{totalMatches}</span>
          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold mt-1">Total Matches</span>
        </Card>
        <Card className="flex flex-col items-center text-center p-4 border-emerald-500/20 bg-emerald-500/5">
          <CheckCircle2 className="text-emerald-400 mb-2" size={28} />
          <span className="text-3xl font-bold text-white">{completed}</span>
          <span className="text-xs text-emerald-500/70 uppercase tracking-wider font-semibold mt-1">Completed</span>
        </Card>
        <Card className="flex flex-col items-center text-center p-4 border-yellow-500/20 bg-yellow-500/5">
          <Activity className="text-yellow-400 mb-2" size={28} />
          <span className="text-3xl font-bold text-white">{live.length}</span>
          <span className="text-xs text-yellow-500/70 uppercase tracking-wider font-semibold mt-1">Live Now</span>
        </Card>
      </div>

      {live.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            Live Matches
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {live.map(m => {
              const teamA = state.teams.find(t => t.id === m.teamAId);
              const teamB = state.teams.find(t => t.id === m.teamBId);
              return (
                <Card key={m.id} className="border-red-500/30 bg-gradient-to-br from-slate-900 to-red-950/20">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-bold text-red-400 px-2 py-1 bg-red-500/10 rounded">LIVE</span>
                    <span className="text-xs text-slate-400">{m.table}</span>
                  </div>
                  <div className="flex justify-between items-center text-center gap-4">
                    <div className="flex-1">
                      <div className="font-bold text-white">{teamA.code}</div>
                      <div className="text-xs text-slate-400 truncate">{teamA.player1}</div>
                    </div>
                    <div className="text-xl font-black text-slate-500">VS</div>
                    <div className="flex-1">
                      <div className="font-bold text-white">{teamB.code}</div>
                      <div className="text-xs text-slate-400 truncate">{teamB.player1}</div>
                    </div>
                  </div>
                  <Button className="w-full mt-4" onClick={() => onNavigate('live', m.id)}>
                    Open Scoring
                  </Button>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const Fixtures = ({ onNavigate }) => {
  const { state, dispatch } = useContext(TournamentContext);
  const [tab, setTab] = useState('ALL');
  const dialog = useDialog();
  const [isCreating, setIsCreating] = useState(false);
  const [quickScoreMatch, setQuickScoreMatch] = useState(null);

  const handleGenerate = () => {
    dialog.confirm(
      "Regenerate Fixtures?",
      "This will erase current group stage matches and schedules! Are you sure?",
      () => dispatch({ type: 'GENERATE_FIXTURES' }),
      true
    );
  };

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

  const handleCreateCustomMatch = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    dispatch({
      type: 'ADD_CUSTOM_MATCH',
      payload: {
        teamAId: fd.get('teamA'),
        teamBId: fd.get('teamB'),
        groupId: fd.get('groupId'),
        table: fd.get('table'),
        date: fd.get('date'),
        time: fd.get('time')
      }
    });
    setIsCreating(false);
    dialog.alert("Success", "Custom match created successfully!");
  };

  const handleCSVImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const rows = text.split('\n').map(r => r.trim()).filter(r => r);
      if (rows.length < 2) {
        dialog.alert("Error", "CSV file seems empty. Please include a header row and data.");
        return;
      }
      
      const matchesToAdd = [];
      // Skip header row, start from index 1
      for (let i = 1; i < rows.length; i++) {
        const cols = rows[i].split(',').map(c => c.trim());
        if (cols.length >= 2) {
          const tACode = cols[0];
          const tBCode = cols[1];
          const group = cols[2] || 'Custom';
          const round = cols[3] || 'Custom';
          const table = cols[4] || 'Table 1';
          const date = cols[5] || '';
          const time = cols[6] || '12:00';

          const tA = state.teams.find(t => t.code.toLowerCase() === tACode.toLowerCase());
          const tB = state.teams.find(t => t.code.toLowerCase() === tBCode.toLowerCase());

          if (tA && tB) {
            matchesToAdd.push({
              id: `csv_${crypto.randomUUID()}`,
              groupId: group,
              round: round,
              teamAId: tA.id,
              teamBId: tB.id,
              status: 'upcoming',
              scores: [],
              winnerId: null,
              table: table,
              date: date,
              time: time
            });
          }
        }
      }

      if (matchesToAdd.length > 0) {
        dispatch({ type: 'ADD_BULK_MATCHES', payload: matchesToAdd });
        dialog.alert("Success", `Successfully imported ${matchesToAdd.length} matches from CSV!`);
      } else {
        dialog.alert("Error", "Could not find matching teams. Make sure Column 1 and Column 2 contain valid Team Codes (e.g. D1, D5).");
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const handleQuickScore = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const scores = [];
    for(let i=0; i<state.settings.bestOf; i++) {
      const a = parseInt(fd.get(`g${i}a`));
      const b = parseInt(fd.get(`g${i}b`));
      if(!isNaN(a) && !isNaN(b)) {
        scores.push({a, b});
      }
    }
    
    if(scores.length === 0) {
      dialog.alert("Error", "Please enter at least one game score.");
      return;
    }
    
    const winnerLetter = getMatchWinner(scores, state.settings.bestOf, state.settings.pointsPerGame);
    let winnerId = null;
    if (winnerLetter === 'A') winnerId = quickScoreMatch.teamAId;
    if (winnerLetter === 'B') winnerId = quickScoreMatch.teamBId;

    dispatch({ 
      type: 'UPDATE_MATCH', 
      payload: { 
        id: quickScoreMatch.id, 
        updates: { scores, status: 'completed', winnerId } 
      } 
    });
    setQuickScoreMatch(null);
    dialog.alert("Scores Uploaded", "Match results updated successfully!");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-white">Fixtures & Schedule</h2>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => setIsCreating(true)} icon={Plus} variant="primary">
            Custom Match
          </Button>
          <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all active:scale-95 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700">
             <UploadCloud size={18} /> CSV Upload
             <input type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
          </label>
          <Button onClick={handleGenerate} icon={RotateCcw} variant="secondary">
            Auto Generate
          </Button>
        </div>
      </div>

      <div className="flex gap-2 bg-slate-900 p-1 rounded-lg w-fit mb-6">
        {['ALL', 'A', 'B'].map(t => (
          <button 
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md font-bold text-sm transition-all ${tab === t ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            {t === 'ALL' ? 'ALL GROUPS' : `GROUP ${t}`}
          </button>
        ))}
      </div>

      {Object.keys(byRound).length === 0 ? (
        <Card className="text-center py-12 text-slate-400">
          <CalendarDays size={48} className="mx-auto mb-4 opacity-20" />
          <p>No fixtures generated yet.</p>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(byRound).map(([round, matches]) => (
            <div key={round} className="space-y-4">
              <h3 className="text-emerald-500 font-bold tracking-wider text-sm flex items-center gap-2">
                ROUND {round}
                <div className="flex-1 h-px bg-slate-800 ml-2"></div>
              </h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {matches.map(m => {
                  const teamA = state.teams.find(t => t.id === m.teamAId);
                  const teamB = state.teams.find(t => t.id === m.teamBId);
                  const isBye = m.status === 'bye';

                  if (isBye) return (
                    <div key={m.id} className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-4 flex items-center justify-between opacity-60">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-400">{teamA?.code}</span>
                        <span className="text-sm text-slate-500">{teamA?.player1} & {teamA?.player2}</span>
                      </div>
                      <span className="text-xs font-bold bg-slate-800 px-2 py-1 rounded text-slate-400">BYE</span>
                    </div>
                  );

                  return (
                    <Card key={m.id} className="relative overflow-hidden group">
                      {m.status === 'live' && <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>}
                      {m.status === 'completed' && <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>}
                      
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex gap-2 items-center text-xs text-slate-400">
                          <span className="font-mono bg-slate-800 px-2 py-0.5 rounded">{m.table}</span>
                          <span>{m.date ? `${m.date} | ` : ''}{m.time}</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider
                          ${m.status==='completed'?'bg-emerald-500/10 text-emerald-400':
                            m.status==='live'?'bg-red-500/10 text-red-400':'bg-slate-800 text-slate-400'}`}>
                          {m.status}
                        </span>
                      </div>

                      <div className="space-y-3">
                        <div className={`flex justify-between items-center ${m.winnerId === teamA.id ? 'text-emerald-400 font-bold' : 'text-slate-200'}`}>
                          <div className="flex gap-2 items-center">
                            <span className="w-6 text-sm opacity-50">{teamA.code}</span>
                            <span className="text-sm truncate max-w-[120px]">{teamA.player1}</span>
                          </div>
                          {m.status === 'completed' && (
                            <span className="text-lg">{m.scores.filter(s=>s.a>s.b).length}</span>
                          )}
                        </div>
                        <div className={`flex justify-between items-center ${m.winnerId === teamB.id ? 'text-emerald-400 font-bold' : 'text-slate-200'}`}>
                          <div className="flex gap-2 items-center">
                            <span className="w-6 text-sm opacity-50">{teamB.code}</span>
                            <span className="text-sm truncate max-w-[120px]">{teamB.player1}</span>
                          </div>
                          {m.status === 'completed' && (
                            <span className="text-lg">{m.scores.filter(s=>s.b>s.a).length}</span>
                          )}
                        </div>
                      </div>

                      {m.status !== 'completed' && (
                        <div className="mt-4 pt-4 border-t border-slate-800">
                          <Button 
                            className="w-full text-xs py-1.5" 
                            variant={m.status === 'live' ? 'primary' : 'secondary'}
                            onClick={() => {
                              if(m.status === 'upcoming') {
                                dispatch({ type: 'UPDATE_MATCH', payload: { id: m.id, updates: { status: 'live' } }});
                              }
                              onNavigate('live', m.id);
                            }}
                          >
                            {m.status === 'live' ? 'Resume Scoring' : 'Live Scoring'}
                          </Button>
                          <Button 
                            className="w-full text-xs py-1.5 mt-2 bg-slate-800 hover:bg-slate-700 text-slate-300" 
                            onClick={() => setQuickScoreMatch(m)}
                          >
                            Quick Score Upload
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
      )}

      {/* Modals for Custom Match and Quick Score */}
      <Modal isOpen={isCreating} onClose={() => setIsCreating(false)} title="Create Custom Match">
        <form onSubmit={handleCreateCustomMatch} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Group / Stage</label>
            <select name="groupId" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500">
              <option value="A">Group A</option>
              <option value="B">Group B</option>
              <option value="KO">Knockout / Friendly</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Team 1</label>
              <select name="teamA" required className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500">
                <option value="">Select Team...</option>
                {state.teams.map(t => <option key={t.id} value={t.id}>{t.code} - {t.player1}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Team 2</label>
              <select name="teamB" required className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500">
                <option value="">Select Team...</option>
                {state.teams.map(t => <option key={t.id} value={t.id}>{t.code} - {t.player1}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Table</label>
              <input name="table" defaultValue="Table 1" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Date</label>
              <input name="date" type="date" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Time</label>
              <input name="time" type="time" defaultValue="10:00" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
            </div>
          </div>
          <Button type="submit" className="w-full mt-4">Create Match</Button>
        </form>
      </Modal>

      {quickScoreMatch && (
        <Modal isOpen={!!quickScoreMatch} onClose={() => setQuickScoreMatch(null)} title="Quick Score Upload">
          <form onSubmit={handleQuickScore} className="space-y-4">
            <div className="flex justify-between items-center text-sm font-bold text-slate-400 mb-2 px-4 border-b border-slate-800 pb-4">
              <span className="w-1/2 text-right pr-4 text-white">{state.teams.find(t=>t.id===quickScoreMatch.teamAId)?.code}</span>
              <span className="text-emerald-500">VS</span>
              <span className="w-1/2 text-left pl-4 text-white">{state.teams.find(t=>t.id===quickScoreMatch.teamBId)?.code}</span>
            </div>
            
            {Array.from({length: state.settings.bestOf}).map((_, i) => (
              <div key={i} className="flex gap-4 items-center justify-center">
                <span className="text-xs font-bold text-slate-500 w-12">Game {i+1}</span>
                <input type="number" name={`g${i}a`} className="w-20 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white text-center focus:outline-none focus:border-emerald-500" placeholder="0" />
                <span className="text-slate-500">-</span>
                <input type="number" name={`g${i}b`} className="w-20 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white text-center focus:outline-none focus:border-emerald-500" placeholder="0" />
              </div>
            ))}
            
            <Button type="submit" className="w-full mt-6" variant="primary">Save Match Result</Button>
          </form>
        </Modal>
      )}
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

  const handleScore = (team, delta) => {
    setCurrentGame(prev => ({
      ...prev,
      [team]: Math.max(0, prev[team] + delta)
    }));
  };

  const handleNextGame = () => {
    const newScores = [...scores, currentGame];
    setScores(newScores);
    setCurrentGame({ a: 0, b: 0 });
    dispatch({ type: 'UPDATE_MATCH', payload: { id: match.id, updates: { scores: newScores } } });
  };

  const handleFinishMatch = () => {
    let finalScores = [...scores];
    if (currentGame.a > 0 || currentGame.b > 0) {
      finalScores.push(currentGame);
    }
    
    const winnerLetter = getMatchWinner(finalScores, state.settings.bestOf, state.settings.pointsPerGame);
    let winnerId = null;
    if (winnerLetter === 'A') winnerId = teamA.id;
    if (winnerLetter === 'B') winnerId = teamB.id;

    dispatch({ 
      type: 'UPDATE_MATCH', 
      payload: { 
        id: match.id, 
        updates: { scores: finalScores, status: 'completed', winnerId } 
      } 
    });
    onBack();
  };

  const currentGamesA = scores.filter(s => checkGameWin(s.a, s.b, state.settings.pointsPerGame) && s.a > s.b).length;
  const currentGamesB = scores.filter(s => checkGameWin(s.a, s.b, state.settings.pointsPerGame) && s.b > s.a).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300">
          <ArrowRight className="rotate-180" size={20} />
        </button>
        <h2 className="text-2xl font-bold text-white flex-1">Live Match Scoring</h2>
        <span className="bg-red-500/10 text-red-500 px-3 py-1 rounded-full text-sm font-bold animate-pulse flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500"></span> LIVE
        </span>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 flex flex-col items-center">
          <h3 className="text-xl font-bold text-white text-center mb-1">{teamA.code}</h3>
          <p className="text-slate-400 text-sm text-center h-10">{teamA.player1} <br/> {teamA.player2}</p>
          <div className="text-sm font-bold text-emerald-500 mt-4 bg-emerald-500/10 px-4 py-1 rounded-full">
            GAMES WON: {currentGamesA}
          </div>
          <div className="text-[120px] leading-none font-black text-white my-8 select-none">
            {currentGame.a}
          </div>
          <div className="flex gap-4 w-full">
            <button onClick={() => handleScore('a', -1)} className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl text-2xl font-bold text-slate-300 active:scale-95 transition-all">-</button>
            <button onClick={() => handleScore('a', 1)} className="flex-[3] py-4 bg-emerald-600 hover:bg-emerald-500 rounded-2xl text-4xl font-bold text-white shadow-xl shadow-emerald-900/20 active:scale-95 transition-all">+</button>
          </div>
        </div>

        <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 flex flex-col items-center">
          <h3 className="text-xl font-bold text-white text-center mb-1">{teamB.code}</h3>
          <p className="text-slate-400 text-sm text-center h-10">{teamB.player1} <br/> {teamB.player2}</p>
          <div className="text-sm font-bold text-emerald-500 mt-4 bg-emerald-500/10 px-4 py-1 rounded-full">
            GAMES WON: {currentGamesB}
          </div>
          <div className="text-[120px] leading-none font-black text-white my-8 select-none">
            {currentGame.b}
          </div>
          <div className="flex gap-4 w-full">
             <button onClick={() => handleScore('b', 1)} className="flex-[3] py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl text-4xl font-bold text-white shadow-xl shadow-blue-900/20 active:scale-95 transition-all">+</button>
             <button onClick={() => handleScore('b', -1)} className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl text-2xl font-bold text-slate-300 active:scale-95 transition-all">-</button>
          </div>
        </div>
      </div>

      <Card className="flex flex-col items-center">
        <h4 className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-4">Previous Games</h4>
        <div className="flex gap-4">
          {scores.map((s, i) => (
            <div key={i} className="flex flex-col items-center bg-slate-800 rounded-lg p-3 min-w-[80px]">
              <span className="text-xs text-slate-500 font-bold mb-1">G{i+1}</span>
              <div className="font-mono font-bold text-lg text-white">{s.a} - {s.b}</div>
            </div>
          ))}
          {scores.length === 0 && <div className="text-slate-600 italic">No games completed yet.</div>}
        </div>
      </Card>

      <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-800">
        <Button onClick={handleNextGame} variant="secondary" className="flex-1 py-4 text-lg">
          Finish Game & Next
        </Button>
        <Button onClick={handleFinishMatch} variant="primary" className="flex-1 py-4 text-lg bg-emerald-600 text-white">
          Complete Match
        </Button>
      </div>
    </div>
  );
};

const StandingsTable = ({ group, title }) => {
  const { state } = useContext(TournamentContext);
  const teams = state.teams.filter(t => t.group === group);
  const standings = useMemo(() => calculateGroupStandings(teams, state.matches, state.settings), [teams, state.matches, state.settings]);

  return (
    <Card className="overflow-x-auto p-0">
      <div className="p-4 border-b border-slate-800 bg-slate-900/80">
        <h3 className="font-black text-xl text-white">{title}</h3>
      </div>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-900 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
            <th className="p-4 font-semibold w-12 text-center">Pos</th>
            <th className="p-4 font-semibold">Team</th>
            <th className="p-4 font-semibold text-center" title="Matches Played">MP</th>
            <th className="p-4 font-semibold text-center" title="Wins">W</th>
            <th className="p-4 font-semibold text-center" title="Losses">L</th>
            <th className="p-4 font-semibold text-center hidden md:table-cell" title="Games Won">GW</th>
            <th className="p-4 font-semibold text-center hidden md:table-cell" title="Games Lost">GL</th>
            <th className="p-4 font-semibold text-center" title="Game Difference">GD</th>
            <th className="p-4 font-semibold text-center text-emerald-400">PTS</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/50">
          {standings.map((team, idx) => (
            <tr key={team.id} className={`transition-colors hover:bg-slate-800/30 ${idx < 2 ? 'bg-emerald-900/5' : ''}`}>
              <td className="p-4 text-center">
                {idx === 0 ? <span className="inline-flex w-6 h-6 items-center justify-center bg-yellow-500/20 text-yellow-500 rounded-full font-bold text-sm">1</span> :
                 idx === 1 ? <span className="inline-flex w-6 h-6 items-center justify-center bg-slate-300/20 text-slate-300 rounded-full font-bold text-sm">2</span> :
                 <span className="text-slate-500 font-bold">{idx + 1}</span>}
              </td>
              <td className="p-4">
                <div className="font-bold text-white">{team.code}</div>
                <div className="text-xs text-slate-400 whitespace-nowrap">{team.player1} <span className="opacity-50">/</span> {team.player2}</div>
              </td>
              <td className="p-4 text-center text-slate-300">{team.MP}</td>
              <td className="p-4 text-center text-emerald-400 font-medium">{team.W}</td>
              <td className="p-4 text-center text-red-400 font-medium">{team.L}</td>
              <td className="p-4 text-center text-slate-400 hidden md:table-cell">{team.GW}</td>
              <td className="p-4 text-center text-slate-400 hidden md:table-cell">{team.GL}</td>
              <td className="p-4 text-center font-mono text-slate-300">{team.GD > 0 ? `+${team.GD}` : team.GD}</td>
              <td className="p-4 text-center font-black text-white text-lg">{team.PTS}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
};

const Standings = () => (
  <div className="space-y-8">
    <h2 className="text-2xl font-bold text-white mb-6">Tournament Standings</h2>
    <div className="grid lg:grid-cols-2 gap-8">
      <StandingsTable group="A" title="GROUP A" />
      <StandingsTable group="B" title="GROUP B" />
    </div>
  </div>
);

const KnockoutBracket = ({ onNavigate }) => {
  const { state, dispatch, dbUser } = useContext(TournamentContext);
  const dialog = useDialog();
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  
  const handleGenerate = () => {
    const stA = calculateGroupStandings(state.teams.filter(t=>t.group==='A'), state.matches, state.settings);
    const stB = calculateGroupStandings(state.teams.filter(t=>t.group==='B'), state.matches, state.settings);
    
    if(stA.length < 2 || stB.length < 2) {
      dialog.alert("Not Ready", "Not enough teams have played in groups to generate knockouts!");
      return;
    }
    dialog.confirm("Generate Knockouts?", "Make sure group stages are fully complete.", () => dispatch({ type: 'GENERATE_KNOCKOUTS' }));
  };

  const publishToCloud = async (winnerTeam, runnerUpTeam) => {
    if (!dbUser) {
      dialog.alert("Error", "You must be connected to the cloud to publish.");
      return;
    }
    setIsSaving(true);
    try {
      const ref = collection(db, 'artifacts', appId, 'public', 'data', 'past_tournaments');
      await addDoc(ref, {
        tournamentName: state.settings.tournamentName,
        date: new Date().toISOString(),
        winner: { code: winnerTeam.code, p1: winnerTeam.player1, p2: winnerTeam.player2 },
        runnerUp: { code: runnerUpTeam.code, p1: runnerUpTeam.player1, p2: runnerUpTeam.player2 },
        createdAt: Date.now()
      });
      setSaved(true);
      dialog.alert("Success!", "Tournament published to the Hall of Fame successfully.");
    } catch (e) {
      console.error(e);
      dialog.alert("Error", "Failed to publish to cloud database.");
    }
    setIsSaving(false);
  };

  const sf1 = state.matches.find(m => m.id === state.knockout.sf1);
  const sf2 = state.matches.find(m => m.id === state.knockout.sf2);
  const finalMatch = state.matches.find(m => m.id === state.knockout.final);

  let grandWinner = null;
  let runnerUp = null;
  if (finalMatch?.winnerId) {
    grandWinner = state.teams.find(t => t.id === finalMatch.winnerId);
    runnerUp = state.teams.find(t => t.id === (finalMatch.teamAId === finalMatch.winnerId ? finalMatch.teamBId : finalMatch.teamAId));
  }

  const MatchBox = ({ match, title }) => {
    if (!match) return (
      <div className="bg-slate-900 border-2 border-dashed border-slate-800 rounded-xl p-4 w-64 h-24 flex items-center justify-center text-slate-500 font-bold text-sm">
        TBD
      </div>
    );
    const tA = state.teams.find(t=>t.id===match.teamAId);
    const tB = state.teams.find(t=>t.id===match.teamBId);
    const isClickable = match.teamAId && match.teamBId;
    return (
      <div className={`bg-slate-900 border ${isClickable ? 'border-slate-700 hover:border-emerald-500 cursor-pointer shadow-lg' : 'border-slate-800 opacity-70'} rounded-xl p-3 w-64 transition-colors`}
        onClick={() => isClickable && onNavigate('live', match.id)}
      >
        <div className="text-[10px] text-slate-500 font-bold uppercase mb-2 text-center">{title}</div>
        <div className={`flex justify-between p-1 rounded ${match.teamAId && match.winnerId === match.teamAId ? 'bg-emerald-500/20 text-emerald-400 font-bold' : 'text-slate-300'}`}>
          <span className="truncate pr-2">{tA ? `${tA.code} (${tA.player1})` : 'TBD'}</span>
        </div>
        <div className="h-px bg-slate-800 my-1"></div>
        <div className={`flex justify-between p-1 rounded ${match.teamBId && match.winnerId === match.teamBId ? 'bg-emerald-500/20 text-emerald-400 font-bold' : 'text-slate-300'}`}>
          <span className="truncate pr-2">{tB ? `${tB.code} (${tB.player1})` : 'TBD'}</span>
        </div>
      </div>
    )
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Knockout Stage</h2>
        <Button onClick={handleGenerate} icon={Swords}>Generate Bracket</Button>
      </div>

      <div className="overflow-x-auto pb-12">
        <div className="min-w-[800px] flex justify-center items-center gap-12 mt-12">
          {/* Semifinals */}
          <div className="flex flex-col gap-16 relative">
            <MatchBox match={sf1} title="Semifinal 1 (A1 vs B2)" />
            <MatchBox match={sf2} title="Semifinal 2 (B1 vs A2)" />
            {(sf1 || sf2) && (
              <svg className="absolute left-full top-0 w-12 h-full pointer-events-none -z-10 text-slate-700">
                 <path d="M0,48 L24,48 L24,176 L0,176" fill="none" stroke="currentColor" strokeWidth="2" />
                 <path d="M24,112 L48,112" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            )}
          </div>
          {/* Finals */}
          <div className="flex flex-col justify-center">
            <div className="flex flex-col items-center relative">
              <Trophy className={`mb-4 transition-all duration-1000 ${finalMatch?.winnerId ? 'text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)] scale-125' : 'text-yellow-700/50'}`} size={48} />
              <MatchBox match={finalMatch} title="GRAND FINAL" />
              
              {grandWinner && (
                <div className="absolute top-full mt-4 text-center animate-in fade-in slide-in-from-top-4 flex flex-col items-center gap-4">
                  <div>
                    <div className="text-yellow-400 font-black text-xl">CHAMPIONS</div>
                    <div className="text-white font-bold">{grandWinner.player1} & {grandWinner.player2}</div>
                  </div>
                  {!saved ? (
                    <Button onClick={() => publishToCloud(grandWinner, runnerUp)} icon={UploadCloud} variant="primary" disabled={isSaving}>
                      {isSaving ? "Saving..." : "Publish to Hall of Fame"}
                    </Button>
                  ) : (
                    <span className="text-emerald-400 font-bold flex items-center gap-2"><Check size={16}/> Saved to Hall of Fame</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const HallOfFame = () => {
  const { dbUser } = useContext(TournamentContext);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dbUser) return;
    const ref = collection(db, 'artifacts', appId, 'public', 'data', 'past_tournaments');
    const q = query(ref);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort client-side to avoid needing complex Firestore indexes
      data.sort((a, b) => b.createdAt - a.createdAt);
      setHistory(data);
      setLoading(false);
    }, (error) => {
      console.error("Firestore read error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [dbUser]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <header className="mb-8 text-center flex flex-col items-center">
        <Medal className="text-yellow-500 mb-4" size={48} />
        <h2 className="text-3xl font-black text-white tracking-tight uppercase">Hall of Fame</h2>
        <p className="text-slate-400 mt-2">Past Tournament Champions</p>
      </header>

      {loading ? (
        <div className="text-center text-slate-500 py-12 animate-pulse">Loading legends...</div>
      ) : history.length === 0 ? (
        <Card className="text-center py-12 text-slate-500">
          No tournaments published yet. Complete a tournament and publish it to see it here!
        </Card>
      ) : (
        <div className="grid gap-6">
          {history.map(tourney => (
            <div key={tourney.id} className="relative bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-6 overflow-hidden shadow-xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-bl-full -mr-12 -mt-12 pointer-events-none"></div>
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                <div>
                  <div className="text-emerald-400 font-bold text-sm tracking-wider mb-1">
                    {new Date(tourney.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                  <h3 className="text-2xl font-black text-white">{tourney.tournamentName}</h3>
                </div>
                
                <div className="flex gap-8">
                  <div className="text-right">
                    <div className="text-xs text-slate-400 uppercase font-bold mb-1">Champions</div>
                    <div className="text-yellow-400 font-bold text-lg flex items-center justify-end gap-2">
                       <Trophy size={16} /> {tourney.winner.code}
                    </div>
                    <div className="text-white text-sm">{tourney.winner.p1} & {tourney.winner.p2}</div>
                  </div>
                  <div className="w-px bg-slate-700"></div>
                  <div className="text-left">
                    <div className="text-xs text-slate-400 uppercase font-bold mb-1">Runner Up</div>
                    <div className="text-slate-300 font-bold text-lg">{tourney.runnerUp.code}</div>
                    <div className="text-slate-400 text-sm">{tourney.runnerUp.p1} & {tourney.runnerUp.p2}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Teams = () => {
  const { state, dispatch } = useContext(TournamentContext);
  const dialog = useDialog();
  const [editingTeam, setEditingTeam] = useState(null);

  const handleSave = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const teamData = {
      id: editingTeam.id || crypto.randomUUID(),
      code: fd.get('code'),
      player1: fd.get('player1'),
      player2: fd.get('player2'),
      group: fd.get('group'),
      seed: parseInt(fd.get('seed')) || 0
    };

    if (editingTeam.id) {
      dispatch({ type: 'UPDATE_TEAM', payload: teamData });
    } else {
      dispatch({ type: 'ADD_TEAM', payload: teamData });
    }
    setEditingTeam(null);
  };

  const handleDelete = (teamId) => {
    dialog.confirm("Delete Team?", "Are you sure you want to remove this team?", () => dispatch({type:'DELETE_TEAM', payload: teamId}), true);
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Teams Roster</h2>
        <Button onClick={() => setEditingTeam({})} icon={Plus}>Add Team</Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {state.teams.map(team => (
          <Card key={team.id} className="relative group hover:border-emerald-500/50 transition-colors">
            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => setEditingTeam(team)} className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"><Edit2 size={14}/></button>
              <button onClick={() => handleDelete(team.id)} className="p-1.5 bg-red-900/20 hover:bg-red-900/40 text-red-400 rounded"><Trash2 size={14}/></button>
            </div>
            
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center font-black text-white">
                {team.code}
              </div>
              <div>
                <div className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Group {team.group}</div>
                <div className="text-[10px] text-slate-500">Seed {team.seed}</div>
              </div>
            </div>
            <div className="space-y-1">
              <div className="font-semibold text-slate-200">{team.player1}</div>
              <div className="text-xs text-slate-500">+</div>
              <div className="font-semibold text-slate-200">{team.player2}</div>
            </div>
          </Card>
        ))}
      </div>

      <Modal isOpen={!!editingTeam} onClose={() => setEditingTeam(null)} title={editingTeam?.id ? 'Edit Team' : 'New Team'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Team Code</label>
              <input name="code" defaultValue={editingTeam?.code} required className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Group</label>
              <select name="group" defaultValue={editingTeam?.group || 'A'} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500">
                <option value="A">Group A</option>
                <option value="B">Group B</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Player 1</label>
            <input name="player1" defaultValue={editingTeam?.player1} required className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Player 2</label>
            <input name="player2" defaultValue={editingTeam?.player2} required className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
          </div>
          <div>
             <label className="block text-xs font-bold text-slate-400 mb-1">Seed</label>
             <input name="seed" type="number" defaultValue={editingTeam?.seed || 0} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
          </div>
          <Button type="submit" className="w-full mt-6">Save Team</Button>
        </form>
      </Modal>
    </div>
  );
};

const Settings = () => {
  const { state, dispatch } = useContext(TournamentContext);
  const dialog = useDialog();

  const handleSave = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const updates = {
      tournamentName: fd.get('tournamentName'),
      bestOf: parseInt(fd.get('bestOf')),
      pointsPerGame: parseInt(fd.get('pointsPerGame')),
      matchDuration: parseInt(fd.get('matchDuration')),
    };
    dispatch({ type: 'UPDATE_SETTINGS', payload: updates });
    dialog.alert("Success", "Settings saved successfully!");
  };

  const handleReset = () => {
    dialog.confirm(
      "Factory Reset", 
      "Are you absolutely sure? This will erase all teams, matches, and scores, resetting everything to defaults.", 
      () => {
        dispatch({ type: 'RESET_ALL' });
        localStorage.removeItem('smashfest_state');
        window.location.reload();
      }, 
      true
    );
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `smashfest_backup_${new Date().getTime()}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedState = JSON.parse(event.target.result);
        dialog.confirm("Import Tournament?", "Overwrite the current tournament completely with this file?", () => {
           dispatch({ type: 'LOAD', payload: importedState });
        }, true);
      } catch (err) {
        dialog.alert("Error", "Invalid tournament file.");
      }
    };
    reader.readAsText(file);
    e.target.value = ''; 
  };

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold text-white mb-6">Tournament Settings</h2>
      
      <Card className="mb-8">
        <form onSubmit={handleSave} className="space-y-6">
          <h3 className="text-emerald-500 font-bold border-b border-slate-800 pb-2 mb-4">Match Rules</h3>
          
          <div>
            <label className="block text-sm font-bold text-slate-400 mb-2">Tournament Name</label>
            <input type="text" name="tournamentName" defaultValue={state.settings.tournamentName} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white" />
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-400 mb-2">Match Format</label>
              <select name="bestOf" defaultValue={state.settings.bestOf} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white">
                <option value="3">Best of 3</option>
                <option value="5">Best of 5</option>
                <option value="7">Best of 7</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-400 mb-2">Points per Game</label>
              <input type="number" name="pointsPerGame" defaultValue={state.settings.pointsPerGame} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-400 mb-2">Allocated Match Time (mins)</label>
              <input type="number" name="matchDuration" defaultValue={state.settings.matchDuration} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white" />
            </div>
          </div>
          <Button type="submit" icon={Save}>Save Settings</Button>
        </form>
      </Card>

      <Card className="mt-8 border-blue-500/20 bg-blue-500/5">
        <h3 className="text-blue-500 font-bold flex items-center gap-2 mb-4">Local Backup & Restore</h3>
        <p className="text-slate-400 text-sm mb-4">Save the current tournament state to a JSON file on your computer, or load a previous file.</p>
        <div className="flex gap-4">
          <Button onClick={handleExport} variant="secondary">Export JSON</Button>
          <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all active:scale-95 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700">
             Import JSON
             <input type="file" accept=".json" className="hidden" onChange={handleImport} />
          </label>
        </div>
      </Card>

      <Card className="mt-8 border-red-500/20 bg-red-500/5">
        <h3 className="text-red-500 font-bold flex items-center gap-2 mb-4"><AlertTriangle size={18}/> Danger Zone</h3>
        <p className="text-slate-400 text-sm mb-4">This will erase all teams, matches, and scores, resetting everything to the default Smastfest '26 template.</p>
        <Button onClick={handleReset} variant="danger">Factory Reset Tournament</Button>
      </Card>
    </div>
  );
}

const AppLayout = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeMatchId, setActiveMatchId] = useState(null); 

  const handleNavigate = (tab, matchId = null) => {
    setActiveTab(tab);
    if(matchId) setActiveMatchId(matchId);
  };

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'fixtures', icon: CalendarDays, label: 'Fixtures' },
    { id: 'standings', icon: Trophy, label: 'Standings' },
    { id: 'knockout', icon: Swords, label: 'Knockout' },
    { id: 'teams', icon: Users, label: 'Teams' },
    { id: 'history', icon: History, label: 'Hall of Fame' },
    { id: 'settings', icon: SettingsIcon, label: 'Settings' },
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-slate-300 font-sans selection:bg-emerald-500/30">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-800 bg-slate-950/50">
        <div className="p-6">
          <div className="flex items-center gap-3 text-emerald-500 font-black text-xl tracking-tighter">
            <Shield size={28} className="text-emerald-500" />
            SMASHFEST
          </div>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto pb-6">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive ? 'bg-emerald-500/10 text-emerald-400 font-bold' : 'hover:bg-slate-900 text-slate-400 hover:text-white font-medium'
                }`}
              >
                <Icon size={20} />
                {item.label}
              </button>
            )
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-24 md:pb-0 relative">
        <div className="max-w-6xl mx-auto p-4 md:p-8">
          {activeTab === 'dashboard' && <Dashboard onNavigate={handleNavigate} />}
          {activeTab === 'fixtures' && <Fixtures onNavigate={handleNavigate} />}
          {activeTab === 'standings' && <Standings />}
          {activeTab === 'knockout' && <KnockoutBracket onNavigate={handleNavigate} />}
          {activeTab === 'teams' && <Teams />}
          {activeTab === 'history' && <HallOfFame />}
          {activeTab === 'settings' && <Settings />}
          {activeTab === 'live' && <LiveScoring matchId={activeMatchId} onBack={() => handleNavigate('fixtures')} />}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-950 border-t border-slate-800 flex justify-around p-2 pb-safe z-50 overflow-x-auto">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
             <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`flex-shrink-0 flex flex-col items-center p-2 rounded-lg min-w-[64px] ${isActive ? 'text-emerald-400' : 'text-slate-500'}`}
             >
                <Icon size={20} />
                <span className="text-[10px] mt-1 font-medium">{item.label}</span>
             </button>
          )
        })}
      </div>
    </div>
  );
};

export default function App() {
  return (
    <DialogProvider>
      <TournamentProvider>
        <AppLayout />
      </TournamentProvider>
    </DialogProvider>
  );
}
