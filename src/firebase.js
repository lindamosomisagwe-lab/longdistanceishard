import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCAAGMZA3OdkHev0nsVTZk1S6ssmv3Lcmc",
  authDomain: "longdistanceishard.firebaseapp.com",
  projectId: "longdistanceishard",
  storageBucket: "longdistanceishard.firebasestorage.app",
  messagingSenderId: "74645249973",
  appId: "1:74645249973:web:604aab3693be891eddc3fc",
  measurementId: "G-VN686EBKJ4"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
