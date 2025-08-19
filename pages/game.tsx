import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";

const GOOD = ["HUMAN", "AI", "DISCORD", "REFERRAL", "ZK"] as const;
const BAD  = ["FAKE", "SYBIL"] as const;
type Good = typeof GOOD[number];
type Bad  = typeof BAD[number];

type Drop     = { id:number; x:number; y:number; vy:number; type:Good|Bad; good:boolean };
type Floaty   = { id:number; x:number; y:number; text:string; life:number };
type Particle = { id:number; x:number; y:number; vx:number; vy:number; life:number };

const COLORS: Record<Good|Bad,string> = {
  HUMAN:"from-emerald-400 to-emerald-600",
  AI:"from-sky-400 to-sky-600",
  DISCORD:"from-indigo-400 to-indigo-600",
  REFERRAL:"from-amber-400 to-amber-600",
  ZK:"from-fuchsia-400 to-fuchsia-600",
  FAKE:"from-rose-400 to-rose-600",
  SYBIL:"from-red-500 to-red-700",
};
const LABELS: Record<Good|Bad,string> = {
  HUMAN:"Human", AI:"AI Agent", DISCORD:"Discord", REFERRAL:"Referral", ZK:"ZK Proof", FAKE:"Fake", SYBIL:"Sybil",
};
const ICONS: Record<Good|Bad,string> = {
  HUMAN:"🧑‍🚀", AI:"🤖", DISCORD:"💬", REFERRAL:"🔗", ZK:"🛡️", FAKE:"⚠️", SYBIL:"🕵️",
};
const KEY_LEFT  = new Set(["ArrowLeft","a","A"]);
const KEY_RIGHT = new Set(["ArrowRight","d","D"]);
const clamp01 = (v:number)=>Math.max(0,Math.min(1,v));

