// 🔥 Firebase Modular SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, arrayUnion, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 🔑 TU CONFIGURACIÓN REAL (reemplaza con tu apiKey)
const firebaseConfig = {
  apiKey: "AIzaSyAvbsf-qD7HgshBeTbhS_ZXyjnur_xYNGY",
  authDomain: "americano-pro.firebaseapp.com",
  projectId: "americano-pro",
  storageBucket: "americano-pro.firebasestorage.app",
  messagingSenderId: "349606784958",
  appId: "1:349606784958:web:04437c58c864b1bc2553ef"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

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
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user) {
    loginScreen.style.display = 'none';
    userInfo.innerHTML = `<span>👤 ${user.displayName || user.email}</span>`;
    
    if (urlTournamentId) {
      tournamentId = urlTournamentId;
      document.getElementById('current-tournament-id').textContent = tournamentId;
      joinScreen.style.display = 'block';
    } else {
      setupScreen.style.display = 'block';
    }
  } else {
    loginScreen.style.display = 'block';
    setupScreen.style.display = 'none';
    joinScreen.style.display = 'none';
    appScreen.style.display = 'none';
  }
});

// Login con Google
document.getElementById('login-btn')?.addEventListener('click', async () => {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("❌ Error al iniciar sesión:", error.code, error.message);
    alert("Error: " + error.message);
  }
});

// Crear torneo
document.getElementById('create-tournament')?.addEventListener('click', async () => {
  const name = document.getElementById('tournament-name').value || 'Torneo Americano';
  tournamentId = Math.random().toString(36).substr(2, 6).toUpperCase();
  
  const tournamentRef = doc(db, 'tournaments', tournamentId);
  await setDoc(tournamentRef, {
    ownerId: currentUser.uid,
    name,
    createdAt: new Date(),
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
  setupScreen.style.display = 'none';
  joinScreen.style.display = 'block';
});

// Unirse al torneo
document.getElementById('join-tournament')?.addEventListener('click', async () => {
  if (!tournamentId || !currentUser) return;

  const tournamentRef = doc(db, 'tournaments', tournamentId);
  const docSnap = await getDoc(tournamentRef);
  if (!docSnap.exists()) {
    alert('❌ Torneo no encontrado.');
    return;
  }

  // Añadir jugador
  await updateDoc(tournamentRef, {
    players: arrayUnion({
      id: currentUser.uid,
      name: currentUser.displayName || currentUser.email,
      email: currentUser.email
    })
  });

  joinScreen.style.display = 'none';
  appScreen.style.display = 'block';

  // Escuchar cambios en tiempo real
  onSnapshot(tournamentRef, (doc) => {
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

  // Mostrar rondas
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
