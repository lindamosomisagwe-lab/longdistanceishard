import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { motion, AnimatePresence } from 'motion/react';

// Exactly 6 Wellness Categories for the life balance tracker
const CATEGORIES = [
    'Romance, Intimacy & Relationships',
    'Physical & Mental Health',
    'Personal Growth & Spirituality',
    'Career & Business',
    'Finances',
    'Fun & Leisure'
];

// --- UTILS ---
const parseSpotifyUrl = (url) => {
    if (!url) return '';
    const regex = /(?:https?:\/\/)?(?:open\.)?spotify\.com\/(playlist|track|album)\/([a-zA-Z0-9]{22})/;
    const match = url.match(regex);
    if (match) {
        return `https://open.spotify.com/embed/${match[1]}/${match[2]}`;
    }
    return '';
};

const parseImageUrl = (url) => {
    if (!url) return '';
    const urlRegex = /(https?:\/\/[^\s"'>\(\)]+)/;
    const match = url.match(urlRegex);
    let extractedUrl = match ? match[1] : url;
    extractedUrl = extractedUrl.replace(/["'>\)]+$/, '');

    if (extractedUrl.includes('googleusercontent.com') || extractedUrl.includes('lh3.google.com') || extractedUrl.includes('lh3.googleusercontent.com')) {
        const cleanUrl = extractedUrl.split('=')[0];
        return `${cleanUrl}=w1000-h1000`;
    }
    return extractedUrl;
};

// --- GOOGLE DRIVE APP DATA SYNCING HELPERS ---
const GOOGLE_CLIENT_ID = "887230704768-mh4ea4sl361fjhq20k03056bjmc49mkv.apps.googleusercontent.com";
let isGapiInitialized = false;
let gapiInitPromise = null;

const ensureGapiInitialized = async (accessToken) => {
    if (isGapiInitialized) {
        if (accessToken && window.gapi && gapi.client) {
            gapi.client.setToken({ access_token: accessToken });
        }
        return;
    }
    
    if (!gapiInitPromise) {
        gapiInitPromise = (async () => {
            let attempts = 0;
            while (!window.gapi) {
                attempts++;
                if (attempts > 100) {
                    throw new Error("Google API library (gapi) failed to load.");
                }
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            await new Promise((resolve) => gapi.load('client', resolve));
            await gapi.client.init({
                discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/discovery"],
            });
            isGapiInitialized = true;
        })();
    }
    
    await gapiInitPromise;
    if (accessToken && window.gapi && gapi.client) {
        gapi.client.setToken({ access_token: accessToken });
    }
};

const executeGapiOperation = async (accessToken, operation) => {
    await ensureGapiInitialized(accessToken);
    if (!isGapiInitialized || !window.gapi || !gapi.client) {
        throw new Error("The gapi client has not been initialized yet.");
    }
    return await operation();
};

const createNewSyncFile = async (accessToken, content) => {
    return await executeGapiOperation(accessToken, async () => {
        const boundary = "314159265358979323846";
        const metadata = {
            name: "anti_gravity_sync.json",
            parents: ["appDataFolder"]
        };
        const response = await gapi.client.request({
            path: '/upload/drive/v3/files',
            method: 'POST',
            params: { uploadType: 'multipart' },
            headers: {
                'Content-Type': `multipart/related; boundary=${boundary}`
            },
            body: `\r\n--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}` +
                  `\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(content)}` +
                  `\r\n--${boundary}--`
        });
        return response.result.id;
    });
};

const checkOrCreateSyncFile = async (accessToken, initialContent) => {
    return await executeGapiOperation(accessToken, async () => {
        const response = await gapi.client.drive.files.list({
            spaces: 'appDataFolder',
            q: "name = 'anti_gravity_sync.json' and 'appDataFolder' in parents",
            fields: 'files(id, name)'
        });
        const files = response.result.files;
        if (files && files.length > 0) {
            return files[0].id;
        } else {
            return await createNewSyncFile(accessToken, initialContent);
        }
    });
};

const downloadSyncState = async (accessToken, fileId) => {
    return await executeGapiOperation(accessToken, async () => {
        try {
            const response = await gapi.client.drive.files.get({
                fileId: fileId,
                alt: 'media'
            });
            return response.result;
        } catch (err) {
            if (err.status === 404) {
                return null;
            }
            throw err;
        }
    });
};

const uploadSyncState = async (accessToken, fileId, content) => {
    return await executeGapiOperation(accessToken, async () => {
        const response = await gapi.client.request({
            path: `/upload/drive/v3/files/${fileId}`,
            method: 'PATCH',
            params: { uploadType: 'media' },
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(content)
        });
        return response.result;
    });
};

const fetchGoogleUserInfo = async (accessToken) => {
    const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { "Authorization": `Bearer ${accessToken}` }
    });
    if (!res.ok) throw new Error("Failed to fetch Google profile.");
    return await res.json();
};

// --- RENDER SOUND/PING EFFECT ---
const playSoftChime = () => {
    try {
        const context = new (window.AudioContext || window.webkitAudioContext)();
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.connect(gain);
        gain.connect(context.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, context.currentTime); // A4 note
        osc.frequency.exponentialRampToValueAtTime(880, context.currentTime + 0.15); // Slide up to A5
        gain.gain.setValueAtTime(0.08, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.6);
        osc.start(context.currentTime);
        osc.stop(context.currentTime + 0.6);
    } catch (e) {
        // AudioContext browser restrictions fallback
    }
};

// --- STARRY FIELD COMPONENT ---
const StarField = () => {
    const [stars, setStars] = useState([]);
    useEffect(() => {
        const generated = Array.from({ length: 90 }).map((_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: Math.random() * 1.5 + 0.5,
            opacity: Math.random() * 0.6 + 0.2,
            pulseDuration: Math.random() * 6 + 3
        }));
        setStars(generated);
    }, []);

    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 bg-[#0A0912]">
            {stars.map((star) => (
                <motion.div
                    key={star.id}
                    className="absolute bg-white rounded-full"
                    style={{
                        left: `${star.x}%`,
                        top: `${star.y}%`,
                        width: star.size,
                        height: star.size,
                    }}
                    animate={{
                        opacity: [star.opacity, star.opacity * 0.15, star.opacity]
                    }}
                    transition={{
                        duration: star.pulseDuration,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
            ))}
        </div>
    );
};

// --- CHARTS: Rethemed Retaining Absolute Custom Aesthetics ---
const RethemedDashboardChart = ({ myMood, partnerMood, myName, partnerName }) => {
    const canvasRef = useRef(null);
    const chartRef = useRef(null);

    useEffect(() => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');

        if (chartRef.current) {
            chartRef.current.destroy();
        }

        chartRef.current = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: [myName, partnerName],
                datasets: [
                    {
                        data: [myMood, 10 - myMood],
                        backgroundColor: ['#C4899A', 'rgba(196, 137, 154, 0.05)'],
                        borderWidth: 0,
                        circumference: 180,
                        rotation: 270,
                        weight: 0.5,
                        borderRadius: 10
                    },
                    {
                        data: [partnerMood, 10 - partnerMood],
                        backgroundColor: ['#8A9CC4', 'rgba(138, 156, 196, 0.05)'],
                        borderWidth: 0,
                        circumference: 180,
                        rotation: 270,
                        weight: 0.5,
                        borderRadius: 10
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        enabled: true,
                        backgroundColor: '#131220',
                        titleColor: '#EDE8E0',
                        bodyColor: '#EDE8E0',
                        borderColor: 'rgba(255,255,255,0.05)',
                        borderWidth: 1,
                        bodyFont: { family: 'DM Sans' }
                    }
                }
            }
        });

        return () => {
            if (chartRef.current) chartRef.current.destroy();
        };
    }, [myMood, partnerMood, myName, partnerName]);

    return (
        <div className="relative w-44 h-44 flex items-center justify-center">
            <canvas ref={canvasRef} />
            <div className="absolute flex flex-col items-center justify-center text-center mt-4">
                <span className="text-[10px] font-mono tracking-wider text-text-muted uppercase">Mood Level</span>
                <div className="flex gap-2 items-baseline">
                    <span className="text-xl font-bold text-accent-you">{myMood}</span>
                    <span className="text-xs text-text-muted">/</span>
                    <span className="text-xl font-bold text-accent-them">{partnerMood}</span>
                </div>
            </div>
        </div>
    );
};

