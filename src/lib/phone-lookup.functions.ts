import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { parsePhoneNumberFromString, getCountries, getCountryCallingCode, type CountryCode } from "libphonenumber-js";

export interface PhoneReport {
  input: string;
  valid: boolean;
  possible: boolean;
  e164?: string | undefined;
  international?: string | undefined;
  national?: string | undefined;
  country?: string | undefined;
  countryName?: string | undefined;
  callingCode?: string | undefined;
  type?: string | undefined;
  typeLabel?: string | undefined;
  uri?: string | undefined;
}

const TYPE_LABELS: Record<string, string> = {
  MOBILE: "Celular",
  FIXED_LINE: "Fixo",
  FIXED_LINE_OR_MOBILE: "Fixo ou celular",
  TOLL_FREE: "Gratuito (0800)",
  PREMIUM_RATE: "Tarifa premium",
  SHARED_COST: "Custo compartilhado",
  VOIP: "VoIP",
  PERSONAL_NUMBER: "Número pessoal",
  PAGER: "Pager",
  UAN: "UAN",
  VOICEMAIL: "Caixa postal",
};

const COUNTRY_NAMES = new Intl.DisplayNames(["pt-BR"], { type: "region" });

export const lookupPhone = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ target: z.string().trim().max(32) }).parse(d))
  .handler(async ({ data }): Promise<PhoneReport> => {
    const raw = data.target;
    if (!raw) throw new Error("Digite um número de telefone.");

    // Aceita formatos comuns: +55 11 99999-9999, 5511999999999, (11) 99999-9999
    let phone = parsePhoneNumberFromString(raw);
    if (!phone && !raw.startsWith("+")) {
      // Tenta Brasil como padrão, depois com prefixo +
      phone = parsePhoneNumberFromString(raw, "BR" as CountryCode) ?? parsePhoneNumberFromString(`+${raw.replace(/\D/g, "")}`);
    }
    if (!phone) throw new Error("Não consegui entender esse número. Use o formato +55 11 99999-9999.");

    const country = phone.country;
    const type = phone.getType();
    return {
      input: raw,
      valid: phone.isValid(),
      possible: phone.isPossible(),
      e164: phone.number,
      international: phone.formatInternational(),
      national: phone.formatNational(),
      country,
      countryName: country ? COUNTRY_NAMES.of(country) : undefined,
      callingCode: country ? `+${getCountryCallingCode(country)}` : undefined,
      type,
      typeLabel: type ? TYPE_LABELS[type] ?? type : undefined,
      uri: phone.getURI(),
    };
  });

export const listPhoneCountries = createServerFn({ method: "GET" }).handler(async () =>
  getCountries().map((c) => ({ code: c, name: COUNTRY_NAMES.of(c) ?? c, callingCode: `+${getCountryCallingCode(c)}` })),
);
