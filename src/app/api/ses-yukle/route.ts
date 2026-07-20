import { NextRequest, NextResponse } from "next/server";

const CLOUDINARY_CLOUD_NAME = "ng89mhgm";

export async function POST(req: NextRequest) {
  try {
    const gelenFormData = await req.formData();
    const dosya = gelenFormData.get("file") as File | null;
    const uploadPreset = gelenFormData.get("upload_preset") as string | null;

    if (!dosya || !uploadPreset) {
      return NextResponse.json({ error: "Dosya veya upload_preset eksik." }, { status: 400 });
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

    const kontrolci = new AbortController();
    const zamanAsimi = setTimeout(() => kontrolci.abort(), 25000);

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
      const detay = sonuc?.error?.message || `Cloudinary HTTP ${cloudinaryYaniti.status}`;
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
        ? "Cloudinary sunucu tarafında 25 saniye içinde yanıt vermedi."
        : "Sunucu tarafında beklenmeyen bir hata oluştu.";
    return NextResponse.json({ error: mesaj }, { status: 500 });
  }
}