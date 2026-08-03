// Adapter Martins Atacado — https://www.martinsatacado.com.br
//
// Site Next.js com SSR. A coleta é híbrida, e essa divisão é a chave do
// desenho (verificado contra o site em 03/08/2026):
//
//   catálogo  PÚBLICO       /departamentos/{slug}?page=N devolve 12 produtos
//                           por página no payload __NEXT_DATA__, com código e
//                           nome — mas com preço zerado.
//   preço     AUTENTICADO   POST /b2b-partner/v1/produtosBuyBox, em lote por
//                           código, com o header access_token.
//
// O login tem 2FA por SMS, então não é automatizável: a sessão é capturada à
// mão (ver session-capture.ts) e guardada em supplier_sessions.

import { z } from "zod";
import type { AxiosInstance } from "axios";
import { storage } from "../storage";
import { createHttpClient, withBackoff } from "./http";
import { errorMessage, sleepJitter } from "./util";
import {
  SupplierAuthError,
  SupplierConfigError,
  type SupplierAdapter,
  type SupplierCategoryRef,
  type SupplierProduct,
  type SyncCtx,
} from "./types";

const LOG = "[SUPPLIER:martins]";
const SITE = "https://www.martinsatacado.com.br";
const API = "https://ssd.martins.com.br/b2b-partner/v1";

/** A listagem pública devolve 12 por página; não é configurável na URL. */
const POR_PAGINA = 12;
/** Tamanho do lote na consulta de preço. O site usa 12; 50 é conservador. */
const LOTE_PRECO = 50;

/**
 * De onde tirar o preço. A mesma resposta traz as duas fontes:
 *
 *   'martins'      preço do próprio Martins (resultado[].precos[]). PADRÃO.
 *   'marketplace'  melhor oferta de vendedor terceiro (lstPrecoSeller).
 *
 * O padrão é 'martins' por cobertura, medida na categoria Ferramentas Manuais
 * em 03/08/2026: 23 de 24 produtos com preço (96%) contra 3 de 24 (13%) pelo
 * marketplace — as ofertas de terceiros vêm majoritariamente com estoque 0 e
 * blocked=1. Monitorar pelo marketplace deixaria a comparação quase vazia.
 *
 * Para usar o marketplace: MARTINS_PRICE_SOURCE=marketplace.
 */
type FontePreco = "marketplace" | "martins";

function getFontePreco(): FontePreco {
  return process.env.MARTINS_PRICE_SOURCE === "marketplace" ? "marketplace" : "martins";
}

// ---------------------------------------------------------------------------
// Validação da resposta de preço
// ---------------------------------------------------------------------------

const numeroOuTexto = z.union([z.string(), z.number()]).nullish();

const precoSellerSchema = z.object({
  codigoMercadoriaOrigem: z.string().nullish(),
  codigoMercadoria: z.string().nullish(),
  seller: z.string().nullish(),
  preco: numeroOuTexto,
  estoque: z.number().nullish(),
  // "1" marca oferta indisponível; sem isto entrariam preços 0 como se fossem reais.
  blocked: z.union([z.string(), z.number()]).nullish(),
  // Nome críptico, mas é o código de barras (conferido no HAR autenticado).
  CODBRRUNDVNDCSM: z.string().nullish(),
});

const precoMartinsSchema = z.object({
  precoNormal: numeroOuTexto,
  precoCaixa: numeroOuTexto,
  estoque: z.number().nullish(),
});

const resultadoSchema = z.object({
  codigoMercadoria: z.string().nullish(),
  CODBRRUNDVNDCSM: z.string().nullish(),
  precos: z.array(precoMartinsSchema).nullish(),
});

const buyBoxSchema = z.object({
  status: z.number().nullish(),
  mensagem: z.string().nullish(),
  resultado: z.array(resultadoSchema).nullish(),
  lstPrecoSeller: z.array(precoSellerSchema).nullish(),
});

