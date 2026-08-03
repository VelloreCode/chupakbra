// Extrai uma sessão de fornecedor a partir do "Copy as cURL" do DevTools.
//
// Existe porque o login do Martins tem 2FA por SMS e não é automatizável. Colar
// um cURL é bem menos trabalhoso (e menos sujeito a erro) do que pedir para a
// pessoa garimpar header por header no DevTools.

export interface SessaoCapturada {
  accessToken: string;
  clientId: string | null;
  bodyTemplate: Record<string, unknown> | null;
  url: string | null;
}

export class CurlInvalidoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CurlInvalidoError";
  }
}

/**
 * Lê os headers de um comando cURL.
 *
 * Aceita as três formas que os navegadores produzem: -H 'a: b', -H "a: b" e
 * --header. Chrome e Firefox usam aspas diferentes, e no Windows o comando
 * copiado costuma vir com aspas duplas e ^ de escape.
 */
function extrairHeaders(curl: string): Map<string, string> {
  const headers = new Map<string, string>();
  const re = /(?:-H|--header)\s+(['"])([\s\S]*?)\1/g;
  let m: RegExpExecArray | null;

  while ((m = re.exec(curl)) !== null) {
    const bruto = m[2].replace(/\^/g, ""); // ^ é escape do cmd.exe
    const sep = bruto.indexOf(":");
    if (sep === -1) continue;
    const nome = bruto.slice(0, sep).trim().toLowerCase();
    const valor = bruto.slice(sep + 1).trim();
    if (nome && valor) headers.set(nome, valor);
  }

  return headers;
}

/**
 * Corpo enviado: --data-raw, --data, --data-binary ou -d.
 *
 * O "Copy as cURL (cmd)" do Chrome no Windows envolve o corpo em aspas duplas
 * e escapa as internas do JSON como \" — um regex que para na primeira aspa
 * corta o corpo no primeiro campo. Por isso a variante de aspas duplas trata
 * o escape antes de fechar.
 */
function extrairBody(curl: string): string | null {
  const comSimples = curl.match(/(?:--data-raw|--data-binary|--data|-d)\s+'([\s\S]*?)'/);
  if (comSimples) return comSimples[1].replace(/\^/g, "");

  // (?:[^"\\]|\\.)* consome pares escapados sem encerrar a string cedo demais.
  const comDuplas = curl.match(/(?:--data-raw|--data-binary|--data|-d)\s+"((?:[^"\\]|\\.)*)"/);
  if (comDuplas) {
    return comDuplas[1]
      .replace(/\^/g, "") // escape do cmd.exe
      .replace(/\\"/g, '"'); // aspas internas do JSON
  }

  return null;
}

function extrairUrl(curl: string): string | null {
  const comAspas = curl.match(/curl\s+(['"])(https?:\/\/[^'"]+)\1/);
  if (comAspas) return comAspas[2];
  const semAspas = curl.match(/curl\s+(https?:\/\/\S+)/);
  return semAspas ? semAspas[1] : null;
}

/**
 * Converte o cURL numa sessão do Martins.
 *
 * Exige que o cURL seja de uma chamada a produtosBuyBox: é a única que carrega
 * o corpo com o contexto do cadastro, e sem ele a API responde 403.
 */
export function capturarSessaoMartins(curl: string): SessaoCapturada {
  if (!curl || !/curl\s/i.test(curl)) {
    throw new CurlInvalidoError('Não parece um comando cURL. Use "Copy as cURL" no DevTools.');
  }

  const headers = extrairHeaders(curl);
  const accessToken = headers.get("access_token");

  if (!accessToken) {
    throw new CurlInvalidoError(
      "O cURL não tem o header access_token. Copie uma requisição já autenticada — " +
        "por exemplo a chamada a produtosBuyBox, que acontece ao abrir qualquer listagem de produtos.",
    );
  }

  const url = extrairUrl(curl);
  const bodyBruto = extrairBody(curl);

  let bodyTemplate: Record<string, unknown> | null = null;
  if (bodyBruto) {
    try {
      const parsed = JSON.parse(bodyBruto);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        // A lista de produtos é substituída a cada consulta; guardar a do
        // momento da captura só ocuparia espaço e confundiria a leitura.
        const { produtos, ...contexto } = parsed as Record<string, unknown>;
        bodyTemplate = contexto;
      }
    } catch {
      // Corpo não-JSON não serve de template; o erro sai na validação abaixo.
    }
  }

  if (!bodyTemplate) {
    throw new CurlInvalidoError(
      "O cURL não tem corpo JSON. É preciso copiar a requisição POST de produtosBuyBox — " +
        "o corpo dela carrega região de preço e filial, e a API recusa (403) sem esses campos.",
    );
  }

  return {
    accessToken,
    clientId: headers.get("client_id") ?? null,
    bodyTemplate,
    url,
  };
}

/** Mostra só o suficiente para conferir qual token está salvo, sem revelá-lo. */
export function mascararToken(token: string): string {
  if (token.length <= 8) return "***";
  return `${token.slice(0, 4)}…${token.slice(-4)} (${token.length} caracteres)`;
}
