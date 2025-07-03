import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signInWithPopup, 
    GoogleAuthProvider,
    signOut 
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

    // Event listeners
    loginForm.addEventListener('submit', e => {
        e.preventDefault();
        const email = loginForm['login-email'].value;
        const password = loginForm['login-password'].value;
        signInWithEmailAndPassword(auth, email, password)
            .catch(error => { loginError.textContent = error.message; });
    });

    signupForm.addEventListener('submit', e => {
        e.preventDefault();
        const email = signupForm['signup-email'].value;
        const password = signupForm['signup-password'].value;
        createUserWithEmailAndPassword(auth, email, password)
            .catch(error => { signupError.textContent = error.message; });
    });

    googleSigninBtn.addEventListener('click', () => {
        const provider = new GoogleAuthProvider();
        signInWithPopup(auth, provider).catch(error => {
            loginError.textContent = "Google Sign-In failed: " + error.message;
        });
    });

    showSignupBtn.addEventListener('click', () => {
        document.getElementById('auth-view-login').classList.add('hidden');
        document.getElementById('auth-view-signup').classList.remove('hidden');
    });

    showLoginBtn.addEventListener('click', () => {
        document.getElementById('auth-view-login').classList.remove('hidden');
        document.getElementById('auth-view-signup').classList.add('hidden');
    });

    logoutBtn.addEventListener('click', () => signOut(auth));
}
