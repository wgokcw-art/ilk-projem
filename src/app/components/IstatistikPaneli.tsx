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
          <span>📊</span> Verimlilik ve İstatistik Özeti
        </h3>
        <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-900">
          Canlı Analiz
        </span>
      </div>

      {/* İstatistik Rozetleri */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        
        {/* TOPLAM KAYIT */}
        <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-100 dark:bg-neutral-950 dark:border-neutral-800 space-y-1">
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Toplam Kayıt</p>
          <p className="text-xl font-black text-neutral-900 dark:text-white">{istatistikler.toplamKayit} <span className="text-xs font-bold text-neutral-400">adet</span></p>
        </div>

        {/* TOPLAM SÜRE */}
        <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-100 dark:bg-neutral-950 dark:border-neutral-800 space-y-1">
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Ses Süresi</p>
          <p className="text-xl font-black text-neutral-900 dark:text-white">{istatistikler.toplamSureMetin}</p>
        </div>

        {/* TOPLANTILAR SEYRİ */}
        <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-100 dark:bg-neutral-950 dark:border-neutral-800 space-y-1">
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Toplantılar</p>
          <p className="text-xl font-black text-purple-600 dark:text-purple-400">{istatistikler.klasorSayilari.Toplantilar} <span className="text-xs font-bold text-neutral-400">kayıt</span></p>
        </div>

        {/* DERS NOTLARI SEYRİ */}
        <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-100 dark:bg-neutral-950 dark:border-neutral-800 space-y-1">
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Ders Notları</p>
          <p className="text-xl font-black text-blue-600 dark:text-blue-400">{istatistikler.klasorSayilari["Ders Notlari"]} <span className="text-xs font-bold text-neutral-400">kayıt</span></p>
        </div>

      </div>

      {/* KLASÖR DAĞILIMI VE TREND KELİME BULUTU */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-neutral-100 dark:border-neutral-800">
        
        {/* KLASÖR ORANLARI BARLARI */}
        <div className="space-y-2">
          <p className="text-[11px] font-black uppercase tracking-wider text-neutral-400">
            📁 Klasör Dağılım Oranları:
          </p>
          <div className="space-y-2">
            {[
              { ad: "Toplantılar", sayi: istatistikler.klasorSayilari.Toplantilar, renkkodu: "bg-purple-500" },
              { ad: "Ders Notları", sayi: istatistikler.klasorSayilari["Ders Notlari"], renkkodu: "bg-blue-500" },
              { ad: "Günlük", sayi: istatistikler.klasorSayilari.Gunluk, renkkodu: "bg-amber-500" }
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
          <p className="text-[11px] font-black uppercase tracking-wider text-neutral-400">
            ✨ Öne Çıkan Trend Kelimeler (Kelime Bulutu):
          </p>
          {istatistikler.enCokGecenKelimeler.length === 0 ? (
            <p className="text-xs font-bold text-neutral-400 py-2">Henüz kelime trendi tespit edilmedi.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {istatistikler.enCokGecenKelimeler.map((kelime) => (
                <button
                  key={kelime}
                  onClick={() => onKelimeSec(kelime)}
                  className="px-2.5 py-1 rounded-xl text-xs font-black bg-neutral-100 hover:bg-neutral-950 hover:text-white dark:bg-neutral-800 dark:hover:bg-white dark:hover:text-neutral-950 transition-all cursor-pointer border border-neutral-200 dark:border-neutral-700 active:scale-95"
                  title={`"${kelime}" kelimesine göre filtrele`}
                >
                  #{kelime}
                </button>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
