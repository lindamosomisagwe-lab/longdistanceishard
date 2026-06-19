import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { 
    Orbit, Activity, Smile, BookOpen, Music, Calendar, 
    Bell, Image as ImageIcon, ChevronLeft, ChevronRight, Plus, Moon
} from 'lucide-react';

// --- STORAGE ---
const STORAGE_KEY = 'lumina_v3_state';
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

const Sidebar = ({ activePage, setActivePage }) => {
    const navItems = [
        { id: 'orbital', label: 'Orbital Overview', icon: <Orbit size={18} /> },
        { id: 'balance', label: 'Life Balance', icon: <Activity size={18} /> },
        { id: 'mood', label: 'Mood Space', icon: <Smile size={18} /> },
        { id: 'journal', label: 'Memory Journal', icon: <BookOpen size={18} /> },
        { id: 'soundtrack', label: 'Synced Soundtrack', icon: <Music size={18} /> },
        { id: 'cycle', label: 'Cycle Logger', icon: <Calendar size={18} /> },
    ];

    return (
        <aside className="w-full md:w-64 shrink-0 flex flex-col gap-6">
            <div className="glass-panel p-6 flex flex-col h-full">
                <div className="flex items-center gap-3 mb-10">
                    <div className="w-10 h-10 rounded-full bg-brand-accent flex items-center justify-center shrink-0">
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

                <button className="flex items-center justify-center gap-2 mt-auto py-3 px-4 rounded-xl glass-button text-sm font-medium text-white/70">
                    Collapse
                </button>
            </div>
        </aside>
    );
};

const Header = ({ view, setView, distance, coreg }) => (
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
                Partner A View
            </button>
            <button onClick={() => setView('B')} className={`px-6 py-1.5 rounded-full text-xs font-bold transition ${view === 'B' ? 'bg-brand-accent text-white' : 'text-white/60 hover:text-white'}`}>
                Partner B View
            </button>
        </div>

        <div className="flex gap-6 text-xs font-bold tracking-wider opacity-80">
            <span className="flex items-center gap-2"><Activity size={14} className="text-brand-accent"/> CO-REG {(coreg/100).toFixed(2)}</span>
            <span>DIST {distance.toLocaleString()} km</span>
        </div>
    </header>
);

// --- TAB PAGES ---

