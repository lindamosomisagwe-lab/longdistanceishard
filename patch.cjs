const fs = require('fs');

let content = fs.readFileSync('src/main.jsx', 'utf8');

// ============================================================
// 1. Replace Google Drive helpers block with localStorage helpers
// ============================================================
const googleHelpersStart = `        // --- GOOGLE DRIVE APP DATA SYNCING HELPERS ---`;
const googleHelpersEnd = `        // --- COMPONENTS ---`;

const localStorageHelpers = `        // --- LOCALSTORAGE PERSISTENCE ---
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

        // --- COMPONENTS ---`;

const startIdx = content.indexOf(googleHelpersStart);
const endIdx = content.indexOf(googleHelpersEnd);
if (startIdx === -1 || endIdx === -1) {
    console.error('Could not find Google Drive helpers block');
    process.exit(1);
}
content = content.slice(0, startIdx) + localStorageHelpers + content.slice(endIdx + googleHelpersEnd.length);
console.log('Step 1 done: Replaced Google Drive helpers with localStorage helpers');

// ============================================================
// 2. Replace the App state initialization block (remove Google Drive states, polling, etc.)
// ============================================================
const appStateStart = `            // Shared Relationship State held in Memory
            const [relationship, setRelationship] = useState({`;
const appStateEnd = `            // Push State Updates to Drive
            const pushStateToDrive = async (updatedRelationship) => {
                if (syncStatus !== 'synced' || !accessToken || !syncFileId) return;
                try {
                    await uploadSyncState(accessToken, syncFileId, updatedRelationship);
                } catch (err) {
                    console.error("State push failed:", err);
                }
            };`;

const newAppState = `            // Default relationship state
            const defaultRelationship = {`;

// Find the relationship state block
const relStart = content.indexOf(appStateStart);
const relEnd = content.indexOf(appStateEnd);
if (relStart === -1 || relEnd === -1) {
    console.error('Could not find relationship state block');
    process.exit(1);
}

// Replace the whole block
const newRelBlock = `            // Default relationship state
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
            };`;

content = content.slice(0, relStart) + newRelBlock + content.slice(relEnd + appStateEnd.length);
console.log('Step 2 done: Replaced state initialization with localStorage version');

// ============================================================
// 3. Remove the duplicate Local Toast Alert and cycle state declarations
// that come after pushStateToDrive in the original
// ============================================================
const dupStates = `            // Local Toast Alert
            const [localAlert, setLocalAlert] = useState("");

            // Testing Cycle tracker role and partner meal nudge states
            const [cycleRole, setCycleRole] = useState('her');
            const [nudgeState, setNudgeState] = useState({ A: false, B: false });

            // Auto-sync cycle tracker interface role based on profile view changes
            useEffect(() => {
                setCycleRole(currentView === 'A' ? 'her' : 'him');
            }, [currentView]);

            // Notify user if partner sent a meal reminder nudge when they switch view
            useEffect(() => {
                if (nudgeState[currentView]) {
                    setLocalAlert(`;
const dupIdx = content.indexOf(dupStates);
if (dupIdx === -1) {
    console.log('No duplicate state declarations found (already cleaned)');
} else {
    // Find the end of this duplicate block (ends at the Google Drive states)
    const dupEnd = `            // --- GOOGLE DRIVE SYNC STATES ---`;
    const dupEndIdx = content.indexOf(dupEnd, dupIdx);
    if (dupEndIdx !== -1) {
        content = content.slice(0, dupIdx) + content.slice(dupEndIdx);
        console.log('Step 3 done: Removed duplicate state declarations');
    }
}

// ============================================================
// 4. Remove the Google Drive state declarations block
// ============================================================
const gapiStatesStart = `            // --- GOOGLE DRIVE SYNC STATES ---`;
const gapiStatesEnd = `            // Derived States based on Active View`;
const gapiStart = content.indexOf(gapiStatesStart);
const gapiEnd = content.indexOf(gapiStatesEnd);
if (gapiStart !== -1 && gapiEnd !== -1) {
    content = content.slice(0, gapiStart) + `\n            // Derived States based on Active View` + content.slice(gapiEnd + gapiStatesEnd.length);
    console.log('Step 4 done: Removed Google Drive state declarations');
} else {
    console.log('Step 4: Google Drive state declarations not found (may already be removed)');
}

// ============================================================
// 5. Remove the login screen (if !accessToken block)
// ============================================================
const loginScreenStart = `            if (!accessToken) {`;
const loginScreenEnd = `            if (gapiLoading) {`;
const loginStart = content.indexOf(loginScreenStart);
const loginEnd = content.indexOf(loginScreenEnd);
if (loginStart !== -1 && loginEnd !== -1) {
    // Find the end of gapiLoading block
    const gapiLoadEnd = `            return (\n                <div className="min-h-screen md:pl-64`;
    const gapiLoadEndIdx = content.indexOf(gapiLoadEnd, loginEnd);
    if (gapiLoadEndIdx !== -1) {
        content = content.slice(0, loginStart) + content.slice(gapiLoadEndIdx);
        console.log('Step 5 done: Removed login screen and loading screen');
    } else {
        // Try to find via the actual return after gapiLoading
        const mainReturnPattern = `            return (\r\n                <div className="min-h-screen md:pl-64`;
        const altPattern = content.indexOf(mainReturnPattern, loginEnd);
        if (altPattern !== -1) {
            content = content.slice(0, loginStart) + content.slice(altPattern);
            console.log('Step 5 done (alt): Removed login and loading screens');
        } else {
            console.error('Could not find end of gapiLoading block');
        }
    }
} else {
    console.log('Step 5: Login screen not found (may already be removed)');
}

// ============================================================
// 6. Replace Google Sync widget with Local Save widget
// ============================================================
const googleSyncWidgetStart = `                                {/* 4. Google Drive Sync Settings Widget */}`;
const googleSyncWidgetEnd = `                                {/* 5. Quick Spaces */}`;
const syncWidgetStart = content.indexOf(googleSyncWidgetStart);
const syncWidgetEnd = content.indexOf(googleSyncWidgetEnd);
if (syncWidgetStart !== -1 && syncWidgetEnd !== -1) {
    const localSaveWidget = `                                {/* 4. Local Save Status Widget */}
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

                                `;
    content = content.slice(0, syncWidgetStart) + localSaveWidget + content.slice(syncWidgetEnd);
    console.log('Step 6 done: Replaced Google Sync widget with Local Save widget');
} else {
    console.log('Step 6: Google Sync widget not found in current file, skipping');
}

// ============================================================
// 7. Remove Google Identity Services scripts from index.html
// ============================================================
let html = fs.readFileSync('index.html', 'utf8');
html = html.replace(/\s*<!-- Google Identity Services for Sign-In with Google -->\s*<script src="https:\/\/accounts\.google\.com\/gsi\/client"[^>]*><\/script>/g, '');
html = html.replace(/\s*<!-- Google API Client for Google Drive access -->\s*<script src="https:\/\/apis\.google\.com\/js\/api\.js"[^>]*><\/script>/g, '');
fs.writeFileSync('index.html', html);
console.log('Step 7 done: Removed Google scripts from index.html');

// ============================================================
// Save
// ============================================================
fs.writeFileSync('src/main.jsx', content);
console.log('\\nDone! File saved:', content.length, 'bytes');
console.log('Lines:', content.split('\\n').length);
