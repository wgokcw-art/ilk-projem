import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// ✅ Yeni oluşturulan "ses-asistani-test" projesine ait kimlik bilgileri (Aynen Korundu)
const firebaseConfig = {
  apiKey: "AIzaSyDxqM8ACE5urVstqCZeMWzaVyKvqhAAn60",
  authDomain: "ses-asistani-test.firebaseapp.com",
  projectId: "ses-asistani-test",
  storageBucket: "ses-asistani-test.firebasestorage.app",
  messagingSenderId: "719736493439",
  appId: "1:719736493439:web:cfbb37ba11e4e563c7364a",
  measurementId: "G-FWLYW79RHG",
};

// Next.js hot-reload esnasında uygulamanın mükerrer başlatılmasını engeller
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Diğer sayfaların sorunsuz çalışması için standart export yapıları
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;