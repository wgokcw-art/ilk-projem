"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../../firebaseConfig";
import Linkler from "./Linkler";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [karanlikMod, setKaranlikMod] = useState(false);
  const [istemciHazir, setIstemciHazir] = useState(false);

  const [kullanici, setKullanici] = useState<User | null>(null);
  const [authKontrolBitti, setAuthKontrolBitti] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIstemciHazir(true);
    const kaydedilenMod = localStorage.getItem("karanlikModMevcut");
    if (kaydedilenMod === "true") {
      setKaranlikMod(true);
      document.documentElement.classList.add("dark");
    } else {
      setKaranlikMod(false);
      document.documentElement.classList.remove("dark");
    }
  }, []);

  // 🔐 Firebase auth durumunu dinle
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseKullanici) => {
      setKullanici(firebaseKullanici);
      setAuthKontrolBitti(true);

      if (!firebaseKullanici) {
        // Giriş yapmamış kullanıcıyı giriş sayfasına at
        router.push("/giris");
      }
    });

    return () => unsubscribe();
  }, [router]);

  const temaDegistir = () => {
    const yeniMod = !karanlikMod;
    setKaranlikMod(yeniMod);
    localStorage.setItem("karanlikModMevcut", String(yeniMod));

    if (yeniMod) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  if (!istemciHazir || !authKontrolBitti) {
    // Auth kontrolü bitene kadar boş/yükleniyor ekranı göster
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <p className="text-xs font-bold text-neutral-400">Yükleniyor...</p>
      </div>
    );
  }

  if (!kullanici) {
    // Yönlendirme yapılırken ekranda kısa süre hiçbir şey gösterme
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      {/* HEADER / ÜST BAR */}
      <div className="w-full border-b bg-white border-neutral-200 dark:bg-neutral-900 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm tracking-tighter bg-neutral-950 text-white dark:bg-white dark:text-neutral-950">
              S
            </div>
            <span className="font-black text-base tracking-tight">SesAsistani</span>
          </div>

          {/* Menü Linkleri */}
          <Linkler karanlikMod={karanlikMod} />

          {/* Sağ Taraf: Tema Değiştirme Butonu */}
          <button
            onClick={temaDegistir}
            className="p-2 px-3.5 rounded-xl border transition-all active:scale-95 cursor-pointer text-xs font-black shadow-xs bg-neutral-100 border-neutral-200 text-neutral-900 hover:bg-neutral-200 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-100"
          >
            {karanlikMod ? "☀️ Aydınlık" : "🌙 Karanlık"}
          </button>
        </div>
      </div>

      {/* Sayfa İçerikleri */}
      <main className="w-full flex-1 bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
        {children}
      </main>
    </div>
  );
}