const OrbitalOverview = ({ distance, setDistance, coreg, setCoreg, view, relationship, updateData }) => {
    const [isSyncing, setIsSyncing] = useState(false);
    const syncInterval = useRef(null);
    const drainInterval = useRef(null);

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

    const fogDensity = Math.max(0, 10 - (coreg / 10));
    const sphereDist = 40 - (coreg * 0.35);

    return (
        <div className="flex flex-col lg:flex-row gap-6">
            {/* Left: Canvas */}
            <div className="flex-1 glass-panel p-6 flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-1">Orbital Canvas / Zero-G Sandbox</h3>
                        <h2 className="text-2xl font-serif text-brand-accent">Two bodies, one orbit</h2>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            className={`glass-button px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 ${isSyncing ? 'accent scale-105' : ''}`}
                            onMouseDown={() => setIsSyncing(true)} onMouseUp={() => setIsSyncing(false)} onMouseLeave={() => setIsSyncing(false)}
                            onTouchStart={() => setIsSyncing(true)} onTouchEnd={() => setIsSyncing(false)}
                        >
                            <Orbit size={14} /> Sync Hold
                        </button>
                        <button className="glass-button px-4 py-2 rounded-full text-xs font-bold">Drift</button>
                    </div>
                </div>

                <div className="relative w-full h-80 rounded-2xl overflow-hidden border border-white/20 canvas-grid mb-6 flex items-center justify-center">
                    <div className="ambient-fog" style={{ '--fog-density': `${fogDensity}px` }}></div>
                    <div className="absolute top-4 left-4 text-xs font-bold opacity-60 z-30">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • {Math.floor(distance).toLocaleString()} KM</div>
                    <div className="absolute top-4 right-4 text-xs font-bold opacity-60 z-30 flex items-center gap-1"><Orbit size={12}/> {isSyncing ? 'SYNCING' : 'DRIFTING'}</div>

                    {/* Connecting Line */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-0.5 bg-brand-accent/50 z-10" style={{ width: `calc(${sphereDist * 2}% + 3rem)` }}></div>

                    {/* Spheres */}
                    <div className="partner-sphere sphere-a w-16 h-16 flex items-center justify-center font-bold text-lg" style={{ left: `calc(50% - 2rem - ${sphereDist}%)` }}>A</div>
                    <div className="partner-sphere sphere-b w-16 h-16 flex items-center justify-center font-bold text-lg" style={{ right: `calc(50% - 2rem - ${sphereDist}%)` }}>B</div>
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
                            <div className="w-3/4 h-1 bg-white/20 rounded-full overflow-hidden"><div className="h-full bg-brand-accent" style={{width: `${(fogDensity/10)*100}%`}}></div></div>
                            <span className="text-sm font-medium">{fogDensity.toFixed(2)}</span>
                        </div>
                    </div>
                    <div className="flex-1 glass-card p-4 flex flex-col justify-between h-20">
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Distance (KM)</span>
                        <div className="flex justify-end items-end">
                            <span className="text-sm font-medium">{Math.floor(distance).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right: Wellness & Polaroid */}
            <div className="w-full lg:w-80 shrink-0 flex flex-col gap-6">
                <div className="glass-panel p-6 flex flex-col gap-4">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <h3 className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-1">Daily Wellness Check</h3>
                            <h2 className="text-lg font-serif">Have you eaten, Partner {view}?</h2>
                        </div>
                        <button className="text-[10px] uppercase font-bold tracking-widest border border-white/20 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-white/10 transition"><Bell size={12}/> Remind</button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {['breakfast', 'lunch', 'dinner'].map(m => (
                            <button key={m} onClick={() => toggleMeal(m)} className={`glass-card p-3 flex flex-col items-center justify-center gap-2 transition ${meals[m] ? 'bg-white/20' : 'hover:bg-white/10'}`}>
                                <Activity size={16} className={meals[m] ? 'text-brand-accent' : 'opacity-50'}/>
                                <span className="text-[10px] font-bold capitalize">{m}</span>
                            </button>
                        ))}
                    </div>
                    <p className="text-[10px] opacity-50 text-center mt-2">Partner {view === 'A' ? 'B' : 'A'} today: {Object.values(view === 'A' ? relationship.meals_b : relationship.meals_a).filter(Boolean).length}/3 meals logged</p>
                </div>

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

const MoodSpace = ({ view, relationship, updateData }) => {
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
                
                <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="a fleeting note for the shared ledger..." className="glass-input min-h-[100px] mb-4"></textarea>
                <button onClick={transmit} className="glass-button accent px-8 py-3 rounded-xl font-bold text-sm w-full md:w-auto">Transmit</button>
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
                            <div className="absolute -left-12 top-2 w-4 h-4 rounded-full border-2 border-brand-accent bg-sunset-indigo z-10 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-brand-accent rounded-full"></div></div>
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
                    <button onClick={addMemory} className="glass-button accent py-3 rounded-xl font-bold flex items-center justify-center gap-2"><Plus size={16}/> Add to arc</button>
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
                <button onClick={() => { if(url) updateData({ spotify_url: url }); setUrl(''); }} className="glass-button accent px-8 py-3 rounded-xl font-bold w-full md:w-auto flex items-center justify-center gap-2"><Music size={16}/> Tune in</button>
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

const CycleLogger = ({ view, relationship, updateData }) => {
    // Generate a simple dummy calendar array for visual representation
    const days = Array.from({length: 30}, (_, i) => i + 1);
    const [selectedDay, setSelectedDay] = useState(20);

    const logKey = view === 'A' ? 'cycle_logs_a' : 'cycle_logs_b';
    const logs = relationship[logKey] || {};
    const currentLog = logs[selectedDay] || { flow: 'None', energy: 5, notes: '' };

    const updateLog = (updates) => {
        const newLogs = { ...logs, [selectedDay]: { ...currentLog, ...updates } };
        updateData({ [logKey]: newLogs });
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full">
            {/* Left: Calendar */}
            <div className="flex-[3] glass-panel p-8">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-[10px] uppercase tracking-widest font-bold opacity-60 flex items-center gap-2"><Calendar size={12}/> PRIVATE • STORED LOCALLY • PARTNER {view}</h3>
                    <div className="flex gap-2">
                        <button className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 transition"><ChevronLeft size={16}/></button>
                        <button className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 transition"><ChevronRight size={16}/></button>
                    </div>
                </div>
                <h2 className="text-3xl font-serif text-brand-accent mb-8">June 2026</h2>
                
                <div className="grid grid-cols-7 gap-4 text-center">
                    {['MO','TU','WE','TH','FR','SA','SU'].map(d => <div key={d} className="text-[10px] uppercase font-bold opacity-50 mb-2">{d}</div>)}
                    {days.map(d => (
                        <button key={d} onClick={() => setSelectedDay(d)} className={`aspect-square rounded-2xl flex items-center justify-center transition ${selectedDay === d ? 'border-2 border-brand-accent text-brand-accent bg-brand-accent/5' : 'glass-card hover:bg-white/10'}`}>
                            {d}
                        </button>
                    ))}
                </div>
            </div>

            {/* Right: Day Log */}
            <div className="flex-[2] glass-panel p-8">
                <h3 className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-2">Day Log</h3>
                <h2 className="text-2xl font-serif mb-8">Fri Jun {selectedDay} 2026</h2>

                <div className="mb-8">
                    <h4 className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-4">Flow</h4>
                    <div className="flex gap-2">
                        {['None', 'Light', 'Medium', 'Heavy'].map(f => (
                            <button key={f} onClick={() => updateLog({ flow: f })} className={`flex-1 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider transition border ${currentLog.flow === f ? 'bg-brand-accent/20 border-brand-accent text-brand-accent' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mb-8">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-[10px] uppercase tracking-widest font-bold opacity-60">Energy</h4>
                        <span className="text-[10px] uppercase tracking-widest font-bold opacity-60">{currentLog.energy} / 10</span>
                    </div>
                    <input type="range" min="0" max="10" value={currentLog.energy} onChange={e => updateLog({ energy: parseInt(e.target.value) })} className="glass-slider" />
                </div>

                <textarea value={currentLog.notes} onChange={e => updateLog({ notes: e.target.value })} placeholder="Notes for this day..." className="glass-input h-32"></textarea>
            </div>
        </div>
    );
};

// --- APP ROOT ---
const App = () => {
    const [activePage, setActivePage] = useState('orbital');
    const [view, setView] = useState('A');
    
    const [relationship, setRelationship] = useState(() => loadState({
        scores_a: [7, 6, 8, 5, 7, 9], scores_b: [6, 8, 7, 4, 8, 9],
        meals_a: { breakfast: true, lunch: false, dinner: false }, meals_b: { breakfast: false, lunch: true, dinner: false },
        memories: [{ id: 1, title: 'The Meeting', chapter: 'Chapter 1', date: '2023-04-12', caption: 'The first orbit aligned.', url: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=800&q=80' }],
        moods: [], spotify_url: "https://open.spotify.com/playlist/37i9dQZF1EJH75B3mnDgmp",
        distance: 6400, coRegulation: 62
    }));

    const [distance, setDistance] = useState(relationship.distance);
    const [coRegulation, setCoRegulation] = useState(relationship.coRegulation);

    const updateData = (updates) => {
        const next = { ...relationship, ...updates };
        setRelationship(next); saveState(next);
    };

    useEffect(() => {
        const t = setTimeout(() => updateData({ distance, coRegulation }), 1000);
        return () => clearTimeout(t);
    }, [distance, coRegulation]);

    const renderPage = () => {
        switch(activePage) {
            case 'orbital': return <OrbitalOverview distance={distance} setDistance={setDistance} coreg={coRegulation} setCoreg={setCoRegulation} view={view} relationship={relationship} updateData={updateData} />;
            case 'balance': return <LifeBalance view={view} relationship={relationship} updateData={updateData} />;
            case 'mood': return <MoodSpace view={view} relationship={relationship} updateData={updateData} />;
            case 'journal': return <MemoryJournal relationship={relationship} updateData={updateData} />;
            case 'soundtrack': return <Soundtrack relationship={relationship} updateData={updateData} />;
            case 'cycle': return <CycleLogger view={view} relationship={relationship} updateData={updateData} />;
            default: return null;
        }
    };

    return (
        <div className="min-h-screen flex flex-col md:flex-row p-4 md:p-6 gap-6 relative">
            <Sidebar activePage={activePage} setActivePage={setActivePage} />
            <main className="flex-1 flex flex-col min-w-0">
                <Header view={view} setView={setView} distance={distance} coreg={coRegulation} />
                <div className="flex-1 overflow-y-auto">
                    {renderPage()}
                </div>
            </main>
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
