// Adapter Bartofil — https://www.bartofil.com.br
//
// SPA React sobre Supabase. Isto NÃO é scraping: o próprio front consome uma
// API JSON, e é nela que entramos.
//
//   auth      POST {SUPABASE_URL}/auth/v1/token?grant_type=password
//   catálogo  GET  {SUPABASE_URL}/functions/v1/busca-produto
//   categoria GET  {SUPABASE_URL}/rest/v1/categoria
//
// O preço é por cliente (tabela negociada): o front injeta `codpessoa` e
// `grupo` da sessão em cada busca, e é isso que seleciona a tabela de preço.
// Sem sessão, a resposta vem sem preço ("Login p/ ver preço" na tela).

import { z } from "zod";
import type { AxiosInstance } from "axios";
import { createHttpClient, withBackoff } from "./http";
import { getBartofilConfig, getBartofilCredentials, type BartofilConfig } from "./config";
import { errorMessage, sleepJitter } from "./util";
import {
  SupplierAuthError,
  type SupplierAdapter,
  type SupplierCategoryRef,
  type SupplierProduct,
  type SyncCtx,
} from "./types";

const LOG = "[SUPPLIER:bartofil]";
const IMAGE_BASE = "https://integracao.bartofil.com.br/site/imagem";

// Validar a resposta faz uma mudança de formato falhar alto, em vez de gravar
// NaN silenciosamente no banco.
const variacaoSchema = z.object({
  codproduto: z.union([z.string(), z.number()]).optional(),
  valortotalproduto: z.union([z.string(), z.number()]).nullish(),
  valortotalproduto_de: z.union([z.string(), z.number()]).nullish(),
  statusvenda: z.string().nullish(),
  embalagem: z.string().nullish(),
  foto_principal: z.string().nullish(),
});

const produtoSchema = z.object({
  codproduto: z.union([z.string(), z.number()]),
  descricao: z.string().nullish(),
  marca: z.string().nullish(),
  foto_principal: z.string().nullish(),
  url_key: z.string().nullish(),
  variacoes: z.array(variacaoSchema).nullish(),
});

const buscaProdutoSchema = z.object({
  data: z.array(produtoSchema).nullish(),
  total: z.number().nullish(),
});

// Colunas conferidas contra a API real (02/2026). Não são `id`/`nome`/`pai_id`,
// que é o palpite natural — a tabela usa nomes próprios.
const categoriaSchema = z.object({
  id_categoria: z.union([z.string(), z.number()]),
  descricao: z.string().nullish(),
  id_categoriapai: z.union([z.string(), z.number()]).nullish(),
  nivelhierarquia: z.number().nullish(),
});

const tokenSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  expires_in: z.number().optional(),
  user: z
    .object({
      id: z.string().optional(),
      user_metadata: z.record(z.string(), z.unknown()).optional(),
      app_metadata: z.record(z.string(), z.unknown()).optional(),
    })
    .optional(),
});

interface Session {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  codpessoa?: string;
  grupo?: string;
}

