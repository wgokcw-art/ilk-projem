"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../../firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";

export default function Gunluk() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [sesler, setSesler] = useState<any[]>([]);
  const [isleniyor, setIsleniyor] = useState<string | null>(null);
  const [analizDurumu, setAnalizDurumu] = useState<string>(" ");
  const [seciliRapor, setSeciliRapor] = useState<any | null>(null);
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

  const buluttanGunlukleriCek = async (aktifKullanici: any) => {
    if (!aktifKullanici) return;

    try {
      const seslerRef = collection(db, "sesler");
      const q = query(
        seslerRef,
        where("userId", "==", aktifKullanici.uid),
        where("bulunduguKlasor", "==", "Gunluk")
      );
      
      const querySnapshot = await getDocs(q);
      const bulutSesleri: any[] = [];
      
      querySnapshot.forEach((docSnap) => {
        bulutSesleri.push({ id: docSnap.id, ...docSnap.data() });
      });

      setSesler(bulutSesleri);
    } catch (error) {
      console.error("Günlük verileri buluttan çekilirken hata oluştu:", error);
    }
  };

  useEffect(() => {
    if (user) {
      buluttanGunlukleriCek(user);
    }
  }, [user]);

  // 🎙️ GERÇEK YAPAY ZEKA DESTEKLİ GÜNLÜK ANALİZİ (GEMINI)
  const sesiGercektenDinle = async (sesNesnesi: any) => {
    if (!istemciHazir) return;
    setIsleniyor(sesNesnesi.id);
    setSeciliRapor(null);
    setAnalizDurumu("Günlük kaydı yapay zeka (Gemini) tarafından duygu süzgecinden geçiriliyor... 🧠");

    try {
      const analizMetni = `Günlük Kaydı Adı: ${sesNesnesi.ad}, Süre: ${sesNesnesi.sure || "Bilinmiyor"}, Kayıt Tarihi: ${sesNesnesi.tarih}`;
      
      // Next.js API Route köprümüze istek atıyoruz
      const apiResponse = await fetch("/api/analiz-et", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          metin: analizMetni,
          klasor: "Gunluk"
        }),
      });

      if (!apiResponse.ok) {
        const hataDetayi = await apiResponse.json();
        throw new Error(hataDetayi.detay || "Yapay zeka analiz isteği başarısız oldu.");
      }

      const veri = await apiResponse.json();

      // Gemini API'den gelen verileri sayfanın özgün değişken yapısıyla eşleştiriyoruz
      setSeciliRapor({
        sesAdi: sesNesnesi.ad,
        sureBilgisi: `Canlı Analiz (${sesNesnesi.sure || "N/A"})`,
        isSessiz: false,
        metin: "Günlük kaydı başarıyla analiz edildi.",
        // Gemini'dan gelen yanıtları sayfa şablonunun beklediği array formatına dönüştürüyoruz
        modAnalizi: Array.isArray(veri.kritikler) ? veri.kritikler : [veri.kritikler || "Duygu analizi yapılamadı."],
        gununOzeti: [veri.ozet || "Günlük özeti çıkarılamadı."],
        anahtarKelimeler: Array.isArray(veri.ekstra) ? veri.ekstra : (veri.ekstra ? [veri.ekstra] : ["Günlük", "Kayıt"])
      });

    } catch (error: any) {
      console.error("Yapay zeka entegrasyon hatası:", error);
      // Hata durumunda orijinal hata şablonunu gösteriyoruz
      setSeciliRapor({
        sesAdi: sesNesnesi.ad,
        sureBilgisi: "Hata",
        isSessiz: true,
        metin: `Yapay zeka analizi sırasında bir bağlantı sorunu oluştu: ${error.message || ""}`,
        modAnalizi: ["Duygu analizi bağlantı hatası nedeniyle yapılamadı."],
        gununOzeti: ["Lütfen API anahtarınızı, internetinizi veya sunucunuzu kontrol edin."],
        anahtarKelimeler: ["Bağlantı_Hatası", "API_Sorunu"]
      });
    } finally {
      setIsleniyor(null);
    }
  };

  const sesSil = async (id: string) => {
    if (!confirm("Bu günlük kaydını çöp kutusuna göndermek istediğinize emin misiniz?")) return;

    try {
      const sesRef = doc(db, "sesler", id);
      await updateDoc(sesRef, {
        bulunduguKlasor: "CopKutusu",
        eskiKlasor: "Gunluk",
        silinmeTarihi: Date.now()
      });

      setSesler((prev) => prev.filter((s) => s.id !== id));
      setSeciliRapor(null);
      alert("Günlük kaydı çöp kutusuna gönderildi.");
    } catch (error) {
      console.error("Çöpe taşıma hatası:", error);
      alert("Dosya çöpe taşınırken bir sorun yaşandı.");
    }
  };

  if (yukleniyor || !istemciHazir) return null;

  return (
    <div className="w-full min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 flex flex-col justify-start items-center p-8 transition-colors duration-300">
      <div className="w-full max-w-6xl space-y-6">
        <div className="mb-8 border-b border-neutral-200 dark:border-neutral-800 pb-5">
          <h1 className="text-2xl font-black tracking-tight"><span className="text-neutral-400 dark:text-neutral-500">{"[-]"}</span> Günlük Klasörü</h1>
        </div>

        {sesler.length === 0 ? (
          <div className="text-center p-12 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl text-sm font-bold text-neutral-400">Bu klasörde henüz bir günlük ses kaydı bulunmuyor.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="border border-neutral-200 bg-white rounded-3xl p-6 lg:col-span-2 space-y-4 dark:bg-neutral-900 dark:border-neutral-800">
              <h2 className="text-xs font-black uppercase tracking-widest mb-2 pl-1"><span>#</span> Günlük Kayıtlarım</h2>
              {sesler.map((ses) => (
                <div key={ses.id} className="border border-neutral-200 bg-neutral-50 rounded-2xl p-4 space-y-4 dark:bg-neutral-950 dark:border-neutral-800">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-sm">{ses.ad}</h3>
                      <p className="text-[10px] text-neutral-400 font-bold mt-0.5">{ses.tarih} • {ses.sure}</p>
                    </div>
                    <button onClick={() => sesSil(ses.id)} className="px-3 py-1.5 text-xs font-bold rounded-xl border bg-white border-neutral-200 hover:bg-neutral-100 text-neutral-700 transition-all active:scale-95 dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-200">Sil</button>
                  </div>
                  <audio controls className="w-full h-8 accent-neutral-950" src={ses.kaynak} />
                  <button onClick={() => sesiGercektenDinle(ses)} className="w-full py-2.5 text-xs font-black rounded-xl text-white bg-neutral-950 hover:bg-neutral-800 transition-all shadow-md active:scale-[0.99] dark:bg-white dark:text-neutral-950">{isleniyor === ses.id ? "⏳ İşleniyor..." : "Sesi Dinle"}</button>
                </div>
              ))}
            </div>

            <div className="border border-neutral-200 bg-white rounded-3xl p-6 lg:col-span-3 space-y-5 dark:bg-neutral-900 dark:border-neutral-800">
              <h2 className="text-xs font-black uppercase tracking-widest mb-4 pl-1"><span>*</span> Yapay Zeka Günlük Analizi</h2>
              {isleniyor !== null && <div className="border border-neutral-200 bg-neutral-50 rounded-2xl p-8 text-center font-black text-xs animate-pulse dark:bg-neutral-950 dark:border-neutral-800">{analizDurumu}</div>}
              {seciliRapor && !isleniyor && (
                <div className="space-y-5">
                  <div className="border-b border-neutral-100 pb-3 flex justify-between items-center dark:border-neutral-800">
                    <h3 className="font-black text-sm">{"="} Günlük Özeti</h3>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full border bg-neutral-100 border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700">{seciliRapor.sureBilgisi}</span>
                  </div>
                  <p className="text-xs font-medium leading-relaxed p-3 rounded-xl border bg-neutral-50 text-neutral-700 border-neutral-100 dark:bg-neutral-950 dark:text-neutral-300 dark:border-neutral-800">{seciliRapor.metin}</p>
                  
                  <div className="border border-neutral-200 bg-neutral-50 rounded-2xl p-4 space-y-2 dark:bg-neutral-950 dark:border-neutral-800">
                    <h4 className="text-[11px] font-black uppercase tracking-wider">🧠 Mod Analizi (Duygu Durumu)</h4>
                    <ul className="space-y-2 text-xs font-bold">{seciliRapor.modAnalizi.map((m: any, i: number) => <li key={i} className="p-2 rounded-lg border bg-white border-neutral-100 text-neutral-700 dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-300">{m}</li>)}</ul>
                  </div>

                  <div className="border border-neutral-200 bg-neutral-50 rounded-2xl p-4 space-y-2 dark:bg-neutral-950 dark:border-neutral-800">
                    <h4 className="text-[11px] font-black uppercase tracking-wider">📝 Günün Özeti</h4>
                    <ul className="space-y-2 text-xs font-bold">{seciliRapor.gununOzeti.map((o: any, i: number) => <li key={i} className="p-2 rounded-lg border bg-white border-neutral-100 text-neutral-700 dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-300">{o}</li>)}</ul>
                  </div>

                  <div className="border border-neutral-200 bg-neutral-50 rounded-2xl p-4 space-y-2 dark:bg-neutral-950 dark:border-neutral-800">
                    <h4 className="text-[11px] font-black uppercase tracking-wider">✨ Anahtar Kelimeler</h4>
                    <div className="flex flex-wrap gap-2 pt-1">{seciliRapor.anahtarKelimeler.map((w: any, i: number) => <span key={i} className="px-3 py-1 border text-xs font-black rounded-xl bg-white border-neutral-200 dark:bg-neutral-900 dark:border-neutral-700">#{w}</span>)}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}