"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../../firebaseConfig"; // 3 üst dizine çıkıp firebaseConfig'e bağlanıyoruz
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, writeBatch } from "firebase/firestore";

export default function CopKutusu() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [sesler, setSesler] = useState<any[]>([]);
  const [istemciHazir, setIstemciHazir] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(true);

  // 🔐 Giriş Kontrolü ve Kullanıcı Doğrulama
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/giris");
      } else {
        setUser(currentUser);
        setIstemciHazir(true);
        setYukleniyor(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  // ☁️ FIRESTORE'DAN SADECE "CopKutusu" KLASÖRÜNDEKİ SESLERİ ÇEKME
  const buluttanCopleriCek = async (aktifKullanici: any) => {
    if (!aktifKullanici) return;

    try {
      const seslerRef = collection(db, "sesler");
      // Sadece giriş yapan kullanıcıya ait ve bulunduğu klasör "CopKutusu" olan kayıtları çeker
      const q = query(
        seslerRef,
        where("userId", "==", aktifKullanici.uid),
        where("bulunduguKlasor", "==", "CopKutusu")
      );
      
      const querySnapshot = await getDocs(q);
      const bulutSesleri: any[] = [];
      
      querySnapshot.forEach((docSnap) => {
        bulutSesleri.push({ id: docSnap.id, ...docSnap.data() });
      });

      setSesler(bulutSesleri);
    } catch (error) {
      console.error("Çöp kutusu verileri çekilirken hata oluştu:", error);
    }
  };

  // Kullanıcı durumu doğrulanınca Firestore'u tetikle
  useEffect(() => {
    if (user) {
      buluttanCopleriCek(user);
    }
  }, [user]);

  // 🔄 GERİ YÜKLEME FONKSİYONU: Sesi çöp kutusundan çıkartıp eski klasörüne gönderir
  const geriYukle = async (ses: any) => {
    try {
      // Eğer eski klasör bilgisi yoksa varsayılan olarak "Toplantilar" klasörüne göndeririz
      const hedefKlasor = ses.eskiKlasor || "Toplantilar";
      const sesRef = doc(db, "sesler", ses.id);

      // Firestore'da belgenin klasörünü güncelle ve silinme tarihini/eski klasör bilgisini temizle
      await updateDoc(sesRef, {
        bulunduguKlasor: hedefKlasor,
        eskiKlasor: null,
        silinmeTarihi: null
      });

      setSesler((prev) => prev.filter((s) => s.id !== ses.id));
      alert(`"${ses.ad}" başarıyla "${hedefKlasor}" klasörüne geri yüklendi.`);
    } catch (error) {
      console.error("Geri yükleme hatası:", error);
      alert("Dosya geri yüklenirken bir hata oluştu.");
    }
  };

  // 🔥 KALICI SİLME FONKSİYONU: Kaydı Firestore'dan tamamen siler
  const kaliciSil = async (id: string) => {
    try {
      await deleteDoc(doc(db, "sesler", id));
      setSesler((prev) => prev.filter((s) => s.id !== id));
    } catch (error) {
      console.error("Silme hatası:", error);
    }
  };

  // 🧹 ÇÖPÜ TAMAMEN BOŞALTMA FONKSİYONU: Toplu silme işlemi yapar
  const copuTamamenBosalt = async () => {
    if (sesler.length === 0) return;

    try {
      const batch = writeBatch(db);
      sesler.forEach((ses) => {
        const sesRef = doc(db, "sesler", ses.id);
        batch.delete(sesRef);
      });

      await batch.commit();
      setSesler([]);
    } catch (error) {
      console.error("Toplu silme hatası:", error);
    }
  };

  if (yukleniyor || !istemciHazir) return null;

  return (
    <div className="w-full min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 flex flex-col justify-start items-center p-8 transition-colors duration-300">
      <div className="w-full max-w-4xl space-y-6">
        <div className="mb-8 border-b border-neutral-200 dark:border-neutral-800 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight">
              <span className="text-neutral-400 dark:text-neutral-500">{"[-]"}</span> Çöp Kutusu
            </h1>
          </div>
          {sesler.length > 0 && (
            <button onClick={copuTamamenBosalt} className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 text-xs font-black rounded-xl shadow-md transition-all active:scale-95">
              Çöpü Boşalt
            </button>
          )}
        </div>

        {sesler.length === 0 ? (
          <div className="text-center p-12 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl text-sm font-bold text-neutral-400">
            Çöp kutusu tamamen boş.
          </div>
        ) : (
          <div className="border border-neutral-200 bg-white rounded-3xl p-6 space-y-4 dark:bg-neutral-900 dark:border-neutral-800">
            <h2 className="text-xs font-black uppercase tracking-widest mb-2 pl-1">
              <span>#</span> Silinen Dosyalar ({sesler.length})
            </h2>
            <div className="space-y-3">
              {sesler.map((ses) => (
                <div key={ses.id} className="border border-neutral-200 bg-neutral-50 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 dark:bg-neutral-950 dark:border-neutral-800">
                  <div>
                    <h3 className="font-bold text-sm tracking-tight break-all">{ses.ad}</h3>
                    <p className="text-[10px] text-neutral-400 font-bold">{ses.tarih} • {ses.sure}</p>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button onClick={() => geriYukle(ses)} className="px-3 py-1.5 text-xs font-black rounded-xl border bg-white border-neutral-200 text-neutral-800 transition-all dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-200">
                      Geri Yükle
                    </button>
                    <button onClick={() => kaliciSil(ses.id)} className="px-3 py-1.5 text-xs font-black rounded-xl bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 hover:opacity-90 transition-all">
                      Kalıcı Sil
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}