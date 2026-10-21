import { useState, type ReactNode } from "react";
import {
  Search, Globe, MapPin, Building2, Clock, Network, ShieldAlert, Crosshair, Copy, Check, ArrowLeft, Radar, Loader2, Phone,
} from "lucide-react";
import { DemonicEyeCanvas } from "./DemonicEyeCanvas";
import { lookupIp, type IpReport } from "@/lib/ip-lookup.functions";
import { lookupPhone, type PhoneReport } from "@/lib/phone-lookup.functions";

interface Props { onReturnToPortal?: () => void }

type Mode = "ip" | "phone";

export function IpScannerPanel({ onReturnToPortal }: Props) {
  const [mode, setMode] = useState<Mode>("ip");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<IpReport | null>(null);
  const [phoneData, setPhoneData] = useState<PhoneReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const run = async (target: string) => {
    setLoading(true);
    setError(null);
    try {
      if (mode === "phone") {
        const r = await lookupPhone({ data: { target } });
        setPhoneData(r);
        setData(null);
        setInput(r.e164 ?? target);
        setHistory((h) => [r.e164 ?? target, ...h.filter((x) => x !== r.e164)].slice(0, 6));
      } else {
        const r = await lookupIp({ data: { target } });
        setData(r);
        setPhoneData(null);
        setInput(r.resolvedFrom ?? r.ip);
        setHistory((h) => [r.ip, ...h.filter((x) => x !== r.ip)].slice(0, 6));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao consultar.");
      setData(null);
      setPhoneData(null);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m: Mode) => {
    if (m === mode) return;
    setMode(m);
    setInput("");
    setError(null);
    setData(null);
    setPhoneData(null);
  };

  const copy = async () => {
    if (!data) return;
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const g = data?.geo;
  const n = data?.network;
  const t = data?.time;
  const riskColor = !data ? "" : data.risk.score >= 60 ? "bg-lava" : data.risk.score >= 30 ? "bg-ember" : "bg-gold";

  return (
    <div className="relative h-full w-full overflow-y-auto bg-abyss bg-[radial-gradient(ellipse_at_top,color-mix(in_oklch,var(--lava)_22%,transparent),transparent_60%)] text-gold">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-8 sm:py-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2 rounded-full border border-lava/40 bg-panel px-4 py-1.5 backdrop-blur">
            <span className="h-2 w-2 animate-pulse rounded-full bg-lava" />
            <span className="font-cinzel text-[11px] font-bold uppercase tracking-[0.3em] text-ember">Olho ativo</span>
          </div>
          <button onClick={onReturnToPortal} className="flex items-center gap-1.5 rounded-full border border-lava/30 bg-panel px-4 py-1.5 font-mono text-xs text-ash transition hover:border-ember hover:text-gold">
            <ArrowLeft className="h-3.5 w-3.5" /> Portal
          </button>
        </header>

        <section className="flex flex-col items-center gap-5 text-center">
          <div className="relative h-36 w-36 sm:h-44 sm:w-44">
            <div className="absolute -inset-4 animate-pulse rounded-full bg-lava/20 blur-2xl" />
            <div className="glow-ember relative h-full w-full overflow-hidden rounded-full border-2 border-lava/70 bg-abyss">
              <DemonicEyeCanvas />
              {loading && <div className="animate-scanline pointer-events-none absolute inset-x-0 h-1/3 bg-gradient-to-b from-transparent via-ember/40 to-transparent" />}
            </div>
          </div>
          <div>
            <h1 className="text-fire font-gothic text-3xl font-black uppercase tracking-[0.12em] sm:text-5xl">Rastreador</h1>
            <p className="mt-2 font-cinzel text-xs tracking-widest text-ash">IP ou domínio — o olho vê tudo</p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); if (input.trim()) run(input.trim()); else setError("Digite um IP ou domínio."); }} className="flex w-full max-w-2xl flex-col gap-2.5 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ember" />
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="8.8.8.8 ou google.com"
                className="glow-ember w-full rounded-2xl border border-ember/50 bg-panel py-3.5 pl-11 pr-4 font-mono text-sm text-gold outline-none backdrop-blur transition placeholder:text-ash/50 focus:border-gold"
              />
            </div>
            <div className="flex gap-2.5">
              <button type="submit" disabled={loading} className="glow-ember flex flex-1 items-center justify-center gap-2 rounded-2xl border border-ember bg-gradient-to-b from-lava/40 to-abyss px-6 py-3.5 font-cinzel text-sm font-bold uppercase tracking-widest text-gold transition hover:border-gold active:scale-95 disabled:opacity-50">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radar className="h-4 w-4" />} Rastrear
              </button>
              <button type="button" disabled={loading} onClick={() => run("me")} title="Meu IP" className="flex items-center gap-2 rounded-2xl border border-lava/40 bg-panel px-4 py-3.5 font-mono text-xs text-ash transition hover:border-ember hover:text-gold disabled:opacity-50">
                <Crosshair className="h-4 w-4" /> Meu IP
              </button>
            </div>
          </form>

          {history.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              {history.map((h) => (
                <button key={h} onClick={() => run(h)} className="rounded-full border border-lava/30 bg-panel px-3 py-1 font-mono text-[11px] text-ash hover:border-ember hover:text-gold">{h}</button>
              ))}
            </div>
          )}

          {error && (
            <div className="flex w-full max-w-2xl items-center gap-3 rounded-2xl border border-lava/60 bg-lava/10 px-4 py-3 text-left text-sm text-gold">
              <ShieldAlert className="h-5 w-5 shrink-0 text-lava" /> {error}
            </div>
          )}
        </section>

        {data && (
          <section className="flex flex-col gap-4 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-4 rounded-3xl border border-ember/40 bg-panel p-5 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <span className="text-5xl leading-none">{g?.flag ?? "🌐"}</span>
                <div>
                  <div className="font-mono text-xl font-semibold text-gold sm:text-2xl">{data.ip}</div>
                  <div className="text-sm text-ash">
                    {[g?.city, g?.region, g?.country].filter(Boolean).join(", ")}
                    {data.resolvedFrom && <span className="ml-2 text-ember">← {data.resolvedFrom}</span>}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{data.version}</Badge>
                {data.flags.mobile && <Badge tone="ember">Móvel</Badge>}
                {data.flags.proxy && <Badge tone="lava">Proxy / VPN</Badge>}
                {data.flags.hosting && <Badge tone="ember">Datacenter</Badge>}
                {!data.flags.proxy && !data.flags.hosting && <Badge>Residencial</Badge>}
                <button onClick={copy} className="flex items-center gap-1 rounded-full border border-lava/30 px-3 py-1 font-mono text-[11px] text-ash hover:text-gold">
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} JSON
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-lava/30 bg-panel p-5 backdrop-blur">
              <div className="mb-2 flex items-center justify-between font-cinzel text-xs uppercase tracking-widest">
                <span className="text-ash">Nível de risco</span>
                <span className="text-gold">{data.risk.label} · {data.risk.score}/100</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-abyss">
                <div className={`h-full rounded-full ${riskColor} transition-all duration-700`} style={{ width: `${data.risk.score}%` }} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card icon={<MapPin className="h-4 w-4" />} title="Localização">
                <Row k="Continente" v={g?.continent} />
                <Row k="País" v={g?.country && `${g.country} (${g.countryCode})`} />
                <Row k="Capital" v={g?.capital} />
                <Row k="Estado / Região" v={g?.region} />
                <Row k="Cidade" v={g?.city} />
                <Row k="Bairro" v={g?.district} />
                <Row k="CEP" v={g?.zip} />
                <Row k="Coordenadas" v={g?.lat !== undefined ? `${g.lat}, ${g.lon}` : undefined} />
              </Card>

              <Card icon={<Building2 className="h-4 w-4" />} title="Provedor">
                <Row k="ISP" v={n?.isp} />
                <Row k="Organização" v={n?.org} />
                <Row k="ASN" v={n?.asn} />
                <Row k="Nome do AS" v={n?.asName} />
                <Row k="Hostname" v={n?.hostname} />
              </Card>

              <Card icon={<Network className="h-4 w-4" />} title="Registro da rede">
                <Row k="Nome da rede" v={n?.networkName} />
                <Row k="Faixa de IPs" v={n?.range} />
                <Row k="Registrado em" v={n?.registeredAt} />
                <Row k="Servidor WHOIS" v={n?.registry} />
                <Row k="Contato de abuso" v={n?.abuseEmail} />
              </Card>

              <Card icon={<Clock className="h-4 w-4" />} title="Hora e região">
                <Row k="Fuso horário" v={t?.timezone} />
                <Row k="UTC" v={t?.utcOffset} />
                <Row k="Hora local" v={t?.localTime} />
                <Row k="Moeda" v={t?.currency} />
                <Row k="DDI" v={g?.callingCode} />
              </Card>
            </div>

            {g?.lat !== undefined && g?.lon !== undefined && (
              <div className="overflow-hidden rounded-3xl border border-ember/40 bg-panel">
                <div className="flex items-center justify-between px-5 py-3">
                  <span className="flex items-center gap-2 font-cinzel text-xs font-bold uppercase tracking-widest text-ember"><Globe className="h-4 w-4" /> Mapa aproximado</span>
                  <a className="font-mono text-[11px] text-ash hover:text-gold" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${g.lat},${g.lon}`}>Abrir no Google Maps ↗</a>
                </div>
                <iframe
                  title="Mapa"
                  className="h-72 w-full border-0 [filter:invert(0.9)_hue-rotate(160deg)_saturate(0.6)]"
                  loading="lazy"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${g.lon - 0.08},${g.lat - 0.05},${g.lon + 0.08},${g.lat + 0.05}&layer=mapnik&marker=${g.lat},${g.lon}`}
                />
              </div>
            )}

            <p className="text-center font-mono text-[10px] text-ash/60">
              Fontes: {data.sources.join(" · ")} — a localização por IP é aproximada (geralmente cidade/provedor).
            </p>
          </section>
        )}
      </div>
    </div>
  );
}

function Card({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="rounded-3xl border border-lava/30 bg-panel p-5 backdrop-blur transition hover:border-ember/60">
      <div className="mb-3 flex items-center gap-2 font-cinzel text-xs font-bold uppercase tracking-widest text-ember">{icon}{title}</div>
      <dl className="divide-y divide-lava/15">{children}</dl>
    </div>
  );
}

function Row({ k, v }: { k: string; v?: string | number | null | false | undefined }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <dt className="shrink-0 text-ash">{k}</dt>
      <dd className="break-all text-right font-mono text-gold">{v || v === 0 ? v : <span className="text-ash/40">—</span>}</dd>
    </div>
  );
}

function Badge({ children, tone }: { children: ReactNode; tone?: "lava" | "ember" }) {
  const c = tone === "lava" ? "border-lava bg-lava/20 text-gold" : tone === "ember" ? "border-ember/60 bg-ember/10 text-gold" : "border-ash/30 text-ash";
  return <span className={`rounded-full border px-3 py-1 font-mono text-[11px] uppercase ${c}`}>{children}</span>;
}
