import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

export interface IpReport {
  ip: string;
  resolvedFrom?: string | undefined;
  version: "IPv4" | "IPv6";
  geo: {
    continent?: string | undefined;
    country?: string | undefined;
    countryCode?: string | undefined;
    flag?: string | undefined;
    capital?: string | undefined;
    callingCode?: string | undefined;
    region?: string | undefined;
    city?: string | undefined;
    district?: string | undefined;
    zip?: string | undefined;
    lat?: number | undefined;
    lon?: number | undefined;
  };
  time: { timezone?: string | undefined; utcOffset?: string | undefined; localTime?: string | undefined; currency?: string };
  network: {
    isp?: string | undefined;
    org?: string | undefined;
    asn?: string | undefined;
    asName?: string | undefined;
    hostname?: string | undefined;
    range?: string | undefined;
    networkName?: string | undefined;
    registry?: string | undefined;
    abuseEmail?: string | undefined;
    registeredAt?: string | undefined;
  };
  flags: { mobile: boolean; proxy: boolean; hosting: boolean; privateIp: boolean };
  risk: { score: number; label: string };
  sources: string[];
}

const IPV4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
const IPV6 = /^[0-9a-fA-F:]+$/;
const DOMAIN = /^(?=.{1,253}$)([a-zA-Z0-9-]{1,63}\.)+[a-zA-Z]{2,63}$/;

async function safeJson(url: string, init?: RequestInit): Promise<any | null> {
  try {
    const r = await fetch(url, { ...init, signal: AbortSignal.timeout(6000) });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

async function resolveDomain(domain: string): Promise<string | null> {
  const j = await safeJson(`https://cloudflare-dns.com/dns-query?name=${domain}&type=A`, {
    headers: { accept: "application/dns-json" },
  });
  const a = j?.Answer?.find((x: any) => x.type === 1);
  return a?.data ?? null;
}

function ptrName(ip: string): string | null {
  if (!IPV4.test(ip)) return null;
  return ip.split(".").reverse().join(".") + ".in-addr.arpa";
}

function isPrivate(ip: string) {
  return /^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|::1$|fc|fd|fe80)/i.test(ip);
}

export const lookupIp = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ target: z.string().trim().max(253) }).parse(d))
  .handler(async ({ data }): Promise<IpReport> => {
    let target = data.target;
    let resolvedFrom: string | undefined;

    if (!target || target === "me") {
      const fwd =
        getRequestHeader("cf-connecting-ip") ||
        getRequestHeader("x-real-ip") ||
        getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim();
      target = fwd || "";
    } else if (DOMAIN.test(target) && !IPV4.test(target)) {
      const ip = await resolveDomain(target);
      if (!ip) throw new Error("Não consegui resolver esse domínio.");
      resolvedFrom = target;
      target = ip;
    } else if (!IPV4.test(target) && !(target.includes(":") && IPV6.test(target))) {
      throw new Error("Digite um IP (ex: 8.8.8.8) ou um domínio (ex: google.com).");
    }

    if (target && isPrivate(target)) {
      throw new Error("Esse é um IP privado/local — não tem localização pública.");
    }

    const fields =
      "status,message,continent,country,countryCode,regionName,city,district,zip,lat,lon,timezone,offset,currency,isp,org,as,asname,reverse,mobile,proxy,hosting,query";
    const [ipApi, whois] = await Promise.all([
      safeJson(`http://ip-api.com/json/${target}?fields=${fields}`),
      safeJson(`https://ipwho.is/${target}`),
    ]);

    if ((!ipApi || ipApi.status === "fail") && (!whois || whois.success === false)) {
      throw new Error(ipApi?.message || whois?.message || "Falha ao rastrear esse IP.");
    }

    const ip: string = ipApi?.query || whois?.ip || target;
    const ptr = ptrName(ip);

    const [rdap, dns] = await Promise.all([
      safeJson(`https://rdap.org/ip/${ip}`),
      ptr
        ? safeJson(`https://cloudflare-dns.com/dns-query?name=${ptr}&type=PTR`, {
            headers: { accept: "application/dns-json" },
          })
        : Promise.resolve(null),
    ]);

    const sources = ["ip-api.com"];
    if (whois?.success) sources.push("ipwho.is");
    if (rdap) sources.push("RDAP");
    if (dns) sources.push("Cloudflare DNS");

    const abuse = rdap?.entities
      ?.flatMap((e: any) => [e, ...(e.entities ?? [])])
      .find((e: any) => e.roles?.includes("abuse"));
    const abuseEmail = abuse?.vcardArray?.[1]?.find((v: any) => v[0] === "email")?.[3];
    const reg = rdap?.events?.find((e: any) => e.eventAction === "registration")?.eventDate;
    const range =
      rdap?.startAddress && rdap?.endAddress ? `${rdap.startAddress} – ${rdap.endAddress}` : undefined;

    const offsetSec: number | undefined = ipApi?.offset ?? whois?.timezone?.offset;
    const utcOffset =
      offsetSec !== undefined
        ? `UTC${offsetSec >= 0 ? "+" : "-"}${String(Math.floor(Math.abs(offsetSec) / 3600)).padStart(2, "0")}:${String((Math.abs(offsetSec) % 3600) / 60).padStart(2, "0")}`
        : undefined;
    const tz: string | undefined = ipApi?.timezone || whois?.timezone?.id;
    let localTime: string | undefined;
    try {
      if (tz)
        localTime = new Date().toLocaleString("pt-BR", { timeZone: tz, dateStyle: "short", timeStyle: "medium" });
    } catch {}

    const flags = {
      mobile: !!ipApi?.mobile,
      proxy: !!ipApi?.proxy,
      hosting: !!ipApi?.hosting,
      privateIp: false,
    };
    let score = 5;
    if (flags.proxy) score += 55;
    if (flags.hosting) score += 30;
    if (flags.mobile) score += 5;
    score = Math.min(score, 100);
    const label = score >= 60 ? "Alto" : score >= 30 ? "Médio" : "Baixo";

    return {
      ip,
      resolvedFrom,
      version: ip.includes(":") ? "IPv6" : "IPv4",
      geo: {
        continent: ipApi?.continent || whois?.continent,
        country: ipApi?.country || whois?.country,
        countryCode: ipApi?.countryCode || whois?.country_code,
        flag: whois?.flag?.emoji,
        capital: whois?.capital,
        callingCode: whois?.calling_code ? `+${whois.calling_code}` : undefined,
        region: ipApi?.regionName || whois?.region,
        city: ipApi?.city || whois?.city,
        district: ipApi?.district || undefined,
        zip: ipApi?.zip || whois?.postal || undefined,
        lat: ipApi?.lat ?? whois?.latitude,
        lon: ipApi?.lon ?? whois?.longitude,
      },
      time: { timezone: tz, utcOffset, localTime, currency: ipApi?.currency },
      network: {
        isp: ipApi?.isp || whois?.connection?.isp,
        org: ipApi?.org || whois?.connection?.org,
        asn: ipApi?.as || (whois?.connection?.asn ? `AS${whois.connection.asn}` : undefined),
        asName: ipApi?.asname,
        hostname:
          dns?.Answer?.find((a: any) => a.type === 12)?.data?.replace(/\.$/, "") || ipApi?.reverse || undefined,
        range,
        networkName: rdap?.name,
        registry: rdap?.port43,
        abuseEmail,
        registeredAt: reg ? new Date(reg).toLocaleDateString("pt-BR") : undefined,
      },
      flags,
      risk: { score, label },
      sources,
    };
  });
