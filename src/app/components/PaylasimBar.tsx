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
    let metin = `SES ASİSTANI ANALİZ RAPORU\n`;
    metin += `Klasör: ${klasorAdi}\n`;
    metin += `Kayıt: ${rapor.sesAdi}\n`;
    if (rapor.sentiment) metin += `Duygu: ${rapor.sentiment} (${rapor.tone || ''})\n`;
    metin += `\nÖZET:\n${rapor.metin}\n\n`;

    if (rapor.actionItems && rapor.actionItems.length > 0) {
      metin += `YAPILACAK GÖREVLER (TO-DO):\n`;
      rapor.actionItems.forEach((g) => (metin += `• ${g}\n`));
      metin += `\n`;
    }

    const kritikListe = rapor.kritikYerler || rapor.sinavdaCikabilir || rapor.modAnalizi;
    if (kritikListe && kritikListe.length > 0) {
      metin += `KRİTİK NOKTALAR:\n`;
      kritikListe.forEach((k) => (metin += `• ${k}\n`));
      metin += `\n`;
    }

    if (rapor.speakers && rapor.speakers.length > 0) {
      metin += `KONUŞMACI DİYALOGLARI:\n`;
      rapor.speakers.forEach((s) => (metin += `• ${s.speaker}: ${s.text}\n`));
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
      alert("Lütfen tarağınızda pop-up engelleyicisini kapatın.");
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
          <h1>${rapor.sesAdi}</h1>
          <div class="badge">Klasör: ${klasorAdi} ${rapor.sentiment ? `| Duygu: ${rapor.sentiment}` : ""}</div>

          <div class="box">
            <h3>Genel Özet</h3>
            <p>${rapor.metin}</p>
          </div>

          ${
            rapor.actionItems && rapor.actionItems.length > 0
              ? `<div class="box">
                  <h3>Yapılacak Görevler</h3>
                  <ul>${rapor.actionItems.map((g) => `<li>${g}</li>`).join("")}</ul>
                 </div>`
              : ""
          }

          ${
            rapor.kritikYerler && rapor.kritikYerler.length > 0
              ? `<div class="box">
                  <h3>Kritik Noktalar</h3>
                  <ul>${rapor.kritikYerler.map((k) => `<li>${k}</li>`).join("")}</ul>
                 </div>`
              : ""
          }

          ${
            rapor.speakers && rapor.speakers.length > 0
              ? `<div class="box">
                  <h3>Konuşmacı Diyalogları</h3>
                  ${rapor.speakers.map((s) => `<p><strong>${s.speaker}:</strong> ${s.text}</p>`).join("")}
                 </div>`
              : ""
          }

          <div class="footer">Ses Asistanı Raporu • ${new Date().toLocaleDateString('tr-TR')}</div>
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
      <span className="text-[11px] font-black uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
        <svg className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
        Dışa Aktar & Paylaş
      </span>

      <div className="flex items-center gap-1.5 flex-wrap">
        {/* PDF İNDİR */}
        <button
          type="button"
          onClick={pdfIndir}
          className="px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 text-xs font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 active:scale-95 hover:scale-105 transition-all flex items-center gap-1.5 cursor-pointer shadow-3xs interactive-btn"
          title="Yazdır veya PDF olarak kaydet"
        >
          <svg className="w-3.5 h-3.5 text-neutral-700 dark:text-neutral-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
          <span>PDF İndir</span>
        </button>

        {/* WHATSAPP */}
        <button
          type="button"
          onClick={whatsappPaylas}
          className="px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 text-xs font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 active:scale-95 hover:scale-105 transition-all flex items-center gap-1.5 cursor-pointer shadow-3xs interactive-btn"
          title="WhatsApp üzerinden özet paylaş"
        >
          <svg className="w-3.5 h-3.5 text-neutral-700 dark:text-neutral-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
          </svg>
          <span>WhatsApp</span>
        </button>

        {/* E-POSTA */}
        <button
          type="button"
          onClick={epostaPaylas}
          className="px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 text-xs font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 active:scale-95 hover:scale-105 transition-all flex items-center gap-1.5 cursor-pointer shadow-3xs interactive-btn"
          title="E-posta ile gönder"
        >
          <svg className="w-3.5 h-3.5 text-neutral-700 dark:text-neutral-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
          </svg>
          <span>E-posta</span>
        </button>

        {/* PANOYA KOPYALA */}
        <button
          type="button"
          onClick={panoyaKopyala}
          className="px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 text-xs font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 active:scale-95 hover:scale-105 transition-all flex items-center gap-1.5 cursor-pointer shadow-3xs interactive-btn"
          title="Tüm raporu metin olarak kopyala"
        >
          <svg className="w-3.5 h-3.5 text-neutral-700 dark:text-neutral-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 1.927-.184" />
          </svg>
          <span>{kopyalandi ? "Kopyalandı! ✓" : "Kopyala"}</span>
        </button>
      </div>
    </div>
  );
}
