// Initialize Lucide Icons
lucide.createIcons();

// --- STATE MANAGEMENT ---
const defaultState = {
    moods: [],
    memories: [
        {
            id: 1,
            url: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
            caption: 'Coffee in Montmartre.',
            date: new Date().toISOString()
        }
    ],
    goals: [
        { id: 1, title: 'Save for Tokyo trip', type: 'milestone', completed: false },
        { id: 2, title: 'Watch 1 anime ep per week', type: 'ritual', completed: true }
    ],
    soundtrack: [
        { title: 'Yellow', artist: 'Coldplay', img: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80' },
        { title: 'Sweater Weather', artist: 'The Neighbourhood', img: 'https://images.unsplash.com/photo-1493225457124-a1a2a5fa3685?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80' }
    ]
};

let state = JSON.parse(localStorage.getItem('lumina_state')) || defaultState;

function saveState() {
    localStorage.setItem('lumina_state', JSON.stringify(state));
    renderAll();
}

// --- NAVIGATION ---
const pages = document.querySelectorAll('.page');
const navLinks = document.querySelectorAll('#main-nav li');

function navigateTo(targetId) {
    // Update pages
    pages.forEach(page => {
        if (page.id === targetId) {
            page.classList.add('active');
        } else {
            page.classList.remove('active');
        }
    });

    // Update nav links
    navLinks.forEach(link => {
        if (link.dataset.target === targetId) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
    
    // Scroll to top
    document.querySelector('.main-content').scrollTop = 0;
}

navLinks.forEach(link => {
    link.addEventListener('click', () => {
        navigateTo(link.dataset.target);
    });
});

// --- MODALS ---
function openModal(id) {
    document.getElementById(id).classList.add('active');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

// Close modal on outside click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        if(e.target === overlay) {
            overlay.classList.remove('active');
        }
    });
});

// --- ACTIONS ---
function sendPing(message) {
    alert(`Sent: "${message}" to his device.`);
    closeModal('pingModal');
}

// --- MOOD SPACE ---
let selectedMood = null;
document.querySelectorAll('.mood-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedMood = btn.dataset.mood;
    });
});

function saveMood() {
    if (!selectedMood) {
        alert("Please select a mood first.");
        return;
    }
    const note = document.getElementById('mood-note').value;
    state.moods.unshift({
        mood: selectedMood,
        note: note,
        date: new Date().toISOString()
    });
    saveState();
    
    // Reset
    selectedMood = null;
    document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
    document.getElementById('mood-note').value = '';
    
    alert("Mood saved!");
}

function renderMoods() {
    const timeline = document.getElementById('mood-timeline');
    const homeMood = document.getElementById('home-mood-display');
    
    if (state.moods.length === 0) {
        timeline.innerHTML = '<p class="text-muted">No check-ins yet for this chapter.</p>';
        homeMood.innerHTML = '<p class="text-muted">You haven\'t checked in today.</p>';
        return;
    }

    // Timeline
    timeline.innerHTML = state.moods.map(m => `
        <div class="timeline-item">
            <div class="timeline-icon text-gold">
                ${getMoodEmoji(m.mood)}
            </div>
            <div class="glass-card flex-1" style="padding: 16px;">
                <h4 class="mb-8">${m.mood}</h4>
                ${m.note ? `<p class="text-sm text-muted">"${m.note}"</p>` : ''}
                <p class="text-xs text-muted mt-8">${new Date(m.date).toLocaleDateString()}</p>
            </div>
        </div>
    `).join('');

    // Home display (latest)
    const latest = state.moods[0];
    homeMood.innerHTML = `
        <div class="flex-row items-center gap-16">
            <div style="font-size: 2.5rem;">${getMoodEmoji(latest.mood)}</div>
            <div>
                <h3 class="text-gold">${latest.mood}</h3>
                <p class="text-sm text-muted">${latest.note || 'No note added.'}</p>
            </div>
        </div>
    `;
}

function getMoodEmoji(moodName) {
    const map = { 'Happy': '😊', 'Calm': '😌', 'Missing You': '🥺', 'Stressed': '😫', 'Tired': '😴' };
    return map[moodName] || '✨';
}

// --- MEMORY JOURNAL ---
function saveMemory() {
    const url = document.getElementById('memory-img-url').value || 'https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
    const caption = document.getElementById('memory-caption').value || 'A beautiful moment.';
    
    state.memories.unshift({
        id: Date.now(),
        url,
        caption,
        date: new Date().toISOString()
    });
    saveState();
    closeModal('addMemoryModal');
    
    document.getElementById('memory-img-url').value = '';
    document.getElementById('memory-caption').value = '';
}

