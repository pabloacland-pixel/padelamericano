// 🔥 Firebase Compat SDK
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

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const setupScreen = document.getElementById('setup');
const joinByIdScreen = document.getElementById('join-by-id');
const appScreen = document.getElementById('app');
const userInfo = document.getElementById('user-info');

const urlParams = new URLSearchParams(window.location.search);
const urlTournamentId = urlParams.get('id');

// Auth state
auth.onAuthStateChanged(user => {
  currentUser = user;
  if (user) {
    loginScreen.classList.add('hidden');
    userInfo.innerHTML = `<span>👤 ${user.displayName || user.email}</span>`;
    
    if (urlTournamentId) {
      tournamentId = urlTournamentId;
      document.getElementById('manual-tournament-id').value = tournamentId; // Mostrar ID en input
      joinByIdScreen.classList.remove('hidden');
    } else {
      setupScreen.classList.remove('hidden');
    }
  } else {
    loginScreen.classList.remove('hidden');
    setupScreen.classList.add('hidden');
    joinByIdScreen.classList.add('hidden');
    appScreen.classList.add('hidden');
  }
});

// Login
document.getElementById('login-btn')?.addEventListener('click', async () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    await auth.signInWithPopup(provider);
  } catch (error) {
    alert("❌ Error: " + error.message);
  }
});

// Crear torneo
document.getElementById('create-tournament')?.addEventListener('click', async () => {
  const name = document.getElementById('tournament-name').value || 'Torneo';
  tournamentId = Math.random().toString(36).substr(2, 6).toUpperCase();
  
  await db.collection('tournaments').doc(tournamentId).set({
    ownerId: currentUser.uid,
    name,
    createdAt: new Date(),
    players: [{
      id: currentUser.uid,
      name: currentUser.displayName || currentUser.email
    }],
    rounds: [],
    state: 'setup'
  });

  window.history.pushState({}, '', `?id=${tournamentId}`);
  setupScreen.classList.add('hidden');
  joinByIdScreen.classList.remove('hidden');
});

// Unirse por ID manual
document.getElementById('join-manual')?.addEventListener('click', async () => {
  const id = document.getElementById('manual-tournament-id').value.trim().toUpperCase();
  if (!id) {
    alert("⚠️ Ingresa un ID válido.");
    return;
  }

  const ref = db.collection('tournaments').doc(id);
  const doc = await ref.get();
  if (!doc.exists) {
    alert('❌ Torneo no encontrado.');
    return;
  }

  // Añadir jugador si no está ya
  const players = doc.data().players || [];
  const alreadyJoined = players.some(p => p.id === currentUser.uid);

  if (!alreadyJoined) {
    await ref.update({
      players: firebase.firestore.FieldValue.arrayUnion({
        id: currentUser.uid,
        name: currentUser.displayName || currentUser.email
      })
    });
  }

  // Cambiar a pantalla de juego
  joinByIdScreen.classList.add('hidden');
  appScreen.classList.remove('hidden');

  // Escuchar cambios en tiempo real
  ref.onSnapshot(doc => {
    tournamentData = doc.data();
    renderUI();
  });
});

// Render UI
function renderUI() {
  if (!tournamentData) return;

  // Mostrar jugadores
  const playersList = document.getElementById('players-list');
  playersList.innerHTML = tournamentData.players.map(p => 
    `<div class="editable-name">${p.name}${tournamentData.ownerId === p.id ? ' 👑' : ''}</div>`
  ).join('');

  // Rondas
  const roundIndicator = document.getElementById('round-indicator');
  roundIndicator.textContent = `Ronda ${tournamentData.rounds?.length || 0} / 7`;

  // Historial
  const historyDiv = document.getElementById('history');
  historyDiv.innerHTML = tournamentData.rounds?.map((r, i) => `
    <div class="history-item">
      <strong>Ronda ${i+1}</strong><br>
      ${r.matches?.map(m => `${m.team1.join(' + ')} vs ${m.team2.join(' + ')} → ${m.score}`).join('<br>')}
    </div>
  `).join('') || '<p>⏳ Sin partidos registrados.</p>';
}
