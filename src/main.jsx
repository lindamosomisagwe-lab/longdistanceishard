import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { 
    Home, Activity, Smile, BookOpen, Music, Calendar, 
    Bell, Image as ImageIcon, ChevronLeft, ChevronRight, Plus, Moon,
    User, Heart, Sparkles, Target, Cloud, Star, LogOut
} from 'lucide-react';
import { defaultState, CATEGORIES } from './constants';
import AuthScreen from './pages/AuthScreen';
import PairingScreen from './pages/PairingScreen';
import SettingsModal from './components/SettingsModal';

// FIREBASE
import { auth, db } from './firebase';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut 
} from 'firebase/auth';
import { 
    ref, get, set, update, onValue 
} from 'firebase/database';

// Extracted to external files;

// --- ECHOES OVERLAY ---
const EchoesOverlay = React.memo(({ moods, view }) => {
    const otherPartner = view === 'A' ? 'B' : 'A';
    const recentEchoes = (moods || []).filter(m => m.partner === otherPartner && m.note).slice(0, 3);

    return (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
            {recentEchoes.map((echo, i) => (
                <div key={echo.id} className="echo-text" style={{ top: `${20 + (i * 25)}%`, animationDelay: `${i * 15}s` }}>
                    {echo.note}
                </div>
            ))}
        </div>
    );
});

// --- COMPONENTS ---
const Sidebar = React.memo(({ activePage, setActivePage, view, isReEntry, spaceId, relationship }) => {
    const cycleUser = relationship.cycleUser || 'A';
    let navItems = [
        { id: 'orbital', label: 'Our Space', icon: <Star size={18} /> },
        { id: 'balance', label: 'Our Rhythm', icon: <Activity size={18} /> },
        { id: 'mood', label: 'Heartbeats', icon: <Heart size={18} /> },
        { id: 'goals', label: 'Future Dreams', icon: <Cloud size={18} /> },
        { id: 'journal', label: 'Scrapbook', icon: <BookOpen size={18} /> },
        { id: 'soundtrack', label: 'Soundtrack', icon: <Music size={18} /> },
    ];
    if (cycleUser !== 'None' && view === cycleUser) navItems.push({ id: 'cycle', label: 'Soft Care', icon: <Calendar size={18} /> });

    return (
        <aside className="w-full md:w-64 shrink-0 flex flex-col gap-6 relative z-10">
            <div className={`glass-panel p-6 flex flex-col h-full relative ${isReEntry ? 'border-indigo-500/30' : ''}`}>
                <div className="flex items-center gap-3 mb-10">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(255,255,255,0.1)] border border-white/20">
                        <Moon size={20} className="text-white" />
                    </div>
                    <div>
                        <h2 className="font-bold text-sm tracking-widest uppercase opacity-90 leading-tight">Between Us</h2>
                        <p className="text-[10px] opacity-60">CODE: {spaceId}</p>
                    </div>
                </div>

                <nav className="flex flex-col gap-2 flex-1">
                    {navItems.map(item => (
                        <button key={item.id} onClick={() => setActivePage(item.id)} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition font-medium text-sm text-left ${activePage === item.id ? 'bg-white/10 text-white border border-white/20' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}>
                            {item.icon} {item.label}
                        </button>
                    ))}
                </nav>

                <div className="mt-auto flex flex-col gap-2">
                    {isReEntry && <div className="mb-4 text-center text-xs font-bold text-indigo-200 bg-indigo-900/40 py-3 rounded-xl border border-indigo-500/30">The Warmth is active.</div>}
                    <button onClick={() => signOut(auth)} className="flex items-center justify-center gap-2 text-xs text-center opacity-40 hover:opacity-100 transition uppercase tracking-widest mt-4">
                        <LogOut size={14}/> Sign Out
                    </button>
                </div>
            </div>
        </aside>
    );
});

// SettingsModal extracted

const Header = React.memo(({ view, distance, isReEntry, spaceId, relationship, updateData }) => {
    const [showSettings, setShowSettings] = useState(false);
    
    const myName = view === 'A' ? relationship.nameA : relationship.nameB;
    const partnerName = view === 'A' ? relationship.nameB : relationship.nameA;
    
    const displayName = myName ? myName : `Partner ${view}`;
    const displayPartner = partnerName ? partnerName : `Partner ${view === 'A' ? 'B' : 'A'}`;
    const needsSetup = !relationship.nameA || !relationship.nameB;

    return (
        <>
            {(showSettings || needsSetup) && <SettingsModal relationship={relationship} updateData={updateData} close={() => setShowSettings(false)} />}
            <header className="glass-panel px-6 py-4 flex flex-col md:flex-row justify-between items-center mb-6 gap-4 relative z-10">
                <div className="flex items-center gap-4">
                    <button onClick={() => setShowSettings(true)} className={`w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 hover:bg-white/10 transition ${needsSetup ? 'animate-pulse border-brand-accent' : ''}`}>
                        <User size={16} className={needsSetup ? 'text-brand-accent' : 'text-white/60'} />
                    </button>
                    <div>
                        <p className="text-[10px] uppercase tracking-widest font-bold opacity-60 text-brand-accent">Connected with {displayPartner}</p>
                        <p className="text-sm font-medium">Logged in as <span className="font-semibold text-white/90">{displayName}</span></p>
                    </div>
                </div>

                {!relationship.partnerB && view === 'A' && (
                    <div className="flex-1 max-w-md mx-4 animate-pulse bg-brand-accent/20 border border-brand-accent text-brand-accent px-4 py-2 rounded-xl text-center">
                        <span className="font-bold text-sm tracking-widest uppercase block mb-1">Waiting for Partner B</span>
                        <span className="text-xs">Give them this Connection Code to join: <strong className="text-lg tracking-widest bg-black/40 px-3 py-1 rounded ml-2">{spaceId}</strong></span>
                    </div>
                )}

                <div className="flex gap-6 text-xs font-bold tracking-wider opacity-80">
                    {isReEntry ? (
                        <span className="flex items-center gap-2 text-indigo-300"><Moon size={14}/> THE AFTERGLOW</span>
                    ) : (
                        <span className="flex items-center gap-2"><Heart size={14} className="text-brand-accent"/> {Math.floor(distance).toLocaleString()} KM APART • CONNECTED</span>
                    )}
                </div>
            </header>
        </>
    );
});

