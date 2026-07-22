"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";

const CLOUDINARY_CLOUD_NAME = "ng89mhgm";
const CLOUDINARY_UPLOAD_PRESET = "ses_asistani";

// ✂️ Web Audio API AudioBuffer -> WAV Blob Dönüştürücü Yardımcısı
function bufferToWave(abuffer: AudioBuffer, len: number) {
  let numOfChan = abuffer.numberOfChannels,
    length = len * numOfChan * 2 + 44,
    buffer = new ArrayBuffer(length),
    view = new DataView(buffer),
    channels = [], i, sample,
    offset = 0,
    pos = 0;

  function setUint16(data: number) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: number) {
    view.setUint32(pos, data, true);
    pos += 4;
  }

  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8);
  setUint32(0x45564157); // "WAVE"

  setUint32(0x20746d66); // "fmt "
  setUint32(16);
  setUint16(1); // PCM
  setUint16(numOfChan);
  setUint32(abuffer.sampleRate);
  setUint32(abuffer.sampleRate * 2 * numOfChan);
  setUint16(numOfChan * 2);
  setUint16(16);

  setUint32(0x61746164); // "data"
  setUint32(length - pos - 4);

  for (i = 0; i < abuffer.numberOfChannels; i++)
    channels.push(abuffer.getChannelData(i));

  while (pos < length) {
    for (i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

export default function AnaSayfa() {
  const router = useRouter();

  // 🔐 Firebase Kullanıcı ve Yüklenme Durumları
  const [user, setUser] = useState<any>(null);
  const [yukleniyor, setYukleniyor] = useState(true);

  // Orijinal State'ler
  const [kaydediyor, setKaydediyor] = useState(false);
  const [sesUrl, setSesUrl] = useState<string | null>(null);
  const [sesBlob, setSesBlob] = useState<Blob | null>(null);
  const [sure, setSure] = useState(0);
  const [seciliKlasor, setSeciliKlasor] = useState<string>("toplantilarSesleri");
  const [istemciHazir, setIstemciHazir] = useState(false);
  const [transferEdiliyor, setTransferEdiliyor] = useState(false);

  const [aramaKelimesi, setAramaKelimesi] = useState<string>("");
  const [siralamYonu, setSiralamaYonu] = useState<string>("yeni");
  const [tumKlasorSesleri, setTumKlasorSesleri] = useState<any[]>([]);

  // 🚀 1. Canlı Konuşmayı Metne Dökme State'leri
  const [canliMetin, setCanliMetin] = useState<string>("");
  const recognitionRef = useRef<any>(null);

  // 🚀 2. Zaman İşaretleyicileri State'leri
  const [isaretler, setIsaretler] = useState<{ zaman: number; etiket: string }[]>([]);

  // 🚀 3. Oynatma Hızı State'i
  const [oynatmaHizi, setOynatmaHizi] = useState<number>(1.0);
  const mainAudioRef = useRef<HTMLAudioElement | null>(null);

  // 🚀 4. Ses Kırpma Modal State'leri
  const [trimmerAcik, setTrimmerAcik] = useState(false);
  const [baslangicSaniye, setBaslangicSaniye] = useState<number>(0);
  const [bitisSaniye, setBitisSaniye] = useState<number>(0);
  const [toplamSaniyeLimit, setToplamSaniyeLimit] = useState<number>(0);
  const [kirpiliyor, setKirpiliyor] = useState(false);

  const [sesSeviyeleri, setSesSeviyeleri] = useState<number[]>([10, 10, 10, 10, 10, 10, 10, 10, 10]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const zamanlayiciRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (user) {
      buluttanSesleriCek(user);
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch((err) => console.log(err));
      }
      if (recognitionRef.current) recognitionRef.current.stop();
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
    setCanliMetin("");
    setIsaretler([]);
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

      let recorderMimeType = "audio/webm;codecs=opus";
      if (!MediaRecorder.isTypeSupported(recorderMimeType)) {
        recorderMimeType = MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "";
      }

      const mediaRecorder = new MediaRecorder(stream, {
        ...(recorderMimeType ? { mimeType: recorderMimeType } : {}),
        audioBitsPerSecond: 64000,
      });
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

        if (recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch (e) {}
        }
      };

      // 🚀 Canlı Speech-to-Text (STT) Başlat
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const rec = new SpeechRecognition();
          rec.continuous = true;
          rec.interimResults = true;
          rec.lang = "tr-TR";
          rec.onresult = (event: any) => {
            let metin = "";
            for (let i = 0; i < event.results.length; i++) {
              metin += event.results[i][0].transcript;
            }
            setCanliMetin(metin);
          };
          rec.start();
          recognitionRef.current = rec;
        } catch (e) {
          console.log("Speech recognition başlatılamadı:", e);
        }
      }

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

  // 🚀 Zaman İşaretleyicisi Ekle
  const isaretEkle = () => {
    const etiketGirdisi = prompt(`📌 ${formatSure(sure)} anına bir etiket/not yazın:`, `İşaret (${formatSure(sure)})`);
    if (etiketGirdisi !== null) {
      const yeniIsaret = {
        zaman: sure,
        etiket: etiketGirdisi.trim() || `İşaret (${formatSure(sure)})`
      };
      setIsaretler((prev) => [...prev, yeniIsaret]);
    }
  };

  const isareteAtla = (saniye: number) => {
    if (mainAudioRef.current) {
      mainAudioRef.current.currentTime = saniye;
      mainAudioRef.current.play().catch(() => {});
    }
  };

  // 🚀 Oynatma Hızı Değiştirici
  const hizDegistir = (hiz: number) => {
    setOynatmaHizi(hiz);
    if (mainAudioRef.current) {
      mainAudioRef.current.playbackRate = hiz;
    }
  };

  // 🚀 Ses Kırpma Modalını Aç
  const trimmerAc = () => {
    if (!sesBlob && !sesUrl) return;
    setBaslangicSaniye(0);
    setBitisSaniye(sure > 0 ? sure : 60);
    setToplamSaniyeLimit(sure > 0 ? sure : 120);
    setTrimmerAcik(true);
  };

  // 🚀 Web Audio API İle Sesi İstenen Saniyeler Arasında Kırp
  const sesKirpVeKaydet = async () => {
    if (!sesBlob) {
      alert("Kırpılacak ses verisi bulunamadı!");
      return;
    }
    if (baslangicSaniye >= bitisSaniye) {
      alert("Başlangıç zamanı bitiş zamanından önce olmalıdır!");
      return;
    }

    setKirpiliyor(true);
    try {
      const arrayBuffer = await sesBlob.arrayBuffer();
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtxClass();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

      const sampleRate = audioBuffer.sampleRate;
      const startOffset = Math.floor(baslangicSaniye * sampleRate);
      const endOffset = Math.floor(bitisSaniye * sampleRate);
      const frameCount = Math.max(1, endOffset - startOffset);

      const trimmedBuffer = audioCtx.createBuffer(
        audioBuffer.numberOfChannels,
        frameCount,
        sampleRate
      );

      for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
        const channelData = audioBuffer.getChannelData(c);
        const trimmedData = trimmedBuffer.getChannelData(c);
        for (let i = 0; i < frameCount; i++) {
          if (startOffset + i < channelData.length) {
            trimmedData[i] = channelData[startOffset + i];
          }
        }
      }

      const waveBlob = bufferToWave(trimmedBuffer, frameCount);
      setSesBlob(waveBlob);
      const yeniUrl = URL.createObjectURL(waveBlob);
      setSesUrl(yeniUrl);

      const yeniSure = Math.round(bitisSaniye - baslangicSaniye);
      setSure(yeniSure);
      setTrimmerAcik(false);
      alert(`Ses başarıyla kırpıldı! Yeni süre: ${formatSure(yeniSure)}`);

      if (audioCtx.state !== "closed") audioCtx.close();
    } catch (error: any) {
      console.error("Ses kırpma hatası:", error);
      alert("Ses kırpılırken hata oluştu: " + (error.message || error));
    } finally {
      setKirpiliyor(false);
    }
  };

  const dosyaYukle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dosya = e.target.files?.[0];
    if (!dosya) return;
    
    const gecerliUzantilar = /\.(mp3|m4a|wav|webm|ogg|aac|flac|mp4|m4b|wma|amr)$/i;
    const isAudioType = dosya.type ? dosya.type.startsWith("audio/") || dosya.type.startsWith("video/webm") : false;
    const isAudioExt = gecerliUzantilar.test(dosya.name);

    if (!isAudioType && !isAudioExt) {
      alert("Lütfen geçerli bir ses dosyası seçin! (.mp3, .m4a, .wav, .webm, .ogg vb.)");
      return;
    }
    setSesBlob(dosya);
    const oUrl = URL.createObjectURL(dosya);
    setSesUrl(oUrl);
    setSure(0);
    setCanliMetin("");
    setIsaretler([]);
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

  const klasoreGonder = async () => {
    if (!sesBlob || !user) {
      alert("Transfer edilecek ses verisi veya kullanıcı oturumu bulunamadı.");
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

      const response = await fetch("/api/ses-yukle", {
        method: "POST",
        body: formData,
      });

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
        canliMetin: canliMetin || "",
        isaretler: isaretler || [],
        olusturmaZamani: Date.now(),
      };

      try {
        await addDoc(collection(db, "sesler"), yeniSes);
        setSesUrl(null);
        setSesBlob(null);
        setSure(0);
        setCanliMetin("");
        setIsaretler([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
        await buluttanSesleriCek(user);
        alert(`Ses kaydı başarıyla "${klasorEtiketi}" klasörüne transfer edildi!`);
      } catch (fsError: any) {
        console.error("❌ Firestore Yazma Hatası:", fsError);
        alert("Ses Cloudinary'e yüklendi ancak Firestore veri tabanına kaydedilirken hata oluştu: " + (fsError.message || fsError));
      }

    } catch (error: any) {
      console.error("❌ Genel Transfer Hatası:", error);
      alert("Dosya yükleme hatası: " + (error.message || "Yükleme sırasında beklenmeyen bir hata oluştu."));
    } finally {
      setTransferEdiliyor(false);
    }
  };

  const formatSure = (s: number) => {
    const sa = Math.floor(s / 3600);
    const dk = Math.floor((s % 3600) / 60);
    const sn = s % 60;
    if (sa > 0) {
      return `${sa}:${dk.toString().padStart(2, "0")}:${sn.toString().padStart(2, "0")}`;
    }
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
      
      <div className="w-full max-w-4xl space-y-5 sm:space-y-6">

        {/* 🎙️ ANA SAYFA BÖLÜM BAŞLIĞI */}
        <div className="w-full border-b border-neutral-200 dark:border-neutral-800 pb-5 pt-2 sm:pt-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs sm:text-sm font-bold text-neutral-500 dark:text-neutral-400">
              👋 Hoş geldin, <span className="text-neutral-900 dark:text-neutral-100">{user?.displayName || user?.email?.split("@")[0] || "Kullanıcı"}</span>
            </p>
            <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2 tracking-tight text-neutral-900 dark:text-white">
              <span className="text-neutral-400 dark:text-neutral-500 text-xl">{"[-]"}</span> Ses Asistanı
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 text-xs font-semibold">
              Kayıt yapın veya artı (+) butonundan dosya yükleyerek buluta transfer edin.
            </p>
          </div>

          {/* Arama & Sıralama Kutusu */}
          <div className="w-full md:w-80 flex items-center gap-2 bg-white dark:bg-neutral-900 p-1.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
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
              className="px-2.5 py-1.5 text-xs font-black text-neutral-900 bg-white dark:bg-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none cursor-pointer hover:border-neutral-300"
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
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 0 3-3v-6a3 3 0 0 0 3 3Z" />
                    </svg>
                    <svg className="w-6 h-6 sm:w-7 sm:h-7 text-neutral-950 hidden dark:block" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 0 3-3v-6a3 3 0 0 0 3 3Z" />
                    </svg>
                  </>
                )}
              </button>
              {kaydediyor && (
                <div className="flex flex-col gap-1 items-start">
                  <span className="text-[10px] sm:text-xs font-black px-2 py-1 sm:px-3 bg-red-50 text-red-600 border border-red-100 rounded-full animate-pulse dark:bg-red-950/50 dark:text-red-400 dark:border-red-900">
                    {formatSure(sure)}
                  </span>
                  
                  {/* 🚀 2. ZAMAN İŞARETLEYİCİSİ BUTONU */}
                  <button
                    onClick={isaretEkle}
                    className="px-2.5 py-1 rounded-full bg-amber-500 text-neutral-950 text-[10px] font-black hover:bg-amber-400 active:scale-95 transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                  >
                    <span>📌</span> İşaret Ekle
                  </button>
                </div>
              )}
            </div>

            <div>
              <input
                id="ses-dosya-input"
                type="file"
                ref={fileInputRef}
                onChange={dosyaYukle}
                accept="audio/*, .mp3, .m4a, .wav, .webm, .ogg, .aac, .flac, .mp4, .m4b, .wma, .amr, .opus"
                className="hidden"
              />
              <label
                htmlFor="ses-dosya-input"
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border bg-neutral-50 border-neutral-200 text-neutral-800 hover:text-neutral-950 hover:border-neutral-950 hover:bg-white flex items-center justify-center transition-all shadow-2xs group hover:scale-110 active:scale-95 cursor-pointer dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-300 dark:hover:text-white"
                title="Ses Dosyası Yükle"
              >
                <svg className="w-6 h-6 sm:w-7 sm:h-7 transition-transform group-hover:scale-110 text-neutral-800 dark:text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </label>
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

          {/* 🚀 1. CANLI SPEECH-TO-TEXT (STT) CANLI METİN AKIŞI KUTUSU */}
          {kaydediyor && (
            <div className="w-full p-4 rounded-2xl bg-neutral-900 text-white dark:bg-neutral-950 border border-neutral-800 shadow-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                    Canlı Konuşma Metni (STT)
                  </span>
                </div>
                <span className="text-[9px] font-bold text-neutral-400">Türkçe Yapay Zeka</span>
              </div>
              <p className="text-xs font-semibold text-neutral-200 leading-relaxed max-h-24 overflow-y-auto italic">
                {canliMetin || "Konuşmaya başladığınızda kelimeler burada canlı aksın..."}
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-1">
                <span>=</span> Transfer Merkezi
              </h3>
              {sesUrl && (
                <span className="text-[10px] font-black text-neutral-900 bg-neutral-200 px-2.5 py-0.5 rounded-full border border-neutral-300 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700">
                  Ses Verisi Hazır
                </span>
              )}
            </div>

            {sesUrl ? (
              <div className="p-4 sm:p-5 bg-neutral-50 border border-neutral-200 rounded-2xl flex flex-col gap-4 shadow-3xs dark:bg-neutral-950 dark:border-neutral-800">
                
                {/* OYNATICI VE KONTROLLER */}
                <div className="w-full flex flex-col sm:flex-row items-center gap-3 justify-between">
                  <audio 
                    ref={mainAudioRef}
                    controls 
                    className="w-full accent-neutral-950" 
                    src={sesUrl} 
                    key={sesUrl} 
                  />

                  {/* 🚀 3. OYNATMA HIZI KONTROLÜ */}
                  <div className="flex items-center gap-1 bg-white dark:bg-neutral-900 p-1 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-2xs">
                    <span className="text-[9px] font-black uppercase px-1.5 text-neutral-400">Hız:</span>
                    {[0.75, 1.0, 1.25, 1.5, 2.0].map((hiz) => (
                      <button
                        key={hiz}
                        onClick={() => hizDegistir(hiz)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                          oynatmaHizi === hiz
                            ? "bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 shadow-xs"
                            : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        }`}
                      >
                        {hiz}x
                      </button>
                    ))}
                  </div>

                  {/* 🚀 4. SES KIRP BUTONU */}
                  <button
                    onClick={trimmerAc}
                    className="px-3 py-2 bg-neutral-200 text-neutral-900 dark:bg-neutral-800 dark:text-white rounded-xl text-xs font-black hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <span>✂️</span> Sesi Kırp
                  </button>
                </div>

                {/* 🚀 ZAMAN İŞARETLEYİCİLERİ LİSTESİ */}
                {isaretler.length > 0 && (
                  <div className="w-full pt-2 border-t border-neutral-200 dark:border-neutral-800 space-y-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">📌 Kaydedilmiş İşaretleyiciler:</span>
                    <div className="flex flex-wrap gap-2">
                      {isaretler.map((item, index) => (
                        <button
                          key={index}
                          onClick={() => isareteAtla(item.zaman)}
                          className="px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold hover:bg-amber-500/20 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <span>📌</span>
                          <span className="font-black">{formatSure(item.zaman)}</span>
                          <span>- {item.etiket}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* KLASÖR SEÇİMİ VE BULUTA YÜKLE */}
                <div className="flex flex-col sm:flex-row items-center gap-2 w-full justify-end pt-2 border-t border-neutral-200 dark:border-neutral-800">
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

      {/* ✂️ 4. SES KIRPMA MODALI (AUDIO TRIMMER MODAL) */}
      {trimmerAcik && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-6">
            
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <h3 className="text-base font-black flex items-center gap-2 text-neutral-900 dark:text-white">
                <span>✂️</span> Ses Kırpma Aracı
              </h3>
              <button 
                onClick={() => setTrimmerAcik(false)}
                className="p-1 rounded-xl text-neutral-400 hover:text-neutral-800 dark:hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Ses kaydınızın tutmak istediğiniz başlangıç ve bitiş saniyelerini seçin:
            </p>

            <div className="space-y-4">
              {/* BAŞLANGIÇ SANİYE */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold">
                  <span>Başlangıç Zamanı:</span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400">{formatSure(baslangicSaniye)}</span>
                </div>
                <input 
                  type="range" 
                  min={0} 
                  max={Math.max(1, bitisSaniye - 1)} 
                  value={baslangicSaniye} 
                  onChange={(e) => setBaslangicSaniye(Number(e.target.value))}
                  className="w-full accent-neutral-950 dark:accent-white cursor-pointer"
                />
              </div>

              {/* BİTİŞ SANİYE */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold">
                  <span>Bitiş Zamanı:</span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400">{formatSure(bitisSaniye)}</span>
                </div>
                <input 
                  type="range" 
                  min={Math.min(baslangicSaniye + 1, toplamSaniyeLimit)} 
                  max={toplamSaniyeLimit || 60} 
                  value={bitisSaniye} 
                  onChange={(e) => setBitisSaniye(Number(e.target.value))}
                  className="w-full accent-neutral-950 dark:accent-white cursor-pointer"
                />
              </div>

              {/* ÖZET KUTUSU */}
              <div className="p-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-center text-xs font-bold">
                Kırpılacak Yeni Süre: <span className="text-emerald-600 dark:text-emerald-400 font-mono font-black">{formatSure(Math.max(0, bitisSaniye - baslangicSaniye))}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setTrimmerAcik(false)}
                className="w-1/2 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"
              >
                Vazgeç
              </button>

              <button
                type="button"
                onClick={sesKirpVeKaydet}
                disabled={kirpiliyor}
                className="w-1/2 py-3 rounded-xl bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 text-xs font-black hover:opacity-90 active:scale-95 transition-all shadow-md disabled:opacity-50"
              >
                {kirpiliyor ? "Kırpılıyor..." : "✂️ Kırp ve Kaydet"}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}