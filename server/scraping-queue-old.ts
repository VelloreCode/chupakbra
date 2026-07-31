// Note: Redis not available in this environment, using in-memory queue
import { scrapeProductData } from './scraper-v2';
import { storage } from './storage';
import { db } from './db';
import { priceMonitoringHistory } from '@shared/schema';

export interface ScrapingJob {
  id: string;
  url: string;
  productId: number;
  priority: 'low' | 'medium' | 'high';
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  scheduledAt: Date;
  type: 'price_update' | 'product_creation' | 'manual_scrape';
  metadata?: any;
  rateLimitDelay?: number; // milliseconds delay for rate limiting
  batchInfo?: {
    current: number;
    total: number;
    type: string;
  };
}

export class ScrapingQueue {
  private queue: ScrapingJob[] = [];
  private processing: Map<string, ScrapingJob> = new Map();
  private results: Map<string, any> = new Map();
  private isProcessing = false;
  private lastJobCompletedAt: Date | null = null;
  private readonly QUEUE_KEY = 'scraping:queue';
  private readonly PROCESSING_KEY = 'scraping:processing';
  private readonly RESULTS_KEY = 'scraping:results';

  async initialize() {
    console.log('Initializing in-memory scraping queue');
    this.queue = [];
    this.processing = new Map();
    this.results = new Map();
  }

  async addToQueue(job: Omit<ScrapingJob, 'id' | 'createdAt' | 'attempts'>): Promise<string> {
    return this.addJob(job);
  }

  async addJob(job: Omit<ScrapingJob, 'id' | 'createdAt' | 'attempts'>): Promise<string> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    const fullJob: ScrapingJob = {
      id: jobId,
      attempts: 0,
      createdAt: new Date(),
      ...job
    };

    // Add to queue in priority order
    this.queue.push(fullJob);
    this.queue.sort((a, b) => {
      const priorityA = this.getPriorityScore(a.priority);
      const priorityB = this.getPriorityScore(b.priority);
      return priorityB - priorityA; // Higher priority first
    });

