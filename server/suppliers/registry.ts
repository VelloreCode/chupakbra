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
  martins: {
    displayName: "Martins Atacado",
    website: "https://www.martinsatacado.com.br",
    clientName: "Martins",
  },
};

/**
 * Fornecedores cujo login não é automatizável (2FA por SMS, no caso do
 * Martins). A sessão é capturada manualmente e guardada em supplier_sessions.
 */
export const SUPPLIERS_WITH_MANUAL_SESSION: readonly SupplierKey[] = ["martins"];

/**
 * Fornecedores autorizados a cadastrar produto novo durante a sincronização.
 *
 * A regra geral é só atualizar o que já existe. O Martins é exceção porque
 * entrou com catálogo zerado — sem isto a primeira coleta não casaria nada e
 * terminaria vazia, parecendo falha.
 */
export const SUPPLIERS_ALLOWED_TO_CREATE: readonly SupplierKey[] = ["martins"];

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
  if (key === "martins") {
    const { MartinsAdapter } = await import("./martins");
    return await MartinsAdapter.create();
  }
  const { BartofilAdapter } = await import("./bartofil");
  return new BartofilAdapter();
}

export function listSupplierKeys(): readonly SupplierKey[] {
  return SUPPLIER_KEYS;
}
