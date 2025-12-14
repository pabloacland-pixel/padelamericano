
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAvbsf-qD7HgshBeTbhS_ZXyjnur_xYNGY",
  authDomain: "americano-pro.firebaseapp.com",
  projectId: "americano-pro",
  storageBucket: "americano-pro.firebasestorage.app",
  messagingSenderId: "349606784958",
  appId: "1:349606784958:web:04437c58c864b1bc2553ef"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let tournamentId = null;
let tournamentData = null;

// UI Elements
const loginScreen = document.getElementById('login-screen');
const setupScreen = document.getElementById('setup');
const joinScreen = document.getElementById('join-screen');
const appScreen = document.getElementById('app');
const userInfo = document.getElementById('user-info');

const urlParams = new URLSearchParams(window.location.search);
const urlTournamentId = urlParams.get('id');

// Auth state
auth.onAuthStateChanged(user => {
  currentUser = user;
  if (user) {
    loginScreen.classList.add('hidden');
    userInfo.innerHTML = `<span>${user.displayName || user.email}</span>`;
    if (urlTournamentId) {
      tournamentId = urlTournamentId;
      document.getElementById('current-tournament-id').textContent = tournamentId;
      joinScreen.classList.remove('hidden');
    } else {
      setupScreen.classList.remove('hidden');
    }
  } else {
    loginScreen.classList.remove('hidden');
    setupScreen.classList.add('hidden');
    joinScreen.classList.add('hidden');
    appScreen.classList.add('hidden');
  }
});

// Login
document.getElementById('login-btn')?.addEventListener('click', () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider);
});

// Crear torneo
document.getElementById('create-tournament')?.addEventListener('click', async () => {
  tournamentId = Math.random().toString(36).substr(2, 6).toUpperCase();
  await db.collection('tournaments').doc(tournamentId).set({
    ownerId: currentUser.uid,
    name: document.getElementById('tournament-name').value || 'Torneo',
    players: [{ id: currentUser.uid, name: currentUser.displayName || currentUser.email }],
    rounds: [],
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  window.history.pushState({}, '', `?id=${tournamentId}`);
  document.getElementById('current-tournament-id').textContent = tournamentId;
  setupScreen.classList.add('hidden');
  joinScreen.classList.remove('hidden');
});

// Unirse
document.getElementById('join-tournament')?.addEventListener('click', async () => {
  if (!tournamentId) return;
  const ref = db.collection('tournaments').doc(tournamentId);
  await ref.update({
    players: firebase.firestore.FieldValue.arrayUnion({
      id: currentUser.uid,
      name: currentUser.displayName || currentUser.email
    })
  });
  joinScreen.classList.add('hidden');
  appScreen.classList.remove('hidden');
  
  // Realtime updates
  ref.onSnapshot(doc => {
    tournamentData = doc.data();
    renderPlayers();
  });
});

function renderPlayers() {
  if (!tournamentData) return;
  const list = document.getElementById('players-list');
  list.innerHTML = tournamentData.players.map(p => 
    `<div class="editable-name">${p.name}</div>`
  ).join('');

}