// --- TAB PAGES ---

const PoeticStatus = React.memo(({ view, relationship }) => {
    const otherPartner = view === 'A' ? 'B' : 'A';
    const moods = (relationship.moods || []).filter(m => m.partner === otherPartner);
    const lastMood = moods.length > 0 ? moods[0].mood.toLowerCase() : 'quiet';
    
    const meals = otherPartner === 'A' ? relationship.meals_a : relationship.meals_b;
    const mealsEaten = Object.keys(meals).filter(k => meals[k]).length;
    const mealStatus = mealsEaten === 0 ? "hasn't eaten yet today" : (mealsEaten === 3 ? "is well-fed today" : "has had some food today");

    const cycleUser = relationship.cycleUser || 'A';
    const cycleData = relationship.partnerA_cycleData || defaultState.partnerA_cycleData;
    let cycleStatus = "";
    if (cycleUser !== 'None' && otherPartner === cycleUser) {
        if (cycleData.needSpace) cycleStatus = " and is hoping for a quiet day.";
        else if (cycleData.sendSnacks) cycleStatus = " and requested soft snacks.";
        else if (cycleData.symptoms.length > 0) cycleStatus = ` and is experiencing ${cycleData.symptoms[0].toLowerCase()}.`;
    }

    const otherName = otherPartner === 'A' ? relationship.nameA : relationship.nameB;
    const pronoun = otherName ? otherName : (otherPartner === 'A' ? 'She' : 'He');

    return (
        <div className="mb-8 p-4 bg-white/5 border border-white/10 rounded-2xl italic font-serif text-lg leading-relaxed text-blue-100 shadow-inner">
            "{pronoun} is feeling {lastMood} right now. {pronoun} {mealStatus}{cycleStatus}"
        </div>
    );
});

