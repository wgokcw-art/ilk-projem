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
  const [seciliSes, setSeciliSes] = useState<any | null>(null);

  const [istemciHazir, setIstemciHazir] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(true);

  // 💬 AI Chatbot State'leri
  const [chatAcik, setChatAcik] = useState(false);
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

  // 🎙️ GERÇEK YAPAY ZEKA DESTEKLİ İLERİ DÜZEY SES ANALİZİ
  const sesiGercektenDinle = async (sesNesnesi: any) => {
    if (!istemciHazir) return;
    setIsleniyor(sesNesnesi.id);
    setSeciliSes(sesNesnesi);
    setSeciliRapor(null);
    setChatMesajlari([]);
    setTamamlananGorevler({});
    setAnalizDurumu("Ses kaydı yapay zeka (Gemini 2.5) tarafından multimodal analiz ediliyor... 🧠");

    const sessizHataRaporu = {
      sesAdi: sesNesnesi.ad,
      sureBilgisi: "Yetersiz Sinyal",
      isSessiz: true,
      metin: "Bu ses kaydında belirgin bir konuşma veya ses frekansı algılanamadı.",
      kritikYerler: ["Mikrofon sinyali sıfır (0) seviyesinde kalmış olabilir."],
      actionItems: [],
      speakers: [],
      sentiment: "Nötr",
      tone: "Sessiz"
    };

    try {
      const apiResponse = await fetch("/api/analiz-et", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sesUrl: sesNesnesi.kaynak,
          klasor: "Toplantilar"
        }),
      });

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
          metin: "Yapay zeka analiz isteği başarısız oldu:",
          kritikYerler: [hataDetayi],
          actionItems: [],
          speakers: [],
          sentiment: "Bilinmiyor",
          tone: "Tanımlanamadı"
        });
        setIsleniyor(null);
        return;
      }

      const veri = await apiResponse.json();

      setSeciliRapor({
        sesAdi: sesNesnesi.ad,
        sureBilgisi: `Tamamlandı (${sesNesnesi.sure || "Hazır Dosya"})`,
        isSessiz: false,
        metin: veri.ozet,
        kritikYerler: veri.kritikler || veri.kritikYerler || [],
        actionItems: veri.actionItems || [],
        speakers: veri.speakers || [],
        sentiment: veri.sentiment || "Olumlu / Profesyonel",
        tone: veri.tone || "Yapıcı ve Kararlı"
      });

    } catch (error: any) {
      console.error("Yapay zeka entegrasyon hatası:", error);
      setSeciliRapor({
        sesAdi: sesNesnesi.ad,
        sureBilgisi: "Hata",
        isSessiz: true,
        metin: "Yapay zeka analizi sırasında bir bağlantı sorunu oluştu.",
        kritikYerler: [error.message || "Ağ bağlantı hatası."],
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
          klasor: "Toplantilar",
          ozet: seciliRapor.metin,
          transkript: seciliRapor.kritikYerler?.join("\n") || ""
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
    <div className="w-full min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 flex flex-col justify-start items-center p-4 sm:p-6 md:p-8 transition-colors duration-300">
      <div className="w-full max-w-6xl space-y-6">
        
        <div className="mb-6 border-b border-neutral-200 dark:border-neutral-800 pb-4">
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <span className="text-neutral-400 dark:text-neutral-500">{"[-]"}</span> Toplantılar
          </h1>
        </div>

        {sesler.length === 0 ? (
          <div className="text-center p-12 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl text-sm font-bold text-neutral-400">
            Bu klasörde henüz bir ses kaydı bulunmuyor. Ana sayfadan transfer etmeyi deneyin.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 sm:gap-8">
            
            {/* KAYITLI SESLER LİSTESİ */}
            <div className="lg:col-span-2 border border-neutral-200 rounded-3xl p-5 sm:p-6 space-y-4 bg-white dark:bg-neutral-900 dark:border-neutral-800">
              <h2 className="text-xs font-black uppercase tracking-widest mb-2 pl-1">
                <span>#</span> Kayıtlı Toplantı Sesleri ({sesler.length})
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
                    <span>🧠</span>
                    <span>{isleniyor === ses.id ? "Analiz Ediliyor..." : "AI İle Analiz Et"}</span>
                  </button>
                </div>
              ))}
            </div>

            {/* İLERİ DÜZEY AI ANALİZ RAPORU */}
            <div className="lg:col-span-3 border border-neutral-200 rounded-3xl p-5 sm:p-6 bg-white dark:bg-neutral-900 dark:border-neutral-800">
              <h2 className="text-xs font-black uppercase tracking-widest mb-4 pl-1">
                <span>*</span> Gelişmiş Yapay Zeka Raporu
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
                      📊 {seciliRapor.sesAdi}
                    </h3>

                    {/* 🎭 4. DUYGU VE TON ANALİZ ROZETİ */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-600 dark:text-purple-300 text-[10px] font-black">
                        🎭 {seciliRapor.sentiment}
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-600 dark:text-indigo-300 text-[10px] font-black">
                        💬 {seciliRapor.tone}
                      </span>
                    </div>
                  </div>

                  {/* Özet */}
                  <div className="space-y-1">
                    <h4 className="text-[11px] font-black uppercase tracking-wider text-neutral-400">📝 Genel Özet</h4>
                    <p className="text-xs font-medium leading-relaxed p-3.5 rounded-2xl bg-neutral-50 text-neutral-800 border border-neutral-100 dark:bg-neutral-950 dark:text-neutral-200 dark:border-neutral-800">
                      {seciliRapor.metin}
                    </p>
                  </div>

                  {/* ✅ 2. OTOMATİK GÖREV LİSTESİ (ACTION ITEMS & TO-DO) */}
                  {seciliRapor.actionItems && seciliRapor.actionItems.length > 0 && (
                    <div className="border border-neutral-200 bg-neutral-50 rounded-2xl p-4 space-y-3 dark:bg-neutral-950 dark:border-neutral-800">
                      <h4 className="text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                        <span>✅</span> Yapılacak Görevler Listesi (To-Do)
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

                  {/* 👥 3. KONUŞMACI AYRIMI & DİYALOGLAR (DIARIZATION) */}
                  {seciliRapor.speakers && seciliRapor.speakers.length > 0 && (
                    <div className="border border-neutral-200 bg-neutral-50 rounded-2xl p-4 space-y-3 dark:bg-neutral-950 dark:border-neutral-800">
                      <h4 className="text-[11px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                        <span>👥</span> Konuşmacı Diyalogları (Diarization)
                      </h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {seciliRapor.speakers.map((sp: any, idx: number) => (
                          <div key={idx} className="p-2.5 rounded-xl bg-white border border-neutral-200 dark:bg-neutral-900 dark:border-neutral-800 space-y-1">
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                              👤 {sp.speaker}
                            </span>
                            <p className="text-xs font-medium text-neutral-800 dark:text-neutral-200 pl-1">{sp.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Kritik Noktalar */}
                  {seciliRapor.kritikYerler && seciliRapor.kritikYerler.length > 0 && (
                    <div className="border border-neutral-200 bg-neutral-50 rounded-2xl p-4 space-y-2 dark:bg-neutral-950 dark:border-neutral-800">
                      <h4 className="text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">⚡ Kritik Vurgular</h4>
                      <ul className="space-y-2 text-xs font-bold">
                        {seciliRapor.kritikYerler.map((k: any, i: number) => (
                          <li key={i} className="p-2.5 rounded-xl border bg-white border-neutral-200 text-neutral-800 dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-200">
                            {k}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 💬 1. SES KAYDIYLA AI SOHBET ROBOTU (AI CHATBOT) */}
                  <div className="border border-indigo-200 bg-indigo-50/50 rounded-2xl p-4 space-y-3 dark:bg-indigo-950/20 dark:border-indigo-900/60">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                        <span>💬</span> Ses Kaydıyla AI Sohbet Et
                      </h4>
                      <span className="text-[9px] font-extrabold text-indigo-500">Gemini Live Q&A</span>
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
                              {msg.rolu === "user" ? "Siz" : "🤖 Ses Asistanı AI"}
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
                        placeholder="Bu kayıt hakkında soru sorun (Örn: Hangi kararlar alındı?)" 
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