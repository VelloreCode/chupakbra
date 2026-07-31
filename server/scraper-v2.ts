import axios from 'axios';
import * as cheerio from 'cheerio';
// Playwright temporarily disabled for stability
// Note: Redis not available in this environment, using in-memory cache

export interface ScrapedProductData {
  nome_produto?: string;
  marca?: string;
  valor_principal?: number;
  sku?: string;
  link_imagem?: string;
  description?: string;
  success: boolean;
  method: 'cheerio' | 'playwright' | 'cache';
  timestamp: Date;
  error?: string;
}

export interface ScrapingConfig {
  timeout: number;
  retries: number;
  cacheExpiry: number;
  userAgent: string;
  useCache: boolean;
  usePlaywright: boolean;
}

export class HybridScraper {
  private cache: Map<string, { data: ScrapedProductData; timestamp: number }> = new Map();
  private config: ScrapingConfig;
  private cacheCleanupInterval?: NodeJS.Timeout;

  constructor(config: Partial<ScrapingConfig> = {}) {
    this.config = {
      timeout: 30000,
      retries: 3,
      cacheExpiry: 3600, // 1 hour
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      useCache: true,
      usePlaywright: false, // Temporarily disabled for stability
      ...config
    };
  }

  async initialize() {
    // Initialize in-memory cache
    if (this.config.useCache) {
      console.log('Using in-memory cache for scraping results');
      
      // Clean up expired cache entries every hour
      this.cacheCleanupInterval = setInterval(() => {
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
          if (now - value.timestamp > this.config.cacheExpiry * 1000) {
            this.cache.delete(key);
          }
        }
        console.log(`Cache cleanup: ${this.cache.size} entries remaining`);
      }, 3600000); // 1 hour
    }

