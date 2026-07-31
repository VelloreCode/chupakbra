import { db } from './server/db';
import { 
  users, 
  categories, 
  clients, 
  competitors, 
  products, 
  prices, 
  priceHistory, 
  priceMonitoringHistory, 
  uploadHistory, 
  apiKeys, 
  reportsHistory 
} from './shared/schema';
import * as fs from 'fs';
import { sql } from 'drizzle-orm';

interface ExportData {
  exportDate: string;
  tables: {
    users: any[];
    categories: any[];
    clients: any[];
    competitors: any[];
    products: any[];
    prices: any[];
    priceHistory: any[];
    priceMonitoringHistory: any[];
    uploadHistory: any[];
    apiKeys: any[];
    reportsHistory: any[];
  };
}

async function importFromJson() {
  console.log('============================================');
  console.log('  Importação de Dados do JSON');
  console.log('  Chupa K Bra - Grupo Vellore');
  console.log('============================================\n');

  // Verificar se o arquivo existe
  if (!fs.existsSync('database_export_complete.json')) {
    console.error('ERRO: database_export_complete.json não encontrado!');
    process.exit(1);
  }

  // Carregar dados
  console.log('1. Carregando dados do JSON...');
  const rawData = fs.readFileSync('database_export_complete.json', 'utf-8');
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
  const data: ExportData = JSON.parse(rawData, (_key, value) =>
    typeof value === 'string' && isoDateRegex.test(value) ? new Date(value) : value
  );
  console.log(`   Data do export: ${data.exportDate}\n`);

  try {
    // Desabilitar FK checks temporariamente (requer superusuário; alguns
    // provedores gerenciados, como o Postgres do Dokploy, não concedem essa
    // permissão ao usuário da aplicação — nesse caso seguimos sem desabilitar,
    // já que a importação abaixo respeita a ordem de dependência das FKs)
    console.log('2. Preparando banco de dados...');
    try {
      await db.execute(sql`SET session_replication_role = 'replica'`);
      console.log('   ✓ Constraints desabilitadas temporariamente\n');
    } catch (e) {
      console.log('   AVISO: sem permissão para desabilitar constraints, seguindo com a ordem de FKs\n');
    }

    // Importar na ordem correta (respeitando FKs)
    console.log('3. Importando dados...\n');

    // Users
    if (data.tables.users?.length > 0) {
      console.log(`   Importando users: ${data.tables.users.length} registros...`);
      for (const user of data.tables.users) {
        try {
          await db.insert(users).values(user).onConflictDoNothing();
        } catch (e) {
          console.log(`   AVISO: Erro ao inserir user ${user.id}: ${(e as Error).message}`);
        }
      }
      console.log('   ✓ Users importados');
    }

    // Categories
    if (data.tables.categories?.length > 0) {
      console.log(`   Importando categories: ${data.tables.categories.length} registros...`);
      for (const category of data.tables.categories) {
        try {
          await db.insert(categories).values(category).onConflictDoNothing();
        } catch (e) {
          console.log(`   AVISO: Erro ao inserir category ${category.id}: ${(e as Error).message}`);
        }
      }
      console.log('   ✓ Categories importadas');
    }

    // Clients
    if (data.tables.clients?.length > 0) {
      console.log(`   Importando clients: ${data.tables.clients.length} registros...`);
      for (const client of data.tables.clients) {
        try {
          await db.insert(clients).values(client).onConflictDoNothing();
        } catch (e) {
          console.log(`   AVISO: Erro ao inserir client ${client.id}: ${(e as Error).message}`);
        }
      }
      console.log('   ✓ Clients importados');
    }

    // Competitors
    if (data.tables.competitors?.length > 0) {
      console.log(`   Importando competitors: ${data.tables.competitors.length} registros...`);
      for (const competitor of data.tables.competitors) {
        try {
          await db.insert(competitors).values(competitor).onConflictDoNothing();
        } catch (e) {
          console.log(`   AVISO: Erro ao inserir competitor ${competitor.id}: ${(e as Error).message}`);
        }
      }
      console.log('   ✓ Competitors importados');
    }

    // Products (em batches por causa do volume)
    if (data.tables.products?.length > 0) {
      console.log(`   Importando products: ${data.tables.products.length} registros...`);
      const batchSize = 100;
      let imported = 0;
      
      for (let i = 0; i < data.tables.products.length; i += batchSize) {
        const batch = data.tables.products.slice(i, i + batchSize);
        for (const product of batch) {
          try {
            await db.insert(products).values(product).onConflictDoNothing();
            imported++;
          } catch (e) {
            // Ignorar erros de conflito
          }
        }
        process.stdout.write(`\r   Progresso: ${imported}/${data.tables.products.length}`);
      }
      console.log('\n   ✓ Products importados');
    }

    // Prices
    if (data.tables.prices?.length > 0) {
      console.log(`   Importando prices: ${data.tables.prices.length} registros...`);
      for (const price of data.tables.prices) {
        try {
          await db.insert(prices).values(price).onConflictDoNothing();
        } catch (e) {
          // Ignorar erros
        }
      }
      console.log('   ✓ Prices importados');
    }

    // Price History
    if (data.tables.priceHistory?.length > 0) {
      console.log(`   Importando priceHistory: ${data.tables.priceHistory.length} registros...`);
      const batchSize = 100;
      let imported = 0;
      
      for (let i = 0; i < data.tables.priceHistory.length; i += batchSize) {
        const batch = data.tables.priceHistory.slice(i, i + batchSize);
        for (const history of batch) {
          try {
            await db.insert(priceHistory).values(history).onConflictDoNothing();
            imported++;
          } catch (e) {
            // Ignorar erros
          }
        }
        process.stdout.write(`\r   Progresso: ${imported}/${data.tables.priceHistory.length}`);
      }
      console.log('\n   ✓ Price History importado');
    }

    // Price Monitoring History
    if (data.tables.priceMonitoringHistory?.length > 0) {
      console.log(`   Importando priceMonitoringHistory: ${data.tables.priceMonitoringHistory.length} registros...`);
      for (const history of data.tables.priceMonitoringHistory) {
        try {
          await db.insert(priceMonitoringHistory).values(history).onConflictDoNothing();
        } catch (e) {
          // Ignorar erros
        }
      }
      console.log('   ✓ Price Monitoring History importado');
    }

    // Upload History
    if (data.tables.uploadHistory?.length > 0) {
      console.log(`   Importando uploadHistory: ${data.tables.uploadHistory.length} registros...`);
      for (const upload of data.tables.uploadHistory) {
        try {
          await db.insert(uploadHistory).values(upload).onConflictDoNothing();
        } catch (e) {
          // Ignorar erros
        }
      }
      console.log('   ✓ Upload History importado');
    }

    // API Keys
    if (data.tables.apiKeys?.length > 0) {
      console.log(`   Importando apiKeys: ${data.tables.apiKeys.length} registros...`);
      for (const key of data.tables.apiKeys) {
        try {
          await db.insert(apiKeys).values(key).onConflictDoNothing();
        } catch (e) {
          // Ignorar erros
        }
      }
      console.log('   ✓ API Keys importadas');
    }

    // Reports History
    if (data.tables.reportsHistory?.length > 0) {
      console.log(`   Importando reportsHistory: ${data.tables.reportsHistory.length} registros...`);
      for (const report of data.tables.reportsHistory) {
        try {
          await db.insert(reportsHistory).values(report).onConflictDoNothing();
        } catch (e) {
          // Ignorar erros
        }
      }
      console.log('   ✓ Reports History importado');
    }

    // Reabilitar FK checks
    console.log('\n4. Finalizando...');
    try {
      await db.execute(sql`SET session_replication_role = 'origin'`);
      console.log('   ✓ Constraints reabilitadas\n');
    } catch (e) {
      // Não foi desabilitado acima por falta de permissão, nada a reverter
    }

    // Verificar contagem
    console.log('5. Verificando importação...\n');
    
    const counts = await db.execute(sql`
      SELECT 'products' as tabela, COUNT(*) as registros FROM products
      UNION ALL SELECT 'users', COUNT(*) FROM users
      UNION ALL SELECT 'clients', COUNT(*) FROM clients
      UNION ALL SELECT 'prices', COUNT(*) FROM prices
      UNION ALL SELECT 'price_history', COUNT(*) FROM price_history
      UNION ALL SELECT 'price_monitoring_history', COUNT(*) FROM price_monitoring_history
      ORDER BY tabela
    `);
    
    console.log('   Registros no banco:');
    for (const row of counts.rows as any[]) {
      console.log(`   - ${row.tabela}: ${row.registros}`);
    }

    console.log('\n============================================');
    console.log('  Importação concluída com sucesso!');
    console.log('============================================\n');

  } catch (error) {
    console.error('ERRO durante importação:', error);
    // Reabilitar constraints em caso de erro (se aplicável)
    try {
      await db.execute(sql`SET session_replication_role = 'origin'`);
    } catch (e) {
      // sem permissão / não estava desabilitado
    }
    process.exit(1);
  }

  process.exit(0);
}

importFromJson();