function paraNumero(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

interface SessaoMartins {
  accessToken: string;
  clientId: string | null;
  bodyTemplate: Record<string, unknown> | null;
}

export class MartinsAdapter implements SupplierAdapter {
  readonly key = "martins" as const;
  readonly displayName = "Martins Atacado";
  /** O código do portal ("martins_406692") vai direto em products.sku. */
  readonly matchStrategy = "sku" as const;

  private readonly http: AxiosInstance;
  private readonly fonte: FontePreco;

  private constructor(private readonly sessao: SessaoMartins) {
    this.fonte = getFontePreco();
    this.http = createHttpClient({ logPrefix: LOG, timeout: 45_000 }).instance;
  }

  /**
   * Assíncrono porque a sessão vem do banco. Sem sessão o adapter nem é
   * construído — falhar aqui dá uma mensagem clara em vez de 403 no meio da
   * varredura.
   */
  static async create(): Promise<MartinsAdapter> {
    const s = await storage.getSupplierSession("martins");
    if (!s?.accessToken) {
      throw new SupplierConfigError(
        "Sessão do Martins não capturada. O login tem 2FA por SMS: faça login no " +
          "navegador e cole o \"Copy as cURL\" de uma requisição autenticada na tela de Fornecedores.",
      );
    }
    return new MartinsAdapter({
      accessToken: s.accessToken,
      clientId: s.clientId,
      bodyTemplate: (s.bodyTemplate as Record<string, unknown> | null) ?? null,
    });
  }

  async close(): Promise<void> {}

  // -------------------------------------------------------------------------
  // Categorias (público)
  // -------------------------------------------------------------------------

  async listCategories(): Promise<SupplierCategoryRef[]> {
    const html = await this.buscarHtml("/");
    const dados = this.extrairNextData(html);
    if (!dados) return [];

    const deps = this.acharDepartamentos(dados);
    const refs: SupplierCategoryRef[] = [];

    for (const dep of deps) {
      const slug = Array.isArray(dep.terms) ? dep.terms.join("/") : null;
      if (!slug || !dep.title) continue;
      refs.push({ externalId: slug, label: String(dep.title), parentExternalId: null });

      for (const sub of dep.subDepartmentList ?? []) {
        const subSlug = Array.isArray(sub.terms) ? sub.terms.join("/") : null;
        if (!subSlug || !sub.title) continue;
        refs.push({ externalId: subSlug, label: String(sub.title), parentExternalId: slug });
      }
    }

    // Um mesmo slug aparece em menus diferentes.
    const unicos = new Map(refs.map((r) => [r.externalId, r]));
    return Array.from(unicos.values());
  }

  private acharDepartamentos(dados: any): Array<any> {
    const fb = dados?.props?.pageProps?.fallback ?? {};
    const lista = fb["department-static-props"];
    return Array.isArray(lista) ? lista : [];
  }

  // -------------------------------------------------------------------------
  // Produtos: códigos do site público + preço da API autenticada
  // -------------------------------------------------------------------------

  async *iterateProducts(
    cat: SupplierCategoryRef,
    ctx: SyncCtx,
  ): AsyncGenerator<SupplierProduct[]> {
    const vistos = new Set<string>();

    for (let page = 1; page <= ctx.maxPages; page++) {
      const html = await this.buscarHtml(`/departamentos/${cat.externalId}?page=${page}`);
      const itens = this.extrairProdutos(html);

      if (itens.length === 0) {
        ctx.onPage?.(page, 0);
        return;
      }

      // Mesma proteção dos outros adapters: servidor que ignora ?page devolve
      // sempre a página 1 e o laço rodaria até o teto sem perceber.
      const novos = itens.filter((i) => !vistos.has(i.externalCode));
      if (novos.length === 0) {
        ctx.onPage?.(page, 0);
        return;
      }
      novos.forEach((i) => vistos.add(i.externalCode));

      try {
        await this.preencherPrecos(novos);
      } catch (error) {
        if (error instanceof SupplierAuthError) throw error;
        ctx.onError?.("UNEXPECTED", `falha ao consultar preços: ${errorMessage(error)}`);
      }

      for (const item of novos) item.categoryLabel = cat.label;

      ctx.onPage?.(page, novos.length);
      yield novos;

      if (itens.length < POR_PAGINA) return;

      if (page === ctx.maxPages) {
        ctx.onError?.("PAGE_CAP_HIT", `categoria ${cat.label} atingiu o teto de ${ctx.maxPages} páginas`);
      }

      await sleepJitter(1200);
    }
  }

  private async buscarHtml(path: string): Promise<string> {
    const res = await withBackoff(
      () => this.http.get<string>(`${SITE}${path}`, { responseType: "text" }),
      { logPrefix: LOG },
    );
    return typeof res.data === "string" ? res.data : String(res.data);
  }

  private extrairNextData(html: string): any | null {
    const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!m) return null;
    try {
      return JSON.parse(m[1]);
    } catch {
      return null;
    }
  }

  /**
   * Códigos e nomes saem do payload SSR. Os preços que vêm aqui são sempre 0
   * para quem não está logado — por isso o preço é resolvido depois, pela API.
   */
  private extrairProdutos(html: string): SupplierProduct[] {
    const dados = this.extrairNextData(html);
    if (!dados) return [];

    const encontrados = new Map<string, SupplierProduct>();

    // O campo do código muda conforme a tela: `productSku` na listagem de
    // departamento, `product` na vitrine da home. Aceitar os dois evita que
    // uma mudança de tela zere a coleta silenciosamente.
    const visitar = (no: any): void => {
      if (!no || typeof no !== "object") return;
      if (Array.isArray(no)) {
        no.forEach(visitar);
        return;
      }

      const codigo =
        (typeof no.productSku === "string" && no.productSku.startsWith("martins_") && no.productSku) ||
        (typeof no.product === "string" && no.product.startsWith("martins_") && no.product) ||
        null;

      if (codigo && typeof no.name === "string" && !encontrados.has(codigo)) {
        const img = Array.isArray(no.images) ? no.images[0] : no.imagemPrincipal;
        encontrados.set(codigo, {
          externalCode: codigo,
          name: no.name.trim(),
          manufacturer: typeof no.manufacturer === "string" ? no.manufacturer.trim() : undefined,
          price: null, // resolvido por preencherPrecos
          imageUrl: typeof img === "string" ? img : undefined,
          productUrl:
            typeof no.productUrl === "string" && no.productUrl
              ? `${SITE}${no.productUrl.startsWith("/") ? "" : "/"}${no.productUrl}`
              : `${SITE}/produto/${codigo}`,
        });
      }

      Object.values(no).forEach(visitar);
    };

    visitar(dados);
    return Array.from(encontrados.values());
  }

  // -------------------------------------------------------------------------
  // Preço (autenticado)
  // -------------------------------------------------------------------------

  private async preencherPrecos(itens: SupplierProduct[]): Promise<void> {
    for (let i = 0; i < itens.length; i += LOTE_PRECO) {
      const lote = itens.slice(i, i + LOTE_PRECO);
      const precos = await this.consultarPrecos(lote.map((x) => x.externalCode));
      for (const item of lote) {
        const p = precos.get(item.externalCode);
        if (p) {
          item.price = p.preco;
          item.isAvailable = p.disponivel;
          // O EAN vem junto da consulta de preço, não da listagem pública.
          if (p.ean) item.ean = p.ean;
        }
      }
      if (i + LOTE_PRECO < itens.length) await sleepJitter(800);
    }
  }

  private async consultarPrecos(
    codigos: string[],
  ): Promise<Map<string, { preco: number | null; disponivel: boolean; ean?: string }>> {
    const saida = new Map<string, { preco: number | null; disponivel: boolean; ean?: string }>();
    if (codigos.length === 0) return saida;

    // O template não é opcional. Remontar o corpo só com {asm, produtos} é
    // recusado com 403: a API exige os ~37 campos de contexto do cadastro
    // (região de preço, filial, cidade), e são eles que determinam o preço.
    const template = this.sessao.bodyTemplate;
    if (!template) {
      throw new SupplierConfigError(
        "Sessão do Martins sem o corpo da requisição. Recapture o cURL de uma chamada a produtosBuyBox.",
      );
    }

    const body = {
      ...template,
      produtos: codigos.map((c) => ({
        CodigoMercadoria: c,
        Quantidade: 0,
        codGroupMerFrac: 0,
        codPmc: null,
      })),
    };

    const res = await withBackoff(
      () =>
        this.http.post(`${API}/produtosBuyBox`, body, {
          headers: {
            access_token: this.sessao.accessToken,
            ...(this.sessao.clientId ? { client_id: this.sessao.clientId } : {}),
            "content-type": "application/json",
            origin: SITE,
            referer: `${SITE}/`,
            accept: "*/*",
          },
          // 401/403 têm tratamento próprio abaixo; deixar passar evita que o
          // backoff fique reciclando uma sessão que já morreu.
          validateStatus: (s) => s < 500,
        }),
      { logPrefix: LOG },
    );

    if (res.status === 401 || res.status === 403) {
      await storage.markSupplierSessionResult("martins", false, `HTTP ${res.status} em produtosBuyBox`);
      throw new SupplierAuthError(
        "martins",
        `sessão expirada ou inválida (HTTP ${res.status}) — capture o cURL novamente`,
      );
    }

    const parsed = buyBoxSchema.safeParse(res.data);
    if (!parsed.success) {
      throw new Error(`resposta de produtosBuyBox em formato inesperado: ${parsed.error.message.slice(0, 160)}`);
    }

    await storage.markSupplierSessionResult("martins", true);

    if (this.fonte === "martins") {
      for (const r of parsed.data.resultado ?? []) {
        const cod = r.codigoMercadoria;
        if (!cod) continue;
        const p = (r.precos ?? [])[0];
        saida.set(cod, {
          preco: paraNumero(p?.precoNormal),
          disponivel: (p?.estoque ?? 0) > 0,
          ean: r.CODBRRUNDVNDCSM ?? undefined,
        });
      }
      return saida;
    }

    // O EAN vem em `resultado[]` mesmo quando o preço escolhido é o do
    // marketplace, então é colhido dos dois lados.
    const eansPorCodigo = new Map<string, string>();
    for (const r of parsed.data.resultado ?? []) {
      if (r.codigoMercadoria && r.CODBRRUNDVNDCSM) {
        eansPorCodigo.set(r.codigoMercadoria, r.CODBRRUNDVNDCSM);
      }
    }

    // Marketplace: entre as ofertas do mesmo produto, fica a de menor preço
    // com estoque e não bloqueada. Sem esse filtro, entrariam ofertas com
    // preco=0 e blocked=1, que a API devolve mas não são vendáveis.
    for (const s of parsed.data.lstPrecoSeller ?? []) {
      const cod = s.codigoMercadoriaOrigem;
      if (!cod) continue;

      const bloqueado = String(s.blocked ?? "0") === "1";
      const estoque = s.estoque ?? 0;
      const preco = paraNumero(s.preco);
      if (bloqueado || estoque <= 0 || preco === null) continue;

      const atual = saida.get(cod);
      if (!atual || atual.preco === null || preco < atual.preco) {
        saida.set(cod, {
          preco,
          disponivel: true,
          ean: s.CODBRRUNDVNDCSM ?? eansPorCodigo.get(cod),
        });
      }
    }

    return saida;
  }
}
