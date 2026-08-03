import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { generatePricingStrategy, generateBenchmarkAnalysis } from "./ai-pricing";
import { getScrapingQueue } from "./scraping-queue";
import {
  insertCategorySchema,
  insertClientSchema,
  insertCompetitorSchema,
  insertProductSchema,
  insertPriceSchema,
  insertUploadHistorySchema,
  insertApiKeySchema,
  insertPriceHistorySchema,
  insertReportsHistorySchema,
  products
} from "@shared/schema";
import { z } from "zod";
import { eq, isNotNull } from "drizzle-orm";
import { db } from "./db";
import multer from "multer";
import * as XLSX from "xlsx";
import crypto from "crypto";
import fs from "fs";
import path from "path";

// Utility function to validate numeric IDs
const validateId = (id: string, name: string = "ID") => {
  const parsedId = parseInt(id);
  if (isNaN(parsedId) || parsedId <= 0) {
    throw new Error(`Invalid ${name}`);
  }
  return parsedId;
};

// API Key authentication middleware
const authenticateApiKey = async (req: any, res: any, next: any) => {
  const apiKey = req.headers['authorization']?.replace('Bearer ', '') || req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({ message: "API key required" });
  }

  try {
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    const validApiKey = await storage.validateApiKey(keyHash);
    
    if (!validApiKey || !validApiKey.isActive) {
      return res.status(401).json({ message: "Invalid or inactive API key" });
    }
    
    req.apiKey = validApiKey;
    next();
  } catch (error) {
    console.error("API key validation error:", error);
    return res.status(401).json({ message: "Authentication failed" });
  }
};

