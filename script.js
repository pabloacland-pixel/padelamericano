// 🔥 Firebase Compat SDK (mejor para GitHub Pages)
const firebaseConfig = {
  apiKey: "AIzaSyAvbsf-qD7HgshBeTbhS_ZXyjnur_xYNGY",
  authDomain: "americano-pro.firebaseapp.com",
  projectId: "americano-pro",
  storageBucket: "americano-pro.firebasestorage.app",
  messagingSenderId: "349606784958",
  appId: "1:349606784958:web:04437c58c864b1bc2553ef"
};

// Inicializar
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let tournamentId = null;
let tournamentData = null;

// DOM
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

// Login
document.getElementById('login-btn')?.addEventListener('click', async () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    await auth.signInWithPopup(provider);
  } catch (error) {
    console.error("❌ Error:", error.message);
    alert("Error: " + error.message);
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
  document.getElementById('current-tournament-id').textContent = tournamentId;
  setupScreen.classList.add('hidden');
  joinScreen.classList.remove('hidden');
});

// ✅ UNIRSE AL TORNEO (CORREGIDO)
document.getElementById('join-tournament')?.addEventListener('click', async () => {
  if (!tournamentId || !currentUser) return;

  const ref = db.collection('tournaments').doc(tournamentId);
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

  joinScreen.classList.add('hidden');
  appScreen.classList.remove('hidden');

  // Escuchar en tiempo real
  ref.onSnapshot(doc => {
    tournamentData = doc.data();
    renderUI();
  });
});

// Copiar enlace
document.getElementById('copy-link')?.addEventListener('click', () => {
  const url = `${window.location.origin}${window.location.pathname}?id=${tournamentId}`;
  navigator.clipboard.writeText(url).then(() => {
    alert('✅ Link copiado:\n' + url);
  });
});

// Render UI
function renderUI() {
  if (!tournamentData) return;

  const playersList = document.getElementById('players-list');
  playersList.innerHTML = tournamentData.players?.map(p => 
    `<div class="editable-name">${p.name}${tournamentData.ownerId === p.id ? ' 👑' : ''}</div>`
  ).join('') || '<p>⏳ Sin jugadores.</p>';
}