const RethemedHistoryChart = ({ historyYou, historyThem, myName, partnerName }) => {
    const canvasRef = useRef(null);
    const chartRef = useRef(null);

    useEffect(() => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');

        if (chartRef.current) {
            chartRef.current.destroy();
        }

        chartRef.current = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [
                    {
                        label: myName,
                        data: historyYou,
                        borderColor: '#C4899A',
                        backgroundColor: 'rgba(196, 137, 154, 0.05)',
                        fill: true,
                        tension: 0.4,
                        borderWidth: 2,
                        pointBackgroundColor: '#C4899A',
                        pointBorderColor: '#0A0912',
                        pointHoverRadius: 6,
                        pointRadius: 4,
                    },
                    {
                        label: partnerName,
                        data: historyThem,
                        borderColor: '#8A9CC4',
                        backgroundColor: 'rgba(138, 156, 196, 0.05)',
                        fill: true,
                        tension: 0.4,
                        borderWidth: 2,
                        pointBackgroundColor: '#8A9CC4',
                        pointBorderColor: '#0A0912',
                        pointHoverRadius: 6,
                        pointRadius: 4,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        labels: {
                            color: '#EDE8E0',
                            font: { family: 'DM Sans', size: 11 }
                        }
                    },
                    tooltip: {
                        backgroundColor: '#131220',
                        titleColor: '#EDE8E0',
                        bodyColor: '#EDE8E0',
                        borderColor: 'rgba(255,255,255,0.05)',
                        borderWidth: 1
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: '#7A7A96', font: { family: 'DM Sans', size: 10 } }
                    },
                    y: {
                        min: 1,
                        max: 10,
                        grid: { color: 'rgba(255, 255, 255, 0.02)' },
                        ticks: { color: '#7A7A96', font: { family: 'DM Sans', size: 10 } }
                    }
                }
            }
        });

        return () => {
            if (chartRef.current) chartRef.current.destroy();
        };
    }, [historyYou, historyThem, myName, partnerName]);

    return (
        <div className="w-full h-56">
            <canvas ref={canvasRef} />
        </div>
    );
};

