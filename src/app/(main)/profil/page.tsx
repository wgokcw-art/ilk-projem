"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { auth } from "../../../firebaseConfig"; // 3 üst dizine çıkıp firebaseConfig'e bağlanıyoruz
import { onAuthStateChanged, signOut, updateProfile } from "firebase/auth";

export default function ProfilSayfasi() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [user, setUser] = useState<any>(null);
  const [isim, setIsim] = useState("");
  const [unvan, setUnvan] = useState("");
  const [profilResmi, setProfilResmi] = useState<string | null>(null);
  
  const [duzenlemeModu, setDuzenlemeModu] = useState(false);
  const [yeniIsim, setYeniIsim] = useState("");
  const [yeniUnvan, setYeniUnvan] = useState("");
  const [istemciHazir, setIstemciHazir] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(true);

  // 🔐 Giriş Kontrolü ve Kullanıcı Bilgilerini Çekme
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/giris");
      } else {
        setUser(currentUser);
        
        // Kullanıcı adı varsa onu, yoksa e-posta adresini varsayılan yaparız
        const dIsim = currentUser.displayName || currentUser.email?.split("@")[0] || "İsimsiz Kullanıcı";
        // Unvan bilgisini Firebase Auth içinde custom saklayamadığımız için şimdilik lokal ya da dinamik alıyoruz
        const dUnvan = localStorage.getItem(`profil_unvan_${currentUser.uid}`) || "Unvan Belirtilmedi";
        const dResim = currentUser.photoURL || localStorage.getItem(`profil_resmi_${currentUser.uid}`);
        
        setIsim(dIsim);
        setUnvan(dUnvan);
        setYeniIsim(dIsim);
        setYeniUnvan(dUnvan);
        setProfilResmi(dResim);
        
        setYukleniyor(false);
        setIstemciHazir(true);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleFotoSec = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dosya = e.target.files?.[0];
    if (!dosya || !user) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      setProfilResmi(base64String);
      
      // Fotoğrafı hem lokalde bu kullanıcıya özel saklıyoruz hem de Firebase Auth'a kaydediyoruz
      localStorage.setItem(`profil_resmi_${user.uid}`, base64String);
      try {
        await updateProfile(user, { photoURL: base64String });
      } catch (err) {
        console.error("Profil resmi Firebase'e kaydedilemedi:", err);
      }
    };
    reader.readAsDataURL(dosya);
  };

  const handleKaydet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!yeniIsim.trim()) {
      alert("İsim alanı boş bırakılamaz!");
      return;
    }

    try {
      // 1. Firebase Authentication üzerinde kullanıcının adını güncelle
      await updateProfile(user, {
        displayName: yeniIsim.trim()
      });

      // 2. Unvan bilgisini bu kullanıcıya özel olarak sakla
      localStorage.setItem(`profil_unvan_${user.uid}`, yeniUnvan.trim());
      
      setIsim(yeniIsim.trim());
      setUnvan(yeniUnvan.trim());
      setDuzenlemeModu(false);
      
      alert("Profil bilgileri başarıyla güncellendi!");
    } catch (error: any) {
      console.error(error);
      alert(`Profil güncellenirken bir hata oluştu: ${error.message}`);
    }
  };

  // 🎯 GÜVENLİ ÇIKIŞ YAPMA (Non-blocking instant sign out)
  const handleCikisYap = async () => {
    try {
      await signOut(auth);
      router.push("/giris");
    } catch (error) {
      console.error("Çıkış yapılırken bir hata oluştu:", error);
    }
  };

  if (yukleniyor || !istemciHazir) return null;

  return (
    <div className="w-full min-h-[70vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-8 space-y-6 shadow-xs">
        
        <div className="text-center space-y-4">
          <div className="relative w-24 h-24 mx-auto group">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-full rounded-full bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 flex items-center justify-center text-3xl font-black shadow-md overflow-hidden cursor-pointer border border-neutral-200 dark:border-neutral-700 active:scale-95 transition-all"
            >
              {profilResmi ? (
                <img src={profilResmi} alt="Profil" className="w-full h-full object-cover" />
              ) : (
                isim.charAt(0).toUpperCase()
              )}
            </div>
            
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-950 p-1.5 rounded-full shadow-xs hover:scale-110 transition-transform active:scale-95 flex items-center justify-center"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
              </svg>
            </button>
          </div>

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFotoSec} 
            accept="image/*" 
            className="hidden" 
          />
        </div>

        {!duzenlemeModu ? (
          <div className="space-y-6 text-center">
            <div className="space-y-1">
              <h2 className="text-xl font-black tracking-tight">{isim}</h2>
              <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider">{unvan}</p>
              <p className="text-xs text-neutral-500 font-medium">{user?.displayName || user?.email?.split("@")[0] || "Kullanıcı"}</p>
            </div>

            <button
              type="button"
              onClick={() => setDuzenlemeModu(true)}
              className="w-full py-2 bg-neutral-100 border border-neutral-200 text-neutral-900 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-100 rounded-xl text-xs font-black hover:opacity-90 transition-all active:scale-[0.98]"
            >
              Profili Düzenle
            </button>
          </div>
        ) : (
          <form onSubmit={handleKaydet} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase tracking-wider text-neutral-400">Adınız Soyadınız</label>
              <input
                type="text"
                required
                value={yeniIsim}
                onChange={(e) => setYeniIsim(e.target.value)}
                className="w-full px-4 py-2.5 text-xs font-bold bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none text-neutral-900 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase tracking-wider text-neutral-400">Meslek / Okul</label>
              <input
                type="text"
                value={yeniUnvan}
                onChange={(e) => setYeniUnvan(e.target.value)}
                className="w-full px-4 py-2.5 text-xs font-bold bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none text-neutral-900 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setYeniIsim(isim);
                  setYeniUnvan(unvan);
                  setDuzenlemeModu(false);
                }}
                className="w-1/2 py-2.5 bg-neutral-100 border border-neutral-200 text-neutral-900 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-100 rounded-xl text-xs font-black hover:opacity-90 transition-all active:scale-[0.98]"
              >
                İptal
              </button>
              <button
                type="submit"
                className="w-1/2 py-2.5 bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 rounded-xl text-xs font-black hover:opacity-90 transition-all active:scale-[0.98]"
              >
                Kaydet
              </button>
            </div>
          </form>
        )}

        <div className="border-t border-neutral-100 dark:border-neutral-800 pt-4 text-center">
          <p className="text-[11px] text-neutral-400 font-semibold mb-4">
            Hesap Türü: Firebase Cloud Güvenli Profil
          </p>
          <button
            type="button"
            onClick={handleCikisYap}
            className="w-full py-2.5 bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 rounded-xl text-xs font-black hover:opacity-90 transition-all active:scale-[0.98]"
          >
            Oturumu Kapat
          </button>
        </div>

      </div>
    </div>
  );
}