export default function Game() {
  const router = useRouter();

  const [running, setRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [power, setPower] = useState(0);
  const [lives, setLives] = useState(3);
  const [best, setBest] = useState<number>(() => (typeof window==="undefined") ? 0 : parseInt(localStorage.getItem("billions_best")||"0"));
  const [x, setX] = useState(0.5);
  const [combo, setCombo] = useState(0);
  const [composedUrl, setComposedUrl] = useState<string>("");

  const dropsRef = useRef<Drop[]>([]);
  const floatiesRef = useRef<Floaty[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const keys = useRef({L:false, R:false});
  const last = useRef<number|null>(null);

  const timeRef  = useRef(60);
  const powerRef = useRef(0);
  const livesRef = useRef(3);
  const xRef     = useRef(0.5);
  const comboRef = useRef(0);

  useEffect(()=>void(timeRef.current=timeLeft), [timeLeft]);
  useEffect(()=>void(powerRef.current=power), [power]);
  useEffect(()=>void(livesRef.current=lives), [lives]);
  useEffect(()=>void(xRef.current=x), [x]);
  useEffect(()=>void(comboRef.current=combo), [combo]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const img = localStorage.getItem("hero_composed");
      if (img) setComposedUrl(img);
    }
  }, []);

  const Logo = useMemo(() => () => (
    <div className="shrink-0">
      <img src="/billions-glasses.png" alt="Billions" className="w-10 h-10 md:w-12 md:h-12 object-contain" />
    </div>
  ), []);

  const addFloaty = (text:string, x:number, y:number) => {
    floatiesRef.current.push({ id:Date.now()+Math.random(), text, x, y, life:1.1 });
  };
  const burst = (x:number, y:number, _t:Good|Bad) => {
    for (let i=0;i<12;i++){
      const a=Math.random()*Math.PI*2, s=0.8+Math.random()*1.4;
      particlesRef.current.push({ id:Date.now()+Math.random(), x, y, vx:Math.cos(a)*s, vy:Math.sin(a)*s, life:0.6+Math.random()*0.5 });
    }
  };

  useEffect(() => {
    if (!running) return;

    const kd = (e:KeyboardEvent)=>{ if(KEY_LEFT.has(e.key)) keys.current.L = true; if(KEY_RIGHT.has(e.key)) keys.current.R = true; };
    const ku = (e:KeyboardEvent)=>{ if(KEY_LEFT.has(e.key)) keys.current.L = false; if(KEY_RIGHT.has(e.key)) keys.current.R = false; };
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);

    let spawnAcc = 0;

    const step = (t:number) => {
      if (!running) return;
      if (last.current==null) last.current=t;
      const dt = Math.min(0.05, (t - last.current)/1000);
      last.current = t;

      timeRef.current = timeRef.current>0 ? Math.max(0, timeRef.current - dt) : 0;
      setTimeLeft(timeRef.current);

      const speed=1.3;
      let nx = xRef.current;
      const dir = (keys.current.R?1:0) - (keys.current.L?1:0);
      nx = clamp01(nx + dir * speed * dt);
      xRef.current = nx; setX(nx);

      spawnAcc += dt;
      const spawnEvery = Math.max(0.4, 1.1 - (60 - Math.max(0, timeRef.current)) * 0.018);
      if (spawnAcc >= spawnEvery) {
        spawnAcc = 0;
        const good = Math.random() > 0.28;
        const type = (good ? GOOD[Math.floor(Math.random()*GOOD.length)] : BAD[Math.floor(Math.random()*BAD.length)]) as Good|Bad;
        dropsRef.current.push({ id:Date.now()+Math.random(), x:Math.random(), y:-0.1, vy:0.3+Math.random()*0.3, type, good });
      }

      dropsRef.current.forEach(d => d.y += d.vy * dt);

      particlesRef.current.forEach(p => { p.x+=p.vx*dt; p.y+=p.vy*dt; p.vy+=0.5*dt; p.life-=dt; });
      particlesRef.current = particlesRef.current.filter(p => p.life>0);

      floatiesRef.current.forEach(f => { f.y-=0.25*dt; f.life-=dt; });
      floatiesRef.current = floatiesRef.current.filter(f => f.life>0);

      const PY = 0.88; const caught:number[] = [];
      for (const d of dropsRef.current) {
        if (Math.abs(d.y-PY)<0.04 && Math.abs(d.x-nx)<0.08) {
          caught.push(d.id);
          if (d.good) {
            const mult = 1 + Math.floor(comboRef.current/5);
            const gain = 5 * mult;
            powerRef.current += gain; setPower(powerRef.current);
            comboRef.current += 1; setCombo(comboRef.current);
            addFloaty(`+${gain} POWER ×${mult}`, d.x, PY);
            burst(d.x, PY, d.type);
          } else {
            livesRef.current = Math.max(0, livesRef.current - 1); setLives(livesRef.current);
            comboRef.current = 0; setCombo(0);
            addFloaty("-life", d.x, PY);
            burst(d.x, PY, d.type);
          }
        }
      }
      if (caught.length) dropsRef.current = dropsRef.current.filter(d => !caught.includes(d.id));
      dropsRef.current = dropsRef.current.filter(d => d.y < 1.12);

      if (timeRef.current <= 0 || livesRef.current <= 0) {
        setRunning(false);
        last.current = null;
        setBest(b => { const n = Math.max(b, powerRef.current); localStorage?.setItem("billions_best", String(n)); return n; });
        return;
      }

      requestAnimationFrame(step);
    };

    const raf = requestAnimationFrame(step);
    return () => { window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); cancelAnimationFrame(raf); last.current=null; };
  }, [running]);

  const start = () => {
    setTimeLeft(60); setPower(0); setLives(3); setCombo(0);
    timeRef.current=60; powerRef.current=0; livesRef.current=3; comboRef.current=0; xRef.current=0.5; setX(0.5);
    dropsRef.current=[]; floatiesRef.current=[]; particlesRef.current=[];
    setRunning(true);
  };

  const shareOnX = () => {
    const text = encodeURIComponent(`I scored ${powerRef.current} POWER in Billions Game! @billions_ntwk @traderibo123`);
    const url  = typeof window !== "undefined" ? encodeURIComponent(window.location.href) : "";
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank");
  };

  useEffect(()=>{ start(); }, []);

  const gameOver = !running && (timeLeft<=0 || lives<=0);

  return (
    <div className="min-h-screen w-full bg-black text-white flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-5xl relative">
        {/* Başlık */}
        <header className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo />
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Billions Game</h1>
              <p className="text-xs md:text-sm text-white/70 -mt-1">by <b>@traderibo123</b></p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={()=>router.push("/")} className="px-3 py-2 rounded-2xl bg-white/10 border border-white/20 text-sm">Back to Intro</button>
            <button onClick={start} className="px-3 py-2 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-sm font-semibold">
              Restart
            </button>
          </div>
        </header>

        {/* HUD */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
          <HUD label="POWER" value={String(power)} />
          <HUD label="Time"  value={`${Math.ceil(timeLeft)}s`} />
          <HUD label="Lives" value={"❤".repeat(lives) || "—"} />
          <HUD label="Best"  value={String(best)} />
          <HUD label="Combo" value={`${combo} (${1 + Math.floor(combo/5)}x)`} />
        </div>

        {/* Oyun alanı */}
        <div className="relative w-full aspect-[16/9] rounded-[28px] overflow-hidden border border-white/20 bg-white/5 shadow-[0_0_80px_#0ea5e955]">
          {/* grid */}
          <div className="absolute inset-0 pointer-events-none opacity-[.08]"
               style={{backgroundImage:"linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg,#fff 1px, transparent 1px)", backgroundSize:"28px 28px"}} />

          {/* Oyuncu (avatar) */}
          <div className="absolute -translate-x-1/2" style={{ left: `${x*100}%`, bottom: `6%` }}>
            {composedUrl ? (
              <div className="w-28 h-28 md:w-32 md:h-32 rounded-full border border-white/40 shadow-[0_10px_40px_rgba(255,255,255,.35)]"
                   style={{backgroundImage:`url(${composedUrl})`, backgroundSize:"cover", backgroundPosition:"center"}} />
            ) : (
              <div className="w-28 h-28 md:w-32 md:h-32 rounded-full border border-white/40 bg-white/10 flex items-center justify-center text-4xl">🕶️</div>
            )}
            <div className="text-center text-[10px] text-white/60 mt-1">you</div>
          </div>

          {/* Düşenler */}
          {dropsRef.current.map(d => <Token key={d.id} d={d} />)}

          {/* Floaty */}
          {floatiesRef.current.map(f => (
            <div key={f.id} className="absolute -translate-x-1/2 -translate-y-1/2 text-xs font-bold text-white drop-shadow"
                 style={{ left: `${f.x*100}%`, top: `${f.y*100}%`, opacity: Math.max(0, Math.min(1, f.life)) }}>
              {f.text}
            </div>
          ))}

          {/* Parçacıklar */}
          {particlesRef.current.map(p => (
            <div key={p.id} className="absolute -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white/80"
                 style={{ left: `${p.x*100}%`, top: `${p.y*100}%`, opacity: Math.max(0, Math.min(1, p.life)) }} />
          ))}

          {/* GAME OVER OVERLAY — oyun alanının ÜSTÜNDE */}
          {gameOver && (
            <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px] flex items-center justify-center p-4">
              <div className="rounded-[24px] border border-white/20 bg-white/10 p-6 text-center shadow-[0_0_60px_rgba(255,255,255,.2)] max-w-md w-full">
                <h2 className="text-3xl font-extrabold mb-1">Run Complete</h2>
                <div className="text-xs text-white/70 mb-2">by <b>@traderibo123</b></div>
                <div className="text-sm text-white/80">Total POWER</div>
                <div className="text-5xl font-black my-2">{power}</div>
                <div className="text-xs text-white/60 mb-4">Best: <b>{best}</b></div>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <button onClick={shareOnX} className="px-4 py-2 rounded-2xl bg-white text-black font-semibold">Share on X</button>
                  <button onClick={start} className="px-4 py-2 rounded-2xl bg-white/10 border border-white/20 font-semibold">Play again</button>
                  <button onClick={()=>router.push("/")} className="px-4 py-2 rounded-2xl bg-white/10 border border-white/20 font-semibold">Back to Intro</button>
                </div>
              </div>
            </div>
          )}
        </div>

        <footer className="mt-4 text-xs text-white/60 text-center">
          Fan-made demo • Tag <b>@billions_ntwk</b> • by <b>@traderibo123</b>
        </footer>
      </div>
    </div>
  );
}

