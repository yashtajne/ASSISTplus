import { initializeApp } from "firebase/app";

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_APIKEY,
  authDomain: "assistplus-99308.firebaseapp.com",
  projectId: "assistplus-99308",
  storageBucket: "assistplus-99308.firebasestorage.app",
  messagingSenderId: "408490136295",
  appId: "1:408490136295:web:a3a6fec8a3c9d85e4a4842",
};

const FirebaseAppClient = initializeApp(firebaseConfig);

export default FirebaseAppClient;