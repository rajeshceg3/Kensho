document.addEventListener('DOMContentLoaded', () => {

    const poolContainer = document.getElementById('pool-container');
    const poolSurface = document.getElementById('pool-surface');
    const patternContainer = document.getElementById('pattern-container');
    const startButton = document.getElementById('start-button');
    const resetButton = document.getElementById('reset-button');
    const timerDisplay = document.getElementById('timer-display');
    const srStatus = document.getElementById('sr-status');
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

    // --- State Variables ---
    // Moved up to ensure availability for error handlers
    let currentSound = 'none';
    let durationMinutes = 15; // Default duration
    let totalSeconds = durationMinutes * 60;
    let remainingSeconds = totalSeconds;
    let timerInterval = null;
    let timerCheckInterval = null;
    let cachedPaths = [];

    // --- Persistence Logic ---
    function saveSettings() {
        try {
            const settings = {
                theme: document.body.className || 'default',
                time: durationMinutes,
                sound: currentSound
            };
            localStorage.setItem('kensho-settings', JSON.stringify(settings));
        } catch (e) {
            console.error("Error saving settings:", e);
        }
    }

    function loadSettings() {
        try {
            const saved = localStorage.getItem('kensho-settings');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.error("Error loading settings:", e);
            return null;
        }
        return null;
    }

    // Audio Error Handling
    Object.keys(audio).forEach(key => {
        const sound = audio[key];
        if (sound) {
            const handleError = (e) => {
                console.error(`Audio error for ${key}:`, e);
                const option = soundOptions.querySelector(`[data-sound="${key}"]`);
                if (option) {
                    option.classList.add('disabled');
                    option.setAttribute('disabled', 'true');
                    option.style.opacity = '0.5';
                    option.style.pointerEvents = 'none';
                    if (!option.textContent.includes('(Unavailable)')) {
                         option.textContent += ' (Unavailable)';
                    }
                }

                // Resilience: If the currently selected sound fails, revert to 'none'
                if (currentSound === key) {
                    currentSound = 'none';
                    const noneOption = soundOptions.querySelector('[data-sound="none"]');
                    if (noneOption) {
                        const previous = soundOptions.querySelector('.selected');
                        if (previous) {
                            previous.classList.remove('selected');
                            previous.setAttribute('aria-checked', 'false');
                            previous.tabIndex = -1;
                        }
                        noneOption.classList.add('selected');
                        noneOption.setAttribute('aria-checked', 'true');
                        noneOption.tabIndex = 0;
                    }
                    saveSettings();
                }
            };

            sound.addEventListener('error', handleError);

            // Check if already errored
            if (sound.error) {
                handleError(sound.error);
            }
        }
    });

    // --- 1. Settings Panel Logic ---

    function openSettings() {
        settingsMenu.classList.add('active');
        settingsButton.setAttribute('aria-expanded', 'true');
        settingsButton.setAttribute('aria-label', 'Close Settings');
        document.querySelector('main').setAttribute('inert', ''); // Trap focus strictly
        settingsMenu.focus(); // Move focus to the menu container
    }

    function closeSettings() {
        if (!settingsMenu.classList.contains('active')) return;

        settingsMenu.classList.remove('active');
        settingsButton.setAttribute('aria-expanded', 'false');
        settingsButton.setAttribute('aria-label', 'Open Settings');
        document.querySelector('main').removeAttribute('inert');
        settingsButton.focus(); // Return focus to the toggle button
    }

    function toggleSettings() {
        if (settingsMenu.classList.contains('active')) {
            closeSettings();
        } else {
            openSettings();
        }
    }

    // Focus Trap Logic
    function handleTrapFocus(e) {
        if (!settingsMenu.classList.contains('active')) return;

        // Select all interactive elements and filter by tabIndex to respect roving tabindex
        const rawElements = settingsMenu.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const focusableElements = Array.from(rawElements).filter(el => el.tabIndex >= 0 && !el.disabled);

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        const isTabPressed = e.key === 'Tab' || e.keyCode === 9;

        if (!isTabPressed) return;

        if (e.shiftKey) { // Shift + Tab
            if (document.activeElement === firstElement || document.activeElement === settingsMenu) {
                lastElement.focus();
                e.preventDefault();
            }
        } else { // Tab
            if (document.activeElement === lastElement) {
                firstElement.focus();
                e.preventDefault();
            }
        }
    }

    // Add global listener for focus trap instead of adding it repeatedly
    document.addEventListener('keydown', handleTrapFocus);

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && settingsMenu.classList.contains('active')) {
            closeSettings();
        }
    });

    settingsButton.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSettings();
    });

    document.addEventListener('click', (e) => {
        if (!settingsMenu.contains(e.target) && settingsButton !== e.target && !settingsButton.contains(e.target) && settingsMenu.classList.contains('active')) {
            closeSettings();
        }
    });

    // --- 2. Ripple Effect Interaction ---
    // Handles click/tap events on the pool to create visual ripples.

    let lastRippleTime = 0;
    const RIPPLE_THROTTLE_MS = 100;

    function createRipple(x, y) {
        const now = Date.now();
        if (now - lastRippleTime < RIPPLE_THROTTLE_MS) return;
        lastRippleTime = now;

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

    poolSurface.addEventListener('click', (e) => {
        // Prevent ripples while timer is active to maintain focus
        if (poolContainer.classList.contains('timer-active')) return;

        // Get the position of the click relative to the pool container
        const rect = poolContainer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        createRipple(x, y);
    });

    poolSurface.addEventListener('keydown', (e) => {
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

    // Accessibility: Roving Tabindex for Radio Groups
    function setupRadioGroup(container) {
        const radios = Array.from(container.querySelectorAll('[role="radio"]'));
        if (radios.length === 0) return;

        // Initialize tabindex based on aria-checked
        radios.forEach(radio => {
            if (radio.getAttribute('aria-checked') === 'true') {
                radio.tabIndex = 0;
            } else {
                radio.tabIndex = -1;
            }
        });

        container.addEventListener('keydown', (e) => {
            const target = e.target;
            const index = radios.indexOf(target);
            if (index === -1) return;

            let nextIndex = -1;

            switch (e.key) {
                case 'ArrowRight':
                case 'ArrowDown':
                    nextIndex = (index + 1) % radios.length;
                    e.preventDefault();
                    break;
                case 'ArrowLeft':
                case 'ArrowUp':
                    nextIndex = (index - 1 + radios.length) % radios.length;
                    e.preventDefault();
                    break;
                case 'Home':
                    nextIndex = 0;
                    e.preventDefault();
                    break;
                case 'End':
                    nextIndex = radios.length - 1;
                    e.preventDefault();
                    break;
            }

            if (nextIndex !== -1) {
                radios[nextIndex].focus();
                radios[nextIndex].click();
            }
        });
    }

    setupRadioGroup(timeOptions);
    setupRadioGroup(themeOptions);
    setupRadioGroup(soundOptions);

    timeOptions.addEventListener('click', (e) => {
        const target = e.target.closest('.time-option');
        if (target) {
            // Update duration
            durationMinutes = parseFloat(target.dataset.time);
            totalSeconds = Math.floor(durationMinutes * 60);
            remainingSeconds = totalSeconds;

            // Update UI
            const previous = timeOptions.querySelector('.selected');
            if (previous) {
                previous.classList.remove('selected');
                previous.setAttribute('aria-checked', 'false');
                previous.tabIndex = -1;
            }
            target.classList.add('selected');
            target.setAttribute('aria-checked', 'true');
            target.tabIndex = 0;

            updateTimerDisplay();
            startButton.textContent = `Start Focus (${durationMinutes}m)`;
            startButton.setAttribute('aria-label', `Start Focus ${durationMinutes} minutes`);
            saveSettings();
        }
    });

    themeOptions.addEventListener('click', (e) => {
        const target = e.target.closest('.theme-dot');
        if (target) {
            const theme = target.dataset.theme;

            // Update UI
            const previous = themeOptions.querySelector('.selected');
            if (previous) {
                previous.classList.remove('selected');
                previous.setAttribute('aria-checked', 'false');
                previous.tabIndex = -1;
            }
            target.classList.add('selected');
            target.setAttribute('aria-checked', 'true');
            target.tabIndex = 0;

            // Update body class
            document.body.className = theme === 'default' ? '' : theme;
            saveSettings();
        }
    });

    soundOptions.addEventListener('click', (e) => {
        const target = e.target.closest('.sound-option');
        if (target) {
            // Stop any currently playing audio
            Object.values(audio).forEach(sound => {
                if (sound && !sound.paused) {
                    fadeAudio(sound, sound.volume, 0, 200);
                }
            });

            currentSound = target.dataset.sound;

            const previous = soundOptions.querySelector('.selected');
            if (previous) {
                previous.classList.remove('selected');
                previous.setAttribute('aria-checked', 'false');
                previous.tabIndex = -1;
            }
            target.classList.add('selected');
            target.setAttribute('aria-checked', 'true');
            target.tabIndex = 0;
            saveSettings();

            // Play a sample of the new sound
            if (currentSound !== 'none') {
                const sound = audio[currentSound];
                if (sound) {
                    sound.currentTime = 0;
                    fadeAudio(sound, sound.volume, 0.5, 500, () => {
                        setTimeout(() => {
                            if (sound && !sound.paused) {
                                fadeAudio(sound, sound.volume, 0, 500);
                            }
                        }, 1000);
                    });
                }
            }
        }
    });

    // Event listener for the Start Focus button
    startButton.addEventListener('click', () => {
        if (timerInterval) return; // Prevent multiple timers

        // Initialize/Resume Audio Context on user interaction
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        // Close settings if open
        if (settingsMenu.classList.contains('active')) {
            closeSettings();
        }

        poolContainer.classList.remove('timer-complete'); // Reset completion state
        poolContainer.classList.add('timer-active'); // Activate timer UI state
        settingsButton.classList.add('disabled');
        settingsButton.setAttribute('disabled', 'true');

        resetButton.focus(); // Move focus to Reset button

        announceStatus(`Focus timer started. ${durationMinutes} minutes remaining.`);
        startTimer();
        fadeInAudio();
    });

    // Event listener for the Reset button
    resetButton.addEventListener('click', () => {
        // Remove timer states
        poolContainer.classList.remove('timer-active', 'timer-complete');
        settingsButton.classList.remove('disabled');
        settingsButton.removeAttribute('disabled');

        if (timerInterval) {
            cancelAnimationFrame(timerInterval); // Stop any active timer
            timerInterval = null;
        }

        if (timerCheckInterval) {
            clearInterval(timerCheckInterval);
            timerCheckInterval = null;
        }

        remainingSeconds = totalSeconds; // Reset time
        updateTimerDisplay(); // Update display to initial time
        startButton.textContent = `Start Focus (${durationMinutes}m)`;
        startButton.setAttribute('aria-label', `Start Focus ${durationMinutes} minutes`);
        patternContainer.innerHTML = ''; // Clear the SVG pattern
        cachedPaths = [];
        fadeOutAudio();
        startButton.focus(); // Return focus to start button
        announceStatus("Timer reset.");
    });

    function announceStatus(message) {
        srStatus.textContent = message;
    }

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
                completeTimer();
                return;
            }

            // Update timer display (once per second)
            if (timeLeft !== remainingSeconds) {
                remainingSeconds = Math.max(0, timeLeft);
                updateTimerDisplay();
            }

            // Update pattern (every frame for smoothness)
            const elapsedTime = now - startTime;
            const totalTimeMS = totalSeconds * 1000;
            const progress = Math.min(1, Math.max(0, elapsedTime / totalTimeMS));
            updatePattern(progress);

            timerInterval = requestAnimationFrame(update);
        }

        // Logic loop to check completion (works in background)
        timerCheckInterval = setInterval(() => {
            const now = Date.now();
            if (now >= endTime) {
                completeTimer();
            }
        }, 1000);

        timerInterval = requestAnimationFrame(update);
    }

    function completeTimer() {
        if (timerInterval) {
            cancelAnimationFrame(timerInterval);
            timerInterval = null;
        }
        if (timerCheckInterval) {
            clearInterval(timerCheckInterval);
            timerCheckInterval = null;
        }

        remainingSeconds = 0;
        timerDisplay.textContent = "Done"; // Show completion message
        document.title = "Done - Kenshō";
        updatePattern(1);

        // If focus is on the reset button (which is about to disappear), move it to start button
        if (document.activeElement === resetButton) {
            startButton.focus();
        }

        poolContainer.classList.remove('timer-active');
        poolContainer.classList.add('timer-complete');
        settingsButton.classList.remove('disabled');
        settingsButton.removeAttribute('disabled');
        fadeOutAudio();
        playChime();
        announceStatus("Focus session complete.");
    }

    // Function to format and update the timer display
    function updateTimerDisplay() {
        const minutes = Math.floor(remainingSeconds / 60);
        const seconds = remainingSeconds % 60;
        // Pad both minutes and seconds with a leading zero
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        timerDisplay.textContent = timeString;

        if (poolContainer.classList.contains('timer-active')) {
            document.title = `${timeString} - Kenshō`;
        } else {
            document.title = "Kenshō";
        }
    }

    // --- 4. Generative SVG Pattern ---
    // This is the core of the visual reward system, drawing a geometric pattern.
    function generatePattern(steps) {
        // The size corresponds to the viewBox of the SVG, allowing it to scale
        const size = 400;
        const center = size / 2;
        const numLines = 36; // Number of lines in the pattern, chosen for divisibility
        const angleStep = 360 / numLines; // Angle between each starting point

        // Clear previous content safely
        while (patternContainer.firstChild) {
            patternContainer.removeChild(patternContainer.firstChild);
        }

        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", `0 0 ${size} ${size}`);

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

            svg.appendChild(path);
        }

        patternContainer.appendChild(svg);
        cachedPaths = Array.from(svg.querySelectorAll('path'));
    }

    // Function to update the drawing progress of the SVG pattern
    function updatePattern(progress) {
        if (cachedPaths.length === 0) return;

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // Iterate over each path and update its stroke-dashoffset to reveal it
        cachedPaths.forEach(path => {
            const length = parseFloat(path.style.strokeDasharray);

            if (prefersReducedMotion) {
                 // If reduced motion is requested, show the completed pattern static
                 // This reduces visual distraction/motion for sensitive users
                 path.style.strokeDashoffset = 0;
            } else {
                // The offset decreases as progress increases, revealing the line
                path.style.strokeDashoffset = length * (1 - progress);
            }
        });
    }

    // Initialize the timer display when the page loads
    updateTimerDisplay();

    // --- 5. Audio Controls ---
    const activeFades = new Map();
    let audioContext = null;

    async function playChime() {
        try {
            if (!audioContext) {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            // Resume context if suspended (browser policy)
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }

            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // Bell-like sound (Sine wave with envelope)
            const now = audioContext.currentTime;
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(523.25, now); // C5

            // Envelope
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.3, now + 0.05); // Quick attack
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 3); // Long decay

            oscillator.start(now);
            oscillator.stop(now + 3);
        } catch (e) {
            console.error("Error playing chime:", e);
        }
    }

    function fadeAudio(sound, from, to, duration, onComplete) {
        if (!sound) return;

        // Clear any existing fade interval for this specific sound
        if (activeFades.has(sound)) {
            clearInterval(activeFades.get(sound));
            activeFades.delete(sound);
        }

        try {
            sound.volume = from;
        } catch (e) {
            console.error("Error setting volume:", e);
            return;
        }

        if (from < to) {
            // Promise handling for play() to avoid "play() request interrupted" errors
            const playPromise = sound.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    // Auto-play was prevented.
                    // This is expected if user hasn't interacted yet.
                    console.warn("Audio play blocked:", error);
                    // Stop fading if play failed
                    if (activeFades.has(sound)) {
                        clearInterval(activeFades.get(sound));
                        activeFades.delete(sound);
                    }
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
            if (sound) {
                sound.currentTime = 0;
                fadeAudio(sound, sound.volume, 1, 1000);
            }
        }
    }

    function fadeOutAudio() {
        Object.values(audio).forEach(sound => {
            if (sound && !sound.paused) {
                fadeAudio(sound, sound.volume, 0, 1000);
            }
        });
    }

    // --- 6. Initialization ---
    function initialize() {
        const savedSettings = loadSettings();

        // 1. Restore Theme
        let themeToSet = 'default';
        if (savedSettings && savedSettings.theme) {
            themeToSet = savedSettings.theme;
        }
        document.body.className = themeToSet === 'default' ? '' : themeToSet;

        // Update Theme UI
        const themeDot = themeOptions.querySelector(`[data-theme="${themeToSet}"]`) || themeOptions.querySelector('[data-theme="default"]');
        if (themeDot) {
            const currentSelected = themeOptions.querySelector('.selected');
            if (currentSelected) {
                currentSelected.classList.remove('selected');
                currentSelected.setAttribute('aria-checked', 'false');
                currentSelected.tabIndex = -1;
            }
            themeDot.classList.add('selected');
            themeDot.setAttribute('aria-checked', 'true');
            themeDot.tabIndex = 0;
        }

        // 2. Restore Time
        let timeToSet = 15;
        if (savedSettings && savedSettings.time) {
            timeToSet = savedSettings.time;
        }
        durationMinutes = timeToSet;
        totalSeconds = Math.floor(durationMinutes * 60);
        remainingSeconds = totalSeconds;

        // Update Time UI
        const timeOption = timeOptions.querySelector(`[data-time="${timeToSet}"]`) || timeOptions.querySelector('[data-time="15"]');
        if (timeOption) {
             const currentSelected = timeOptions.querySelector('.selected');
             if (currentSelected) {
                 currentSelected.classList.remove('selected');
                 currentSelected.setAttribute('aria-checked', 'false');
                 currentSelected.tabIndex = -1;
             }
             timeOption.classList.add('selected');
             timeOption.setAttribute('aria-checked', 'true');
             timeOption.tabIndex = 0;
        }

        updateTimerDisplay();
        startButton.textContent = `Start Focus (${durationMinutes}m)`;
        startButton.setAttribute('aria-label', `Start Focus ${durationMinutes} minutes`);

        // 3. Restore Sound
        let soundToSet = 'none';
        if (savedSettings && savedSettings.sound) {
            soundToSet = savedSettings.sound;
        }
        currentSound = soundToSet;

        // Update Sound UI
        const soundOption = soundOptions.querySelector(`[data-sound="${soundToSet}"]`) || soundOptions.querySelector('[data-sound="none"]');
        if (soundOption) {
            const currentSelected = soundOptions.querySelector('.selected');
            if (currentSelected) {
                currentSelected.classList.remove('selected');
                currentSelected.setAttribute('aria-checked', 'false');
                currentSelected.tabIndex = -1;
            }
            soundOption.classList.add('selected');
            soundOption.setAttribute('aria-checked', 'true');
            soundOption.tabIndex = 0;
        }
    }

    initialize();
});
