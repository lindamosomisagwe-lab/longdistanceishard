import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { 
    Orbit, Activity, Smile, BookOpen, Music, Calendar, 
    Bell, Image as ImageIcon, ChevronLeft, ChevronRight, Plus, Moon,
    User, Heart, Sparkles, Target, Cloud, Star, LogOut
} from 'lucide-react';

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

const defaultState = {
    scores_a: [7, 6, 8, 5, 7, 9], scores_b: [6, 8, 7, 4, 8, 9],
    meals_a: { breakfast: true, lunch: false, dinner: false }, 
    meals_b: { breakfast: false, lunch: true, dinner: false },
    memories: [{ id: 1, title: 'The Meeting', chapter: 'Chapter 1', date: '2023-04-12', caption: 'The first orbit aligned.', url: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=800&q=80' }],
    moods: [], 
    goals: [{ id: 1, text: 'Plan Anniversary Trip', completed: false }],
    spotify_url: "https://open.spotify.com/playlist/37i9dQZF1EJH75B3mnDgmp",
    distance: 6400, coRegulation: 62,
    partnerA_cycleData: { day: 14, symptoms: [], needSpace: false, sendSnacks: false },
    reEntryEndTime: null,
    wakes: { A: [], B: [] },
    isThermalBlanketActive: false,
    liftForce: { A: 0, B: 0 }
};

const CATEGORIES = ['Romance', 'Physical & Mental Health', 'Personal Growth', 'Career & Business', 'Finances', 'Leisure'];

// --- FIREBASE AUTH SCREEN ---
const AuthScreen = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); setLoading(true);
        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
            }
        } catch (err) {
            setError(err.message);
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-3xl">
            <div className="glass-panel p-12 max-w-md w-full text-center flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-brand-accent/10 flex items-center justify-center border border-brand-accent/30 mb-8 shadow-[0_0_30px_rgba(224,242,254,0.1)]">
                    <Star size={32} className="text-brand-accent" />
                </div>
                <h1 className="text-3xl font-serif mb-2 text-white">Between Us</h1>
                <p className="text-sm opacity-70 mb-8 text-blue-100">{isLogin ? 'Welcome back to the sanctuary.' : 'Create a new sanctuary.'}</p>
                
                {error && <div className="text-xs text-red-400 bg-red-400/10 p-3 rounded-lg mb-4 w-full">{error}</div>}
                
                <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
                    <input type="email" placeholder="Email" required className="glass-input" value={email} onChange={e => setEmail(e.target.value)} />
                    <input type="password" placeholder="Password" required className="glass-input" value={password} onChange={e => setPassword(e.target.value)} />
                    <button type="submit" disabled={loading} className="glass-button accent py-3 mt-2 font-bold w-full">
                        {loading ? 'Authenticating...' : (isLogin ? 'Enter' : 'Create')}
                    </button>
                </form>
                
                <button onClick={() => setIsLogin(!isLogin)} className="mt-6 text-xs opacity-60 hover:opacity-100 transition">
                    {isLogin ? 'Need an account? Sign up' : 'Already have an account? Log in'}
                </button>
            </div>
        </div>
    );
};

