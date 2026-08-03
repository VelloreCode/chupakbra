// Adapter Tambasa — https://tambasa.com
//
// Site server-rendered clássico (PHP + jQuery), sem API JSON. O preço só
// aparece autenticado; deslogado o card mostra "Identifique-se para ver o preço".
// Autenticado, o preço vem JÁ NA LISTAGEM da categoria — não é preciso abrir a
// página de cada produto.

import * as cheerio from "cheerio";
import type { AxiosInstance } from "axios";
import { createHttpClient, withBackoff } from "./http";
import { getTambasaConfig, getTambasaCredentials, type TambasaConfig } from "./config";
import { absoluteUrl, errorMessage, parseBrlPrice, sleepJitter } from "./util";
import {
  SupplierAuthError,
  type SupplierAdapter,
  type SupplierCategoryRef,
  type SupplierProduct,
  type SyncCtx,
} from "./types";

/** Texto que o portal mostra no lugar do preço quando a sessão não está válida. */
const GATE_RE = /Identifique-se para ver o pre[çc]o/i;
const CODE_RE = /C[óo]digo:\s*(\d+)/i;
/** Versão global: conta quantos códigos caíram dentro do card (deve ser 1). */
const CODE_RE_G = /C[óo]digo:\s*\d+/gi;
const LOGIN_PATH = "/cliente/entrar";
const LOG = "[SUPPLIER:tambasa]";

/** Quantos níveis subir a partir do nó com "Código:" até achar o card inteiro. */
const MAX_CARD_CLIMB = 8;

/** Ligado por `cli.ts listar --debug`; imprime o limite de card apurado. */
const DEBUG_CARDS = process.env.SUPPLIER_DEBUG_CARDS === "1";

// O cheerio 1.x deixou de exportar `Element` no namespace público. Derivar da
// própria API mantém isso válido independente da versão.
type CheerioNode = ReturnType<cheerio.CheerioAPI>[number];
type CheerioSel = cheerio.Cheerio<CheerioNode>;

export function isPriceGated(html: string): boolean {
  return GATE_RE.test(html);
}

export class TambasaAdapter implements SupplierAdapter {
  readonly key = "tambasa" as const;
  readonly displayName = "Tambasa";
  /** products.sku guarda o código da Tambasa, com zeros à esquerda. */
  readonly matchStrategy = "sku" as const;

  private readonly config: TambasaConfig;
  private readonly http: AxiosInstance;
  private authenticated = false;
  private loginAttempts = 0;

  constructor() {
    this.config = getTambasaConfig();

    if (this.config.engine === "playwright") {
      // A costura existe para o dia em que o portal passar a barrar requisição
      // sem browser. Até lá não vale ~600 MB de imagem por um risco hipotético.
      throw new Error(
        "TAMBASA_ENGINE=playwright ainda não implementado — use axios (ver plano, seção Fallback)",
      );
    }

    this.http = createHttpClient({
      baseURL: this.config.baseUrl,
      withCookieJar: true,
      logPrefix: LOG,
    }).instance;
  }

  async close(): Promise<void> {
    this.authenticated = false;
  }

  // ---------------------------------------------------------------------------
  // Sessão
  // ---------------------------------------------------------------------------

  /**
   * Toda chamada HTTP passa por aqui. Trocar de engine (axios → Playwright)
   * vira o corpo deste método, não uma reescrita do adapter.
   */
  private async fetchHtml(path: string): Promise<string> {
    const response = await withBackoff(
      () => this.http.get<string>(path, { responseType: "text" }),
      { logPrefix: LOG },
    );
    return typeof response.data === "string" ? response.data : String(response.data);
  }

  private async ensureSession(force = false): Promise<void> {
    if (this.authenticated && !force) return;

    // Conta B2B: bloqueio por tentativa repetida é risco real.
    if (this.loginAttempts >= 2) {
      throw new SupplierAuthError("tambasa", "limite de tentativas de login atingido");
    }
    this.loginAttempts++;

    console.log(`${LOG} autenticando...`);

    // Credencial só é exigida aqui: descobrir categorias é página pública.
    const credentials = getTambasaCredentials();

    // 1. GET na home semeia o cookie de sessão e entrega os campos do form.
    const homeHtml = await this.fetchHtml("/");
    const hidden = this.extractHiddenFields(homeHtml);

    // 2. POST do login. Os nomes dos campos foram lidos do form real
    //    (#formLogin: username + password). Os campos ocultos vão junto
    //    verbatim — hoje não há nenhum, mas cobre um CSRF futuro sem alarde.
    const form = new URLSearchParams(hidden);
    form.set("username", credentials.user);
    form.set("password", credentials.password);

    await withBackoff(
      () =>
        this.http.post(LOGIN_PATH, form.toString(), {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Referer: `${this.config.baseUrl}/`,
          },
          // 302 é o caminho feliz; não seguir evita perder o Set-Cookie.
          maxRedirects: 0,
          validateStatus: (status) => status < 400 || status === 302,
        }),
      { logPrefix: LOG },
    ).catch((error) => {
      throw new SupplierAuthError("tambasa", `POST ${LOGIN_PATH} falhou: ${errorMessage(error)}`);
    });

