import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCa9I1T8MqHhZwQEPc9-TMcvzLQjQfPTdM",
  authDomain: "gen-lang-client-0001971683.firebaseapp.com",
  projectId: "gen-lang-client-0001971683",
  storageBucket: "gen-lang-client-0001971683.firebasestorage.app",
  messagingSenderId: "1055354552529",
  appId: "1:1055354552529:web:a40002d8853664d9ad45f0",
  measurementId: "G-QDSBYL2N0D"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
