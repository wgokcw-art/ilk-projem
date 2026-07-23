"use client";

import React from "react";

export interface KonusmaciBilgi {
  isim: string;
  yuzde: number;
  rol: string;
  aciklama?: string;
}

interface KonusmaciAnalizPaneliProps {
  konusmaciAnalizi?: KonusmaciBilgi[];
  transkriptZamanli?: Array<{ konusan: string; metin: string }>;
}

const RENKLER = [
  "bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 border-neutral-950 dark:border-white",
  "bg-indigo-600 text-white border-indigo-600",
  "bg-emerald-600 text-white border-emerald-600",
  "bg-amber-500 text-white border-amber-500",
  "bg-purple-600 text-white border-purple-600",
];

const RENK_BARLARI = [
  "bg-neutral-950 dark:bg-white",
  "bg-indigo-600 dark:bg-indigo-400",
  "bg-emerald-500 dark:bg-emerald-400",
  "bg-amber-500 dark:bg-amber-400",
  "bg-purple-600 dark:bg-purple-400",
];

export default function KonusmaciAnalizPaneli({
  konusmaciAnalizi,
  transkriptZamanli,
}: KonusmaciAnalizPaneliProps) {
  let veriler: KonusmaciBilgi[] = [];

  if (konusmaciAnalizi && konusmaciAnalizi.length > 0) {
    veriler = konusmaciAnalizi;
  } else if (transkriptZamanli && transkriptZamanli.length > 0) {
    // Transkriptten dinamik kelime sayısı hesapla
    const harita: { [key: string]: number } = {};
    let toplamKelime = 0;

    transkriptZamanli.forEach((item) => {
      const k = item.konusan || "Konuşmacı 1";
      const kelimeSayisi = (item.metin || "").trim().split(/\s+/).length;
      harita[k] = (harita[k] || 0) + kelimeSayisi;
      toplamKelime += kelimeSayisi;
    });

    veriler = Object.keys(harita).map((k, index) => {
      const yuzde = toplamKelime > 0 ? Math.round((harita[k] / toplamKelime) * 100) : 50;
      let rol = "Katılımcı";
      if (index === 0 && yuzde > 50) rol = "Ana Konuşmacı / Sunucu";
      else if (itemMiSoruMu(transkriptZamanli, k)) rol = "Soru Soran / Yönlendirici";

      return {
        isim: k,
        yuzde,
        rol,
        aciklama: `Toplam konuşma süresinin %${yuzde}'sini kapladı.`,
      };
    });
  } else {
    // Varsayılan mock veri
    veriler = [
      {
        isim: "Konuşmacı 1",
        yuzde: 65,
        rol: "Ana Sunucu / Yönlendirici",
        aciklama: "Toplantı kararlarını ve sunumu gerçekleştirdi.",
      },
      {
        isim: "Konuşmacı 2",
        yuzde: 35,
        rol: "Katılımcı / Soru Soran",
        aciklama: "Geri bildirim verdi ve sorular sordu.",
      },
    ];
  }

  function itemMiSoruMu(arr: Array<{ konusan: string; metin: string }>, isim: string) {
    const metinler = arr.filter((x) => x.konusan === isim).map((x) => x.metin).join(" ");
    return (metinler.match(/\?/g) || []).length > 1;
  }

  return (
    <div className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-4 sm:p-5 space-y-4 shadow-3xs">
      
      {/* Başlık */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-neutral-800 dark:text-neutral-200" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
          </svg>
          <h4 className="text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-white">
            Konuşmacı İletişim & Süre Analizi (Talk-Time)
          </h4>
        </div>
        <span className="text-[10px] font-bold text-neutral-400">
          Diyalog Oranı & Rol Dağılımı
        </span>
      </div>

      {/* 📊 Görsel Parçalı Süre Çubuğu (Segmented Progress Bar) */}
      <div className="space-y-1.5">
        <div className="w-full h-3 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-800 flex shadow-inner">
          {veriler.map((k, idx) => (
            <div
              key={idx}
              style={{ width: `${k.yuzde}%` }}
              className={`h-full transition-all duration-500 ${RENK_BARLARI[idx % RENK_BARLARI.length]}`}
              title={`${k.isim}: %${k.yuzde}`}
            />
          ))}
        </div>
        
        <div className="flex items-center justify-between text-[10px] font-extrabold text-neutral-400">
          <span>0%</span>
          <span>Konuşma Süresi Dağılımı</span>
          <span>100%</span>
        </div>
      </div>

      {/* 👤 Konuşmacı Rol & Detay Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {veriler.map((k, idx) => (
          <div
            key={idx}
            className="p-3 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex flex-col justify-between gap-2 shadow-2xs"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${RENKLER[idx % RENKLER.length]}`}>
                  {k.isim.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h5 className="text-xs font-black text-neutral-900 dark:text-white leading-tight">
                    {k.isim}
                  </h5>
                  <span className="text-[10px] font-extrabold text-neutral-400">
                    %{k.yuzde} Konuşma Süresi
                  </span>
                </div>
              </div>

              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                {k.rol}
              </span>
            </div>

            {k.aciklama && (
              <p className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-300 leading-snug">
                {k.aciklama}
              </p>
            )}
          </div>
        ))}
      </div>

    </div>
  );
}
