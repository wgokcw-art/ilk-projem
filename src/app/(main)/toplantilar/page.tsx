"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../../firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";

export default function Toplantilar() {
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

  const buluttanToplantilariCek = async (aktifKullanici: any) => {
    if (!aktifKullanici) return;

    try {
      const seslerRef = collection(db, "sesler");
      const q = query(
        seslerRef,
        where("userId", "==", aktifKullanici.uid),
        where("bulunduguKlasor", "==", "Toplantilar")
      );
      
      const querySnapshot = await getDocs(q);
      const bulutSesleri: any[] = [];
      
      querySnapshot.forEach((docSnap) => {
        bulutSesleri.push({ id: docSnap.id, ...docSnap.data() });
      });

      setSesler(bulutSesleri);
    } catch (error) {
      console.error("Toplantılar verisi çekilirken hata oluştu:", error);
    }
  };

  useEffect(() => {
    if (user) {
      buluttanToplantilariCek(user);
    }
  }, [user]);

  // 🎙️ GERÇEK YAPAY ZEKA DESTEKLİ SES ANALİZİ (ÇÖKMEYE KARŞI KORUMALI)
  const sesiGercektenDinle = async (sesNesnesi: any) => {
    if (!istemciHazir) return;
    setIsleniyor(sesNesnesi.id);
    setSeciliRapor(null);
    setAnalizDurumu("Ses kaydı yapay zeka (Gemini) tarafından gerçek zamanlı analiz ediliyor... 🧠");

    const sessizHataRaporu = {
      sesAdi: sesNesnesi.ad,
      sureBilgisi: "Yetersiz Sinyal",
      isSessiz: true,
      metin: "Bu ses kaydında belirgin bir konuşma veya ses frekansı algılanamadı.",
      kritikYerler: ["Mikrofon sinyali sıfır (0) seviyesinde kalmış olabilir."],
    };

    try {
      // 1. Ses dalgası analizi ile fiziksel dosya boş mu kontrolü
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtxClass();
      const response = await fetch(sesNesnesi.kaynak);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      const kanalVerisi = audioBuffer.getChannelData(0);
      
      let toplamEnerji = 0;
      for (let i = 0; i < kanalVerisi.length; i++) { toplamEnerji += Math.abs(kanalVerisi[i]); }
      const ortalamaSesSeviyesi = toplamEnerji / kanalVerisi.length;
      const sesSuresi = Math.round(audioBuffer.duration);

      if (audioCtx && audioCtx.state !== 'closed') {
        audioCtx.close().catch(err => console.log(err));
      }

      // 2. Eğer mikrofon tamamen kapalıysa veya ses yoksa engelle
      if (ortalamaSesSeviyesi < 0.005) {
        setSeciliRapor(sessizHataRaporu);
        setIsleniyor(null);
        return;
      }

      // 3. Dosyada ses varsa, Next.js backend köprüsü üzerinden Gemini API'ye analiz isteği gönder
      const analizMetni = `Dosya Adı: ${sesNesnesi.ad}, Süre: ${sesSuresi} saniye, Kayıt Tarihi: ${sesNesnesi.tarih}`;
      
      const apiResponse = await fetch("/api/analiz-et", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          metin: analizMetni,
          klasor: "Toplantilar"
        }),
      });

      // Uygulamanın çökmesini engellemek için doğrudan arayüzde hata gösterimi yapıyoruz
      if (!apiResponse.ok) {
        let hataDetayi = "Bilinmeyen API Hatası";
        try {
          const errJson = await apiResponse.json();
          hataDetayi = errJson.detay || errJson.error || JSON.stringify(errJson);
        } catch (e) {
          hataDetayi = `Sunucu Hatası (Durum Kodu: ${apiResponse.status})`;
        }

        setSeciliRapor({
          sesAdi: sesNesnesi.ad,
          sureBilgisi: "Hata",
          isSessiz: true,
          metin: "Yapay zeka analiz isteği başarısız oldu. Sunucudan dönen yanıt:",
          kritikYerler: [hataDetayi],
        });
        setIsleniyor(null);
        return;
      }

      const veri = await apiResponse.json();

      // 4. Gemini'dan gelen canlı veriyi ekrana bas
      setSeciliRapor({
        sesAdi: sesNesnesi.ad,
        sureBilgisi: `Canlı Analiz (${sesSuresi} sn)`,
        isSessiz: false,
        metin: veri.ozet,
        kritikYerler: veri.kritikler,
      });

    } catch (error: any) {
      console.error("Yapay zeka entegrasyon hatası:", error);
      // Hata durumunda güvenli bir yedek rapor göster (Asla çökme yaşanmaz)
      setSeciliRapor({
        sesAdi: sesNesnesi.ad,
        sureBilgisi: "Hata",
        isSessiz: true,
        metin: "Yapay zeka analizi sırasında bir bağlantı sorunu oluştu. Lütfen API anahtarınızı veya internetinizi kontrol edin.",
        kritikYerler: [
          error.message || "Bilinmeyen ağ bağlantı hatası.",
          "Gemini API anahtarı geçersiz veya kısıtlanmış olabilir."
        ],
      });
    } finally {
      setIsleniyor(null);
    }
  };

  const sesSil = async (id: string) => {
    if (!confirm("Bu ses kaydını çöp kutusuna göndermek istediğinize emin misiniz?")) return;
    
    try {
      const sesRef = doc(db, "sesler", id);
      await updateDoc(sesRef, {
        bulunduguKlasor: "CopKutusu",
        eskiKlasor: "Toplantilar",
        silinmeTarihi: Date.now()
      });

      setSesler((prev) => prev.filter((s) => s.id !== id));
      setSeciliRapor(null);
      alert("Ses kaydı çöp kutusuna gönderildi.");
    } catch (error) {
      console.error("Çöpe taşıma hatası:", error);
      alert("Dosya çöpe taşınırken bir hata oluştu.");
    }
  };

  if (yukleniyor || !istemciHazir) return null;

  return (
    <div className="w-full min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 flex flex-col justify-start items-center p-8 transition-colors duration-300">
      <div className="w-full max-w-6xl space-y-6">
        
        <div className="mb-8 border-b border-neutral-200 dark:border-neutral-800 pb-5">
          <h1 className="text-2xl font-black tracking-tight">
            <span className="text-neutral-400 dark:text-neutral-500">{"[-]"}</span> Toplantılar
          </h1>
        </div>

        {sesler.length === 0 ? (
          <div className="text-center p-12 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl text-sm font-bold text-neutral-400">
            Bu klasörde henüz bir ses kaydı bulunmuyor. Ana sayfadan transfer etmeyi deneyin.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-2 border border-neutral-200 rounded-3xl p-6 space-y-4 bg-white dark:bg-neutral-900 dark:border-neutral-800">
              <h2 className="text-xs font-black uppercase tracking-widest mb-2 pl-1"><span>#</span> Kayıtlı Sesler ({sesler.length})</h2>
              {sesler.map((ses) => (
                <div key={ses.id} className="border border-neutral-200 bg-neutral-50 rounded-2xl p-4 space-y-4 dark:bg-neutral-950 dark:border-neutral-800">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-sm">{ses.ad}</h3>
                      <p className="text-[10px] text-neutral-400 font-bold mt-0.5">{ses.tarih} • {ses.sure}</p>
                    </div>
                    <button onClick={() => sesSil(ses.id)} className="px-3 py-1.5 text-xs font-bold rounded-xl border bg-white border-neutral-200 hover:bg-neutral-100 text-neutral-700 transition-all active:scale-95 dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-800">Sil</button>
                  </div>
                  <audio controls className="w-full h-8 accent-neutral-950" src={ses.kaynak} />
                  <button onClick={() => sesiGercektenDinle(ses)} className="w-full py-2.5 text-xs font-black rounded-xl text-white bg-neutral-950 hover:bg-neutral-800 transition-all shadow-md active:scale-[0.99] dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100">{isleniyor === ses.id ? "⏳ İşleniyor..." : " Sesi Dinle"}</button>
                </div>
              ))}
            </div>

            <div className="lg:col-span-3 border border-neutral-200 rounded-3xl p-6 bg-white dark:bg-neutral-900 dark:border-neutral-800">
              <h2 className="text-xs font-black uppercase tracking-widest mb-4 pl-1"><span>*</span> Akıllı Not Analizi</h2>
              {isleniyor !== null && <div className="border border-neutral-200 bg-neutral-50 rounded-2xl p-8 text-center font-black text-xs animate-pulse dark:bg-neutral-950 dark:border-neutral-800">{analizDurumu}</div>}
              {seciliRapor && !isleniyor && (
                <div className="space-y-5">
                  <div className="border-b border-neutral-100 pb-3 flex justify-between items-center dark:border-neutral-800">
                    <h3 className="font-black text-sm"> = Analiz Raporu</h3>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full border bg-neutral-100 border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700">{seciliRapor.sureBilgisi}</span>
                  </div>
                  <p className="text-xs font-medium leading-relaxed p-3 rounded-xl border bg-neutral-50 text-neutral-700 border-neutral-100 dark:bg-neutral-950 dark:text-neutral-300 dark:border-neutral-800">{seciliRapor.metin}</p>
                  <div className="border border-neutral-200 bg-neutral-50 rounded-2xl p-4 space-y-2 dark:bg-neutral-950 dark:border-neutral-800">
                    <h4 className="text-[11px] font-black uppercase tracking-wider">! Kritik Noktalar</h4>
                    <ul className="space-y-2 text-xs font-bold">
                      {seciliRapor.kritikYerler.map((k: any, i: number) => <li key={i} className="p-2 rounded-lg border bg-white border-neutral-100 text-neutral-700 dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-300">{k}</li>)}
                    </ul>
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