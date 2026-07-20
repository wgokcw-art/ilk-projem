import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

// Yeni kurulan resmi Google AI SDK'sını çevre değişkenindeki anahtar ile başlatıyoruz
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(request: Request) {
  try {
    // Frontend sayfalarından gelen ses linkini ve klasör adını alıyoruz
    const { sesUrl, klasor } = await request.json();

    console.log("--- GEMINI MULTIMODAL SES ANALİZİ BAŞLADI ---");
    console.log("Gelen Klasör:", klasor);
    console.log("Gelen Ses Linki:", sesUrl);

    if (!sesUrl) {
      return NextResponse.json({ error: "Analiz edilecek ses linki bulunamadı." }, { status: 400 });
    }

    // 🛠️ Mevcut JSON şemasını (ozet, kritikler, kritikYerler, ozetTanimlar, ekstra) aynen koruyoruz
    const sistemYonergesi = `Sen profesyonel bir ses asistanı ve veri analiz uzmanısın. 
Kullanıcı sana analiz edilmek üzere bir ses kaydı gönderecek. Bu metin "${klasor}" klasöründen geliyor.
Senden kesinlikle şu formatta, sadece saf bir JSON çıktısı vermeni istiyorum. Markdown kod blokları (\`\`\`json gibi) ekleme. Doğrudan süslü parantezle başla ve bitir:
{
  "ozet": "Ses kaydının detaylı, akıcı ve profesyonel bir özeti (en az 2-3 cümle)",
  "kritikler": ["Kritik Nokta 1", "Kritik Nokta 2", "Kritik Nokta 3"],
  "kritikYerler": ["Kritik Nokta 1", "Kritik Nokta 2", "Kritik Nokta 3"],
  "ozetTanimlar": ["Önemli Tanım 1", "Önemli Tanım 2"],
  "ekstra": ["Ekstra bilgi veya formül/kod bloğu 1", "Ekstra bilgi veya formül/kod bloğu 2"]
}`;

    // 🎙️ Cloudinary'deki ses dosyasını indirip Gemini'nin anlayacağı Base64 formatına çeviriyoruz
    const sesResponse = await fetch(sesUrl);
    if (!sesResponse.ok) {
      throw new Error("Ses dosyası buluttan indirilemedi.");
    }
    const arrayBuffer = await sesResponse.arrayBuffer();
    const base64Ses = Buffer.from(arrayBuffer).toString("base64");

    // En güncel ve kararlı multimodal model olan gemini-2.5-flash ile doğrudan sesi analiz ettiriyoruz
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
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
    
    // Yapay zekanın bazen eklediği markdown ```json temizlik adımı (Mevcut mantık aynen korundu)
    let temizlenmisText = aiResponseText.trim();
    if (temizlenmisText.startsWith("```")) {
      temizlenmisText = temizlenmisText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    }

    // JSON'a dönüştürüp doğrudan frontend sayfalarına fırlatıyoruz
    const analizSonucu = JSON.parse(temizlenmisText);
    
    return NextResponse.json(analizSonucu, {
      headers: {
        "Content-Type": "application/json",
        "Connection": "close"
      }
    });

  } catch (error: any) {
    console.error("Route.ts Genel Catch Hatası:", error);
    return NextResponse.json(
      { error: "Yapay zeka analizi sırasında bir hata oluştu.", detay: error.message },
      { status: 500 }
    );
  }
}