"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../firebaseConfig"; // Klasör yapına göre rota grubundan (main) iki üst dizine çıkıp firebaseConfig'e ulaşıyoruz
import { onAuthStateChanged } from "firebase/auth";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";

// ☁️ CLOUDINARY AYARLARI: cloudinary.com hesabınızdaki Cloud Name ve
// Settings > Upload > Upload Presets altında oluşturduğunuz "Unsigned" preset.
const CLOUDINARY_CLOUD_NAME = "ng89mhgm";
const CLOUDINARY_UPLOAD_PRESET = "ses_asistani";

export default function AnaSayfa() {
  const router = useRouter();

  // 🔐 Firebase Kullanıcı ve Yüklenme Durumları
  const [user, setUser] = useState<any>(null);
  const [yukleniyor, setYukleniyor] = useState(true);

  // Orijinal State'ler (Aynen Korundu)
  const [kaydediyor, setKaydediyor] = useState(false);
  const [sesUrl, setSesUrl] = useState<string | null>(null);
  const [sesBlob, setSesBlob] = useState<Blob | null>(null); // Buluta yüklenecek ham ses verisi
  const [sure, setSure] = useState(0);
  const [seciliKlasor, setSeciliKlasor] = useState<string>("toplantilarSesleri");
  const [istemciHazir, setIstemciHazir] = useState(false);
  const [transferEdiliyor, setTransferEdiliyor] = useState(false); // Bulut yükleme sırasında butonu kilitlemek için
  const [menuAcik, setMenuAcik] = useState(false); // Sadece mobilde: hamburger menü (klasörler) acik/kapali durumu

  const [aramaKelimesi, setAramaKelimesi] = useState<string>("");
  const [siralamYonu, setSiralamaYonu] = useState<string>("yeni");
  const [tumKlasorSesleri, setTumKlasorSesleri] = useState<any[]>([]);

  const [sesSeviyeleri, setSesSeviyeleri] = useState<number[]>([10, 10, 10, 10, 10, 10, 10, 10, 10]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const zamanlayiciRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 🎯 GÜVENLİK KAPISI: Firebase Giriş Kontrolü & Kullanıcıyı Belleğe Alma
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/giris");
      } else {
        setUser(currentUser);
        setYukleniyor(false);
        setIstemciHazir(true);
      }
    });
    return () => unsubscribe();
  }, [router]);

  // ☁️ CLOUD VERİ ÇEKME: Sadece giriş yapan kullanıcının Firestore bulutundaki seslerini çeker
  const buluttanSesleriCek = async (aktifKullanici: any) => {
    if (!aktifKullanici) return;

    try {
      const seslerRef = collection(db, "sesler");
      const q = query(seslerRef, where("userId", "==", aktifKullanici.uid));
      const querySnapshot = await getDocs(q);

      const bulutSesleri: any[] = [];
      querySnapshot.forEach((docSnap) => {
        bulutSesleri.push({ id: docSnap.id, ...docSnap.data() });
      });

      setTumKlasorSesleri(bulutSesleri);
    } catch (error) {
      console.error("Buluttan veri çekme hatası:", error);
    }
  };

  // 🔄 Firebase'den kullanıcı bilgisi geldiği an listeyi günceller
  useEffect(() => {
    if (user) {
      buluttanSesleriCek(user);
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch((err) => console.log(err));
      }
    };
  }, [user]);

  useEffect(() => {
    if (kaydediyor) {
      zamanlayiciRef.current = setInterval(() => {
        setSure((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(zamanlayiciRef.current);
    }
    return () => clearInterval(zamanlayiciRef.current);
  }, [kaydediyor]);

  const grafigiGuncelle = () => {
    if (!analyserRef.current || !dataArrayRef.current) return;
    analyserRef.current.getByteFrequencyData(dataArrayRef.current as any);
    const aktifVeri = dataArrayRef.current;
    const yeniSeviyeler = Array.from({ length: 9 }, (_, i) => {
      const index = Math.floor((aktifVeri.length / 9) * i);
      const deger = aktifVeri[index];
      return Math.max(8, Math.min(64, (deger / 255) * 64));
    });
    setSesSeviyeleri(yeniSeviyeler);
    animationFrameRef.current = requestAnimationFrame(grafigiGuncelle);
  };

  const kaydiBaslat = async () => {
    chunksRef.current = [];
    setSure(0);
    setSesUrl(null);
    setSesBlob(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioCtxClass();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      analyser.fftSize = 32;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      source.connect(analyser);
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;

      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const oBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        setSesBlob(oBlob); 
        const oUrl = URL.createObjectURL(oBlob);
        setSesUrl(oUrl);

        stream.getTracks().forEach((track) => track.stop());
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        setSesSeviyeleri([10, 10, 10, 10, 10, 10, 10, 10, 10]);

        if (audioContextRef.current && audioContextRef.current.state !== "closed") {
          audioContextRef.current.close().catch((err) => console.log(err));
        }
      };

      mediaRecorder.start(10);
      setKaydediyor(true);
      animationFrameRef.current = requestAnimationFrame(grafigiGuncelle);
    } catch (err) {
      alert("Mikrofon erisim izni saglanamadi!");
    }
  };

  const kaydiDurdur = () => {
    if (mediaRecorderRef.current && kaydediyor) {
      mediaRecorderRef.current.stop();
      setKaydediyor(false);
    }
  };

  const dosyaSeciminiTetikle = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const dosyaYukle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dosya = e.target.files?.[0];
    if (!dosya) return;
    if (!dosya.type.startsWith("audio/")) {
      alert("Lütfen sadece gecerli bir ses dosyasi secin!");
      return;
    }
    setSesBlob(dosya);
    const oUrl = URL.createObjectURL(dosya);
    setSesUrl(oUrl);
    setSure(0);
  };

  const dosyayiAc = (ses: any) => {
    setSesUrl(ses.kaynak);

    if (ses.sure && ses.sure !== "Hazir Dosya") {
      const parcalar = ses.sure.split(":");
      const toplamSaniye = parseInt(parcalar[0]) * 60 + parseInt(parcalar[1]);
      setSure(toplamSaniye);
    } else {
      setSure(0);
    }

    setAramaKelimesi("");

    const klasor = ses.bulunduguKlasor ? ses.bulunduguKlasor.trim() : "";

    if (klasor === "Toplantilar") {
      router.push("/toplantilar");
    } else if (klasor === "Ders Notlari") {
      router.push("/ders-notlari");
    } else if (klasor === "Gunluk") {
      router.push("/gunluk");
    }
  };

  // ☁️ GÜVENLİK KORUMALI BULUT KAYIT METODU (SIFIR KİLİTLENME)
  const klasoreGonder = async () => {
    if (!sesBlob || !user) {
      console.warn("Transfer iptal edildi: Ses verisi veya kullanıcı oturumu eksik.");
      return;
    }

    const klasorEtiketleri: { [key: string]: string } = {
      toplantilarSesleri: "Toplantilar",
      dersNotlariSesleri: "Ders Notlari", 
      gunlukSesleri: "Gunluk",             
    };
    const klasorEtiketi = klasorEtiketleri[seciliKlasor] || "Kayit";

    const bugun = new Date();
    const gun = bugun.getDate();
    const aylar = [
      "Ocak", "Subat", "Mart", "Nisan", "Mayis", "Haziran",
      "Temmuz", "Agustos", "Eylul", "Ekim", "Kasim", "Aralik"
    ];
    const ay = aylar[bugun.getMonth()];
    const saat = bugun.getHours().toString().padStart(2, "0");
    const dakika = bugun.getMinutes().toString().padStart(2, "0");

    const otomatikIsim = `${klasorEtiketi}_Kaydi_${gun}_${ay}_${saat}_${dakika}`;

    setTransferEdiliyor(true);
    
    try {
      const formData = new FormData();

      if (sesBlob instanceof File) {
        formData.append("file", sesBlob);
      } else {
        const sesDosyasi = new File([sesBlob], "ses_kaydi.webm", { type: sesBlob.type || "audio/webm" });
        formData.append("file", sesDosyasi);
      }

      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

      console.log("1. Cloudinary köprü isteği gönderiliyor...");
      const response = await fetch("/api/ses-yukle", {
        method: "POST",
        body: formData,
      });

      console.log("2. Sunucudan yanıt alındı, HTTP Kodu:", response.status);
      const sonuc = await response.json().catch(() => null);
      const kaliciInternetLinki = sonuc?.secure_url || sonuc?.url || (typeof sonuc === "string" ? sonuc : null);

      if (!response.ok || !kaliciInternetLinki) {
        throw new Error(sonuc?.error || "Cloudinary yüklemesi başarısız oldu.");
      }

      const yeniSes = {
        userId: user.uid,
        ad: otomatikIsim,
        kaynak: kaliciInternetLinki,
        tarih: "Bugün, " + bugun.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        sure: sure > 0 ? `${Math.floor(sure / 60)}:${(sure % 60).toString().padStart(2, "0")}` : "Hazir Dosya",
        bulunduguKlasor: klasorEtiketi, 
        olusturmaZamani: Date.now(),
      };

      console.log("3. Firestore'a yazma işlemi tetikleniyor...", yeniSes);
      
      try {
        await addDoc(collection(db, "sesler"), yeniSes);
        console.log(`🎉 "${otomatikIsim}" başarıyla Firestore'a kaydedildi!`);
        
        // Tarayıcı blokajlarını aşmak için arayüzü doğrudan güncelliyoruz
        setSesUrl(null);
        setSesBlob(null);
        setSure(0);
        await buluttanSesleriCek(user);
      } catch (fsError: any) {
        console.error("❌ Firestore Yazma Hatası:", fsError);
      }

    } catch (error: any) {
      console.error("❌ Genel Transfer Hatası:", error);
    } finally {
      console.log("4. Transfer Merkezi döngüsü tamamlandı, buton kilidi açılıyor.");
      // Tarayıcı ne yaparsa yapsın bu kilit kesin olarak kalkar
      setTransferEdiliyor(false);
    }
  };

  const formatSure = (s: number) => {
    const dk = Math.floor(s / 60);
    const sn = s % 60;
    return `${dk}:${sn.toString().padStart(2, "0")}`;
  };

  const filtrelenmisSesler = (tumKlasorSesleri || [])
    .filter((ses) => ses && ses.ad && ses.ad.toLowerCase().includes((aramaKelimesi || "").toLowerCase()))
    .sort((a, b) =>
      siralamYonu === "yeni"
        ? (b.olusturmaZamani || 0) - (a.olusturmaZamani || 0)
        : (a.olusturmaZamani || 0) - (b.olusturmaZamani || 0)
    );

  if (yukleniyor || !istemciHazir) return null;

  return (
    <div className="w-full min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 flex flex-col justify-start items-center p-4 sm:p-6 md:p-8 transition-colors duration-300">
      {/* 📱 SADECE MOBİL: Hamburger menü açılınca gelen klasör sekmesi. Masaüstü görünümüne dokunulmadı. */}
      {menuAcik && (
        <div className="md:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMenuAcik(false)}
          />
          <div className="absolute left-0 top-0 h-full w-72 max-w-[82%] bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 shadow-2xl p-5 space-y-6 overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Klasörler</h2>
              <button
                onClick={() => setMenuAcik(false)}
                className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white transition-colors"
                aria-label="Menüyü Kapat"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <nav className="space-y-1.5">
              <button
                onClick={() => { setMenuAcik(false); router.push("/toplantilar"); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-left"
              >
                <svg className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                </svg>
                Toplantılar
              </button>

              <button
                onClick={() => { setMenuAcik(false); router.push("/ders-notlari"); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-left"
              >
                <svg className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                </svg>
                Ders Notları
              </button>

              <button
                onClick={() => { setMenuAcik(false); router.push("/gunluk"); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-left"
              >
                <svg className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
                </svg>
                Günlük
              </button>

              <button
                onClick={() => { setMenuAcik(false); router.push("/cop-kutusu"); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-left"
              >
                <svg className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
                Çöp Kutusu
              </button>

              <button
                onClick={() => { setMenuAcik(false); router.push("/profil"); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-left"
              >
                <svg className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
                Profil
              </button>
            </nav>
          </div>
        </div>
      )}

      <div className="w-full max-w-4xl space-y-5 sm:space-y-6">

        <button
          onClick={() => setMenuAcik(true)}
          className="md:hidden flex items-center gap-2 px-3 py-2 -ml-1 mb-1 rounded-xl border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100 active:scale-95 transition-all dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-800"
          aria-label="Menüyü Ac"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
          </svg>
          <span className="text-xs font-black tracking-widest uppercase">Menü</span>
        </button>

        <div className="w-full border-b border-neutral-200 dark:border-neutral-800 pb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-bold text-neutral-500 dark:text-neutral-400 mb-1">
              👋 Hoş geldin, <span className="text-neutral-900 dark:text-neutral-100">{user?.email}</span>
            </p>
            <h1 className="text-xl sm:text-2xl font-black flex items-center gap-2 tracking-tight">
              <span className="text-neutral-400 dark:text-neutral-500 text-lg sm:text-xl">{"[-]"}</span> Ses Asistani
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 text-xs font-semibold">
              Kayit yapin veya arti butonundan dosya yükleyerek buluta transfer edin.
            </p>
          </div>

          <div className="w-full md:w-80 flex flex-col sm:flex-row items-center gap-2 bg-white dark:bg-neutral-900 p-1.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Tüm klasörlerde ara..."
                value={aramaKelimesi}
                onChange={(e) => setAramaKelimesi(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs font-bold text-neutral-900 bg-neutral-50 border border-neutral-100 dark:bg-neutral-800 dark:text-white dark:border-neutral-700 rounded-xl focus:outline-none placeholder-neutral-400"
              />
              <svg className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.603 10.602Z" />
              </svg>
            </div>
            <select
              value={siralamYonu}
              onChange={(e) => setSiralamaYonu(e.target.value)}
              className="w-full sm:w-auto px-2.5 py-1.5 text-xs font-black text-neutral-900 bg-white dark:bg-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none whitespace-nowrap cursor-pointer hover:border-neutral-300"
            >
              <option value="yeni">Yeni</option>
              <option value="eski">Eski</option>
            </select>
          </div>
        </div>

        {aramaKelimesi.trim() !== "" && (
          <div className="w-full bg-white/80 border border-dashed border-neutral-200 dark:bg-neutral-900/40 dark:border-neutral-700 rounded-2xl p-3 sm:p-4 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest pl-1">
                Arama Sonuclari ({filtrelenmisSesler.length})
              </h3>
              <button onClick={() => setAramaKelimesi("")} className="text-neutral-400 hover:text-red-500 text-xs font-bold transition-colors lowercase">Kapat</button>
            </div>
            {filtrelenmisSesler.length === 0 ? (
              <div className="text-center py-4 text-slate-400 text-xs font-bold">Aradiginiz kriterde bir yedek kayit bulunamadi.</div>
            ) : (
              <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                {filtrelenmisSesler.map((ses) => (
                  <div
                    key={ses.id}
                    onClick={() => dosyayiAc(ses)}
                    className="bg-white border border-neutral-200 rounded-xl p-3 flex items-center justify-between gap-4 shadow-3xs cursor-pointer hover:bg-neutral-100 dark:bg-neutral-800 dark:border-neutral-700 dark:hover:bg-neutral-700 transition-all duration-200 active:scale-[0.99]"
                    title="Dosyayi ilgili klasör sayfasinda acmak icin tiklayin"
                  >
                    <div>
                      <h4 className="font-bold text-xs">{ses.ad}</h4>
                      <p className="text-[9px] text-neutral-400 font-bold mt-0.5">{ses.tarih} • {ses.sure}</p>
                    </div>
                    <span className="text-[9px] font-black px-2.5 py-0.5 bg-neutral-100 border border-neutral-200 dark:bg-neutral-700 dark:border-neutral-600 rounded-full">
                      {ses.bulunduguKlasor}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="w-full bg-white border border-neutral-200/60 rounded-3xl p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 dark:bg-neutral-900/60 dark:border-neutral-800">
          <div className="flex items-center justify-center gap-4 sm:gap-6 relative">
            <div className="flex items-center gap-3">
              <button
                onClick={kaydediyor ? kaydiDurdur : kaydiBaslat}
                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-md border ${
                  kaydediyor
                    ? "bg-red-50 border-red-200 scale-105 animate-pulse dark:bg-red-950/30 dark:border-red-900"
                    : "bg-neutral-950 border-transparent text-white dark:bg-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-100 hover:scale-105 active:scale-95 shadow-lg"
                }`}
              >
                {kaydediyor ? (
                  <span className="text-xs sm:text-sm font-black tracking-widest text-red-600 dark:text-red-500">DUR</span>
                ) : (
                  <>
                    <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white block dark:hidden" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 0 3-3v-6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z" />
                    </svg>
                    <svg className="w-6 h-6 sm:w-7 sm:h-7 text-neutral-950 hidden dark:block" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 0 3-3v-6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z" />
                    </svg>
                  </>
                )}
              </button>
              {kaydediyor && (
                <span className="text-[10px] sm:text-xs font-black px-2 py-1 sm:px-3 bg-red-50 text-red-600 border border-red-100 rounded-full animate-pulse absolute left-2 sm:left-4 md:left-8 dark:bg-red-950/50 dark:text-red-400 dark:border-red-900">
                  {formatSure(sure)}
                </span>
              )}
            </div>

            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={dosyaYukle}
                accept="audio/*"
                className="hidden"
              />
              <button
                onClick={dosyaSeciminiTetikle}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border bg-neutral-50 border-neutral-200 text-neutral-800 hover:text-neutral-950 hover:border-neutral-950 hover:bg-white flex items-center justify-center transition-all shadow-2xs group hover:scale-110 active:scale-95 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-300 dark:hover:text-white"
                title="Ses Dosyasi Yükle"
              >
                <svg className="w-6 h-6 sm:w-7 sm:h-7 transition-transform group-hover:scale-110 text-neutral-800 dark:text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center gap-1 sm:gap-1.5 h-16 bg-neutral-100 border border-neutral-200/50 rounded-2xl py-8 sm:py-10 dark:bg-neutral-950 dark:border-neutral-850">
            {sesSeviyeleri.map((seviye, index) => {
              let barRengi = kaydediyor ? "bg-neutral-950 dark:bg-neutral-400" : "bg-neutral-200 dark:bg-neutral-800";

              if (kaydediyor) {
                if (seviye > 40) {
                  barRengi = "bg-red-500";
                } else if (seviye > 20) {
                  barRengi = "bg-amber-500";
                }
              }

              return (
                <div
                  key={index}
                  style={{ height: `${seviye}px` }}
                  className={`w-1.5 rounded-full transition-all duration-75 ${barRengi} ${
                    kaydediyor ? "animate-pulse" : ""
                  }`}
                />
              );
            })}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-1">
                <span>=</span> Transfer Merkezi
              </h3>
              {sesUrl && (
                <span className="text-[10px] font-black text-neutral-900 bg-neutral-200 px-2.5 py-0.5 rounded-full border border-neutral-300 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700">
                  Ses Verisi Yüklendi
                </span>
              )}
            </div>

            {sesUrl ? (
              <div className="p-4 sm:p-5 bg-neutral-50 border border-neutral-200 rounded-2xl flex flex-col lg:flex-row items-center gap-4 justify-between shadow-3xs dark:bg-neutral-950 dark:border-neutral-800">
                <div className="w-full lg:max-w-xs">
                  <audio controls className="w-full h-8 accent-neutral-950" src={sesUrl} key={sesUrl} />
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2 w-full lg:w-auto justify-end">
                  <select
                    value={seciliKlasor}
                    onChange={(e) => setSeciliKlasor(e.target.value)}
                    className="w-full sm:w-auto px-3 py-2 text-xs font-bold text-neutral-950 bg-white border border-neutral-200 rounded-xl focus:outline-none cursor-pointer hover:border-neutral-300 transition-colors dark:bg-neutral-800 dark:text-white dark:border-neutral-700"
                  >
                    <option value="toplantilarSesleri">Toplantilar</option>
                    <option value="dersNotlariSesleri">Ders Notlari</option>
                    <option value="gunlukSesleri">Gunluk</option>
                  </select>

                  <button
                    onClick={klasoreGonder}
                    disabled={transferEdiliyor}
                    className="w-full sm:w-auto px-5 py-2 bg-neutral-950 text-white text-xs font-black rounded-xl hover:bg-neutral-800 transition-all duration-200 tracking-wide whitespace-nowrap shadow-md active:scale-[0.99] dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {transferEdiliyor ? "Buluta Yükleniyor..." : "Klasöre Transfer Et"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center p-5 sm:p-8 border border-dashed border-neutral-200 rounded-2xl text-neutral-400 text-xs font-bold tracking-wide dark:bg-neutral-950/20 dark:border-neutral-800">
                Islem yapmak icin yukaridan ses kaydedin veya arti (+) butonuyla bir dosya secin.
              </div>
            )}
          </div>
        </div>

        <div className="w-full border-t border-neutral-200 dark:border-neutral-800 pt-6">
          <div className="text-center p-5 sm:p-8 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl text-neutral-400 dark:text-neutral-500 text-xs font-bold">
            Islem yapmak icin yukaridan ses kaydedin veya transfer panelini kullanin.
          </div>
        </div>

      </div>
    </div>
  );
}