function renderMemories() {
    const grid = document.getElementById('journal-grid');
    grid.innerHTML = state.memories.map(mem => `
        <div class="journal-item" onclick="openMemoryDetail('${mem.url}', '${mem.caption}', '${new Date(mem.date).toLocaleDateString()}')">
            <img src="${mem.url}" alt="Memory">
            <div class="overlay">
                <p class="font-serif text-lg text-gold">${mem.caption}</p>
            </div>
        </div>
    `).join('');
}

function openMemoryDetail(url, caption, date) {
    document.getElementById('detail-img').src = url;
    document.getElementById('detail-caption').textContent = caption;
    document.getElementById('detail-date').textContent = date;
    openModal('memoryDetailModal');
}

// --- GOALS ---
function saveGoal() {
    const title = document.getElementById('goal-title').value;
    const type = document.getElementById('goal-type').value;
    
    if (!title) return alert("Enter a title");
    
    state.goals.push({
        id: Date.now(),
        title,
        type,
        completed: false
    });
    saveState();
    closeModal('addGoalModal');
    document.getElementById('goal-title').value = '';
}

function toggleGoal(id) {
    const goal = state.goals.find(g => g.id === id);
    if(goal) goal.completed = !goal.completed;
    saveState();
}

function renderGoals() {
    const grid = document.getElementById('goals-grid');
    const homeGoal = document.getElementById('home-goal-display');
    
    // Page grid
    grid.innerHTML = state.goals.map(g => `
        <div class="goal-item">
            <label class="goal-label">
                <input type="checkbox" ${g.completed ? 'checked' : ''} onchange="toggleGoal(${g.id})">
                <div class="custom-checkbox"></div>
                <span class="${g.completed ? 'text-muted' : ''}">${g.title} <span class="text-xs text-gold ml-8">(${g.type})</span></span>
            </label>
            <button class="icon-btn" onclick="deleteGoal(${g.id})"><i data-lucide="trash-2"></i></button>
        </div>
    `).join('');
    lucide.createIcons();

    // Home Countdown/Milestone
    const nextMilestone = state.goals.find(g => !g.completed && g.type === 'milestone') || state.goals[0];
    if(nextMilestone) {
        homeGoal.innerHTML = `
            <h3 class="font-serif text-xl mb-16">${nextMilestone.title}</h3>
            <div class="progress-bar mt-8">
                <div class="progress" style="width: 50%;"></div>
            </div>
            <p class="text-sm text-muted mt-8">In Progress</p>
        `;
    } else {
        homeGoal.innerHTML = '<p class="text-muted">No pending milestones.</p>';
    }
}

function deleteGoal(id) {
    state.goals = state.goals.filter(g => g.id !== id);
    saveState();
}

// --- SOUNDTRACK ---
function renderSoundtrack() {
    const grid = document.getElementById('soundtrack-grid');
    grid.innerHTML = state.soundtrack.map(s => `
        <div class="music-card" onclick="alert('Playing ${s.title} on Spotify')">
            <img src="${s.img}" alt="Cover">
            <div>
                <h4>${s.title}</h4>
                <p class="text-sm text-muted">${s.artist}</p>
            </div>
        </div>
    `).join('');
}

// --- CLOCK & AMBIENT PRESENCE ---
function updateTime() {
    const timeElement = document.getElementById('dynamic-presence');
    if (!timeElement) return;

    const options = { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit', hour12: true };
    const timeString = new Intl.DateTimeFormat('en-US', options).format(new Date());

    timeElement.innerHTML = `It's ${timeString} where he is, currently listening to <span>"Sweater Weather"</span>.`;
}

// Ambient Hover glow effect
function initHoverGlow() {
    document.addEventListener('mousemove', e => {
        document.querySelectorAll('.glass-card').forEach(card => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
        });
    });

    const style = document.createElement('style');
    style.innerHTML = `
        .glass-card::after {
            content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            background: radial-gradient(600px circle at var(--mouse-x, -500px) var(--mouse-y, -500px), rgba(255, 255, 255, 0.05), transparent 40%);
            pointer-events: none; z-index: 1; opacity: 0; transition: opacity 0.3s ease;
        }
        .glass-card:hover::after { opacity: 1; }
        .glass-card > * { position: relative; z-index: 2; }
    `;
    document.head.appendChild(style);
}

// --- INIT ---
function renderAll() {
    renderMoods();
    renderMemories();
    renderGoals();
    renderSoundtrack();
    lucide.createIcons();
}

updateTime();
setInterval(updateTime, 60000);
initHoverGlow();
renderAll();
