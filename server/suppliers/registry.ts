import { SUPPLIER_KEYS, type SupplierAdapter, type SupplierKey } from "./types";

export const SUPPLIER_META: Record<
  SupplierKey,
  { displayName: string; website: string; clientName: string }
> = {
  tambasa: {
    displayName: "Tambasa",
    website: "https://tambasa.com",
    // Nome da linha em `clients` (Tambasa = #5, Bartofil = #4 no banco de teste).
    // A busca é por nome, não por id, para não fixar id de ambiente no código.
    clientName: "Tambasa",
  },
  bartofil: {
    displayName: "Bartofil",
    website: "https://www.bartofil.com.br",
    clientName: "Bartofil",
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
