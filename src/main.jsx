import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { 
    Orbit, Activity, Smile, BookOpen, Music, Calendar, 
    Bell, Image as ImageIcon, ChevronLeft, ChevronRight, Plus, Moon,
    User, Heart, Sparkles, Target, Cloud
} from 'lucide-react';

// --- STORAGE ---
const STORAGE_KEY = 'lumina_v5_state';
const defaultState = {
    isRoleSelected: false,
    activeView: 'A', // 'A' or 'B'
    scores_a: [7, 6, 8, 5, 7, 9], scores_b: [6, 8, 7, 4, 8, 9],
    meals_a: { breakfast: true, lunch: false, dinner: false }, 
    meals_b: { breakfast: false, lunch: true, dinner: false },
    memories: [{ id: 1, title: 'The Meeting', chapter: 'Chapter 1', date: '2023-04-12', caption: 'The first orbit aligned.', url: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=800&q=80' }],
    moods: [], 
    goals: [{ id: 1, text: 'Plan Anniversary Trip', completed: false }],
    spotify_url: "https://open.spotify.com/playlist/37i9dQZF1EJH75B3mnDgmp",
    distance: 6400, coRegulation: 62,
    partnerA_cycleData: { day: 14, symptoms: [], needSpace: false, sendSnacks: false },
    reEntryEndTime: null, // 72-hour timer for atmospheric re-entry
    wakes: { A: [], B: [] } // Asynchronous wakes
};

const loadState = (def) => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) return { ...def, ...JSON.parse(stored) };
    } catch (e) { console.warn(e); }
    return def;
};
const saveState = (state) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } 
    catch (e) { console.warn(e); }
};

const CATEGORIES = [
    'Romance', 'Physical & Mental Health', 'Personal Growth', 
    'Career & Business', 'Finances', 'Leisure'
];

// --- COMPONENTS ---

const OnboardingScreen = ({ selectRole }) => {
    const [fadeOut, setFadeOut] = useState(false);

    const handleSelect = (role) => {
        setFadeOut(true);
        setTimeout(() => selectRole(role), 500);
    };

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/80 backdrop-blur-3xl transition-opacity duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}>
            <div className="glass-panel p-12 max-w-4xl w-full text-center flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-brand-accent/20 flex items-center justify-center border border-brand-accent/50 mb-8 shadow-[0_0_30px_rgba(234,88,12,0.3)]">
                    <Orbit size={32} className="text-brand-accent" />
                </div>
                <h1 className="text-4xl font-serif mb-4">Welcome to your shared orbit.</h1>
                <p className="text-lg opacity-70 mb-12">Who is entering the space today?</p>

                <div className="flex flex-col md:flex-row gap-6 w-full justify-center">
                    <button 
                        onClick={() => handleSelect('A')}
                        className="glass-card flex-1 p-8 hover:bg-white/10 transition group flex flex-col items-center border border-white/10 hover:border-brand-accent/50"
                    >
                        <div className="w-16 h-16 rounded-full bg-[#facc15]/20 flex items-center justify-center mb-6 group-hover:scale-110 transition shadow-[0_0_20px_rgba(250,204,21,0.3)]">
                            <User size={32} className="text-[#facc15]" />
                        </div>
                        <h2 className="text-xl font-bold mb-2">Partner A</h2>
                        <p className="text-sm opacity-60">Female Interface</p>
                    </button>

                    <button 
                        onClick={() => handleSelect('B')}
                        className="glass-card flex-1 p-8 hover:bg-white/10 transition group flex flex-col items-center border border-white/10 hover:border-[#38bdf8]/50"
                    >
                        <div className="w-16 h-16 rounded-full bg-[#38bdf8]/20 flex items-center justify-center mb-6 group-hover:scale-110 transition shadow-[0_0_20px_rgba(56,189,248,0.3)]">
                            <User size={32} className="text-[#38bdf8]" />
                        </div>
                        <h2 className="text-xl font-bold mb-2">Partner B</h2>
                        <p className="text-sm opacity-60">Male Interface</p>
                    </button>
                </div>
            </div>
        </div>
    );
};

