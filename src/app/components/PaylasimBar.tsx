"use client";

import { useState } from "react";

interface PaylasimBarProps {
  rapor: {
    sesAdi: string;
    sureBilgisi?: string;
    metin: string;
    kritikYerler?: string[];
    sinavdaCikabilir?: string[];
    modAnalizi?: string[];
    ozetTanimlar?: string[];
    formuller?: string[];
    actionItems?: string[];
    speakers?: { speaker: string; text: string }[];
    sentiment?: string;
    tone?: string;
  };
  klasorAdi: string;
}

export default function PaylasimBar({ rapor, klasorAdi }: PaylasimBarProps) {
  const [kopyalandi, setKopyalandi] = useState(false);

  // 📝 Metin Taslağı Oluşturucu
  const metinHazirla = () => {
    let metin = `🎙️ SES ASİSTANI ANALİZ RAPORU\n`;
    metin += `📁 Klasör: ${klasorAdi}\n`;
    metin += `📌 Kayıt: ${rapor.sesAdi}\n`;
    if (rapor.sentiment) metin += `🎭 Duygu: ${rapor.sentiment} (${rapor.tone || ''})\n`;
    metin += `\n📝 ÖZET:\n${rapor.metin}\n\n`;

    if (rapor.actionItems && rapor.actionItems.length > 0) {
      metin += `✅ YAPILACAK GÖREVLER (TO-DO):\n`;
      rapor.actionItems.forEach((g) => (metin += `• ${g}\n`));
      metin += `\n`;
    }

    const kritikListe = rapor.kritikYerler || rapor.sinavdaCikabilir || rapor.modAnalizi;
    if (kritikListe && kritikListe.length > 0) {
      metin += `⚡ KRİTİK NOKTALAR:\n`;
      kritikListe.forEach((k) => (metin += `• ${k}\n`));
      metin += `\n`;
    }

    if (rapor.speakers && rapor.speakers.length > 0) {
      metin += `👥 KONUŞMACI DİYALOGLARI:\n`;
      rapor.speakers.forEach((s) => (metin += `👤 ${s.speaker}: ${s.text}\n`));
      metin += `\n`;
    }

    metin += `--- Ses Asistanı Yapay Zeka Raporu ---`;
    return metin;
  };

  // 📄 1. PDF İNDİR / YAZDIR (PRINT-FRIENDLY MODAL / WINDOW)
  const pdfIndir = () => {
    const metin = metinHazirla();
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Lütfen taranızda pop-up engelleyicisini kapatın.");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${rapor.sesAdi} - Analiz Raporu</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #111; line-height: 1.6; }
            h1 { font-size: 22px; border-bottom: 2px solid #111; padding-bottom: 8px; margin-bottom: 20px; }
            .badge { display: inline-block; background: #eee; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-bottom: 20px; }
            .box { background: #f9f9f9; border: 1px solid #ddd; padding: 16px; border-radius: 12px; margin-bottom: 20px; }
            ul { padding-left: 20px; }
            li { margin-bottom: 6px; }
            .footer { font-size: 11px; text-align: center; margin-top: 40px; color: #777; border-top: 1px solid #eee; padding-top: 10px; }
          </style>
        </head>
        <body>
          <h1>🎙️ ${rapor.sesAdi}</h1>
          <div class="badge">Klasör: ${klasorAdi} ${rapor.sentiment ? `| Duygu: ${rapor.sentiment}` : ""}</div>

          <div class="box">
            <h3>📝 Genel Özet</h3>
            <p>${rapor.metin}</p>
          </div>

          ${
            rapor.actionItems && rapor.actionItems.length > 0
              ? `<div class="box">
                  <h3>✅ Yapılacak Görevler</h3>
                  <ul>${rapor.actionItems.map((g) => `<li>${g}</li>`).join("")}</ul>
                 </div>`
              : ""
          }

          ${
            rapor.kritikYerler && rapor.kritikYerler.length > 0
              ? `<div class="box">
                  <h3>⚡ Kritik Noktalar</h3>
                  <ul>${rapor.kritikYerler.map((k) => `<li>${k}</li>`).join("")}</ul>
                 </div>`
              : ""
          }

          ${
            rapor.speakers && rapor.speakers.length > 0
              ? `<div class="box">
                  <h3>👥 Konuşmacı Diyalogları</h3>
                  ${rapor.speakers.map((s) => `<p><strong>${s.speaker}:</strong> ${s.text}</p>`).join("")}
                 </div>`
              : ""
          }

          <div class="footer">Ses Asistanı Yapay Zeka Raporu • ${new Date().toLocaleDateString('tr-TR')}</div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // 💬 2. WHATSAPP İLE PAYLAŞ
  const whatsappPaylas = () => {
    const metin = metinHazirla();
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(metin)}`;
    window.open(url, "_blank");
  };

  // ✉️ 3. E-POSTA İLE GÖNDER
  const epostaPaylas = () => {
    const metin = metinHazirla();
    const konu = `Ses Asistanı Analiz Raporu: ${rapor.sesAdi}`;
    const url = `mailto:?subject=${encodeURIComponent(konu)}&body=${encodeURIComponent(metin)}`;
    window.location.href = url;
  };

  // 📋 4. PANOYA KOPYALA
  const panoyaKopyala = () => {
    const metin = metinHazirla();
    navigator.clipboard.writeText(metin).then(() => {
      setKopyalandi(true);
      setTimeout(() => setKopyalandi(false), 2500);
    });
  };

  return (
    <div className="w-full pt-3 pb-2 border-t border-b border-neutral-100 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-2">
      <span className="text-[11px] font-black uppercase tracking-wider text-neutral-400">
        📤 Dışa Aktar & Paylaş:
      </span>

      <div className="flex items-center gap-1.5 flex-wrap">
        {/* PDF İNDİR */}
        <button
          type="button"
          onClick={pdfIndir}
          className="px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/60 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
          title="Raporu PDF olarak indir veya yazdır"
        >
          <span>📄</span>
          <span>PDF İndir</span>
        </button>

        {/* WHATSAPP */}
        <button
          type="button"
          onClick={whatsappPaylas}
          className="px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/60 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
          title="WhatsApp üzerinden özet paylaş"
        >
          <span>💬</span>
          <span>WhatsApp</span>
        </button>

        {/* E-POSTA */}
        <button
          type="button"
          onClick={epostaPaylas}
          className="px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/60 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
          title="E-posta ile gönder"
        >
          <span>✉️</span>
          <span>E-posta</span>
        </button>

        {/* PANOYA KOPYALA */}
        <button
          type="button"
          onClick={panoyaKopyala}
          className="px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-bold hover:bg-neutral-200 dark:hover:bg-neutral-700 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
          title="Tüm raporu metin olarak kopyala"
        >
          <span>📋</span>
          <span>{kopyalandi ? "Kopyalandı! ✅" : "Kopyala"}</span>
        </button>
      </div>
    </div>
  );
}
