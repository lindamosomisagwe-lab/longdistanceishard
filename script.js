// Initialize Lucide Icons
lucide.createIcons();

// Subtly follow mouse with a highlight on glass cards (Apple-style hover effect)
const cards = document.querySelectorAll('.glass-card');

cards.forEach(card => {
    card.addEventListener('mousemove', e => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Set CSS variables for the mouse position
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
    });
});

// Update the CSS to support this dynamic glow (injecting dynamic style rule)
const style = document.createElement('style');
style.innerHTML = `
    .glass-card::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: radial-gradient(
            800px circle at var(--mouse-x, -500px) var(--mouse-y, -500px),
            rgba(255, 255, 255, 0.06),
            transparent 40%
        );
        pointer-events: none;
        z-index: 1;
        opacity: 0;
        transition: opacity 0.3s ease;
    }
    .glass-card:hover::after {
        opacity: 1;
    }
    
    /* Ensure content stays above the hover gradient */
    .glass-card > * {
        position: relative;
        z-index: 2;
    }
`;
document.head.appendChild(style);

// Dynamic Time Update for Ambient Presence
function updateTime() {
    const timeElement = document.querySelector('.greeting p');
    if (!timeElement) return;

    // We are simulating the partner's time in New York
    const options = { 
        timeZone: 'America/New_York',
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
    };
    const formatter = new Intl.DateTimeFormat('en-US', options);
    const timeString = formatter.format(new Date());

    // Update the greeting text while keeping the span styling for the song
    timeElement.innerHTML = `It's ${timeString} in New York, and Sarah is currently listening to <span>"Sweater Weather"</span>.`;
}

// Initial call and interval
updateTime();
setInterval(updateTime, 60000); // Update every minute

// Smooth Nav interactions
const navLinks = document.querySelectorAll('.nav-links li');
navLinks.forEach(link => {
    link.addEventListener('click', function() {
        // Remove active class from all
        navLinks.forEach(l => l.classList.remove('active'));
        // Add active class to clicked
        this.classList.add('active');
        
        // Add a subtle click animation
        this.style.transform = 'scale(0.95)';
        setTimeout(() => {
            this.style.transform = '';
        }, 150);
    });
});