function Token({ d }:{ d:Drop }) {
  const grad = COLORS[d.type]; const label = LABELS[d.type]; const icon = ICONS[d.type];
  return (
    <div className="absolute -translate-x-1/2 -translate-y-1/2 animate-wobble" style={{ left: `${d.x*100}%`, top: `${d.y*100}%` }} title={label}>
      <div className={`w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center ring-2 ring-white/40 shadow-[0_8px_30px_rgba(255,255,255,.18)] relative`}>
        <div className="absolute inset-0 rounded-full shadow-[inset_0_0_18px_rgba(255,255,255,.35)]" />
        <span className="text-lg md:text-xl drop-shadow">{icon}</span>
      </div>
      <div className="mt-1 text-[10px] text-center text-white/80 font-semibold tracking-wide">{label}</div>
    </div>
  );
}
function HUD({ label, value }:{ label:string; value:string }) {
  return (
    <div className="rounded-2xl bg-white/10 border border-white/20 shadow px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-white/60">{label}</div>
      <div className="text-lg font-bold leading-none">{value}</div>
    </div>
  );
}

/* globals.css içinde yoksa ekleyin:
@keyframes wobble { 0%{ transform: translateY(0) rotate(0deg);} 50%{ transform: translateY(-4px) rotate(1deg);} 100%{ transform: translateY(0) rotate(0deg);} }
.animate-wobble{ animation: wobble 1.6s ease-in-out infinite; }
*/
