"use client";

import React, { useState } from "react";

export interface AltBaslik {
  baslik: string;
  maddeler: string[];
}

export interface ZihinHaritasiData {
  anaKonu: string;
  altBasliklar: AltBaslik[];
}

interface MindMapProps {
  zihinHaritasi?: ZihinHaritasiData;
  ozet?: string;
  kritikler?: string[];
  klasorAdi?: string;
}

export default function MindMap({
  zihinHaritasi,
  ozet,
  kritikler,
  klasorAdi,
}: MindMapProps) {
  const [acikDallar, setAcikDallar] = useState<{ [key: number]: boolean }>({
    0: true,
    1: true,
    2: true,
  });

  let harita: ZihinHaritasiData;

  if (zihinHaritasi && zihinHaritasi.anaKonu && zihinHaritasi.altBasliklar?.length > 0) {
    harita = zihinHaritasi;
  } else {
    // Rapor verilerinden dinamik zihin haritası türet
    harita = {
      anaKonu: klasorAdi ? `${klasorAdi} Ses Analiz Özeti` : "Ses Kaydı Zihin Haritası",
      altBasliklar: [
        {
          baslik: "Ana Konu & Özet Kararlar",
          maddeler: ozet ? [ozet] : ["Analiz edilen ana konular ve kararlar."],
        },
        {
          baslik: "Kritik Vurgular & Notlar",
          maddeler: kritikler && kritikler.length > 0 ? kritikler : ["Önemli tespitler."],
        },
      ],
    };
  }

  const dalAcKapa = (index: number) => {
    setAcikDallar((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-4 sm:p-6 space-y-6 shadow-3xs">
      
      {/* Üst Başlık */}
      <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-neutral-800 dark:text-neutral-200" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.516 0c.85.493 1.508 1.333 1.508 2.316V18" />
          </svg>
          <h4 className="text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-white">
            Otomatik Görsel Zihin Haritası (Mind Map)
          </h4>
        </div>
        <span className="text-[10px] font-bold text-neutral-400">
          Kavram & Başlık Ağacı
        </span>
      </div>

      {/* 🌳 GÖRSEL AĞAÇ DİYAGRAMI (CONCEPT TREE GRID) */}
      <div className="flex flex-col items-center space-y-4">
        
        {/* 1. KÖK DÜĞÜM (ROOT NODE) */}
        <div className="px-5 py-3 rounded-2xl bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 text-xs font-black tracking-wide shadow-md border border-neutral-950 dark:border-white text-center max-w-md flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-400 dark:text-amber-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
          </svg>
          <span>{harita.anaKonu}</span>
        </div>

        {/* Bağlantı Dikey Çizgisi */}
        <div className="w-0.5 h-6 bg-neutral-300 dark:bg-neutral-700" />

        {/* 2. DALLAR (BRANCH NODES) */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 relative">
          {harita.altBasliklar.map((dal, idx) => {
            const isAcik = acikDallar[idx] !== false;

            return (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-3 shadow-2xs hover:border-neutral-300 dark:hover:border-neutral-700 transition-all flex flex-col justify-between"
              >
                {/* Dal Başlığı ve Aç/Kapa Butonu */}
                <div
                  onClick={() => dalAcKapa(idx)}
                  className="flex items-center justify-between gap-2 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white text-xs font-black flex items-center justify-center border border-neutral-200 dark:border-neutral-700">
                      {idx + 1}
                    </span>
                    <h5 className="text-xs font-black text-neutral-900 dark:text-white leading-tight">
                      {dal.baslik}
                    </h5>
                  </div>

                  <button className="p-1 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">
                    <svg
                      className={`w-4 h-4 transition-transform duration-200 ${isAcik ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>
                </div>

                {/* Dal İçerik Maddeleri (Yaprak Düğümleri) */}
                {isAcik && (
                  <div className="space-y-1.5 pt-1 border-t border-neutral-100 dark:border-neutral-800 animate-fadeIn">
                    {dal.maddeler.map((madde, mIdx) => (
                      <div
                        key={mIdx}
                        className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-100 dark:border-neutral-800 text-xs font-semibold text-neutral-800 dark:text-neutral-200 flex items-start gap-2 leading-relaxed"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 dark:bg-neutral-600 mt-1.5 shrink-0" />
                        <span>{madde}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
}
