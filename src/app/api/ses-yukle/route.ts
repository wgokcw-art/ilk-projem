import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 180; // 3 dakikaya kadar uzun sürse dahi Next.js rotasını açık tutar

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "ng89mhgm";

export async function POST(req: NextRequest) {
  try {
    const gelenFormData = await req.formData();
    const dosya = gelenFormData.get("file") as File | null;
    const uploadPreset = (gelenFormData.get("upload_preset") as string | null) || process.env.CLOUDINARY_UPLOAD_PRESET || "ses_asistani";

    if (!dosya) {
      return NextResponse.json({ error: "Yüklenecek ses dosyası bulunamadı." }, { status: 400 });
    }

    // 🛠️ DÜZELTME: Gelen ham veriyi Cloudinary'nin kusursuz okuyabilmesi için 
    // bir Buffer'a dönüştürüp resmi File formatına sokuyoruz.
    const arrayBuffer = await dosya.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const cloudinaryFormData = new FormData();
    
    // Cloudinary'e veriyi gönderirken isimlendirme ve mimeType'ı garantiye alıyoruz
    const fileToUpload = new File([buffer], dosya.name || "ses_kaydi.webm", {
      type: dosya.type || "audio/webm",
    });

    cloudinaryFormData.append("file", fileToUpload);
    cloudinaryFormData.append("upload_preset", uploadPreset);

    // 10+ dakikalık büyük ses kayıtları için zaman aşımını 180 saniyeye (3 dakika) yükseltiyoruz
    const kontrolci = new AbortController();
    const zamanAsimi = setTimeout(() => kontrolci.abort(), 180000);

    let cloudinaryYaniti: Response;
    try {
      cloudinaryYaniti = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`,
        {
          method: "POST",
          body: cloudinaryFormData,
          signal: kontrolci.signal,
        }
      );
    } finally {
      clearTimeout(zamanAsimi);
    }

    // Yanıt metnini güvenli bir şekilde alıp inceleyelim
    const hamMetinYaniti = await cloudinaryYaniti.text();
    let sonuc: any = null;
    
    try {
      sonuc = JSON.parse(hamMetinYaniti);
    } catch (e) {
      console.error("Cloudinary yanıtı JSON'a dönüştürülemedi:", hamMetinYaniti);
    }

    if (!cloudinaryYaniti.ok || !sonuc?.secure_url) {
      let detay = sonuc?.error?.message || `Cloudinary HTTP ${cloudinaryYaniti.status}`;
      if (detay.toLowerCase().includes("upload preset") || detay.toLowerCase().includes("preset")) {
        detay = `Cloudinary Upload Preset ('${uploadPreset}') geçersiz veya bulunamadı. Lütfen Cloudinary ayarlarını kontrol edin.`;
      }
      console.error("Cloudinary yukleme hatasi:", detay);
      return NextResponse.json({ error: detay }, { status: 502 });
    }

    // Frontend'e hem secure_url hem de yedek url parametrelerini garanti ederek dönüyoruz
    return NextResponse.json({ 
      secure_url: sonuc.secure_url,
      url: sonuc.url 
    });

  } catch (error: any) {
    console.error("Sunucu tarafi Cloudinary yukleme hatasi:", error);
    const mesaj =
      error?.name === "AbortError"
        ? "Ses dosyası yükleme işlemi zaman aşımına uğradı (90 saniye)."
        : error.message || "Sunucu tarafında beklenmeyen bir hata oluştu.";
    return NextResponse.json({ error: mesaj }, { status: 500 });
  }
}