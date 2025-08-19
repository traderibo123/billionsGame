import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

export default function Intro() {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [composedUrl, setComposedUrl] = useState("");
  const [scale, setScale] = useState(1.0);
  const [offX, setOffX] = useState(0);
  const [offY, setOffY] = useState(0);
  const [rotate, setRotate] = useState(0);
  const glassesUrl = "/billions-glasses.png";

  const Logo = useMemo(() => () => (
    <div className="shrink-0">
      <img src="/billions-glasses.png" alt="Billions" className="w-10 h-10 md:w-12 md:h-12 object-contain" />
    </div>
  ), []);

  const fetchAvatar = async () => {
    const h = handle.trim().replace(/^@+/, "");
    if (!h) { alert("X kullanıcı adını @ olmadan gir."); return; }
    const url = `/api/avatar?handle=${encodeURIComponent(h)}`;
    setAvatarUrl(url);
    await composeAvatar(url, glassesUrl);
  };

  const onLocalFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const url = URL.createObjectURL(f);
    setAvatarUrl(url);
    composeAvatar(url, glassesUrl);
  };

  const composeAvatar = async (src?: string, gsrc?: string) => {
    const size = 256;
    const base = new Image(); base.crossOrigin = "anonymous"; base.src = src || avatarUrl;
    await new Promise((ok, err) => { base.onload = ok; base.onerror = err; });
    const c = document.createElement("canvas"); c.width = size; c.height = size;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0,0,size,size);

    // avatar içini daireye kırp
    ctx.save();
    ctx.beginPath(); ctx.arc(size/2, size/2, size/2 - 2, 0, Math.PI*2); ctx.closePath(); ctx.clip();
    ctx.drawImage(base, 0, 0, size, size);
    ctx.restore();

    // dış halka
    ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(size/2, size/2, size/2 - 3, 0, Math.PI*2); ctx.stroke();

    // gözlük bindirme
    const g = new Image(); g.crossOrigin = "anonymous"; g.src = gsrc || glassesUrl;
    try {
      await new Promise((ok, err) => { g.onload = ok; g.onerror = err; });
      ctx.save();
      ctx.translate(size/2 + offX, size*0.48 + offY);
      ctx.rotate((rotate * Math.PI)/180);
      const W = 170 * scale, H = 100 * scale;
      ctx.drawImage(g, -W/2, -H/2, W, H);
      ctx.restore();
    } catch {
      // (opsiyonel) gözlük çizemediği durumda basit fallback
    }

    setComposedUrl(c.toDataURL("image/png"));
  };

  useEffect(() => { if (avatarUrl) composeAvatar(); /* slider değişince yeniden oluştur */ }, [scale, offX, offY, rotate]);

  const startGame = () => {
    if (!composedUrl) { alert("Önce avatarı yükle/çek ve gözlüğü hizala."); return; }
    // Oyun sayfasına aktarılacak verileri sakla
    localStorage.setItem("hero_composed", composedUrl);
    router.push("/game");
  };

  return (
    <div className="min-h-screen w-full bg-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        <header className="mb-4 flex items-center gap-3">
          <Logo />
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Billions Neon — Avatar Game
            </h1>
            <p className="text-xs md:text-sm text-white/70 -mt-1">by <b>@traderibo123</b></p>
          </div>
        </header>

        <div className="rounded-[28px] border border-white/20 bg-white/5 p-4 shadow-[0_0_80px_#7c3aed55]">
          <p className="text-sm text-white/70 mb-4">
            X avatarını al veya yükle, <b>Billions gözlüğünü</b> hizala; sonra <b>Start</b>.
          </p>

          <div className="grid lg:grid-cols-2 gap-4">
            {/* Önizleme */}
            <div className="flex items-center justify-center">
              <div
                className="w-36 h-36 md:w-44 md:h-44 rounded-full overflow-hidden border border-white/30 shadow-[0_10px_40px_rgba(255,255,255,.25)]"
                style={{ backgroundImage: `url(${composedUrl || avatarUrl || "/default-avatar.png"})`, backgroundSize: "cover", backgroundPosition: "center" }}
              />
            </div>

            {/* Kontroller */}
            <div className="grid gap-3">
              <div className="grid md:grid-cols-3 gap-2 items-end">
                <div className="md:col-span-2">
                  <label className="text-xs text-white/70">X Handle (without @)</label>
                  <input
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    placeholder="username"
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-white/10 border border-white/20"
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={fetchAvatar} className="px-3 py-2 rounded-2xl bg-white text-black font-semibold">Load Avatar</button>
                  <label className="px-3 py-2 rounded-2xl bg-white/10 border border-white/20 text-sm cursor-pointer">
                    Upload
                    <input type="file" accept="image/*" onChange={onLocalFile} className="hidden" />
                  </label>
                </div>
              </div>

              <div className="grid md:grid-cols-4 gap-3">
                <Range label="Scale" value={scale} min={0.7} max={1.8} step={0.01} onChange={setScale} />
                <Range label="Offset X" value={offX} min={-60} max={60} step={1} onChange={setOffX} />
                <Range label="Offset Y" value={offY} min={-60} max={60} step={1} onChange={setOffY} />
                <Range label="Rotate" value={rotate} min={-30} max={30} step={0.5} onChange={setRotate} />
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-center">
            <button onClick={startGame} className="px-6 py-3 rounded-2xl bg-white text-black font-bold shadow hover:scale-[1.02] transition">
              Start
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Range({ label, value, min, max, step, onChange }:{
  label:string; value:number; min:number; max:number; step:number; onChange:(v:number)=>void
}) {
  return (
    <label className="grid gap-1 text-xs text-white/70">
      <span>{label}: <b className="text-white">{value.toFixed(2)}</b></span>
      <input type="range" min={min} max={max} step={step} value={value}
             onChange={(e)=>onChange(parseFloat((e.target as HTMLInputElement).value))}
             className="appearance-none w-full h-2 rounded bg-white/10 accent-white" />
    </label>
  );
}