const OurSpace = React.memo(({ distance, setDistance, harmony, setCoreg, view, relationship, updateData, isReEntry }) => {
    const [isSyncing, setIsSyncing] = useState(false);
    const syncInterval = useRef(null);
    const drainInterval = useRef(null);
    const canvasRef = useRef(null);
    const liftInterval = useRef(null);
    const inertia = isReEntry ? '3s' : '0.5s';

    const getMoodAura = (partnerId) => {
        const partnerMoods = (relationship.moods || []).filter(m => m.partner === partnerId);
        if (partnerMoods.length === 0) return { isHeavy: false, filter: `blur(${isReEntry ? '8px' : '4px'})`, drift: 0 };
        const lastMood = partnerMoods[0].mood; 
        if (lastMood === 'Stressed' || lastMood === 'Tired' || lastMood === 'Sad') {
            return { isHeavy: true, filter: 'blur(12px)', drift: 10 };
        }
        return { isHeavy: false, filter: `blur(${isReEntry ? '8px' : '4px'})`, drift: 0 };
    };

    const auraA = getMoodAura('A');
    const auraB = getMoodAura('B');
    const otherPartnerAura = view === 'A' ? auraB : auraA;

    const startLifting = (partnerId) => {
        clearInterval(liftInterval.current);
        liftInterval.current = setInterval(() => {
            const currentForce = relationship.liftForce[partnerId];
            if (currentForce < 100) {
                updateData({ liftForce: { ...relationship.liftForce, [partnerId]: currentForce + 5 } });
            }
        }, 100);
    };

    const stopLifting = (partnerId) => {
        clearInterval(liftInterval.current);
    };

    useEffect(() => {
        const t = setInterval(() => {
            if (relationship.liftForce.A > 0 || relationship.liftForce.B > 0) {
                updateData({ 
                    liftForce: { A: Math.max(0, relationship.liftForce.A - 1), B: Math.max(0, relationship.liftForce.B - 1) } 
                });
            }
        }, 500);
        return () => clearInterval(t);
    }, [relationship.liftForce]);

    const getVerticalOffset = (partnerId, isHeavy) => {
        if (!isHeavy) return '50%';
        const force = relationship.liftForce[partnerId];
        return `calc(80% - ${(force / 100) * 30}%)`;
    };

    useEffect(() => {
        if (isSyncing) {
            clearInterval(drainInterval.current);
            syncInterval.current = setInterval(() => {
                setCoreg(prev => Math.min(100, prev + 1));
                setDistance(prev => Math.max(0, prev - 10));
            }, 50);
        } else {
            clearInterval(syncInterval.current);
            drainInterval.current = setInterval(() => {
                setCoreg(prev => Math.max(0, prev - 0.2));
                setDistance(prev => Math.min(relationship.baseDistance || 6400, prev + 1));
            }, 200);
        }
        return () => { clearInterval(syncInterval.current); clearInterval(drainInterval.current); };
    }, [isSyncing, relationship.baseDistance]);

    const meals = view === 'A' ? relationship.meals_a : relationship.meals_b;
    const toggleMeal = (meal) => updateData({ [view === 'A' ? 'meals_a' : 'meals_b']: { ...meals, [meal]: !meals[meal] } });

    let sphereDist = 40 - (harmony * 0.35);
    const partnerAData = relationship.partnerA_cycleData || defaultState.partnerA_cycleData;

    return (
        <div className="flex flex-col lg:flex-row gap-6 relative z-10">
            <div className="flex-1 glass-panel p-6 flex flex-col relative">
                
                {view === 'A' && relationship.liftForce.A > 20 && auraA.isHeavy && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-sm font-serif italic text-brand-accent animate-pulse pointer-events-none z-50">He is holding your star right now.</div>}
                {view === 'B' && relationship.liftForce.B > 20 && auraB.isHeavy && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-sm font-serif italic text-brand-accent animate-pulse pointer-events-none z-50">She is holding your star right now.</div>}

                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h3 className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-1">The Night Canvas</h3>
                        <h2 className="text-2xl font-serif text-brand-accent">Look up, we share the same sky</h2>
                    </div>
                </div>

                {/* The Living Paragraph */}
                <PoeticStatus view={view} relationship={relationship} />

                {/* Canvas Area with Ambient Weather */}
                <div 
                    ref={canvasRef}
                    className="relative w-full h-80 rounded-2xl overflow-hidden border border-white/10 mb-6 flex items-center justify-center bg-black/20"
                    style={{ '--inertia': inertia }}
                >
                    {/* Ambient Weather Rain */}
                    {otherPartnerAura.isHeavy && (
                        <div className="heavy-atmosphere">
                            {[...Array(20)].map((_, i) => (
                                <div key={i} className="rain-drop" style={{ left: `${Math.random()*100}%`, animationDelay: `${Math.random()*2}s` }}></div>
                            ))}
                        </div>
                    )}

                    <div className="absolute top-4 left-4 text-xs font-bold opacity-60 z-30 flex items-center gap-2">
                        {isReEntry && <Moon size={14} className="text-indigo-300"/>}
                        {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • {Math.floor(distance).toLocaleString()} KM
                    </div>
                    
                    {!(auraA.isHeavy && relationship.liftForce.A < 80) && !(auraB.isHeavy && relationship.liftForce.B < 80) && (
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-px bg-white/20 z-10" style={{ width: `calc(${(sphereDist*2) + auraA.drift + auraB.drift}% + 3rem)`, transition: `all ${inertia} ease` }}></div>
                    )}

                    <div 
                        className={`celestial-star star-a w-6 h-6 ${view === 'B' && auraA.isHeavy ? 'cursor-grab active:cursor-grabbing' : ''}`} 
                        style={{ left: `calc(50% - 0.75rem - ${sphereDist + auraA.drift}%)`, top: getVerticalOffset('A', auraA.isHeavy), filter: auraA.filter, opacity: auraA.isHeavy ? 0.3 + (relationship.liftForce.A/100)*0.7 : 1 }}
                        onMouseDown={() => view === 'B' && auraA.isHeavy && startLifting('A')} onMouseUp={() => view === 'B' && stopLifting('A')} onMouseLeave={() => view === 'B' && stopLifting('A')}
                        onTouchStart={() => view === 'B' && auraA.isHeavy && startLifting('A')} onTouchEnd={() => view === 'B' && stopLifting('A')}
                    ></div>
                    
                    <div 
                        className={`celestial-star star-b w-6 h-6 ${view === 'A' && auraB.isHeavy ? 'cursor-grab active:cursor-grabbing' : ''}`} 
                        style={{ right: `calc(50% - 0.75rem - ${sphereDist + auraB.drift}%)`, top: getVerticalOffset('B', auraB.isHeavy), filter: auraB.filter, opacity: auraB.isHeavy ? 0.3 + (relationship.liftForce.B/100)*0.7 : 1 }}
                        onMouseDown={() => view === 'A' && auraB.isHeavy && startLifting('B')} onMouseUp={() => view === 'A' && stopLifting('B')} onMouseLeave={() => view === 'A' && stopLifting('B')}
                        onTouchStart={() => view === 'A' && auraB.isHeavy && startLifting('B')} onTouchEnd={() => view === 'A' && stopLifting('B')}
                    ></div>
                </div>

            </div>

            <div className="w-full lg:w-80 shrink-0 flex flex-col gap-6">
                {(relationship.cycleUser || 'A') !== 'None' && view !== (relationship.cycleUser || 'A') ? (
                    <div className="glass-panel p-6 flex flex-col border border-white/10 relative overflow-hidden">
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-sky-400/10 rounded-full blur-2xl pointer-events-none"></div>
                        <h3 className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-2 flex items-center gap-2"><Heart size={12} className="text-sky-300"/> Care Panel</h3>
                        
                        {(partnerAData.sendSnacks || partnerAData.needSpace || otherPartnerAura.isHeavy) ? (
                            <div className="flex flex-col items-center py-6">
                                {/* Proactive Care Orbit */}
                                <div 
                                    className="care-orbit"
                                    onMouseDown={() => updateData({ isThermalBlanketActive: true })}
                                    onMouseUp={() => updateData({ isThermalBlanketActive: false })}
                                    onMouseLeave={() => updateData({ isThermalBlanketActive: false })}
                                    onTouchStart={() => updateData({ isThermalBlanketActive: true })}
                                    onTouchEnd={() => updateData({ isThermalBlanketActive: false })}
                                >
                                    <Heart size={24} className="text-sky-300 mb-1"/>
                                    <span className="text-[10px] font-bold tracking-widest uppercase text-sky-200">Hold</span>
                                </div>
                                <p className="text-xs text-center mt-6 text-sky-100/80">They need support. Tap & hold to send a warm blanket.</p>
                            </div>
                        ) : (
                            <div className="text-center opacity-60 py-10 italic text-sm">Everything is calm right now.</div>
                        )}
                    </div>
                ) : (
                    <div className="glass-panel p-6 flex flex-col gap-4">
                        <div className="flex justify-between items-start mb-2">
                            <div><h3 className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-1">Gentle Check-in</h3><h2 className="text-lg font-serif">Have you eaten?</h2></div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {['breakfast', 'lunch', 'dinner'].map(m => (
                                <button key={m} onClick={() => toggleMeal(m)} className={`glass-card p-3 flex flex-col items-center justify-center gap-2 transition ${meals[m] ? 'bg-yellow-400/20 text-yellow-400 border-yellow-400/50 shadow-[0_0_15px_rgba(253,224,71,0.2)]' : 'hover:bg-white/10 border-transparent'}`}>
                                    <Activity size={16} className={meals[m] ? '' : 'opacity-50'}/>
                                    <span className="text-[10px] font-bold capitalize">{m}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                <div className="glass-panel p-6 flex-1 flex flex-col">
                    <h3 className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-4">Memory Polaroid</h3>
                    <div className="bg-[#FAF8F5] p-3 pb-12 rounded-xl flex-1 relative transform rotate-1 shadow-2xl flex flex-col items-center justify-center border border-white/10">
                        {relationship.memories.length > 0 ? (
                            <img src={relationship.memories[relationship.memories.length-1].url} className="w-full h-48 object-cover rounded-lg shadow-inner" />
                        ) : (
                            <div className="w-full h-48 bg-black/5 rounded-lg flex items-center justify-center"><ImageIcon className="opacity-20" size={48}/></div>
                        )}
                        <p className="absolute bottom-4 font-serif text-[#2F2E2C] text-sm text-center w-full">{relationship.memories[relationship.memories.length-1]?.caption || 'Suspended in time'}</p>
                    </div>
                </div>
            </div>
        </div>
    );
});

const FutureDreams = React.memo(({ relationship, updateData }) => {
    const [newGoal, setNewGoal] = useState('');
    const addGoal = () => {
        if (!newGoal) return;
        const goal = { id: Date.now(), text: newGoal, completed: false };
        updateData({ goals: [...relationship.goals, goal] });
        setNewGoal('');
    };
    const toggleGoal = (id, text) => {
        const goals = relationship.goals.map(g => {
            if (g.id === id) {
                if (!g.completed && (text.toLowerCase().includes('reunion') || text.toLowerCase().includes('visit') || text.toLowerCase().includes('trip'))) {
                    updateData({ reunionEndTime: Date.now() + (72 * 60 * 60 * 1000) });
                }
                return { ...g, completed: !g.completed };
            }
            return g;
        });
        updateData({ goals });
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full relative z-10">
            <div className="flex-1 glass-panel p-8">
                <h3 className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-2">The Horizon</h3>
                <h2 className="text-2xl font-serif text-brand-accent mb-8">Pin Future Dreams</h2>
                <div className="flex gap-4 mb-8">
                    <input type="text" placeholder="Plan Anniversary Trip..." className="glass-input flex-1" value={newGoal} onChange={e => setNewGoal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addGoal()} />
                    <button onClick={addGoal} className="glass-button accent px-6 py-3 font-bold"><Plus size={16}/></button>
                </div>
                <div className="flex flex-col gap-3">
                    {relationship.goals.map(g => (
                        <div key={g.id} className={`glass-card p-5 flex items-center justify-between transition ${g.completed ? 'opacity-50' : ''}`}>
                            <span className={`text-lg ${g.completed ? 'line-through opacity-70' : ''}`}>{g.text}</span>
                            <button onClick={() => toggleGoal(g.id, g.text)} className={`w-8 h-8 rounded-full flex items-center justify-center border transition ${g.completed ? 'bg-brand-accent border-brand-accent text-midnight-base' : 'border-white/20 hover:bg-white/10'}`}>
                                {g.completed && <Heart size={14} className="fill-current" />}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex-1 glass-panel p-8 flex items-center justify-center border border-white/5">
                <div className="text-center">
                    <Cloud size={48} className="mx-auto mb-4 opacity-50" />
                    <h3 className="font-serif text-xl mb-2">The Warmth Status</h3>
                    <p className="opacity-70 text-sm max-w-sm">Marking a 'Reunion Trip' triggers a 72-hour soft landing phase.</p>
                </div>
            </div>
        </div>
    );
});

const OurRhythm = React.memo(({ view, relationship, updateData }) => {
    const canvasRef = useRef(null);
    const chartRef = useRef(null);
    const scores = view === 'A' ? relationship.scores_a : relationship.scores_b;
    const partnerScores = view === 'A' ? relationship.scores_b : relationship.scores_a;
    const [localScores, setLocalScores] = useState(scores);

    useEffect(() => {
        setLocalScores(scores);
    }, [scores]);

    useEffect(() => {
        if (!canvasRef.current || !window.Chart) return;
        if (chartRef.current) chartRef.current.destroy();
        chartRef.current = new window.Chart(canvasRef.current.getContext('2d'), {
            type: 'radar',
            data: {
                labels: CATEGORIES,
                datasets: [
                    { label: `Partner ${view}`, data: localScores, backgroundColor: 'rgba(224, 242, 254, 0.2)', borderColor: 'rgba(224, 242, 254, 0.8)', borderWidth: 2 },
                    { label: `Partner ${view === 'A'?'B':'A'}`, data: partnerScores, backgroundColor: 'transparent', borderColor: 'rgba(255, 255, 255, 0.2)', borderDash: [5,5], borderWidth: 1 }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { r: { min: 0, max: 10, ticks: { display: false }, grid: { color: 'rgba(255,255,255,0.05)' }, angleLines: { color: 'rgba(255,255,255,0.05)' }, pointLabels: { color: 'rgba(255,255,255,0.5)', font: { family: 'Inter', size: 10 } } } }, plugins: { legend: { position: 'bottom', labels: { color: 'white', boxWidth: 10 } } } }
        });
    }, [localScores, partnerScores, view]);

    const handleSliderChange = (i, val) => {
        const newS = [...localScores];
        newS[i] = parseFloat(val);
        setLocalScores(newS);
    };

    const handleSliderCommit = () => {
        updateData({ [view === 'A' ? 'scores_a' : 'scores_b']: localScores });
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full relative z-10">
            <div className="flex-1 glass-panel p-8">
                <h3 className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-2">Flow Check</h3>
                <h2 className="text-2xl font-serif text-brand-accent mb-10">How is Partner {view} feeling?</h2>
                <div className="flex flex-col gap-8">
                    {CATEGORIES.map((cat, i) => (
                        <div key={i}>
                            <div className="flex justify-between text-xs font-bold uppercase tracking-wider opacity-80 mb-3"><span>{cat}</span><span>{localScores[i].toFixed(1)} / 10</span></div>
                            <input type="range" min="0" max="10" step="0.5" value={localScores[i]} onChange={(e) => handleSliderChange(i, e.target.value)} onMouseUp={handleSliderCommit} onTouchEnd={handleSliderCommit} />
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex-1 glass-panel p-8 flex flex-col"><div className="flex-1 relative min-h-[300px]"><canvas ref={canvasRef}></canvas></div></div>
        </div>
    );
});

const Heartbeats = React.memo(({ view, relationship, updateData, isReEntry }) => {
    const [note, setNote] = useState('');
    const moods = [
        { label: 'Happy', icon: <Smile size={24}/> }, { label: 'Calm', icon: <Moon size={24}/> }, { label: 'Stressed', icon: <Activity size={24}/> },
        { label: 'Sad', icon: <Smile size={24}/> }, { label: 'Excited', icon: <Star size={24}/> }, { label: 'Tired', icon: <Cloud size={24}/> }
    ];
    const [selectedMood, setSelectedMood] = useState(null);

    const transmit = () => {
        if (!selectedMood && !note) return;
        const newLog = { id: Date.now(), partner: view, mood: selectedMood, note, time: new Date().toLocaleString() };
        updateData({ moods: [newLog, ...(relationship.moods || [])] });
        setNote(''); setSelectedMood(null);
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full relative z-10">
            <div className="flex-1 glass-panel p-8">
                <h3 className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-2">Emotional Check-in</h3>
                <h2 className="text-2xl font-serif text-brand-accent mb-8">What is your heartbeat today?</h2>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                    {moods.map(m => (
                        <button key={m.label} onClick={() => setSelectedMood(m.label)} className={`glass-card p-6 flex flex-col items-center justify-center gap-3 transition ${selectedMood === m.label ? 'border-brand-accent text-brand-accent bg-white/10' : 'hover:bg-white/5'}`}>
                            {m.icon} <span className="text-sm font-bold">{m.label}</span>
                        </button>
                    ))}
                </div>
                
                <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="a fleeting note for the shared ledger..." className="glass-input min-h-[120px] mb-4"></textarea>
                <button onClick={transmit} className="glass-button accent px-8 py-4 font-bold text-sm w-full md:w-auto">Leave a note</button>
            </div>
            <div className="flex-1 glass-panel p-8 overflow-y-auto max-h-[70vh]">
                <h3 className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-2">The Ledger</h3>
                <h2 className="text-2xl font-serif mb-8">Recent heartbeats</h2>
                <div className="flex flex-col gap-4">
                    {(relationship.moods || []).map(l => (
                        <div key={l.id} className="glass-card p-5">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-[10px] uppercase font-bold opacity-60">Partner {l.partner}</span>
                                <span className="text-[10px] opacity-40">{l.time}</span>
                            </div>
                            {l.mood && <div className="text-brand-accent font-bold mb-2 flex items-center gap-2"><Heart size={14} className="fill-current" /> {l.mood}</div>}
                            {l.note && <p className="text-sm opacity-90 leading-relaxed">{l.note}</p>}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
});

const Scrapbook = React.memo(({ relationship, updateData }) => {
    const [form, setForm] = useState({ chapter: '', title: '', date: '', url: '', caption: '' });
    const [uploading, setUploading] = useState(false);

    // ⚙️ Replace these two values with your own from cloudinary.com
    const CLOUDINARY_CLOUD_NAME = 'di6mrsvzh';
    const CLOUDINARY_UPLOAD_PRESET = 'scrapbook_preset';

    const openUploadWidget = () => {
        if (!window.cloudinary) {
            alert('Upload widget is still loading. Please try again in a moment.');
            return;
        }
        setUploading(true);
        window.cloudinary.openUploadWidget(
            {
                cloudName: CLOUDINARY_CLOUD_NAME,
                uploadPreset: CLOUDINARY_UPLOAD_PRESET,
                sources: ['local', 'camera', 'url'],
                multiple: false,
                cropping: false,
                showAdvancedOptions: false,
                styles: {
                    palette: {
                        window: '#050a14',
                        windowBorder: '#1e3a5f',
                        tabIcon: '#e0f2fe',
                        menuIcons: '#e0f2fe',
                        textDark: '#ffffff',
                        textLight: '#ffffff',
                        link: '#38bdf8',
                        action: '#38bdf8',
                        inactiveTabIcon: '#4a7a9b',
                        error: '#f44235',
                        inProgress: '#38bdf8',
                        complete: '#4caf50',
                        sourceBg: '#0a1020',
                    },
                },
            },
            (error, result) => {
                setUploading(false);
                if (!error && result && result.event === 'success') {
                    setForm(prev => ({ ...prev, url: result.info.secure_url }));
                }
            }
        );
    };

    const addMemory = () => {
        if (!form.title) return;
        const newMem = { id: Date.now(), ...form };
        updateData({ memories: [...relationship.memories, newMem] });
        setForm({ chapter: '', title: '', date: '', url: '', caption: '' });
    };

    const deleteMemory = (id) => {
        updateData({ memories: relationship.memories.filter(m => m.id !== id) });
    };

    // Cloudinary and other CDN URLs serve images even without a file extension
    const isCloudinary = (url) => url && url.includes('cloudinary.com');
    const isGooglePhotos = (url) => url && (url.includes('photos.google.com') || url.includes('photos.app.goo.gl') || url.includes('usercontent.google.com'));
    const isDirectImage = (url) => url && !isGooglePhotos(url) && (/\.(jpg|jpeg|png|gif|webp|avif|svg)(\?|$)/i.test(url) || isCloudinary(url));

    const renderImage = (url) => {
        if (!url) return null;
        if (isGooglePhotos(url)) {
            return (
                <div className="w-full rounded-xl mb-4 bg-white/5 border border-white/10 p-4 text-center">
                    <p className="text-xs opacity-60 mb-3">Google Photos links can't be embedded. Use the Upload button instead.</p>
                    <a href={url} target="_blank" rel="noopener noreferrer"
                        className="glass-button accent px-4 py-2 text-sm font-bold inline-flex items-center gap-2">
                        <ImageIcon size={14}/> Open Photo ↗
                    </a>
                </div>
            );
        }
        if (isDirectImage(url)) {
            return <img src={url} alt="memory" className="w-full h-64 object-cover rounded-xl mb-4" onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='block'; }} />;
        }
        return (
            <div className="w-full rounded-xl mb-4 bg-white/5 border border-white/10 p-4 text-center">
                <a href={url} target="_blank" rel="noopener noreferrer" className="glass-button accent px-4 py-2 text-sm font-bold inline-flex items-center gap-2">
                    <ImageIcon size={14}/> View Image ↗
                </a>
            </div>
        );
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full">
            <div className="flex-1 glass-panel p-8 relative overflow-y-auto max-h-[75vh]">
                <h3 className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-2">Our Story</h3>
                <h2 className="text-2xl font-serif text-brand-accent mb-10">The timeline of our love</h2>
                <div className="relative pl-12">
                    <div className="timeline-line"></div>
                    {relationship.memories.length === 0 && (
                        <p className="text-sm opacity-50 italic">No memories yet. Add your first one →</p>
                    )}
                    {relationship.memories.map(mem => (
                        <div key={mem.id} className="relative mb-12 group">
                            <div className="absolute -left-12 top-2 w-4 h-4 rounded-full border border-white/30 bg-midnight-mid z-10 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-brand-accent rounded-full"></div></div>
                            <div className="flex justify-between items-start mb-1">
                                <h4 className="text-[10px] uppercase font-bold opacity-60">{mem.chapter || 'Chapter'} • {mem.date}</h4>
                                <button onClick={() => deleteMemory(mem.id)}
                                    className="opacity-0 group-hover:opacity-100 transition text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded-lg hover:bg-red-400/10">
                                    Remove
                                </button>
                            </div>
                            <h3 className="text-xl font-serif mb-4">{mem.title}</h3>
                            <div className="glass-card p-2 rounded-2xl">
                                {renderImage(mem.url)}
                                <span style={{display:'none'}} className="block text-xs text-red-400 px-3 pb-2">Image failed to load.</span>
                                <p className="text-sm opacity-80 px-3 pb-3 pt-1">{mem.caption}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="w-full lg:w-96 shrink-0 glass-panel p-8">
                <h3 className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-2">New Entry</h3>
                <h2 className="text-xl font-serif mb-8">Inscribe a moment</h2>
                <div className="flex flex-col gap-4">
                    <input type="text" placeholder="Chapter 3..." className="glass-input" value={form.chapter} onChange={e => setForm({...form, chapter: e.target.value})} />
                    <input type="text" placeholder="Title" className="glass-input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
                    <input type="text" placeholder="YYYY-MM-DD" className="glass-input" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />

                    {/* Photo upload section */}
                    <div>
                        <button onClick={openUploadWidget} disabled={uploading}
                            className="glass-button accent w-full py-3 font-bold flex items-center justify-center gap-2 mb-2">
                            <ImageIcon size={16}/>
                            {uploading ? 'Opening uploader...' : '📸 Upload Photo from Device'}
                        </button>
                        {form.url && (
                            <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2">
                                <img src={form.url} alt="preview" className="w-10 h-10 object-cover rounded-lg shrink-0" />
                                <span className="text-xs opacity-60 truncate flex-1">Photo ready ✓</span>
                                <button onClick={() => setForm({...form, url: ''})} className="text-red-400 text-xs hover:text-red-300">✕</button>
                            </div>
                        )}
                        <div className="flex items-center gap-2 my-2">
                            <div className="flex-1 h-px bg-white/10"></div>
                            <span className="text-[10px] opacity-40">or paste a URL</span>
                            <div className="flex-1 h-px bg-white/10"></div>
                        </div>
                        <input type="text" placeholder="https://..." className="glass-input" value={form.url} onChange={e => setForm({...form, url: e.target.value})} />
                    </div>

                    <textarea placeholder="Caption..." className="glass-input min-h-[120px]" value={form.caption} onChange={e => setForm({...form, caption: e.target.value})}></textarea>
                    <button onClick={addMemory} className="glass-button accent py-4 font-bold flex items-center justify-center gap-2 mt-2"><Plus size={16}/> Add to scrapbook</button>
                </div>
            </div>
        </div>
    );
});


const Soundtrack = React.memo(({ relationship, updateData }) => {
    const [url, setUrl] = useState('');
    
    const parseSpotifyUrl = (u) => {
        if (!u) return '';
        const regex = /(?:https?:\/\/)?(?:open\.)?spotify\.com\/(playlist|track|album)\/([a-zA-Z0-9]{22})/;
        const match = u.match(regex);
        return match ? `https://open.spotify.com/embed/${match[1]}/${match[2]}?theme=0` : '';
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full">
            <div className="flex-1 glass-panel p-8">
                <h3 className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-2">Shared Audio</h3>
                <h2 className="text-2xl font-serif text-brand-accent mb-4">The melody of us</h2>
                <p className="text-sm opacity-70 mb-8">Paste any Spotify playlist, album, or track URL. We parse and embed it seamlessly.</p>
                <input type="text" placeholder="https://open.spotify.com/playlist/..." className="glass-input mb-4" value={url} onChange={e => setUrl(e.target.value)} />
                <button onClick={() => { if(url) updateData({ spotify_url: url }); setUrl(''); }} className="glass-button accent px-8 py-4 font-bold w-full md:w-auto flex items-center justify-center gap-2"><Music size={16}/> Tune in</button>
            </div>
            <div className="flex-1 glass-panel p-6 flex flex-col justify-center">
                {parseSpotifyUrl(relationship.spotify_url) ? (
                    <iframe className="w-full h-[352px] rounded-2xl border-none shadow-2xl" src={parseSpotifyUrl(relationship.spotify_url)} allow="encrypted-media"></iframe>
                ) : (
                    <div className="text-center opacity-50 text-sm">No active transmission.</div>
                )}
            </div>
        </div>
    );
});

const SoftCare = React.memo(({ relationship, updateData }) => {
    const data = relationship.partnerA_cycleData || defaultState.partnerA_cycleData;
    const symptoms = data.symptoms || []; // Realtime DB removes empty arrays, so we must fallback to []
    
    const toggleSymptom = (sym) => {
        const newSymptoms = symptoms.includes(sym) ? symptoms.filter(s => s !== sym) : [...symptoms, sym];
        updateData({ partnerA_cycleData: { ...data, symptoms: newSymptoms } });
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full relative z-10">
            <div className="flex-1 glass-panel p-8">
                <h3 className="text-[10px] uppercase tracking-widest font-bold opacity-60 flex items-center gap-2 mb-6"><Heart size={12}/> PRIVATE • SECURE SYNC</h3>
                <h2 className="text-3xl font-serif text-brand-accent mb-8">Soft Care Workspace</h2>
                <div className="mb-8">
                    <h4 className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-4">Current Day</h4>
                    <div className="flex items-center gap-4">
                        <button onClick={() => updateData({ partnerA_cycleData: { ...data, day: Math.max(1, data.day - 1) }})} className="w-12 h-12 rounded-full glass-card flex items-center justify-center">-</button>
                        <div className="text-5xl font-bold font-serif w-20 text-center">{data.day}</div>
                        <button onClick={() => updateData({ partnerA_cycleData: { ...data, day: data.day + 1 }})} className="w-12 h-12 rounded-full glass-card flex items-center justify-center">+</button>
                    </div>
                </div>
                <div className="mb-8">
                    <h4 className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-4">How are you feeling today?</h4>
                    <div className="flex flex-wrap gap-3">
                        {['Tired', 'Cramps', 'Headache', 'Bloated'].map(sym => (
                            <button key={sym} onClick={() => toggleSymptom(sym)} className={`px-5 py-3 rounded-full text-sm font-bold transition border ${symptoms.includes(sym) ? 'bg-brand-accent text-midnight-base border-brand-accent' : 'glass-card border-transparent'}`}>{sym}</button>
                        ))}
                    </div>
                </div>
            </div>
            <div className="flex-1 glass-panel p-8">
                <h3 className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-2">Quick Signals</h3>
                <h2 className="text-xl font-serif mb-8">Quietly ping Partner B</h2>
                <div className="flex flex-col gap-4">
                    <div className="glass-card p-5 flex justify-between items-center"><span className="font-bold text-sm text-blue-100">I need a quiet day</span><button onClick={() => updateData({ partnerA_cycleData: { ...data, needSpace: !data.needSpace }})} className={`w-14 h-7 rounded-full relative transition-colors ${data.needSpace ? 'bg-brand-accent' : 'bg-white/10'}`}><div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${data.needSpace ? 'right-1' : 'left-1'}`}></div></button></div>
                    <div className="glass-card p-5 flex justify-between items-center"><span className="font-bold text-sm flex items-center gap-2 text-yellow-100">Send soft snacks</span><button onClick={() => updateData({ partnerA_cycleData: { ...data, sendSnacks: !data.sendSnacks }})} className={`w-14 h-7 rounded-full relative transition-colors ${data.sendSnacks ? 'bg-yellow-400' : 'bg-white/10'}`}><div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${data.sendSnacks ? 'right-1' : 'left-1'}`}></div></button></div>
                </div>
            </div>
        </div>
    );
});

// --- APP ROOT ---
const App = () => {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [relationship, setRelationship] = useState(defaultState);
    const [activePage, setActivePage] = useState('orbital');
    const [distance, setDistance] = useState(defaultState.distance);
    const [coRegulation, setCoRegulation] = useState(defaultState.coRegulation);
    const [authLoading, setAuthLoading] = useState(true);

    // Auth Listener
    useEffect(() => {
        let unsubUser = () => {};
        const unsubAuth = onAuthStateChanged(auth, (u) => {
            setUser(u);
            if (u) {
                // Listen to user data (role & spaceId) dynamically so creation triggers a re-render
                const userRef = ref(db, 'users/' + u.uid);
                unsubUser = onValue(userRef, (snapshot) => {
                    if (snapshot.exists()) setUserData(snapshot.val());
                    else setUserData(null);
                    setAuthLoading(false);
                }, (error) => {
                    console.error("Database connection or permission error:", error);
                    setAuthLoading(false); // Prevent infinite loading screen
                });
            } else {
                unsubUser();
                setUserData(null);
                setRelationship(defaultState);
                setAuthLoading(false);
            }
        });
        return () => { unsubAuth(); unsubUser(); };
    }, []);

    // Realtime Database Listener for the shared Space
    useEffect(() => {
        if (!userData?.spaceId) return;
        const spaceRef = ref(db, 'sanctuaries/' + userData.spaceId);
        const unsubSpace = onValue(spaceRef, (snapshot) => {
            if (snapshot.exists()) setRelationship({ ...defaultState, ...snapshot.val() });
        }, (error) => {
            console.error("Space sync error:", error);
        });
        return unsubSpace;
    }, [userData]);

    // Firebase Mutator
    const updateData = React.useCallback(async (updates) => {
        if (!userData?.spaceId) return;
        setRelationship(prev => {
            const next = { ...prev, ...updates };
            return next;
        }); // optimistic local update
        try { await update(ref(db, 'sanctuaries/' + userData.spaceId), updates); }
        catch (e) { console.error("Database update failed", e); }
    }, [userData?.spaceId]);

    const isReEntry = relationship.reunionEndTime && Date.now() < relationship.reunionEndTime;

    // --- Daily Reset ---
    // Runs whenever the relationship data loads. Checks if today is a new day
    // compared to the last stored reset date, and if so, wipes daily fields.
    useEffect(() => {
        if (!userData?.spaceId || !relationship.lastResetDate) {
            // First time ever — just stamp today's date, don't wipe anything
            if (userData?.spaceId) {
                const today = new Date().toISOString().slice(0, 10);
                updateData({ lastResetDate: today });
            }
            return;
        }

        const today = new Date().toISOString().slice(0, 10);
        if (relationship.lastResetDate !== today) {
            // It's a new day — reset daily fields
            updateData({
                lastResetDate: today,
                // Meals reset for both partners
                meals_a: { breakfast: false, lunch: false, dinner: false },
                meals_b: { breakfast: false, lunch: false, dinner: false },
                // Clear today's mood log (keep history in moods array — don't wipe that)
                // Clear Soft Care daily signals
                partnerA_cycleData: {
                    ...(relationship.partnerA_cycleData || {}),
                    needSpace: false,
                    sendSnacks: false,
                    symptoms: [],
                },
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [relationship.lastResetDate, userData?.spaceId]);

    // Background CSS
    useEffect(() => {
        if (relationship.isThermalBlanketActive && userData?.role === 'A') {
            document.body.classList.add('thermal-active');
        } else {
            document.body.classList.remove('thermal-active');
            if (isReEntry) document.body.style.setProperty('--bg-gradient', 'linear-gradient(to bottom, #02040a 0%, #060913 50%, #0a0d1a 100%)');
            else document.body.style.setProperty('--bg-gradient', 'linear-gradient(to bottom, #000000 0%, #050a14 40%, #0a1020 100%)');
        }
    }, [relationship.isThermalBlanketActive, isReEntry, userData]);

    if (authLoading) return <div className="fixed inset-0 bg-black flex items-center justify-center text-white"><Star className="animate-spin text-brand-accent" size={32}/></div>;
    
    // Auth & Pairing Flow
    if (!user) return <AuthScreen />;
    if (!userData?.spaceId) return <PairingScreen user={user} setUserData={setUserData} />;

    const renderPage = () => {
        switch(activePage) {
            case 'orbital': return <OurSpace distance={distance} setDistance={setDistance} harmony={coRegulation} setCoreg={setCoRegulation} view={userData.role} relationship={relationship} updateData={updateData} isReEntry={isReEntry} />;
            case 'balance': return <OurRhythm view={userData.role} relationship={relationship} updateData={updateData} />;
            case 'mood': return <Heartbeats view={userData.role} relationship={relationship} updateData={updateData} isReEntry={isReEntry} />;
            case 'goals': return <FutureDreams relationship={relationship} updateData={updateData} />;
            case 'journal': return <Scrapbook relationship={relationship} updateData={updateData} />;
            case 'soundtrack': return <Soundtrack relationship={relationship} updateData={updateData} />;
            case 'cycle': return userData.role === (relationship.cycleUser || 'A') ? <SoftCare relationship={relationship} updateData={updateData} /> : null;
            default: return <OurSpace distance={distance} setDistance={setDistance} harmony={coRegulation} setCoreg={setCoRegulation} view={userData.role} relationship={relationship} updateData={updateData} isReEntry={isReEntry} />;
        }
    };

    const cycleUser = relationship.cycleUser || 'A';

    return (
        <>
            <EchoesOverlay moods={relationship.moods} view={userData.role} />
            {relationship.isThermalBlanketActive && userData.role === cycleUser && cycleUser !== 'None' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none bg-black/40 backdrop-blur-md">
                    <h1 className="text-4xl md:text-6xl font-serif text-orange-200 animate-pulse tracking-wide drop-shadow-2xl">They are with you.</h1>
                </div>
            )}
            <div className={`flex flex-col md:flex-row h-screen p-4 md:p-6 gap-6 relative z-10 transition-opacity duration-1000 ${relationship.isThermalBlanketActive && userData.role === cycleUser && cycleUser !== 'None' ? 'opacity-20' : 'opacity-100 text-white/90'}`}>
                <Sidebar activePage={activePage} setActivePage={setActivePage} view={userData.role} isReEntry={isReEntry} spaceId={userData.spaceId} relationship={relationship} />
                <main className="flex-1 flex flex-col min-w-0">
                    <Header view={userData.role} distance={distance} isReEntry={isReEntry} spaceId={userData.spaceId} relationship={relationship} updateData={updateData} />
                    <div className="flex-1 overflow-y-auto pb-6 pr-2">
                        {renderPage()}
                    </div>
                </main>
            </div>
        </>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