    console.log(`Added scraping job ${jobId} with priority ${job.priority}`);
    return jobId;
  }

  async startProcessing() {
    if (this.isProcessing) {
      console.log('Queue processing already started');
      return;
    }

    this.isProcessing = true;
    console.log('Starting scraping queue processing');

    // Process jobs continuously
    while (this.isProcessing) {
      try {
        const job = await this.processNextJob();
        
        // Apply rate limiting based on job configuration
        let delayMs = 1000; // Default 1 second delay
        
        if (job && job.rateLimitDelay) {
          delayMs = job.rateLimitDelay;
          console.log(`[RATE_LIMIT] Applying custom delay of ${delayMs}ms for job ${job.id}`);
        }
        
        // Log progress for batch operations
        if (job && job.batchInfo) {
          console.log(`[BATCH_PROGRESS] ${job.batchInfo.type}: ${job.batchInfo.current}/${job.batchInfo.total} completed`);
        }
        
        await this.sleep(delayMs);
        this.lastJobCompletedAt = new Date();
        
      } catch (error) {
        console.error('Error in queue processing:', error);
        await this.sleep(5000); // Wait 5 seconds on error
      }
    }
  }

  async stopProcessing() {
    this.isProcessing = false;
    console.log('Stopping scraping queue processing');
  }

  private async processNextJob(): Promise<ScrapingJob | null> {
    // Get highest priority job
    if (this.queue.length === 0) {
      return null; // No jobs to process
    }

    const job = this.queue.shift()!;

    // Add to processing
    this.processing.set(job.id, job);

    console.log(`Processing scraping job ${job.id} for ${job.url}`);

    try {
      const result = await this.executeJob(job);
      
      // Store result
      this.results.set(job.id, {
        job,
        result,
        completedAt: new Date(),
        success: true
      });

      console.log(`Job ${job.id} completed successfully`);
    } catch (error) {
      console.error(`Job ${job.id} failed:`, error);
      
      // Retry logic
      if (job.attempts < job.maxAttempts) {
        job.attempts++;
        
        // Add back to queue for retry
        this.queue.push(job);
        this.queue.sort((a, b) => {
          const priorityA = this.getPriorityScore(a.priority);
          const priorityB = this.getPriorityScore(b.priority);
          return priorityB - priorityA; // Higher priority first
        });
        
        console.log(`Job ${job.id} requeued for retry (attempt ${job.attempts})`);
      } else {
        // Store failure result
        this.results.set(job.id, {
          job,
          error: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date(),
          success: false
        });
        
        console.log(`Job ${job.id} failed permanently after ${job.attempts} attempts`);
      }
    } finally {
      // Remove from processing
      this.processing.delete(job.id);
    }
    
    return job;
  }

  private async executeJob(job: ScrapingJob): Promise<any> {
    const startTime = Date.now();
    
    try {
      // Scrape the product data
      const scrapedData = await scrapeProductData(job.url);
      
      if (!scrapedData.success) {
        throw new Error('Scraping failed - no valid data extracted');
      }

      // Handle different job types
      switch (job.type) {
        case 'price_update':
          return await this.handlePriceUpdate(job, scrapedData);
        
        case 'product_creation':
          return await this.handleProductCreation(job, scrapedData);
        
        case 'manual_scrape':
          return await this.handleManualScrape(job, scrapedData);
        
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }
    } finally {
      const duration = Date.now() - startTime;
      console.log(`Job ${job.id} execution took ${duration}ms`);
    }
  }

  private async handlePriceUpdate(job: ScrapingJob, scrapedData: any): Promise<any> {
    console.log(`Handling price update for product ${job.productId}`);
    
    if (!scrapedData.success || !scrapedData.valor_principal) {
      throw new Error(`Failed to scrape price data: ${scrapedData.error || 'No price found'}`);
    }
    
    // Update product price
    const product = await storage.getProduct(job.productId);
    if (!product) {
      throw new Error(`Product ${job.productId} not found`);
    }

    const oldPrice = parseFloat(product.basePrice) || 0;
    const newPrice = parseFloat(scrapedData.valor_principal.toString()) || 0;
    const priceChanged = Math.abs(oldPrice - newPrice) > 0.01; // Consider changes > 1 cent

    // Update product base price and other data if available
    const updateData: any = {
      basePrice: newPrice.toString(),
    };
    
    // Only update other fields if they have valid values
    if (scrapedData.nome_produto && scrapedData.nome_produto.trim()) {
      updateData.name = scrapedData.nome_produto;
    }
    if (scrapedData.marca && scrapedData.marca.trim()) {
      updateData.manufacturer = scrapedData.marca;
    }
    if (scrapedData.link_imagem && scrapedData.link_imagem.trim()) {
      updateData.imageUrl = scrapedData.link_imagem;
    }
    
    await storage.updateProduct(job.productId, updateData);

    // Create price monitoring history entry
    await db.insert(priceMonitoringHistory).values({
      productId: job.productId,
      priceOld: oldPrice.toString(),
      priceNew: newPrice.toString(),
      dateChecked: new Date(),
      source: `url_monitoring_${scrapedData.method}`,
      createdAt: new Date()
    });

    const result = {
      productId: job.productId,
      oldPrice,
      newPrice,
      priceChanged,
      priceChange: newPrice - oldPrice,
      method: scrapedData.method,
      metadata: job.metadata
    };
    
    console.log(`Product ${job.productId} price updated: ${oldPrice} -> ${newPrice} (changed: ${priceChanged})`);
    
    return result;
  }

  private async handleProductCreation(job: ScrapingJob, scrapedData: any): Promise<any> {
    // Create new product using scraped data
    const product = await storage.createProductFromPreview(
      {
        name: scrapedData.nome_produto,
        manufacturer: scrapedData.marca,
        basePrice: scrapedData.valor_principal.toString(),
        imageUrl: scrapedData.link_imagem,
        sku: scrapedData.sku,
        description: scrapedData.description,
        sourceUrl: job.url,
        ...job.metadata
      },
      job.metadata?.isMaster || false,
      job.metadata?.masterProductId
    );

    return {
      productId: product.id,
      name: product.name,
      price: product.basePrice,
      method: scrapedData.method
    };
  }

  private async handleManualScrape(job: ScrapingJob, scrapedData: any): Promise<any> {
    // Just return the scraped data for manual processing
    return {
      url: job.url,
      scrapedData,
      method: scrapedData.method
    };
  }

  private getPriorityScore(priority: 'low' | 'medium' | 'high'): number {
    switch (priority) {
      case 'high': return 1000;
      case 'medium': return 500;
      case 'low': return 100;
      default: return 500;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getQueueStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    recentJobs?: any[];
  }> {
    const pending = this.queue.length;
    const processing = this.processing.size;
    
    // Count successful vs failed results
    let completed = 0;
    let failed = 0;

    for (const result of this.results.values()) {
      if (result.success) {
        completed++;
      } else {
        failed++;
      }
    }

    // Get recent jobs (last 10)
    const recentJobs = Array.from(this.results.values())
      .slice(-10)
      .map(result => ({
        id: result.job.id,
        url: result.job.url,
        productId: result.job.productId,
        batchInfo: result.job.batchInfo,
        success: result.success,
        completedAt: result.completedAt,
      }));

    return {
      pending,
      processing,
      completed,
      failed,
      recentJobs,
    };
  }
}

// Global queue instance
let globalQueue: ScrapingQueue | null = null;

export function getScrapingQueue(): ScrapingQueue {
  if (!globalQueue) {
    globalQueue = new ScrapingQueue();
    globalQueue.initialize();
    globalQueue.startProcessing();
  }
  return globalQueue;
}

// Legacy support
export async function addScrapingJob(job: Omit<ScrapingJob, 'id' | 'createdAt' | 'attempts'>): Promise<string> {
  const queue = getScrapingQueue();
  return queue.addJob(job);
}

// Initialize the queue when module is imported
const scrapingQueue = getScrapingQueue();

    return { queued, processing, completed, failed };
  }

  async getJobResult(jobId: string): Promise<any> {
    return this.results.get(jobId) || null;
  }

  async clearCompletedJobs(): Promise<number> {
    const count = this.results.size;
    this.results.clear();
    return count;
  }

  async close() {
    this.isProcessing = false;
    this.queue = [];
    this.processing.clear();
    this.results.clear();
  }
}

// Global queue instance
let queueInstance: ScrapingQueue | null = null;

export async function getScrapingQueue(): Promise<ScrapingQueue> {
  if (!queueInstance) {
    queueInstance = new ScrapingQueue();
    await queueInstance.initialize();
  }
  return queueInstance;
}

export async function addScrapingJob(job: Omit<ScrapingJob, 'id' | 'createdAt' | 'attempts'>): Promise<string> {
  const queue = await getScrapingQueue();
  return await queue.addJob(job);
}

export async function startScrapingQueue() {
  const queue = await getScrapingQueue();
  await queue.startProcessing();
}

export async function stopScrapingQueue() {
  if (queueInstance) {
    await queueInstance.stopProcessing();
  }
}

export async function closeScrapingQueue() {
  if (queueInstance) {
    await queueInstance.close();
    queueInstance = null;
  }
}