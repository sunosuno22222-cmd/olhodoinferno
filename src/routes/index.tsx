import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import { HellCanvas } from "@/components/HellCanvas";
import { IpScannerPanel } from "@/components/IpScannerPanel";
import type { HellSceneManager } from "@/scene/HellSceneManager";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Olhos do Diabo — Rastreador de IP" },
      { name: "description", content: "Atravesse o portal e descubra localização, provedor, rede e risco de qualquer IP ou domínio." },
      { property: "og:title", content: "Olhos do Diabo — Rastreador de IP" },
      { property: "og:description", content: "Localização, provedor, rede e risco de qualquer IP ou domínio, com visual infernal em 3D." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type AppState = "portal" | "diving" | "eye";

function Index() {
  const [state, setState] = useState<AppState>("portal");
  const [black, setBlack] = useState(0);
  const sceneRef = useRef<HellSceneManager | null>(null);

  const onProgress = useCallback((p: number) => setBlack(Math.min(1, p * 1.5)), []);
  const onComplete = useCallback(() => setState("eye"), []);

  const enter = useCallback(() => {
    if (state !== "portal") return;
    setState("diving");
    if (sceneRef.current) sceneRef.current.triggerEnterDive();
    else {
      let p = 0;
      const t = setInterval(() => {
        p += 0.05;
        onProgress(p);
        if (p >= 1) { clearInterval(t); onComplete(); }
      }, 40);
    }
  }, [state, onProgress, onComplete]);

  const reset = useCallback(() => {
    setState("portal");
    setBlack(0);
    sceneRef.current?.resetDive();
  }, []);

  return (
    <div className="relative h-[100dvh] w-full select-none overflow-hidden bg-abyss">
      {state !== "eye" && (
        <>
          <HellCanvas onDiveProgress={onProgress} onDiveComplete={onComplete} sceneManagerRef={sceneRef} />
          <div className="pointer-events-none absolute inset-0 z-30 bg-abyss" style={{ opacity: black }} />
          <div className="pointer-events-none absolute inset-0 z-20 bg-[radial-gradient(ellipse_at_center,transparent_40%,var(--abyss)_100%)]" />

          <div className={`pointer-events-none absolute inset-0 z-40 flex flex-col items-center justify-between p-6 transition-opacity duration-500 sm:p-10 ${state === "diving" ? "opacity-0" : "opacity-100"}`}>
            <div className="mt-8 flex flex-col items-center gap-3 sm:mt-14">
              <span className="font-mono text-[10px] uppercase tracking-[0.5em] text-ember/80">— rastreador —</span>
              <h1 className="text-fire text-center font-gothic text-4xl font-black uppercase tracking-[0.14em] sm:text-6xl">
                Olhos do Diabo
              </h1>
              <p className="max-w-xs text-center font-cinzel text-xs tracking-widest text-ash">
                Nada escapa ao olhar do abismo
              </p>
            </div>

            <div className="pointer-events-auto mb-10 flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={enter}
                className="glow-ember group relative overflow-hidden rounded-full border border-ember bg-abyss/80 px-10 py-3.5 font-cinzel text-sm font-bold uppercase tracking-[0.35em] text-gold backdrop-blur transition-all hover:scale-105 hover:border-gold active:scale-95"
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-ember/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                <span className="relative">Entrar</span>
              </button>
              <span className="font-mono text-[10px] uppercase tracking-widest text-ash/60">toque para atravessar o portal</span>
            </div>
          </div>
        </>
      )}

      {state === "eye" && (
        <div className="absolute inset-0 z-40 animate-in fade-in duration-700">
          <IpScannerPanel onReturnToPortal={reset} />
        </div>
      )}
    </div>
  );
}
