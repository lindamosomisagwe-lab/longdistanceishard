import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';

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

// --- SUNBEAM FIELD COMPONENT (Warm, golden dots drifting upward) ---
const SunbeamField = () => {
    const [particles, setParticles] = useState([]);
    useEffect(() => {
        setParticles(Array.from({ length: 30 }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: Math.random() * 4 + 2,
            duration: Math.random() * 12 + 8,
            delay: Math.random() * 6
        })));
    }, []);

    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            {particles.map(p => (
                <motion.div
                    key={p.id}
                    className="absolute rounded-full"
                    style={{
                        left: `${p.x}%`,
                        top: `${p.y}%`,
                        width: p.size,
                        height: p.size,
                        backgroundColor: 'rgba(232,184,75,0.22)',
                    }}
                    animate={{ y: [0, -100, 0], opacity: [0.1, 0.45, 0.1] }}
                    transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }}
                />
            ))}
        </div>
    );
};

// --- CUSTOM SVG ICONS (Clean, lightweight inline replacements matching Lucide) ---
const MailIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect width="20" height="16" x="2" y="4" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
);

const PenLineIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
);

const ImageIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
        <circle cx="9" cy="9" r="2" />
        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
);

const HeartIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
);

const SettingsIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);

// --- CHARTS: Warm Sunflower Rethemed ---
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
                        backgroundColor: ['#E8B84B', '#FAF6EC'],
                        borderColor: '#A07850',
                        borderWidth: 1.5,
                        circumference: 180,
                        rotation: 270,
                        weight: 0.5,
                        borderRadius: 4
                    },
                    {
                        data: [partnerMood, 10 - partnerMood],
                        backgroundColor: ['#E8C5C0', '#FAF6EC'],
                        borderColor: '#A07850',
                        borderWidth: 1.5,
                        circumference: 180,
                        rotation: 270,
                        weight: 0.5,
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        enabled: true,
                        backgroundColor: '#FFFEF9',
                        titleColor: '#2C2A26',
                        bodyColor: '#2C2A26',
                        borderColor: 'rgba(160, 120, 80, 0.15)',
                        borderWidth: 1.5,
                        bodyFont: { family: 'Nunito', size: 12 }
                    }
                }
            }
        });

        return () => {
            if (chartRef.current) chartRef.current.destroy();
        };
    }, [myMood, partnerMood, myName, partnerName]);

    return (
        <div className="relative w-40 h-40 flex items-center justify-center">
            <canvas ref={canvasRef} />
            <div className="absolute flex flex-col items-center justify-center text-center mt-3">
                <span className="text-[9px] font-mono tracking-wider text-text-muted uppercase">Mood Level</span>
                <div className="flex gap-1.5 items-baseline">
                    <span className="text-lg font-bold text-sunflower">{myMood}</span>
                    <span className="text-xs text-text-muted">/</span>
                    <span className="text-lg font-bold text-blush">{partnerMood}</span>
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
                        borderColor: '#E8B84B',
                        backgroundColor: 'rgba(232, 184, 75, 0.05)',
                        fill: true,
                        tension: 0.4,
                        borderWidth: 2,
                        pointBackgroundColor: '#E8B84B',
                        pointBorderColor: '#FAF6EC',
                        pointHoverRadius: 6,
                        pointRadius: 4,
                    },
                    {
                        label: partnerName,
                        data: historyThem,
                        borderColor: '#E8C5C0',
                        backgroundColor: 'rgba(232, 197, 192, 0.05)',
                        fill: true,
                        tension: 0.4,
                        borderWidth: 2,
                        pointBackgroundColor: '#E8C5C0',
                        pointBorderColor: '#FAF6EC',
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
                            color: '#2C2A26',
                            font: { family: 'Nunito', size: 11 }
                        }
                    },
                    tooltip: {
                        backgroundColor: '#FFFEF9',
                        titleColor: '#2C2A26',
                        bodyColor: '#2C2A26',
                        borderColor: 'rgba(160, 120, 80, 0.15)',
                        borderWidth: 1.5
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: '#8A7F72', font: { family: 'Nunito', size: 10 } }
                    },
                    y: {
                        min: 1,
                        max: 10,
                        grid: { color: 'rgba(160, 120, 80, 0.06)' },
                        ticks: { color: '#8A7F72', font: { family: 'Nunito', size: 10 } }
                    }
                }
            }
        });

        return () => {
            if (chartRef.current) chartRef.current.destroy();
        };
    }, [historyYou, historyThem, myName, partnerName]);

    return (
        <div className="w-full h-48">
            <canvas ref={canvasRef} />
        </div>
    );
};

