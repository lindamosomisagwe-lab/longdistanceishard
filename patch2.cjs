const fs = require('fs');

let content = fs.readFileSync('src/main.jsx', 'utf8');

console.log("Original size:", content.length);

// 1. Replace GOOGLE DRIVE HELPERS with LOCALSTORAGE HELPERS
content = content.replace(
    /\/\/ --- GOOGLE DRIVE APP DATA SYNCING HELPERS ---[\s\S]*?\/\/ --- COMPONENTS ---/,
    `// --- LOCALSTORAGE PERSISTENCE ---
        const STORAGE_KEY = 'antigravity_relationship_state';

        const loadStateFromStorage = (defaultState) => {
            try {
                const stored = localStorage.getItem(STORAGE_KEY);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    return { ...defaultState, ...parsed };
                }
            } catch (e) {
                console.warn('Could not load state from localStorage:', e);
            }
            return defaultState;
        };

        const saveStateToStorage = (state) => {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            } catch (e) {
                console.warn('Could not save state to localStorage:', e);
            }
        };

        // --- COMPONENTS ---`
);

// 2. Replace the App state initialization and Google Auth blocks
// We replace everything from "const [relationship, setRelationship]" up to "Derived States based on Active View"
content = content.replace(
    /const \[relationship, setRelationship\] = useState\(\{[\s\S]*?\/\/ Derived States based on Active View/,
    `// Default relationship state
            const defaultRelationship = {
                scores_a: [7, 6, 8, 5, 7, 9],
                scores_b: [6, 8, 7, 4, 8, 9],
                meals_a: { breakfast: true, lunch: false, dinner: false },
                meals_b: { breakfast: false, lunch: true, dinner: false },
                cycle_a: { day: 14, mood: 'Happy ✨', status: 'Send snacks 🍫' },
                cycle_b: { day: 10, mood: 'Tired 🥱', status: 'Need space 🤍' },
                memories: [
                    { id: 1, url: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', caption: 'Coffee in Montmartre.', date: 'Oct 12' }
                ],
                goals: [
                    { id: 1, title: "Plan Anniversary Trip", category: "Romance, Intimacy & Relationships", miniGoals: [ {id: 101, text: "Book flights to Kyoto", completed: false}, {id: 102, text: "Reserve ryokan", completed: true} ] }
                ],
                spotify_url: "https://open.spotify.com/playlist/37i9dQZF1EJH75B3mnDgmp?si=31caa83610fa42a2"
            };

            // Shared Relationship State — loaded from localStorage on startup
            const [relationship, setRelationship] = useState(() => loadStateFromStorage(defaultRelationship));

            // Local Toast Alert
            const [localAlert, setLocalAlert] = useState("");

            // Cycle tracker role and partner meal nudge states
            const [cycleRole, setCycleRole] = useState('her');
            const [nudgeState, setNudgeState] = useState({ A: false, B: false });

            // Auto-sync cycle tracker interface role based on profile view changes
            useEffect(() => {
                setCycleRole(currentView === 'A' ? 'her' : 'him');
            }, [currentView]);

            // Notify user if partner sent a meal reminder nudge when they switch view
            useEffect(() => {
                if (nudgeState[currentView]) {
                    setLocalAlert(\`🔔 Hey \${currentView === 'A' ? 'Partner A' : 'Partner B'}, your partner is reminding you to eat! 🍳🥪🍛\`);
                    setNudgeState(prev => ({ ...prev, [currentView]: false }));
                }
            }, [currentView, nudgeState]);

            // Save to localStorage and update state
            const pushStateToDrive = (updatedRelationship) => {
                setRelationship(updatedRelationship);
                saveStateToStorage(updatedRelationship);
            };

            // Derived States based on Active View`
);

// 3. Remove the !accessToken and gapiLoading blocks (the login screen)
// We replace from "if (!accessToken) {" up to the main "return (" for the app
content = content.replace(
    /if \(!accessToken\) \{[\s\S]*?return \(\s*<div className="min-h-screen md:pl-64/,
    `return (
                <div className="min-h-screen md:pl-64`
);

// 4. Replace Google Sync widget with Local Save widget
content = content.replace(
    /\{\/\* 4\. Google Drive Sync Settings Widget \*\/\}[\s\S]*?\{\/\* 5\. Quick Spaces \*\/\}/,
    `{/* 4. Local Save Status Widget */}
                                <div className="bg-paper border-3 border-clay p-8 rounded-3xl shadow-brutal flex flex-col gap-6">
                                    <div className="border-b-3 border-clay pb-4 w-full flex justify-between items-center">
                                        <h2 className="font-black text-2xl text-charcoal text-left">Local Save</h2>
                                        <span className="text-xs uppercase font-extrabold border-2 border-clay px-2.5 py-0.5 rounded-full bg-green-200 text-green-800">
                                            active
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-center gap-3 bg-beige border-3 border-clay p-3 rounded-2xl">
                                            <div className="w-10 h-10 rounded-full bg-blush border-2 border-clay flex items-center justify-center shrink-0 text-lg">💾</div>
                                            <div>
                                                <h4 className="font-extrabold text-sm text-charcoal leading-tight">Saved to this device</h4>
                                                <p className="text-xs font-bold text-clay">All data is private & local</p>
                                            </div>
                                        </div>
                                        <div className="text-[11px] font-bold text-clay leading-snug">
                                            <p>💚 Data is saved automatically in your browser's local storage on every change.</p>
                                            <p className="mt-1">No account or internet required.</p>
                                        </div>
                                        <button 
                                            onClick={() => { if(window.confirm('Clear all saved data and reset to defaults?')) { localStorage.removeItem(STORAGE_KEY); window.location.reload(); } }} 
                                            className="brutal-btn bg-paper border-3 border-clay rounded-xl font-bold p-2 text-center text-charcoal shadow-brutal-sm text-xs hover:bg-blush/20"
                                        >
                                            🗑️ Clear & Reset Data
                                        </button>
                                    </div>
                                </div>

                                {/* 5. Quick Spaces */}`
);

// 5. Remove any leftover pushStateToDrive calls that don't do setRelationship?
// Actually in the original, pushStateToDrive didn't setRelationship, it was done before it.
// In our new code, pushStateToDrive does setRelationship. So let's remove the setRelationship(next) calls!
content = content.replace(/setRelationship\(next\);\s*pushStateToDrive\(next\);/g, 'pushStateToDrive(next);');
// Remove setRelationship that was alone before pushStateToDrive
content = content.replace(/setRelationship\([\s\S]*?\);\s*pushStateToDrive\([\s\S]*?\);/g, (match) => {
    // If it matches exactly next, we replace, else we leave it. We did it above.
    return match;
});

// Also remove setRelationship where the argument isn't 'next'
content = content.replace(/setRelationship\([^\)]+\);\s*pushStateToDrive\([^\)]+\);/g, (match) => {
    let pushStateMatch = match.match(/pushStateToDrive\([^\)]+\);/);
    if(pushStateMatch) return pushStateMatch[0];
    return match;
});


fs.writeFileSync('src/main.jsx', content);
console.log("New size:", content.length);

let html = fs.readFileSync('index.html', 'utf8');
html = html.replace(/\s*<!-- Google Identity Services for Sign-In with Google -->\s*<script src="https:\/\/accounts\.google\.com\/gsi\/client"[^>]*><\/script>/g, '');
html = html.replace(/\s*<!-- Google API Client for Google Drive access -->\s*<script src="https:\/\/apis\.google\.com\/js\/api\.js"[^>]*><\/script>/g, '');
fs.writeFileSync('index.html', html);