const Sidebar = ({ activePage, setActivePage, view, resetRole, isReEntry }) => {
    let navItems = [
        { id: 'orbital', label: 'Orbital Overview', icon: <Orbit size={18} /> },
        { id: 'balance', label: 'Life Balance', icon: <Activity size={18} /> },
        { id: 'mood', label: 'Mood Space', icon: <Smile size={18} /> },
        { id: 'goals', label: 'Goal Tracker', icon: <Target size={18} /> },
        { id: 'journal', label: 'Memory Journal', icon: <BookOpen size={18} /> },
        { id: 'soundtrack', label: 'Synced Soundtrack', icon: <Music size={18} /> },
    ];

    if (view === 'A') {
        navItems.push({ id: 'cycle', label: 'Cycle Logger', icon: <Calendar size={18} /> });
    }

    return (
        <aside className="w-full md:w-64 shrink-0 flex flex-col gap-6">
            <div className={`glass-panel p-6 flex flex-col h-full relative ${isReEntry ? 'border-purple-500/30' : ''}`}>
                <div className="flex items-center gap-3 mb-10">
                    <div className="w-10 h-10 rounded-full bg-brand-accent flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(234,88,12,0.4)]">
                        <Orbit size={20} className="text-white" />
                    </div>
                    <div>
                        <h2 className="font-bold text-sm tracking-widest uppercase opacity-90 leading-tight">Anti-Gravity</h2>
                        <p className="text-xs opacity-60">Long Distance OS</p>
                    </div>
                </div>

                <nav className="flex flex-col gap-2 flex-1">
                    {navItems.map(item => (
                        <button 
                            key={item.id}
                            onClick={() => setActivePage(item.id)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition font-medium text-sm text-left
                                ${activePage === item.id ? 'bg-white/10 text-white border border-white/20' : 'text-white/60 hover:bg-white/5 hover:text-white'}
                            `}
                        >
                            {item.icon} {item.label}
                        </button>
                    ))}
                </nav>

                <div className="mt-auto flex flex-col gap-2">
                    {isReEntry && (
                        <div className="mb-4 text-center text-xs font-bold text-purple-300 bg-purple-900/40 py-2 rounded border border-purple-500/30">
                            Atmospheric Re-Entry Buffer Active
                        </div>
                    )}
                    <button onClick={resetRole} className="text-[10px] text-center opacity-40 hover:opacity-100 transition uppercase tracking-widest">
                        Change Role
                    </button>
                </div>
            </div>
        </aside>
    );
};

const Header = ({ view, setView, distance, coreg, isReEntry }) => (
    <header className="glass-panel px-6 py-4 flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                <Orbit size={16} className="text-brand-accent" />
            </div>
            <div>
                <p className="text-[10px] uppercase tracking-widest font-bold opacity-60">Local Syncing Simulator</p>
                <p className="text-sm font-medium">Viewing as <span className="text-brand-accent font-semibold">Partner {view}</span></p>
            </div>
        </div>
        
        <div className="flex bg-white/5 rounded-full p-1 border border-white/10">
            <button onClick={() => setView('A')} className={`px-6 py-1.5 rounded-full text-xs font-bold transition ${view === 'A' ? 'bg-brand-accent text-white' : 'text-white/60 hover:text-white'}`}>
                Partner A
            </button>
            <button onClick={() => setView('B')} className={`px-6 py-1.5 rounded-full text-xs font-bold transition ${view === 'B' ? 'bg-[#38bdf8] text-white' : 'text-white/60 hover:text-white'}`}>
                Partner B
            </button>
        </div>

        <div className="flex gap-6 text-xs font-bold tracking-wider opacity-80">
            {isReEntry ? (
                <span className="flex items-center gap-2 text-purple-300"><Moon size={14}/> RE-ENTRY BUFFER</span>
            ) : (
                <>
                    <span className="flex items-center gap-2"><Activity size={14} className="text-brand-accent"/> CO-REG {(coreg/100).toFixed(2)}</span>
                    <span>DIST {distance.toLocaleString()} km</span>
                </>
            )}
        </div>
    </header>
);

// --- TAB PAGES ---

const OrbitalOverview = ({ distance, setDistance, coreg, setCoreg, view, relationship, updateData, isReEntry }) => {
    const [isSyncing, setIsSyncing] = useState(false);
    const syncInterval = useRef(null);
    const drainInterval = useRef(null);
    const canvasRef = useRef(null);

    // Physics constants
    const inertia = isReEntry ? '3s' : '0.5s';

    // Mood Logic: Find last mood per partner
    const getMoodAura = (partnerId) => {
        const partnerMoods = relationship.moods.filter(m => m.partner === partnerId);
        if (partnerMoods.length === 0) return { filter: `blur(${isReEntry ? '8px' : '4px'})`, drift: 0 };
        const lastMood = partnerMoods[0].mood; // newest first
        if (lastMood === 'Stressed' || lastMood === 'Tired' || lastMood === 'Sad') {
            return { filter: 'blur(12px)', drift: 10 }; // hazy, drifts further
        }
        return { filter: `blur(${isReEntry ? '8px' : '4px'})`, drift: 0 };
    };

    const auraA = getMoodAura('A');
    const auraB = getMoodAura('B');

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
                setDistance(prev => Math.min(6400, prev + 1));
            }, 200);
        }
        return () => { clearInterval(syncInterval.current); clearInterval(drainInterval.current); };
    }, [isSyncing]);

    const meals = view === 'A' ? relationship.meals_a : relationship.meals_b;
    const toggleMeal = (meal) => {
        updateData({ [view === 'A' ? 'meals_a' : 'meals_b']: { ...meals, [meal]: !meals[meal] } });
    };

    // Future Fog based on goals and memories instead of coreg
    const completedGoals = relationship.goals.filter(g => g.completed).length;
    const memoryCount = relationship.memories.length;
    // Base fog is 24px blur. Each goal/memory reduces it.
    const fogDensity = Math.max(0, 24 - (completedGoals * 4) - (memoryCount * 2));
    
    // Calculate sphere positions based on coregulation, adding drift if stressed
    let sphereDist = 40 - (coreg * 0.35);

    const partnerAData = relationship.partnerA_cycleData || defaultState.partnerA_cycleData;

    // Asynchronous Wake Logic
    const handleCanvasInteraction = (e) => {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Push wake particle
        const newWake = { x, y, id: Date.now() };
        const wakes = { ...relationship.wakes };
        wakes[view] = [...(wakes[view] || []), newWake].slice(-10); // keep last 10
        updateData({ wakes });

        // Check if interacting with partner's wake
        const partner = view === 'A' ? 'B' : 'A';
        const partnerWakes = wakes[partner] || [];
        partnerWakes.forEach(w => {
            const dx = Math.abs(w.x - x);
            const dy = Math.abs(w.y - y);
            if (dx < 30 && dy < 30) {
                // Kinetic attraction triggered!
                setCoreg(prev => Math.min(100, prev + 5));
            }
        });
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 glass-panel p-6 flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-1">Orbital Canvas / Zero-G Sandbox</h3>
                        <h2 className="text-2xl font-serif text-brand-accent">Two bodies, one orbit</h2>
                    </div>
                    <div className="flex gap-2">
                        {isReEntry ? (
                            <button className="glass-button px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 border-purple-400 text-purple-200 bg-purple-900/30">
                                <Heart size={14} /> Quiet Support Mode
                            </button>
                        ) : (
                            <>
                                <button 
                                    className={`glass-button px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 ${isSyncing ? 'accent scale-105' : ''}`}
                                    onMouseDown={() => setIsSyncing(true)} onMouseUp={() => setIsSyncing(false)} onMouseLeave={() => setIsSyncing(false)}
                                    onTouchStart={() => setIsSyncing(true)} onTouchEnd={() => setIsSyncing(false)}
                                >
                                    <Orbit size={14} /> Hold to Sync
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <div 
                    ref={canvasRef}
                    onMouseMove={handleCanvasInteraction}
                    onTouchMove={(e) => handleCanvasInteraction(e.touches[0])}
                    className="relative w-full h-80 rounded-2xl overflow-hidden border border-white/20 canvas-grid mb-6 flex items-center justify-center"
                    style={{ '--inertia': inertia }}
                >
                    <div className="ambient-fog" style={{ '--fog-density': `${fogDensity}px` }}></div>
                    <div className="absolute top-4 left-4 text-xs font-bold opacity-60 z-30 flex items-center gap-2">
                        {isReEntry && <Moon size={14} className="text-purple-300"/>}
                        {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • {Math.floor(distance).toLocaleString()} KM
                    </div>
                    <div className="absolute top-4 right-4 text-xs font-bold opacity-60 z-30 flex items-center gap-1"><Orbit size={12}/> {isSyncing ? 'SYNCING' : 'DRIFTING'}</div>

                    {/* Wake Particles */}
                    {(relationship.wakes['A'] || []).map(w => (
                        <div key={`wa-${w.id}`} className="wake-particle bg-[#facc15]" style={{ left: w.x, top: w.y }}></div>
                    ))}
                    {(relationship.wakes['B'] || []).map(w => (
                        <div key={`wb-${w.id}`} className="wake-particle bg-[#38bdf8]" style={{ left: w.x, top: w.y }}></div>
                    ))}

                    {/* Connecting Line */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-0.5 bg-brand-accent/50 z-10" style={{ width: `calc(${(sphereDist*2) + auraA.drift + auraB.drift}% + 3rem)`, transition: `all ${inertia} ease` }}></div>

                    {/* Spheres with Mood Auras */}
                    <div className="partner-sphere sphere-a w-16 h-16 flex items-center justify-center font-bold text-lg" style={{ left: `calc(50% - 2rem - ${sphereDist + auraA.drift}%)`, filter: auraA.filter }}>A</div>
                    <div className="partner-sphere sphere-b w-16 h-16 flex items-center justify-center font-bold text-lg" style={{ right: `calc(50% - 2rem - ${sphereDist + auraB.drift}%)`, filter: auraB.filter }}>B</div>
                </div>

                <div className="flex gap-4">
                    <div className="flex-1 glass-card p-4 flex flex-col justify-between h-20">
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Co-Regulation</span>
                        <div className="flex justify-between items-end">
                            <div className="w-3/4 h-1 bg-white/20 rounded-full overflow-hidden"><div className="h-full bg-brand-accent" style={{width: `${coreg}%`}}></div></div>
                            <span className="text-sm font-medium">{(coreg/100).toFixed(2)}</span>
                        </div>
                    </div>
                    <div className="flex-1 glass-card p-4 flex flex-col justify-between h-20">
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Future Fog Density</span>
                        <div className="flex justify-between items-end">
                            <div className="w-3/4 h-1 bg-white/20 rounded-full overflow-hidden"><div className="h-full bg-brand-accent" style={{width: `${(fogDensity/24)*100}%`}}></div></div>
                            <span className="text-sm font-medium">{fogDensity}px</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="w-full lg:w-80 shrink-0 flex flex-col gap-6">
                
                {view === 'B' ? (
                    <div className="glass-panel p-6 flex flex-col border border-[#38bdf8]/30 relative overflow-hidden">
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#38bdf8]/10 rounded-full blur-2xl pointer-events-none"></div>
                        <h3 className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-2 flex items-center gap-2"><Heart size={12} className="text-[#38bdf8]"/> Wellness Sync</h3>
                        <h2 className="text-lg font-serif mb-4">Partner A is on Day {partnerAData.day}</h2>
                        
                        <div className="flex flex-col gap-2 mb-6">
                            {partnerAData.sendSnacks && <div className="text-xs bg-[#facc15]/20 text-[#facc15] px-3 py-1.5 rounded-md font-medium flex items-center gap-2"><Sparkles size={12}/> She requested snacks.</div>}
                            {partnerAData.needSpace && <div className="text-xs bg-white/10 px-3 py-1.5 rounded-md font-medium">She needs some quiet space today.</div>}
                            {!partnerAData.sendSnacks && !partnerAData.needSpace && partnerAData.symptoms.length > 0 && (
                                <div className="text-xs bg-white/10 px-3 py-1.5 rounded-md font-medium opacity-80">Experiencing: {partnerAData.symptoms.join(', ')}</div>
                            )}
                            {!partnerAData.sendSnacks && !partnerAData.needSpace && partnerAData.symptoms.length === 0 && (
                                <div className="text-xs opacity-60 italic">Everything seems calm today.</div>
                            )}
                        </div>
                        
                        <button className="glass-button w-full py-2 flex justify-center items-center gap-2 text-xs font-bold tracking-wider hover:border-[#38bdf8]/50 transition"><Heart size={14}/> Send supportive ping</button>
                    </div>
                ) : (
                    <div className="glass-panel p-6 flex flex-col gap-4">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h3 className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-1">Daily Wellness Check</h3>
                                <h2 className="text-lg font-serif">Have you eaten?</h2>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {['breakfast', 'lunch', 'dinner'].map(m => (
                                <button key={m} onClick={() => toggleMeal(m)} className={`glass-card p-3 flex flex-col items-center justify-center gap-2 transition ${meals[m] ? 'bg-white/20 text-brand-accent' : 'hover:bg-white/10'}`}>
                                    <Activity size={16} className={meals[m] ? '' : 'opacity-50'}/>
                                    <span className="text-[10px] font-bold capitalize">{m}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="glass-panel p-6 flex-1 flex flex-col">
                    <h3 className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-4">Memory Polaroid</h3>
                    <div className="bg-[#FAF8F5] p-3 pb-12 rounded-lg flex-1 relative transform rotate-1 shadow-2xl flex flex-col items-center justify-center border border-white/10">
                        {relationship.memories.length > 0 ? (
                            <img src={relationship.memories[relationship.memories.length-1].url} className="w-full h-48 object-cover rounded shadow-inner" />
                        ) : (
                            <div className="w-full h-48 bg-black/10 rounded flex items-center justify-center"><ImageIcon className="opacity-20" size={48}/></div>
                        )}
                        <p className="absolute bottom-4 font-serif text-[#2F2E2C] text-sm text-center w-full">{relationship.memories[relationship.memories.length-1]?.caption || 'Suspended in time'}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const GoalTracker = ({ relationship, updateData }) => {
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
                // If this is a major reunion milestone, trigger Re-Entry mode
                if (!g.completed && (text.toLowerCase().includes('reunion') || text.toLowerCase().includes('visit') || text.toLowerCase().includes('trip'))) {
                    // Set timer for 72 hours from now
                    const reEntryEnd = Date.now() + (72 * 60 * 60 * 1000);
                    updateData({ reEntryEndTime: reEntryEnd });
                }
                return { ...g, completed: !g.completed };
            }
            return g;
        });
        updateData({ goals });
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full">
            <div className="flex-1 glass-panel p-8">
                <h3 className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-2">Collaborative Board</h3>
                <h2 className="text-2xl font-serif text-brand-accent mb-8">Pin Future Dreams</h2>
                <p className="text-sm opacity-70 mb-8">Clearing goals directly disperses the Future Fog over the Orbital Canvas. No strict deadlines, just gentle intentions.</p>
                
                <div className="flex gap-4 mb-8">
                    <input type="text" placeholder="Plan Anniversary Trip..." className="glass-input flex-1" value={newGoal} onChange={e => setNewGoal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addGoal()} />
                    <button onClick={addGoal} className="glass-button accent px-6 py-3 font-bold"><Plus size={16}/></button>
                </div>

                <div className="flex flex-col gap-3">
                    {relationship.goals.map(g => (
                        <div key={g.id} className={`glass-card p-4 flex items-center justify-between transition ${g.completed ? 'opacity-50' : ''}`}>
                            <span className={`text-lg ${g.completed ? 'line-through' : ''}`}>{g.text}</span>
                            <button onClick={() => toggleGoal(g.id, g.text)} className={`w-8 h-8 rounded-full flex items-center justify-center border transition ${g.completed ? 'bg-brand-accent border-brand-accent' : 'border-white/20 hover:bg-white/10'}`}>
                                {g.completed && <div className="w-2 h-2 bg-white rounded-full"></div>}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex-1 glass-panel p-8 flex items-center justify-center border border-brand-accent/20">
                <div className="text-center">
                    <Cloud size={48} className="mx-auto mb-4 opacity-50" />
                    <h3 className="font-serif text-xl mb-2">Future Fog Status</h3>
                    <p className="opacity-70 text-sm max-w-sm">Every pinned dream clears the mist in the orbital canvas. Marking a 'Reunion Trip' triggers a 72-hour Atmospheric Re-Entry buffer.</p>
                </div>
            </div>
        </div>
    );
};

const LifeBalance = ({ view, relationship, updateData }) => {
    const canvasRef = useRef(null);
    const chartRef = useRef(null);
    const scores = view === 'A' ? relationship.scores_a : relationship.scores_b;
    const partnerScores = view === 'A' ? relationship.scores_b : relationship.scores_a;

    useEffect(() => {
        if (!canvasRef.current) return;
        if (chartRef.current) chartRef.current.destroy();

        chartRef.current = new window.Chart(canvasRef.current.getContext('2d'), {
            type: 'radar',
            data: {
                labels: CATEGORIES,
                datasets: [
                    { label: `Partner ${view}`, data: scores, backgroundColor: 'rgba(234, 88, 12, 0.4)', borderColor: 'rgba(234, 88, 12, 1)', borderWidth: 2 },
                    { label: `Partner ${view === 'A'?'B':'A'}`, data: partnerScores, backgroundColor: 'transparent', borderColor: 'rgba(255, 255, 255, 0.3)', borderDash: [5,5], borderWidth: 1 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: { r: { min: 0, max: 10, ticks: { display: false }, grid: { color: 'rgba(255,255,255,0.1)' }, angleLines: { color: 'rgba(255,255,255,0.1)' }, pointLabels: { color: 'rgba(255,255,255,0.7)', font: { family: 'Inter', size: 10 } } } },
                plugins: { legend: { position: 'bottom', labels: { color: 'white', boxWidth: 10 } } }
            }
        });
    }, [scores, partnerScores, view]);

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full">
            <div className="flex-1 glass-panel p-8">
                <h3 className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-2">Telemetry Sliders</h3>
                <h2 className="text-2xl font-serif text-brand-accent mb-10">Calibrate Partner {view}</h2>
                <div className="flex flex-col gap-8">
                    {CATEGORIES.map((cat, i) => (
                        <div key={i}>
                            <div className="flex justify-between text-xs font-bold uppercase tracking-wider opacity-80 mb-3"><span>{cat}</span><span>{scores[i].toFixed(1)} / 10</span></div>
                            <input type="range" min="0" max="10" step="0.5" value={scores[i]} onChange={(e) => {
                                const newS = [...scores]; newS[i] = parseFloat(e.target.value);
                                updateData({ [view==='A'?'scores_a':'scores_b']: newS });
                            }} />
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex-1 glass-panel p-8 flex flex-col">
                <h3 className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-4">Life Balance Radar</h3>
                <div className="flex-1 relative min-h-[300px]">
                    <canvas ref={canvasRef}></canvas>
                </div>
            </div>
        </div>
    );
};

const MoodSpace = ({ view, relationship, updateData, isReEntry }) => {
    const [note, setNote] = useState('');
    const moods = [
        { label: 'Happy', icon: <Smile size={24}/> }, { label: 'Calm', icon: <Activity size={24}/> }, { label: 'Stressed', icon: <Activity size={24}/> },
        { label: 'Sad', icon: <Smile size={24}/> }, { label: 'Excited', icon: <Orbit size={24}/> }, { label: 'Tired', icon: <Moon size={24}/> }
    ];
    const [selectedMood, setSelectedMood] = useState(null);

    const transmit = () => {
        if (!selectedMood && !note) return;
        const newLog = { id: Date.now(), partner: view, mood: selectedMood, note, time: new Date().toLocaleString() };
        updateData({ moods: [newLog, ...(relationship.moods || [])] });
        setNote(''); setSelectedMood(null);
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full">
            <div className="flex-1 glass-panel p-8">
                <h3 className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-2">Emotional Telemetry</h3>
                <h2 className="text-2xl font-serif text-brand-accent mb-8">How does your gravity feel?</h2>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                    {moods.map(m => (
                        <button key={m.label} onClick={() => setSelectedMood(m.label)} className={`glass-card p-6 flex flex-col items-center justify-center gap-3 transition ${selectedMood === m.label ? 'border-brand-accent text-brand-accent bg-brand-accent/10' : 'hover:bg-white/10'}`}>
                            {m.icon} <span className="text-sm font-bold">{m.label}</span>
                        </button>
                    ))}
                </div>
                
                {isReEntry ? (
                    <div className="flex flex-col gap-4 border border-purple-500/30 p-4 rounded-xl bg-purple-900/20">
                        <p className="text-xs opacity-70 italic text-purple-200">Re-Entry Buffer active. High-effort text is disabled to ease the emotional weight.</p>
                        <button onClick={() => { setNote("Thinking of you in the quiet"); setSelectedMood("Calm"); setTimeout(transmit, 100); }} className="glass-button py-3 text-sm font-bold border-purple-500/50 hover:bg-purple-500/20">Send a quiet hug</button>
                    </div>
                ) : (
                    <>
                        <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="a fleeting note for the shared ledger..." className="glass-input min-h-[100px] mb-4"></textarea>
                        <button onClick={transmit} className="glass-button accent px-8 py-3 font-bold text-sm w-full md:w-auto">Transmit</button>
                    </>
                )}
            </div>
            <div className="flex-1 glass-panel p-8 overflow-y-auto max-h-[70vh]">
                <h3 className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-2">Shared Ledger</h3>
                <h2 className="text-2xl font-serif mb-8">Recent transmissions</h2>
                <div className="flex flex-col gap-4">
                    {(relationship.moods || []).length === 0 ? (
                        <p className="text-sm opacity-50">Nothing logged yet. Be the first signal.</p>
                    ) : (relationship.moods || []).map(l => (
                        <div key={l.id} className="glass-card p-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] uppercase font-bold opacity-60">Partner {l.partner}</span>
                                <span className="text-[10px] opacity-40">{l.time}</span>
                            </div>
                            {l.mood && <div className="text-brand-accent font-bold mb-2">{l.mood}</div>}
                            {l.note && <p className="text-sm opacity-90">{l.note}</p>}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const MemoryJournal = ({ relationship, updateData }) => {
    const [form, setForm] = useState({ chapter: '', title: '', date: '', url: '', caption: '' });

    const addMemory = () => {
        if (!form.title) return;
        const newMem = { id: Date.now(), ...form };
        updateData({ memories: [...relationship.memories, newMem] });
        setForm({ chapter: '', title: '', date: '', url: '', caption: '' });
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full">
            <div className="flex-1 glass-panel p-8 relative overflow-y-auto max-h-[75vh]">
                <h3 className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-2">Growth Arc</h3>
                <h2 className="text-2xl font-serif text-brand-accent mb-10">The timeline of two orbits</h2>
                
                <div className="relative pl-12">
                    <div className="timeline-line"></div>
                    {relationship.memories.map(mem => (
                        <div key={mem.id} className="relative mb-12">
                            <div className="absolute -left-12 top-2 w-4 h-4 rounded-full border-2 border-brand-accent bg-[#070b14] z-10 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-brand-accent rounded-full"></div></div>
                            <h4 className="text-[10px] uppercase font-bold opacity-60 mb-1">{mem.chapter || 'Chapter'} • {mem.date}</h4>
                            <h3 className="text-xl font-serif mb-4">{mem.title}</h3>
                            <div className="glass-card p-2 rounded-xl">
                                {mem.url && <img src={mem.url} className="w-full h-64 object-cover rounded-lg mb-4" />}
                                <p className="text-sm opacity-80 px-2 pb-2">{mem.caption}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="w-full lg:w-96 shrink-0 glass-panel p-8">
                <h3 className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-2">New Chapter</h3>
                <h2 className="text-xl font-serif mb-8">Inscribe a milestone</h2>
                <div className="flex flex-col gap-4">
                    <input type="text" placeholder="Chapter 3..." className="glass-input" value={form.chapter} onChange={e => setForm({...form, chapter: e.target.value})} />
                    <input type="text" placeholder="Title" className="glass-input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
                    <input type="text" placeholder="YYYY-MM-DD" className="glass-input" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                    <input type="text" placeholder="Image URL" className="glass-input" value={form.url} onChange={e => setForm({...form, url: e.target.value})} />
                    <textarea placeholder="Caption..." className="glass-input min-h-[100px]" value={form.caption} onChange={e => setForm({...form, caption: e.target.value})}></textarea>
                    <button onClick={addMemory} className="glass-button accent py-3 font-bold flex items-center justify-center gap-2"><Plus size={16}/> Add to arc</button>
                </div>
            </div>
        </div>
    );
};

const Soundtrack = ({ relationship, updateData }) => {
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
                <h3 className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-2">Synced Soundtrack</h3>
                <h2 className="text-2xl font-serif text-brand-accent mb-4">The frequency between us</h2>
                <p className="text-sm opacity-70 mb-8">Paste any Spotify playlist, album, or track URL. We parse and embed it cleanly.</p>
                <input type="text" placeholder="https://open.spotify.com/playlist/..." className="glass-input mb-4" value={url} onChange={e => setUrl(e.target.value)} />
                <button onClick={() => { if(url) updateData({ spotify_url: url }); setUrl(''); }} className="glass-button accent px-8 py-3 font-bold w-full md:w-auto flex items-center justify-center gap-2"><Music size={16}/> Tune in</button>
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
};

const CycleLogger = ({ relationship, updateData }) => {
    const data = relationship.partnerA_cycleData || defaultState.partnerA_cycleData;

    const toggleSymptom = (sym) => {
        const symptoms = data.symptoms.includes(sym) 
            ? data.symptoms.filter(s => s !== sym) 
            : [...data.symptoms, sym];
        updateData({ partnerA_cycleData: { ...data, symptoms } });
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full">
            <div className="flex-1 glass-panel p-8">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-[10px] uppercase tracking-widest font-bold opacity-60 flex items-center gap-2"><Calendar size={12}/> PRIVATE • STORED LOCALLY</h3>
                </div>
                <h2 className="text-3xl font-serif text-brand-accent mb-8">Cycle Workspace</h2>
                
                <div className="mb-8">
                    <h4 className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-4">Current Day</h4>
                    <div className="flex items-center gap-4">
                        <button onClick={() => updateData({ partnerA_cycleData: { ...data, day: Math.max(1, data.day - 1) }})} className="w-10 h-10 rounded-full glass-card flex items-center justify-center hover:bg-white/10">-</button>
                        <div className="text-4xl font-bold font-serif w-16 text-center">{data.day}</div>
                        <button onClick={() => updateData({ partnerA_cycleData: { ...data, day: data.day + 1 }})} className="w-10 h-10 rounded-full glass-card flex items-center justify-center hover:bg-white/10">+</button>
                    </div>
                </div>

                <div className="mb-8">
                    <h4 className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-4">Symptoms Today</h4>
                    <div className="flex flex-wrap gap-2">
                        {['Tired', 'Cramps', 'Headache', 'Bloated'].map(sym => (
                            <button key={sym} onClick={() => toggleSymptom(sym)} className={`px-4 py-2 rounded-full text-xs font-bold transition border ${data.symptoms.includes(sym) ? 'bg-brand-accent text-white border-brand-accent' : 'glass-card'}`}>
                                {sym}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex-1 glass-panel p-8 border border-white/10">
                <h3 className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-2">Quick Status Indicators</h3>
                <h2 className="text-xl font-serif mb-8">Ping Partner B</h2>

                <div className="flex flex-col gap-4">
                    <div className="glass-card p-4 flex justify-between items-center">
                        <span className="font-bold text-sm">Need space</span>
                        <button onClick={() => updateData({ partnerA_cycleData: { ...data, needSpace: !data.needSpace }})} className={`w-12 h-6 rounded-full relative transition-colors ${data.needSpace ? 'bg-brand-accent' : 'bg-white/20'}`}>
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${data.needSpace ? 'right-1' : 'left-1'}`}></div>
                        </button>
                    </div>
                    <div className="glass-card p-4 flex justify-between items-center">
                        <span className="font-bold text-sm flex items-center gap-2">Send snacks <Sparkles size={14} className="text-[#facc15]"/></span>
                        <button onClick={() => updateData({ partnerA_cycleData: { ...data, sendSnacks: !data.sendSnacks }})} className={`w-12 h-6 rounded-full relative transition-colors ${data.sendSnacks ? 'bg-[#facc15]' : 'bg-white/20'}`}>
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${data.sendSnacks ? 'right-1' : 'left-1'}`}></div>
                        </button>
                    </div>
                </div>
                <p className="text-xs opacity-50 mt-6 leading-relaxed">Toggling these indicators will automatically surface a supportive notification on Partner B's main dashboard.</p>
            </div>
        </div>
    );
};

// --- APP ROOT ---
const App = () => {
    const [relationship, setRelationship] = useState(() => loadState(defaultState));
    const state = { ...defaultState, ...relationship };
    
    const [activePage, setActivePage] = useState('orbital');
    const [distance, setDistance] = useState(state.distance);
    const [coRegulation, setCoRegulation] = useState(state.coRegulation);

    // Re-entry logic
    const isReEntry = state.reEntryEndTime && Date.now() < state.reEntryEndTime;

    // Apply background shift directly to body if Re-entry is active
    useEffect(() => {
        if (isReEntry) {
            document.body.style.setProperty('--bg-gradient', 'linear-gradient(to bottom, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)');
        } else {
            document.body.style.setProperty('--bg-gradient', 'linear-gradient(to bottom, #070b14 0%, #101726 30%, #172033 70%, #1d273d 100%)');
        }
    }, [isReEntry]);

    const updateData = (updates) => {
        const next = { ...state, ...updates };
        setRelationship(next); saveState(next);
    };

    useEffect(() => {
        const t = setTimeout(() => updateData({ distance, coRegulation }), 1000);
        return () => clearTimeout(t);
    }, [distance, coRegulation]);

    const handleSelectRole = (role) => {
        updateData({ isRoleSelected: true, activeView: role });
        setActivePage('orbital');
    };

    const renderPage = () => {
        switch(activePage) {
            case 'orbital': return <OrbitalOverview distance={distance} setDistance={setDistance} coreg={coRegulation} setCoreg={setCoRegulation} view={state.activeView} relationship={state} updateData={updateData} isReEntry={isReEntry} />;
            case 'balance': return <LifeBalance view={state.activeView} relationship={state} updateData={updateData} />;
            case 'mood': return <MoodSpace view={state.activeView} relationship={state} updateData={updateData} isReEntry={isReEntry} />;
            case 'goals': return <GoalTracker relationship={state} updateData={updateData} />;
            case 'journal': return <MemoryJournal relationship={state} updateData={updateData} />;
            case 'soundtrack': return <Soundtrack relationship={state} updateData={updateData} />;
            case 'cycle': return state.activeView === 'A' ? <CycleLogger relationship={state} updateData={updateData} /> : <div className="text-center mt-20 opacity-50">Unauthorized Access</div>;
            default: return null;
        }
    };

    if (!state.isRoleSelected) {
        return <OnboardingScreen selectRole={handleSelectRole} />;
    }

    return (
        <div className="min-h-screen flex flex-col md:flex-row p-4 md:p-6 gap-6 relative">
            <Sidebar activePage={activePage} setActivePage={setActivePage} view={state.activeView} resetRole={() => updateData({ isRoleSelected: false })} isReEntry={isReEntry} />
            <main className="flex-1 flex flex-col min-w-0">
                <Header view={state.activeView} setView={(v) => updateData({ activeView: v })} distance={distance} coreg={coRegulation} isReEntry={isReEntry} />
                <div className="flex-1 overflow-y-auto">
                    {renderPage()}
                </div>
            </main>
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