// --- MAIN APP COMPONENT ---
const App = () => {
    const [currentView, setCurrentView] = useState('A'); 
    const [activeRoom, setActiveRoom] = useState('inbox'); 
    const [isSending, setIsSending] = useState(false);
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
            { id: 1, text: "Thinking of you as the golden sun settles in here. The space between us feels wide tonight, but looking up at the same light makes it a little smaller.", sender: 'B', timestamp: '10:14 PM', reactions: ['heart'] },
            { id: 2, text: "Always under the same sky, my love. I just set our favorite sunflower on the counter. It feels like you're right here.", sender: 'A', timestamp: '10:18 PM', reactions: ['star'] }
        ],
        checkin_a: {
            mood: 8,
            q1: "The flower stand down the street had some fresh, tall golden daisies.",
            q2: "Golden Hour - Kacey Musgraves",
            q3: "Keep warm, sleep early. I'm with you in my sweet dreams."
        },
        checkin_b: {
            mood: 6,
            q1: "A quiet, gentle sunbeam hit my notebook today. It felt so soft.",
            q2: "Sunflower - Rex Orange County",
            q3: "I left a tiny warm trace on our timeline. Read it when you wake."
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
    const [accessToken, setAccessToken] = useState(() => localStorage.getItem('antigravity_access_token') || 'OFFLINE_BYPASS');
    const [googleUser, setGoogleUser] = useState(null);
    const [syncFileId, setSyncFileId] = useState(() => localStorage.getItem('antigravity_file_id') || '');
    const [syncStatus, setSyncStatus] = useState('offline'); 
    const [gapiLoading, setGapiLoading] = useState(false);
    const [gapiStatus, setGapiStatus] = useState('loading'); 
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

    // Init Google Identity Services with Retry Loop (Bug 2 Fix)
    useEffect(() => {
        if (gapiStatus !== 'ready') return;

        const tryInit = () => {
            if (!window.google?.accounts) {
                setTimeout(tryInit, 200); 
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
        if (accessToken && accessToken !== 'OFFLINE_BYPASS') {
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

        if (accessToken === 'OFFLINE_BYPASS') {
            setSyncStatus('synced');
            setGoogleUser({ name: 'Local User', email: 'offline@local', picture: null });
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

    // Pull from cloud every 8 seconds (Bug 4 Fix)
    useEffect(() => {
        if (syncStatus !== 'synced' || !accessToken || !syncFileId) return;
        if (accessToken === 'OFFLINE_BYPASS') return; 

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
        if (accessToken === 'OFFLINE_BYPASS') return; 
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

    // Form onSubmit bug fix: change form tags to div, trigger handler on button onClick
    const submitNote = () => {
        if (!noteText.trim()) return;

        setIsSending(true);
        playSoftChime();

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
            triggerToast("Your warm letter has been placed on their desk.");
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
    };

    const addPhoto = () => {
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
            triggerToast("Memory pinned to our corkboard.");
        }, 1000);
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return `Good morning, ${myName}.`;
        if (hour < 18) return `Good afternoon, ${myName}.`;
        return `Good evening, ${myName}.`;
    };

    return (
        <div className="min-h-screen relative font-sans flex flex-col justify-between overflow-x-hidden pb-32">
            
            {/* Sunbeam golden particles field */}
            <SunbeamField />

            {/* Faint glowing dots representing far lovers */}
            <motion.div 
                animate={prefersReduced ? {} : { scale: [1, 1.3, 1], opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="fixed top-8 left-8 w-4 h-4 rounded-full bg-sunflower filter blur-sm pointer-events-none z-0 shadow-brutal-sm"
            />
            <motion.div 
                animate={prefersReduced ? {} : { scale: [1, 1.3, 1], opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
                className="fixed bottom-24 right-8 w-4 h-4 rounded-full bg-blush filter blur-sm pointer-events-none z-0 shadow-brutal-sm"
            />

            {/* Warm toast notification */}
            <AnimatePresence>
                {localAlert && (
                    <motion.div
                        initial={prefersReduced ? { opacity: 1, y: 0 } : { y: -60, opacity: 0, scale: 0.94 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: -40, opacity: 0, scale: 0.96 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                        className="fixed top-5 left-1/2 -translate-x-1/2 bg-[#FFFEF9] border-[1.5px] border-clay/15 shadow-brutal-gold rounded-2xl px-5 py-3.5 z-[2000] flex items-center gap-3 max-w-sm"
                    >
                        <span className="text-base">🌻</span>
                        <p className="text-xs font-sans font-semibold text-charcoal tracking-wide">{localAlert}</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* MAIN APP CONTAINER */}
            <div className="w-full max-w-4xl mx-auto px-4 md:px-8 py-8 relative z-10 flex-1 flex flex-col justify-start">
                
                {/* 1. THE THRESHOLD (Authentication gate redesign) */}
                {!accessToken ? (
                    <div className="flex-1 flex flex-col items-center justify-center min-h-[75vh] relative py-12">
                        <motion.div
                            initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 15, filter: 'blur(8px)' }}
                            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                            transition={{ duration: 1.2, ease: 'easeOut' }}
                            className="text-center flex flex-col items-center gap-8 max-w-lg w-full"
                        >
                            <div className="flex flex-col gap-3 items-center">
                                <motion.div 
                                    animate={{ rotate: [0, 8, -8, 0] }}
                                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                                    className="text-4xl cursor-pointer"
                                >
                                    🌻
                                </motion.div>
                                <h1 className="font-serif text-charcoal text-5xl md:text-6xl font-semibold tracking-tight mt-2">
                                    Anti-Gravity
                                </h1>
                                <p className="font-sans text-xs uppercase tracking-[0.25em] text-clay font-bold">
                                    A private sanctuary for the ones who stay.
                                </p>
                            </div>

                            <p className="text-sm font-serif italic text-text-muted leading-relaxed max-w-md">
                                "Two cities. Different skies. But in our room, the distance between us melts completely."
                            </p>

                            <div className="w-full flex flex-col items-center gap-4 mt-6">
                                {gapiStatus === 'loading' ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="animate-spin text-2xl">🌻</div>
                                        <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest mt-2">Connecting orbital link...</span>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={handleConnectDrive} 
                                        className="bg-white border-[1.5px] border-clay text-charcoal font-semibold text-sm px-8 py-3.5 rounded-full transition-all duration-300 shadow-brutal hover:bg-sunflower hover:shadow-brutal-gold active:translate-y-1 active:shadow-brutal-sm flex items-center gap-2 group"
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
                        <header className="flex justify-between items-center mb-10 pb-4 border-b border-clay/10">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div className="w-2.5 h-2.5 rounded-full bg-stem"></div>
                                    <div className="absolute inset-0 rounded-full bg-stem animate-ping opacity-60"></div>
                                </div>
                                <span className="text-[10px] font-mono tracking-wider text-text-muted uppercase font-bold">Secure Cloud Connected</span>
                            </div>

                            <div className="flex gap-2.5 items-center">
                                <span className="text-[10px] font-mono tracking-wider text-text-muted uppercase">Active Space:</span>
                                <span className={`text-[10px] font-mono font-bold px-3 py-1 rounded-full uppercase tracking-wider border-[1.5px] ${
                                    currentView === 'A' ? 'bg-sunflower/10 border-sunflower text-charcoal' : 'bg-blush/20 border-blush text-charcoal'
                                }`}>
                                    {myName}
                                </span>
                            </div>
                        </header>

                        {/* ANIME ROOM ROUTING */}
                        <AnimatePresence mode="wait">
                            <motion.main
                                key={activeRoom}
                                initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 12, filter: 'blur(4px)' }}
                                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                                exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
                                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                                className="w-full flex-1"
                            >
                                
                                {/* ROOM 01 — THE INBOX (Home Dashboard) */}
                                {activeRoom === 'inbox' && (
                                    <div className="flex flex-col gap-10 py-2">
                                        
                                        {/* Dynamic Intimate Header */}
                                        <div className="flex flex-col gap-1">
                                            <h2 className="font-serif italic text-3xl md:text-4xl text-charcoal">
                                                {getGreeting()}
                                            </h2>
                                            <p className="text-xs text-text-muted font-sans font-semibold mt-1">
                                                {partnerName} visited our place recently.
                                            </p>
                                        </div>

                                        {/* Center Metaphor Card: The Notes Inbox */}
                                        <div className="card p-6 flex flex-col gap-5 relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 bg-sunflower filter blur-[30px]"></div>
                                            
                                            <div className="flex justify-between items-center border-b border-clay/10 pb-3">
                                                <span className="text-[10px] font-mono tracking-widest text-text-muted uppercase font-bold">MOST RECENT — FROM {partnerName}</span>
                                            </div>

                                            {relationship.notes.filter(n => n.sender !== currentView).length > 0 ? (
                                                <p className="font-serif italic text-lg leading-relaxed text-charcoal pl-4 border-l-[3px] border-sunflower">
                                                    "{relationship.notes.filter(n => n.sender !== currentView)[0].text}"
                                                </p>
                                            ) : (
                                                <p className="font-serif italic text-base text-text-muted leading-relaxed">
                                                    "No letter in the mailbox today. Leave a trace of your day for them to find when they step in."
                                                </p>
                                            )}

                                            <div className="flex justify-start pt-2">
                                                <button 
                                                    onClick={() => setActiveRoom('journal')}
                                                    className="border-[1.5px] border-clay bg-[#FFFEF9] font-mono text-[10px] uppercase font-bold tracking-wider px-4 py-2 rounded-full transition-all duration-300 hover:bg-sunflower hover:shadow-brutal-sm shadow-brutal-sm"
                                                >
                                                    Write back →
                                                </button>
                                            </div>
                                        </div>

                                        {/* Bottom Split layout: Mood snapshot & Presence Indicators */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            
                                            {/* Rethemed Chart.js Mood snapshot */}
                                            <div className="card p-6 flex items-center gap-6">
                                                <RethemedDashboardChart 
                                                    myMood={myMoodValue}
                                                    partnerMood={partnerMoodValue}
                                                    myName={myName}
                                                    partnerName={partnerName}
                                                />
                                                <div className="flex flex-col gap-1.5">
                                                    <h3 className="font-serif text-charcoal text-lg font-semibold">Daily Resonance</h3>
                                                    <p className="text-xs text-text-muted leading-relaxed">
                                                        Rethemed mood indicator capturing your emotional orbits in real-time.
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Small Ritual presence card */}
                                            <div className="card p-6 flex flex-col gap-4 justify-between">
                                                <div className="flex flex-col gap-1.5">
                                                    <h3 className="font-serif text-charcoal text-lg font-semibold">Daily Wellness Connection</h3>
                                                    <p className="text-xs text-text-muted leading-relaxed">
                                                        Ensure your partner feels nourished, even from afar. Check-in to let them know.
                                                    </p>
                                                </div>

                                                <div className="flex justify-between items-center pt-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2.5 h-2.5 rounded-full bg-stem"></div>
                                                        <span className="text-[10px] font-mono tracking-widest text-text-muted uppercase font-bold">Nourished Today</span>
                                                    </div>
                                                    <button 
                                                        onClick={triggerMealNudge} 
                                                        className="border-[1.5px] border-clay bg-[#FFFEF9] hover:bg-sunflower hover:shadow-brutal-sm shadow-brutal-sm transition-all duration-300 font-mono text-[9px] uppercase tracking-wider px-4 py-2 rounded-full font-bold active:translate-y-0.5"
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
                                    <div className="flex flex-col gap-8 py-2 max-w-2xl mx-auto">
                                        
                                        {/* Curated Notebook style editor pad */}
                                        <div className="card p-6 flex flex-col gap-4 relative">
                                            
                                            {/* Envelope send animation (Bug template upgrade) */}
                                            {isSending && (
                                                <motion.div
                                                    initial={prefersReduced ? { opacity: 0 } : { x: 0, y: 0, opacity: 1, rotate: 0 }}
                                                    animate={prefersReduced ? {} : {
                                                        x: [0, 80, 220, 420],
                                                        y: [0, -60, -120, -280],
                                                        rotate: [0, 10, 20, 35],
                                                        opacity: [1, 1, 0.7, 0],
                                                        scale: [1, 1.15, 0.9, 0.4]
                                                    }}
                                                    transition={{ duration: 1.3, ease: 'easeIn' }}
                                                    className="absolute pointer-events-none text-2xl z-50"
                                                    style={{ bottom: 20, right: 20 }}
                                                >
                                                    ✉️
                                                </motion.div>
                                            )}

                                            <div className="border-b border-clay/10 pb-2 flex justify-between items-center">
                                                <span className="text-[10px] font-mono tracking-widest text-text-muted uppercase font-bold">LINED LETTER PAD</span>
                                                <span className="text-[10px] font-mono text-text-muted tracking-wider uppercase">Lora Italic Font</span>
                                            </div>

                                            <textarea 
                                                className="notebook-textarea min-h-[140px] focus:outline-none" 
                                                placeholder="Write something sweet... leave a footprint of your heart..."
                                                value={noteText}
                                                onChange={e => setNoteText(e.target.value)}
                                            />

                                            <div className="flex justify-between items-center pt-2">
                                                <span className="text-[10px] font-mono text-text-muted italic">Drafts are fully encrypted.</span>
                                                <button 
                                                    onClick={submitNote}
                                                    className="bg-sunflower hover:shadow-brutal-gold text-charcoal border-[1.5px] border-clay font-bold text-xs px-6 py-3 rounded-full transition-all duration-300 transform shadow-brutal active:translate-y-1 active:shadow-brutal-sm"
                                                >
                                                    Send Note
                                                </button>
                                            </div>
                                        </div>

                                        {/* Journal entries chronological list */}
                                        <motion.div 
                                            variants={{
                                                hidden: {},
                                                show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } }
                                            }}
                                            initial="hidden"
                                            animate="show"
                                            className="flex flex-col gap-6 mt-6"
                                        >
                                            {relationship.notes.map((note, index) => {
                                                const isMine = note.sender === currentView;
                                                
                                                return (
                                                    <motion.div
                                                        key={note.id}
                                                        variants={{
                                                            hidden: { opacity: 0, y: 20, scale: 0.97 },
                                                            show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 90, damping: 14 } }
                                                        }}
                                                        whileHover={{ y: -2 }}
                                                        className={`w-full max-w-[85%] bg-surface border-[1.5px] border-clay/15 p-5 rounded-2xl flex flex-col gap-4 relative group transition-all duration-300 ${
                                                            isMine 
                                                                ? 'self-end items-end ml-auto border-l-[3px] border-l-sunflower shadow-brutal-gold' 
                                                                : 'self-start items-start mr-auto border-l-[3px] border-l-blush shadow-brutal'
                                                        }`}
                                                    >
                                                        {/* Interactive floating reactions */}
                                                        {reactionTarget === note.id && (
                                                            <div className="absolute -top-10 bg-[#FFFEF9] border-[1.5px] border-clay p-1.5 rounded-full flex gap-3 shadow-soft z-50">
                                                                {['❤️', '😂', '😢', '⭐'].map(emoji => (
                                                                    <button 
                                                                        key={emoji}
                                                                        onClick={() => {
                                                                            reactToEntry(note.id, emoji);
                                                                            setReactionTarget(null);
                                                                        }}
                                                                        className="hover:scale-125 transition-transform text-sm"
                                                                    >
                                                                        {emoji}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Floating reactions indicator */}
                                                        <div className="absolute inset-0 pointer-events-none overflow-hidden">
                                                            {floatingReactions.map((f, i) => (
                                                                <motion.span
                                                                    key={i}
                                                                    initial={{ y: 0, opacity: 1, scale: 1 }}
                                                                    animate={{ y: -60, opacity: 0, scale: 1.4 }}
                                                                    exit={{ opacity: 0 }}
                                                                    transition={{ duration: 1.1, ease: 'easeOut' }}
                                                                    className="absolute pointer-events-none text-lg"
                                                                    style={{ left: `${f.left}%`, bottom: '20px' }}
                                                                >
                                                                    {f.emoji}
                                                                </motion.span>
                                                            ))}
                                                        </div>

                                                        {/* Header meta */}
                                                        <div className={`flex items-center gap-2.5 w-full ${isMine ? 'justify-end' : 'justify-start'}`}>
                                                            <span className={`text-[10px] font-mono tracking-widest uppercase font-bold ${
                                                                isMine ? 'text-sunflower' : 'text-blush'
                                                            }`}>
                                                                {isMine ? myName : partnerName}
                                                            </span>
                                                            <span className="text-[10px] font-mono text-text-muted">•</span>
                                                            <span className="text-[10px] font-mono text-text-muted font-bold">{note.timestamp}</span>
                                                        </div>

                                                        {/* Text note */}
                                                        <p className={`font-serif italic text-base leading-relaxed text-charcoal ${isMine ? 'text-right' : 'text-left'}`}>
                                                            "{note.text}"
                                                        </p>

                                                        {/* Footer reactions row */}
                                                        <div className="flex gap-2 mt-2 items-center">
                                                            <button 
                                                                onClick={() => setReactionTarget(reactionTarget === note.id ? null : note.id)}
                                                                className="text-[10px] font-mono font-bold text-text-muted hover:text-sunflower transition-colors p-1 border-[1.5px] border-clay/15 rounded-full px-3 py-1 bg-[#FFFEF9]"
                                                            >
                                                                ✨ feeling
                                                            </button>
                                                            
                                                            {note.reactions && note.reactions.map((react, i) => (
                                                                <span key={i} className="text-xs bg-[#FFFEF9] border-[1.5px] border-clay/10 px-2 py-0.5 rounded-full">
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
                                    <div className="flex flex-col gap-10 py-2 relative">
                                        
                                        {/* Immersive corkboard text */}
                                        <div className="text-center flex flex-col gap-1.5">
                                            <h2 className="font-serif italic text-3xl text-charcoal">Our Corkboard</h2>
                                            <p className="text-xs text-text-muted font-sans font-semibold">
                                                A collection of quiet moments, pinned with infinite warmth.
                                            </p>
                                        </div>

                                        {/* Masonry Polaroids grid */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 justify-center pt-4">
                                            {relationship.memories.map((mem, index) => {
                                                const rotation = (mem.id % 5) - 2;
                                                
                                                return (
                                                    <motion.div
                                                        key={mem.id}
                                                        initial={prefersReduced ? { opacity: 1 } : { y: -80, opacity: 0, rotate: -8 }}
                                                        animate={{ y: 0, opacity: 1, rotate: rotation }}
                                                        transition={{ type: 'spring', stiffness: 80, damping: 10, delay: index * 0.06 }}
                                                        whileHover={{ scale: 1.05, rotate: 0, y: -4 }}
                                                        onClick={() => setSelectedPhoto(mem)}
                                                        className="polaroid cursor-pointer flex flex-col gap-3"
                                                    >
                                                        {/* Top pin representation */}
                                                        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-8 h-2 bg-clay/35 rounded-full border border-clay/20"></div>

                                                        <div className="w-full h-44 overflow-hidden relative border border-clay/10 mt-1">
                                                            <img 
                                                                src={mem.url} 
                                                                alt="Memory" 
                                                                className="w-full h-full object-cover transition-transform duration-[8s] hover:scale-105"
                                                            />
                                                        </div>

                                                        <div className="flex flex-col gap-1 select-none">
                                                            <p className="font-serif italic text-sm text-charcoal text-center leading-relaxed px-1">
                                                                {mem.caption}
                                                            </p>
                                                            <p className="text-center font-mono text-[9px] text-text-muted uppercase tracking-widest font-bold mt-1">
                                                                {mem.date}
                                                            </p>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>

                                        {/* Upload memory form panel */}
                                        <div className="card p-6 mt-12 max-w-md mx-auto w-full">
                                            <h3 className="font-serif text-charcoal text-lg font-semibold mb-4 text-center">Pin a New Memory</h3>
                                            <div className="flex flex-col gap-4">
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-[10px] font-mono text-text-muted font-bold uppercase tracking-wider pl-1">Image URL</label>
                                                    <input 
                                                        type="text" 
                                                        placeholder="Paste image link..."
                                                        value={newPhotoUrl}
                                                        onChange={e => setNewPhotoUrl(e.target.value)}
                                                        className="w-full bg-surface-2 border-[1.5px] border-clay/20 text-charcoal px-4 py-2.5 rounded-xl font-sans text-xs focus:outline-none focus:border-sunflower"
                                                    />
                                                </div>

                                                <div className="flex flex-col gap-1">
                                                    <label className="text-[10px] font-mono text-text-muted font-bold uppercase tracking-wider pl-1">Caption</label>
                                                    <input 
                                                        type="text" 
                                                        placeholder="Write a sweet caption..."
                                                        value={newPhotoCap}
                                                        onChange={e => setNewPhotoCap(e.target.value)}
                                                        className="w-full bg-surface-2 border-[1.5px] border-clay/20 text-charcoal px-4 py-2.5 rounded-xl font-sans text-xs focus:outline-none focus:border-sunflower"
                                                    />
                                                </div>

                                                <button 
                                                    onClick={addPhoto}
                                                    disabled={uploading}
                                                    className="w-full bg-sunflower border-[1.5px] border-clay hover:shadow-brutal-gold text-charcoal font-bold text-xs py-3 rounded-xl transition-all duration-300 shadow-brutal active:translate-y-0.5 active:shadow-brutal-sm"
                                                >
                                                    {uploading ? "Pinning memory..." : "Pin Polaroid →"}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Lightbox Modal */}
                                        <AnimatePresence>
                                            {selectedPhoto && (
                                                <motion.div
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    onClick={() => setSelectedPhoto(null)}
                                                    className="fixed inset-0 bg-[#2C2A26]/85 z-[2000] flex items-center justify-center p-4 backdrop-blur-sm cursor-zoom-out"
                                                >
                                                    <motion.div
                                                        initial={{ scale: 0.95, filter: 'blur(6px)' }}
                                                        animate={{ scale: 1, filter: 'blur(0px)' }}
                                                        exit={{ scale: 0.95, filter: 'blur(6px)' }}
                                                        onClick={e => e.stopPropagation()}
                                                        className="bg-[#FFFEF9] border-[1.5px] border-clay p-5 rounded-2xl max-w-xl w-full flex flex-col gap-5 shadow-brutal relative"
                                                    >
                                                        <img 
                                                            src={selectedPhoto.url} 
                                                            className="w-full h-80 object-cover rounded-xl border border-clay/10"
                                                        />
                                                        <div className="flex flex-col gap-2">
                                                            <p className="font-serif italic text-lg leading-relaxed text-charcoal text-center">
                                                                "{selectedPhoto.caption}"
                                                            </p>
                                                            <span className="font-mono text-[9px] text-text-muted tracking-widest uppercase text-center mt-1 font-bold">
                                                                {selectedPhoto.date}
                                                            </span>
                                                        </div>

                                                        <button 
                                                            onClick={() => setSelectedPhoto(null)}
                                                            className="absolute top-4 right-4 bg-white/80 border border-clay text-charcoal font-mono text-xs w-7 h-7 rounded-full flex items-center justify-center shadow-brutal-sm active:translate-y-0.5"
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
                                    <div className="flex flex-col gap-10 py-2 max-w-2xl mx-auto">
                                        
                                        <div className="text-center flex flex-col gap-1.5">
                                            <h2 className="font-serif italic text-3xl text-charcoal">Daily Check-In</h2>
                                            <p className="text-xs text-text-muted font-sans font-semibold">
                                                A daily ritual of closeness. Feel together, reflect together.
                                            </p>
                                        </div>

                                        {/* Slider container with live color shifting */}
                                        <div className="card p-6 flex flex-col gap-8 items-center text-center relative overflow-hidden">
                                            <h3 className="font-serif italic text-xl text-charcoal">
                                                "How are you feeling today?"
                                            </h3>

                                            {/* Big mood rating number with warm glow */}
                                            <div className="flex flex-col items-center">
                                                <motion.div 
                                                    animate={{ boxShadow: [
                                                        '0 0 12px rgba(232,184,75,0.2)',
                                                        '0 0 28px rgba(232,184,75,0.45)',
                                                        '0 0 12px rgba(232,184,75,0.2)'
                                                    ]}}
                                                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                                                    className="w-24 h-24 rounded-full border-2 border-sunflower bg-[#FFFEF9] flex items-center justify-center text-4xl font-bold font-serif text-charcoal shadow-brutal"
                                                >
                                                    {myCheckin.mood}
                                                </motion.div>
                                                <span className="text-[9px] font-mono text-text-muted uppercase tracking-widest font-bold mt-4">Drag the slider below</span>
                                            </div>

                                            {/* Slider input */}
                                            <div className="w-full max-w-md px-4">
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
                                                    className="w-full"
                                                />
                                            </div>

                                            {/* Three Lined Prompt Prompts */}
                                            <div className="w-full flex flex-col gap-6 text-left pt-6 border-t border-clay/10">
                                                <div className="flex flex-col gap-2">
                                                    <span className="text-[10px] font-mono text-text-muted font-bold uppercase tracking-wider">A small detail from today I wish you were here for:</span>
                                                    <textarea 
                                                        className="notebook-textarea focus:outline-none min-h-[35px]"
                                                        value={myCheckin.q1}
                                                        onChange={e => submitCheckin(myCheckin.mood, { ...myCheckin, q1: e.target.value })}
                                                    />
                                                </div>

                                                <div className="flex flex-col gap-2">
                                                    <span className="text-[10px] font-mono text-text-muted font-bold uppercase tracking-wider">The track fitting my headspace right now:</span>
                                                    <input 
                                                        type="text" 
                                                        className="notebook-textarea focus:outline-none min-h-[35px]"
                                                        value={myCheckin.q2}
                                                        onChange={e => submitCheckin(myCheckin.mood, { ...myCheckin, q2: e.target.value })}
                                                    />
                                                </div>

                                                <div className="flex flex-col gap-2">
                                                    <span className="text-[10px] font-mono text-text-muted font-bold uppercase tracking-wider">A tender word of warmth for you:</span>
                                                    <textarea 
                                                        className="notebook-textarea focus:outline-none min-h-[35px]"
                                                        value={myCheckin.q3}
                                                        onChange={e => submitCheckin(myCheckin.mood, { ...myCheckin, q3: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Partner's Check-in card shown beneath */}
                                        <div className="card p-6 flex flex-col gap-5 relative overflow-hidden bg-surface-2 border-l-[3px] border-l-blush shadow-brutal-sm">
                                            <div className="flex justify-between items-center border-b border-clay/10 pb-3">
                                                <h4 className="font-serif italic text-base text-charcoal">{partnerName}'s Check-In Today</h4>
                                                <span className="text-xs font-mono text-blush font-bold">Mood Rating: {partnerCheckin.mood}</span>
                                            </div>

                                            <div className="flex flex-col gap-4 text-sm font-serif italic text-charcoal">
                                                <div>
                                                    <span className="text-[9px] font-mono tracking-widest uppercase block not-italic font-bold text-text-muted mb-1">Today's Detail:</span>
                                                    "{partnerCheckin.q1 || "Quiet footprint today."}"
                                                </div>
                                                <div>
                                                    <span className="text-[9px] font-mono tracking-widest uppercase block not-italic font-bold text-text-muted mb-1">Headspace track:</span>
                                                    "{partnerCheckin.q2 || "No song shared."}"
                                                </div>
                                                <div>
                                                    <span className="text-[9px] font-mono tracking-widest uppercase block not-italic font-bold text-text-muted mb-1">Warmth left for you:</span>
                                                    "{partnerCheckin.q3 || "Thinking of you."}"
                                                </div>
                                            </div>
                                        </div>

                                        {/* Rethemed Chart.js 7-Day Line Chart */}
                                        <div className="card p-6">
                                            <div className="flex flex-col gap-1.5 mb-6">
                                                <h3 className="font-serif text-charcoal text-lg font-semibold">7-Day Harmony</h3>
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
                                    <div className="flex flex-col gap-10 py-2 max-w-md mx-auto">
                                        
                                        <div className="text-center flex flex-col gap-1.5">
                                            <h2 className="font-serif italic text-3xl text-charcoal">The Quiet Corner</h2>
                                            <p className="text-xs text-text-muted font-sans font-semibold">
                                                Dim the candlelight, disconnect, or sync your orbital links.
                                            </p>
                                        </div>

                                        {/* Google Cloud account panel */}
                                        <div className="card p-6 flex flex-col gap-5">
                                            <h3 className="font-serif text-charcoal text-lg font-semibold border-b border-clay/10 pb-3">Cloud Sync Protection</h3>
                                            
                                            {googleUser ? (
                                                <div className="flex flex-col gap-5">
                                                    <div className="flex items-center gap-3 bg-surface-2 border border-clay/10 p-4 rounded-xl">
                                                        {googleUser.picture ? (
                                                            <img src={googleUser.picture} className="w-10 h-10 rounded-full border border-clay/15 shrink-0" alt="Profile" />
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-full bg-sunflower border border-clay/15 flex items-center justify-center shrink-0 text-lg font-bold">🌻</div>
                                                        )}
                                                        <div className="overflow-hidden">
                                                            <h4 className="font-sans font-semibold text-sm text-charcoal leading-tight truncate">{googleUser.name}</h4>
                                                            <p className="text-[10px] font-mono text-text-muted truncate mt-0.5 font-bold">{googleUser.email}</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col gap-1.5 font-mono text-[9px] text-text-muted font-bold leading-relaxed">
                                                        <p>⚡ Real-time Google Drive sync is active.</p>
                                                        <p className="truncate">File ID: {syncFileId || 'OFFLINE_MODE'}</p>
                                                    </div>

                                                    <button 
                                                        onClick={handleDisconnectDrive}
                                                        className="w-full bg-[#FFFEF9] border-[1.5px] border-clay hover:bg-sunflower text-charcoal text-xs py-3 rounded-xl transition-all duration-300 font-mono font-bold uppercase tracking-wider shadow-brutal-sm active:translate-y-0.5"
                                                    >
                                                        Disconnect Secure Sync
                                                    </button>
                                                </div>
                                            ) : (
                                                <button 
                                                    onClick={handleConnectDrive}
                                                    className="w-full bg-sunflower border-[1.5px] border-clay hover:shadow-brutal-gold text-charcoal font-bold text-xs py-3.5 rounded-xl transition-all duration-300 shadow-brutal active:translate-y-0.5 active:shadow-brutal-sm"
                                                >
                                                    Enable Cloud Synced Backups →
                                                </button>
                                            )}
                                        </div>

                                        {/* Soundtrack Connection Panel */}
                                        <div className="card p-6 flex flex-col gap-4">
                                            <h3 className="font-serif text-charcoal text-lg font-semibold border-b border-clay/10 pb-2">Shared Soundtrack</h3>
                                            <p className="text-[10px] font-mono text-text-muted font-bold tracking-wide leading-relaxed">
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
                                                className="w-full bg-surface-2 border-[1.5px] border-clay/20 text-charcoal px-4 py-2.5 rounded-xl font-mono text-xs focus:outline-none focus:border-sunflower"
                                            />

                                            {relationship.spotify_url && (
                                                <div className="rounded-xl overflow-hidden border border-clay/10 mt-2 bg-[#FFFEF9]">
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
                                        <div className="card p-6 flex flex-col gap-3">
                                            <h3 className="font-serif text-charcoal text-lg font-semibold border-b border-clay/10 pb-2">Pairing Invite</h3>
                                            <p className="text-[10px] font-mono text-text-muted font-bold leading-relaxed">
                                                Copy and send this special room link to your partner to merge your orbits permanently.
                                            </p>
                                            
                                            <div className="bg-surface-2 border-[1.5px] border-clay/20 p-3 rounded-xl flex items-center justify-between mt-2">
                                                <span className="font-mono text-xs text-sunflower font-bold tracking-wider">antigravity.space/invite/{syncFileId.slice(0, 8) || 'local'}</span>
                                                <button 
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(`antigravity.space/invite/${syncFileId || 'local'}`);
                                                        triggerToast("Invite code copied successfully.");
                                                    }}
                                                    className="text-[10px] font-mono font-bold text-clay hover:text-sunflower transition-colors"
                                                >
                                                    Copy
                                                </button>
                                            </div>
                                        </div>

                                        {/* Cozy wordmark footer */}
                                        <div className="text-center flex flex-col gap-1.5 pt-8">
                                            <span className="font-serif italic text-xs text-text-muted">"Anti-Gravity — built for the ones who stay."</span>
                                            <span className="font-mono text-[8px] text-text-muted font-bold uppercase tracking-widest">Version 3.0.0 Sunflower Redesign</span>
                                        </div>

                                    </div>
                                )}

                            </motion.main>
                        </AnimatePresence>

                    </div>
                )}

            </div>

            {/* --- IMMERSIVE PERSISTENT FIXED FLOATING ICON DOCK (21st.dev Retheme Navigation) --- */}
            {accessToken && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#FDFAF4]/90 backdrop-blur-md border-[1.5px] border-clay/25 rounded-[24px] px-6 py-2.5 flex items-center gap-6 shadow-brutal z-[1500]">
                    {[
                        { id: 'inbox', icon: MailIcon, label: 'Inbox' },
                        { id: 'journal', icon: PenLineIcon, label: 'Journal' },
                        { id: 'photos', icon: ImageIcon, label: 'Wall' },
                        { id: 'checkin', icon: HeartIcon, label: 'Ritual' },
                        { id: 'settings', icon: SettingsIcon, label: 'Corner' }
                    ].map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeRoom === tab.id;
                        
                        return (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    playSoftChime();
                                    setActiveRoom(tab.id);
                                }}
                                className="relative flex flex-col items-center justify-center px-3 py-1 group"
                            >
                                <Icon className={`w-5 h-5 transition-colors duration-300 relative z-10 ${
                                    isActive ? 'text-charcoal' : 'text-clay/70 group-hover:text-charcoal'
                                }`} />
                                <span className={`text-[8px] font-mono uppercase mt-1 tracking-wider transition-colors duration-300 relative z-10 ${
                                    isActive ? 'text-charcoal font-bold' : 'text-clay/70 group-hover:text-charcoal'
                                }`}>
                                    {tab.label}
                                </span>
                                
                                {isActive && (
                                    <motion.div 
                                        layoutId="activeTab"
                                        className="absolute inset-0 bg-sunflower rounded-2xl -z-10 border border-clay/35 shadow-brutal-sm"
                                        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* --- PERSISTENT DUAL PROFILE SIMULATING SWITCHER BAR --- */}
            <div className="fixed bottom-0 left-0 w-full bg-[#FAF6EC]/95 border-t-[1.5px] border-clay/15 py-2.5 px-4 z-[1400] flex justify-between items-center shadow-soft backdrop-blur-sm">
                <div className="flex items-center gap-2 text-text-muted">
                    <span className="text-sm">🪐</span>
                    <span className="font-mono text-[9px] tracking-wide uppercase font-bold hidden sm:inline">Orbit Simulator:</span>
                </div>
                
                <div className="flex bg-[#FFFEF9] border-[1.5px] border-clay/20 rounded-full p-0.5 shadow-brutal-sm">
                    <button 
                        onClick={() => {
                            setCurrentView('A');
                            playSoftChime();
                            triggerToast("Simulating Partner A. Accent color: Sunflower Gold 🌻");
                        }} 
                        className={`px-4 py-1.5 rounded-full font-mono text-[9px] uppercase tracking-wider transition-all duration-300 ${
                            currentView === 'A' ? 'bg-sunflower text-charcoal font-bold border border-clay/35' : 'text-text-muted hover:text-charcoal'
                        }`}
                    >
                        Partner A {currentView === 'A' && '🌻'}
                    </button>
                    <button 
                        onClick={() => {
                            setCurrentView('B');
                            playSoftChime();
                            triggerToast("Simulating Partner B. Accent color: Blush Rose 🌸");
                        }} 
                        className={`px-4 py-1.5 rounded-full font-mono text-[9px] uppercase tracking-wider transition-all duration-300 ${
                            currentView === 'B' ? 'bg-blush text-charcoal font-bold border border-clay/35' : 'text-text-muted hover:text-charcoal'
                        }`}
                    >
                        Partner B {currentView === 'B' && '🌸'}
                    </button>
                </div>

                <div className="text-[9px] font-mono text-text-muted font-bold uppercase tracking-widest hidden md:inline-block">
                    Merged Orbit System Offline Sync
                </div>
            </div>

        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
