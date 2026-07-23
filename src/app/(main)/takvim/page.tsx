"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../../firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import TakvimHatirlaticiModal from "../../components/TakvimHatirlaticiModal";

export default function TakvimSayfasi() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [istemciHazir, setIstemciHazir] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(true);

  const [tumGorevler, setTumGorevler] = useState<Array<{ id: string; gorev: string; sesAdi: string; klasor: string; tarih: string }>>([]);
  const [seciliTakvimGorev, setSeciliTakvimGorev] = useState<string | null>(null);
  const [ozelGorevInput, setOzelGorevInput] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/giris");
      } else {
        setUser(currentUser);
        setIstemciHazir(true);
        tumSeslerdenGorevleriCek(currentUser);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const tumSeslerdenGorevleriCek = async (aktifKullanici: any) => {
    try {
      setYukleniyor(true);
      const q = query(
        collection(db, "sesler"),
        where("kullaniciId", "==", aktifKullanici.uid)
      );

      const querySnapshot = await getDocs(q);
      const toplayici: Array<{ id: string; gorev: string; sesAdi: string; klasor: string; tarih: string }> = [];

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.klasor !== "CopKutusu" && data.rapor && data.rapor.actionItems) {
          data.rapor.actionItems.forEach((g: string, idx: number) => {
            toplayici.push({
              id: `${docSnap.id}-${idx}`,
              gorev: g,
              sesAdi: data.ad || "Ses Kaydı",
              klasor: data.klasor || "Genel",
              tarih: data.tarih || "Bugün"
            });
          });
        }
      });

      setTumGorevler(toplayici);
    } catch (err) {
      console.error("Takvim görevleri çekilirken hata:", err);
    } finally {
      setYukleniyor(false);
    }
  };

  const ozelGorevEkle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ozelGorevInput.trim()) return;
    setSeciliTakvimGorev(ozelGorevInput.trim());
    setOzelGorevInput("");
  };

  if (yukleniyor || !istemciHazir) return null;

  return (
    <div className="w-full min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 flex flex-col justify-start items-center p-4 sm:p-6 md:p-8 transition-colors duration-300">
      <div className="w-full max-w-4xl space-y-6">
        
        {/* Üst Başlık */}
        <div className="mb-6 border-b border-neutral-200 dark:border-neutral-800 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2 text-neutral-900 dark:text-white">
              <svg className="w-7 h-7 text-neutral-800 dark:text-neutral-200" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
              </svg>
              Takvim & Hatırlatıcılar
            </h1>
            <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
              Yapay zeka tarafından çıkarılan ve özel eklenen tüm yapılacak işlerinizi Google veya Outlook takviminize aktarın.
            </p>
          </div>
        </div>

        {/* Hızlı Özel Görev Ekleme Kutusu */}
        <form onSubmit={ozelGorevEkle} className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-sm flex flex-col sm:flex-row items-center gap-3">
          <input
            type="text"
            placeholder="Özel bir takvim görevi veya hatırlatıcı yazın..."
            value={ozelGorevInput}
            onChange={(e) => setOzelGorevInput(e.target.value)}
            className="w-full px-4 py-2.5 text-xs font-bold bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700 rounded-2xl focus:outline-none placeholder-neutral-400"
          />
          <button
            type="submit"
            disabled={!ozelGorevInput.trim()}
            className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 text-xs font-black hover:opacity-90 active:scale-95 transition-all shadow-md disabled:opacity-50 whitespace-nowrap flex items-center justify-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>Takvime Ekle</span>
          </button>
        </form>

        {/* Görevler Listesi */}
        <div className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-widest pl-1 text-neutral-400">
            Yapay Zeka Analiz Görevleri ({tumGorevler.length})
          </h2>

          {tumGorevler.length === 0 ? (
            <div className="text-center p-12 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl text-xs font-bold text-neutral-400 bg-white dark:bg-neutral-900">
              Henüz takvime aktarılacak bir görev bulunmuyor. Ses kayıtlarınızı analiz ettikten sonra görevler otomatik olarak buraya gelecektir.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {tumGorevler.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-3xl border bg-white border-neutral-200 dark:bg-neutral-900 dark:border-neutral-800 flex flex-col justify-between gap-3 shadow-xs hover:border-neutral-300 transition-all"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-[9px] font-black uppercase text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                        {item.klasor}
                      </span>
                      <span className="text-[10px] font-bold text-neutral-400">{item.tarih}</span>
                    </div>
                    <p className="text-xs font-bold text-neutral-900 dark:text-white leading-snug">
                      {item.gorev}
                    </p>
                    <p className="text-[10px] font-semibold text-neutral-400 italic">
                      Kaynak: {item.sesAdi}
                    </p>
                  </div>

                  <button
                    onClick={() => setSeciliTakvimGorev(item.gorev)}
                    className="w-full py-2 px-3 rounded-xl bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 text-xs font-black hover:opacity-90 active:scale-95 transition-all shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                    </svg>
                    <span>Takvim & Hatırlatıcı Ayarla</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* 📅 TAKVİM & HATIRLATICI MODALI */}
      {seciliTakvimGorev && (
        <TakvimHatirlaticiModal
          gorevBasligi={seciliTakvimGorev}
          onClose={() => setSeciliTakvimGorev(null)}
        />
      )}
    </div>
  );
}
