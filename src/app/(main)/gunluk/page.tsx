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
  const [seciliSes, setSeciliSes] = useState<any | null>(null);

  const [istemciHazir, setIstemciHazir] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(true);

  // 💬 AI Chatbot State'leri
  const [chatSoru, setChatSoru] = useState("");
  const [chatMesajlari, setChatMesajlari] = useState<{ rolu: "user" | "ai"; metin: string }[]>([]);
  const [chatYukleniyor, setChatYukleniyor] = useState(false);

  // ✅ Yapılacaklar (Action Items) Checkbox State'i
  const [tamamlananGorevler, setTamamlananGorevler] = useState<{ [key: string]: boolean }>({});

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

  // 🎙️ GERÇEK YAPAY ZEKA DESTEKLİ GÜNLÜK ANALİZİ (GEMINI 2.5)
  const sesiGercektenDinle = async (sesNesnesi: any) => {
    if (!istemciHazir) return;
    setIsleniyor(sesNesnesi.id);
    setSeciliSes(sesNesnesi);
    setSeciliRapor(null);
    setChatMesajlari([]);
    setTamamlananGorevler({});
    setAnalizDurumu("Günlük kaydı yapay zeka (Gemini 2.5) tarafından duygu süzgecinden geçiriliyor... 🧠");

    try {
      const apiResponse = await fetch("/api/analiz-et", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sesUrl: sesNesnesi.kaynak,
          klasor: "Gunluk"
        }),
      });

      if (!apiResponse.ok) {
        const hataDetayi = await apiResponse.json();
        throw new Error(hataDetayi.detay || "Yapay zeka analiz isteği başarısız oldu.");
      }

      const veri = await apiResponse.json();

      setSeciliRapor({
        sesAdi: sesNesnesi.ad,
        sureBilgisi: `Tamamlandı (${sesNesnesi.sure || "Hazır Dosya"})`,
        isSessiz: false,
        metin: veri.ozet || "Günlük kaydı başarıyla analiz edildi.",
        modAnalizi: Array.isArray(veri.kritikler) ? veri.kritikler : (veri.kritikYerler || []),
        gununOzeti: [veri.ozet],
        anahtarKelimeler: Array.isArray(veri.ekstra) ? veri.ekstra : (veri.ekstra ? [veri.ekstra] : ["Günlük", "Duygu"]),
        actionItems: veri.actionItems || [],
        speakers: veri.speakers || [],
        sentiment: veri.sentiment || "Huzurlu / Düşünceli",
        tone: veri.tone || "Kişisel ve Samimi"
      });

    } catch (error: any) {
      console.error("Yapay zeka entegrasyon hatası:", error);
      setSeciliRapor({
        sesAdi: sesNesnesi.ad,
        sureBilgisi: "Hata",
        isSessiz: true,
        metin: `Yapay zeka analizi sırasında sorun oluştu: ${error.message || ""}`,
        modAnalizi: ["Bağlantı hatası yaşandı."],
        gununOzeti: ["Lütfen internet bağlantınızı kontrol edin."],
        anahtarKelimeler: ["Ağ_Hatası"],
        actionItems: [],
        speakers: [],
        sentiment: "Hata",
        tone: "Hata"
      });
    } finally {
      setIsleniyor(null);
    }
  };

  // 💬 AI Chatbot İle Soru Sor
  const aiSohbetGonder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatSoru.trim() || chatYukleniyor || !seciliRapor) return;

    const soruMetni = chatSoru.trim();
    setChatSoru("");
    setChatMesajlari((prev) => [...prev, { rolu: "user", metin: soruMetni }]);
    setChatYukleniyor(true);

    try {
      const response = await fetch("/api/analiz-et", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "chat",
          soru: soruMetni,
          klasor: "Gunluk",
          ozet: seciliRapor.metin,
          transkript: seciliRapor.modAnalizi?.join("\n") || ""
        })
      });

      const data = await response.json();
      setChatMesajlari((prev) => [...prev, { rolu: "ai", metin: data.cevap || "Yanıt alınamadı." }]);
    } catch (err: any) {
      setChatMesajlari((prev) => [...prev, { rolu: "ai", metin: "Sorunuza yanıt verilirken hata oluştu." }]);
    } finally {
      setChatYukleniyor(false);
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
    <div className="w-full min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 flex flex-col justify-start items-center p-4 sm:p-6 md:p-8 transition-colors duration-300">
      <div className="w-full max-w-6xl space-y-6">
        
        <div className="mb-6 border-b border-neutral-200 dark:border-neutral-800 pb-4">
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <span className="text-neutral-400 dark:text-neutral-500">{"[-]"}</span> Günlük Klasörü
          </h1>
        </div>

        {sesler.length === 0 ? (
          <div className="text-center p-12 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl text-sm font-bold text-neutral-400">
            Bu klasörde henüz bir günlük ses kaydı bulunmuyor. Ana sayfadan transfer edin.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 sm:gap-8">
            
            {/* GÜNLÜK KAYITLARI LİSTESİ */}
            <div className="border border-neutral-200 bg-white rounded-3xl p-5 sm:p-6 lg:col-span-2 space-y-4 dark:bg-neutral-900 dark:border-neutral-800">
              <h2 className="text-xs font-black uppercase tracking-widest mb-2 pl-1">
                <span>#</span> Günlük Kayıtlarım ({sesler.length})
              </h2>
              {sesler.map((ses) => (
                <div key={ses.id} className="border border-neutral-200 bg-neutral-50 rounded-2xl p-4 space-y-3 dark:bg-neutral-950 dark:border-neutral-800">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-xs sm:text-sm">{ses.ad}</h3>
                      <p className="text-[10px] text-neutral-400 font-bold mt-0.5">{ses.tarih} • {ses.sure}</p>
                    </div>
                    <button onClick={() => sesSil(ses.id)} className="px-3 py-1 text-xs font-bold rounded-xl border bg-white border-neutral-200 hover:bg-red-50 hover:text-red-600 transition-all dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-200">Sil</button>
                  </div>
                  <audio controls className="w-full h-8 accent-neutral-950" src={ses.kaynak} />
                  <button 
                    onClick={() => sesiGercektenDinle(ses)} 
                    className="w-full py-2.5 text-xs font-black rounded-xl text-white bg-neutral-950 hover:bg-neutral-800 transition-all shadow-md active:scale-[0.99] dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100 flex items-center justify-center gap-1.5"
                  >
                    <span>📓</span>
                    <span>{isleniyor === ses.id ? "Analiz Ediliyor..." : "Günlüğü Analiz Et"}</span>
                  </button>
                </div>
              ))}
            </div>

            {/* GÜNLÜK AI RAPORU */}
            <div className="border border-neutral-200 bg-white rounded-3xl p-5 sm:p-6 lg:col-span-3 space-y-5 dark:bg-neutral-900 dark:border-neutral-800">
              <h2 className="text-xs font-black uppercase tracking-widest mb-4 pl-1">
                <span>*</span> Yapay Zeka Duygu & Günlük Analizi
              </h2>

              {isleniyor !== null && (
                <div className="border border-neutral-200 bg-neutral-50 rounded-2xl p-8 text-center font-black text-xs animate-pulse dark:bg-neutral-950 dark:border-neutral-800">
                  {analizDurumu}
                </div>
              )}

              {seciliRapor && !isleniyor && (
                <div className="space-y-6">
                  
                  {/* Başlık & Duygu/Ton Rozetleri */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-3">
                    <h3 className="font-black text-sm text-neutral-900 dark:text-white">
                      📖 {seciliRapor.sesAdi}
                    </h3>

                    {/* 🎭 4. DUYGU VE TON ANALİZ ROZETİ */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-300 text-[10px] font-black">
                        🎭 {seciliRapor.sentiment}
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-[10px] font-black">
                        💬 {seciliRapor.tone}
                      </span>
                    </div>
                  </div>

                  {/* Özet */}
                  <p className="text-xs font-medium leading-relaxed p-3.5 rounded-2xl bg-neutral-50 text-neutral-800 border border-neutral-100 dark:bg-neutral-950 dark:text-neutral-200 dark:border-neutral-800">
                    {seciliRapor.metin}
                  </p>
                  
                  {/* Mod Analizi */}
                  {seciliRapor.modAnalizi && seciliRapor.modAnalizi.length > 0 && (
                    <div className="border border-neutral-200 bg-neutral-50 rounded-2xl p-4 space-y-2 dark:bg-neutral-950 dark:border-neutral-800">
                      <h4 className="text-[11px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">🧠 Ruh Hali & Mod İncelemesi</h4>
                      <ul className="space-y-2 text-xs font-bold">
                        {seciliRapor.modAnalizi.map((m: any, i: number) => (
                          <li key={i} className="p-2.5 rounded-xl border bg-white border-neutral-200 text-neutral-800 dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-200">
                            {m}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* ✅ 2. KİŞİSEL PLANLAR & HEDEFLER (TO-DO) */}
                  {seciliRapor.actionItems && seciliRapor.actionItems.length > 0 && (
                    <div className="border border-neutral-200 bg-neutral-50 rounded-2xl p-4 space-y-3 dark:bg-neutral-950 dark:border-neutral-800">
                      <h4 className="text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                        <span>✅</span> Kişisel Planlar & Yapılacak Hedefler
                      </h4>
                      <div className="space-y-2">
                        {seciliRapor.actionItems.map((gorev: string, idx: number) => {
                          const isChecked = !!tamamlananGorevler[idx];
                          return (
                            <label 
                              key={idx} 
                              className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                                isChecked 
                                  ? "bg-emerald-50 border-emerald-200 text-emerald-800 line-through dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-300 opacity-60" 
                                  : "bg-white border-neutral-200 text-neutral-800 dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-200"
                              }`}
                            >
                              <input 
                                type="checkbox" 
                                checked={isChecked} 
                                onChange={() => setTamamlananGorevler(p => ({ ...p, [idx]: !p[idx] }))}
                                className="mt-0.5 accent-emerald-600 rounded cursor-pointer"
                              />
                              <span className="text-xs font-bold leading-tight">{gorev}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Anahtar Kelimeler */}
                  {seciliRapor.anahtarKelimeler && seciliRapor.anahtarKelimeler.length > 0 && (
                    <div className="border border-neutral-200 bg-neutral-50 rounded-2xl p-4 space-y-2 dark:bg-neutral-950 dark:border-neutral-800">
                      <h4 className="text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">✨ Önemli Kavramlar</h4>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {seciliRapor.anahtarKelimeler.map((w: any, i: number) => (
                          <span key={i} className="px-3 py-1 border text-xs font-black rounded-xl bg-white border-neutral-200 dark:bg-neutral-900 dark:border-neutral-700">
                            #{w}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 💬 1. GÜNLÜK HAKKINDA AI SOHBET ROBOTU (AI CHATBOT) */}
                  <div className="border border-indigo-200 bg-indigo-50/50 rounded-2xl p-4 space-y-3 dark:bg-indigo-950/20 dark:border-indigo-900/60">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                        <span>💬</span> Günlük Hakkında AI'ya Soru Sor
                      </h4>
                      <span className="text-[9px] font-extrabold text-indigo-500">Gemini Personal AI</span>
                    </div>

                    {/* Chat Geçmişi */}
                    {chatMesajlari.length > 0 && (
                      <div className="space-y-2 max-h-48 overflow-y-auto p-2 bg-white dark:bg-neutral-900 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                        {chatMesajlari.map((msg, i) => (
                          <div key={i} className={`p-2.5 rounded-xl text-xs font-medium ${
                            msg.rolu === "user" 
                              ? "bg-neutral-950 text-white ml-6 dark:bg-white dark:text-neutral-950" 
                              : "bg-indigo-50 text-indigo-950 border border-indigo-100 mr-6 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700"
                          }`}>
                            <span className="font-black text-[10px] block opacity-70 mb-0.5">
                              {msg.rolu === "user" ? "Siz" : "📓 Günlük AI Danışmanı"}
                            </span>
                            {msg.metin}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Soru Sorma Formu */}
                    <form onSubmit={aiSohbetGonder} className="flex items-center gap-2">
                      <input 
                        type="text" 
                        placeholder="Bu günlüğünüz hakkında bir tavsiye veya soru sorun..." 
                        value={chatSoru} 
                        onChange={(e) => setChatSoru(e.target.value)} 
                        className="w-full px-3.5 py-2.5 text-xs font-bold bg-white border border-indigo-200 rounded-xl focus:outline-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-white"
                      />
                      <button 
                        type="submit" 
                        disabled={chatYukleniyor || !chatSoru.trim()} 
                        className="px-4 py-2.5 bg-indigo-600 text-white font-black text-xs rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 whitespace-nowrap cursor-pointer"
                      >
                        {chatYukleniyor ? "Soruluyor..." : "Sor"}
                      </button>
                    </form>
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