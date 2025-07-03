import { initializeApp } from "https://www.gstatic.com/firebasejs/9.19.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.19.1/firebase-auth.js";
import { initializeAuth } from './auth.js';
import { initializeStore, teardownStore } from './store.js';
import { initializeUI, showAuth, showApp } from './ui.js';

// --- PASTE YOUR FIREBASE CONFIG HERE ---
const firebaseConfig = {
    apiKey: "AIzaSyBlafuTrE0PMRHMpEjU-wWYVvXcJbpY8Ek",
    authDomain: "training-planner-812f0.firebaseapp.com",
    projectId: "training-planner-812f0",
    storageBucket: "training-planner-812f0.appspot.com",
    messagingSenderId: "554442101604",
    appId: "1:554442101604:web:1bd5c5a6d0061638fca071",
    measurementId: "G-JWXX5GV093"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// --- APP INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    initializeUI();
    initializeAuth(auth);

    onAuthStateChanged(auth, user => {
        if (user) {
            // User is signed in
            showApp();
            initializeStore(user.uid);
        } else {
            // User is signed out
            showAuth();
            teardownStore();
        }
    });
});