// --- FIREBASE PAIRING SCREEN ---
const PairingScreen = ({ user, setUserData }) => {
    const [joinCode, setJoinCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const createSanctuary = async () => {
        setLoading(true);
        setError('');
        try {
            const code = Math.random().toString(36).substring(2, 8).toUpperCase();
            await set(ref(db, 'sanctuaries/' + code), { ...defaultState, partnerA: user.uid });
            await set(ref(db, 'users/' + user.uid), { sanctuaryId: code, role: 'A' });
            setUserData({ sanctuaryId: code, role: 'A' }); // Force immediate UI transition
        } catch (err) {
            console.error(err);
            setError(err.message || 'Failed to create sanctuary. Check your connection or Firebase rules.');
        }
        setLoading(false);
    };

    const joinSanctuary = async () => {
        if (!joinCode) return;
        setLoading(true);
        setError('');
        try {
            const code = joinCode.toUpperCase();
            const sanctuaryRef = ref(db, 'sanctuaries/' + code);
            const snapshot = await get(sanctuaryRef);
            if (snapshot.exists() && !snapshot.val().partnerB) {
                await update(sanctuaryRef, { partnerB: user.uid });
                await set(ref(db, 'users/' + user.uid), { sanctuaryId: code, role: 'B' });
                setUserData({ sanctuaryId: code, role: 'B' }); // Force immediate UI transition
            } else {
                setError('Invalid code or Sanctuary is full.');
            }
        } catch (err) {
            console.error(err);
            setError(err.message || 'Failed to join sanctuary. Check the code and try again.');
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-3xl">
            <div className="glass-panel p-12 max-w-2xl w-full flex flex-col items-center">
                <h1 className="text-3xl font-serif mb-8 text-white text-center">Establish Connection</h1>
                {error && <div className="text-xs text-red-400 bg-red-400/10 p-3 rounded-lg mb-4 w-full text-center">{error}</div>}
                
                <div className="flex flex-col md:flex-row gap-6 w-full">
                    <div className="flex-1 glass-card p-6 flex flex-col items-center text-center">
                        <div className="w-12 h-12 rounded-full bg-yellow-400/10 flex items-center justify-center mb-4"><Star className="text-yellow-400"/></div>
                        <h2 className="text-lg font-bold mb-2">Create Sanctuary</h2>
                        <p className="text-xs opacity-60 mb-6">Start a new space and get a Tether Code to give to your partner. You will be Partner A.</p>
                        <button onClick={createSanctuary} disabled={loading} className="glass-button accent py-2 px-6 font-bold w-full mt-auto">Create</button>
                    </div>

                    <div className="flex-1 glass-card p-6 flex flex-col items-center text-center">
                        <div className="w-12 h-12 rounded-full bg-sky-400/10 flex items-center justify-center mb-4"><Orbit className="text-sky-400"/></div>
                        <h2 className="text-lg font-bold mb-2">Join Sanctuary</h2>
                        <p className="text-xs opacity-60 mb-6">Enter a Tether Code from your partner to link your accounts. You will be Partner B.</p>
                        <input type="text" placeholder="6-Digit Code" className="glass-input mb-4 text-center tracking-widest uppercase" value={joinCode} onChange={e => setJoinCode(e.target.value)} />
                        <button onClick={joinSanctuary} disabled={loading} className="glass-button w-full py-2 font-bold">Connect</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- ECHOES OVERLAY ---
const EchoesOverlay = ({ moods, view }) => {
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
};

// --- COMPONENTS ---
const Sidebar = ({ activePage, setActivePage, view, isReEntry, sanctuaryId }) => {
    let navItems = [
        { id: 'orbital', label: 'Our Space', icon: <Star size={18} /> },
        { id: 'balance', label: 'Our Rhythm', icon: <Activity size={18} /> },
        { id: 'mood', label: 'Heartbeats', icon: <Heart size={18} /> },
        { id: 'goals', label: 'Future Dreams', icon: <Cloud size={18} /> },
        { id: 'journal', label: 'Scrapbook', icon: <BookOpen size={18} /> },
        { id: 'soundtrack', label: 'Soundtrack', icon: <Music size={18} /> },
    ];
    if (view === 'A') navItems.push({ id: 'cycle', label: 'Soft Care', icon: <Calendar size={18} /> });

    return (
        <aside className="w-full md:w-64 shrink-0 flex flex-col gap-6 relative z-10">
            <div className={`glass-panel p-6 flex flex-col h-full relative ${isReEntry ? 'border-indigo-500/30' : ''}`}>
                <div className="flex items-center gap-3 mb-10">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(255,255,255,0.1)] border border-white/20">
                        <Moon size={20} className="text-white" />
                    </div>
                    <div>
                        <h2 className="font-bold text-sm tracking-widest uppercase opacity-90 leading-tight">Between Us</h2>
                        <p className="text-[10px] opacity-60">CODE: {sanctuaryId}</p>
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
                    {isReEntry && <div className="mb-4 text-center text-xs font-bold text-indigo-200 bg-indigo-900/40 py-3 rounded-xl border border-indigo-500/30">The Afterglow is active.</div>}
                    <button onClick={() => signOut(auth)} className="flex items-center justify-center gap-2 text-xs text-center opacity-40 hover:opacity-100 transition uppercase tracking-widest mt-4">
                        <LogOut size={14}/> Sign Out
                    </button>
                </div>
            </div>
        </aside>
    );
};

const Header = ({ view, distance, isReEntry, sanctuaryId, relationship }) => (
    <header className="glass-panel px-6 py-4 flex flex-col md:flex-row justify-between items-center mb-6 gap-4 relative z-10">
        <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                <Star size={16} className="text-brand-accent" />
            </div>
            <div>
                <p className="text-[10px] uppercase tracking-widest font-bold opacity-60">Firebase Realtime Sync</p>
                <p className="text-sm font-medium">Logged in as <span className="text-brand-accent font-semibold">Partner {view}</span></p>
            </div>
        </div>

        {!relationship.partnerB && view === 'A' && (
            <div className="flex-1 max-w-md mx-4 animate-pulse bg-brand-accent/20 border border-brand-accent text-brand-accent px-4 py-2 rounded-xl text-center">
                <span className="font-bold text-sm tracking-widest uppercase block mb-1">Waiting for Partner B</span>
                <span className="text-xs">Give them this Tether Code to join: <strong className="text-lg tracking-widest bg-black/40 px-3 py-1 rounded ml-2">{sanctuaryId}</strong></span>
            </div>
        )}

        <div className="flex gap-6 text-xs font-bold tracking-wider opacity-80">
            {isReEntry ? (
                <span className="flex items-center gap-2 text-indigo-300"><Moon size={14}/> THE AFTERGLOW</span>
            ) : (
                <span className="flex items-center gap-2"><Heart size={14} className="text-brand-accent"/> {distance.toLocaleString()} KM APART • TETHERED</span>
            )}
        </div>
    </header>
);

// --- TAB PAGES ---

const PoeticStatus = ({ view, relationship }) => {
    const otherPartner = view === 'A' ? 'B' : 'A';
    const moods = (relationship.moods || []).filter(m => m.partner === otherPartner);
    const lastMood = moods.length > 0 ? moods[0].mood.toLowerCase() : 'quiet';
    
    const meals = otherPartner === 'A' ? relationship.meals_a : relationship.meals_b;
    const mealsEaten = Object.keys(meals).filter(k => meals[k]).length;
    const mealStatus = mealsEaten === 0 ? "hasn't eaten yet today" : (mealsEaten === 3 ? "is well-fed today" : "has had some food today");

    const cycleData = relationship.partnerA_cycleData || defaultState.partnerA_cycleData;
    let cycleStatus = "";
    if (otherPartner === 'A') {
        if (cycleData.needSpace) cycleStatus = " and is hoping for a quiet day.";
        else if (cycleData.sendSnacks) cycleStatus = " and requested soft snacks.";
        else if (cycleData.symptoms.length > 0) cycleStatus = ` and is experiencing ${cycleData.symptoms[0].toLowerCase()}.`;
    }

    const pronoun = otherPartner === 'A' ? 'She' : 'He';
    const pronounPossessive = otherPartner === 'A' ? 'her' : 'his';

    return (
        <div className="mb-8 p-4 bg-white/5 border border-white/10 rounded-2xl italic font-serif text-lg leading-relaxed text-blue-100 shadow-inner">
            "{pronoun} is feeling {lastMood} right now. {pronoun} {mealStatus}{cycleStatus}"
        </div>
    );
};

const OurSpace = ({ distance, setDistance, coreg, setCoreg, view, relationship, updateData, isReEntry }) => {
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
                setDistance(prev => Math.min(6400, prev + 1));
            }, 200);
        }
        return () => { clearInterval(syncInterval.current); clearInterval(drainInterval.current); };
    }, [isSyncing]);

    const meals = view === 'A' ? relationship.meals_a : relationship.meals_b;
    const toggleMeal = (meal) => updateData({ [view === 'A' ? 'meals_a' : 'meals_b']: { ...meals, [meal]: !meals[meal] } });

    let sphereDist = 40 - (coreg * 0.35);
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
                {view === 'B' ? (
                    <div className="glass-panel p-6 flex flex-col border border-white/10 relative overflow-hidden">
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-sky-400/10 rounded-full blur-2xl pointer-events-none"></div>
                        <h3 className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-2 flex items-center gap-2"><Heart size={12} className="text-sky-300"/> Care Panel</h3>
                        
                        {(partnerAData.sendSnacks || partnerAData.needSpace || auraA.isHeavy) ? (
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
                                <p className="text-xs text-center mt-6 text-sky-100/80">She needs support. Tap & hold to send a warm blanket.</p>
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
};

const FutureDreams = ({ relationship, updateData }) => {
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
                    updateData({ reEntryEndTime: Date.now() + (72 * 60 * 60 * 1000) });
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
                    <h3 className="font-serif text-xl mb-2">The Afterglow Status</h3>
                    <p className="opacity-70 text-sm max-w-sm">Marking a 'Reunion Trip' triggers a 72-hour soft landing phase.</p>
                </div>
            </div>
        </div>
    );
};

const OurRhythm = ({ view, relationship, updateData }) => {
    const canvasRef = useRef(null);
    const chartRef = useRef(null);
    const scores = view === 'A' ? relationship.scores_a : relationship.scores_b;
    const partnerScores = view === 'A' ? relationship.scores_b : relationship.scores_a;

    useEffect(() => {
        if (!canvasRef.current || !window.Chart) return;
        if (chartRef.current) chartRef.current.destroy();
        chartRef.current = new window.Chart(canvasRef.current.getContext('2d'), {
            type: 'radar',
            data: {
                labels: CATEGORIES,
                datasets: [
                    { label: `Partner ${view}`, data: scores, backgroundColor: 'rgba(224, 242, 254, 0.2)', borderColor: 'rgba(224, 242, 254, 0.8)', borderWidth: 2 },
                    { label: `Partner ${view === 'A'?'B':'A'}`, data: partnerScores, backgroundColor: 'transparent', borderColor: 'rgba(255, 255, 255, 0.2)', borderDash: [5,5], borderWidth: 1 }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { r: { min: 0, max: 10, ticks: { display: false }, grid: { color: 'rgba(255,255,255,0.05)' }, angleLines: { color: 'rgba(255,255,255,0.05)' }, pointLabels: { color: 'rgba(255,255,255,0.5)', font: { family: 'Inter', size: 10 } } } }, plugins: { legend: { position: 'bottom', labels: { color: 'white', boxWidth: 10 } } } }
        });
    }, [scores, partnerScores, view]);

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full relative z-10">
            <div className="flex-1 glass-panel p-8">
                <h3 className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-2">Flow Check</h3>
                <h2 className="text-2xl font-serif text-brand-accent mb-10">How is Partner {view} feeling?</h2>
                <div className="flex flex-col gap-8">
                    {CATEGORIES.map((cat, i) => (
                        <div key={i}>
                            <div className="flex justify-between text-xs font-bold uppercase tracking-wider opacity-80 mb-3"><span>{cat}</span><span>{scores[i].toFixed(1)} / 10</span></div>
                            <input type="range" min="0" max="10" step="0.5" value={scores[i]} onChange={(e) => { const newS = [...scores]; newS[i] = parseFloat(e.target.value); updateData({ [view==='A'?'scores_a':'scores_b']: newS }); }} />
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex-1 glass-panel p-8 flex flex-col"><div className="flex-1 relative min-h-[300px]"><canvas ref={canvasRef}></canvas></div></div>
        </div>
    );
};

const Heartbeats = ({ view, relationship, updateData, isReEntry }) => {
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
};

const Scrapbook = ({ relationship, updateData }) => {
    // Component omitted for brevity, identical to previous
    return <div className="p-8 glass-panel text-center">Scrapbook functionality (Refer to previous versions)</div>;
};

const Soundtrack = ({ relationship, updateData }) => {
    // Component omitted for brevity
    return <div className="p-8 glass-panel text-center">Soundtrack functionality (Refer to previous versions)</div>;
};

const SoftCare = ({ relationship, updateData }) => {
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
};

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
                // Listen to user data (role & sanctuaryId) dynamically so creation triggers a re-render
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

    // Realtime Database Listener for the shared Sanctuary
    useEffect(() => {
        if (!userData?.sanctuaryId) return;
        const sanctuaryRef = ref(db, 'sanctuaries/' + userData.sanctuaryId);
        const unsubSanctuary = onValue(sanctuaryRef, (snapshot) => {
            if (snapshot.exists()) setRelationship({ ...defaultState, ...snapshot.val() });
        }, (error) => {
            console.error("Sanctuary sync error:", error);
        });
        return unsubSanctuary;
    }, [userData]);

    // Firebase Mutator
    const updateData = async (updates) => {
        if (!userData?.sanctuaryId) return;
        const next = { ...relationship, ...updates };
        setRelationship(next); // optimistic local update
        try { await update(ref(db, 'sanctuaries/' + userData.sanctuaryId), updates); }
        catch (e) { console.error("Database update failed", e); }
    };

    const isReEntry = relationship.reEntryEndTime && Date.now() < relationship.reEntryEndTime;

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
    if (!userData?.sanctuaryId) return <PairingScreen user={user} setUserData={setUserData} />;

    const renderPage = () => {
        switch(activePage) {
            case 'orbital': return <OurSpace distance={distance} setDistance={setDistance} coreg={coRegulation} setCoreg={setCoRegulation} view={userData.role} relationship={relationship} updateData={updateData} isReEntry={isReEntry} />;
            case 'balance': return <OurRhythm view={userData.role} relationship={relationship} updateData={updateData} />;
            case 'mood': return <Heartbeats view={userData.role} relationship={relationship} updateData={updateData} isReEntry={isReEntry} />;
            case 'goals': return <FutureDreams relationship={relationship} updateData={updateData} />;
            case 'journal': return <Scrapbook relationship={relationship} updateData={updateData} />;
            case 'soundtrack': return <Soundtrack relationship={relationship} updateData={updateData} />;
            case 'cycle': return userData.role === 'A' ? <SoftCare relationship={relationship} updateData={updateData} /> : null;
            default: return <OurSpace distance={distance} setDistance={setDistance} coreg={coRegulation} setCoreg={setCoRegulation} view={userData.role} relationship={relationship} updateData={updateData} isReEntry={isReEntry} />;
        }
    };

    return (
        <>
            <EchoesOverlay moods={relationship.moods} view={userData.role} />
            {relationship.isThermalBlanketActive && userData.role === 'A' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none bg-black/40 backdrop-blur-md">
                    <h1 className="text-4xl md:text-6xl font-serif text-orange-200 animate-pulse tracking-wide drop-shadow-2xl">He is with you.</h1>
                </div>
            )}
            <div className={`flex flex-col md:flex-row h-screen p-4 md:p-6 gap-6 relative z-10 transition-opacity duration-1000 ${relationship.isThermalBlanketActive && userData.role === 'A' ? 'opacity-20' : 'opacity-100 text-white/90'}`}>
                <Sidebar activePage={activePage} setActivePage={setActivePage} view={userData.role} isReEntry={isReEntry} sanctuaryId={userData.sanctuaryId} />
                <main className="flex-1 flex flex-col min-w-0">
                    <Header view={userData.role} distance={distance} isReEntry={isReEntry} sanctuaryId={userData.sanctuaryId} relationship={relationship} />
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
