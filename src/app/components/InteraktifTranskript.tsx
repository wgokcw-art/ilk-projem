"use client";

import React, { useState } from "react";

export interface TranskriptSatiri {
  zaman: number; // saniye cinsinden
  metin: string;
  konusan?: string;
}

interface InteraktifTranskriptProps {
  metinParcalari?: TranskriptSatiri[];
  duzMetin?: string;
  isaretler?: Array<{ zaman: number; etiket: string }>;
  mevcutZaman: number;
  onZamanaAtla: (zaman: number) => void;
}

export default function InteraktifTranskript({
  metinParcalari,
  duzMetin,
  isaretler,
  mevcutZaman,
  onZamanaAtla,
}: InteraktifTranskriptProps) {
  const [aramaMetni, setAramaMetni] = useState("");

  // Metin parçaları yoksa ama düz metin varsa, düz metni cümlelere bölüp varsayılan zaman etiketi oluşturalım
  const satirlar: TranskriptSatiri[] = React.useMemo(() => {
    if (metinParcalari && metinParcalari.length > 0) {
      return metinParcalari;
    }

    if (!duzMetin) return [];

    // Cümle bazlı ayrıştırma
    const cumleler = duzMetin
      .split(/(?<=[.!?])\s+/)
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    // Eşit veya işaretlere dayalı zaman dağılımı
    const tahminiSurePerCumle = 5; // Ortalama 5 saniye per cümle
    return cumleler.map((c, index) => ({
      zaman: index * tahminiSurePerCumle,
      metin: c,
    }));
  }, [metinParcalari, duzMetin]);

  // Arama filtresi
  const filtrelenmisSatirlar = satirlar.filter((item) =>
    item.metin.toLowerCase().includes(aramaMetni.toLowerCase()) ||
    (item.konusan && item.konusan.toLowerCase().includes(aramaMetni.toLowerCase()))
  );

  const formatSure = (sn: number) => {
    const d = Math.floor(sn / 60);
    const s = Math.floor(sn % 60);
    return `${d.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (satirlar.length === 0) return null;

  return (
    <div className="w-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-3xl p-4 sm:p-5 space-y-4 shadow-sm">
      
      {/* Üst Başlık & Arama Kutusu */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-neutral-800 dark:text-neutral-200" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
          </svg>
          <h3 className="text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-white">
            İnteraktif Transkript (Zamana Tıkla & Dinle)
          </h3>
        </div>

        {/* Transkript İçi Arama */}
        <div className="relative w-full sm:w-56">
          <input
            type="text"
            placeholder="Transkript içinde ara..."
            value={aramaMetni}
            onChange={(e) => setAramaMetni(e.target.value)}
            className="w-full pl-7 pr-3 py-1 text-[11px] font-bold bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none placeholder-neutral-400"
          />
          <svg className="w-3.5 h-3.5 text-neutral-400 absolute left-2 top-1.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.603 10.602Z" />
          </svg>
        </div>
      </div>

      {/* Cümle Parçaları Akış Listesi */}
      <div className="space-y-2 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
        {filtrelenmisSatirlar.map((satir, idx) => {
          // Sonraki satırın zamanına kadar aktif tut
          const sonrakiZaman = satirlar[idx + 1] ? satirlar[idx + 1].zaman : satir.zaman + 10;
          const isAktif = mevcutZaman >= satir.zaman && mevcutZaman < sonrakiZaman;

          return (
            <div
              key={idx}
              onClick={() => onZamanaAtla(satir.zaman)}
              className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 text-xs font-semibold ${
                isAktif
                  ? "bg-neutral-950 text-white border-neutral-950 dark:bg-white dark:text-neutral-950 dark:border-white shadow-md scale-[1.01]"
                  : "bg-neutral-50 border-neutral-100 text-neutral-800 hover:bg-neutral-100 dark:bg-neutral-950 dark:border-neutral-850 dark:text-neutral-200 dark:hover:bg-neutral-800/80"
              }`}
            >
              {/* Zaman Butonu */}
              <span
                className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-black shrink-0 ${
                  isAktif
                    ? "bg-white/20 text-white dark:bg-neutral-900/20 dark:text-neutral-900"
                    : "bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300"
                }`}
              >
                {formatSure(satir.zaman)}
              </span>

              {/* Konuşmacı Varsa */}
              <div className="flex-1 space-y-0.5">
                {satir.konusan && (
                  <span
                    className={`text-[9px] font-black uppercase tracking-wider block ${
                      isAktif ? "text-neutral-300 dark:text-neutral-700" : "text-neutral-400"
                    }`}
                  >
                    {satir.konusan}
                  </span>
                )}
                <p className="leading-relaxed">{satir.metin}</p>
              </div>

              {/* Çalma İndikatör Simgesi */}
              {isAktif && (
                <span className="shrink-0 flex items-center gap-0.5 mt-0.5">
                  <span className="w-1 h-3 bg-current rounded-full animate-pulse" />
                  <span className="w-1 h-4 bg-current rounded-full animate-pulse delay-75" />
                  <span className="w-1 h-2 bg-current rounded-full animate-pulse delay-150" />
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