// --- APP COMPONENT ---
const App = () => {
    const [currentView, setCurrentView] = useState('A'); // 'A' or 'B' representing who is currently interactive
    const [activeRoom, setActiveRoom] = useState('inbox'); // 'inbox', 'journal', 'photos', 'checkin', 'settings'
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [planePosition, setPlanePosition] = useState({ x: 0, y: 0 });
    const [reactionTarget, setReactionTarget] = useState(null);
    const [floatingReactions, setFloatingReactions] = useState([]);
    const [selectedPhoto, setSelectedPhoto] = useState(null);

    // Core Relationship synchronized state
    const [relationship, setRelationship] = useState({
        scores_a: [8, 7, 9, 6, 8, 9],
        scores_b: [7, 8, 8, 5, 9, 9],
        meals_a: { breakfast: true, lunch: false, dinner: false },
        meals_b: { breakfast: false, lunch: true, dinner: false },
        cycle_a: { day: 14, mood: 'Calm ✨', status: 'Send love 🤍' },
        cycle_b: { day: 10, mood: 'Tired ☕', status: 'Need a warm hug' },
        memories: [
            { id: 1, url: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', caption: 'That rainy afternoon where we shared an umbrella and got lost in Montmartre.', date: 'Oct 12, 2025' }
        ],
        notes: [
            { id: 1, text: "Thinking of you as the night settles in here. The space between us feels wide tonight, but looking up at the same stars makes it a little smaller.", sender: 'B', timestamp: '10:14 PM', reactions: ['heart'] },
            { id: 2, text: "Always under the same sky, my love. I just lit the candle we bought together. It feels like you're right here.", sender: 'A', timestamp: '10:18 PM', reactions: ['star'] }
        ],
        checkin_a: {
            mood: 8,
            q1: "The coffee shop down the street had that sweet vanilla cream we both adore.",
            q2: "Slow Dancing in a Burning Room - John Mayer",
            q3: "Keep warm, sleep early. I'm with you in my dreams."
        },
        checkin_b: {
            mood: 6,
            q1: "It rained heavily today. I sat by the glass pane and watched the droplets race.",
            q2: "Warm Glow - Hippo Campus",
            q3: "I left a note on our notebook. Read it when you wake."
        },
        mood_history_a: [7, 8, 6, 8, 9, 7, 8],
        mood_history_b: [6, 7, 5, 6, 8, 6, 6],
        spotify_url: "https://open.spotify.com/playlist/37i9dQZF1EJH75B3mnDgmp?si=31caa83610fa42a2"
    });

    const [noteText, setNoteText] = useState("");
    const [newPhotoUrl, setNewPhotoUrl] = useState("");
    const [newPhotoCap, setNewPhotoCap] = useState("");
    const [uploading, setUploading] = useState(false);

    // Google Auth & Sync States
    const [accessToken, setAccessToken] = useState(() => localStorage.getItem('antigravity_access_token') || '');
    const [googleUser, setGoogleUser] = useState(null);
    const [syncFileId, setSyncFileId] = useState(() => localStorage.getItem('antigravity_file_id') || '');
    const [syncStatus, setSyncStatus] = useState('offline'); // 'offline' | 'connecting' | 'synced' | 'error'
    const [gapiLoading, setGapiLoading] = useState(false);
    const [gapiStatus, setGapiStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
    const [localAlert, setLocalAlert] = useState("");

    const tokenClientRef = useRef(null);

    // Check prefers-reduced-motion
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Toast alarm utility
    const triggerToast = (msg) => {
        setLocalAlert(msg);
        setTimeout(() => setLocalAlert(""), 4500);
    };

    // Load standard Google API client silently
    useEffect(() => {
        const warmUpGapi = async () => {
            try {
                await ensureGapiInitialized(accessToken);
                setGapiStatus('ready');
            } catch (err) {
                console.error("GAPI warmup failed:", err);
                setGapiStatus('error');
            }
        };
        warmUpGapi();
    }, []);
    // Init Google Identity Services
    useEffect(() => {
        if (gapiStatus !== 'ready') return;

        const tryInit = () => {
            if (!window.google?.accounts) {
                setTimeout(tryInit, 200); // retry until GIS is ready
                return;
            }
            google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: async (credentialResponse) => {
                    try {
                        const base64Url = credentialResponse.credential.split('.')[1];
                        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
                            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                        }).join(''));
                        const decodedUser = JSON.parse(jsonPayload);
                        setGoogleUser({
                            name: decodedUser.name,
                            email: decodedUser.email,
                            picture: decodedUser.picture
                        });
                    } catch (e) {
                        console.error("Failed to decode JWT:", e);
                    }

                    if (tokenClientRef.current) {
                        setSyncStatus('connecting');
                        tokenClientRef.current.requestAccessToken();
                    }
                }
            });

            tokenClientRef.current = google.accounts.oauth2.initTokenClient({
                client_id: GOOGLE_CLIENT_ID,
                scope: 'https://www.googleapis.com/auth/drive.appdata',
                callback: async (tokenResponse) => {
                    if (tokenResponse.error) {
                        setSyncStatus('error');
                        triggerToast("Google Sync authorization failed.");
                        return;
                    }
                    if (tokenResponse.access_token) {
                        setAccessToken(tokenResponse.access_token);
                        localStorage.setItem('antigravity_access_token', tokenResponse.access_token);
                        setSyncStatus('connecting');
                    }
                },
            });
        };

        tryInit();
    }, [gapiStatus]);

    const handleConnectDrive = () => {
        if (tokenClientRef.current) {
            tokenClientRef.current.requestAccessToken();
        } else {
            triggerToast("Sync Portal is warm-connecting. Retry in a second.");
        }
    };

    const handleDisconnectDrive = () => {
        if (accessToken) {
            try { google.accounts.oauth2.revoke(accessToken, () => {}); } catch(e){}
        }
        setAccessToken('');
        setGoogleUser(null);
        setSyncFileId('');
        setSyncStatus('offline');
        localStorage.removeItem('antigravity_access_token');
        localStorage.removeItem('antigravity_file_id');
        triggerToast("Disconnected from secure cloud backup.");
    };

    // Auto-Sync Drive Loop
    useEffect(() => {
        if (!accessToken) {
            setSyncStatus('offline');
            return;
        }

        const setupSync = async () => {
            setGapiLoading(true);
            try {
                const userInfo = await fetchGoogleUserInfo(accessToken);
                setGoogleUser(userInfo);

                let fileId = await checkOrCreateSyncFile(accessToken, relationship);
                setSyncFileId(fileId);
                localStorage.setItem('antigravity_file_id', fileId);

                let driveState = await downloadSyncState(accessToken, fileId);
                if (driveState === null) {
                    fileId = await createNewSyncFile(accessToken, relationship);
                    setSyncFileId(fileId);
                    localStorage.setItem('antigravity_file_id', fileId);
                    driveState = relationship;
                }

                if (driveState && driveState.notes) {
                    setRelationship(driveState);
                }
                
                setSyncStatus('synced');
                triggerToast("Aligned orbits perfectly. Connected to Drive.");
            } catch (err) {
                console.error("Sync setup failed:", err);
                setSyncStatus('error');
                triggerToast("Cloud connection lost. Reconnect to keep state backed up.");
            } finally {
                setGapiLoading(false);
            }
        };

        setupSync();
    }, [accessToken]);

    const relationshipRef = useRef(relationship);
    useEffect(() => {
        relationshipRef.current = relationship;
    }, [relationship]);

    // Pull from cloud every 8 seconds
    useEffect(() => {
        if (syncStatus !== 'synced' || !accessToken || !syncFileId) return;

        const interval = setInterval(async () => {
            try {
                const driveState = await downloadSyncState(accessToken, syncFileId);
                if (driveState && driveState.notes) {
                    if (JSON.stringify(driveState) !== JSON.stringify(relationshipRef.current)) {
                        setRelationship(driveState);
                        triggerToast("Partner just left a small footprint in the room ✨");
                    }
                }
            } catch (err) {
                console.error("Background pull failed:", err);
            }
        }, 8000);

        return () => clearInterval(interval);
    }, [syncStatus, accessToken, syncFileId]);

    const pushStateToDrive = async (updatedState) => {
        if (syncStatus !== 'synced' || !accessToken || !syncFileId) return;
        try {
            await uploadSyncState(accessToken, syncFileId, updatedState);
        } catch (err) {
            console.error("State push failed:", err);
        }
    };

    // Derived states depending on Active view A vs B
    const myName = currentView === 'A' ? 'Partner A' : 'Partner B';
    const partnerName = currentView === 'A' ? 'Partner B' : 'Partner A';

    const myMoodValue = currentView === 'A' ? relationship.checkin_a.mood : relationship.checkin_b.mood;
    const partnerMoodValue = currentView === 'A' ? relationship.checkin_b.mood : relationship.checkin_a.mood;

    const myMeals = currentView === 'A' ? relationship.meals_a : relationship.meals_b;
    const partnerMeals = currentView === 'A' ? relationship.meals_b : relationship.meals_a;

    const myCycle = currentView === 'A' ? relationship.cycle_a : relationship.cycle_b;
    const partnerCycle = currentView === 'A' ? relationship.cycle_b : relationship.cycle_a;

    const myCheckin = currentView === 'A' ? relationship.checkin_a : relationship.checkin_b;
    const partnerCheckin = currentView === 'A' ? relationship.checkin_b : relationship.checkin_a;

    const myHistory = currentView === 'A' ? relationship.mood_history_a : relationship.mood_history_b;
    const partnerHistory = currentView === 'A' ? relationship.mood_history_b : relationship.mood_history_a;

    // Redesign Token values (CSS Custom Properties mapping)
    const customProps = currentView === 'A' ? {
        '--color-accent-you': '#C4899A',
        '--color-accent-them': '#8A9CC4',
        '--color-glow-you': 'rgba(196,137,154,0.12)',
        '--color-glow-them': 'rgba(138,156,196,0.12)',
    } : {
        '--color-accent-you': '#8A9CC4',
        '--color-accent-them': '#C4899A',
        '--color-glow-you': 'rgba(138,156,196,0.12)',
        '--color-glow-them': 'rgba(196,137,154,0.12)',
    };

    // Mutate state functions
    const toggleMeal = (mealKey) => {
        const nextMeals = { ...myMeals, [mealKey]: !myMeals[mealKey] };
        const next = {
            ...relationship,
            [currentView === 'A' ? 'meals_a' : 'meals_b']: nextMeals
        };
        setRelationship(next);
        pushStateToDrive(next);
        playSoftChime();
    };

    const triggerMealNudge = () => {
        playSoftChime();
        triggerToast(`Sent a gentle nudge for ${partnerName} to nourish themselves 🤍`);
    };

    const submitNote = (e) => {
        e.preventDefault();
        if (!noteText.trim()) return;

        setIsSending(true);
        playSoftChime();

        // Curved paper-plane offset calculation
        setTimeout(() => {
            const nextNotes = [
                {
                    id: Date.now(),
                    text: noteText,
                    sender: currentView,
                    timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
                    reactions: []
                },
                ...relationship.notes
            ];
            const next = { ...relationship, notes: nextNotes };
            setRelationship(next);
            pushStateToDrive(next);
            setNoteText("");
            setIsSending(false);
            triggerToast("Your paper plane has landed on their desk.");
        }, 1200);
    };

    const reactToEntry = (entryId, emoji) => {
        const nextNotes = relationship.notes.map(note => {
            if (note.id === entryId) {
                const reactions = note.reactions || [];
                const updatedReactions = reactions.includes(emoji) 
                    ? reactions.filter(r => r !== emoji) 
                    : [...reactions, emoji];
                return { ...note, reactions: updatedReactions };
            }
            return note;
        });

        const next = { ...relationship, notes: nextNotes };
        setRelationship(next);
        pushStateToDrive(next);
        playSoftChime();

        // Add float emoji to state
        const uniqueId = Math.random();
        setFloatingReactions(prev => [...prev, { id: uniqueId, emoji, left: Math.random() * 60 + 20 }]);
        setTimeout(() => {
            setFloatingReactions(prev => prev.filter(f => f.id !== uniqueId));
        }, 1500);
    };

    const submitCheckin = (moodVal, answers) => {
        const nextCheckin = {
            mood: moodVal,
            q1: answers.q1,
            q2: answers.q2,
            q3: answers.q3
        };
        const nextHistory = [...myHistory.slice(1), moodVal];

        const next = {
            ...relationship,
            [currentView === 'A' ? 'checkin_a' : 'checkin_b']: nextCheckin,
            [currentView === 'A' ? 'mood_history_a' : 'mood_history_b']: nextHistory
        };

        setRelationship(next);
        pushStateToDrive(next);
        playSoftChime();
        triggerToast("Daily ritual locked. The sky glows warmer now.");
    };

    const addPhoto = (e) => {
        e.preventDefault();
        if (!newPhotoUrl.trim()) return;

        setUploading(true);
        setTimeout(() => {
            const cleanUrl = parseImageUrl(newPhotoUrl);
            const newMemories = [
                {
                    id: Date.now(),
                    url: cleanUrl,
                    caption: newPhotoCap || "A quiet moment together",
                    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                },
                ...relationship.memories
            ];

            const next = { ...relationship, memories: newMemories };
            setRelationship(next);
            pushStateToDrive(next);
            setNewPhotoUrl("");
            setNewPhotoCap("");
            setUploading(false);
            triggerToast("Memory pinned to our wall.");
        }, 1000);
    };

    // Auto-greeting parser
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return `Good morning, ${myName}.`;
        if (hour < 18) return `Good afternoon, ${myName}.`;
        return `Good evening, ${myName}.`;
    };

    return (
        <div style={customProps} className="min-h-screen relative font-sans flex flex-col justify-between overflow-x-hidden pb-32">
            
            {/* Immersive Breathing Starfield */}
            <StarField />

            {/* Glowing Ambient Blooms representing two distinct far away hearts */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10 bg-accent-you filter blur-[100px] pointer-events-none z-0"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full opacity-10 bg-accent-them filter blur-[100px] pointer-events-none z-0"></div>

            {/* Soft Notification Toast */}
            <AnimatePresence>
                {localAlert && (
                    <motion.div
                        initial={{ y: -50, opacity: 0, filter: 'blur(4px)' }}
                        animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                        exit={{ y: -30, opacity: 0, filter: 'blur(4px)' }}
                        className="fixed top-6 left-1/2 -translate-x-1/2 bg-[#131220] border border-white/5 shadow-2xl p-4 rounded-full z-[1000] flex items-center gap-3 max-w-sm"
                    >
                        <div className="w-2.5 h-2.5 rounded-full bg-accent-them animate-pulse shadow-glow-them"></div>
                        <p className="text-xs font-mono font-medium text-text-primary tracking-wide">{localAlert}</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* MAIN APP CONTAINER */}
            <div className="w-full max-w-4xl mx-auto px-4 md:px-8 py-8 relative z-10 flex-1 flex flex-col justify-start">
                
                {/* 1. THE THRESHOLD (Authentication gate overlayed beautifully) */}
                {!accessToken ? (
                    <div className="flex-1 flex flex-col items-center justify-center min-h-[75vh] relative py-12">
                        {/* Faint glowing dots at opposite corners */}
                        <div className="absolute top-0 left-0 w-3 h-3 rounded-full bg-accent-you animate-pulse shadow-glow-you"></div>
                        <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-accent-them animate-pulse shadow-glow-them"></div>

                        <motion.div
                            initial={prefersReduced ? { opacity: 1 } : { opacity: 0, scale: 0.98, filter: 'blur(10px)' }}
                            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                            transition={{ duration: 1.5, ease: 'easeOut' }}
                            className="text-center flex flex-col items-center gap-8 max-w-lg w-full"
                        >
                            <div className="flex flex-col gap-3">
                                <h1 className="font-serif text-ivory text-5xl md:text-7xl font-bold tracking-tight">
                                    Anti-Gravity
                                </h1>
                                <p className="font-sans text-xs uppercase tracking-[0.25em] text-accent-you font-semibold">
                                    A private sanctuary for the ones who stay.
                                </p>
                            </div>

                            <p className="text-sm font-serif italic text-text-muted leading-relaxed max-w-md">
                                "Two cities. Different skies. But in our room, the distance between us melts completely."
                            </p>

                            <div className="w-full flex flex-col items-center gap-4 mt-6">
                                {gapiStatus === 'loading' ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-8 h-8 rounded-full border-2 border-accent-you/30 border-t-accent-you animate-spin"></div>
                                        <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest mt-2">Connecting orbital link...</span>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={handleConnectDrive} 
                                        className="bg-ivory hover:bg-accent-you hover:text-bg text-[#0A0912] font-semibold text-sm px-8 py-3.5 rounded-full transition-all shadow-glow-you duration-500 tracking-wide flex items-center gap-2 group transform active:scale-95"
                                    >
                                        Step inside our room <span className="group-hover:translate-x-1.5 transition-transform duration-300">→</span>
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </div>
                ) : (
                    
                    /* AUTHENTICATED COMPLETED ROOMS LAYOUT */
                    <div className="w-full flex-1 flex flex-col">
                        
                        {/* TOP STATUS WRAPPER */}
                        <header className="flex justify-between items-center mb-10 pb-4 border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div className="w-2.5 h-2.5 rounded-full bg-accent-you shadow-glow-you"></div>
                                    <div className="absolute inset-0 rounded-full bg-accent-you animate-ping opacity-60"></div>
                                </div>
                                <span className="text-[10px] font-mono tracking-wider text-text-muted uppercase">Connected</span>
                            </div>

                            <div className="flex gap-2.5 items-center">
                                <span className="text-[10px] font-mono tracking-wider text-text-muted uppercase">Active View:</span>
                                <span className="text-xs font-mono font-medium text-accent-you bg-accent-you/5 border border-accent-you/10 px-3 py-1 rounded-full uppercase tracking-wider">{myName}</span>
                            </div>
                        </header>

                        {/* ANIME ROOM ROUTING */}
                        <AnimatePresence mode="wait">
                            <motion.main
                                key={activeRoom}
                                initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 15, filter: 'blur(5px)' }}
                                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                                exit={{ opacity: 0, y: -15, filter: 'blur(5px)' }}
                                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                                className="w-full flex-1"
                            >
                                
                                {/* ROOM 01 — THE INBOX (Home Dashboard) */}
                                {activeRoom === 'inbox' && (
                                    <div className="flex flex-col gap-10 py-4">
                                        
                                        {/* Dynamic Intimate Header */}
                                        <div className="text-center flex flex-col gap-3">
                                            <h2 className="font-serif italic text-3xl md:text-4xl text-ivory">
                                                {getGreeting()}
                                            </h2>
                                            <p className="text-xs font-mono text-text-muted tracking-wider">
                                                {partnerName} visited our place recently.
                                            </p>
                                        </div>

                                        {/* Center Metaphor Card: The Notes Inbox */}
                                        <div className="bg-surface shadow-inner-glow border border-white/5 p-8 rounded-2xl flex flex-col gap-6 relative overflow-hidden group hover:border-white/10 transition-all duration-500">
                                            <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 bg-accent-them filter blur-[40px]"></div>
                                            
                                            <div className="flex justify-between items-center border-b border-white/5 pb-4">
                                                <span className="text-[10px] font-mono tracking-widest text-text-muted uppercase">Most Recent Note From {partnerName}</span>
                                                <span className="text-xs font-mono text-accent-them">10:14 PM</span>
                                            </div>

                                            {relationship.notes.filter(n => n.sender !== currentView).length > 0 ? (
                                                <p className="font-serif italic text-lg leading-relaxed text-text-primary pl-4 border-l border-accent-them/25">
                                                    "{relationship.notes.filter(n => n.sender !== currentView)[0].text}"
                                                </p>
                                            ) : (
                                                <p className="font-serif italic text-sm text-text-muted leading-relaxed">
                                                    "No letter in the mailbox today. Leave a word for them to find when they step in."
                                                </p>
                                            )}

                                            <div className="flex justify-start">
                                                <button 
                                                    onClick={() => setActiveRoom('journal')}
                                                    className="text-xs font-mono text-accent-you hover:text-ivory transition-colors flex items-center gap-1.5 group/btn"
                                                >
                                                    Write back <span className="group-hover:translate-x-1 transition-transform">→</span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Bottom Split layout: Mood snapshot & Presence Indicators */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            
                                            {/* Rethemed Chart.js Mood snapshot */}
                                            <div className="bg-surface shadow-inner-glow border border-white/5 p-6 rounded-2xl flex items-center gap-6">
                                                <RethemedDashboardChart 
                                                    myMood={myMoodValue}
                                                    partnerMood={partnerMoodValue}
                                                    myName={myName}
                                                    partnerName={partnerName}
                                                />
                                                <div className="flex flex-col gap-2">
                                                    <h3 className="font-serif text-ivory text-lg">Daily Resonance</h3>
                                                    <p className="text-xs text-text-muted leading-relaxed">
                                                        Rethemed mood indicator capturing your emotional orbits in real-time.
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Small Ritual presence card */}
                                            <div className="bg-surface shadow-inner-glow border border-white/5 p-6 rounded-2xl flex flex-col gap-4 justify-between">
                                                <div className="flex flex-col gap-1.5">
                                                    <h3 className="font-serif text-ivory text-lg">Daily Wellness Connection</h3>
                                                    <p className="text-xs text-text-muted leading-relaxed">
                                                        Ensure your partner feels nourished, even from afar. Check-in to let them know.
                                                    </p>
                                                </div>

                                                <div className="flex justify-between items-center pt-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2.5 h-2.5 rounded-full bg-accent-you shadow-glow-you"></div>
                                                        <span className="text-[10px] font-mono tracking-widest text-text-muted uppercase">Nourished Today</span>
                                                    </div>
                                                    <button 
                                                        onClick={triggerMealNudge} 
                                                        className="bg-accent-you/10 border border-accent-you/15 text-accent-you hover:bg-accent-you hover:text-bg transition-all duration-300 font-mono text-[10px] uppercase tracking-wider px-4 py-2 rounded-full active:scale-95"
                                                    >
                                                        Remind Partner
                                                    </button>
                                                </div>
                                            </div>

                                        </div>

                                    </div>
                                )}

                                {/* ROOM 02 — THE JOURNAL (Timeline & Writing Pad) */}
                                {activeRoom === 'journal' && (
                                    <div className="flex flex-col gap-8 py-4 max-w-2xl mx-auto">
                                        
                                        {/* Curated Notebook style editor pad */}
                                        <form onSubmit={submitNote} className="bg-surface shadow-inner-glow border border-white/5 p-6 rounded-2xl flex flex-col gap-4 relative">
                                            
                                            {/* Flying plane relative container */}
                                            {isSending && (
                                                <motion.div
                                                    initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                                                    animate={{ 
                                                        x: [0, 180, 360, 520], 
                                                        y: [0, -100, -50, -250], 
                                                        opacity: [1, 1, 0.8, 0],
                                                        scale: [1, 1.2, 0.8, 0.4]
                                                    }}
                                                    transition={{ duration: 1.2, ease: "easeInOut" }}
                                                    className="absolute z-[999] pointer-events-none text-2xl text-accent-you"
                                                    style={{ bottom: '24px', right: '24px' }}
                                                >
                                                    ✈️
                                                </motion.div>
                                            )}

                                            <div className="border-b border-white/5 pb-2 flex justify-between items-center">
                                                <span className="text-[10px] font-mono tracking-widest text-text-muted uppercase">Lined Letter Pad</span>
                                                <span className="text-xs text-text-muted font-mono">Lora Italic Font</span>
                                            </div>

                                            <textarea 
                                                className="notebook-textarea min-h-[140px] focus:outline-none" 
                                                placeholder="Write something intimate... leave a footprint of your heart..."
                                                value={noteText}
                                                onChange={e => setNoteText(e.target.value)}
                                            />

                                            <div className="flex justify-between items-center pt-2">
                                                <span className="text-[10px] font-mono text-text-muted italic">Drafts are fully encrypted.</span>
                                                <button 
                                                    type="submit"
                                                    className="bg-accent-you hover:shadow-glow-you text-bg font-semibold text-xs px-5 py-2.5 rounded-full transition-all duration-300 transform active:scale-95"
                                                >
                                                    Send Note
                                                </button>
                                            </div>
                                        </form>

                                        {/* Journal entries chronological list */}
                                        <motion.div 
                                            variants={{
                                                hidden: {},
                                                show: { transition: { staggerChildren: 0.08 } }
                                            }}
                                            initial="hidden"
                                            animate="show"
                                            className="flex flex-col gap-6 mt-6"
                                        >
                                            {relationship.notes.map((note) => {
                                                const isMine = note.sender === currentView;
                                                const authorColor = isMine ? 'accent-you' : 'accent-them';
                                                
                                                return (
                                                    <motion.div
                                                        key={note.id}
                                                        variants={{
                                                            hidden: { opacity: 0, y: 25 },
                                                            show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 85 } }
                                                        }}
                                                        whileHover={{ y: -3 }}
                                                        className={`w-full max-w-[85%] bg-surface border border-white/5 shadow-inner-glow p-6 rounded-2xl flex flex-col gap-4 relative group transition-all duration-300 ${
                                                            isMine ? 'self-end items-end ml-auto' : 'self-start items-start mr-auto'
                                                        }`}
                                                        style={{
                                                            boxShadow: isMine 
                                                                ? 'inset 0 1px 0 rgba(255,255,255,0.07), 0 0 15px rgba(196,137,154,0.02)'
                                                                : 'inset 0 1px 0 rgba(255,255,255,0.07), 0 0 15px rgba(138,156,196,0.02)'
                                                        }}
                                                    >
                                                        {/* Interactive floating reactions */}
                                                        {reactionTarget === note.id && (
                                                            <div className="absolute -top-10 bg-[#131220] border border-white/5 p-2 rounded-full flex gap-3 shadow-2xl z-50">
                                                                {['❤️', '😂', '😢', '⭐'].map(emoji => (
                                                                    <button 
                                                                        key={emoji}
                                                                        onClick={() => {
                                                                            reactToEntry(note.id, emoji);
                                                                            setReactionTarget(null);
                                                                        }}
                                                                        className="hover:scale-125 transition-transform text-base"
                                                                    >
                                                                        {emoji}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Floating reactions indicator */}
                                                        <div className="absolute inset-0 pointer-events-none overflow-hidden">
                                                            {floatingReactions.map((f, i) => (
                                                                <motion.div
                                                                    key={i}
                                                                    initial={{ y: 20, opacity: 1, scale: 1 }}
                                                                    animate={{ y: -60, opacity: 0, scale: 1.5 }}
                                                                    transition={{ duration: 1.2 }}
                                                                    className="absolute text-xl"
                                                                    style={{ left: `${f.left}%`, bottom: '20px' }}
                                                                >
                                                                    {f.emoji}
                                                                </motion.div>
                                                            ))}
                                                        </div>

                                                        {/* Header meta */}
                                                        <div className={`flex items-center gap-2.5 w-full ${isMine ? 'justify-end' : 'justify-start'}`}>
                                                            <span className={`text-[10px] font-mono tracking-widest uppercase font-semibold text-${authorColor}`}>
                                                                {isMine ? myName : partnerName}
                                                            </span>
                                                            <span className="text-[10px] font-mono text-text-muted">•</span>
                                                            <span className="text-[10px] font-mono text-text-muted">{note.timestamp}</span>
                                                        </div>

                                                        {/* Text note */}
                                                        <p className={`font-serif italic text-base leading-relaxed text-text-primary ${isMine ? 'text-right' : 'text-left'}`}>
                                                            "{note.text}"
                                                        </p>

                                                        {/* Footer reactions row */}
                                                        <div className="flex gap-2 mt-2 items-center">
                                                            <button 
                                                                onClick={() => setReactionTarget(reactionTarget === note.id ? null : note.id)}
                                                                className="text-xs text-text-muted hover:text-accent-you transition-colors p-1"
                                                            >
                                                                ✨ feeling
                                                            </button>
                                                            
                                                            {note.reactions && note.reactions.map((react, index) => (
                                                                <span key={index} className="text-xs bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                                                                    {react === 'heart' ? '❤️' : react === 'star' ? '⭐' : react}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </motion.div>

                                    </div>
                                )}

                                {/* ROOM 03 — THE WALL (Corkboard Polaroids) */}
                                {activeRoom === 'photos' && (
                                    <div className="flex flex-col gap-10 py-4 relative">
                                        
                                        {/* Immersive corkboard text */}
                                        <div className="text-center flex flex-col gap-2">
                                            <h2 className="font-serif italic text-3xl text-ivory">Our Corkboard</h2>
                                            <p className="text-xs font-mono text-text-muted tracking-wider">
                                                A collection of quiet moments, pinned with infinite warmth.
                                            </p>
                                        </div>

                                        {/* Masonry Polaroids grid */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 justify-center pt-4">
                                            {relationship.memories.map((mem, index) => {
                                                // Predefined static rotation to stay stable
                                                const rotation = (mem.id % 5) - 2;
                                                
                                                return (
                                                    <motion.div
                                                        key={mem.id}
                                                        initial={prefersReduced ? { opacity: 1 } : { y: -100, opacity: 0, rotate: -10 }}
                                                        animate={{ y: 0, opacity: 1, rotate: rotation }}
                                                        transition={{ type: 'spring', stiffness: 85, damping: 10, delay: index * 0.05 }}
                                                        whileHover={{ scale: 1.03, rotate: 0, transition: { duration: 0.3 } }}
                                                        onClick={() => setSelectedPhoto(mem)}
                                                        className="bg-[#1C1A2E] p-4 pb-10 border border-white/5 shadow-2xl cursor-pointer flex flex-col gap-4 relative overflow-hidden"
                                                    >
                                                        {/* Soft intimate vignette filter */}
                                                        <div className="w-full h-48 overflow-hidden relative border border-white/5">
                                                            <img 
                                                                src={mem.url} 
                                                                alt="Memory" 
                                                                className="w-full h-full object-cover transition-transform duration-[8s] hover:scale-105"
                                                            />
                                                            <div className="absolute inset-0 bg-radial-gradient from-transparent via-[#0A0912]/20 to-[#0A0912]/60 pointer-events-none mix-blend-multiply"></div>
                                                        </div>

                                                        <div className="flex flex-col gap-1.5">
                                                            <p className="font-serif italic text-sm text-ivory tracking-wide leading-relaxed text-center">
                                                                {mem.caption}
                                                            </p>
                                                            <p className="text-center font-mono text-[9px] text-text-muted uppercase tracking-widest mt-1">
                                                                {mem.date}
                                                            </p>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>

                                        {/* Upload memory form panel inside sidebar drawer or drawer floating */}
                                        <div className="bg-surface shadow-inner-glow border border-white/5 p-6 rounded-2xl mt-12 max-w-md mx-auto w-full">
                                            <h3 className="font-serif text-ivory text-lg mb-4 text-center">Pin a New Memory</h3>
                                            <form onSubmit={addPhoto} className="flex flex-col gap-4">
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-[10px] font-mono text-text-muted uppercase tracking-wider pl-1">Image URL</label>
                                                    <input 
                                                        type="text" 
                                                        placeholder="Paste a link to an image..."
                                                        value={newPhotoUrl}
                                                        onChange={e => setNewPhotoUrl(e.target.value)}
                                                        className="w-full bg-[#0A0912] border border-white/5 text-text-primary px-4 py-2.5 rounded-xl font-mono text-xs focus:outline-none focus:border-accent-you/30"
                                                    />
                                                </div>

                                                <div className="flex flex-col gap-1">
                                                    <label className="text-[10px] font-mono text-text-muted uppercase tracking-wider pl-1">Caption</label>
                                                    <input 
                                                        type="text" 
                                                        placeholder="Write a sweet caption..."
                                                        value={newPhotoCap}
                                                        onChange={e => setNewPhotoCap(e.target.value)}
                                                        className="w-full bg-[#0A0912] border border-white/5 text-text-primary px-4 py-2.5 rounded-xl font-sans text-xs focus:outline-none focus:border-accent-you/30"
                                                    />
                                                </div>

                                                <button 
                                                    type="submit"
                                                    disabled={uploading}
                                                    className="w-full bg-accent-you hover:shadow-glow-you text-bg font-semibold text-xs py-3 rounded-xl transition-all duration-300"
                                                >
                                                    {uploading ? "Pinning memory..." : "Pin Polaroid →"}
                                                </button>
                                            </form>
                                        </div>

                                        {/* Rethemed Lightbox modal */}
                                        <AnimatePresence>
                                            {selectedPhoto && (
                                                <motion.div
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    onClick={() => setSelectedPhoto(null)}
                                                    className="fixed inset-0 bg-[#0A0912]/95 z-[2000] flex items-center justify-center p-4 backdrop-blur-md cursor-zoom-out"
                                                >
                                                    <motion.div
                                                        initial={{ scale: 0.95, filter: 'blur(10px)' }}
                                                        animate={{ scale: 1, filter: 'blur(0px)' }}
                                                        exit={{ scale: 0.95, filter: 'blur(10px)' }}
                                                        onClick={e => e.stopPropagation()}
                                                        className="bg-[#131220] border border-white/5 p-6 rounded-2xl max-w-xl w-full flex flex-col gap-6 shadow-2xl relative"
                                                    >
                                                        <img 
                                                            src={selectedPhoto.url} 
                                                            className="w-full h-80 object-cover rounded-xl border border-white/5"
                                                        />
                                                        <div className="flex flex-col gap-2">
                                                            <p className="font-serif italic text-lg leading-relaxed text-ivory text-center">
                                                                "{selectedPhoto.caption}"
                                                            </p>
                                                            <span className="font-mono text-[9px] text-text-muted tracking-widest uppercase text-center mt-1">
                                                                {selectedPhoto.date}
                                                            </span>
                                                        </div>

                                                        <button 
                                                            onClick={() => setSelectedPhoto(null)}
                                                            className="absolute top-4 right-4 bg-white/5 hover:bg-white/10 text-white font-mono text-xs w-7 h-7 rounded-full flex items-center justify-center"
                                                        >
                                                            ✕
                                                        </button>
                                                    </motion.div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                    </div>
                                )}

                                {/* ROOM 04 — THE CHECK-IN (Daily Ritual & Line Chart) */}
                                {activeRoom === 'checkin' && (
                                    <div className="flex flex-col gap-10 py-4 max-w-2xl mx-auto">
                                        
                                        <div className="text-center flex flex-col gap-2">
                                            <h2 className="font-serif italic text-3xl text-ivory">Daily Check-In</h2>
                                            <p className="text-xs font-mono text-text-muted tracking-wider">
                                                A daily ritual of closeness. Feel together, reflect together.
                                            </p>
                                        </div>

                                        {/* Slider container with live color shifting */}
                                        <div className="bg-surface shadow-inner-glow border border-white/5 p-8 rounded-2xl flex flex-col gap-8 items-center text-center relative overflow-hidden">
                                            <h3 className="font-serif italic text-xl text-ivory">
                                                "How are you feeling today?"
                                            </h3>

                                            {/* Big mood rating number */}
                                            <div className="flex flex-col items-center">
                                                <div 
                                                    className="w-24 h-24 rounded-full border border-white/10 flex items-center justify-center text-4xl font-bold transition-all duration-500 shadow-2xl relative"
                                                    style={{ 
                                                        borderColor: myCheckin.mood <= 4 ? '#8A9CC4' : '#C4899A',
                                                        boxShadow: myCheckin.mood <= 4 
                                                            ? '0 0 25px rgba(138, 156, 196, 0.25)' 
                                                            : '0 0 25px rgba(196, 137, 154, 0.25)'
                                                    }}
                                                >
                                                    {myCheckin.mood}
                                                </div>
                                                <span className="text-[9px] font-mono text-text-muted uppercase tracking-widest mt-3">Drag the slider below</span>
                                            </div>

                                            {/* Slider input */}
                                            <div className="w-full max-w-md">
                                                <input 
                                                    type="range" 
                                                    min="1" 
                                                    max="10" 
                                                    value={myCheckin.mood} 
                                                    onChange={e => submitCheckin(parseInt(e.target.value), {
                                                        q1: myCheckin.q1,
                                                        q2: myCheckin.q2,
                                                        q3: myCheckin.q3
                                                    })}
                                                    className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-accent-you"
                                                />
                                            </div>

                                            {/* Three Lined Prompt Prompts */}
                                            <div className="w-full flex flex-col gap-6 text-left pt-4 border-t border-white/5">
                                                <div className="flex flex-col gap-2">
                                                    <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">A small detail from today I wish you were here for:</span>
                                                    <textarea 
                                                        className="notebook-textarea focus:outline-none min-h-[35px]"
                                                        value={myCheckin.q1}
                                                        onChange={e => submitCheckin(myCheckin.mood, { ...myCheckin, q1: e.target.value })}
                                                    />
                                                </div>

                                                <div className="flex flex-col gap-2">
                                                    <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">The track fitting my headspace right now:</span>
                                                    <input 
                                                        type="text" 
                                                        className="notebook-textarea focus:outline-none min-h-[35px]"
                                                        value={myCheckin.q2}
                                                        onChange={e => submitCheckin(myCheckin.mood, { ...myCheckin, q2: e.target.value })}
                                                    />
                                                </div>

                                                <div className="flex flex-col gap-2">
                                                    <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">A tender word of warmth for you:</span>
                                                    <textarea 
                                                        className="notebook-textarea focus:outline-none min-h-[35px]"
                                                        value={myCheckin.q3}
                                                        onChange={e => submitCheckin(myCheckin.mood, { ...myCheckin, q3: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Partner's Check-in card shown beneath */}
                                        <div className="bg-surface/50 border border-white/5 p-6 rounded-2xl flex flex-col gap-5 relative overflow-hidden">
                                            <div className="absolute top-0 left-0 w-16 h-16 rounded-full opacity-5 bg-accent-them filter blur-[30px]"></div>
                                            
                                            <div className="flex justify-between items-center border-b border-white/5 pb-3">
                                                <h4 className="font-serif italic text-base text-ivory">{partnerName}'s Check-In Today</h4>
                                                <span className="text-xs font-mono text-accent-them font-semibold">Mood Rating: {partnerCheckin.mood}</span>
                                            </div>

                                            <div className="flex flex-col gap-4 text-sm font-serif italic text-text-muted">
                                                <div>
                                                    <span className="text-[9px] font-mono tracking-widest uppercase block not-italic mb-1">Today's Detail:</span>
                                                    "{partnerCheckin.q1 || "Silent footprint today."}"
                                                </div>
                                                <div>
                                                    <span className="text-[9px] font-mono tracking-widest uppercase block not-italic mb-1">Listening To:</span>
                                                    "{partnerCheckin.q2 || "No song connected."}"
                                                </div>
                                                <div>
                                                    <span className="text-[9px] font-mono tracking-widest uppercase block not-italic mb-1">Warmth left for you:</span>
                                                    "{partnerCheckin.q3 || "Thinking of you."}"
                                                </div>
                                            </div>
                                        </div>

                                        {/* Rethemed Chart.js 7-Day Line Chart */}
                                        <div className="bg-surface shadow-inner-glow border border-white/5 p-6 rounded-2xl">
                                            <div className="flex flex-col gap-1.5 mb-6">
                                                <h3 className="font-serif text-ivory text-lg">7-Day Harmony</h3>
                                                <p className="text-xs text-text-muted leading-relaxed">
                                                    Resonating emotional frequencies, showing our visual heartbeat.
                                                </p>
                                            </div>
                                            <RethemedHistoryChart 
                                                historyYou={myHistory}
                                                historyThem={partnerHistory}
                                                myName={myName}
                                                partnerName={partnerName}
                                            />
                                        </div>

                                    </div>
                                )}

                                {/* ROOM 05 — THE DOCK CONFIG (Settings) */}
                                {activeRoom === 'settings' && (
                                    <div className="flex flex-col gap-10 py-4 max-w-md mx-auto">
                                        
                                        <div className="text-center flex flex-col gap-2">
                                            <h2 className="font-serif italic text-3xl text-ivory">The Quiet Corner</h2>
                                            <p className="text-xs font-mono text-text-muted tracking-wider">
                                                Dim the candlelight, disconnect, or sync your orbital links.
                                            </p>
                                        </div>

                                        {/* Google Cloud account panel */}
                                        <div className="bg-surface border border-white/5 p-6 rounded-2xl flex flex-col gap-6">
                                            <h3 className="font-serif text-ivory text-lg border-b border-white/5 pb-3">Cloud Sync Protection</h3>
                                            
                                            {googleUser ? (
                                                <div className="flex flex-col gap-5">
                                                    <div className="flex items-center gap-3 bg-[#0A0912] border border-white/5 p-4 rounded-xl">
                                                        {googleUser.picture ? (
                                                            <img src={googleUser.picture} className="w-10 h-10 rounded-full border border-white/5 shrink-0" alt="Profile" />
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-full bg-accent-you border border-white/5 flex items-center justify-center shrink-0 text-lg">👤</div>
                                                        )}
                                                        <div className="overflow-hidden">
                                                            <h4 className="font-sans font-medium text-sm text-text-primary leading-tight truncate">{googleUser.name}</h4>
                                                            <p className="text-[10px] font-mono text-text-muted truncate mt-0.5">{googleUser.email}</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col gap-1.5 font-mono text-[9px] text-text-muted leading-relaxed">
                                                        <p>⚡ Silent real-time client encryption is active.</p>
                                                        <p className="truncate">File ID: {syncFileId}</p>
                                                    </div>

                                                    <button 
                                                        onClick={handleDisconnectDrive}
                                                        className="w-full bg-[#0A0912] border border-white/5 hover:border-white/15 text-text-primary text-xs py-3 rounded-xl transition-all duration-300 font-mono uppercase tracking-wider active:scale-95"
                                                    >
                                                        Disconnect Secure Sync
                                                    </button>
                                                </div>
                                            ) : (
                                                <button 
                                                    onClick={handleConnectDrive}
                                                    className="w-full bg-accent-you hover:shadow-glow-you text-bg font-semibold text-xs py-3.5 rounded-xl transition-all duration-300 active:scale-95"
                                                >
                                                    Enable Cloud Synced Backups →
                                                </button>
                                            )}
                                        </div>

                                        {/* Soundtrack Connection Panel */}
                                        <div className="bg-surface border border-white/5 p-6 rounded-2xl flex flex-col gap-4">
                                            <h3 className="font-serif text-ivory text-lg border-b border-white/5 pb-2">Shared Soundtrack</h3>
                                            <p className="text-[10px] font-mono text-text-muted tracking-wide leading-relaxed">
                                                Embed your special couple playlist here. Paste a standard Spotify track or playlist link.
                                            </p>
                                            
                                            <input 
                                                type="text"
                                                placeholder="https://open.spotify.com/playlist/..."
                                                value={relationship.spotify_url}
                                                onChange={e => {
                                                    const next = { ...relationship, spotify_url: e.target.value };
                                                    setRelationship(next);
                                                    pushStateToDrive(next);
                                                }}
                                                className="w-full bg-[#0A0912] border border-white/5 text-text-primary px-4 py-2.5 rounded-xl font-mono text-xs focus:outline-none focus:border-accent-you/30"
                                            />

                                            {relationship.spotify_url && (
                                                <div className="rounded-xl overflow-hidden border border-white/5 mt-2 bg-[#0A0912]">
                                                    <iframe 
                                                        src={parseSpotifyUrl(relationship.spotify_url)} 
                                                        width="100%" 
                                                        height="80" 
                                                        frameBorder="0" 
                                                        allowFullScreen 
                                                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                                                        loading="lazy"
                                                    ></iframe>
                                                </div>
                                            )}
                                        </div>

                                        {/* Unique Invites Panel */}
                                        <div className="bg-surface border border-white/5 p-6 rounded-2xl flex flex-col gap-3">
                                            <h3 className="font-serif text-ivory text-lg border-b border-white/5 pb-2">Pairing Invite</h3>
                                            <p className="text-[10px] font-mono text-text-muted leading-relaxed">
                                                Copy and send this special room link to your partner to merge your orbits permanently.
                                            </p>
                                            
                                            <div className="bg-[#0A0912] border border-white/5 p-3 rounded-xl flex items-center justify-between mt-2">
                                                <span className="font-mono text-xs text-accent-you tracking-wider">antigravity.space/invite/{syncFileId.slice(0, 8) || 'local'}</span>
                                                <button 
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(`antigravity.space/invite/${syncFileId || 'local'}`);
                                                        triggerToast("Invite code copied successfully.");
                                                    }}
                                                    className="text-[10px] font-mono text-text-muted hover:text-white transition-colors"
                                                >
                                                    Copy
                                                </button>
                                            </div>
                                        </div>

                                        {/* Cozy wordmark footer */}
                                        <div className="text-center flex flex-col gap-1.5 pt-8">
                                            <span className="font-serif italic text-xs text-text-muted">"Anti-Gravity — built for the ones who stay."</span>
                                            <span className="font-mono text-[8px] text-text-muted uppercase tracking-widest">Version 2.0.0 Redesign</span>
                                        </div>

                                    </div>
                                )}

                            </motion.main>
                        </AnimatePresence>

                    </div>
                )}

            </div>

            {/* --- IMMERSIVE PERSISTENT FIXED FLOATING ICON DOCK (Mobile First / Navigation) --- */}
            {accessToken && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#131220]/80 backdrop-blur-lg border border-white/5 rounded-full px-5 py-3 flex items-center gap-7 shadow-2xl z-[1500]">
                    {[
                        { id: 'inbox', emoji: '📬', label: 'Inbox' },
                        { id: 'journal', emoji: '✍️', label: 'Journal' },
                        { id: 'photos', emoji: '🖼️', label: 'Wall' },
                        { id: 'checkin', emoji: '🤍', label: 'Check-In' },
                        { id: 'settings', emoji: '⚙️', label: 'Corner' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                playSoftChime();
                                setActiveRoom(tab.id);
                            }}
                            className="relative flex flex-col items-center justify-center p-2 group"
                        >
                            <span className="text-xl transform group-hover:scale-115 transition-transform duration-300 relative z-10">
                                {tab.emoji}
                            </span>
                            
                            {activeRoom === tab.id && (
                                <motion.div 
                                    layoutId="activeTabIndicator"
                                    className="absolute -bottom-1.5 w-1.5 h-1.5 rounded-full bg-accent-you shadow-glow-you"
                                    transition={{ type: 'spring', stiffness: 120, damping: 14 }}
                                />
                            )}
                        </button>
                    ))}
                </div>
            )}

            {/* --- PERSISTENT DUAL PROFILE SIMULATING SWITCHER BAR --- */}
            <div className="fixed bottom-0 left-0 w-full bg-[#0A0912]/90 border-t border-white/5 py-2.5 px-4 z-[1400] flex justify-between items-center shadow-2xl">
                <div className="flex items-center gap-2 text-text-muted">
                    <span className="text-sm">🪐</span>
                    <span className="font-mono text-[9px] tracking-wide uppercase font-semibold hidden sm:inline">Orbit Simulator:</span>
                </div>
                
                <div className="flex bg-[#131220] border border-white/5 rounded-full p-0.5 shadow-inner">
                    <button 
                        onClick={() => {
                            setCurrentView('A');
                            playSoftChime();
                            triggerToast("Simulating Partner A. Visual accents: Mauve.");
                        }} 
                        className={`px-4 py-1.5 rounded-full font-mono text-[9px] uppercase tracking-wider transition-all duration-300 ${
                            currentView === 'A' ? 'bg-[#C4899A] text-bg font-semibold' : 'text-text-muted hover:text-white'
                        }`}
                    >
                        Partner A {currentView === 'A' && '👤'}
                    </button>
                    <button 
                        onClick={() => {
                            setCurrentView('B');
                            playSoftChime();
                            triggerToast("Simulating Partner B. Visual accents: Periwinkle.");
                        }} 
                        className={`px-4 py-1.5 rounded-full font-mono text-[9px] uppercase tracking-wider transition-all duration-300 ${
                            currentView === 'B' ? 'bg-[#8A9CC4] text-bg font-semibold' : 'text-text-muted hover:text-white'
                        }`}
                    >
                        Partner B {currentView === 'B' && '👤'}
                    </button>
                </div>

                <div className="text-[9px] font-mono text-text-muted uppercase tracking-widest hidden md:inline-block">
                    Merged Orbit System Offline Sync
                </div>
            </div>

        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
