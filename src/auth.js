import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    setPersistence,
    browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/9.19.1/firebase-auth.js";

let auth;

export function initializeAuth(authInstance) {
    auth = authInstance;

    // Element selectors
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const googleSigninBtn = document.getElementById('google-signin-btn');
    const showSignupBtn = document.getElementById('show-signup-btn');
    const showLoginBtn = document.getElementById('show-login-btn');
    const loginError = document.getElementById('login-error');
    const signupError = document.getElementById('signup-error');
    const logoutBtn = document.querySelector('[data-action="logout"]');

    // Event listeners for email/password
    if (loginForm) {
        loginForm.addEventListener('submit', e => {
            e.preventDefault();
            const email = loginForm['login-email'].value;
            const password = loginForm['login-password'].value;
            signInWithEmailAndPassword(auth, email, password)
                .catch(error => { loginError.textContent = error.message; });
        });
    }

    if (signupForm) {
        signupForm.addEventListener('submit', e => {
            e.preventDefault();
            const email = signupForm['signup-email'].value;
            const password = signupForm['signup-password'].value;
            createUserWithEmailAndPassword(auth, email, password)
                .catch(error => { signupError.textContent = error.message; });
        });
    }

    // Corrected Google Sign-In listener
    if (googleSigninBtn) {
        googleSigninBtn.addEventListener('click', () => {
            const provider = new GoogleAuthProvider();
            
            // Set persistence to 'session' before calling the popup
            setPersistence(auth, browserSessionPersistence)
                .then(() => {
                    // Once persistence is set, initiate the sign-in popup
                    return signInWithPopup(auth, provider);
                })
                .catch(error => {
                    // Handle errors, including if the user closes the popup
                    loginError.textContent = "Google Sign-In failed: " + error.message;
                });
        });
    }
    
    // Other UI toggles
    if (showSignupBtn) {
        showSignupBtn.addEventListener('click', () => {
            document.getElementById('auth-view-login').classList.add('hidden');
            document.getElementById('auth-view-signup').classList.remove('hidden');
        });
    }

    if (showLoginBtn) {
        showLoginBtn.addEventListener('click', () => {
            document.getElementById('auth-view-login').classList.remove('hidden');
            document.getElementById('auth-view-signup').classList.add('hidden');
        });
    }

    if(logoutBtn) {
        logoutBtn.addEventListener('click', () => signOut(auth));
    }
}