// Combined authentication middleware (session or API key)
const authenticate = (req: any, res: any, next: any) => {
  // Check for API key first
  const apiKey = req.headers['authorization']?.replace('Bearer ', '') || req.headers['x-api-key'];
  
  if (apiKey) {
    return authenticateApiKey(req, res, next);
  }
  
  // Fall back to session authentication
  return isAuthenticated(req, res, next);
};

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { 
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.includes('spreadsheet') || 
        file.mimetype.includes('excel') || 
        file.originalname.match(/\.(xlsx|xls)$/)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel files are allowed.'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Local authentication route
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email e senha são obrigatórios" });
      }

      // Find user by email
      const users = await storage.getAllUsers();
      const user = users.find(u => u.email === email);
      
      if (!user) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }

      // For demo purposes, accept any password for existing users
      // In production, you would verify password hash here
      
      // Set session
      (req.session as any).user = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
        role: user.role
      };

      // Explicitly save session
      req.session.save((err: any) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Erro ao salvar sessão" });
        }

        res.json({ 
          message: "Login realizado com sucesso",
          user: (req.session as any).user 
        });
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Configure multer for file uploads
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
      if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
          file.mimetype === 'application/vnd.ms-excel' ||
          file.originalname.endsWith('.xlsx') ||
          file.originalname.endsWith('.xls')) {
        cb(null, true);
      } else {
        cb(new Error('Only Excel files are allowed'));
      }
    }
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      // Check for local session user first
      if (req.session?.user) {
        return res.json((req.session as any).user);
      }
      
      // Fall back to Replit OIDC user
      const userId = req.user?.claims?.sub;
      if (userId) {
        const user = await storage.getUser(userId);
        return res.json(user);
      }
      
      res.status(401).json({ message: "No user found" });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // AI Pricing Analysis routes
  app.post('/api/ai/pricing-analysis', isAuthenticated, async (req: any, res) => {
    try {
      const { priceData, customPrompt } = req.body;
      
      if (!priceData || !Array.isArray(priceData)) {
        return res.status(400).json({ message: "Dados de preços inválidos" });
      }

      const { generatePricingStrategy } = await import('./ai-pricing');
      const analysis = await generatePricingStrategy(priceData, customPrompt);
      
      res.json(analysis);
    } catch (error) {
      console.error("Error in AI pricing analysis:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Erro na análise de IA" 
      });
    }
  });

  app.get('/api/analytics/benchmark', isAuthenticated, async (req: any, res) => {
    try {
      const priceData = await storage.getBestPrices();
      
      if (priceData.length === 0) {
        return res.json({});
      }

      const { generateBenchmarkAnalysis } = await import('./ai-pricing');
      const benchmark = await generateBenchmarkAnalysis(priceData);
      
      res.json(benchmark || {});
    } catch (error) {
      console.error("Error in benchmark analysis:", error);
      res.status(500).json({ message: "Erro na análise de benchmark" });
    }
  });

  // Dashboard routes
  app.get("/api/dashboard/stats", isAuthenticated, async (req, res) => {
    try {
      // Add cache headers for dashboard stats
      res.set('Cache-Control', 'public, max-age=300'); // 5 minutes cache
      
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Scraping queue stats
  app.get("/api/scraping/stats", isAuthenticated, async (req, res) => {
    try {
      const queue = await getScrapingQueue();
      const stats = await queue.getQueueStats();
      res.json(stats);
    } catch (error) {
      console.error("Error getting scraping stats:", error);
      res.status(500).json({ message: "Error getting scraping stats" });
    }
  });

  // Get recent price updates from URL changes
  app.get("/api/products/recent-price-updates", isAuthenticated, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const recentUpdates = await storage.getRecentPriceUpdates(limit);
      res.json(recentUpdates);
    } catch (error) {
      console.error("Error getting recent price updates:", error);
      res.status(500).json({ message: "Error getting recent price updates" });
    }
  });

  // Product history route
  app.get("/api/products/:id/history", isAuthenticated, async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      if (isNaN(productId)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }

      const history = await storage.getProductHistory(productId);
      res.json(history);
    } catch (error) {
      console.error("Error fetching product history:", error);
      res.status(500).json({ message: "Failed to fetch product history" });
    }
  });

  // Product comparison route
  app.get("/api/products/:id/comparison", isAuthenticated, async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      if (isNaN(productId)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }

      // Get the product information
      const product = await storage.getProduct(productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Get price comparison data
      const prices = await storage.getProductPriceComparison(productId);
      
      if (prices.length === 0) {
        return res.json({
          product,
          prices: [],
          bestPrice: null,
          savings: 0
        });
      }

      // Calculate best price and savings
      const sortedPrices = prices.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
      const bestPrice = sortedPrices[0];
      const worstPrice = sortedPrices[sortedPrices.length - 1];
      const savings = parseFloat(worstPrice.price) - parseFloat(bestPrice.price);

      const comparison = {
        product,
        prices,
        bestPrice,
        savings
      };

      res.json(comparison);
    } catch (error) {
      console.error("Error fetching product comparison:", error);
      res.status(500).json({ message: "Failed to fetch product comparison" });
    }
  });

  // Get products by match group
  app.get("/api/products/:id/match-group", isAuthenticated, async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      if (isNaN(productId)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }

      // First get the product to get its match group
      const product = await storage.getProduct(productId);
      
      if (!product || !product.matchGroup) {
        return res.json([]);
      }

      // Get match group comparison data
      const matchGroupData = await storage.getMatchGroupComparison(product.matchGroup);
      
      res.json(matchGroupData);
    } catch (error) {
      console.error("Error fetching match group products:", error);
      res.status(500).json({ message: "Failed to fetch match group products" });
    }
  });

  app.get("/api/dashboard/best-prices", isAuthenticated, async (req, res) => {
    try {
      // Add cache headers for better performance
      res.set({
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600', // 5 minutes cache, 10 minutes stale
        'ETag': `"best-prices-${Date.now()}"`,
        'Vary': 'Authorization'
      });
      
      const limit = parseInt(req.query.limit as string) || 5;
      const bestPrices = await storage.getBestPrices(limit);
      res.json(bestPrices);
    } catch (error) {
      console.error("Error fetching best prices:", error);
      res.status(500).json({ message: "Failed to fetch best prices" });
    }
  });

  app.get("/api/dashboard/recent-products", isAuthenticated, async (req, res) => {
    try {
      const recentProducts = await storage.getRecentlyUpdatedProducts();
      res.json(recentProducts);
    } catch (error) {
      console.error("Error fetching recent products:", error);
      res.status(500).json({ message: "Failed to fetch recent products" });
    }
  });

  // Categories routes
  app.get("/api/categories", isAuthenticated, async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post("/api/categories", isAuthenticated, async (req, res) => {
    try {
      const categoryData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(categoryData);
      res.status(201).json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(400).json({ message: "Failed to create category" });
    }
  });

  app.put("/api/categories/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid category ID" });
      }
      const categoryData = insertCategorySchema.partial().parse(req.body);
      const category = await storage.updateCategory(id, categoryData);
      res.json(category);
    } catch (error) {
      console.error("Error updating category:", error);
      res.status(400).json({ message: "Failed to update category" });
    }
  });

  app.get("/api/categories/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid category ID" });
      }
      const category = await storage.getCategory(id);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      console.error("Error fetching category:", error);
      res.status(500).json({ message: "Failed to fetch category" });
    }
  });

  app.delete("/api/categories/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid category ID" });
      }
      await storage.deleteCategory(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(400).json({ message: "Failed to delete category" });
    }
  });

  // Clients routes
  app.get("/api/clients", isAuthenticated, async (req, res) => {
    try {
      const clients = await storage.getClients();
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.post("/api/clients", isAuthenticated, async (req, res) => {
    try {
      const clientData = insertClientSchema.parse(req.body);
      const client = await storage.createClient(clientData);
      res.status(201).json(client);
    } catch (error) {
      console.error("Error creating client:", error);
      res.status(400).json({ message: "Failed to create client" });
    }
  });

  app.put("/api/clients/:id", isAuthenticated, async (req, res) => {
    try {
      const id = validateId(req.params.id, "client ID");
      const clientData = insertClientSchema.partial().parse(req.body);
      const client = await storage.updateClient(id, clientData);
      res.json(client);
    } catch (error) {
      console.error("Error updating client:", error);
      if (error instanceof Error && error.message.includes("Invalid")) {
        return res.status(400).json({ message: error.message });
      }
      res.status(400).json({ message: "Failed to update client" });
    }
  });

  app.get("/api/clients/:id", isAuthenticated, async (req, res) => {
    try {
      const id = validateId(req.params.id, "client ID");
      const client = await storage.getClient(id);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      console.error("Error fetching client:", error);
      if (error instanceof Error && error.message.includes("Invalid")) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to fetch client" });
    }
  });

  app.delete("/api/clients/:id", isAuthenticated, async (req, res) => {
    try {
      const id = validateId(req.params.id, "client ID");
      await storage.deleteClient(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting client:", error);
      if (error instanceof Error && error.message.includes("Invalid")) {
        return res.status(400).json({ message: error.message });
      }
      res.status(400).json({ message: "Failed to delete client" });
    }
  });

  app.post("/api/clients/:id/generate-api-key", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid client ID" });
      }
      const apiKey = await storage.generateApiKey(id);
      res.json({ apiKey });
    } catch (error) {
      console.error("Error generating API key:", error);
      res.status(400).json({ message: "Failed to generate API key" });
    }
  });

  app.post("/api/clients/:id/set-master", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid client ID" });
      }
      const client = await storage.setMasterClient(id);
      res.json(client);
    } catch (error) {
      console.error("Error setting master client:", error);
      res.status(400).json({ message: "Failed to set master client" });
    }
  });

  app.get("/api/clients/master", isAuthenticated, async (req, res) => {
    try {
      const masterClient = await storage.getMasterClient();
      res.json(masterClient || null);
    } catch (error) {
      console.error("Error fetching master client:", error);
      res.status(500).json({ message: "Failed to fetch master client" });
    }
  });

  // URL Product scraping routes
  app.post("/api/products/scrape-preview", isAuthenticated, async (req, res) => {
    try {
      const { url } = req.body;
      
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ message: "URL é obrigatória" });
      }

      // Validate URL format
      try {
        new URL(url);
      } catch {
        return res.status(400).json({ message: "Formato de URL inválido" });
      }

      // Check if URL is accessible
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return res.status(400).json({ message: "URL deve começar com http:// ou https://" });
      }

      // Just scrape and return data for preview, don't save yet
      const { scrapeProductData } = await import("./scraper-v2");
      const scrapedData = await scrapeProductData(url);
      
      if (!scrapedData.success || !scrapedData.nome_produto) {
        return res.status(400).json({ message: "Não foi possível extrair o nome do produto da URL" });
      }

      res.json({
        name: scrapedData.nome_produto,
        manufacturer: scrapedData.marca || "",
        basePrice: scrapedData.valor_principal?.toString() || "0",
        imageUrl: scrapedData.link_imagem || "",
        sku: scrapedData.sku || `AUTO-${Date.now()}`,
        description: scrapedData.description || "",
        sourceUrl: url,
        method: scrapedData.method,
        timestamp: scrapedData.timestamp
      });
    } catch (error) {
      console.error("Error scraping product preview:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Failed to scrape product data" 
      });
    }
  });

  app.post("/api/products/scrape-master", isAuthenticated, async (req, res) => {
    try {
      const productData = req.body;
      
      if (!productData.name || !productData.sourceUrl) {
        return res.status(400).json({ message: "Nome do produto e URL são obrigatórios" });
      }

      const product = await storage.createProductFromPreview(productData, true);
      res.status(201).json(product);
    } catch (error) {
      console.error("Error creating master product:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Failed to create master product" 
      });
    }
  });

  app.post("/api/products/scrape-competitors", isAuthenticated, async (req, res) => {
    try {
      const { urls, masterProductId } = req.body;
      
      if (!Array.isArray(urls) || typeof masterProductId !== 'number') {
        return res.status(400).json({ message: "URLs e masterProductId são obrigatórios" });
      }

      const results = [];
      const errors = [];

      for (const url of urls) {
        try {
          const product = await storage.createProductFromUrl(url, false, masterProductId);
          results.push(product);
        } catch (error) {
          console.error(`Error scraping competitor product from ${url}:`, error);
          errors.push({ url, error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }

      res.json({
        success: results.length,
        total: urls.length,
        products: results,
        errors: errors
      });
    } catch (error) {
      console.error("Error scraping competitor products:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Failed to scrape competitor products" 
      });
    }
  });

  app.get("/api/products/:id/competitors", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const competitors = await storage.getProductCompetitors(id);
      res.json(competitors);
    } catch (error) {
      console.error("Error fetching product competitors:", error);
      res.status(500).json({ message: "Failed to fetch product competitors" });
    }
  });

  // Cron job endpoint for updating prices
  app.post("/api/products/update-prices", async (req, res) => {
    try {
      // Simple authentication check for cron job
      const authHeader = req.headers.authorization;
      if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET || 'default-cron-secret'}`) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      await storage.updateProductPricesFromUrl();
      res.json({ message: "Prices updated successfully" });
    } catch (error) {
      console.error("Error updating prices:", error);
      res.status(500).json({ message: "Failed to update prices" });
    }
  });

  // General bulk price update endpoint with rate limiting
  app.post("/api/products/bulk-update-prices", authenticate, async (req, res) => {
    try {
      const { 
        filters = {}, 
        delayBetweenUpdates = 2000, // 2 seconds default delay between requests
        maxConcurrentUpdates = 3    // maximum concurrent scraping operations
      } = req.body;

      console.log('[BULK_UPDATE] Starting bulk price update with filters:', filters);
      console.log('[BULK_UPDATE] Rate limiting - delay:', delayBetweenUpdates, 'ms, max concurrent:', maxConcurrentUpdates);

      // Get products that have source URLs and match filters
      const productsResult = await storage.getProducts({
        ...filters,
        limit: 10000, // Large limit to get all matching products
        hasSourceUrl: true // Only products with URLs
      });

      const productsWithUrls = productsResult.products.filter(p => p.sourceUrl && p.sourceUrl.trim() !== '');
      
      if (productsWithUrls.length === 0) {
        return res.json({
          message: "No products with source URLs found matching the criteria",
          queued: 0,
          total: 0
        });
      }

      console.log(`[BULK_UPDATE] Found ${productsWithUrls.length} products with URLs to update`);

      // Add all products to scraping queue with controlled rate limiting
      const scrapingQueue = getScrapingQueue();
      let queuedCount = 0;

      for (let i = 0; i < productsWithUrls.length; i++) {
        const product = productsWithUrls[i];
        
        try {
          // Add to queue with medium priority and rate limiting info
          await scrapingQueue.addToQueue({
            url: product.sourceUrl,
            productId: product.id,
            type: 'price_update',
            priority: 'medium',
            maxAttempts: 2,
            scheduledAt: new Date(),
            rateLimitDelay: delayBetweenUpdates,
            batchInfo: {
              current: i + 1,
              total: productsWithUrls.length,
              type: 'bulk_update'
            },
            metadata: {
              bulkUpdate: true,
              batchId: `bulk_${Date.now()}`,
              originalSku: product.sku
            }
          });

          queuedCount++;
          console.log(`[BULK_UPDATE] Queued product ${product.id} (${product.sku}) - ${i + 1}/${productsWithUrls.length}`);

        } catch (error) {
          console.error(`[BULK_UPDATE] Failed to queue product ${product.id}:`, error);
        }
      }

      res.json({
        message: `Bulk price update initiated for ${queuedCount} products`,
        queued: queuedCount,
        total: productsWithUrls.length,
        estimatedDuration: Math.ceil((queuedCount * delayBetweenUpdates) / 1000 / 60), // in minutes
        rateLimitSettings: {
          delayBetweenUpdates,
          maxConcurrentUpdates
        }
      });

    } catch (error) {
      console.error("Error initiating bulk price update:", error);
      res.status(500).json({ message: "Failed to initiate bulk price update", error: error.message });
    }
  });

  // Clear queue endpoint (emergency stop)
  app.post("/api/products/clear-queue", authenticate, async (req, res) => {
    try {
      const scrapingQueue = getScrapingQueue();
      await scrapingQueue.close();
      
      // Force restart queue to clear all old jobs
      const { forceRestartQueue } = await import('./scraping-queue');
      const newQueue = forceRestartQueue();
      
      console.log('Queue cleared and restarted successfully');
      
      res.json({
        message: "Queue cleared and reinitialized",
        success: true,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error clearing queue:", error);
      res.status(500).json({ message: "Failed to clear queue" });
    }
  });

  // Get bulk update status endpoint
  app.get("/api/products/bulk-update-status", authenticate, async (req, res) => {
    try {
      const scrapingQueue = getScrapingQueue();
      const stats = await scrapingQueue.getQueueStats();
      
      // Get recent bulk update jobs
      const recentBulkJobs = stats.recentJobs?.filter(job => 
        job.batchInfo?.type === 'bulk_update'
      ).slice(0, 10) || [];

      res.json({
        queueStats: stats,
        recentBulkJobs,
        isProcessing: stats.processing > 0,
        totalPending: stats.pending,
        totalCompleted: stats.completed,
        totalFailed: stats.failed
      });

    } catch (error) {
      console.error("Error getting bulk update status:", error);
      res.status(500).json({ message: "Failed to get bulk update status" });
    }
  });

  // Get price monitoring history
  app.get("/api/products/monitoring-history", authenticate, async (req, res) => {
    try {
      const productId = req.query.productId ? parseInt(req.query.productId as string) : undefined;
      
      // If no productId specified, get history for all URL-based products
      if (!productId) {
        const urlProducts = await db
          .select({ id: products.id })
          .from(products)
          .where(isNotNull(products.sourceUrl));
        
        if (urlProducts.length === 0) {
          return res.json([]);
        }
      }
      
      const history = await storage.getPriceMonitoringHistory(productId);
      res.json(history);
    } catch (error) {
      console.error("Error fetching monitoring history:", error);
      res.status(500).json({ message: "Failed to fetch monitoring history" });
    }
  });

  // Test endpoint to manually trigger daily cron update
  app.post("/api/cron/test-daily-update", authenticate, async (req, res) => {
    try {
      console.log('[API] Manual cron test triggered by user');
      const { runDailyUpdateManually } = await import('./cron');
      const result = await runDailyUpdateManually();
      res.json(result);
    } catch (error) {
      console.error("Error running manual daily update:", error);
      res.status(500).json({ 
        message: "Failed to run daily update", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // ===========================================================================
  // Fornecedores (Tambasa / Bartofil) — extração automática de preços
  // ===========================================================================

  const supplierKeySchema = z.enum(["tambasa", "bartofil", "martins"]);

  // Estado da sessão manual. Nunca devolve o token — só o suficiente para a
  // tela dizer se está válida e quando foi capturada.
  app.get("/api/suppliers/:key/session", authenticate, async (req, res) => {
    try {
      const key = supplierKeySchema.parse(req.params.key);
      const s = await storage.getSupplierSession(key);
      if (!s) return res.json({ capturada: false });

      const { mascararToken } = await import("./suppliers/session-capture");
      res.json({
        capturada: true,
        tokenMascarado: mascararToken(s.accessToken),
        capturadaEm: s.capturedAt,
        ultimoSucesso: s.lastOkAt,
        ultimaFalha: s.lastFailedAt,
        motivoFalha: s.lastFailureReason,
        // Falhou depois do último sucesso => precisa recapturar.
        expirada: Boolean(s.lastFailedAt && (!s.lastOkAt || s.lastFailedAt > s.lastOkAt)),
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Fornecedor inválido" });
      }
      console.error("Error fetching supplier session:", error);
      res.status(500).json({ message: "Failed to fetch supplier session" });
    }
  });

  // Captura a sessão a partir do "Copy as cURL" do DevTools.
  app.post("/api/suppliers/:key/session", authenticate, async (req, res) => {
    try {
      const key = supplierKeySchema.parse(req.params.key);
      const { curl } = z.object({ curl: z.string().min(20) }).parse(req.body ?? {});

      const { capturarSessaoMartins, CurlInvalidoError, mascararToken } =
        await import("./suppliers/session-capture");

      let sessao;
      try {
        sessao = capturarSessaoMartins(curl);
      } catch (error) {
        if (error instanceof CurlInvalidoError) {
          return res.status(400).json({ message: error.message });
        }
        throw error;
      }

      await storage.saveSupplierSession({
        supplier: key,
        accessToken: sessao.accessToken,
        clientId: sessao.clientId,
        bodyTemplate: sessao.bodyTemplate,
      });

      console.log(`[SUPPLIER:${key}] sessão capturada (${sessao.bodyTemplate ? "com" : "sem"} template de corpo)`);

      res.json({
        capturada: true,
        tokenMascarado: mascararToken(sessao.accessToken),
        camposDoTemplate: Object.keys(sessao.bodyTemplate ?? {}).length,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Cole o comando cURL completo" });
      }
      console.error("Error saving supplier session:", error);
      res.status(500).json({ message: "Failed to save supplier session" });
    }
  });

  app.delete("/api/suppliers/:key/session", authenticate, async (req, res) => {
    try {
      const key = supplierKeySchema.parse(req.params.key);
      await storage.deleteSupplierSession(key);
      res.json({ deleted: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Fornecedor inválido" });
      }
      console.error("Error deleting supplier session:", error);
      res.status(500).json({ message: "Failed to delete supplier session" });
    }
  });

  // Lista os fornecedores e se as credenciais estão presentes.
  // Devolve BOOLEANO, nunca o valor: o middleware de log em server/index.ts
  // imprime o corpo de toda resposta /api.
  app.get("/api/suppliers", authenticate, async (_req, res) => {
    try {
      const { SUPPLIER_META, listSupplierKeys } = await import("./suppliers/registry");
      const { checkCredentials, isSupplierSyncEnabled } = await import("./suppliers/config");

      // Janela de tolerância sobre o agendamento diário: 26h dá 2h de folga
      // para atraso de fila ou reinício de container sem virar alarme falso.
      const STALE_AFTER_HOURS = 26;
      const syncEnabled = isSupplierSyncEnabled();

      const suppliers = await Promise.all(
        listSupplierKeys().map(async (key) => {
          const recentRuns = await storage.getSupplierSyncRuns(key, 20);
          const lastRun = recentRuns[0];
          // Simulação não grava preço: contá-la como execução faria o card
          // dizer "em dia" com os preços parados. A obsolescência olha só
          // execuções reais.
          const lastRealRun = recentRuns.find((r) => !r.dryRun);

          const categories = await storage.getSupplierCategories(key);
          const enabledCount = categories.filter((c) => c.enabled).length;

          const hoursSinceLastRun = lastRealRun?.startedAt
            ? (Date.now() - new Date(lastRealRun.startedAt).getTime()) / 3_600_000
            : null;

          const credentials = checkCredentials(key);

          // Só alerta se a rotina deveria estar rodando. Sem credencial, sem
          // categoria marcada ou com o cron desligado, "atrasado" é ruído em
          // cima de um problema que já está sinalizado em outro lugar.
          const shouldHaveRun = syncEnabled && enabledCount > 0 && credentials.ok;
          const syncStale =
            shouldHaveRun && (hoursSinceLastRun === null || hoursSinceLastRun > STALE_AFTER_HOURS);

          return {
            key,
            displayName: SUPPLIER_META[key].displayName,
            website: SUPPLIER_META[key].website,
            credentialsConfigured: credentials.ok,
            credentialsIssue: credentials.issue,
            categoriesTotal: categories.length,
            categoriesEnabled: enabledCount,
            lastRun: lastRun ?? null,
            lastRealRunAt: lastRealRun?.startedAt ?? null,
            syncEnabled,
            hoursSinceLastRun,
            syncStale,
            staleAfterHours: STALE_AFTER_HOURS,
          };
        }),
      );

      res.json(suppliers);
    } catch (error) {
      console.error("Error listing suppliers:", error);
      res.status(500).json({ message: "Failed to list suppliers" });
    }
  });

  app.get("/api/suppliers/:key/categories", authenticate, async (req, res) => {
    try {
      const key = supplierKeySchema.parse(req.params.key);
      const onlyEnabled = req.query.enabled === "true";
      res.json(await storage.getSupplierCategories(key, onlyEnabled));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Fornecedor inválido" });
      }
      console.error("Error fetching supplier categories:", error);
      res.status(500).json({ message: "Failed to fetch supplier categories" });
    }
  });

  // Busca a árvore de categorias no portal e faz upsert.
  // Não altera `enabled`: redescobrir não pode desmarcar a seleção do usuário.
  app.post("/api/suppliers/:key/categories/discover", authenticate, async (req, res) => {
    let adapter: Awaited<ReturnType<typeof import("./suppliers/registry").getAdapter>> | null = null;
    try {
      const key = supplierKeySchema.parse(req.params.key);
      const { getAdapter } = await import("./suppliers/registry");

      adapter = await getAdapter(key);
      const categories = await adapter.listCategories();

      const result = await storage.upsertSupplierCategories(
        categories.map((cat) => ({
          supplier: key,
          externalId: cat.externalId,
          label: cat.label,
          parentExternalId: cat.parentExternalId ?? null,
        })),
      );

      res.json({ discovered: result.total, created: result.created });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Fornecedor inválido" });
      }
      console.error("Error discovering supplier categories:", error);
      res.status(500).json({
        message: "Failed to discover categories",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      await adapter?.close().catch(() => undefined);
    }
  });

  app.patch("/api/suppliers/categories/:id", authenticate, async (req, res) => {
    try {
      let id: number;
      try {
        id = validateId(req.params.id, "ID da categoria");
      } catch {
        return res.status(400).json({ message: "ID inválido" });
      }

      const { enabled } = z.object({ enabled: z.boolean() }).parse(req.body);
      const updated = await storage.setSupplierCategoryEnabled(id, enabled);

      if (!updated) return res.status(404).json({ message: "Categoria não encontrada" });
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Body inválido: esperado { enabled: boolean }" });
      }
      console.error("Error updating supplier category:", error);
      res.status(500).json({ message: "Failed to update supplier category" });
    }
  });

  // Dispara a sincronização. Responde 202 e segue em background — a varredura
  // leva minutos, então a UI acompanha por /api/suppliers/sync-status.
  app.post("/api/suppliers/sync", authenticate, async (req, res) => {
    try {
      const body = z
        .object({
          suppliers: z.array(supplierKeySchema).optional(),
          dryRun: z.boolean().optional(),
          maxPagesPerCategory: z.number().int().positive().optional(),
        })
        .parse(req.body ?? {});

      const { runSupplierSync, getSupplierSyncState } = await import("./suppliers/sync");
      const { SyncAlreadyRunningError } = await import("./suppliers/types");

      if (getSupplierSyncState().running) {
        return res.status(409).json({ message: "Já existe uma sincronização em andamento" });
      }

      void runSupplierSync({ ...body, trigger: "manual" }).catch((error) => {
        if (error instanceof SyncAlreadyRunningError) return;
        console.error("[SUPPLIER] sincronização falhou:", error);
      });

      res.status(202).json({ started: true, dryRun: body.dryRun ?? false });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Parâmetros inválidos" });
      }
      console.error("Error starting supplier sync:", error);
      res.status(500).json({ message: "Failed to start supplier sync" });
    }
  });

  app.get("/api/suppliers/sync-status", authenticate, async (_req, res) => {
    try {
      const { getSupplierSyncState } = await import("./suppliers/sync");
      res.json(getSupplierSyncState());
    } catch (error) {
      console.error("Error fetching supplier sync status:", error);
      res.status(500).json({ message: "Failed to fetch sync status" });
    }
  });

  app.get("/api/suppliers/runs", authenticate, async (req, res) => {
    try {
      const supplier = req.query.supplier ? supplierKeySchema.parse(req.query.supplier) : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : 20;
      res.json(await storage.getSupplierSyncRuns(supplier, Number.isFinite(limit) ? limit : 20));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Fornecedor inválido" });
      }
      console.error("Error fetching supplier runs:", error);
      res.status(500).json({ message: "Failed to fetch supplier runs" });
    }
  });

  // Espelho de /api/cron/test-daily-update, para testar o job manualmente.
  app.post("/api/cron/test-supplier-sync", authenticate, async (req, res) => {
    try {
      console.log("[API] Manual supplier sync triggered by user");
      const { runSupplierSyncManually } = await import("./cron");
      const dryRun = req.body?.dryRun === true;
      res.json(await runSupplierSyncManually({ dryRun }));
    } catch (error) {
      console.error("Error running manual supplier sync:", error);
      res.status(500).json({
        message: "Failed to run supplier sync",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Gatilho para agendador externo. Mesma guarda de /api/products/update-prices.
  app.post("/api/suppliers/sync-cron", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const expected = `Bearer ${process.env.CRON_SECRET || "default-cron-secret"}`;
      if (authHeader !== expected) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { runSupplierSync, getSupplierSyncState } = await import("./suppliers/sync");
      if (getSupplierSyncState().running) {
        return res.status(409).json({ message: "Já existe uma sincronização em andamento" });
      }

      void runSupplierSync({ trigger: "cron" }).catch((error) => {
        console.error("[SUPPLIER] sincronização (cron externo) falhou:", error);
      });

      res.status(202).json({ started: true });
    } catch (error) {
      console.error("Error starting supplier sync via cron:", error);
      res.status(500).json({ message: "Failed to start supplier sync" });
    }
  });

  // Get master products with their competitors
  app.get("/api/products/masters-with-competitors", isAuthenticated, async (req, res) => {
    try {
      const specificMasterId = req.query.masterId ? parseInt(req.query.masterId as string) : undefined;
      const competitorClientId = req.query.competitorClientId ? parseInt(req.query.competitorClientId as string) : undefined;
      console.log(`[PERFORMANCE] Fetching masters with competitors${specificMasterId ? ` for specific master ID: ${specificMasterId}` : ' (all masters)'}${competitorClientId ? ` filtered by competitor client ID: ${competitorClientId}` : ''}`);
      
      // 'competitor-brands' = comparação contra marcas de terceiros (Monitoramento).
      // 'own-brand'         = mesmo produto nosso em outros vendedores (Comparação de Preço).
      const brandScope = ['all', 'own-brand', 'competitor-brands'].includes(
        req.query.brandScope as string,
      )
        ? (req.query.brandScope as 'all' | 'own-brand' | 'competitor-brands')
        : 'all';

      const startTime = Date.now();
      const mastersWithCompetitors = await storage.getMasterProductsWithCompetitors(
        specificMasterId,
        competitorClientId,
        brandScope,
      );
      const duration = Date.now() - startTime;
      
      console.log(`[PERFORMANCE] Query completed in ${duration}ms, returned ${mastersWithCompetitors.length} masters`);
      
      // Set cache headers for better performance
      res.set({
        'Cache-Control': 'public, max-age=300', // 5 minutes cache
        'ETag': `"masters-${mastersWithCompetitors.length}-${Date.now()}"` 
      });
      
      res.json(mastersWithCompetitors);
    } catch (error) {
      console.error("Error fetching masters with competitors:", error);
      res.status(500).json({ message: "Failed to fetch masters with competitors" });
    }
  });

  // Delete a competitor product
  app.delete("/api/products/competitor/:competitorId", isAuthenticated, async (req, res) => {
    try {
      const competitorId = parseInt(req.params.competitorId);
      
      // Verify the product exists and is not a master
      const product = await storage.getProduct(competitorId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      if (product.isMaster) {
        return res.status(400).json({ message: "Cannot delete master product" });
      }

      await storage.deleteProduct(competitorId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting competitor:", error);
      res.status(500).json({ message: "Failed to delete competitor" });
    }
  });

  // Add a new competitor to an existing master product
  app.post("/api/products/add-competitor", isAuthenticated, async (req, res) => {
    try {
      const { masterProductId, newUrl } = req.body;

      if (!masterProductId || !newUrl) {
        return res.status(400).json({ message: "Master product ID and new URL are required" });
      }

      // Verify the master product exists
      const masterProduct = await storage.getProduct(masterProductId);
      if (!masterProduct || !masterProduct.isMaster) {
        return res.status(404).json({ message: "Master product not found" });
      }

      // Create the competitor product
      const newCompetitor = await storage.createProductFromUrl(newUrl, false, masterProductId);
      res.json(newCompetitor);
    } catch (error) {
      console.error("Error adding competitor:", error);
      res.status(500).json({ message: "Failed to add competitor" });
    }
  });

  // Competitor routes
  app.get("/api/competitors", async (req, res) => {
    try {
      const competitors = await storage.getCompetitors();
      res.json(competitors);
    } catch (error) {
      console.error("Error fetching competitors:", error);
      res.status(500).json({ error: "Failed to fetch competitors" });
    }
  });

  app.post("/api/competitors", isAuthenticated, async (req, res) => {
    try {
      const competitorData = insertCompetitorSchema.parse(req.body);
      const competitor = await storage.createCompetitor(competitorData);
      res.status(201).json(competitor);
    } catch (error) {
      console.error("Error creating competitor:", error);
      res.status(500).json({ error: "Failed to create competitor" });
    }
  });

  app.get("/api/competitors/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const competitor = await storage.getCompetitor(id);
      if (!competitor) {
        return res.status(404).json({ message: "Competitor not found" });
      }
      res.json(competitor);
    } catch (error) {
      console.error("Error fetching competitor:", error);
      res.status(500).json({ message: "Failed to fetch competitor" });
    }
  });

  app.put("/api/competitors/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const competitorData = insertCompetitorSchema.partial().parse(req.body);
      const competitor = await storage.updateCompetitor(id, competitorData);
      res.json(competitor);
    } catch (error) {
      console.error("Error updating competitor:", error);
      res.status(500).json({ error: "Failed to update competitor" });
    }
  });

  app.patch("/api/competitors/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const competitorData = insertCompetitorSchema.partial().parse(req.body);
      const competitor = await storage.updateCompetitor(id, competitorData);
      res.json(competitor);
    } catch (error) {
      console.error("Error updating competitor:", error);
      res.status(500).json({ error: "Failed to update competitor" });
    }
  });

  app.delete("/api/competitors/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCompetitor(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting competitor:", error);
      res.status(500).json({ error: "Failed to delete competitor" });
    }
  });

  // Products routes
  app.get("/api/products", authenticate, async (req, res) => {
    try {
      const filters = {
        search: req.query.search as string,
        sku: req.query.sku as string,
        categoryId: req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined,
        clientId: req.query.clientId ? parseInt(req.query.clientId as string) : undefined,
        status: req.query.status as string,
        sourceType: req.query.sourceType as string,
        isCompetitor: req.query.isCompetitor === 'true' ? true : req.query.isCompetitor === 'false' ? false : undefined,
        isMaster: req.query.isMaster === 'true' ? true : req.query.isMaster === 'false' ? false : undefined,
        hasCompetitorFromClient: req.query.hasCompetitorFromClient ? parseInt(req.query.hasCompetitorFromClient as string) : undefined,
        manufacturer: req.query.manufacturer as string,
        priceMin: req.query.priceMin ? parseFloat(req.query.priceMin as string) : undefined,
        priceMax: req.query.priceMax ? parseFloat(req.query.priceMax as string) : undefined,
        createdAfter: req.query.createdAfter ? new Date(req.query.createdAfter as string) : undefined,
        createdBefore: req.query.createdBefore ? new Date(req.query.createdBefore as string) : undefined,
        updatedAfter: req.query.updatedAfter ? new Date(req.query.updatedAfter as string) : undefined,
        updatedBefore: req.query.updatedBefore ? new Date(req.query.updatedBefore as string) : undefined,
        sortBy: req.query.sortBy as string || 'updatedAt',
        sortOrder: req.query.sortOrder as 'asc' | 'desc' || 'desc',
        limit: Math.min(parseInt(req.query.limit as string) || 50, 5000), // Cap at 5000 for V3
        offset: Math.max(parseInt(req.query.offset as string) || 0, 0), // Ensure non-negative
      };
      const result = await storage.getProducts(filters);
      
      // Debug logging
      console.log(`[DEBUG] Products API - Requested limit: ${filters.limit}`);
      console.log(`[DEBUG] Products API - Returned products count: ${result.products.length}`);
      console.log(`[DEBUG] Products API - Total in DB: ${result.total}`);
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  // ===========================================================================
  // Marcas próprias — definem o que é concorrente
  // ===========================================================================

  app.get("/api/own-brands", authenticate, async (req, res) => {
    try {
      const includeInactive = req.query.includeInactive === "true";
      res.json(await storage.getOwnBrands(includeInactive));
    } catch (error) {
      console.error("Error fetching own brands:", error);
      res.status(500).json({ message: "Failed to fetch own brands" });
    }
  });

  // Criar marca própria reclassifica o catálogo: produtos dessa marca deixam
  // de ser concorrentes na mesma hora, sem passo manual.
  app.post("/api/own-brands", authenticate, async (req, res) => {
    try {
      const body = z.object({
        name: z.string().min(1),
        active: z.boolean().optional(),
      }).parse(req.body ?? {});

      const brand = await storage.createOwnBrand(body);
      const recompute = await storage.recomputeCompetitorFlags();
      res.status(201).json({ brand, recompute });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Nome da marca é obrigatório" });
      }
      console.error("Error creating own brand:", error);
      res.status(500).json({ message: "Failed to create own brand" });
    }
  });

  app.patch("/api/own-brands/:id", authenticate, async (req, res) => {
    try {
      let id: number;
      try {
        id = validateId(req.params.id, "ID da marca");
      } catch {
        return res.status(400).json({ message: "ID inválido" });
      }

      const body = z.object({
        name: z.string().min(1).optional(),
        active: z.boolean().optional(),
      }).parse(req.body ?? {});

      const brand = await storage.updateOwnBrand(id, body);
      if (!brand) return res.status(404).json({ message: "Marca não encontrada" });

      const recompute = await storage.recomputeCompetitorFlags();
      res.json({ brand, recompute });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Parâmetros inválidos" });
      }
      console.error("Error updating own brand:", error);
      res.status(500).json({ message: "Failed to update own brand" });
    }
  });

  app.delete("/api/own-brands/:id", authenticate, async (req, res) => {
    try {
      let id: number;
      try {
        id = validateId(req.params.id, "ID da marca");
      } catch {
        return res.status(400).json({ message: "ID inválido" });
      }

      await storage.deleteOwnBrand(id);
      // Remover marca própria devolve os produtos dela para concorrentes.
      const recompute = await storage.recomputeCompetitorFlags();
      res.json({ deleted: true, recompute });
    } catch (error) {
      console.error("Error deleting own brand:", error);
      res.status(500).json({ message: "Failed to delete own brand" });
    }
  });

  // Conserto manual, para o caso de algum caminho de escrita ter deixado a
  // flag desatualizada. Idempotente.
  app.post("/api/own-brands/recompute", authenticate, async (_req, res) => {
    try {
      res.json(await storage.recomputeCompetitorFlags());
    } catch (error) {
      console.error("Error recomputing competitor flags:", error);
      res.status(500).json({ message: "Failed to recompute competitor flags" });
    }
  });

  // Marcas distintas cadastradas, para popular o filtro "Marca" da tela de produtos.
  app.get("/api/products/manufacturers", authenticate, async (_req, res) => {
    try {
      const manufacturers = await storage.getDistinctManufacturers();
      res.json(manufacturers);
    } catch (error) {
      console.error("Error fetching manufacturers:", error);
      res.status(500).json({ message: "Failed to fetch manufacturers" });
    }
  });

  // Bulk operations for products
  app.post("/api/products/bulk", isAuthenticated, async (req, res) => {
    try {
      const { products: productsList } = req.body;
      if (!Array.isArray(productsList)) {
        return res.status(400).json({ message: "Products must be an array" });
      }
      
      const createdProducts = [];
      for (const productData of productsList) {
        const validatedData = insertProductSchema.parse(productData);
        const product = await storage.createProduct(validatedData);
        createdProducts.push(product);
      }
      
      res.status(201).json({ 
        message: `${createdProducts.length} products created successfully`,
        products: createdProducts 
      });
    } catch (error) {
      console.error("Error creating bulk products:", error);
      res.status(400).json({ message: "Failed to create bulk products" });
    }
  });

  app.delete("/api/products/bulk", authenticate, async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids)) {
        return res.status(400).json({ message: "IDs must be an array" });
      }
      
      for (const id of ids) {
        await storage.deleteProduct(parseInt(id));
      }
      
      res.json({ message: `${ids.length} products deleted successfully` });
    } catch (error) {
      console.error("Error deleting bulk products:", error);
      res.status(400).json({ message: "Failed to delete bulk products" });
    }
  });

  // Scrape preview endpoint (for wizard)
  app.post("/api/products/scrape-preview", authenticate, async (req, res) => {
    try {
      const { url } = req.body;
      
      if (!url) {
        return res.status(400).json({ message: "URL is required" });
      }

      const scrapedData = await scrapeProductData(url);
      res.json(scrapedData);
    } catch (error) {
      console.error("Error scraping product preview:", error);
      res.status(500).json({ message: "Failed to scrape product data" });
    }
  });

  // Create product from preview (for wizard)
  app.post("/api/products/from-preview", authenticate, async (req, res) => {
    try {
      const productData = req.body;
      const product = await storage.createProductFromPreview(productData, productData.isMaster || false, productData.masterProductId);
      res.json(product);
    } catch (error) {
      console.error("Error creating product from preview:", error);
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  // Products export endpoint - must come before :id route
  app.get("/api/products/export", authenticate, async (req, res) => {
    try {
      const filters: any = {
        limit: 10000,
        offset: 0,
      };

      // Only add filters if they have valid values
      if (req.query.search && req.query.search !== '') {
        filters.search = req.query.search as string;
      }
      if (req.query.sku && req.query.sku !== '') {
        filters.sku = req.query.sku as string;
      }
      if (req.query.categoryId && req.query.categoryId !== '' && !isNaN(parseInt(req.query.categoryId as string))) {
        filters.categoryId = parseInt(req.query.categoryId as string);
      }
      if (req.query.clientId && req.query.clientId !== '' && !isNaN(parseInt(req.query.clientId as string))) {
        filters.clientId = parseInt(req.query.clientId as string);
      }
      if (req.query.status && req.query.status !== '') {
        filters.status = req.query.status as string;
      }
      if (req.query.sourceType && req.query.sourceType !== '') {
        filters.sourceType = req.query.sourceType as string;
      }
      if (req.query.manufacturer && req.query.manufacturer !== '') {
        filters.manufacturer = req.query.manufacturer as string;
      }
      if (req.query.isCompetitor === 'true') {
        filters.isCompetitor = true;
      } else if (req.query.isCompetitor === 'false') {
        filters.isCompetitor = false;
      }
      if (req.query.isMaster === 'true') {
        filters.isMaster = true;
      } else if (req.query.isMaster === 'false') {
        filters.isMaster = false;
      }
      if (req.query.priceMin && !isNaN(parseFloat(req.query.priceMin as string))) {
        filters.priceMin = parseFloat(req.query.priceMin as string);
      }
      if (req.query.priceMax && !isNaN(parseFloat(req.query.priceMax as string))) {
        filters.priceMax = parseFloat(req.query.priceMax as string);
      }

      console.log('Export filters:', filters);
      const result = await storage.getProducts(filters);
      const products = result.products;

      // Get category and client names for better readability
      const categories = await storage.getCategories();
      const clients = await storage.getClients();

      // Transform products data for Excel export
      const exportData = products.map(product => ({
        id: product.id,
        sku: product.sku,
        nome: product.name,
        descricao: product.description || '',
        fabricante: product.manufacturer || '',
        categoria: categories.find(c => c.id === product.categoryId)?.name || '',
        categoria_id: product.categoryId || '',
        cliente: clients.find(c => c.id === product.clientId)?.name || '',
        cliente_id: product.clientId || '',
        preco: product.basePrice || '0',
        imagem_url: product.imageUrl || '',
        link_origem: product.sourceUrl || '',
        grupo_match: product.matchGroup || '',
        status: product.status,
        is_master: product.isMaster ? 'sim' : 'não',
        is_competitor: product.isCompetitor ? 'sim' : 'não',
        master_product_id: product.masterProductId || '',
        criado_em: product.createdAt ? new Date(product.createdAt).toLocaleDateString('pt-BR') : '',
        atualizado_em: product.updatedAt ? new Date(product.updatedAt).toLocaleDateString('pt-BR') : ''
      }));

      // Create Excel workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // Set column widths
      ws['!cols'] = [
        { wch: 8 },   // id
        { wch: 15 },  // sku
        { wch: 30 },  // nome
        { wch: 40 },  // descricao
        { wch: 15 },  // fabricante
        { wch: 15 },  // categoria
        { wch: 12 },  // categoria_id
        { wch: 15 },  // cliente
        { wch: 10 },  // cliente_id
        { wch: 10 },  // preco
        { wch: 50 },  // imagem_url
        { wch: 50 },  // link_origem
        { wch: 10 },  // status
        { wch: 10 },  // is_master
        { wch: 12 },  // is_competitor
        { wch: 15 },  // master_product_id
        { wch: 12 },  // criado_em
        { wch: 12 }   // atualizado_em
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Produtos");
      
      // Generate buffer
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      // Set headers for file download
      const filename = `produtos_${new Date().toISOString().split('T')[0]}.xlsx`;
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Length', buffer.length);
      
      res.send(buffer);
    } catch (error) {
      console.error("Error exporting products:", error);
      res.status(500).json({ message: "Failed to export products", error: error.message });
    }
  });

  app.get("/api/products/:id", authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }
      const product = await storage.getProduct(id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  app.post("/api/products", authenticate, async (req, res) => {
    try {
      const productData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(productData);
      res.status(201).json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(400).json({ message: "Failed to create product" });
    }
  });

  app.put("/api/products/:id", authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ message: "Invalid product ID format" });
      }

      // Check if product exists
      const existingProduct = await storage.getProduct(id);
      if (!existingProduct) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Create a more flexible update schema that allows empty basePrice
      const updateSchema = insertProductSchema.partial().extend({
        basePrice: z.string().optional() // Allow empty or undefined basePrice for updates
      });
      
      const productData = updateSchema.parse(req.body);
      console.log(`Updating product ${id} with data:`, productData);
      
      // Check if URL changed and should trigger price update
      const urlChanged = productData.sourceUrl && productData.sourceUrl !== existingProduct.sourceUrl;
      
      // Also check if there's a sourceUrl and user wants to force update
      const shouldUpdatePrice = urlChanged || (productData.sourceUrl && req.body.forceUpdatePrice);
      
      const product = await storage.updateProduct(id, productData);
      
      // If URL changed or force update requested, automatically update price
      if (shouldUpdatePrice && productData.sourceUrl) {
        try {
          const reason = urlChanged ? 'url_changed' : 'manual_update';
          console.log(`${reason === 'url_changed' ? 'URL changed' : 'Manual update requested'} for product ${id}, scheduling price update from: ${productData.sourceUrl}`);
          
          // Add job to scraping queue for immediate price update
          const { addScrapingJob } = await import('./scraping-queue');
          await addScrapingJob({
            url: productData.sourceUrl,
            productId: id,
            priority: 'high',
            maxAttempts: 3,
            scheduledAt: new Date(),
            type: 'price_update',
            metadata: {
              reason,
              oldUrl: existingProduct.sourceUrl,
              newUrl: productData.sourceUrl
            }
          });
          
          console.log(`Price update job queued for product ${id}`);
        } catch (error) {
          console.warn(`Failed to queue price update for product ${id}:`, error);
          // Don't fail the product update if scraping job fails
        }
      }
      
      console.log(`Product ${id} updated successfully:`, product);
      
      // Return additional info if price update was scheduled
      const responseData = {
        ...product,
        priceUpdateScheduled: shouldUpdatePrice
      };
      
      res.json(responseData);
    } catch (error) {
      console.error("Error updating product:", error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Failed to update product" });
      }
    }
  });

  app.patch("/api/products/:id", authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }

      // Check if product exists
      const existingProduct = await storage.getProduct(id);
      if (!existingProduct) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Create a more flexible update schema that allows empty basePrice
      const updateSchema = insertProductSchema.partial().extend({
        basePrice: z.string().optional() // Allow empty or undefined basePrice for updates
      });
      
      const productData = updateSchema.parse(req.body);
      console.log(`Patching product ${id} with data:`, productData);
      
      const product = await storage.updateProduct(id, productData);
      
      console.log(`Product ${id} patched successfully:`, product);
      res.json(product);
    } catch (error) {
      console.error("Error updating product:", error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Failed to update product" });
      }
    }
  });

  app.delete("/api/products/:id", authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteProduct(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(400).json({ message: "Failed to delete product" });
    }
  });

  // Prices routes
  app.get("/api/prices", isAuthenticated, async (req, res) => {
    try {
      const filters = {
        productId: req.query.productId ? parseInt(req.query.productId as string) : undefined,
        clientId: req.query.clientId ? parseInt(req.query.clientId as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      };
      const prices = await storage.getPrices(filters);
      res.json(prices);
    } catch (error) {
      console.error("Error fetching prices:", error);
      res.status(500).json({ message: "Failed to fetch prices" });
    }
  });

  app.get("/api/products/:id/prices", isAuthenticated, async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const comparison = await storage.getProductPriceComparison(productId);
      res.json(comparison);
    } catch (error) {
      console.error("Error fetching price comparison:", error);
      res.status(500).json({ message: "Failed to fetch price comparison" });
    }
  });

  app.post("/api/prices", isAuthenticated, async (req, res) => {
    try {
      const priceData = insertPriceSchema.parse(req.body);
      const price = await storage.createPrice(priceData);
      res.status(201).json(price);
    } catch (error) {
      console.error("Error creating price:", error);
      res.status(400).json({ message: "Failed to create price" });
    }
  });

  app.put("/api/prices/bulk-update", isAuthenticated, async (req, res) => {
    try {
      const pricesData = req.body.prices;
      if (!Array.isArray(pricesData)) {
        return res.status(400).json({ message: "Prices must be an array" });
      }
      
      const validatedPrices = pricesData.map(price => insertPriceSchema.parse(price));
      await storage.bulkUpsertPrices(validatedPrices);
      res.json({ message: "Prices updated successfully", count: validatedPrices.length });
    } catch (error) {
      console.error("Error bulk updating prices:", error);
      res.status(400).json({ message: "Failed to update prices" });
    }
  });

  // Upload routes
  app.post("/api/upload/excel", authenticate, upload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      // Detect data type based on columns
      const firstRow = data[0] as any;
      const columns = Object.keys(firstRow || {});
      
      let dataType = 'unknown';
      if (columns.includes('nome') && columns.includes('sku')) {
        dataType = 'products';
      } else if (columns.includes('nome') && columns.includes('email')) {
        dataType = 'clients';
      } else if (columns.includes('nome') && columns.includes('descricao') && !columns.includes('sku')) {
        dataType = 'categories';
      } else if (columns.includes('SKU') || columns.includes('sku')) {
        dataType = 'prices';
      }

      for (const row of data) {
        try {
          if (dataType === 'products') {
            // Handle product data
            const productData = {
              sku: (row as any)['sku'] || (row as any)['SKU'],
              name: (row as any)['nome'] || (row as any)['name'],
              description: (row as any)['descricao'] || (row as any)['description'] || '',
              manufacturer: (row as any)['fabricante'] || (row as any)['manufacturer'] || '',
              categoryId: parseInt((row as any)['categoria_id'] || (row as any)['category_id']) || null,
              clientId: parseInt((row as any)['cliente_id'] || (row as any)['client_id']) || null,
              basePrice: (row as any)['preco'] || (row as any)['price'] || '0',
              imageUrl: (row as any)['imagem_url'] || (row as any)['image_url'] || '',
              sourceUrl: (row as any)['link_origem'] || (row as any)['source_url'] || '',
              matchGroup: (row as any)['grupo_match'] || (row as any)['match_group'] || '',
              status: 'active',
              sourceType: 'client',
              // is_competitor da planilha é ignorado de propósito: a regra
              // agora vem da marca (own_brands) e é derivada em storage.
              // Aceitar o valor da planilha reintroduziria classificação
              // manual divergente da regra.
              isMaster: ((row as any)['is_master'] === 'sim' || (row as any)['is_master'] === 'true'),
              masterProductId: parseInt((row as any)['master_product_id']) || null,
            };

            if (!productData.sku || !productData.name) {
              errorCount++;
              errors.push(`Missing required fields (sku, nome) in row: ${JSON.stringify(row)}`);
              continue;
            }

            // Check if product exists by ID or SKU
            const productId = parseInt((row as any)['id']);
            let existingProduct = null;
            
            if (productId) {
              existingProduct = await storage.getProduct(productId);
            }
            
            if (!existingProduct) {
              existingProduct = await storage.getProductBySku(productData.sku);
            }

            if (existingProduct) {
              // Update existing product
              await storage.updateProduct(existingProduct.id, productData);
            } else {
              // Create new product
              await storage.createProduct(productData);
            }

            successCount++;

          } else if (dataType === 'clients') {
            // Handle client data
            const clientData = {
              name: (row as any)['nome'] || (row as any)['name'],
              email: (row as any)['email'],
              phone: (row as any)['telefone'] || (row as any)['phone'] || null,
              status: (row as any)['status'] || 'active',
            };

            if (!clientData.name || !clientData.email) {
              errorCount++;
              errors.push(`Missing required fields (nome, email) in row: ${JSON.stringify(row)}`);
              continue;
            }

            // Check if client exists by ID or name
            const clientId = parseInt((row as any)['id']);
            let existingClient = null;
            
            if (clientId) {
              existingClient = await storage.getClient(clientId);
            }

            if (!existingClient) {
              const clients = await storage.getClients();
              existingClient = clients.find(c => c.name.toLowerCase() === clientData.name.toLowerCase());
            }

            if (existingClient) {
              // Update existing client
              await storage.updateClient(existingClient.id, clientData);
            } else {
              // Create new client
              await storage.createClient(clientData);
            }

            successCount++;

          } else if (dataType === 'categories') {
            // Handle category data
            const categoryData = {
              name: (row as any)['nome'] || (row as any)['name'],
              description: (row as any)['descricao'] || (row as any)['description'] || '',
            };

            if (!categoryData.name) {
              errorCount++;
              errors.push(`Missing required field (nome) in row: ${JSON.stringify(row)}`);
              continue;
            }

            // Check if category exists by ID or name
            const categoryId = parseInt((row as any)['id']);
            let existingCategory = null;
            
            if (categoryId) {
              existingCategory = await storage.getCategory(categoryId);
            }

            if (!existingCategory) {
              const categories = await storage.getCategories();
              existingCategory = categories.find(c => c.name.toLowerCase() === categoryData.name.toLowerCase());
            }

            if (existingCategory) {
              // Update existing category
              await storage.updateCategory(existingCategory.id, categoryData);
            } else {
              // Create new category
              await storage.createCategory(categoryData);
            }

            successCount++;

          } else if (dataType === 'prices') {
            // Handle price data (original logic)
            const sku = (row as any)['SKU'] || (row as any)['Código'] || (row as any)['sku'];
            const clientName = (row as any)['Cliente'] || (row as any)['Loja'] || (row as any)['client'];
            const price = parseFloat((row as any)['Preço'] || (row as any)['Price'] || (row as any)['price']);

            if (!sku || !clientName || isNaN(price)) {
              errorCount++;
              errors.push(`Invalid data in row: ${JSON.stringify(row)}`);
              continue;
            }

            // Find product by SKU
            const product = await storage.getProductBySku(sku);
            if (!product) {
              errorCount++;
              errors.push(`Product not found for SKU: ${sku}`);
              continue;
            }

            // Find client by name
            const clients = await storage.getClients();
            const client = clients.find(c => c.name.toLowerCase() === clientName.toLowerCase());
            if (!client) {
              errorCount++;
              errors.push(`Client not found: ${clientName}`);
              continue;
            }

            // Create or update price
            await storage.bulkUpsertPrices([{
              productId: product.id,
              clientId: client.id,
              price: price.toString(),
              discount: "0",
              isAvailable: true,
            }]);

            successCount++;
          } else {
            errorCount++;
            errors.push(`Unknown data type. Unable to process row: ${JSON.stringify(row)}`);
          }

        } catch (error) {
          errorCount++;
          errors.push(`Error processing row: ${error}`);
        }
      }

      // Save upload history
      const sessionUser = req.session?.user;
      const userId = sessionUser?.id || req.user?.claims?.replit?.id || req.user?.claims?.sub || req.user?.id;
      
      const uploadHistory = await storage.createUploadHistory({
        filename: req.file.originalname,
        recordsProcessed: data.length,
        recordsSuccess: successCount,
        recordsError: errorCount,
        status: errorCount === 0 ? "completed" : "completed_with_errors",
        errorDetails: errors.length > 0 ? { errors } : null,
        userId: userId?.toString() || "unknown",
      });

      res.json({
        message: "File processed successfully",
        uploadId: uploadHistory.id,
        recordsProcessed: data.length,
        recordsSuccess: successCount,
        recordsError: errorCount,
        errors: errors.slice(0, 10), // Return first 10 errors
      });
    } catch (error) {
      console.error("Error processing Excel file:", error);
      res.status(500).json({ message: "Failed to process Excel file" });
    }
  });

  app.get("/api/upload/history", authenticate, async (req: any, res) => {
    try {
      const sessionUser = req.session?.user;
      const userId = sessionUser?.id || req.user?.claims?.replit?.id || req.user?.claims?.sub || req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }
      
      const history = await storage.getUploadHistory(userId.toString());
      res.json(history);
    } catch (error) {
      console.error("Error fetching upload history:", error);
      res.status(500).json({ message: "Failed to fetch upload history" });
    }
  });



  // Demo spreadsheet download endpoint
  app.get("/api/upload/demo-template", (req, res) => {
    try {
      // Create comprehensive instructions sheet
      const overviewInstructions = [
        { 
          Tópico: "VISÃO GERAL DO SISTEMA",
          Descrição: "Este sistema oferece duas funcionalidades principais para gestão de preços:",
          Detalhes: "1) Comparação de Preços | 2) Monitoramento de URL em Tempo Real"
        },
        { 
          Tópico: "",
          Descrição: "",
          Detalhes: ""
        },
        {
          Tópico: "1. COMPARAÇÃO DE PREÇOS",
          Descrição: "Compara preços entre produtos já cadastrados no sistema",
          Detalhes: "Para que serve: Identificar diferenças de preço entre o mesmo produto em diferentes clientes (lojas)"
        },
        {
          Tópico: "Como funciona:",
          Descrição: "• Produtos MASTER = Seus produtos (conta principal)",
          Detalhes: "• Outros produtos = Produtos de clientes/concorrentes para comparar preços"
        },
        {
          Tópico: "Match de produtos:",
          Descrição: "Produtos similares são agrupados para comparação usando:",
          Detalhes: "• GRUPO DE MATCH (recomendado): Código único para agrupar produtos similares | • Match automático: Nome, SKU, características técnicas, fabricante"
        },
        { 
          Tópico: "",
          Descrição: "",
          Detalhes: ""
        },
        {
          Tópico: "2. MONITORAMENTO URL (TEMPO REAL)",
          Descrição: "Monitora preços de concorrentes através de URLs",
          Detalhes: "Para que serve: Acompanhar preços da concorrência em tempo real via web scraping"
        },
        {
          Tópico: "Como funciona:",
          Descrição: "• Atualização automática diária às 7h da manhã",
          Detalhes: "• Sistema acessa URLs e captura preços atualizados automaticamente"
        },
        {
          Tópico: "Match de produtos:",
          Descrição: "Para comparação de preços use GRUPO DE MATCH ou master_product_id:",
          Detalhes: "• GRUPO DE MATCH: Mesmo código para produtos similares (ex: LED-10W-6500K) | • MASTER_PRODUCT_ID: Vincula concorrentes ao produto principal"
        },
        { 
          Tópico: "",
          Descrição: "",
          Detalhes: ""
        },
        {
          Tópico: "IMPORTANTE - ATUALIZAÇÃO vs CRIAÇÃO",
          Descrição: "Se informar ID existente: produto será ATUALIZADO",
          Detalhes: "Se deixar ID vazio: produto será CRIADO como novo"
        },
        {
          Tópico: "Evita duplicação:",
          Descrição: "Sempre verificar se produto já existe antes de importar",
          Detalhes: "Use a busca no sistema ou templates de produtos existentes"
        }
      ];

      // Create detailed field instructions
      const fieldInstructions = [
        { 
          Campo: "id", 
          Obrigatório: "Opcional", 
          Descrição: "ID do produto existente no sistema",
          "Como usar": "• Deixe VAZIO para criar produto novo | • Informe ID para ATUALIZAR produto existente",
          Exemplo: "24 (para atualizar) | vazio (para criar novo)"
        },
        { 
          Campo: "nome", 
          Obrigatório: "SIM", 
          Descrição: "Nome completo e descritivo do produto",
          "Como usar": "• Use nome completo com especificações técnicas | • Facilita o match automático entre produtos similares",
          Exemplo: "Refletor Led 10w 6500k IP65 Bivolt Branco Foxlux"
        },
        { 
          Campo: "sku", 
          Obrigatório: "SIM", 
          Descrição: "Código único identificador do produto",
          "Como usar": "• Deve ser único por produto | • Use código do fornecedor ou interno",
          Exemplo: "459 | LED10W-6500K | REF-FOXLUX-10W"
        },
        { 
          Campo: "categoria_id", 
          Obrigatório: "Opcional", 
          Descrição: "ID numérico da categoria (baixe template de categorias)",
          "Como usar": "• Consulte template de categorias para IDs corretos | • Deixe vazio se não souber",
          Exemplo: "5 (Iluminação) | 6 (Automação) | 7 (Segurança)"
        },
        { 
          Campo: "cliente_id", 
          Obrigatório: "Opcional", 
          Descrição: "ID numérico do cliente/loja (baixe template de clientes)",
          "Como usar": "• Use ID da conta master para seus produtos | • Use ID do cliente para produtos de terceiros",
          Exemplo: "3 (Vellore - Master) | 4 (Bartofil) | 5 (Concorrente A)"
        },
        { 
          Campo: "preco", 
          Obrigatório: "Opcional", 
          Descrição: "Preço em reais do produto",
          "Como usar": "• Use PONTO para decimais (não vírgula) | • Apenas números e ponto",
          Exemplo: "19.90 | 125.50 | 1250.00"
        },
        { 
          Campo: "descricao", 
          Obrigatório: "Opcional", 
          Descrição: "Descrição detalhada do produto",
          "Como usar": "• Inclua especificações técnicas | • Ajuda no match automático de produtos",
          Exemplo: "Refletor LED para uso externo, resistente à água IP65, bivolt automático"
        },
        { 
          Campo: "fabricante", 
          Obrigatório: "Opcional", 
          Descrição: "Marca ou fabricante do produto",
          "Como usar": "• Nome da marca exatamente como aparece no produto | • Facilita agrupamento",
          Exemplo: "FOXLUX | Samsung | Intelbras | Philips"
        },
        { 
          Campo: "imagem_url", 
          Obrigatório: "Opcional", 
          Descrição: "URL completa da imagem do produto",
          "Como usar": "• Link direto para imagem (https://...) | • Imagem será exibida no sistema",
          Exemplo: "https://loja.com/imagem-produto.jpg"
        },
        { 
          Campo: "link_origem", 
          Obrigatório: "IMPORTANTE", 
          Descrição: "URL da página do produto (essencial para monitoramento)",
          "Como usar": "• OBRIGATÓRIO para monitoramento de URL | • URL completa da página do produto",
          Exemplo: "https://loja.com/produto-abc | https://mercadolivre.com.br/item123"
        },
        { 
          Campo: "is_master", 
          Obrigatório: "Importante", 
          Descrição: "Define se é produto da conta principal (seus produtos)",
          "Como usar": "• 'sim' = Produto da sua empresa (conta master) | • 'não' = Produto de terceiros",
          Exemplo: "sim (seus produtos) | não (produtos de clientes/concorrentes)"
        },
        { 
          Campo: "is_competitor", 
          Obrigatório: "Importante", 
          Descrição: "Define se é produto de concorrente para monitoramento",
          "Como usar": "• 'sim' = Concorrente (para monitoramento URL) | • 'não' = Cliente normal",
          Exemplo: "sim (para monitorar preços) | não (apenas comparação)"
        },
        { 
          Campo: "grupo_match", 
          Obrigatório: "RECOMENDADO", 
          Descrição: "Código único para agrupar produtos similares para comparação",
          "Como usar": "• MESMO CÓDIGO para produtos similares de diferentes fornecedores | • Facilita comparação de preços automática | • Use códigos descritivos",
          Exemplo: "LED-10W-6500K | REF-FOXLUX-10W | LAMP-E27-12W | CABO-RJ45-CAT6"
        },
        { 
          Campo: "master_product_id", 
          Obrigatório: "Para concorrentes", 
          Descrição: "ID do produto master ao qual este concorrente está vinculado",
          "Como usar": "• OBRIGATÓRIO quando is_competitor = 'sim' | • ID do produto master correspondente | • Alternative ao grupo_match",
          Exemplo: "24 (vincula concorrente ao produto master ID 24)"
        }
      ];

      // Create practical examples for different scenarios
      const practicalExamples = [
        {
          Cenário: "EXEMPLO 1: PRODUTO MASTER (SEU PRODUTO)",
          id: "",
          nome: "Refletor Led 10w 6500k IP65 Bivolt Branco Foxlux",
          sku: "REF-10W-FOXLUX",
          categoria_id: "5",
          cliente_id: "3",
          preco: "19.90",
          descricao: "Refletor LED 10W para uso externo",
          fabricante: "FOXLUX",
          imagem_url: "https://suaempresa.com/images/refletor-foxlux.jpg",
          link_origem: "https://suaempresa.com/refletor-led-10w-foxlux",
          grupo_match: "REF-FOXLUX-10W",
          is_master: "sim",
          is_competitor: "não",
          master_product_id: ""
        },
        {
          Cenário: "EXEMPLO 2: CLIENTE (PARA COMPARAÇÃO)",
          id: "",
          nome: "Refletor LED 10W 6500K Bivolt IP65 FOXLUX",
          sku: "CLI-REF-10W",
          categoria_id: "5",
          cliente_id: "4",
          preco: "22.50",
          descricao: "Refletor LED FOXLUX 10W uso externo",
          fabricante: "FOXLUX",
          imagem_url: "https://clienteloja.com/refletor.jpg",
          link_origem: "https://clienteloja.com/refletor-foxlux-10w",
          grupo_match: "REF-FOXLUX-10W",
          is_master: "não",
          is_competitor: "não",
          master_product_id: ""
        },
        {
          Cenário: "EXEMPLO 3: CONCORRENTE (MONITORAMENTO)",
          id: "",
          nome: "Refletor LED 10W 6500K IP65 Bivolt Branco",
          sku: "CONC-REF-10W",
          categoria_id: "5",
          cliente_id: "5",
          preco: "18.90",
          descricao: "Refletor LED para área externa",
          fabricante: "FOXLUX",
          imagem_url: "https://concorrente.com/refletor.jpg",
          link_origem: "https://concorrente.com/refletor-led-10w-bivolt",
          grupo_match: "REF-FOXLUX-10W",
          is_master: "não",
          is_competitor: "sim",
          master_product_id: "1"
        },
        {
          Cenário: "OBSERVAÇÕES IMPORTANTES:",
          id: "• IDs serão gerados automaticamente se deixados vazios",
          nome: "• Nomes similares ajudam no match automático",
          sku: "• SKUs devem ser únicos por produto",
          categoria_id: "• Baixe template de categorias para IDs corretos",
          cliente_id: "• Baixe template de clientes para IDs corretos",
          preco: "• Use ponto para decimais (19.90 não 19,90)",
          descricao: "• Descrições detalhadas melhoram o match",
          fabricante: "• Fabricante igual facilita agrupamento",
          imagem_url: "• URLs de imagem devem ser acessíveis",
          link_origem: "• OBRIGATÓRIO para monitoramento de concorrentes",
          grupo_match: "• MESMO CÓDIGO para produtos similares para comparação automática",
          is_master: "• Marque 'sim' apenas para seus produtos",
          is_competitor: "• Marque 'sim' para monitoramento automático",
          master_product_id: "• Vincule concorrentes aos produtos master correspondentes"
        }
      ];

      // Create demo data with realistic examples
      const demoData = [
        {
          id: "",
          nome: "Refletor Led 10w 6500k IP65 Bivolt Branco Foxlux",
          sku: "REF-FOXLUX-10W",
          categoria_id: "5",
          cliente_id: "3",
          preco: 19.90,
          descricao: "Refletor Led 10w 6500k IP65 Bivolt Branco Foxlux para uso externo",
          fabricante: "FOXLUX",
          imagem_url: "https://d32ypn2ob16556.cloudfront.net/Custom/Content/Products/04/59/0459_refletor-led-10w-6500k-ip65-bivolt-branco-foxlux.webp",
          link_origem: "https://www.iluzze.com.br/refletor-led-10w-6500k-ip65-bivolt-branco-foxlux",
          grupo_match: "REF-FOXLUX-10W",
          is_master: "sim",
          is_competitor: "não",
          master_product_id: "",
        },
        {
          id: "",
          nome: "REFLETOR LED 10W 6500K IP66 LINHA 100% BIVOLT MAXXY",
          sku: "CLI-MAXXY-10W",
          categoria_id: "5",
          cliente_id: "4",
          preco: 20.61,
          descricao: "REFLETOR LED 10W 6500K IP66 LINHA 100% BIVOLT MAXXY",
          fabricante: "MAXXY",
          imagem_url: "https://images.tcdn.com.br/img/img_prod/645987/refletor_led_10w_6500k_ip66_linha_100_bivolt_maxxy.jpeg",
          link_origem: "https://www.zero41led.com.br/refletores-led/refletor-led-10w-real-100-ip66-biv-6500k-maxx",
          grupo_match: "REF-FOXLUX-10W",
          is_master: "não",
          is_competitor: "não",
          master_product_id: "",
        },
        {
          id: "",
          nome: "Refletor LED 10W 6500K IP65 Bivolt Externo",
          sku: "CONC-REF-10W",
          categoria_id: "5",
          cliente_id: "5",
          preco: 17.90,
          descricao: "Refletor LED 10W luz branca para área externa",
          fabricante: "FOXLUX",
          imagem_url: "https://concorrente.com.br/images/refletor-led-10w.jpg",
          link_origem: "https://concorrenteloja.com.br/refletor-led-10w-foxlux-bivolt",
          grupo_match: "REF-FOXLUX-10W",
          is_master: "não",
          is_competitor: "sim",
          master_product_id: "1",
        }
      ];

      // Create workbook with multiple sheets
      const wb = XLSX.utils.book_new();
      
      // Sheet 1: Overview and general instructions
      const wsOverview = XLSX.utils.json_to_sheet(overviewInstructions);
      wsOverview['!cols'] = [
        { wch: 25 },  // Tópico
        { wch: 50 },  // Descrição
        { wch: 80 }   // Detalhes
      ];
      XLSX.utils.book_append_sheet(wb, wsOverview, "1-Visão Geral");
      
      // Sheet 2: Detailed field instructions
      const wsFields = XLSX.utils.json_to_sheet(fieldInstructions);
      wsFields['!cols'] = [
        { wch: 20 },  // Campo
        { wch: 12 },  // Obrigatório
        { wch: 35 },  // Descrição
        { wch: 60 },  // Como usar
        { wch: 45 }   // Exemplo
      ];
      XLSX.utils.book_append_sheet(wb, wsFields, "2-Campos Detalhados");
      
      // Sheet 3: Practical examples
      const wsExamples = XLSX.utils.json_to_sheet(practicalExamples);
      wsExamples['!cols'] = [
        { wch: 30 },  // Cenário
        { wch: 8 },   // id
        { wch: 35 },  // nome
        { wch: 15 },  // sku
        { wch: 12 },  // categoria_id
        { wch: 10 },  // cliente_id
        { wch: 8 },   // preco
        { wch: 30 },  // descricao
        { wch: 12 },  // fabricante
        { wch: 30 },  // imagem_url
        { wch: 30 },  // link_origem
        { wch: 18 },  // grupo_match
        { wch: 10 },  // is_master
        { wch: 12 },  // is_competitor
        { wch: 15 }   // master_product_id
      ];
      XLSX.utils.book_append_sheet(wb, wsExamples, "3-Exemplos Práticos");
      
      // Sheet 4: Demo data ready to use
      const wsDemoData = XLSX.utils.json_to_sheet(demoData);
      wsDemoData['!cols'] = [
        { wch: 8 },   // id
        { wch: 35 },  // nome
        { wch: 15 },  // sku
        { wch: 12 },  // categoria_id
        { wch: 10 },  // cliente_id
        { wch: 8 },   // preco
        { wch: 40 },  // descricao
        { wch: 12 },  // fabricante
        { wch: 50 },  // imagem_url
        { wch: 50 },  // link_origem
        { wch: 18 },  // grupo_match
        { wch: 10 },  // is_master
        { wch: 12 },  // is_competitor
        { wch: 15 }   // master_product_id
      ];
      XLSX.utils.book_append_sheet(wb, wsDemoData, "4-Dados Exemplo");
      
      // Generate buffer
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      // Set headers for file download
      res.setHeader('Content-Disposition', 'attachment; filename=template-produtos-com-instrucoes-completas.xlsx');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Length', buffer.length);
      
      res.send(buffer);
    } catch (error) {
      console.error("Error generating demo template:", error);
      res.status(500).json({ message: "Failed to generate demo template" });
    }
  });

  // API Keys routes
  app.get("/api/api-keys", isAuthenticated, async (req: any, res) => {
    try {
      // Get user ID from session or user object
      const sessionUser = req.session?.user;
      const userId = sessionUser?.id || req.user?.claims?.replit?.id || req.user?.claims?.sub || req.user?.id;
      
      if (!userId) {
        console.log("Debug - Session user:", sessionUser);
        console.log("Debug - req.user:", req.user);
        return res.status(401).json({ message: "User ID not found" });
      }
      
      const apiKeys = await storage.getApiKeys(userId.toString());
      res.json(apiKeys);
    } catch (error) {
      console.error("Error fetching API keys:", error);
      res.status(500).json({ message: "Failed to fetch API keys" });
    }
  });

  app.post("/api/api-keys", isAuthenticated, async (req: any, res) => {
    try {
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ message: "Name is required" });
      }

      const key = `pk_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
      const keyHash = crypto.createHash('sha256').update(key).digest('hex');

      // Get user ID from session or user object
      const sessionUser = req.session?.user;
      const userId = sessionUser?.id || req.user?.claims?.replit?.id || req.user?.claims?.sub || req.user?.id;
      
      if (!userId) {
        console.log("Debug - Session user:", sessionUser);
        console.log("Debug - req.user:", req.user);
        return res.status(401).json({ message: "User ID not found" });
      }

      const apiKey = await storage.createApiKey({
        name,
        keyHash: keyHash,
        userId: userId.toString(),
        isActive: true,
      });

      res.status(201).json({ ...apiKey, key }); // Return the actual key only once
    } catch (error) {
      console.error("Error creating API key:", error);
      res.status(400).json({ message: "Failed to create API key" });
    }
  });

  app.delete("/api/api-keys/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteApiKey(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting API key:", error);
      res.status(400).json({ message: "Failed to delete API key" });
    }
  });

  // AI Pricing Analysis
  app.post("/api/ai/pricing-analysis", isAuthenticated, async (req, res) => {
    try {
      const { priceData, customPrompt } = req.body;
      
      if (!Array.isArray(priceData) || priceData.length === 0) {
        return res.status(400).json({ error: "No price data provided" });
      }

      const analysis = await generatePricingStrategy(priceData, customPrompt);
      res.json(analysis);
    } catch (error) {
      console.error("AI analysis error:", error);
      res.status(500).json({ error: "Failed to generate AI analysis" });
    }
  });

  // Analytics Benchmark
  app.get("/api/analytics/benchmark", isAuthenticated, async (req, res) => {
    try {
      const bestPrices = await storage.getBestPrices();
      const benchmarkData = await generateBenchmarkAnalysis(bestPrices);
      res.json(benchmarkData);
    } catch (error) {
      console.error("Benchmark analysis error:", error);
      res.status(500).json({ error: "Failed to generate benchmark analysis" });
    }
  });

  // Users routes
  app.get("/api/users", isAuthenticated, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/users", isAuthenticated, async (req, res) => {
    try {
      const { password, ...userData } = req.body;
      const user = await storage.createUser({ ...userData, password });
      res.status(201).json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(400).json({ message: "Failed to create user" });
    }
  });

  app.put("/api/users/:id", isAuthenticated, async (req, res) => {
    try {
      const id = req.params.id;
      const { password, ...userData } = req.body;
      const user = await storage.updateUser(id, { ...userData, password });
      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(400).json({ message: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", isAuthenticated, async (req, res) => {
    try {
      const id = req.params.id;
      await storage.deleteUser(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(400).json({ message: "Failed to delete user" });
    }
  });

  // Data cleanup admin routes
  app.get("/api/admin/cleanup-stats", isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getCleanupStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching cleanup stats:", error);
      res.status(500).json({ message: "Failed to fetch cleanup stats" });
    }
  });

  app.get("/api/admin/duplicate-products", isAuthenticated, async (req, res) => {
    try {
      const duplicates = await storage.getDuplicateProducts();
      res.json(duplicates);
    } catch (error) {
      console.error("Error fetching duplicate products:", error);
      res.status(500).json({ message: "Failed to fetch duplicate products" });
    }
  });

  app.get("/api/admin/orphaned-prices", isAuthenticated, async (req, res) => {
    try {
      const orphaned = await storage.getOrphanedPrices();
      res.json(orphaned);
    } catch (error) {
      console.error("Error fetching orphaned prices:", error);
      res.status(500).json({ message: "Failed to fetch orphaned prices" });
    }
  });

  app.post("/api/admin/cleanup/:type", isAuthenticated, async (req, res) => {
    try {
      const { type } = req.params;
      const result = await storage.performCleanup(type);
      res.json(result);
    } catch (error) {
      console.error(`Error performing cleanup ${req.params.type}:`, error);
      res.status(500).json({ message: "Failed to perform cleanup" });
    }
  });

  app.delete("/api/admin/remove/:type/:id", isAuthenticated, async (req, res) => {
    try {
      const { type, id } = req.params;
      const itemId = parseInt(id);
      
      if (type === "product") {
        await storage.deleteProduct(itemId);
      } else if (type === "price") {
        await storage.deletePrice(itemId);
      }
      
      res.status(204).send();
    } catch (error) {
      console.error(`Error removing ${req.params.type}:`, error);
      res.status(500).json({ message: "Failed to remove item" });
    }
  });

  // Reports API routes
  app.get("/api/reports/price-comparison", isAuthenticated, async (req, res) => {
    try {
      const report = await storage.generatePriceComparisonReport();
      res.json(report);
    } catch (error) {
      console.error("Error generating price comparison report:", error);
      res.status(500).json({ message: "Failed to generate price comparison report" });
    }
  });

  app.get("/api/reports/savings-analysis", isAuthenticated, async (req, res) => {
    try {
      const report = await storage.generateSavingsAnalysisReport();
      res.json(report);
    } catch (error) {
      console.error("Error generating savings analysis report:", error);
      res.status(500).json({ message: "Failed to generate savings analysis report" });
    }
  });

  app.get("/api/reports/client-performance", isAuthenticated, async (req, res) => {
    try {
      const report = await storage.generateClientPerformanceReport();
      res.json(report);
    } catch (error) {
      console.error("Error generating client performance report:", error);
      res.status(500).json({ message: "Failed to generate client performance report" });
    }
  });

  app.get("/api/reports/product-trends", isAuthenticated, async (req, res) => {
    try {
      const report = await storage.generateProductTrendsReport();
      res.json(report);
    } catch (error) {
      console.error("Error generating product trends report:", error);
      res.status(500).json({ message: "Failed to generate product trends report" });
    }
  });

  app.get("/api/reports/category-analysis", isAuthenticated, async (req, res) => {
    try {
      const report = await storage.generateCategoryAnalysisReport();
      res.json(report);
    } catch (error) {
      console.error("Error generating category analysis report:", error);
      res.status(500).json({ message: "Failed to generate category analysis report" });
    }
  });

  app.get("/api/reports/monthly-summary", isAuthenticated, async (req, res) => {
    try {
      const report = await storage.generateMonthlySummaryReport();
      res.json(report);
    } catch (error) {
      console.error("Error generating monthly summary report:", error);
      res.status(500).json({ message: "Failed to generate monthly summary report" });
    }
  });

  // Generate and download report in specific format
  app.post("/api/reports/generate", isAuthenticated, async (req, res) => {
    try {
      // Validate request body with Zod
      const generateReportSchema = z.object({
        reportType: z.enum(['price-comparison', 'savings-analysis', 'client-performance', 'product-trends', 'category-analysis', 'monthly-summary']),
        format: z.enum(['json', 'excel']).default('json'),
        filters: z.object({}).optional().default({})
      });

      const validatedData = generateReportSchema.parse(req.body);
      const { reportType, format, filters } = validatedData;

      let reportData;
      switch (reportType) {
        case 'price-comparison':
          reportData = await storage.generatePriceComparisonReport(filters);
          break;
        case 'savings-analysis':
          reportData = await storage.generateSavingsAnalysisReport(filters);
          break;
        case 'client-performance':
          reportData = await storage.generateClientPerformanceReport(filters);
          break;
        case 'product-trends':
          reportData = await storage.generateProductTrendsReport(filters);
          break;
        case 'category-analysis':
          reportData = await storage.generateCategoryAnalysisReport(filters);
          break;
        case 'monthly-summary':
          reportData = await storage.generateMonthlySummaryReport(filters);
          break;
        default:
          return res.status(400).json({ message: "Invalid report type" });
      }

      // Get report title
      const reportTitles = {
        'price-comparison': 'Relatório de Comparação de Preços',
        'savings-analysis': 'Análise de Economia',
        'client-performance': 'Performance por Cliente', 
        'product-trends': 'Tendências de Produtos',
        'category-analysis': 'Análise por Categoria',
        'monthly-summary': 'Resumo Mensal'
      };

      // Generate unique filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = format === 'excel' 
        ? `${reportType}-${timestamp}.xlsx` 
        : `${reportType}-${timestamp}.json`;
      
      // Ensure reports directory exists
      const reportsDir = path.join(process.cwd(), 'reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }
      
      const filePath = path.join(reportsDir, filename);

      // Save to history
      await storage.createReportHistory({
        reportType,
        reportTitle: reportTitles[reportType as keyof typeof reportTitles],
        generatedBy: (req.session as any).user?.id || 'unknown',
        parameters: filters,
        recordCount: Array.isArray(reportData.data) ? reportData.data.length : 0,
        fileFormat: format,
        filePath: filename // Store relative filename for database
      });

      if (format === 'excel') {
        // Generate Excel file
        const workbook = XLSX.utils.book_new();
        
        // Ensure data is in array format for Excel
        let excelData = [];
        if (Array.isArray(reportData.data)) {
          excelData = reportData.data;
        } else if (reportData.data && typeof reportData.data === 'object') {
          // Convert object to array format
          excelData = [reportData.data];
        } else {
          excelData = [];
        }

        // Special handling for price-comparison report to flatten nested competitor data
        if (reportType === 'price-comparison' && Array.isArray(excelData)) {
          const flattenedData = [];
          
          for (const product of excelData) {
            if (product.competitorPrices && Array.isArray(product.competitorPrices)) {
              // Create a row for each competitor comparison
              for (const competitor of product.competitorPrices) {
                flattenedData.push({
                  'Produto ID': product.productId,
                  'Nome do Produto': product.productName,
                  'SKU': product.sku,
                  'Preço Master': product.masterPrice,
                  'Concorrente': competitor.clientName,
                  'Preço Concorrente': competitor.price,
                  'Economia': competitor.savings,
                  'Economia (%)': competitor.savingsPercentage,
                  'Diferença de Preço': product.masterPrice - competitor.price
                });
              }
            } else {
              // If no competitors, still show the master product
              flattenedData.push({
                'Produto ID': product.productId,
                'Nome do Produto': product.productName,
                'SKU': product.sku,
                'Preço Master': product.masterPrice,
                'Concorrente': 'Sem concorrentes',
                'Preço Concorrente': '-',
                'Economia': 0,
                'Economia (%)': 0,
                'Diferença de Preço': 0
              });
            }
          }
          excelData = flattenedData;
        }
        
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
        
        const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        
        // Save file to disk
        fs.writeFileSync(filePath, excelBuffer);
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        return res.send(excelBuffer);
      } else {
        // Save JSON file to disk
        fs.writeFileSync(filePath, JSON.stringify(reportData, null, 2), 'utf8');
        
        // For JSON, set proper headers for download
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      }
      
      // Default JSON response
      res.json(reportData);
    } catch (error) {
      console.error("Error generating report:", error);
      res.status(500).json({ message: "Failed to generate report" });
    }
  });

  // Get reports history
  app.get("/api/reports/history", isAuthenticated, async (req, res) => {
    try {
      const history = await storage.getReportsHistory();
      res.json(history);
    } catch (error) {
      console.error("Error fetching reports history:", error);
      res.status(500).json({ message: "Failed to fetch reports history" });
    }
  });

  // Download existing report by ID
  app.get("/api/reports/download/:id", isAuthenticated, async (req, res) => {
    try {
      // Validate ID parameter
      const reportIdStr = req.params.id;
      const reportId = parseInt(reportIdStr);
      if (isNaN(reportId) || reportId <= 0) {
        return res.status(400).json({ message: "Invalid report ID" });
      }
      
      // Get report history record
      const reportHistory = await storage.getReportHistoryById(reportId);
      if (!reportHistory) {
        return res.status(404).json({ message: "Report not found" });
      }

      // Security check: Verify ownership or admin role
      const currentUser = req.session?.user || req.user;
      const currentUserId = currentUser?.id || currentUser?.claims?.sub;
      
      if (!currentUserId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Allow access if:
      // 1. User generated the report themselves
      // 2. User is an administrator
      const isOwner = reportHistory.generatedBy === currentUserId;
      const isAdmin = currentUser?.role === 'administrador' || currentUser?.claims?.role === 'administrador';
      
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ message: "Access denied: You can only download your own reports" });
      }

      // Security: Sanitize file path to prevent path traversal attacks
      const sanitizedFileName = path.basename(reportHistory.filePath);
      const reportsDir = path.join(process.cwd(), 'reports');
      const filePath = path.join(reportsDir, sanitizedFileName);
      
      // Additional security: Ensure the resolved path is within the reports directory
      const resolvedPath = path.resolve(filePath);
      const resolvedReportsDir = path.resolve(reportsDir);
      
      if (!resolvedPath.startsWith(resolvedReportsDir)) {
        console.warn(`Path traversal attempt blocked: ${reportHistory.filePath}`);
        return res.status(400).json({ message: "Invalid file path" });
      }
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "Report file not found" });
      }

      // Set appropriate headers based on file format
      if (reportHistory.fileFormat === 'excel') {
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      } else {
        res.setHeader('Content-Type', 'application/json');
      }
      
      res.setHeader('Content-Disposition', `attachment; filename="${sanitizedFileName}"`);
      
      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      
    } catch (error) {
      console.error("Error downloading report:", error);
      
      // Return appropriate error status
      if (error instanceof Error && error.message.includes('Invalid')) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Failed to download report" });
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
