import { SUPPLIER_KEYS, type SupplierAdapter, type SupplierKey } from "./types";

export const SUPPLIER_META: Record<
  SupplierKey,
  { displayName: string; website: string; competitorName: string }
> = {
  tambasa: {
    displayName: "Tambasa",
    website: "https://tambasa.com",
    competitorName: "Tambasa",
  },
  bartofil: {
    displayName: "Bartofil",
    website: "https://www.bartofil.com.br",
    competitorName: "Bartofil",
  },
};

/**
 * Import dinâmico de propósito: cada adapter lê as próprias credenciais na
 * construção, então carregá-los só quando forem usados mantém o boot do
 * servidor imune a credencial ausente.
 */
export async function getAdapter(key: SupplierKey): Promise<SupplierAdapter> {
  if (key === "tambasa") {
    const { TambasaAdapter } = await import("./tambasa");
    return new TambasaAdapter();
  }
  const { BartofilAdapter } = await import("./bartofil");
  return new BartofilAdapter();
}

export function listSupplierKeys(): readonly SupplierKey[] {
  return SUPPLIER_KEYS;
}