    // Playwright temporarily disabled for stability
    this.config.usePlaywright = false;
    console.log('Using optimized Cheerio-only scraping for better stability');
  }

  async scrapeProductData(url: string): Promise<ScrapedProductData> {
    const startTime = Date.now();
    console.log(`Starting hybrid scraping for: ${url}`);

    // Check cache first
    if (this.config.useCache) {
      const cached = await this.getCachedData(url);
      if (cached) {
        console.log(`Cache hit for ${url} (${Date.now() - startTime}ms)`);
        return cached;
      }
    }

    let lastError: Error | null = null;

    // Enhanced Cheerio scraping with multiple attempts
    for (let attempt = 1; attempt <= this.config.retries; attempt++) {
      try {
        console.log(`Attempting Cheerio scraping (attempt ${attempt}/${this.config.retries})...`);
        const result = await this.scrapeWithCheerio(url);
        
        if (this.isValidResult(result)) {
          result.method = 'cheerio';
          result.success = true;
          result.timestamp = new Date();
          
          // Cache the result
          await this.setCachedData(url, result);
          
          console.log(`Cheerio success for ${url} (${Date.now() - startTime}ms)`);
          return result;
        }
      } catch (error) {
        lastError = error as Error;
        console.log(`Cheerio attempt ${attempt} failed:`, error);
        
        if (attempt < this.config.retries) {
          await this.sleep(1000 * attempt); // Progressive backoff
        }
      }
    }

    // All attempts failed
    console.error(`All scraping attempts failed for ${url}`);
    return {
      success: false,
      method: 'cheerio',
      timestamp: new Date(),
      error: lastError?.message || 'Unknown error'
    };
  }

  private async scrapeWithCheerio(url: string): Promise<Partial<ScrapedProductData>> {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': this.config.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.8,en;q=0.5,en-US;q=0.3',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Referer': 'https://www.google.com/',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'cross-site'
      },
      timeout: this.config.timeout,
      maxRedirects: 5,
      validateStatus: (status) => status < 500 // Accept redirects and client errors
    });

    const $ = cheerio.load(response.data);
    return this.extractProductData($, url);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private extractProductData($: cheerio.CheerioAPI, url: string): Partial<ScrapedProductData> {
    const data: Partial<ScrapedProductData> = {};

    // Extract structured data (JSON-LD, Schema.org)
    $('script[type="application/ld+json"]').each((_, element) => {
      try {
        const jsonData = JSON.parse($(element).text());
        
        if (jsonData['@type'] === 'Product' || (Array.isArray(jsonData) && jsonData.some(item => item['@type'] === 'Product'))) {
          const product = Array.isArray(jsonData) ? jsonData.find(item => item['@type'] === 'Product') : jsonData;
          
          if (product.name && !data.nome_produto) {
            data.nome_produto = product.name;
          }
          
          if (product.brand?.name && !data.marca) {
            data.marca = product.brand.name;
          }
          
          if (product.offers?.price && !data.valor_principal) {
            data.valor_principal = parseFloat(product.offers.price);
          } else if (product.offers?.lowPrice && !data.valor_principal) {
            data.valor_principal = parseFloat(product.offers.lowPrice);
          }
          
          if (product.sku && !data.sku) {
            data.sku = product.sku;
          }
          
          if (product.image && !data.link_imagem) {
            data.link_imagem = Array.isArray(product.image) ? product.image[0] : product.image;
          }
          
          if (product.description && !data.description) {
            data.description = product.description;
          }
        }
      } catch (e) {
        console.log('Error parsing JSON-LD:', e);
      }
    });

    // Extract Open Graph data
    if (!data.nome_produto) {
      const ogTitle = $('meta[property="og:title"]').attr('content') || 
                      $('meta[name="twitter:title"]').attr('content');
      if (ogTitle && !ogTitle.toLowerCase().includes('oficial webshop')) {
        data.nome_produto = ogTitle;
      }
    }
    
    if (!data.link_imagem) {
      data.link_imagem = $('meta[property="og:image"]').attr('content') || 
                         $('meta[name="twitter:image"]').attr('content');
    }

    // Enhanced HTML parsing with more selectors
    if (!data.nome_produto) {
      let titleSelectors = [];
      
      // Amazon-specific selectors first
      if (url.includes('amazon.com')) {
        titleSelectors = [
          '#productTitle',
          '#title .a-size-large',
          '#title span',
          '#productTitle span',
          '[data-automation-id="product-title"]',
          'h1#title',
          'h1 span[id="productTitle"]'
        ];
      }
      
      // General selectors for other sites
      titleSelectors = titleSelectors.concat([
        'h1.js-product-name',
        'h1[class*="product-name"]',
        'h1.product-name',
        '.js-product-name',
        'h1[class*="title"]',
        'h1[class*="name"]',
        'h1[class*="product"]',
        '.product-title',
        '.product-name',
        '[data-testid*="title"]',
        '[data-testid*="name"]',
        '[data-testid*="product"]',
        '.item-title',
        '.listing-title',
        'h1'
      ]);
      
      for (const selector of titleSelectors) {
        const element = $(selector).first();
        const title = element.text().trim();
        
        if (title && title.length > 0 && 
            !title.toLowerCase().includes('oficial webshop') &&
            !title.toLowerCase().includes('compre online') &&
            title.length < 200) {
          data.nome_produto = title;
          break;
        }
      }
    }

    // Enhanced price extraction - Focus on main product price
    if (!data.valor_principal) {
      // For Amazon, prioritize main product price selectors
      if (url.includes('amazon.com')) {
        // Amazon specific selectors for main product price
        const amazonPriceSelectors = [
          '#priceblock_dealprice',
          '#priceblock_ourprice',
          '#priceblock_saleprice',
          '#corePrice_feature_div .a-price:not(.a-text-strike) .a-offscreen',
          '#apex_desktop .a-price:not(.a-text-strike) .a-offscreen',
          '#buybox .a-price:not(.a-text-strike) .a-offscreen',
          '.a-price.a-text-price.a-size-medium.apexPriceToPay .a-offscreen',
          '.a-price[data-a-size="xl"] .a-offscreen',
          '.a-price[data-a-size="large"] .a-offscreen'
        ];
        
        for (const selector of amazonPriceSelectors) {
          const element = $(selector).first();
          const priceText = element.text().trim();
          const price = this.extractPrice(priceText);
          
          if (price > 0) {
            console.log(`Amazon price found with selector ${selector}: ${priceText} -> ${price}`);
            data.valor_principal = price;
            break;
          }
        }
        
        // If no specific Amazon price found, try general selectors but exclude carousel items
        if (!data.valor_principal) {
          const mainContentPrices = $('#dp-container .a-price .a-offscreen, #feature-bullets .a-price .a-offscreen');
          
          for (let i = 0; i < mainContentPrices.length; i++) {
            const element = mainContentPrices.eq(i);
            const priceText = element.text().trim();
            const price = this.extractPrice(priceText);
            
            // Skip if this element is inside a carousel or related products section
            const isInCarousel = element.closest('.a-carousel-card, .s-result-item, [data-component-type="s-search-result"]').length > 0;
            
            if (price > 0 && !isInCarousel) {
              console.log(`Amazon fallback price found: ${priceText} -> ${price}`);
              data.valor_principal = price;
              break;
            }
          }
        }
      } else {
        // Generic price selectors for other sites
        const priceSelectors = [
          '.js-price-display',
          '.price-current-value',
          '.js-price-current',
          '[class*="price"]:not([class*="old"]):not([class*="was"]):not([class*="original"]):not([class*="previous"])',
          '[data-testid*="price"]',
          '.price-current',
          '.price-now',
          '.current-price',
          '.sale-price',
          '.offer-price',
          '.final-price',
          '[itemprop="price"]',
          '.price-value',
          '.amount'
        ];
        
        for (const selector of priceSelectors) {
          const element = $(selector).first();
          const priceText = element.text().trim();
          const price = this.extractPrice(priceText);
          
          if (price > 0) {
            data.valor_principal = price;
            break;
          }
        }
      }
    }

    // Enhanced brand extraction
    if (!data.marca) {
      let brandSelectors = [];
      
      // Amazon-specific brand selectors
      if (url.includes('amazon.com')) {
        brandSelectors = [
          '#bylineInfo',
          '#bylineInfo a',
          '#bylineInfo_feature_div',
          '#bylineInfo_feature_div a',
          '[data-brand]',
          '.a-link-normal[href*="/brand/"]'
        ];
      }
      
      // General brand selectors
      brandSelectors = brandSelectors.concat([
        '[class*="brand"]',
        '[data-testid*="brand"]',
        '[itemprop="brand"]',
        '.manufacturer',
        '.vendor',
        '.brand-name',
        '.product-brand',
        'meta[property="product:brand"]'
      ]);
      
      for (const selector of brandSelectors) {
        const element = $(selector).first();
        let brand = element.attr('content') || element.attr('data-brand') || element.text().trim();
        
        // For Amazon, clean up brand text (remove "Visit the" and "Store" parts)
        if (url.includes('amazon.com') && brand) {
          brand = brand.replace(/^Visit the\s+/i, '').replace(/\s+Store$/i, '').trim();
        }
        
        if (brand && brand.length > 0 && brand.length < 100) {
          data.marca = brand;
          break;
        }
      }
    }

    // Enhanced SKU extraction
    if (!data.sku) {
      const skuSelectors = [
        '.js-product-sku',
        '[class*="sku"]',
        '[data-testid*="sku"]',
        '[itemprop="sku"]',
        '[class*="model"]',
        '[class*="code"]',
        '[class*="reference"]',
        '[data-sku]',
        '.product-sku',
        '.item-code',
        'meta[property="product:retailer_item_id"]'
      ];
      
      for (const selector of skuSelectors) {
        const element = $(selector).first();
        const sku = element.attr('content') || element.attr('data-sku') || element.text().trim();
        if (sku && sku.length > 0 && sku.length < 50) {
          data.sku = sku;
          break;
        }
      }
      
      // Generate SKU if not found
      if (!data.sku && data.nome_produto) {
        data.sku = this.generateSkuFromName(data.nome_produto, url);
      }
    }

    // Enhanced image extraction
    if (!data.link_imagem) {
      let imageSelectors = [];
      
      // Amazon-specific image selectors
      if (url.includes('amazon.com')) {
        imageSelectors = [
          '#imgTagWrapperId img',
          '#landingImage',
          '#imgBlkFront',
          '#imageBlock img',
          '#imageBlock_feature_div img',
          '#main-image-container img',
          '.a-dynamic-image',
          '#altImages img'
        ];
      }
      
      // General image selectors
      imageSelectors = imageSelectors.concat([
        '.js-product-slide-img',
        '.product-image img',
        '[class*="product"] img[class*="main"]',
        '[class*="product"] img[class*="primary"]',
        '[data-testid*="image"] img',
        '.main-image img',
        '.primary-image img',
        '[itemprop="image"]',
        '.product-slider img',
        '.product-photo img',
        '.hero-image img'
      ]);
      
      for (const selector of imageSelectors) {
        const element = $(selector).first();
        const imgSrc = element.attr('src') || element.attr('data-src') || element.attr('data-original') || element.attr('data-a-dynamic-image');
        
        // For Amazon, handle dynamic image data
        if (url.includes('amazon.com') && element.attr('data-a-dynamic-image')) {
          try {
            const dynamicImages = JSON.parse(element.attr('data-a-dynamic-image'));
            const imageUrl = Object.keys(dynamicImages)[0]; // Get the first (highest quality) image
            if (imageUrl) {
              data.link_imagem = imageUrl;
              break;
            }
          } catch (e) {
            console.log('Error parsing dynamic image data:', e);
          }
        }
        
        if (imgSrc && !imgSrc.includes('placeholder') && !imgSrc.includes('loading')) {
          data.link_imagem = imgSrc.startsWith('http') ? imgSrc : new URL(imgSrc, url).href;
          break;
        }
      }
    }

    // Clean up the image URL
    if (data.link_imagem && data.link_imagem.startsWith('//')) {
      data.link_imagem = 'https:' + data.link_imagem;
    } else if (data.link_imagem && data.link_imagem.startsWith('/')) {
      const urlObj = new URL(url);
      data.link_imagem = urlObj.origin + data.link_imagem;
    }

    return data;
  }

  private extractPrice(priceText: string): number {
    if (!priceText) return 0;
    
    console.log(`[PRICE_PARSE] Starting with: "${priceText}"`);
    
    // Remove all non-numeric characters except dots and commas
    let cleaned = priceText.replace(/[^\d,.]/g, '');
    
    if (!cleaned) return 0;
    
    console.log(`[PRICE_PARSE] After removing non-numeric: "${cleaned}"`);
    
    // Handle duplicated prices (e.g., "13,9413,94" -> "13,94")
    // Look for pattern where price is repeated
    const repeatPattern = /^(\d+[.,]\d{1,2})\1+$/;
    const repeatMatch = cleaned.match(repeatPattern);
    if (repeatMatch) {
      cleaned = repeatMatch[1];
      console.log(`[PRICE_PARSE] Detected repeated pattern: "${cleaned}"`);
    } else if (cleaned.length > 6 && /^\d+$/.test(cleaned)) {
      // Handle cases like "139413941394" where price is repeated multiple times
      const possiblePrices = [];
      for (let len = 3; len <= Math.floor(cleaned.length / 2); len++) {
        const segment = cleaned.substring(0, len);
        const repeated = new RegExp(`^(${segment})+$`);
        if (repeated.test(cleaned)) {
          possiblePrices.push(segment);
        }
      }
      if (possiblePrices.length > 0) {
        // Use the shortest valid price pattern
        const shortestPrice = possiblePrices.reduce((a, b) => a.length <= b.length ? a : b);
        if (shortestPrice.length >= 3 && shortestPrice.length <= 6) {
          if (shortestPrice.length === 3) {
            cleaned = shortestPrice.charAt(0) + '.' + shortestPrice.substring(1);
          } else if (shortestPrice.length === 4) {
            cleaned = shortestPrice.substring(0, 2) + '.' + shortestPrice.substring(2);
          } else if (shortestPrice.length === 5) {
            cleaned = shortestPrice.substring(0, 3) + '.' + shortestPrice.substring(3);
          } else if (shortestPrice.length === 6) {
            cleaned = shortestPrice.substring(0, 4) + '.' + shortestPrice.substring(4);
          }
        }
      }
    } else {
      // Handle cases where numbers are repeated without punctuation (e.g., "12791279" -> "12.79")
      // Look for pattern where a number sequence is repeated
      const numRepeatPattern = /^(\d+)\1+$/;
      const numRepeatMatch = cleaned.match(numRepeatPattern);
      if (numRepeatMatch) {
        const repeated = numRepeatMatch[1];
        // If it's a reasonable price format (2-4 digits), assume it's cents
        if (repeated.length >= 2 && repeated.length <= 4) {
          // Convert to decimal format: 1279 -> 12.79
          if (repeated.length === 2) {
            cleaned = '0.' + repeated;
          } else if (repeated.length === 3) {
            cleaned = repeated.charAt(0) + '.' + repeated.substring(1);
          } else if (repeated.length === 4) {
            // Special case: Check if this might be a price like 1335 (R$ 1.335,00)
            // Don't convert 1335 to 13.35, keep as 1335.00
            const number = parseInt(repeated);
            if (number >= 1000) {
              // Assume it's a whole price like 1335 (R$ 1.335,00)
              cleaned = repeated + '.00';
            } else {
              // Smaller numbers like 1279 -> 12.79
              cleaned = repeated.substring(0, 2) + '.' + repeated.substring(2);
            }
          }
        } else if (repeated.length > 4) {
          // For longer numbers, try to find a reasonable price format
          // e.g., 11901190 -> 1190 (remove duplication) -> 11.90
          const half = repeated.length / 2;
          if (half >= 2 && half <= 4) {
            if (half === 2) {
              cleaned = '0.' + repeated.substring(0, 2);
            } else if (half === 3) {
              cleaned = repeated.charAt(0) + '.' + repeated.substring(1, 3);
            } else if (half === 4) {
              cleaned = repeated.substring(0, 2) + '.' + repeated.substring(2, 4);
            }
          }
        }
      }
    }
    
    console.log(`[PRICE_PARSE] Before format detection: "${cleaned}"`);
    
    // Handle different price formats
    let parsedPrice = 0;
    
    if (cleaned.includes(',') && cleaned.includes('.')) {
      // Format like 1.234,56 or 1,234.56
      const lastComma = cleaned.lastIndexOf(',');
      const lastDot = cleaned.lastIndexOf('.');
      
      if (lastComma > lastDot) {
        // Format: 1.234,56 (Brazilian/European style)
        parsedPrice = parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
        console.log(`[PRICE_PARSE] Brazilian format detected: ${parsedPrice}`);
      } else {
        // Format: 1,234.56 (US style)
        parsedPrice = parseFloat(cleaned.replace(/,/g, ''));
        console.log(`[PRICE_PARSE] US format detected: ${parsedPrice}`);
      }
    } else if (cleaned.includes(',')) {
      // Check if comma is decimal separator (has 2 digits after)
      const parts = cleaned.split(',');
      if (parts.length === 2 && parts[1].length <= 2) {
        parsedPrice = parseFloat(cleaned.replace(',', '.'));
        console.log(`[PRICE_PARSE] Comma as decimal separator: ${parsedPrice}`);
      } else {
        // Comma is thousands separator
        parsedPrice = parseFloat(cleaned.replace(/,/g, ''));
        console.log(`[PRICE_PARSE] Comma as thousands separator: ${parsedPrice}`);
      }
    } else if (cleaned.includes('.')) {
      // Check if dot is decimal separator (has 2 digits after) or thousands separator
      const parts = cleaned.split('.');
      if (parts.length === 2 && parts[1].length <= 2) {
        // Dot is decimal separator
        parsedPrice = parseFloat(cleaned);
        console.log(`[PRICE_PARSE] Dot as decimal separator: ${parsedPrice}`);
      } else {
        // Dot is thousands separator (e.g., 1.234)
        parsedPrice = parseFloat(cleaned.replace(/\./g, ''));
        console.log(`[PRICE_PARSE] Dot as thousands separator: ${parsedPrice}`);
      }
    } else {
      // No separators
      parsedPrice = parseFloat(cleaned);
      console.log(`[PRICE_PARSE] No separators: ${parsedPrice}`);
    }
    
    console.log(`[PRICE_PARSE] Final parsed price: ${parsedPrice}`);
    return parsedPrice;
  }

  private generateSkuFromName(name: string, url: string): string {
    // Extract domain for prefix
    const domain = new URL(url).hostname.replace('www.', '').split('.')[0].toUpperCase();
    
    // Clean and truncate name
    const cleanName = name
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(' ')
      .slice(0, 3)
      .map(word => word.substring(0, 4).toUpperCase())
      .join('');
    
    // Add timestamp to ensure uniqueness
    const timestamp = Date.now().toString().slice(-6);
    
    return `${domain}-${cleanName}-${timestamp}`;
  }

  private isValidResult(result: Partial<ScrapedProductData>): boolean {
    return !!(result.nome_produto && result.valor_principal && result.valor_principal > 0);
  }

  private async getCachedData(url: string): Promise<ScrapedProductData | null> {
    if (!this.config.useCache) return null;
    
    try {
      const cached = this.cache.get(url);
      if (cached) {
        const now = Date.now();
        if (now - cached.timestamp < this.config.cacheExpiry * 1000) {
          const data = { ...cached.data };
          data.method = 'cache';
          return data;
        } else {
          this.cache.delete(url);
        }
      }
    } catch (error) {
      console.warn('Cache read error:', error);
    }
    
    return null;
  }

  private async setCachedData(url: string, data: Partial<ScrapedProductData>): Promise<void> {
    if (!this.config.useCache) return;
    
    try {
      this.cache.set(url, {
        data: data as ScrapedProductData,
        timestamp: Date.now()
      });
    } catch (error) {
      console.warn('Cache write error:', error);
    }
  }

  async close() {
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
      this.cacheCleanupInterval = undefined;
    }
    if (this.cache) {
      this.cache.clear();
    }
    console.log('HybridScraper closed and cleaned up');
  }
}

// Global scraper instance
let scraperInstance: HybridScraper | null = null;

export async function scrapeProductData(url: string): Promise<ScrapedProductData> {
  if (!scraperInstance) {
    scraperInstance = new HybridScraper();
    await scraperInstance.initialize();
  }
  
  return await scraperInstance.scrapeProductData(url);
}

export async function closeScraper() {
  if (scraperInstance) {
    await scraperInstance.close();
    scraperInstance = null;
  }
}