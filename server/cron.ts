import cron from 'node-cron';
import { storage } from './storage';

export function startCronJobs() {
  const now = new Date();
  const saoPauloTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  
  console.log('========================================');
  console.log('[CRON] Initializing cron jobs system');
  console.log(`[CRON] Current server time: ${now.toISOString()}`);
  console.log(`[CRON] Current São Paulo time: ${saoPauloTime.toLocaleString()}`);
  console.log('========================================');
  
  // Daily price update at 7:00 AM São Paulo time
  const task = cron.schedule('0 7 * * *', async () => {
    const jobStartTime = new Date();
    console.log('========================================');
    console.log(`[CRON] Daily price update job TRIGGERED at ${jobStartTime.toISOString()}`);
    console.log('========================================');
    
    try {
      await storage.updateProductPricesFromUrl();
      const jobEndTime = new Date();
      const duration = (jobEndTime.getTime() - jobStartTime.getTime()) / 1000;
      console.log('========================================');
      console.log(`[CRON] Daily price update completed successfully in ${duration}s`);
      console.log('========================================');
    } catch (error) {
      console.error('========================================');
      console.error('[CRON] Error in daily price update job:', error);
      console.error('========================================');
    }
  }, {
    timezone: "America/Sao_Paulo"
  });

  console.log(`[CRON] Daily price update scheduled for 07:00 AM (America/Sao_Paulo)`);
  console.log(`[CRON] Next execution will be at: ${getNextCronTime()}`);
  console.log(`[CRON] Cron task active: ${task ? 'YES' : 'NO'}`);
  console.log('========================================');
}

function getNextCronTime(): string {
  // Get current time in São Paulo timezone using proper timezone handling
  const now = new Date();
  
  // Format current time in São Paulo
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(now);
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '0');
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '1') - 1; // JS months are 0-indexed
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '1');
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
  
  // Create next execution time at 07:00 São Paulo time
  const nextSaoPaulo = new Date(Date.UTC(year, month, day, 7 + 3, 0, 0)); // +3 offset for São Paulo
  
  // If we've already passed 07:00 today, schedule for tomorrow
  if (hour >= 7) {
    nextSaoPaulo.setDate(nextSaoPaulo.getDate() + 1);
  }
  
  return nextSaoPaulo.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

export async function runDailyUpdateManually() {
  console.log('[MANUAL_CRON] Starting manual daily price update...');
  try {
    await storage.updateProductPricesFromUrl();
    console.log('[MANUAL_CRON] Manual daily price update completed successfully');
    return { success: true, message: 'Daily price update completed successfully' };
  } catch (error) {
    console.error('[MANUAL_CRON] Error in manual daily price update:', error);
    throw error;
  }
}