"use client";

import React, { useState } from "react";

interface TakvimHatirlaticiModalProps {
  gorevBasligi: string;
  onClose: () => void;
}

export default function TakvimHatirlaticiModal({
  gorevBasligi,
  onClose,
}: TakvimHatirlaticiModalProps) {
  // Varsayılan olarak yarın saat 10:00
  const yarin = new Date();
  yarin.setDate(yarin.getDate() + 1);
  const varsayilanTarih = yarin.toISOString().split("T")[0];

  const [tarih, setTarih] = useState(varsayilanTarih);
  const [saat, setSaat] = useState("10:00");
  const [not, setNot] = useState("Ses Asistanı yapay zeka tarafından oluşturulan görev.");

  // Tarih ve Saati JavaScript Date Nesnesine Çevir
  const getBaslangicVeBitisTarihi = () => {
    const [yil, ay, gun] = tarih.split("-").map(Number);
    const [saatVal, dkVal] = saat.split(":").map(Number);

    const baslangic = new Date(yil, ay - 1, gun, saatVal, dkVal);
    const bitis = new Date(baslangic.getTime() + 60 * 60 * 1000); // 1 saat sonra

    return { baslangic, bitis };
  };

  // 1. GOOGLE TAKVİM UYGULAMASINA AKTAR
  const googleTakvimeAktar = () => {
    const { baslangic, bitis } = getBaslangicVeBitisTarihi();

    const formatISO = (d: Date) =>
      d.toISOString().replace(/-|:|\.\d+/g, "");

    const startStr = formatISO(baslangic);
    const endStr = formatISO(bitis);

    const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      gorevBasligi
    )}&dates=${startStr}/${endStr}&details=${encodeURIComponent(not)}&sf=true&output=xml`;

    window.open(googleUrl, "_blank");
  };

  // 2. ICS (OUTLOOK / APPLE TAKVİM) DOSYASI İNDİR
  const icsDosyasiIndir = () => {
    const { baslangic, bitis } = getBaslangicVeBitisTarihi();

    const formatICSDate = (d: Date) => {
      return d.toISOString().replace(/-|:|\.\d+/g, "");
    };

    const icsIcerik = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Ses Asistani//TR",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      `SUMMARY:${gorevBasligi}`,
      `DESCRIPTION:${not}`,
      `DTSTART:${formatICSDate(baslangic)}`,
      `DTEND:${formatICSDate(bitis)}`,
      "STATUS:CONFIRMED",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([icsIcerik], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute("download", `gorev-${tarih}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-5">
        
        {/* Üst Başlık */}
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
          <h3 className="text-sm font-black flex items-center gap-2 text-neutral-900 dark:text-white">
            <svg className="w-4 h-4 text-neutral-800 dark:text-neutral-200" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
            Takvim & Hatırlatıcı Ekle
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-neutral-400 hover:text-neutral-800 dark:hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Görev İsmi Kartı */}
        <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-100 dark:border-neutral-850">
          <p className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">Görev Başlığı</p>
          <p className="text-xs font-bold text-neutral-900 dark:text-white mt-0.5 leading-snug">{gorevBasligi}</p>
        </div>

        {/* Form Alanları */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-neutral-400">Son Tarih</label>
            <input
              type="date"
              value={tarih}
              onChange={(e) => setTarih(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-neutral-400">Saat</label>
            <input
              type="time"
              value={saat}
              onChange={(e) => setSaat(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase text-neutral-400">Açıklama / Not</label>
          <input
            type="text"
            value={not}
            onChange={(e) => setNot(e.target.value)}
            className="w-full px-3 py-2 text-xs font-bold bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none"
          />
        </div>

        {/* Aksiyon Butonları */}
        <div className="space-y-2 pt-2">
          {/* Google Takvim Butonu */}
          <button
            type="button"
            onClick={googleTakvimeAktar}
            className="w-full py-2.5 px-4 rounded-xl bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 text-xs font-black hover:opacity-90 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
            <span>Google Takvim'e Aktar</span>
          </button>

          {/* iCal .ics İndir Butonu */}
          <button
            type="button"
            onClick={icsDosyasiIndir}
            className="w-full py-2.5 px-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-black hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            <span>Apple / Outlook Takvim İndir (.ics)</span>
          </button>
        </div>

      </div>
    </div>
  );
}
