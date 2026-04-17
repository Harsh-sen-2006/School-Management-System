// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/**
 * Firebase Configuration for Kiddy's Corner App
 * These details link your code to your specific Google Firebase project.
 */
const firebaseConfig = {
  apiKey: "AIzaSyC17oHo4J8Pux0FEMLnPx6Ajew68fd1l1o",
  authDomain: "classsync-db92f.firebaseapp.com",
  projectId: "classsync-db92f",
  storageBucket: "classsync-db92f.firebasestorage.app",
  messagingSenderId: "397434884656",
  appId: "1:397434884656:web:1b1101963f3f32234f93f5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore (Database) and export it for use in other files
export const db = getFirestore(app);

/**
 * NOTE: 
 * To use this file, your other JS files must import 'db' like this:
 * import { db } from "./firebase.js";
 */