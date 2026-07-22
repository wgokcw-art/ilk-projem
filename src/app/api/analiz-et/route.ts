import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const maxDuration = 180;

const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey || "" });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sesUrl, klasor, mode, soru, transkript, ozet } = body;

    // 💬 MOD 1: AI CHATBOT (Ses Kaydı Hakkında Soru Sor)
    if (mode === "chat") {
      if (!soru) {
        return NextResponse.json({ error: "Lütfen bir soru belirtin." }, { status: 400 });
      }

      const chatPrompt = `Sen bu ses kaydının içeriği hakkında kullanıcıya yardımcı olan bir Yapay Zeka Asistanısın.
Bağlam Bilgileri:
- Klasör: ${klasor || "Genel"}
- Özet: ${ozet || "Yok"}
- Transkript / Detay: ${transkript || "Yok"}

Kullanıcı Sorduğu Soru: "${soru}"

Lütfen kullanıcıya kibar, net ve bilgilendirici bir Türkçe yanıt ver. Yanıtında ses içeriğindeki bilgilere sadık kal.`;

      try {
        const chatResponse = await ai.models.generateContent({
          model: "gemini-2.0-flash",
          contents: [
            {
              role: "user",
              parts: [{ text: chatPrompt }]
            }
          ]
        });

        return NextResponse.json({ cevap: chatResponse.text || "Sorunuza yanıt üretilemedi." });
      } catch (chatErr: any) {
        console.error("Chatbot API Hatası:", chatErr);
        let chatMesaj = chatErr.message || "Yapay zeka yanıt veremedi.";
        if (chatMesaj.includes("RESOURCE_EXHAUSTED") || chatMesaj.includes("429")) {
          chatMesaj = "Google API kota sınırına takıldı (429 Quota Exceeded). Lütfen aistudio.google.com üzerinden yeni bir anahtar alınız.";
        }
        return NextResponse.json({ cevap: `⚠️ ${chatMesaj}` });
      }
    }

    // 🎙️ MOD 2: MULTIMODAL SES ANALİZİ
    console.log("--- GEMINI MULTIMODAL SES ANALİZİ BAŞLADI ---");
    console.log("Gelen Klasör:", klasor);
    console.log("Gelen Ses Linki:", sesUrl);

    if (!sesUrl) {
      return NextResponse.json({ error: "Analiz edilecek ses linki bulunamadı." }, { status: 400 });
    }

    const sistemYonergesi = `Sen profesyonel bir ses asistanı ve veri analiz uzmanısın. 
Kullanıcı sana analiz edilmek üzere bir ses kaydı gönderecek. Bu metin "${klasor}" klasöründen geliyor.
Senden kesinlikle şu formatta, sadece saf bir JSON çıktısı vermeni istiyorum. Markdown kod blokları (\`\`\`json gibi) ekleme. Doğrudan süslü parantezle başla ve bitir:
{
  "ozet": "Ses kaydının detaylı, akıcı ve profesyonel bir özeti (en az 2-3 cümle)",
  "kritikler": ["Kritik Nokta 1", "Kritik Nokta 2", "Kritik Nokta 3"],
  "kritikYerler": ["Kritik Nokta 1", "Kritik Nokta 2", "Kritik Nokta 3"],
  "ozetTanimlar": ["Önemli Tanım 1", "Önemli Tanım 2"],
  "ekstra": ["Ekstra bilgi veya formül/kod bloğu 1", "Ekstra bilgi veya formül/kod bloğu 2"],
  "actionItems": ["Yapılacak Görev 1", "Yapılacak Görev 2", "Yapılacak Görev 3"],
  "speakers": [
    { "speaker": "Konuşmacı 1", "text": "Konuşulan cümle..." },
    { "speaker": "Konuşmacı 2", "text": "Konuşulan cümle..." }
  ],
  "sentiment": "Olumlu / Profesyonel / Heyecanlı / Stresli / Nötr",
  "tone": "Örn: Yapıcı, Kararlı ve Analitik"
}`;

    const sesResponse = await fetch(sesUrl);
    if (!sesResponse.ok) {
      throw new Error("Ses dosyası buluttan indirilemedi.");
    }
    const arrayBuffer = await sesResponse.arrayBuffer();
    const base64Ses = Buffer.from(arrayBuffer).toString("base64");

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: sistemYonergesi },
            {
              inlineData: {
                mimeType: "audio/webm",
                data: base64Ses
              }
            }
          ]
        }
      ]
    });

    const aiResponseText = response.text || "";
    
    let temizlenmisText = aiResponseText.trim();
    if (temizlenmisText.startsWith("```")) {
      temizlenmisText = temizlenmisText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    }

    const analizSonucu = JSON.parse(temizlenmisText);
    
    return NextResponse.json(analizSonucu, {
      headers: {
        "Content-Type": "application/json",
        "Connection": "close"
      }
    });

  } catch (error: any) {
    console.error("Route.ts Genel Catch Hatası:", error);
    let mesaj = error.message || "Yapay zeka analizi sırasında bir hata oluştu.";
    let statusKodu = 500;

    if (mesaj.includes("RESOURCE_EXHAUSTED") || mesaj.includes("429") || error?.status === 429) {
      mesaj = "Google Gemini API günlük kullanım kota sınırına ulaştı (429 Quota Exceeded / Limit: 0). Lütfen https://aistudio.google.com/ adresinden yeni bir proje oluşturup yeni bir API Key alarak GEMINI_API_KEY değişkenini güncelleyin.";
      statusKodu = 429;
    } else if (mesaj.includes("API_KEY_SERVICE_BLOCKED") || mesaj.includes("PERMISSION_DENIED") || error?.status === 403) {
      mesaj = "Google API anahtarında Generative Language servisi engellenmiş. Lütfen https://aistudio.google.com/ adresinden kısıtlamasız yeni bir API Key alıp Vercel'deki GEMINI_API_KEY değişkenine ekleyin.";
      statusKodu = 403;
    } else if (mesaj.includes("is no longer available") || mesaj.includes("NOT_FOUND") || error?.status === 404) {
      mesaj = "Gemini model güncellendi. İstek en güncel gemini-2.0-flash modeline yönlendirildi.";
      statusKodu = 404;
    }

    return NextResponse.json(
      { error: "Google Gemini API Sorgusu Başarısız.", detay: mesaj },
      { status: statusKodu }
    );
  }
}