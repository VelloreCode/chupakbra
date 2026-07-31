// export_db.ts (Versão FINAL e simplificada)
import Database from "@replit/database";
import fs from "fs";

// ===================================================================
// URL do seu banco de dados. Está correta.
// ===================================================================
const dbUrl = "https://kv.replit.com/v0/eyJhbGciOiJIUzUxMiIsImlzcyI6ImNvbm1hbiIsImtpZCI6InByb2Q6MSIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJjb25tYW4iLCJleHAiOjE3NTA1Mjg2NDQsImlhdCI6MTc1MDQxNzA0NCwiZGF0YWJhc2VfaWQiOiJjNjJmOTg0ZC1kZDQ1LTQ5NzUtYmVhZC05MTM0Y2M1ODczZTIifQ.pzNr_2nG1lr7rU3-6W-heOiV8rpuXR43_VXoM_a71fZXk_DzZNu23rQnobByA3yJ4wulDSZvPpFCAIAATKFIoA";
// ===================================================================

// @ts-ignore - Ignora o erro de tipo, útil caso a lib esteja desatualizada
const db = new Database(dbUrl);

async function exportDatabase(): Promise<void> {
  console.log("Iniciando exportação com URL explícita...");

  try {
    const result: any = await db.list();
    console.log("Resultado bruto de db.list():", result);

    // Adaptação para o formato de objeto { ok, value }
    const allKeys: string[] = result && Array.isArray(result.value) ? result.value : [];

    console.log(`Encontradas ${allKeys.length} chaves no banco de dados.`);

    if (allKeys.length === 0) {
      console.log("Nenhum dado encontrado para exportar.");
      fs.writeFileSync("database_export.json", JSON.stringify({}, null, 2));
      console.log("Arquivo 'database_export.json' vazio foi criado.");
      return;
    }

    const allData: Record<string, any> = {};

    // Usando um loop for...of para mais controle e logs
    for (const key of allKeys) {
      try {
        console.log(`Buscando dados para a chave: ${key}`);
        allData[key] = await db.get(key);
      } catch (getError) {
        console.error(`Erro ao buscar a chave "${key}":`, getError);
        allData[key] = null; // Salva null se houver erro naquela chave específica
      }
    }

    fs.writeFileSync("database_export.json", JSON.stringify(allData, null, 2));
    console.log("\n✅ Exportação concluída com sucesso!");
    console.log(`O arquivo 'database_export.json' foi criado com ${Object.keys(allData).length} registros.`);

  } catch (error) {
    console.error("❌ Ocorreu um erro durante a exportação:", error);
  }
}

exportDatabase();