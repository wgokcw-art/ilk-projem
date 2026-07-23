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
          model: "gemini-flash-latest",
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
  "transkriptZamanli": [
    { "zaman": 0, "konusan": "Konuşmacı 1", "metin": "Konuşulan ilk cümle..." },
    { "zaman": 5, "konusan": "Konuşmacı 2", "metin": "Konuşulan ikinci cümle..." }
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
      model: "gemini-flash-latest",
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

    return NextResponse.json(
      { error: "Google Gemini API Sorgusu Başarısız.", detay: mesaj },
      { status: 500 }
    );
  }
}