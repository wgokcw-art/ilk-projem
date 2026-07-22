"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../../firebaseConfig";
import Linkler from "./Linkler";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [karanlikMod, setKaranlikMod] = useState(false);
  const [istemciHazir, setIstemciHazir] = useState(false);
  const [menuAcik, setMenuAcik] = useState(false);

  const [kullanici, setKullanici] = useState<User | null>(null);
  const [authKontrolBitti, setAuthKontrolBitti] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

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
        router.push("/giris");
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Sayfa değiştiğinde mobil yan menüyü otomatik kapat
  useEffect(() => {
    setMenuAcik(false);
  }, [pathname]);

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

  const navItemlar = [
    {
      ad: "Ana Sayfa",
      yol: "/",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      )
    },
    {
      ad: "Gelen Kutusu",
      yol: "/gelen-kutusu",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
        </svg>
      )
    },
    {
      ad: "Toplantılar",
      yol: "/toplantilar",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
        </svg>
      )
    },
    {
      ad: "Ders Notları",
      yol: "/ders-notlari",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
        </svg>
      )
    },
    {
      ad: "Günlük",
      yol: "/gunluk",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
        </svg>
      )
    },
    {
      ad: "Çöp Kutusu",
      yol: "/cop-kutusu",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
        </svg>
      )
    },
    {
      ad: "Profil",
      yol: "/profil",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
        </svg>
      )
    }
  ];

  if (!istemciHazir || !authKontrolBitti) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <p className="text-xs font-bold text-neutral-400">Yükleniyor...</p>
      </div>
    );
  }

  if (!kullanici) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      
      {/* 💻 MASAÜSTÜ HEADER (Mobilde KESİNLİKLE GİZLİ) */}
      <header className="hidden md:block w-full border-b bg-white border-neutral-200 dark:bg-neutral-900 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div
            onClick={() => router.push("/")}
            className="flex items-center gap-3 cursor-pointer select-none"
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm tracking-tighter bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 shadow-sm">
              S
            </div>
            <span className="font-black text-base tracking-tight text-neutral-900 dark:text-white">
              SesAsistani
            </span>
          </div>

          <Linkler karanlikMod={karanlikMod} />

          <button
            onClick={temaDegistir}
            className="p-2 px-3.5 rounded-xl border transition-all active:scale-95 cursor-pointer text-xs font-black shadow-xs bg-neutral-100 border-neutral-200 text-neutral-900 hover:bg-neutral-200 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-100"
          >
            {karanlikMod ? "☀️ Aydınlık" : "🌙 Karanlık"}
          </button>
        </div>
      </header>

      {/* 📱 MOBİL HEADER: Üstte SES ASİSTANI yazısı ve Klasörler Butonu */}
      <header className="block md:hidden sticky top-0 z-40 w-full bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 px-4 py-3 shadow-3xs">
        <div className="flex items-center justify-between">
          {/* Sol Taraf: Yan Menü Butonu (Sadece 3 Çizgi) */}
          <button
            onClick={() => setMenuAcik(true)}
            className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 active:scale-95 transition-all flex items-center justify-center"
            aria-label="Menüyü Aç"
          >
            <svg className="w-5 h-5 text-neutral-800 dark:text-neutral-200" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
            </svg>
          </button>

          {/* Orta Taraf: MOBİLDE EKRANIN ÜSTÜNDE YAZAN "SES ASİSTANI" BAŞLIĞI */}
          <div
            onClick={() => router.push("/")}
            className="flex items-center gap-2 cursor-pointer select-none"
          >
            <div className="w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 shadow-xs">
              S
            </div>
            <h1 className="font-black text-sm tracking-tight text-neutral-900 dark:text-white">
              Ses Asistanı
            </h1>
          </div>

          {/* Sağ Taraf: Tema Butonu */}
          <button
            onClick={temaDegistir}
            className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800 text-xs font-bold active:scale-95 transition-all"
            aria-label="Tema Değiştir"
          >
            {karanlikMod ? "☀️" : "🌙"}
          </button>
        </div>
      </header>

      {/* 📱 MOBİL YAN AÇILIR PANEL (DRAWER MENU) - BURADA SES ASİSTANI YAZISIZ, SADECE MENÜ LİSTESİ */}
      {menuAcik && (
        <div className="block md:hidden fixed inset-0 z-50">
          {/* Arka Plan Karartma & Blur */}
          <div
            className="absolute inset-0 bg-neutral-950/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMenuAcik(false)}
          />

          {/* Sol Panel Gövdesi */}
          <div className="absolute left-0 top-0 h-full w-80 max-w-[85vw] bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col justify-between p-5 overflow-y-auto">
            
            <div className="space-y-5">
              {/* Panel Üstü: Sadece Temiz Kapat Butonu & Menü Etiketi (Ses Asistanı yazısı burada KESİNLİKLE YOK!) */}
              <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
                <span className="text-xs font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                  📁 Klasör Seçimi
                </span>
                
                <button
                  onClick={() => setMenuAcik(false)}
                  className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-800 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  aria-label="Menüyü Kapat"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Klasörler ve Sayfa Linkleri Listesi */}
              <nav className="space-y-1.5">
                {navItemlar.map((item) => {
                  const isActive = pathname === item.yol;

                  return (
                    <button
                      key={item.yol}
                      onClick={() => {
                        setMenuAcik(false);
                        router.push(item.yol);
                      }}
                      className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-2xl text-xs font-bold transition-all text-left ${
                        isActive
                          ? "bg-neutral-950 text-white shadow-md dark:bg-white dark:text-neutral-950"
                          : "text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      }`}
                    >
                      <span className={isActive ? "text-white dark:text-neutral-950" : "text-neutral-400 dark:text-neutral-500"}>
                        {item.icon}
                      </span>
                      <span className="font-black tracking-tight">{item.ad}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Alt Kısım: Kullanıcı ve Tema Bilgisi */}
            <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 space-y-3">
              <div className="flex items-center justify-between px-2">
                <div>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Oturum Açan:</p>
                  <p className="text-xs font-black text-neutral-800 dark:text-neutral-200 truncate max-w-[180px]">
                    {kullanici?.email || "Kullanıcı"}
                  </p>
                </div>

                <button
                  onClick={temaDegistir}
                  className="px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-bold bg-neutral-50 dark:bg-neutral-800"
                >
                  {karanlikMod ? "☀️ Aydınlık" : "🌙 Karanlık"}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Sayfa İçerikleri */}
      <main className="w-full flex-1 bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
        {children}
      </main>
    </div>
  );
}