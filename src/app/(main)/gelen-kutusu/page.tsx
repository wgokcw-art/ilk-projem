"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../../firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";

export default function GelenKutusu() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [sesler, setSesler] = useState<any[]>([]);
  const [istemciHazir, setIstemciHazir] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(true);

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

  const buluttanTumSesleriCek = async (aktifKullanici: any) => {
    if (!aktifKullanici) return;

    try {
      const seslerRef = collection(db, "sesler");
      const q = query(seslerRef, where("userId", "==", aktifKullanici.uid));
      
      const querySnapshot = await getDocs(q);
      const bulutSesleri: any[] = [];
      
      querySnapshot.forEach((docSnap) => {
        const veri = docSnap.data();
        // Sadece "CopKutusu" dışındaki sesleri Gelen Kutusu'nda gösteriyoruz
        if (veri.bulunduguKlasor !== "CopKutusu") {
          bulutSesleri.push({ id: docSnap.id, ...veri });
        }
      });

      setSesler(bulutSesleri);
    } catch (error) {
      console.error("Gelen kutusu verileri buluttan çekilirken hata oluştu:", error);
    }
  };

  useEffect(() => {
    if (user) {
      buluttanTumSesleriCek(user);
    }
  }, [user]);

  const sesSil = async (ses: any) => {
    if (!confirm("Bu ses kaydını çöp kutusuna göndermek istediğinize emin misiniz?")) return;

    try {
      const sesRef = doc(db, "sesler", ses.id);
      await updateDoc(sesRef, {
        bulunduguKlasor: "CopKutusu",
        eskiKlasor: ses.bulunduguKlasor || "Toplantilar",
        silinmeTarihi: Date.now()
      });

      setSesler((prev) => prev.filter((s) => s.id !== ses.id));
      alert("Ses kaydı çöp kutusuna gönderildi.");
    } catch (error) {
      console.error("Çöpe taşıma hatası:", error);
      alert("Dosya çöpe taşınırken bir sorun yaşandı.");
    }
  };

  if (yukleniyor || !istemciHazir) return null;

  return (
    <div className="w-full min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 flex flex-col justify-start items-center p-8 transition-colors duration-300">
      <div className="w-full max-w-4xl space-y-6">
        <div className="mb-8 border-b border-neutral-200 dark:border-neutral-800 pb-5">
          <h1 className="text-2xl font-black tracking-tight">
            <span className="text-neutral-400 dark:text-neutral-500">{"[-]"}</span> Gelen Kutusu
          </h1>
        </div>

        {sesler.length === 0 ? (
          <div className="text-center p-12 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl text-sm font-bold text-neutral-400">
            Gelen kutunuzda henüz bir ses kaydı bulunmuyor.
          </div>
        ) : (
          <div className="border border-neutral-200 bg-white rounded-3xl p-6 space-y-4 dark:bg-neutral-900 dark:border-neutral-800">
            <h2 className="text-xs font-black uppercase tracking-widest mb-2 pl-1">
              <span>#</span> Tüm Yedek Kayıtlar ({sesler.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sesler.map((ses) => (
                <div key={ses.id} className="border border-neutral-200 bg-neutral-50 rounded-2xl p-4 flex flex-col justify-between gap-4 dark:bg-neutral-950 dark:border-neutral-800">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-sm break-all">{ses.ad}</h3>
                      <p className="text-[10px] text-neutral-400 font-bold mt-1">{ses.tarih} • {ses.sure}</p>
                    </div>
                    <button onClick={() => sesSil(ses)} className="px-2.5 py-1 text-xs font-bold rounded-xl border bg-white border-neutral-200 hover:bg-neutral-100 text-neutral-700 transition-all active:scale-95 dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-200">
                      Sil
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-dashed border-neutral-200 dark:border-neutral-800">
                    <audio controls className="w-2/3 h-8 accent-neutral-950" src={ses.kaynak} />
                    <span className="text-[9px] font-black px-2 py-0.5 border rounded-full bg-neutral-100 text-neutral-800 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700">
                      {ses.bulunduguKlasor || "Gelen Kutusu"}
                    </span>
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