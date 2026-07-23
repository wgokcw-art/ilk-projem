"use client";

import React, { useState } from "react";

export interface DilSecenek {
  kod: string;
  ad: string;
  flag: string;
}

export const DILLER: DilSecenek[] = [
  { kod: "tr", ad: "Türkçe", flag: "🇹🇷" },
  { kod: "en", ad: "English", flag: "🇬🇧" },
  { kod: "de", ad: "Deutsch", flag: "🇩🇪" },
  { kod: "es", ad: "Español", flag: "🇪🇸" },
  { kod: "fr", ad: "Français", flag: "🇫🇷" },
  { kod: "it", ad: "Italiano", flag: "🇮🇹" },
  { kod: "ru", ad: "Русский", flag: "🇷🇺" },
];

interface DilCeviriBarProps {
  orijinalRapor: any;
  onRaporGuncelle: (yeniRapor: any) => void;
}

export default function DilCeviriBar({
  orijinalRapor,
  onRaporGuncelle,
}: DilCeviriBarProps) {
  const [aktifDil, setAktifDil] = useState<string>("tr");
  const [ceviriliyor, setCeviriliyor] = useState<boolean>(false);
  const [ceviriCache, setCeviriCache] = useState<{ [key: string]: any }>({
    tr: orijinalRapor,
  });

  const dilDegistir = async (hedefDilObj: DilSecenek) => {
    if (hedefDilObj.kod === aktifDil || ceviriliyor) return;

    setAktifDil(hedefDilObj.kod);

    // Eğer önbellekte varsa doğrudan kullan
    if (ceviriCache[hedefDilObj.kod]) {
      onRaporGuncelle(ceviriCache[hedefDilObj.kod]);
      return;
    }

    // Türkçe orijinalse doğrudan orijinali yükle
    if (hedefDilObj.kod === "tr") {
      onRaporGuncelle(orijinalRapor);
      return;
    }

    // Yapay zeka ile çeviri isteği atalım
    try {
      setCeviriliyor(true);
      const res = await fetch("/api/analiz-et", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "cevir",
          rapor: orijinalRapor,
          hedefDil: hedefDilObj.ad,
        }),
      });

      if (!res.ok) {
        throw new Error("Çeviri isteği başarısız oldu.");
      }

      const cevrilenData = await res.json();
      const birlesikRapor = { ...orijinalRapor, ...cevrilenData };

      setCeviriCache((prev) => ({ ...prev, [hedefDilObj.kod]: birlesikRapor }));
      onRaporGuncelle(birlesikRapor);
    } catch (err) {
      console.error("Dil çevirisi hatası:", err);
      alert("Yapay zeka çevirisi oluşturulurken bir hata oluştu.");
      setAktifDil("tr");
      onRaporGuncelle(orijinalRapor);
    } finally {
      setCeviriliyor(false);
    }
  };

  return (
    <div className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-3xs">
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 text-neutral-700 dark:text-neutral-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="m10.5 21 5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 0 1 6-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m0 2.25c0 1.954-.35 3.82-1 5.5m-3.5-1.551a31.42 31.42 0 0 1 4.5 4.5" />
        </svg>
        <span className="text-[11px] font-black uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
          Çoklu Dil Çevirisi (Bilingual AI)
        </span>
      </div>

      {/* Dil Bayrakları ve Butonları */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {DILLER.map((dil) => {
          const isSelected = aktifDil === dil.kod;
          return (
            <button
              key={dil.kod}
              onClick={() => dilDegistir(dil)}
              disabled={ceviriliyor}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer border ${
                isSelected
                  ? "bg-neutral-950 text-white border-neutral-950 dark:bg-white dark:text-neutral-950 dark:border-white shadow-xs"
                  : "bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-100 dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
              }`}
            >
              <span>{dil.flag}</span>
              <span>{dil.ad}</span>
              {isSelected && ceviriliyor && (
                <span className="w-2 h-2 rounded-full bg-white dark:bg-neutral-950 animate-ping" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
