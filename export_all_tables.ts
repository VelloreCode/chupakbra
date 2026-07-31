import { db } from './server/db';
import { users, categories, clients, competitors, products, prices, priceHistory, priceMonitoringHistory, uploadHistory, apiKeys, reportsHistory } from './shared/schema';
import * as fs from 'fs';

async function exportAllTables() {
  console.log('Starting database export...');
  
  const data: any = {
    exportDate: new Date().toISOString(),
    tables: {}
  };

  try {
    // Export each table
    console.log('Exporting users...');
    data.tables.users = await db.select().from(users);
    console.log(`  - ${data.tables.users.length} records`);

    console.log('Exporting categories...');
    data.tables.categories = await db.select().from(categories);
    console.log(`  - ${data.tables.categories.length} records`);

    console.log('Exporting clients...');
    data.tables.clients = await db.select().from(clients);
    console.log(`  - ${data.tables.clients.length} records`);

    console.log('Exporting competitors...');
    data.tables.competitors = await db.select().from(competitors);
    console.log(`  - ${data.tables.competitors.length} records`);

    console.log('Exporting products...');
    data.tables.products = await db.select().from(products);
    console.log(`  - ${data.tables.products.length} records`);

    console.log('Exporting prices...');
    data.tables.prices = await db.select().from(prices);
    console.log(`  - ${data.tables.prices.length} records`);

    console.log('Exporting priceHistory...');
    data.tables.priceHistory = await db.select().from(priceHistory);
    console.log(`  - ${data.tables.priceHistory.length} records`);

    console.log('Exporting priceMonitoringHistory...');
    data.tables.priceMonitoringHistory = await db.select().from(priceMonitoringHistory);
    console.log(`  - ${data.tables.priceMonitoringHistory.length} records`);

    console.log('Exporting uploadHistory...');
    data.tables.uploadHistory = await db.select().from(uploadHistory);
    console.log(`  - ${data.tables.uploadHistory.length} records`);

    console.log('Exporting apiKeys...');
    data.tables.apiKeys = await db.select().from(apiKeys);
    console.log(`  - ${data.tables.apiKeys.length} records`);

    console.log('Exporting reportsHistory...');
    data.tables.reportsHistory = await db.select().from(reportsHistory);
    console.log(`  - ${data.tables.reportsHistory.length} records`);

    // Write to file
    fs.writeFileSync('database_export_complete.json', JSON.stringify(data, null, 2));
    console.log('\nExport completed! File: database_export_complete.json');
    
    // Summary
    const totalRecords = Object.values(data.tables).reduce((sum: number, table: any) => sum + table.length, 0);
    console.log(`\nTotal records exported: ${totalRecords}`);
    
  } catch (error) {
    console.error('Export error:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

exportAllTables();
