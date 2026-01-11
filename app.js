document.addEventListener('DOMContentLoaded', () => {

    const poolContainer = document.getElementById('pool-container');
    const patternContainer = document.getElementById('pattern-container');
    const startButton = document.getElementById('start-button');
    const resetButton = document.getElementById('reset-button');
    const timerDisplay = document.getElementById('timer-display');
    const settingsButton = document.getElementById('settings-button');
    const settingsMenu = document.getElementById('settings-menu');
    const timeOptions = document.getElementById('time-options');
    const themeOptions = document.getElementById('theme-options');
    const soundOptions = document.getElementById('sound-options');

    const audio = {
        rain: document.getElementById('audio-rain'),
        forest: document.getElementById('audio-forest'),
        waves: document.getElementById('audio-waves'),
    };

    let currentSound = 'none';
    let durationMinutes = 15; // Default duration
    let totalSeconds = durationMinutes * 60;
    let remainingSeconds = totalSeconds;
    let timerInterval = null;

    // --- 1. Settings Panel Logic ---
    settingsButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent click from bubbling up to document
        settingsMenu.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
        if (!settingsMenu.contains(e.target) && settingsMenu.classList.contains('active')) {
            settingsMenu.classList.remove('active');
        }
    });

    // --- 2. Ripple Effect Interaction ---
    // Handles click/tap events on the pool to create visual ripples.
    function createRipple(x, y) {
        // Create a new ripple element
        const ripple = document.createElement('div');
        ripple.className = 'ripple';
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;

        // Randomize ripple size for a more natural look
        const rippleSize = Math.random() * 100 + 50; // Size between 50px and 150px
        ripple.style.width = `${rippleSize}px`;
        ripple.style.height = `${rippleSize}px`;

        // Adjust position to center the ripple on the click point
        ripple.style.marginLeft = `-${rippleSize / 2}px`;
        ripple.style.marginTop = `-${rippleSize / 2}px`;

        // Add the ripple to the pool container
        poolContainer.appendChild(ripple);

        // Remove the ripple element after its animation completes
        setTimeout(() => {
            ripple.remove();
        }, 1500); // Matches the ripple-effect animation duration
    }

    poolContainer.addEventListener('click', (e) => {
        // Prevent ripples while timer is active to maintain focus
        if (poolContainer.classList.contains('timer-active')) return;

        // Get the position of the click relative to the pool container
        const rect = poolContainer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        createRipple(x, y);
    });

    poolContainer.addEventListener('keydown', (e) => {
        if (poolContainer.classList.contains('timer-active')) return;

        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault(); // Prevent scrolling for space
            // Create ripple at center
            const rect = poolContainer.getBoundingClientRect();
            const x = rect.width / 2;
            const y = rect.height / 2;
            createRipple(x, y);
        }
    });

    // --- 3. Timer and Pattern Logic ---

    timeOptions.addEventListener('click', (e) => {
        if (e.target.classList.contains('time-option')) {
            // Update duration
            durationMinutes = parseInt(e.target.dataset.time);
            totalSeconds = durationMinutes * 60;
            remainingSeconds = totalSeconds;

            // Update UI
            timeOptions.querySelector('.selected').classList.remove('selected');
            e.target.classList.add('selected');
            updateTimerDisplay();
            settingsMenu.classList.remove('active'); // Close menu
        }
    });

    themeOptions.addEventListener('click', (e) => {
        if (e.target.classList.contains('theme-dot')) {
            const theme = e.target.dataset.theme;

            // Update UI
            themeOptions.querySelector('.selected')?.classList.remove('selected');
            e.target.classList.add('selected');

            // Update body class
            document.body.className = theme === 'default' ? '' : theme;

            settingsMenu.classList.remove('active'); // Close menu
        }
    });

    soundOptions.addEventListener('click', (e) => {
        if (e.target.classList.contains('sound-option')) {
            // Stop any currently playing audio
            Object.values(audio).forEach(sound => {
                if (!sound.paused) {
                    fadeAudio(sound, sound.volume, 0, 200);
                }
            });

            currentSound = e.target.dataset.sound;
            soundOptions.querySelector('.selected').classList.remove('selected');
            e.target.classList.add('selected');

            // Play a sample of the new sound
            if (currentSound !== 'none') {
                const sound = audio[currentSound];
                sound.currentTime = 0;
                fadeAudio(sound, 0, 0.5, 500, () => {
                    setTimeout(() => {
                        if (!sound.paused) {
                            fadeAudio(sound, sound.volume, 0, 500);
                        }
                    }, 1000);
                });
            }
        }
    });

    // Event listener for the Start Focus button
    startButton.addEventListener('click', () => {
        if (timerInterval) return; // Prevent multiple timers
        poolContainer.classList.add('timer-active'); // Activate timer UI state
        settingsButton.classList.add('disabled');
        startTimer();
        fadeInAudio();
    });

    // Event listener for the Reset button
    resetButton.addEventListener('click', () => {
        // Remove timer states
        poolContainer.classList.remove('timer-active', 'timer-complete');
        settingsButton.classList.remove('disabled');

        if (timerInterval) {
            cancelAnimationFrame(timerInterval); // Stop any active timer
            timerInterval = null;
        }

        remainingSeconds = totalSeconds; // Reset time
        updateTimerDisplay(); // Update display to initial time
        patternContainer.innerHTML = ''; // Clear the SVG pattern
        fadeOutAudio();
    });

    // Function to start the focus timer
    function startTimer() {
        // Generate the SVG pattern corresponding to the total focus duration
        generatePattern(totalSeconds);

        const startTime = Date.now();
        const endTime = startTime + totalSeconds * 1000;

        // Use requestAnimationFrame for smoother updates and accurate timing
        function update() {
            const now = Date.now();
            const timeLeft = Math.ceil((endTime - now) / 1000);

            if (timeLeft < 0) {
                remainingSeconds = 0;
                updateTimerDisplay();
                updatePattern();

                cancelAnimationFrame(timerInterval);
                timerInterval = null;
                poolContainer.classList.remove('timer-active');
                poolContainer.classList.add('timer-complete');
                settingsButton.classList.remove('disabled');
                fadeOutAudio();
                return;
            }

            if (timeLeft !== remainingSeconds) {
                remainingSeconds = timeLeft;
                updateTimerDisplay();
                updatePattern();
            }

            timerInterval = requestAnimationFrame(update);
        }

        timerInterval = requestAnimationFrame(update);
    }

    // Function to format and update the timer display
    function updateTimerDisplay() {
        const minutes = Math.floor(remainingSeconds / 60);
        const seconds = remainingSeconds % 60;
        // Pad seconds with a leading zero if less than 10
        timerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    // --- 4. Generative SVG Pattern ---
    // This is the core of the visual reward system, drawing a geometric pattern.
    function generatePattern(steps) {
        // The size corresponds to the viewBox of the SVG, allowing it to scale
        const size = 400;
        const center = size / 2;
        const numLines = 36; // Number of lines in the pattern, chosen for divisibility
        const angleStep = 360 / numLines; // Angle between each starting point

        let svgHTML = `<svg viewBox="0 0 ${size} ${size}">`;

        for (let i = 0; i < numLines; i++) {
            // Calculate the angle for the current line's start point
            const angle = i * angleStep * (Math.PI / 180); // Convert degrees to radians
            const maxRadius = center - 20; // Max radius for lines, with padding from edge

            // Determine the connection point for the current line.
            // The '7' is a prime number, creating a complex and visually appealing starburst pattern.
            const connectTo = (i * 7) % numLines;
            const angle2 = connectTo * angleStep * (Math.PI / 180);

            // Calculate start (x1, y1) and end (x2, y2) coordinates for the line
            const x1 = center + maxRadius * Math.cos(angle);
            const y1 = center + maxRadius * Math.sin(angle);
            const x2 = center + maxRadius * Math.cos(angle2);
            const y2 = center + maxRadius * Math.sin(angle2);

            // Create an SVG path element
            const pathData = `M ${x1},${y1} L ${x2},${y2}`; // Move to (x1,y1), Line to (x2,y2)
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute('d', pathData);

            // Calculate the length of the path for the drawing animation (stroke-dasharray/offset)
            const length = Math.sqrt(Math.pow(x2-x1, 2) + Math.pow(y2-y1, 2));
            path.style.strokeDasharray = length;
            path.style.strokeDashoffset = length; // Start with the path fully hidden

            // Append the path's outer HTML to the SVG string
            svgHTML += path.outerHTML;
        }

        svgHTML += `</svg>`;
        patternContainer.innerHTML = svgHTML; // Inject the generated SVG into the container
    }

    // Function to update the drawing progress of the SVG pattern
    function updatePattern() {
        const paths = patternContainer.querySelectorAll('path');
        if (paths.length === 0) return; // Exit if no paths are found

        // Calculate the current progress of the timer (0 to 1)
        const progress = (totalSeconds - remainingSeconds) / totalSeconds;

        // Iterate over each path and update its stroke-dashoffset to reveal it
        paths.forEach(path => {
            const length = parseFloat(path.style.strokeDasharray);
            // The offset decreases as progress increases, revealing the line
            path.style.strokeDashoffset = length * (1 - progress);
        });
    }

    // Initialize the timer display when the page loads
    updateTimerDisplay();

    // --- 5. Audio Controls ---
    const activeFades = new Map();

    function fadeAudio(sound, from, to, duration, onComplete) {
        // Clear any existing fade interval for this specific sound
        if (activeFades.has(sound)) {
            clearInterval(activeFades.get(sound));
            activeFades.delete(sound);
        }

        sound.volume = from;
        if (from < to) {
            // Promise handling for play() to avoid "play() request interrupted" errors
            const playPromise = sound.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    // Auto-play was prevented.
                    // This is expected if user hasn't interacted yet.
                    console.warn("Audio play blocked:", error);
                });
            }
        }

        let interval = 50; // ms
        let steps = duration / interval;
        let step_u = (to - from) / steps;

        let volInterval = setInterval(() => {
            let newVol = sound.volume + step_u;
            // Clamp volume between 0 and 1
            newVol = Math.max(0, Math.min(1, newVol));

            if ((step_u > 0 && newVol >= to) || (step_u < 0 && newVol <= to)) {
                sound.volume = to;
                if (to === 0) {
                    sound.pause();
                    sound.currentTime = 0;
                }
                if (onComplete) onComplete();
                clearInterval(volInterval);
                activeFades.delete(sound);
            } else {
                sound.volume = newVol;
            }
        }, interval);

        activeFades.set(sound, volInterval);
        return volInterval;
    }

    function fadeInAudio() {
        if (currentSound !== 'none') {
            const sound = audio[currentSound];
            sound.currentTime = 0;
            fadeAudio(sound, 0, 1, 1000);
        }
    }

    function fadeOutAudio() {
        Object.values(audio).forEach(sound => {
            if (!sound.paused) {
                fadeAudio(sound, sound.volume, 0, 1000);
            }
        });
    }

    // --- 6. Initialization ---
    function initialize() {
        // Set initial time
        const initialTime = timeOptions.querySelector('.selected');
        if (initialTime) {
            durationMinutes = parseInt(initialTime.dataset.time);
            totalSeconds = durationMinutes * 60;
            remainingSeconds = totalSeconds;
            updateTimerDisplay();
        }

        // Set initial theme
        const initialThemeDot = themeOptions.querySelector('[data-theme="default"]');
        if(initialThemeDot) {
            initialThemeDot.classList.add('selected');
        }

        // Set initial sound
        const initialSound = soundOptions.querySelector('[data-sound="none"]');
        if (initialSound) {
            initialSound.classList.add('selected');
        }
    }

    initialize();
});
