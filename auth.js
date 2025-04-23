// auth.js

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const authSection = document.getElementById('auth-section');
    const appSection = document.getElementById('app-section');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const showSignupBtn = document.getElementById('show-signup');
    const showLoginBtn = document.getElementById('show-login');
    const loginFormEl = document.getElementById('login');
    const signupFormEl = document.getElementById('signup');
    const logoutBtn = document.getElementById('logout-btn');
    const userNameDisplay = document.getElementById('user-name');

    // Toggle between login and signup forms
    showSignupBtn.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.classList.add('hidden');
        signupForm.classList.remove('hidden');
    });

    showLoginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        signupForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
    });

    // Handle login
    loginFormEl.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        // Show loading state
        const submitBtn = loginFormEl.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;
        submitBtn.textContent = 'Logging in...';
        submitBtn.disabled = true;
        
        auth.signInWithEmailAndPassword(email, password)
            .then(() => {
                loginFormEl.reset();
                submitBtn.textContent = originalBtnText;
                submitBtn.disabled = false;
            })
            .catch(err => {
                alert(`Login error: ${err.message}`);
                submitBtn.textContent = originalBtnText;
                submitBtn.disabled = false;
            });
    });

    // Handle signup
    signupFormEl.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        
        // Show loading state
        const submitBtn = signupFormEl.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;
        submitBtn.textContent = 'Creating account...';
        submitBtn.disabled = true;
        
        auth.createUserWithEmailAndPassword(email, password)
            .then((cred) => {
                // Create user profile in Firestore
                return db.collection('users').doc(cred.user.uid).set({
                    name: name,
                    email: email,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    settings: {
                        focusDuration: 25,
                        shortBreakDuration: 5,
                        longBreakDuration: 15,
                        pomodoroCycles: 4,
                        soundNotifications: true,
                        browserNotifications: true
                    }
                });
            })
            .then(() => {
                signupFormEl.reset();
                submitBtn.textContent = originalBtnText;
                submitBtn.disabled = false;
            })
            .catch(err => {
                alert(`Signup error: ${err.message}`);
                submitBtn.textContent = originalBtnText;
                submitBtn.disabled = false;
            });
    });

    // Handle logout
    logoutBtn.addEventListener('click', () => {
        auth.signOut()
            .catch(err => {
                alert(`Logout error: ${err.message}`);
            });
    });

    // Auth state changes
    auth.onAuthStateChanged(user => {
        if (user) {
            // User is signed in
            authSection.classList.add('hidden');
            appSection.classList.remove('hidden');
            
            // Fetch user profile
            db.collection('users').doc(user.uid).get()
                .then(doc => {
                    if (doc.exists) {
                        const userData = doc.data();
                        userNameDisplay.textContent = userData.name;
                        
                        // Load user settings
                        if (userData.settings) {
                            document.getElementById('focus-duration').value = userData.settings.focusDuration;
                            document.getElementById('short-break-duration').value = userData.settings.shortBreakDuration;
                            document.getElementById('long-break-duration').value = userData.settings.longBreakDuration;
                            document.getElementById('pomodoro-cycles').value = userData.settings.pomodoroCycles;
                            document.getElementById('sound-notifications').checked = userData.settings.soundNotifications;
                            document.getElementById('browser-notifications').checked = userData.settings.browserNotifications;
                            document.getElementById('display-name').value = userData.name;
                        }
                        
                        // Initialize app data
                        loadTodayData();
                        loadAnalyticsData();
                    }
                })
                .catch(err => {
                    console.error("Error fetching user data:", err);
                });
        } else {
            // User is signed out
            appSection.classList.add('hidden');
            authSection.classList.remove('hidden');
            loginForm.classList.remove('hidden');
            signupForm.classList.add('hidden');
        }
    });
});