// 🔥 Firebase Config (reemplaza con tu apiKey real)
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let tournamentId = null;
let tournamentData = null;

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const setupScreen = document.getElementById('setup');
const joinScreen = document.getElementById('join-screen');
const appScreen = document.getElementById('app');
const userInfo = document.getElementById('user-info');

// URL Params
const urlParams = new URLSearchParams(window.location.search);
const urlTournamentId = urlParams.get('id');

// Escuchar estado de autenticación
auth.onAuthStateChanged(user => {
  currentUser = user;
  if (user) {
    loginScreen.classList.add('hidden');
    userInfo.innerHTML = `<span>👤 ${user.displayName || user.email}</span>`;
    
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

// Login con Google
document.getElementById('login-btn')?.addEventListener('click', () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider)
    .catch(error => {
      console.error("❌ Error al iniciar sesión:", error.code, error.message);
      alert("Error: " + error.message);
    });
});

// Crear torneo
document.getElementById('create-tournament')?.addEventListener('click', async () => {
  const name = document.getElementById('tournament-name').value || 'Torneo Americano';
  tournamentId = Math.random().toString(36).substr(2, 6).toUpperCase();
  
  await db.collection('tournaments').doc(tournamentId).set({
    ownerId: currentUser.uid,
    name,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    players: [{
      id: currentUser.uid,
      name: currentUser.displayName || currentUser.email,
      email: currentUser.email
    }],
    rounds: [],
    state: 'setup'
  });

  // Actualizar URL
  window.history.pushState({}, '', `?id=${tournamentId}`);
  document.getElementById('current-tournament-id').textContent = tournamentId;
  setupScreen.classList.add('hidden');
  joinScreen.classList.remove('hidden');
});

// Unirse al torneo
document.getElementById('join-tournament')?.addEventListener('click', async () => {
  if (!tournamentId || !currentUser) return;

  const tournamentRef = db.collection('tournaments').doc(tournamentId);
  const doc = await tournamentRef.get();
  if (!doc.exists) {
    alert('❌ Torneo no encontrado.');
    return;
  }

  // Añadir jugador
  await tournamentRef.update({
    players: firebase.firestore.FieldValue.arrayUnion({
      id: currentUser.uid,
      name: currentUser.displayName || currentUser.email,
      email: currentUser.email
    })
  });

  joinScreen.classList.add('hidden');
  appScreen.classList.remove('hidden');

  // Escuchar cambios en tiempo real
  tournamentRef.onSnapshot(doc => {
    tournamentData = doc.data();
    renderUI();
  });
});

// Copiar enlace
document.getElementById('copy-link')?.addEventListener('click', () => {
  const url = `${window.location.origin}${window.location.pathname}?id=${tournamentId}`;
  navigator.clipboard.writeText(url).then(() => {
    alert('✅ Enlace copiado. Envíaselo a los jugadores.');
  }).catch(err => {
    alert('⚠️ No se pudo copiar. Pega manualmente: ' + url);
  });
});

// Render UI (jugadores, ranking, etc.)
function renderUI() {
  if (!tournamentData) return;

  // Mostrar jugadores
  const playersList = document.getElementById('players-list');
  playersList.innerHTML = tournamentData.players.map(p => 
    `<div class="editable-name">${p.name}</div>`
  ).join('');

  // Mostrar rondas (ejemplo simple)
  const roundIndicator = document.getElementById('round-indicator');
  roundIndicator.textContent = `Ronda ${tournamentData.rounds?.length || 0} / 7`;

  // Mostrar historial
  const historyDiv = document.getElementById('history');
  historyDiv.innerHTML = tournamentData.rounds?.map((r, i) => `
    <div class="history-item">
      <strong>Ronda ${i+1}</strong><br>
      ${r.matches?.map(m => `${m.team1.join(' + ')} vs ${m.team2.join(' + ')} → ${m.score}`).join('<br>')}
    </div>
  `).join('') || '<p>⏳ Sin partidos registrados.</p>';
}
