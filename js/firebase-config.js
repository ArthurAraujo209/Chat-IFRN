const firebaseConfig = {
  apiKey: "AIzaSyBIqsy6bfacNXOqZIX2Bgp04beJuwL_pJI",
  authDomain: "chatifrn.firebaseapp.com",
  projectId: "chatifrn",
  storageBucket: "chatifrn.firebasestorage.app",
  messagingSenderId: "109851786257",
  appId: "1:109851786257:web:9d45ce0899206e41b3c5b0"
};

// Inicializa Firebase
firebase.initializeApp(firebaseConfig);

// Disponibiliza globalmente
const auth = firebase.auth();
const db = firebase.firestore();