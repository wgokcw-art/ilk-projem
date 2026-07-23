"use client";

import { useMemo } from "react";

interface IstatistikPaneliProps {
  sesler: any[];
  onKelimeSec: (kelime: string) => void;
}

export default function IstatistikPaneli({ sesler, onKelimeSec }: IstatistikPaneliProps) {
  // 📊 Hesaplanan İstatistikler
  const istatistikler = useMemo(() => {
    let toplamSaniye = 0;
    const klasorSayilari: { [key: string]: number } = {
      Toplantilar: 0,
      "Ders Notlari": 0,
      Gunluk: 0,
      Diğer: 0
    };

    const kelimeHaritasi: { [key: string]: number } = {};

    sesler.forEach((ses) => {
      // Süre Hesabı
      if (ses.sure && ses.sure !== "Hazir Dosya") {
        const p = ses.sure.split(":");
        if (p.length === 2) {
          toplamSaniye += parseInt(p[0]) * 60 + parseInt(p[1]);
        } else if (p.length === 3) {
          toplamSaniye += parseInt(p[0]) * 3600 + parseInt(p[1]) * 60 + parseInt(p[2]);
        }
      }

      // Klasör Hesabı
      const k = ses.bulunduguKlasor || "Diğer";
      if (klasorSayilari[k] !== undefined) {
        klasorSayilari[k]++;
      } else {
        klasorSayilari.Diğer++;
      }

      // Kelime Frekansı (Word Cloud için)
      const hamMetin = `${ses.ad || ""} ${ses.canliMetin || ""} ${ses.metin || ""}`;
      const kelimeler = hamMetin
        .toLowerCase()
        .replace(/[^\w\sğüşıöçĞÜŞİÖÇ]/gi, " ")
        .split(/\s+/)
        .filter((w) => w.length > 3 && !["bir", "bu", "ile", "için", "veya", "daha", "ve", "de", "da", "gibi", "olan"].includes(w));

      kelimeler.forEach((w) => {
        kelimeHaritasi[w] = (kelimeHaritasi[w] || 0) + 1;
      });
    });

    const enCokGecenKelimeler = Object.entries(kelimeHaritasi)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([k]) => k);

    const saat = Math.floor(toplamSaniye / 3600);
    const dakika = Math.floor((toplamSaniye % 3600) / 60);

    return {
      toplamKayit: sesler.length,
      toplamSureMetin: saat > 0 ? `${saat} saat ${dakika} dk` : `${dakika} dk`,
      klasorSayilari,
      enCokGecenKelimeler
    };
  }, [sesler]);

  if (sesler.length === 0) return null;

  return (
    <div className="w-full bg-white border border-neutral-200/80 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xs dark:bg-neutral-900/80 dark:border-neutral-800">
      
      {/* Paneli Başlığı */}
      <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
        <h3 className="text-xs font-black uppercase tracking-widest text-neutral-900 dark:text-white flex items-center gap-2">
          <svg className="w-4 h-4 text-neutral-800 dark:text-neutral-200" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
          </svg>
          Verimlilik ve İstatistik Özeti
        </h3>
        <span className="text-[10px] font-black text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 px-2.5 py-0.5 rounded-full border border-neutral-200 dark:border-neutral-700">
          Canlı Analiz
        </span>
      </div>

      {/* İstatistik Rozetleri */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        
        {/* TOPLAM KAYIT */}
        <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-100 dark:bg-neutral-950 dark:border-neutral-800 space-y-1">
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
            </svg>
            Toplam Kayıt
          </p>
          <p className="text-xl font-black text-neutral-900 dark:text-white">{istatistikler.toplamKayit} <span className="text-xs font-bold text-neutral-400">adet</span></p>
        </div>

        {/* TOPLAM SÜRE */}
        <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-100 dark:bg-neutral-950 dark:border-neutral-800 space-y-1">
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            Ses Süresi
          </p>
          <p className="text-xl font-black text-neutral-900 dark:text-white">{istatistikler.toplamSureMetin}</p>
        </div>

        {/* TOPLANTILAR SEYRİ */}
        <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-100 dark:bg-neutral-950 dark:border-neutral-800 space-y-1">
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
            Toplantılar
          </p>
          <p className="text-xl font-black text-neutral-900 dark:text-white">{istatistikler.klasorSayilari.Toplantilar} <span className="text-xs font-bold text-neutral-400">kayıt</span></p>
        </div>

        {/* DERS NOTLARI SEYRİ */}
        <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-100 dark:bg-neutral-950 dark:border-neutral-800 space-y-1">
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
            </svg>
            Ders Notları
          </p>
          <p className="text-xl font-black text-neutral-900 dark:text-white">{istatistikler.klasorSayilari["Ders Notlari"]} <span className="text-xs font-bold text-neutral-400">kayıt</span></p>
        </div>

      </div>

      {/* KLASÖR DAĞILIMI VE TREND KELİME BULUTU */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-neutral-100 dark:border-neutral-800">
        
        {/* KLASÖR ORANLARI BARLARI */}
        <div className="space-y-2">
          <p className="text-[11px] font-black uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-neutral-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-19.5 0A2.25 2.25 0 0 0 4.5 15h15a2.25 2.25 0 0 0 2.25-2.25m-19.5 0v.243a2.25 2.25 0 0 0 1.07 1.916l7.5 4.615a2.25 2.25 0 0 0 2.36 0l7.5-4.615a2.25 2.25 0 0 0 1.07-1.916V12.75" />
            </svg>
            Klasör Dağılım Oranları:
          </p>
          <div className="space-y-2">
            {[
              { ad: "Toplantılar", sayi: istatistikler.klasorSayilari.Toplantilar, renkkodu: "bg-neutral-800 dark:bg-neutral-200" },
              { ad: "Ders Notları", sayi: istatistikler.klasorSayilari["Ders Notlari"], renkkodu: "bg-neutral-600 dark:bg-neutral-400" },
              { ad: "Günlük", sayi: istatistikler.klasorSayilari.Gunluk, renkkodu: "bg-neutral-400 dark:bg-neutral-600" }
            ].map((item) => {
              const yuzde = istatistikler.toplamKayit > 0 ? Math.round((item.sayi / istatistikler.toplamKayit) * 100) : 0;
              return (
                <div key={item.ad} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span>{item.ad}</span>
                    <span className="text-neutral-400">{item.sayi} kayıt (%{yuzde})</span>
                  </div>
                  <div className="w-full h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div className={`h-full ${item.renkkodu} transition-all duration-500`} style={{ width: `${yuzde}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* TREND KELİME BULUTU (WORD CLOUD) */}
        <div className="space-y-2">
          <p className="text-[11px] font-black uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-neutral-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
            </svg>
            Öne Çıkan Trend Kelimeler:
          </p>
          {istatistikler.enCokGecenKelimeler.length === 0 ? (
            <p className="text-xs font-bold text-neutral-400 py-2">Henüz kelime trendi tespit edilmedi.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {istatistikler.enCokGecenKelimeler.map((kelime) => (
                <button
                  key={kelime}
                  onClick={() => onKelimeSec(kelime)}
                  className="px-2.5 py-1 rounded-xl text-xs font-black bg-neutral-100 hover:bg-neutral-950 hover:text-white dark:bg-neutral-800 dark:hover:bg-white dark:hover:text-neutral-950 transition-all cursor-pointer border border-neutral-200 dark:border-neutral-700 active:scale-95 flex items-center gap-1"
                  title={`"${kelime}" kelimesine göre filtrele`}
                >
                  <span className="opacity-50">#</span>
                  <span>{kelime}</span>
                </button>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
