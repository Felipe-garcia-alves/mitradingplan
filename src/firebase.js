import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAw4ch3ezT_2wPa7TidnXRWRsuF4ojRv3Y",
  authDomain: "mitrandinplan.firebaseapp.com",
  projectId: "mitrandinplan",
  storageBucket: "mitrandinplan.firebasestorage.app",
  messagingSenderId: "1090271175226",
  appId: "1:1090271175226:web:c8c51435f5f9e3732a0b03"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);