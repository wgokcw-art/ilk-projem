"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../../firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";
import VisualCalendar, { TakvimEtkinlik } from "../../components/VisualCalendar";
import TakvimHatirlaticiModal from "../../components/TakvimHatirlaticiModal";

export default function TakvimSayfasi() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [istemciHazir, setIstemciHazir] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(true);

  const [etkinlikler, setEtkinlikler] = useState<TakvimEtkinlik[]>([]);
  const [seciliTakvimGorev, setSeciliTakvimGorev] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/giris");
      } else {
        setUser(currentUser);
        setIstemciHazir(true);
        tumEtkinlikleriCek(currentUser);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const tumEtkinlikleriCek = async (aktifKullanici: any) => {
    try {
      setYukleniyor(true);
      const toplayici: TakvimEtkinlik[] = [];

      // 1. AI Tarafından Oluşturulan Ses Kaydı Görevleri
      const seslerQuery = query(
        collection(db, "sesler"),
        where("kullaniciId", "==", aktifKullanici.uid)
      );

      const seslerSnap = await getDocs(seslerQuery);
      const bugunStr = new Date().toISOString().split("T")[0];

      seslerSnap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.klasor !== "CopKutusu" && data.rapor && data.rapor.actionItems) {
          data.rapor.actionItems.forEach((g: string, idx: number) => {
            toplayici.push({
              id: `${docSnap.id}-${idx}`,
              baslik: g,
              tarih: bugunStr, // Varsayılan olarak bugüne atanır, seçici ile güncellenebilir
              sesAdi: data.ad || "Ses Kaydı",
              klasor: data.klasor || "AI Analiz"
            });
          });
        }
      });

      // 2. Özel Oluşturulan Hatırlatıcılar
      const hatirlaticiQuery = query(
        collection(db, "hatirlaticilar"),
        where("kullaniciId", "==", aktifKullanici.uid)
      );

      const hatirlaticiSnap = await getDocs(hatirlaticiQuery);
      hatirlaticiSnap.forEach((docSnap) => {
        const data = docSnap.data();
        toplayici.push({
          id: docSnap.id,
          baslik: data.baslik,
          tarih: data.tarih || bugunStr,
          klasor: "Özel Plan"
        });
      });

      setEtkinlikler(toplayici);
    } catch (err) {
      console.error("Takvim verileri çekilirken hata:", err);
    } finally {
      setYukleniyor(false);
    }
  };

  // Yeni Özel Etkinlik Ekleme
  const ozelEtkinlikEkle = async (baslik: string, tarih: string) => {
    if (!user) return;

    try {
      const yeniRef = await addDoc(collection(db, "hatirlaticilar"), {
        kullaniciId: user.uid,
        baslik,
        tarih,
        olusturmaZamani: Date.now()
      });

      const yeniEtkinlik: TakvimEtkinlik = {
        id: yeniRef.id,
        baslik,
        tarih,
        klasor: "Özel Plan"
      };

      setEtkinlikler((prev) => [yeniEtkinlik, ...prev]);
    } catch (err) {
      console.error("Hatırlatıcı kaydetme hatası:", err);
      // Yerel ekle
      const yeniEtkinlik: TakvimEtkinlik = {
        id: Date.now().toString(),
        baslik,
        tarih,
        klasor: "Özel Plan"
      };
      setEtkinlikler((prev) => [yeniEtkinlik, ...prev]);
    }
  };

  // Etkinlik Silme
  const etkinlikSil = async (id: string) => {
    try {
      // Eğer id tire içeriyorsa ses kaydı AI görevidir, yoksa Firestore hatirlaticisidir
      if (!id.includes("-")) {
        await deleteDoc(doc(db, "hatirlaticilar", id));
      }
    } catch (err) {
      console.error("Hatırlatıcı silinirken hata:", err);
    }
    // Anında ekrandan ve takvim rozetlerinden kaldır
    setEtkinlikler((prev) => prev.filter((item) => item.id !== id));
  };

  if (yukleniyor || !istemciHazir) return null;

  return (
    <div className="w-full min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 flex flex-col justify-start items-center p-4 sm:p-6 md:p-8 transition-colors duration-300">
      <div className="w-full max-w-4xl space-y-6">
        
        {/* Üst Başlık */}
        <div className="border-b border-neutral-200 dark:border-neutral-800 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2 text-neutral-900 dark:text-white">
              <svg className="w-7 h-7 text-neutral-800 dark:text-neutral-200" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
              </svg>
              İnteraktif Uygulama İçi Takvim
            </h1>
            <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
              Uygulama içi görsel aylık takviminiz üzerinde planlarınızı görün, yeni hatırlatıcı ekleyin ve Google Takvim'e aktarın.
            </p>
          </div>
        </div>

        {/* 🗓️ TAM BOYUTLU GÖRSEL AYLIK TAKVİM VE AJANDA WİDGET'I */}
        <VisualCalendar
          etkinlikler={etkinlikler}
          onEtkinlikEkle={ozelEtkinlikEkle}
          onTakvimeAktar={(etkinlik) => setSeciliTakvimGorev(etkinlik.baslik)}
          onEtkinlikSil={etkinlikSil}
        />

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
