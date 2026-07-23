"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../../firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import PaylasimBar from "../../components/PaylasimBar";
import InteraktifTranskript from "../../components/InteraktifTranskript";
import TakvimHatirlaticiModal from "../../components/TakvimHatirlaticiModal";
import DilCeviriBar from "../../components/DilCeviriBar";

export default function Gunluk() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [sesler, setSesler] = useState<any[]>([]);
  const [isleniyor, setIsleniyor] = useState<string | null>(null);
  const [analizDurumu, setAnalizDurumu] = useState<string>(" ");
  const [seciliRapor, setSeciliRapor] = useState<any | null>(null);
  const [orijinalRapor, setOrijinalRapor] = useState<any | null>(null);
  const [seciliSes, setSeciliSes] = useState<any | null>(null);
  const [mevcutZaman, setMevcutZaman] = useState<number>(0);
  const [seciliTakvimGorev, setSeciliTakvimGorev] = useState<string | null>(null);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement | null }>({});

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
    setAnalizDurumu("Günlük kaydı yapay zeka (Gemini) tarafından duygu süzgecinden geçiriliyor...");

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
        setSeciliRapor({
          sesAdi: sesNesnesi.ad,
          sureBilgisi: "API Engeli",
          isSessiz: true,
          metin: "Google Gemini API Anahtarı Kısıtlanmış (API_KEY_SERVICE_BLOCKED)",
          modAnalizi: [
            "Mevcut Firebase API Anahtarında Generative Language API servisi engellenmiş durumda.",
            "Çözüm: https://aistudio.google.com/ adresinden 1 dakikada ücretsiz yeni bir Gemini API Key alıp Vercel'deki GEMINI_API_KEY ortam değişkenine ekleyin."
          ],
          gununOzeti: [],
          anahtarKelimeler: ["API_Kısıtlaması"],
          actionItems: [],
          speakers: [],
          sentiment: "API Uyarısı",
          tone: "Kısıtlama"
        });
        setIsleniyor(null);
        return;
      }

      const veri = await apiResponse.json();

      const raporObj = {
        sesAdi: sesNesnesi.ad,
        sureBilgisi: `Tamamlandı (${sesNesnesi.sure || "Hazır Dosya"})`,
        isSessiz: false,
        metin: veri.ozet || "Günlük kaydı başarıyla analiz edildi.",
        modAnalizi: Array.isArray(veri.kritikler) ? veri.kritikler : (veri.kritikYerler || ["Günlük mod analizi tamamlandı."]),
        gununOzeti: Array.isArray(veri.ozetTanimlar) ? veri.ozetTanimlar : [veri.ozet],
        anahtarKelimeler: Array.isArray(veri.ekstra) ? veri.ekstra : ["Günlük", "Kişisel_Analiz"],
        actionItems: veri.actionItems || [],
        speakers: veri.speakers || [],
        transkriptZamanli: veri.transkriptZamanli || [],
        sentiment: veri.sentiment || "Huzurlu / Düşünceli",
        tone: veri.tone || "Kişisel ve Samimi"
      };

      setSeciliRapor(raporObj);
      setOrijinalRapor(raporObj);

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
                  <audio 
                    ref={(el) => { audioRefs.current[ses.id] = el; }}
                    onTimeUpdate={(e) => setMevcutZaman(e.currentTarget.currentTime)}
                    controls 
                    className="w-full h-8 accent-neutral-950" 
                    src={ses.kaynak} 
                  />
                  <button 
                    onClick={() => sesiGercektenDinle(ses)} 
                    className="w-full py-2.5 text-xs font-black rounded-xl text-white bg-neutral-950 hover:bg-neutral-800 transition-all shadow-md active:scale-[0.99] dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100 flex items-center justify-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
                    </svg>
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
                    <h3 className="font-black text-sm text-neutral-900 dark:text-white flex items-center gap-2">
                      <svg className="w-4 h-4 text-neutral-800 dark:text-neutral-200" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
                      </svg>
                      {seciliRapor.sesAdi}
                    </h3>

                    {/* DUYGU VE TON ANALİZ ROZETİ */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 text-[10px] font-black">
                        Duygu: {seciliRapor.sentiment}
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 text-[10px] font-black">
                        Ton: {seciliRapor.tone}
                      </span>
                    </div>
                  </div>

                  {/* 🌐 4. TEK TIKLA ÇOKLU DİL ÇEVİRİSİ BARI */}
                  <DilCeviriBar 
                    orijinalRapor={orijinalRapor || seciliRapor} 
                    onRaporGuncelle={(yeniRapor) => setSeciliRapor(yeniRapor)} 
                  />

                  {/* 📤 3. DIŞA AKTARMA VE PAYLAŞIM BARI */}
                  <PaylasimBar rapor={seciliRapor} klasorAdi="Günlük" />

                  {/* 🎙️ İNTERAKTİF TRANSKRİPT (ZAMANA TIKLA & DİNLE) */}
                  <InteraktifTranskript 
                    metinParcalari={seciliRapor.transkriptZamanli}
                    duzMetin={seciliRapor.metin}
                    mevcutZaman={mevcutZaman}
                    onZamanaAtla={(zaman) => {
                      if (seciliSes && audioRefs.current[seciliSes.id]) {
                        const audio = audioRefs.current[seciliSes.id];
                        if (audio) {
                          audio.currentTime = zaman;
                          audio.play();
                        }
                      }
                    }}
                  />

                  {/* Özet */}
                  <p className="text-xs font-medium leading-relaxed p-3.5 rounded-2xl bg-neutral-50 text-neutral-800 border border-neutral-100 dark:bg-neutral-950 dark:text-neutral-200 dark:border-neutral-800">
                    {seciliRapor.metin}
                  </p>
                  
                  {/* Mod Analizi */}
                  {seciliRapor.modAnalizi && seciliRapor.modAnalizi.length > 0 && (
                    <div className="border border-neutral-200 bg-neutral-50 rounded-2xl p-4 space-y-2 dark:bg-neutral-950 dark:border-neutral-800">
                      <h4 className="text-[11px] font-black uppercase tracking-wider text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" />
                        </svg>
                        Ruh Hali & Mod İncelemesi
                      </h4>
                      <ul className="space-y-2 text-xs font-bold">
                        {seciliRapor.modAnalizi.map((m: any, i: number) => (
                          <li key={i} className="p-2.5 rounded-xl border bg-white border-neutral-200 text-neutral-800 dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-200">
                            {m}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* KİŞİSEL PLANLAR & HEDEFLER (TO-DO) */}
                  {seciliRapor.actionItems && seciliRapor.actionItems.length > 0 && (
                    <div className="border border-neutral-200 bg-neutral-50 rounded-2xl p-4 space-y-3 dark:bg-neutral-950 dark:border-neutral-800">
                      <h4 className="text-[11px] font-black uppercase tracking-wider text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                        Kişisel Planlar & Yapılacak Hedefler
                      </h4>
                      <div className="space-y-2">
                        {seciliRapor.actionItems.map((gorev: string, idx: number) => {
                          const isChecked = !!tamamlananGorevler[idx];
                          return (
                            <div 
                              key={idx} 
                              className={`flex items-center justify-between gap-2.5 p-2.5 rounded-xl border transition-all ${
                                isChecked 
                                  ? "bg-neutral-100 border-neutral-300 text-neutral-500 line-through dark:bg-neutral-900 dark:border-neutral-700 opacity-60" 
                                  : "bg-white border-neutral-200 text-neutral-800 dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-200"
                              }`}
                            >
                              <label className="flex items-start gap-2.5 flex-1 cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={isChecked} 
                                  onChange={() => setTamamlananGorevler(p => ({ ...p, [idx]: !p[idx] }))}
                                  className="mt-0.5 accent-neutral-950 dark:accent-white rounded cursor-pointer"
                                />
                                <span className="text-xs font-bold leading-tight">{gorev}</span>
                              </label>

                              {/* Takvim / Hatırlatıcı Ekle Butonu */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSeciliTakvimGorev(gorev);
                                }}
                                className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all active:scale-95 text-[10px] font-black flex items-center gap-1 shrink-0"
                                title="Takvim & Hatırlatıcı Ekle"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                                </svg>
                                <span>Takvim</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Anahtar Kelimeler */}
                  {seciliRapor.anahtarKelimeler && seciliRapor.anahtarKelimeler.length > 0 && (
                    <div className="border border-neutral-200 bg-neutral-50 rounded-2xl p-4 space-y-2 dark:bg-neutral-950 dark:border-neutral-800">
                      <h4 className="text-[11px] font-black uppercase tracking-wider text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 0 1 0 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281Z" />
                        </svg>
                        Önemli Kavramlar
                      </h4>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {seciliRapor.anahtarKelimeler.map((w: any, i: number) => (
                          <span key={i} className="px-3 py-1 border text-xs font-black rounded-xl bg-white border-neutral-200 dark:bg-neutral-900 dark:border-neutral-700">
                            #{w}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* GÜNLÜK HAKKINDA AI SOHBET ROBOTU (AI CHATBOT) */}
                  <div className="border border-neutral-200 bg-white rounded-2xl p-4 space-y-3 dark:bg-neutral-950 dark:border-neutral-800">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-white flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                        </svg>
                        Günlük Hakkında AI'ya Soru Sor
                      </h4>
                      <span className="text-[9px] font-extrabold text-neutral-400">Gemini Personal AI</span>
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
                              {msg.rolu === "user" ? "Siz" : "Günlük AI Danışmanı"}
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