function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === "number" ? value : parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export class BartofilAdapter implements SupplierAdapter {
  readonly key = "bartofil" as const;
  readonly displayName = "Bartofil";
  /** products.sku é o código do fabricante; o da Bartofil só está na source_url. */
  readonly matchStrategy = "source-url" as const;

  private readonly config: BartofilConfig;
  private readonly http: AxiosInstance;
  private session: Session | null = null;
  private passwordLogins = 0;

  constructor() {
    this.config = getBartofilConfig();
    this.http = createHttpClient({
      baseURL: this.config.supabaseUrl,
      logPrefix: LOG,
      headers: { "Content-Type": "application/json" },
    }).instance;
  }

  async close(): Promise<void> {
    this.session = null;
  }

  // ---------------------------------------------------------------------------
  // Sessão
  // ---------------------------------------------------------------------------

  private anonHeaders(): Record<string, string> {
    return {
      apikey: this.config.anonKey,
      Authorization: `Bearer ${this.config.anonKey}`,
    };
  }

  private authHeaders(session: Session): Record<string, string> {
    return {
      apikey: this.config.anonKey,
      Authorization: `Bearer ${session.accessToken}`,
    };
  }

  private async ensureSession(force = false): Promise<Session> {
    const valid =
      this.session && !force && Date.now() < this.session.expiresAt - 60_000;
    if (valid) return this.session!;

    if (this.session?.refreshToken && !force) {
      try {
        return await this.refresh(this.session.refreshToken);
      } catch (error) {
        console.warn(`${LOG} refresh falhou, refazendo login: ${errorMessage(error)}`);
      }
    }

    return await this.passwordLogin();
  }

  private async passwordLogin(): Promise<Session> {
    // Conta B2B: não insistir em senha para não arriscar bloqueio.
    if (this.passwordLogins >= 2) {
      throw new SupplierAuthError("bartofil", "limite de tentativas de login atingido");
    }
    this.passwordLogins++;

    console.log(`${LOG} autenticando...`);

    // Credencial só é exigida aqui: listar categorias usa a anon key.
    const credentials = getBartofilCredentials();
    const email = credentials.email ?? (await this.resolveEmailFromCnpj(credentials.cnpj));

    const response = await withBackoff(
      () =>
        this.http.post(
          "/auth/v1/token?grant_type=password",
          { email, password: credentials.password },
          { headers: this.anonHeaders() },
        ),
      { logPrefix: LOG },
    ).catch((error) => {
      throw new SupplierAuthError("bartofil", `login recusado: ${errorMessage(error)}`);
    });

    const parsed = tokenSchema.safeParse(response.data);
    if (!parsed.success) {
      throw new SupplierAuthError("bartofil", "resposta de login em formato inesperado");
    }

    this.session = this.toSession(parsed.data);
    await this.resolveClientIdentity(this.session);

    console.log(
      `${LOG} sessão autenticada (codpessoa=${this.session.codpessoa ?? "?"}, grupo=${this.session.grupo ?? "?"})`,
    );
    return this.session;
  }

  /**
   * Traduz CNPJ em e-mail, do mesmo jeito que o portal faz antes de autenticar:
   * o usuário digita CNPJ, mas o Supabase Auth só entende e-mail.
   * Assim basta cadastrar BARTOFIL_CNPJ — não é preciso descobrir qual e-mail
   * está por trás da conta.
   */
  private async resolveEmailFromCnpj(cnpj: string): Promise<string> {
    if (!cnpj) {
      throw new SupplierAuthError("bartofil", "BARTOFIL_CNPJ vazio e BARTOFIL_EMAIL não definido");
    }

    const response = await this.http
      .post(
        "/functions/v1/cadastro-usuario",
        { recurso: "busca-email", cnpjcpf: cnpj },
        { headers: this.anonHeaders() },
      )
      .catch((error) => {
        throw new SupplierAuthError(
          "bartofil",
          `lookup CNPJ → e-mail falhou: ${errorMessage(error)}`,
        );
      });

    const email = (response.data as { email?: unknown } | null)?.email;
    if (typeof email !== "string" || !email) {
      throw new SupplierAuthError("bartofil", `CNPJ ${cnpj} não encontrado no portal`);
    }

    return email;
  }

  private async refresh(refreshToken: string): Promise<Session> {
    const response = await this.http.post(
      "/auth/v1/token?grant_type=refresh_token",
      { refresh_token: refreshToken },
      { headers: this.anonHeaders() },
    );

    const parsed = tokenSchema.parse(response.data);
    const previous = this.session;
    this.session = this.toSession(parsed);
    // Identidade do cliente não muda entre refreshes.
    this.session.codpessoa = previous?.codpessoa;
    this.session.grupo = previous?.grupo;
    return this.session;
  }

  private toSession(token: z.infer<typeof tokenSchema>): Session {
    return {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: Date.now() + (token.expires_in ?? 3600) * 1000,
    };
  }

  /**
   * Descobre `codpessoa` e `grupo` — é esse par que seleciona a tabela de preço
   * negociada. O portal busca o mesmo dado em /local-compra logo após o login
   * (o "local de compra" do cliente) e o injeta em toda busca de produto.
   *
   * Uma conta pode ter mais de um local de compra, com tabelas de preço
   * diferentes. Sem instrução em contrário fica o primeiro, e o local escolhido
   * vai para o log — se o preço vier de uma filial inesperada, é aqui que se vê.
   */
  private async resolveClientIdentity(session: Session): Promise<void> {
    try {
      const response = await this.http.get("/functions/v1/local-compra", {
        headers: this.authHeaders(session),
      });

      // Este endpoint devolve { msg, dados: [...] } — "dados", não "data",
      // diferente do busca-produto. Conferido contra a API real.
      const payload = response.data as { dados?: unknown } | unknown[] | null;
      const rows = Array.isArray(payload)
        ? payload
        : Array.isArray((payload as { dados?: unknown })?.dados)
          ? (payload as { dados: unknown[] }).dados
          : [];

      const first = rows[0] as Record<string, unknown> | undefined;

      if (first?.codpessoa != null) session.codpessoa = String(first.codpessoa);
      if (first?.grupo != null) session.grupo = String(first.grupo);

      if (rows.length > 1) {
        console.warn(
          `${LOG} a conta tem ${rows.length} locais de compra; usando o primeiro ` +
            `(codpessoa=${session.codpessoa}). Preços podem variar entre eles.`,
        );
      }
    } catch (error) {
      throw new SupplierAuthError(
        "bartofil",
        `falha ao consultar /local-compra: ${errorMessage(error)}`,
      );
    }

    // Falhar aqui é deliberado. Sem codpessoa/grupo a API não devolve erro:
    // responde 200 com total=0. Seguir em frente transformaria uma credencial
    // mal resolvida em "categoria vazia" — e a varredura inteira gravaria nada
    // parecendo ter dado certo.
    if (!session.codpessoa || !session.grupo) {
      throw new SupplierAuthError(
        "bartofil",
        "não foi possível resolver codpessoa/grupo do local de compra — " +
          "sem eles a API devolve catálogo vazio silenciosamente",
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Categorias
  // ---------------------------------------------------------------------------

  async listCategories(): Promise<SupplierCategoryRef[]> {
    const response = await withBackoff(
      () =>
        this.http.get("/rest/v1/categoria", {
          headers: this.anonHeaders(),
          params: {
            select: "id_categoria,descricao,id_categoriapai,nivelhierarquia",
            ativo: "eq.true",
            order: "descricao",
            limit: 5000,
          },
        }),
      { logPrefix: LOG },
    );

    const rows = z.array(categoriaSchema).parse(response.data ?? []);

    return rows.map((row) => ({
      externalId: String(row.id_categoria),
      label: row.descricao?.trim() || `Categoria ${row.id_categoria}`,
      parentExternalId:
        row.id_categoriapai === null || row.id_categoriapai === undefined
          ? null
          : String(row.id_categoriapai),
    }));
  }

  // ---------------------------------------------------------------------------
  // Produtos
  // ---------------------------------------------------------------------------

  async *iterateProducts(
    cat: SupplierCategoryRef,
    ctx: SyncCtx,
  ): AsyncGenerator<SupplierProduct[]> {
    const session = await this.ensureSession();
    const limit = this.config.pageSize;
    let collected = 0;

    for (let page = 1; page <= ctx.maxPages; page++) {
      const response = await withBackoff(
        () =>
          this.http.get("/functions/v1/busca-produto", {
            headers: this.authHeaders(this.session ?? session),
            // O parâmetro é `categoria` (singular). E `codpessoa`/`grupo` não
            // são opcionais na prática: sem eles a API responde 200 com
            // total=0, sem qualquer erro — é assim que ela diz "não sei de
            // qual tabela de preço você está falando".
            params: {
              categoria: cat.externalId,
              buscafiltros: "false",
              page,
              limit,
              ...(this.session?.codpessoa ? { codpessoa: this.session.codpessoa } : {}),
              ...(this.session?.grupo ? { grupo: this.session.grupo } : {}),
            },
          }),
        { logPrefix: LOG },
      );

      const parsed = buscaProdutoSchema.safeParse(response.data);
      if (!parsed.success) {
        ctx.onError?.(
          "SELECTOR_DRIFT",
          `resposta de busca-produto em formato inesperado: ${parsed.error.message.slice(0, 200)}`,
        );
        return;
      }

      const rows = parsed.data.data ?? [];
      if (rows.length === 0) {
        ctx.onPage?.(page, 0);
        return;
      }

      const items = rows.map((row) => this.toProduct(row));
      collected += items.length;

      ctx.onPage?.(page, items.length);
      yield items;

      const total = parsed.data.total ?? null;
      if (rows.length < limit) return;
      if (total !== null && collected >= total) return;

      if (page === ctx.maxPages) {
        ctx.onError?.(
          "PAGE_CAP_HIT",
          `categoria ${cat.label} atingiu o teto de ${ctx.maxPages} páginas`,
        );
      }

      await sleepJitter(this.config.delayMs);
    }
  }

  private toProduct(row: z.infer<typeof produtoSchema>): SupplierProduct {
    const variacoes = row.variacoes ?? [];
    // A vitrine usa a primeira variação como preço do card.
    const principal = variacoes[0];

    const foto = principal?.foto_principal ?? row.foto_principal ?? null;

    return {
      externalCode: String(row.codproduto),
      name: row.descricao?.trim() || `Produto ${row.codproduto}`,
      manufacturer: row.marca?.trim() || undefined,
      price: toNumber(principal?.valortotalproduto),
      listPrice: toNumber(principal?.valortotalproduto_de),
      // statusvenda "L" = liberado para venda.
      isAvailable: variacoes.some((v) => v.statusvenda === "L"),
      imageUrl: foto ? `${IMAGE_BASE}/${foto}?largura=470` : undefined,
      productUrl: row.url_key
        ? `https://www.bartofil.com.br/${String(row.url_key).split("/").pop()}`
        : undefined,
    };
  }
}
