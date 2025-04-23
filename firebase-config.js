// firebase-config.js

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDcxy-JXFLymTFXwRfUe_3j1-48l3XAe54",
    authDomain: "daily-focus-f9c51.firebaseapp.com",
    projectId: "daily-focus-f9c51",
    storageBucket: "daily-focus-f9c51.firebasestorage.app",
    messagingSenderId: "458416229520",
    appId: "1:458416229520:web:00868d7eb58fdd4e781c15"
  };
  
  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  
  // Initialize services
  const auth = firebase.auth();
  const db = firebase.firestore();
  
  // Configure Firestore
  db.settings({ timestampsInSnapshots: true });
  
  // Export the services for use in other files
  window.db = db;
  window.auth = auth;