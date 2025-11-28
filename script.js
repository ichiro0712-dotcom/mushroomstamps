document.addEventListener('DOMContentLoaded', () => {
    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    // Character selection UI logic
    const charOptions = document.querySelectorAll('.char-option');
    charOptions.forEach(option => {
        option.addEventListener('click', () => {
            charOptions.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            // Dispatch event for game.js to pick up
            const charName = option.getAttribute('data-char');
            const event = new CustomEvent('characterSelected', { detail: charName });
            document.dispatchEvent(event);
        });
    });

    // Select first character by default
    if(charOptions.length > 0) {
        charOptions[0].click();
    }
});