    // 3. Validação pelo efeito observável, não pelo status: o portal responde
    //    200 mesmo para credencial errada.
    const probeHtml = await this.fetchHtml("/");
    if (isPriceGated(probeHtml)) {
      throw new SupplierAuthError(
        "tambasa",
        "login não surtiu efeito — a listagem continua pedindo identificação",
      );
    }

    this.authenticated = true;
    console.log(`${LOG} sessão autenticada`);
  }

  private extractHiddenFields(html: string): Record<string, string> {
    const $ = cheerio.load(html);
    const fields: Record<string, string> = {};

    $("#formLogin input[type=hidden], form[action*='entrar'] input[type=hidden]").each((_, el) => {
      const name = $(el).attr("name");
      if (name) fields[name] = $(el).attr("value") ?? "";
    });

    return fields;
  }

  // ---------------------------------------------------------------------------
  // Categorias
  // ---------------------------------------------------------------------------

  /** A home traz a árvore inteira de categorias (~2.599 âncoras). */
  async listCategories(): Promise<SupplierCategoryRef[]> {
    const html = await this.fetchHtml("/");
    const $ = cheerio.load(html);
    const found = new Map<string, string>();

    $('a[href*="/categoria/"]').each((_, el) => {
      const href = $(el).attr("href");
      if (!href) return;

      const path = this.categoryPathFromHref(href);
      if (!path) return;

      const label = $(el).text().replace(/\s+/g, " ").trim();
      // Um mesmo path aparece em vários menus; fica o rótulo mais descritivo.
      const existing = found.get(path);
      if (!existing || (label && label.length > existing.length)) {
        found.set(path, label || path.split("/").pop() || path);
      }
    });

    return Array.from(found.entries()).map(([externalId, label]) => {
      const segments = externalId.split("/");
      return {
        externalId,
        label,
        parentExternalId: segments.length > 1 ? segments.slice(0, -1).join("/") : null,
      };
    });
  }

  private categoryPathFromHref(href: string): string | null {
    const marker = "/categoria/";
    const index = href.indexOf(marker);
    if (index === -1) return null;

    const path = href
      .slice(index + marker.length)
      .split("?")[0]
      .split("#")[0]
      .replace(/^\/+|\/+$/g, "");

    return path || null;
  }

  // ---------------------------------------------------------------------------
  // Produtos
  // ---------------------------------------------------------------------------

  async *iterateProducts(
    cat: SupplierCategoryRef,
    ctx: SyncCtx,
  ): AsyncGenerator<SupplierProduct[]> {
    await this.ensureSession();

    const seenCodes = new Set<string>();

    for (let page = 1; page <= ctx.maxPages; page++) {
      const path =
        `/categoria/${cat.externalId}` +
        `?por-pagina=${this.config.perPage}&pagina=${page}`;

      let html = await this.fetchHtml(path);

      // Sessão pode cair no meio de uma varredura longa.
      if (isPriceGated(html)) {
        ctx.onError?.("SESSION_EXPIRED", `sessão expirou na página ${page} de ${cat.label}`);
        await this.ensureSession(true);
        html = await this.fetchHtml(path);
        if (isPriceGated(html)) {
          throw new SupplierAuthError("tambasa", "sessão continua barrada após novo login");
        }
      }

      const items = this.parseListing(html);

      if (items.length === 0) {
        ctx.onPage?.(page, 0);
        return;
      }

      // Guarda contra o clássico "servidor ignora ?pagina e reserve a página 1",
      // que sem isto viraria loop até o teto de páginas.
      const fresh = items.filter((item) => !seenCodes.has(item.externalCode));
      if (fresh.length === 0) {
        ctx.onPage?.(page, 0);
        return;
      }
      fresh.forEach((item) => seenCodes.add(item.externalCode));

      // Todos os produtos desta página pertencem à categoria varrida — o card
      // não traz essa informação e a URL da listagem é o único indicador.
      // Não estamos filtrando por categoria pura, é assim que descobrimos.
      for (const item of fresh) item.categoryLabel = cat.label;

      ctx.onPage?.(page, fresh.length);
      yield fresh;

      // Menos itens que o pedido = última página.
      if (items.length < this.config.perPage) return;

      if (page === ctx.maxPages) {
        ctx.onError?.(
          "PAGE_CAP_HIT",
          `categoria ${cat.label} atingiu o teto de ${ctx.maxPages} páginas`,
        );
      }

      await sleepJitter(this.config.delayMs);
    }
  }

  /**
   * Extrai os cards da listagem.
   *
   * Ancorado no texto "Código:", não em classe CSS: classe é a primeira coisa
   * que muda num redesign, enquanto "Código:" é texto de negócio visível.
   */
  private parseListing(html: string): SupplierProduct[] {
    const $ = cheerio.load(html);
    const byCode = new Map<string, SupplierProduct>();

    $("*")
      .filter((_, el) => {
        const $el = $(el);
        // Só nós-folha do rótulo: evita casar com <body> e afins.
        if ($el.children().length > 0) return false;
        return CODE_RE.test($el.text());
      })
      .each((_, el) => {
        const match = CODE_RE.exec($(el).text());
        if (!match) return;

        const code = match[1];
        if (byCode.has(code)) return;

        const card = this.findCard($, el);
        if (!card) return;

        const product = this.parseCard($, card, code);
        if (product) byCode.set(code, product);
      });

    return Array.from(byCode.values());
  }

  /**
   * Sobe a partir do rótulo "Código:" até o maior ancestral que ainda contém
   * UM só produto.
   *
   * O critério é a contagem de códigos, deliberadamente — não a presença de
   * "R$". Ancorar em preço parece natural e está errado: produto sem preço
   * (sob consulta) nunca satisfaria a condição no próprio card e a subida
   * seguiria até o <ul> da listagem, onde o card herdaria em silêncio o preço
   * de um vizinho. Já aconteceu; é o motivo desta função ser assim.
   */
  private findCard($: cheerio.CheerioAPI, labelEl: CheerioNode): CheerioSel | null {
    let node: CheerioSel = $(labelEl);

    for (let level = 0; level < MAX_CARD_CLIMB; level++) {
      const parent = node.parent();
      if (parent.length === 0) break;

      // Contêiner de listagem: subir mais já sairia do produto.
      const tag = (parent.get(0) as { tagName?: string } | undefined)?.tagName?.toLowerCase();
      if (tag && ["ul", "ol", "table", "tbody", "main", "body", "html"].includes(tag)) break;

      // Outro código no ancestral = ele abraça mais de um produto.
      const codeCount = (parent.text().match(CODE_RE_G) ?? []).length;
      if (codeCount !== 1) break;

      node = parent;
    }

    return node.length > 0 ? node : null;
  }

  private parseCard(
    $: cheerio.CheerioAPI,
    card: CheerioSel,
    code: string,
  ): SupplierProduct | null {
    const text = card.text();

    // Pega o maior valor "R$ ..." do card: descarta parcelamento ("12x de R$ 9,90").
    const priceMatches = text.match(/R\$\s*[\d.,]+/g) ?? [];
    const prices = priceMatches
      .map((raw) => parseBrlPrice(raw))
      .filter((value): value is number => value !== null && value > 0);
    const price = prices.length > 0 ? Math.max(...prices) : null;

    if (DEBUG_CARDS) {
      console.log(
        `[DEBUG] ${code}: <${(card.get(0) as { tagName?: string })?.tagName ?? "?"} ` +
          `class="${(card.attr("class") ?? "").slice(0, 60)}"> ` +
          `códigos=${(text.match(CODE_RE_G) ?? []).length} ` +
          `valores=[${priceMatches.join(" | ")}]`,
      );
    }

    const link = card.find("a[href]").first();
    const productUrl = absoluteUrl(link.attr("href"), this.config.baseUrl);

    // O title do site corta em aspas de polegada ('1/2"' vira '1/2'), porque o
    // HTML sai malformado. O texto do link costuma vir íntegro, então fica o
    // mais completo dos dois.
    const titleName = card.find("[title]").first().attr("title")?.replace(/\s+/g, " ").trim() ?? "";
    const linkName = link.text().replace(/\s+/g, " ").trim();
    const name =
      (linkName.length > titleName.length ? linkName : titleName) ||
      text.replace(CODE_RE, "").replace(/\s+/g, " ").trim().slice(0, 200);

    if (!name) return null;

    const img = card.find("img").first();
    const imageUrl = absoluteUrl(
      img.attr("data-src") || img.attr("src"),
      this.config.baseUrl,
    );

    return {
      externalCode: code,
      name,
      price,
      isAvailable: price !== null,
      imageUrl,
      productUrl,
    };
  }
}
