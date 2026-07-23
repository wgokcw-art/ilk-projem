"use client";

import React, { useState } from "react";

export interface TakvimEtkinlik {
  id: string;
  baslik: string;
  tarih: string; // YYYY-MM-DD
  saat?: string;
  klasor?: string;
  sesAdi?: string;
}

interface VisualCalendarProps {
  etkinlikler: TakvimEtkinlik[];
  onEtkinlikEkle: (baslik: string, tarih: string) => void;
  onTakvimeAktar: (etkinlik: TakvimEtkinlik) => void;
}

const AY_ISIMLERI = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
];

const GUN_ISIMLERI = ["Pzt", "Sal", "Çrş", "Prş", "Cum", "Cmt", "Paz"];

export default function VisualCalendar({
  etkinlikler,
  onEtkinlikEkle,
  onTakvimeAktar,
}: VisualCalendarProps) {
  const bugun = new Date();
  const [mevcutTarih, setMevcutTarih] = useState(new Date(bugun.getFullYear(), bugun.getMonth(), 1));
  const [seciliGunStr, setSeciliGunStr] = useState<string>(bugun.toISOString().split("T")[0]);
  const [yeniGorevMetni, setYeniGorevMetni] = useState("");

  const mevcutYil = mevcutTarih.getFullYear();
  const mevcutAy = mevcutTarih.getMonth();

  // Ayın ilk ve son günü
  const ayinIlkGunu = new Date(mevcutYil, mevcutAy, 1);
  const ayinSonGunu = new Date(mevcutYil, mevcutAy + 1, 0);

  // Pazartesi haftanın 1. günü olsun (JS'de Pazar 0, Pazartesi 1)
  let ilkGunHaftaIndex = ayinIlkGunu.getDay() - 1;
  if (ilkGunHaftaIndex === -1) ilkGunHaftaIndex = 6; // Pazar günüyse en sona al

  const toplamGunSayisi = ayinSonGunu.getDate();

  // Önceki aydan kaç gün görünecek
  const oncekiAySonGunu = new Date(mevcutYil, mevcutAy, 0).getDate();

  // Izgara hücrelerini oluşturalım
  const gunHucreleri = [];

  // Önceki ayın dolgu günleri
  for (let i = ilkGunHaftaIndex - 1; i >= 0; i--) {
    const gunNum = oncekiAySonGunu - i;
    gunHucreleri.push({
      gunNum,
      isMevcutAy: false,
      dateStr: "",
    });
  }

  // Mevcut ayın günleri
  for (let i = 1; i <= toplamGunSayisi; i++) {
    const ayStr = (mevcutAy + 1).toString().padStart(2, "0");
    const gunStr = i.toString().padStart(2, "0");
    const dateStr = `${mevcutYil}-${ayStr}-${gunStr}`;

    gunHucreleri.push({
      gunNum: i,
      isMevcutAy: true,
      dateStr,
    });
  }

  // Sonraki ayın dolgu günleri (Toplam 35 veya 42 hücreye tamamla)
  const kalanHucre = (7 - (gunHucreleri.length % 7)) % 7;
  for (let i = 1; i <= kalanHucre; i++) {
    gunHucreleri.push({
      gunNum: i,
      isMevcutAy: false,
      dateStr: "",
    });
  }

  // Ay Değiştirme
  const oncekiAy = () => {
    setMevcutTarih(new Date(mevcutYil, mevcutAy - 1, 1));
  };

  const sonrakiAy = () => {
    setMevcutTarih(new Date(mevcutYil, mevcutAy + 1, 1));
  };

  const buguneGit = () => {
    const simdi = new Date();
    setMevcutTarih(new Date(simdi.getFullYear(), simdi.getMonth(), 1));
    setSeciliGunStr(simdi.toISOString().split("T")[0]);
  };

  // Seçili güne ait etkinlikler
  const seciliGunEtkinlikleri = etkinlikler.filter(
    (e) => e.tarih === seciliGunStr
  );

  const bugunStr = bugun.toISOString().split("T")[0];

  const handleHizliEkle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!yeniGorevMetni.trim()) return;
    onEtkinlikEkle(yeniGorevMetni.trim(), seciliGunStr);
    setYeniGorevMetni("");
  };

  return (
    <div className="w-full space-y-6">
      
      {/* 🗓️ GÖRSEL TAKVİM KUTUSU */}
      <div className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
        
        {/* Takvim Üst Başlığı & Ay Navigasyonu */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-black tracking-tight text-neutral-900 dark:text-white">
              {AY_ISIMLERI[mevcutAy]} {mevcutYil}
            </h2>
            <button
              onClick={buguneGit}
              className="px-2.5 py-1 rounded-xl text-[10px] font-extrabold uppercase bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200 transition-all cursor-pointer"
            >
              Bugün
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={oncekiAy}
              className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all text-neutral-700 dark:text-neutral-300"
              aria-label="Önceki Ay"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            <button
              onClick={sonrakiAy}
              className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all text-neutral-700 dark:text-neutral-300"
              aria-label="Sonraki Ay"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        </div>

        {/* Gün İsimleri Başlık İçi (Pzt, Sal...) */}
        <div className="grid grid-cols-7 text-center">
          {GUN_ISIMLERI.map((gun, i) => (
            <span key={i} className="text-[11px] font-black uppercase text-neutral-400 py-1">
              {gun}
            </span>
          ))}
        </div>

        {/* Aylık Günler Izgarası (Grid View 7 Columns) */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {gunHucreleri.map((hucre, index) => {
            if (!hucre.isMevcutAy) {
              return (
                <div
                  key={index}
                  className="min-h-[50px] sm:min-h-[64px] p-2 rounded-2xl border border-transparent text-neutral-300 dark:text-neutral-700 text-xs font-bold flex flex-col justify-between opacity-40 select-none"
                >
                  <span>{hucre.gunNum}</span>
                </div>
              );
            }

            const isBugun = hucre.dateStr === bugunStr;
            const isSecili = hucre.dateStr === seciliGunStr;
            const gunEtkinlikleri = etkinlikler.filter((e) => e.tarih === hucre.dateStr);
            const etkinlikVar = gunEtkinlikleri.length > 0;

            return (
              <div
                key={index}
                onClick={() => setSeciliGunStr(hucre.dateStr)}
                className={`min-h-[50px] sm:min-h-[64px] p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative group ${
                  isSecili
                    ? "bg-neutral-950 text-white border-neutral-950 dark:bg-white dark:text-neutral-950 dark:border-white shadow-md scale-[1.02]"
                    : isBugun
                    ? "bg-neutral-100 border-neutral-300 dark:bg-neutral-800 dark:border-neutral-600 text-neutral-900 dark:text-white"
                    : "bg-neutral-50/70 border-neutral-200/80 hover:bg-neutral-100 dark:bg-neutral-950 dark:border-neutral-800/80 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-black w-6 h-6 rounded-full flex items-center justify-center ${
                      isBugun
                        ? isSecili
                          ? "bg-white text-neutral-950 dark:bg-neutral-950 dark:text-white"
                          : "bg-neutral-950 text-white dark:bg-white dark:text-neutral-950"
                        : ""
                    }`}
                  >
                    {hucre.gunNum}
                  </span>

                  {etkinlikVar && (
                    <span
                      className={`text-[9px] font-black px-1.5 py-0.2 rounded-full ${
                        isSecili
                          ? "bg-white/20 text-white dark:bg-neutral-900/20 dark:text-neutral-900"
                          : "bg-neutral-950 text-white dark:bg-white dark:text-neutral-950"
                      }`}
                    >
                      {gunEtkinlikleri.length}
                    </span>
                  )}
                </div>

                {/* Etkinlik Varsa Alt Nokta Gösterimi */}
                {etkinlikVar && (
                  <div className="flex items-center gap-1 mt-1">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSecili ? "bg-white dark:bg-neutral-900 animate-ping" : "bg-neutral-900 dark:bg-white animate-pulse"
                      }`}
                    />
                    <span className="text-[9px] font-bold truncate hidden sm:inline max-w-[45px]">
                      {gunEtkinlikleri[0].baslik}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>

      {/* 📋 SEÇİLİ GÜNÜN DETAY AJANDASI VE GÖREV EKLEME */}
      <div className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-3">
          <div>
            <h3 className="text-sm font-black text-neutral-900 dark:text-white flex items-center gap-2">
              <svg className="w-4 h-4 text-neutral-800 dark:text-neutral-200" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
              </svg>
              {seciliGunStr} Tarihli Program & Ajanda ({seciliGunEtkinlikleri.length})
            </h3>
            <p className="text-xs font-semibold text-neutral-400 mt-0.5">
              Seçilen tarihe yeni görev ekleyebilir veya Google Takvim'e gönderebilirsiniz.
            </p>
          </div>
        </div>

        {/* Seçili Güne Görev Ekleme Formu */}
        <form onSubmit={handleHizliEkle} className="flex items-center gap-2">
          <input
            type="text"
            placeholder={`${seciliGunStr} gününe yeni görev / toplantı ekleyin...`}
            value={yeniGorevMetni}
            onChange={(e) => setYeniGorevMetni(e.target.value)}
            className="w-full px-4 py-2.5 text-xs font-bold bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700 rounded-2xl focus:outline-none placeholder-neutral-400"
          />
          <button
            type="submit"
            disabled={!yeniGorevMetni.trim()}
            className="px-4 py-2.5 rounded-2xl bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 text-xs font-black hover:opacity-90 active:scale-95 transition-all shadow-md disabled:opacity-50 whitespace-nowrap cursor-pointer flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>Ekle</span>
          </button>
        </form>

        {/* Seçili Günün Etkinlik Listesi */}
        {seciliGunEtkinlikleri.length === 0 ? (
          <div className="p-6 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl text-center text-xs font-bold text-neutral-400">
            {seciliGunStr} tarihinde henüz planlanmış bir etkinlik yok.
          </div>
        ) : (
          <div className="space-y-2.5">
            {seciliGunEtkinlikleri.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl border bg-neutral-50 dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3 shadow-2xs"
              >
                <div className="space-y-1">
                  <span className="px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-[9px] font-black uppercase text-neutral-700 dark:text-neutral-300">
                    {item.klasor || "Takvim Planı"}
                  </span>
                  <h4 className="text-xs font-bold text-neutral-900 dark:text-white">
                    {item.baslik}
                  </h4>
                  {item.sesAdi && (
                    <p className="text-[10px] font-semibold text-neutral-400 italic">
                      Kaynak: {item.sesAdi}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => onTakvimeAktar(item)}
                  className="px-3 py-2 rounded-xl bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 text-xs font-black hover:opacity-90 active:scale-95 transition-all shadow-xs flex items-center gap-1.5 shrink-0"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                  <span>Google / Outlook'a Gönder</span>
                </button>
              </div>
            ))}
          </div>
        )}

      </div>

    </div>
  );
}
