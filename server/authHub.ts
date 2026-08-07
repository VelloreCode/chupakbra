import type { Express, Request } from "express";
import { storage } from "./storage";

// Login pelo Auth Hub do Grupo Vellore, que centraliza e sincroniza os usuários
// do Microsoft Entra ID (AD). O fluxo é o documentado em {hub}/api/docs:
//
//   1. redirecionamos para {hub}/auth/login?redirect_uri=...&system=chupakbra
//   2. o hub devolve o usuário em <callback>?token=JWT (ou ?error=...)
//   3. validamos o token em POST {hub}/api/introspect
//
// Validar pelo introspect (e não verificando a assinatura aqui) evita ter que
// distribuir chave pública e permite ao hub revogar sessão de verdade.

const AUTH_HUB_URL = (
  process.env.AUTH_HUB_URL ?? "https://central-autenticacao-vellore.replit.app"
).replace(/\/+$/, "");

const AUTH_HUB_SYSTEM_SLUG = process.env.AUTH_HUB_SYSTEM_SLUG ?? "chupakbra";

// Opt-in explícito: o SSO só existe onde AUTH_HUB_ENABLED=true. O padrão é
// desligado de propósito — um ambiente novo (produção, por exemplo) não deve
// mostrar um botão de login cujo redirect_uri talvez nem esteja liberado no
// hub. Esquecer de definir a variável falha para o lado seguro.
const AUTH_HUB_ENABLED = process.env.AUTH_HUB_ENABLED === "true";

const EXPECTED_ISSUER = "auth-hub-grupovellore";

const INTROSPECT_TIMEOUT_MS = 10_000;

interface IntrospectResponse {
  active?: boolean;
  sub?: string | number;
  email?: string;
  name?: string;
  setor?: string | null;
  roles?: string[];
  systems?: string[];
  exp?: number;
  iss?: string;
}

// URL pública desta aplicação. Atrás do proxy do Dokploy o host correto vem no
// X-Forwarded-Host — "trust proxy" já está ligado em setupAuth. APP_BASE_URL
// existe para o caso de o proxy não repassar esses cabeçalhos.
function getBaseUrl(req: Request): string {
  const configured = process.env.APP_BASE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  return `${req.protocol}://${req.get("host")}`;
}

function getCallbackUrl(req: Request): string {
  return `${getBaseUrl(req)}/api/auth/sso/callback`;
}

// O hub manda o nome completo num campo só; o cadastro local é separado em
// firstName/lastName. Primeira palavra vira o nome, o resto o sobrenome.
function splitName(fullName: string | undefined, email: string) {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: email.split("@")[0], lastName: "" };
  }
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

async function introspect(token: string): Promise<IntrospectResponse> {
  const response = await fetch(`${AUTH_HUB_URL}/api/introspect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
    signal: AbortSignal.timeout(INTROSPECT_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Auth Hub respondeu ${response.status} em /api/introspect`);
  }

  return (await response.json()) as IntrospectResponse;
}

export function setupAuthHub(app: Express) {
  // A tela de login pergunta por aqui se deve desenhar o botão do Microsoft
  // 365. Fica fora do `if` abaixo porque precisa responder nos dois casos.
  app.get("/api/auth/sso/status", (_req, res) => {
    res.json({ enabled: AUTH_HUB_ENABLED });
  });

  // Desligado: nem registra as rotas. Esconder só o botão deixaria o fluxo
  // acessível para quem digitasse a URL. Sem as rotas, a requisição cai no
  // catch-all do SPA (serveStatic) e devolve a própria página — o que importa
  // é que nenhum redirect para o hub acontece.
  if (!AUTH_HUB_ENABLED) return;

  // Início do fluxo: o botão "Entrar com Microsoft 365" aponta para cá.
  app.get("/api/auth/sso/login", (req, res) => {
    const url = new URL(`${AUTH_HUB_URL}/auth/login`);
    url.searchParams.set("redirect_uri", getCallbackUrl(req));
    url.searchParams.set("system", AUTH_HUB_SYSTEM_SLUG);
    res.redirect(url.href);
  });

  // Volta do hub. Sempre termina em redirect: em erro, para /login com a
  // mensagem; em sucesso, para a raiz já com a sessão criada.
  app.get("/api/auth/sso/callback", async (req, res) => {
    const fail = (message: string) =>
      res.redirect(`/login?sso_error=${encodeURIComponent(message)}`);

    const error = typeof req.query.error === "string" ? req.query.error : undefined;
    if (error) {
      console.warn("Auth Hub retornou erro no callback:", error);
      return fail(error);
    }

    const token = typeof req.query.token === "string" ? req.query.token : undefined;
    if (!token) {
      return fail("Login não retornou token. Tente novamente.");
    }

    try {
      const claims = await introspect(token);

      if (claims.active !== true) {
        return fail("Sessão expirada ou inválida. Faça o login novamente.");
      }

      if (claims.iss && claims.iss !== EXPECTED_ISSUER) {
        console.warn("Auth Hub: issuer inesperado no token:", claims.iss);
        return fail("Token de origem desconhecida.");
      }

      const email = claims.email?.trim().toLowerCase();
      if (!email || claims.sub === undefined || claims.sub === null) {
        return fail("O Auth Hub não informou e-mail para este usuário.");
      }

      // Sem checagem de claims.systems: por decisão, todo usuário do AD entra e
      // o controle de acesso fica nas permissões internas da plataforma.
      const { firstName, lastName } = splitName(claims.name, email);

      const user = await storage.upsertAuthHubUser({
        authHubId: String(claims.sub),
        email,
        firstName,
        lastName,
      });

      // Mesmo formato que o login local grava, para isAuthenticated e
      // /api/auth/user continuarem funcionando sem distinguir a origem.
      (req.session as any).user = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
        role: user.role,
      };

      req.session.save((err: any) => {
        if (err) {
          console.error("Auth Hub: erro ao salvar sessão:", err);
          return fail("Erro ao criar a sessão. Tente novamente.");
        }
        res.redirect("/");
      });
    } catch (err) {
      console.error("Auth Hub: falha ao validar token:", err);
      return fail("Não foi possível validar o login. Tente novamente.");
    }
  });
}
