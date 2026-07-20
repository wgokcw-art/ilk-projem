"use client";

import { useState, useEffect } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../../firebaseConfig";

export default function GirisSayfasi() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isNight, setIsNight] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [displayText, setDisplayText] = useState("");
  const [currentTime, setCurrentTime] = useState("");
  const fullText = "SES ASİSTANI";

  useEffect(() => {
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
    }, 150);

    return () => { clearInterval(interval); clearInterval(timer); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        window.location.href = "/";
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        alert("Kayıt başarılı!");
        setIsLogin(true);
      }
    } catch (error: any) {
      alert("Hata: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex transition-colors duration-1000 ${isNight ? 'bg-black' : 'bg-gray-50'}`}>
      
      {/* SOL PANEL */}
      <div className={`hidden lg:flex w-1/2 flex-col justify-between p-12 relative overflow-hidden ${isNight ? 'bg-zinc-900' : 'bg-gray-100'}`}>
        <div className={`flex justify-between font-mono text-[10px] opacity-60 z-10 ${isNight ? 'text-white' : 'text-black'}`}>
          <p>{">"} OPERATOR_ID: #8842-TR</p>
          <p>{currentTime}</p>
        </div>

        <div className="text-center z-10">
          <h1 className={`text-5xl font-black mb-6 tracking-tighter ${isNight ? 'text-white' : 'text-black'}`}>
            {displayText}<span className="animate-pulse">|</span>
          </h1>
          
          <div className="grid grid-cols-2 gap-4 mb-8">
            {['Siri Entegrasyonu', 'Ses Analizi', 'Otomatik Log', 'Bulut Senkron'].map((item) => (
              <div key={item} className={`p-4 rounded-2xl text-[10px] font-bold backdrop-blur-md border ${isNight ? 'bg-white/5 border-white/10 text-white' : 'bg-black/5 border-black/10 text-black'}`}>
                {item}
              </div>
            ))}
          </div>

          {/* Dinamik Ses Dalgası */}
          <div className="flex items-center justify-center gap-1.5 h-20 mb-8">
            {[...Array(12)].map((_, i) => (
              <div 
                key={i} 
                className={`w-2 rounded-full animate-pulse ${isNight ? 'bg-white/30' : 'bg-black/30'}`}
                style={{ height: `${20 + Math.random() * 60}%`, animationDelay: `${i * 0.15}s` }}
              ></div>
            ))}
          </div>

          <div className="flex justify-center">
            <div className={`flex items-center gap-3 px-6 py-2 rounded-full border backdrop-blur-md ${isNight ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
              <div className={`w-3 h-3 rounded-full ${loading ? 'bg-yellow-500 animate-ping' : 'bg-green-500 animate-pulse'}`}></div>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${isNight ? 'text-white' : 'text-black'}`}>
                {loading ? "SİSTEM İŞLEMLERİ" : "SİSTEM STABİL"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-end z-10">
            <div className={`${isNight ? 'text-white/40' : 'text-black/40'} text-[10px] font-mono tracking-widest uppercase`}>Server Status: Optimal</div>
            <div className={`text-[10px] opacity-40 uppercase tracking-widest ${isNight ? 'text-white' : 'text-black'}`}>Build v.2026.07</div>
        </div>
      </div>

      {/* SAĞ PANEL */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className={`w-full max-w-sm p-8 rounded-3xl backdrop-blur-xl border ${isNight ? 'bg-zinc-900/50 border-white/5' : 'bg-white/50 border-black/5 shadow-2xl'}`}>
          <h2 className={`text-3xl font-bold mb-2 ${isNight ? 'text-white' : 'text-black'}`}>
            {isLogin ? "Giriş Yap" : "Hesap Oluştur"}
          </h2>
          <p className="text-gray-500 mb-8 leading-relaxed">
            Karmaşık ses verilerinizi, yapay zekanın gücüyle anlamlı içgörülere dönüştürün. Dijital hafızanız burada başlıyor.
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <input 
              type="email" 
              autoFocus
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className={`w-full px-5 py-4 rounded-2xl outline-none transition-all duration-300 border ${isNight ? 'bg-black/20 border-white/10 text-white focus:ring-4 focus:ring-white/10' : 'bg-white/50 border-black/5 text-black focus:ring-4 focus:ring-black/5'}`}
              placeholder="E-posta"
              required
            />
            
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className={`w-full px-5 py-4 rounded-2xl outline-none transition-all duration-300 border ${isNight ? 'bg-black/20 border-white/10 text-white focus:ring-4 focus:ring-white/10' : 'bg-white/50 border-black/5 text-black focus:ring-4 focus:ring-black/5'}`}
                placeholder="Şifre"
                required
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className={`absolute right-5 top-4 ${isNight ? 'text-white/50' : 'text-black/50'}`}>
                {showPassword ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M21 12a9.97 9.97 0 00-1.563-3.029m-5.858.908L21 12m-6.878-2.122l4.242-4.242M3 3l18 18"/></svg> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>}
              </button>
            </div>
            
            <button type="submit" disabled={loading} className={`w-full font-bold py-4 rounded-2xl transition-all active:scale-95 ${isNight ? 'bg-white text-black' : 'bg-black text-white'}`}>
              {loading ? "Sistem Sorgulanıyor..." : (isLogin ? "Giriş Yap" : "Kayıt Ol")}
            </button>
          </form>

          <button onClick={() => setIsLogin(!isLogin)} className="w-full mt-4 flex items-center justify-center gap-2 text-gray-500 font-semibold hover:text-black transition-colors">
            {isLogin ? "Hesabın yok mu? Kayıt Ol" : "Zaten hesabın var mı? Giriş Yap"}
          </button>
        </div>
      </div>
    </div>
  );
}