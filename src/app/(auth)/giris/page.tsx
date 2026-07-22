"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { auth } from "../../../firebaseConfig";

export default function GirisSayfasi() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isNight, setIsNight] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hataMesaji, setHataMesaji] = useState("");
  
  const [displayText, setDisplayText] = useState("");
  const [currentTime, setCurrentTime] = useState("");
  const fullText = "SES ASİSTANI";

  useEffect(() => {
    // Oturum zaten açıksa doğrudan ana sayfaya yönlendir
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        window.location.href = "/";
      }
    });

    const hour = new Date().getHours();
    setIsNight(hour >= 18 || hour < 6);

    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('tr-TR'));
    }, 1000);

    let i = 0;
    const interval = setInterval(() => {
      setDisplayText(fullText.slice(0, i));
      i++;
      if (i > fullText.length) clearInterval(interval);
    }, 120);

    return () => { 
      unsubscribe();
      clearInterval(interval); 
      clearInterval(timer); 
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setHataMesaji("Lütfen e-posta ve şifrenizi girin.");
      return;
    }
    setLoading(true);
    setHataMesaji("");
    try {
      if (isLogin) {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        if (cred.user) {
          window.location.href = "/";
        }
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (cred.user) {
          window.location.href = "/";
        }
      }
    } catch (error: any) {
      console.error("Giriş/Kayıt Hatası:", error);
      let mesaj = "Giriş yapılırken bir sorun oluştu.";
      const errCode = error?.code || error?.message || "";

      if (errCode.includes("invalid-credential") || errCode.includes("user-not-found") || errCode.includes("wrong-password")) {
        mesaj = "E-posta adresi veya şifre hatalı.";
      } else if (errCode.includes("email-already-in-use")) {
        mesaj = "Bu e-posta adresi ile zaten kayıtlı bir hesap var.";
      } else if (errCode.includes("weak-password")) {
        mesaj = "Şifreniz en az 6 karakter olmalıdır.";
      } else if (errCode.includes("invalid-email")) {
        mesaj = "Lütfen geçerli bir e-posta adresi girin.";
      } else if (error.message) {
        mesaj = error.message;
      }

      setHataMesaji(mesaj);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen relative flex items-center justify-center p-4 sm:p-6 overflow-hidden transition-colors duration-1000 ${isNight ? 'bg-neutral-950 text-white' : 'bg-neutral-50 text-neutral-900'}`}>
      
      {/* 🌌 ARKA PLAN GLOW ORB'LARI VE RADIAL GRADYAN */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-purple-600/30 via-indigo-500/20 to-pink-500/30 blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-to-bl from-blue-600/20 via-teal-500/20 to-indigo-500/30 blur-3xl pointer-events-none animate-pulse" />

      {/* İÇERİK KART KONTEYNERİ */}
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-center z-10">
        
        {/* 💻 MASAÜSTÜ SOL TANITIM PANELİ (Mobilde Üst Header Olarak Şıkça Görünür) */}
        <div className="flex flex-col justify-between space-y-6 text-center lg:text-left p-2">
          <div>
            {/* Logo Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-md shadow-xs mb-4">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-black tracking-widest uppercase text-neutral-600 dark:text-neutral-300">
                AI Powered Voice Engine
              </span>
            </div>

            {/* Başlık */}
            <h1 className="text-3xl sm:text-5xl font-black tracking-tighter leading-none mb-3">
              {displayText}<span className="animate-pulse text-indigo-500">|</span>
            </h1>

            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 font-semibold max-w-md mx-auto lg:mx-0 leading-relaxed">
              Karmaşık ses verilerinizi, yapay zekanın gücüyle anlamlı notlara ve özetlere dönüştürün.
            </p>
          </div>

          {/* DİNAMİK SES DALGASI EKLENTİSİ */}
          <div className="flex items-center justify-center lg:justify-start gap-1.5 h-12 my-2">
            {[...Array(14)].map((_, i) => (
              <div 
                key={i} 
                className={`w-1.5 rounded-full transition-all duration-300 ${isNight ? 'bg-white/40' : 'bg-neutral-800/40'}`}
                style={{ 
                  height: `${25 + Math.sin(i + 1) * 35 + Math.random() * 30}%`, 
                  animation: `pulse 1.2s ease-in-out ${i * 0.1}s infinite alternate` 
                }}
              />
            ))}
          </div>

          {/* Özellik Piller Grubu */}
          <div className="grid grid-cols-2 gap-2.5 max-w-md mx-auto lg:mx-0">
            {[
              { icon: '🎙️', text: 'Opus 64kbps Ses' },
              { icon: '⚡', text: 'Gemini AI Analiz' },
              { icon: '☁️', text: 'Bulut Depolama' },
              { icon: '🔒', text: 'Güvenli Firebase' }
            ].map((f) => (
              <div 
                key={f.text} 
                className={`p-2.5 rounded-2xl border text-[11px] font-extrabold flex items-center gap-2 backdrop-blur-md transition-all ${
                  isNight 
                    ? 'bg-neutral-900/60 border-neutral-800 text-neutral-200' 
                    : 'bg-white/70 border-neutral-200/80 text-neutral-800 shadow-2xs'
                }`}
              >
                <span>{f.icon}</span>
                <span>{f.text}</span>
              </div>
            ))}
          </div>

          {/* Sistem Durumu */}
          <div className="hidden lg:flex justify-between items-center text-[10px] font-mono text-neutral-400 uppercase tracking-widest pt-4 border-t border-neutral-200 dark:border-neutral-800">
            <span>Operator: #8842-TR</span>
            <span>{currentTime}</span>
          </div>
        </div>

        {/* 📱 SAĞ/MOBİL GİRİŞ FORMU KARTI */}
        <div className={`w-full p-6 sm:p-8 rounded-3xl backdrop-blur-2xl border transition-all duration-500 shadow-2xl ${
          isNight 
            ? 'bg-neutral-900/80 border-neutral-800/90 shadow-black/50' 
            : 'bg-white/80 border-white/60 shadow-neutral-200/50'
        }`}>
          
          <div className="mb-6 text-center lg:text-left">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-1">
              {isLogin ? "Giriş Yap" : "Hesap Oluştur"}
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 font-semibold">
              {isLogin ? "Kayıtlı hesabınızla oturum açın." : "Hemen yeni bir ücretsiz hesap oluşturun."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            {hataMesaji && (
              <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold text-center animate-bounce">
                ⚠️ {hataMesaji}
              </div>
            )}

            {/* E-POSTA İNPUT */}
            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400 pl-1">
                E-posta Adresi
              </label>
              <div className="relative">
                <input 
                  type="email" 
                  autoFocus
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className={`w-full pl-11 pr-4 py-3.5 rounded-2xl text-xs font-bold outline-none transition-all duration-200 border ${
                    isNight 
                      ? 'bg-neutral-950/50 border-neutral-800 text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10' 
                      : 'bg-neutral-50/80 border-neutral-200 text-neutral-900 focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/5'
                  }`}
                  placeholder="ornek@domain.com"
                  required
                />
                <svg className="w-4 h-4 text-neutral-400 absolute left-4 top-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
              </div>
            </div>
            
            {/* ŞİFRE İNPUT */}
            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400 pl-1">
                Şifre
              </label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className={`w-full pl-11 pr-11 py-3.5 rounded-2xl text-xs font-bold outline-none transition-all duration-200 border ${
                    isNight 
                      ? 'bg-neutral-950/50 border-neutral-800 text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10' 
                      : 'bg-neutral-50/80 border-neutral-200 text-neutral-900 focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/5'
                  }`}
                  placeholder="••••••••"
                  required
                />
                <svg className="w-4 h-4 text-neutral-400 absolute left-4 top-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>

                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)} 
                  className="absolute right-4 top-3.5 p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"/></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12c1.274 4.057 5.065 7 9.544 7s8.27-2.943 9.544-7c-1.274-4.057-5.064-7-9.544-7s-8.27 2.943-9.544 7Z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/></svg>
                  )}
                </button>
              </div>
            </div>
            
            {/* GÖNDER BUTONU */}
            <button 
              type="submit" 
              disabled={loading} 
              className={`w-full py-4 rounded-2xl text-xs font-black tracking-wider uppercase transition-all duration-300 shadow-lg active:scale-95 flex items-center justify-center gap-2 cursor-pointer ${
                isNight 
                  ? 'bg-white text-neutral-950 hover:bg-neutral-100 shadow-white/10' 
                  : 'bg-neutral-950 text-white hover:bg-neutral-900 shadow-neutral-950/20'
              }`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>İşleniyor...</span>
                </>
              ) : (
                <span>{isLogin ? "Giriş Yap" : "Hesap Oluştur"}</span>
              )}
            </button>
          </form>

          {/* ALT TOGGLE BUTONU */}
          <div className="mt-6 pt-5 border-t border-neutral-200/60 dark:border-neutral-800 text-center">
            <button 
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setHataMesaji("");
              }} 
              className="text-xs font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              {isLogin ? (
                <span>Hesabınız yok mu? <strong className="text-neutral-900 dark:text-white underline underline-offset-4">Kayıt Ol</strong></span>
              ) : (
                <span>Zaten hesabınız var mı? <strong className="text-neutral-900 dark:text-white underline underline-offset-4">Giriş Yap</strong></span>
              )}
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}