document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const minutesDisplay = document.getElementById('minutes');
    const secondsDisplay = document.getElementById('seconds');
    const modeDisplay = document.getElementById('timer-mode-display');
    const startBtn = document.getElementById('start-timer');
    const pauseBtn = document.getElementById('pause-timer');
    const resetBtn = document.getElementById('reset-timer');
    const completedPomodoros = document.getElementById('completed-pomodoros');
    const notificationSound = document.getElementById('notification-sound');

    // Settings
    let settings = {
        focusDuration: 25,
        shortBreakDuration: 5,
        longBreakDuration: 15,
        pomodoroCycles: 4,
        soundNotifications: true,
        browserNotifications: true
    };

    let timer = {
        minutes: 25,
        seconds: 0,
        isRunning: false,
        interval: null,
        mode: 'focus',
        cycleCount: 0
    };

    // UNLOCK AUDIO
    document.body.addEventListener('click', function unlockAudioOnce() {
        const audio = document.getElementById('notification-sound');
        if (!audio) return;
    
        audio.volume = 1.0;
        audio.play().then(() => {
            audio.pause();
            audio.currentTime = 0;
            console.log("🔓 Audio unlocked!");
        }).catch(err => console.warn("🔒 Unlock failed:", err));
    
        document.body.removeEventListener('click', unlockAudioOnce);
    }, { once: true });    

    // Update timer settings from Firestore
    window.updateTimerSettings = function () {
        const user = auth.currentUser;
        if (!user) return;
        db.collection('users').doc(user.uid).get().then(doc => {
            if (!doc.exists || !doc.data().settings) return;
            const s = doc.data().settings;
            settings.focusDuration = s.focusDuration ?? 25;
            settings.shortBreakDuration = s.shortBreakDuration ?? 5;
            settings.longBreakDuration = s.longBreakDuration ?? 15;
            settings.pomodoroCycles = s.pomodoroCycles ?? 4;
            settings.soundNotifications = s.soundNotifications ?? true;
            settings.browserNotifications = s.browserNotifications ?? true;
            resetTimer();
        }).catch(err => console.error("Settings load error:", err));
    };

    function updateTimerDisplay() {
        minutesDisplay.textContent = String(timer.minutes).padStart(2, '0');
        secondsDisplay.textContent = String(timer.seconds).padStart(2, '0');
    }

    function startTimer() {
        if (timer.isRunning) return;
        timer.isRunning = true;
        startBtn.classList.add('hidden');
        pauseBtn.classList.remove('hidden');

        timer.interval = setInterval(() => {
            if (timer.seconds === 0) {
                if (timer.minutes === 0) {
                    clearInterval(timer.interval);
                    timer.isRunning = false;
                    timerComplete();
                    return;
                }
                timer.minutes--;
                timer.seconds = 59;
            } else {
                timer.seconds--;
            }
            updateTimerDisplay();
        }, 1000);
    }

    function pauseTimer() {
        clearInterval(timer.interval);
        timer.isRunning = false;
        pauseBtn.classList.add('hidden');
        startBtn.classList.remove('hidden');
    }

    function resetTimer() {
        clearInterval(timer.interval);
        timer.isRunning = false;

        switch (timer.mode) {
            case 'focus':
                timer.minutes = settings.focusDuration;
                break;
            case 'shortBreak':
                timer.minutes = settings.shortBreakDuration;
                break;
            case 'longBreak':
                timer.minutes = settings.longBreakDuration;
                break;
        }

        timer.seconds = 0;
        updateTimerDisplay();
        pauseBtn.classList.add('hidden');
        startBtn.classList.remove('hidden');
    }

    async function playBeepSequence() {
        if (!settings.soundNotifications) return;

        const beep = () => {
            notificationSound.currentTime = 0;
            return notificationSound.play().catch(err => console.warn("Play failed:", err));
        };

        try {
            for (let i = 0; i < 3; i++) {
                await beep();
                await new Promise(res => setTimeout(res, 400));
            }

            await new Promise(res => setTimeout(res, 700));

            for (let i = 0; i < 2; i++) {
                await beep();
                await new Promise(res => setTimeout(res, 3000));
            }
        } catch (e) {
            console.error("Beep error:", e);
        }
    }

    function timerComplete() {
        playBeepSequence();

        if (settings.browserNotifications && "Notification" in window) {
            if (Notification.permission === "granted") {
                const msg = timer.mode === 'focus'
                    ? 'Focus session complete! Take a break.'
                    : 'Break over. Let’s get back to work!';
                new Notification('Daily-Focus', { body: msg, icon: '/favicon.ico' });
            } else if (Notification.permission !== "denied") {
                Notification.requestPermission();
            }
        }

        if (timer.mode === 'focus') {
            const user = auth.currentUser;
            if (user) {
                const today = new Date();
                const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                db.collection('users').doc(user.uid).collection('dailyData').doc(dateStr).get()
                    .then(doc => {
                        let completed = (doc.exists && doc.data().completedPomodoros) || 0;
                        let focusTime = (doc.exists && doc.data().focusTimeMinutes) || 0;
                        completed += 1;
                        focusTime += settings.focusDuration;
                        return db.collection('users').doc(user.uid).collection('dailyData').doc(dateStr)
                            .set({ completedPomodoros: completed, focusTimeMinutes: focusTime }, { merge: true });
                    })
                    .then(() => {
                        completedPomodoros.textContent =
                            Number(completedPomodoros.textContent || 0) + 1;
                        return db.collection('users').doc(user.uid).get();
                    })
                    .then(userDoc => {
                        if (userDoc.exists) {
                            const total = (userDoc.data().totalFocusTime || 0) + settings.focusDuration;
                            return db.collection('users').doc(user.uid).update({ totalFocusTime: total });
                        }
                    })
                    .catch(err => console.error("Firestore update error:", err));
            }

            timer.cycleCount++;
            if (timer.cycleCount % settings.pomodoroCycles === 0) {
                timer.mode = 'longBreak';
                timer.minutes = settings.longBreakDuration;
                modeDisplay.textContent = 'Long Break';
                modeDisplay.style.color = '#f59e0b';
            } else {
                timer.mode = 'shortBreak';
                timer.minutes = settings.shortBreakDuration;
                modeDisplay.textContent = 'Short Break';
                modeDisplay.style.color = '#10b981';
            }
        } else {
            timer.mode = 'focus';
            timer.minutes = settings.focusDuration;
            modeDisplay.textContent = 'Focus Mode';
            modeDisplay.style.color = '#4f46e5';
        }

        timer.seconds = 0;
        updateTimerDisplay();
        showNotification(`${timer.mode === 'focus' ? 'Focus time' : 'Break time'} started!`);
    }

    function requestNotificationPermission() {
        if ("Notification" in window && settings.browserNotifications &&
            Notification.permission !== "granted" &&
            Notification.permission !== "denied") {
            Notification.requestPermission();
        }
    }

    // EVENT LISTENERS
    startBtn.addEventListener('click', startTimer);
    pauseBtn.addEventListener('click', pauseTimer);
    resetBtn.addEventListener('click', resetTimer);

    // INIT
    updateTimerDisplay();
    requestNotificationPermission();

    window.timerFunctions = {
        start: startTimer,
        pause: pauseTimer,
        reset: resetTimer
    };
});
