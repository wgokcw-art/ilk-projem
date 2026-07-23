"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";

export default function Linkler({ karanlikMod }: { karanlikMod: boolean }) {
  const router = useRouter();
  const pathname = usePathname(); // Şu an hangi sayfada olduğumuzu anlar

  // Menü elemanları ve gidecekleri sayfa yolları
  const menuItems = [
    { ad: "Ana Sayfa", yol: "/" },
    { ad: "Gelen Kutusu", yol: "/gelen-kutusu" },
    { ad: "Toplantılar", yol: "/toplantilar" },
    { ad: "Takvim", yol: "/takvim" },
    { ad: "Ders Notları", yol: "/ders-notlari" },
    { ad: "Günlük", yol: "/gunluk" },
    { ad: "Çöp Kutusu", yol: "/cop-kutusu" },
    { ad: "Profil", yol: "/profil" }
  ];

  return (
    <div className="hidden md:flex items-center gap-1 bg-transparent p-1">
      {menuItems.map((item) => {
        // Eğer tarayıcıdaki adres ile menünün adresi eşleşiyorsa o buton AKTİFTİR
        const isActive = pathname === item.yol;

        return (
          <button
            key={item.yol}
            onClick={() => router.push(item.yol)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 active:scale-95 cursor-pointer ${
              isActive
                ? "bg-neutral-950 text-white" // Aydınlık modda siyah baloncuk, beyaz yazı
                : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
            }`}
            // 🎯 KRİTİK FİLTRE: Eğer buton aktifse ve globals.css içindeki html.dark invert filtresi devredeyse,
            // bu inline style filtreyi tersine çevirerek butonu BEBEYAZ BALONCUK, yazıyı da SİMSİYAH yapar.
            style={isActive ? { filter: "invert(1) hue-rotate(180deg)" } : undefined}
          >
            {item.ad}
          </button>
        );
      })}
    </div>
  );
}