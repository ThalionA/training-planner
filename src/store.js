import { getFirestore, collection, doc, setDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/9.19.1/firebase-firestore.js";
import { getApp } from "https://www.gstatic.com/firebasejs/9.19.1/firebase-app.js";

let db;
let currentUserId;
let listeners = [];

let sessions = [];
let dailyWellness = [];

const trainingConfig = {
    "Climbing": { "Bouldering": { type: 'bouldering' }, "Sport Climbing": { type: 'sport' }, "Endurance": { type: 'endurance' }, "Training Board": { type: 'generic' } },
    "Weights": { "Strength": { type: 'weights' }, "Hypertrophy": { type: 'weights' }, "Power": { type: 'weights' } },
    "Running": { "Road": { type: 'running' }, "Trail": { type: 'running' }, "Track": { type: 'running' } },
    "Other": { "Yoga": { type: 'generic' }, "Stretching": { type: 'generic' }, "Mobility": { type: 'generic' } }
};

export function initializeStore(uid) {
    db = getFirestore(getApp());
    currentUserId = uid;

    const sessionsRef = collection(db, 'users', currentUserId, 'sessions');
    const sessionsUnsubscribe = onSnapshot(query(sessionsRef, orderBy('date', 'desc')), snapshot => {
        sessions = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        document.dispatchEvent(new CustomEvent('datachanged'));
    });
    listeners.push(sessionsUnsubscribe);

    const wellnessRef = collection(db, 'users', currentUserId, 'wellness');
    const wellnessUnsubscribe = onSnapshot(wellnessRef, snapshot => {
        dailyWellness = snapshot.docs.map(doc => ({ date: doc.id, ...doc.data() }));
        document.dispatchEvent(new CustomEvent('datachanged'));
    });
    listeners.push(wellnessUnsubscribe);
}

export function teardownStore() {
    listeners.forEach(unsub => unsub());
    listeners = [];
    sessions = [];
    dailyWellness = [];
    currentUserId = null;
}

export const getSessions = () => sessions;
export const getWellness = () => dailyWellness;
export const getTrainingConfig = () => trainingConfig;
export const getSessionById = (id) => sessions.find(s => s.id === id);

export async function saveSession(sessionData) {
    if (!currentUserId) return;
    const docRef = doc(db, 'users', currentUserId, 'sessions', String(sessionData.id));
    await setDoc(docRef, sessionData, { merge: true });
}

export async function saveWellness(wellnessData) {
    if (!currentUserId) return;
    const docRef = doc(db, 'users', currentUserId, 'wellness', wellnessData.date);
    await setDoc(docRef, wellnessData, { merge: true });
}