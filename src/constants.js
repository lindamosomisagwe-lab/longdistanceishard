export const defaultState = {
    scores_a: [7, 6, 8, 5, 7, 9], scores_b: [6, 8, 7, 4, 8, 9],
    meals_a: { breakfast: true, lunch: false, dinner: false }, 
    meals_b: { breakfast: false, lunch: true, dinner: false },
    memories: [{ id: 1, title: 'The Meeting', chapter: 'Chapter 1', date: '2023-04-12', caption: 'The first orbit aligned.', url: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=800&q=80' }],
    moods: [], 
    goals: [{ id: 1, text: 'Plan Anniversary Trip', completed: false }],
    spotify_url: "https://open.spotify.com/playlist/37i9dQZF1EJH75B3mnDgmp",
    distance: 6400, coRegulation: 62,
    partnerA_cycleData: { day: 14, symptoms: [], needSpace: false, sendSnacks: false },
    reunionEndTime: null,
    wakes: { A: [], B: [] },
    isThermalBlanketActive: false,
    liftForce: { A: 0, B: 0 }
};

export const CATEGORIES = ['Romance', 'Physical & Mental Health', 'Personal Growth', 'Career & Business', 'Finances', 'Leisure'];
