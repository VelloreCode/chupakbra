import axios from 'axios';
import * as cheerio from 'cheerio';

export interface ScrapedProductData {
  nome_produto?: string;
  marca?: string;
  valor_principal?: number;
  sku?: string;
  link_imagem?: string;
  description?: string;
}

export async function scrapeProductData(url: string): Promise<ScrapedProductData> {
  try {
    console.log(`Scraping product data from: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.8,en;q=0.5,en-US;q=0.3',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive'
      },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    const data: ScrapedProductData = {};

    // Debug: log what we find in the page
    console.log('Page title:', $('title').text());
    console.log('H1 elements found:', $('h1').length);
    $('h1').each((i, el) => {
      console.log(`H1 ${i}:`, $(el).text().trim(), 'Class:', $(el).attr('class'));
    });

    // Extract structured data (JSON-LD, Schema.org)
    $('script[type="application/ld+json"]').each((_, element) => {
      try {
        const jsonData = JSON.parse($(element).text());
        console.log('Found JSON-LD data:', JSON.stringify(jsonData, null, 2));
        
        if (jsonData['@type'] === 'Product' || (Array.isArray(jsonData) && jsonData.some(item => item['@type'] === 'Product'))) {
          const product = Array.isArray(jsonData) ? jsonData.find(item => item['@type'] === 'Product') : jsonData;
          
          if (product.name && !data.nome_produto) {
            data.nome_produto = product.name;
            console.log('Found product name in JSON-LD:', product.name);
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
        console.log('Found product name in OG data:', ogTitle);
      }
    }
    
    if (!data.link_imagem) {
      data.link_imagem = $('meta[property="og:image"]').attr('content') || 
                         $('meta[name="twitter:image"]').attr('content');
    }

    // Fallback to HTML parsing
    if (!data.nome_produto) {
      const titleSelectors = [
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
        'h1',
        'title'
      ];
      
      for (const selector of titleSelectors) {
        const element = $(selector).first();
        const title = element.text().trim();
        console.log(`Trying selector "${selector}": "${title}"`);
        
        if (title && title.length > 0 && 
            !title.toLowerCase().includes('oficial webshop') &&
            !title.toLowerCase().includes('compre online') &&
            title.length < 200) {
          data.nome_produto = title;
          console.log(`Selected title from "${selector}": "${title}"`);
          break;
        }
      }
    }

    // Extract price
    if (!data.valor_principal) {
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
        '[itemprop="price"]'
      ];
      
      for (const selector of priceSelectors) {
        const element = $(selector).first();
        const priceText = element.text().trim();
        const price = extractPrice(priceText);
        console.log(`Trying price selector "${selector}": "${priceText}" -> ${price}`);
        
        if (price > 0) {
          data.valor_principal = price;
          console.log(`Selected price from "${selector}": ${price}`);
          break;
        }
      }
    }

    // Extract brand
    if (!data.marca) {
      const brandSelectors = [
        '[class*="brand"]',
        '[data-testid*="brand"]',
        '[itemprop="brand"]',
        '.manufacturer',
        '.vendor'
      ];
      
      for (const selector of brandSelectors) {
        const brand = $(selector).first().text().trim();
        if (brand && brand.length > 0 && brand.length < 100) {
          data.marca = brand;
          break;
        }
      }
    }

    // Extract SKU
    if (!data.sku) {
      const skuSelectors = [
        '.js-product-sku',
        '[class*="sku"]',
        '[data-testid*="sku"]',
        '[itemprop="sku"]',
        '[class*="model"]',
        '[class*="code"]',
        '[class*="reference"]'
      ];
      
      for (const selector of skuSelectors) {
        const sku = $(selector).first().text().trim();
        if (sku && sku.length > 0 && sku.length < 50) {
          data.sku = sku;
          break;
        }
      }
    }

    // Extract image
    if (!data.link_imagem) {
      const imageSelectors = [
        '.js-product-slide-img',
        '.product-image img',
        '[class*="product"] img[class*="main"]',
        '[class*="product"] img[class*="primary"]',
        '[data-testid*="image"] img',
        '.main-image img',
        '.primary-image img',
        '[itemprop="image"]',
        '.product-slider img'
      ];
      
      for (const selector of imageSelectors) {
        const imgSrc = $(selector).first().attr('src') || $(selector).first().attr('data-src') || $(selector).first().attr('data-original');
        if (imgSrc && !imgSrc.includes('placeholder') && !imgSrc.includes('loading')) {
          data.link_imagem = imgSrc.startsWith('http') ? imgSrc : new URL(imgSrc, url).href;
          break;
        }
      }
    }

    // Method 4: Enhanced SKU extraction
    if (!data.sku) {
      // Try various SKU selectors
      const skuSelectors = [
        'meta[property="product:retailer_item_id"]',
        '[data-sku]', '.sku', '.product-sku', '#sku',
        '.product-code', '.item-code', '.reference'
      ];
      
      for (const selector of skuSelectors) {
        const element = $(selector);
        if (element.length) {
          const skuValue = element.attr('content') || element.attr('data-sku') || element.text().trim();
          if (skuValue && skuValue.length > 0) {
            data.sku = skuValue;
            break;
          }
        }
      }
      
      // Generate SKU if still not found
      if (!data.sku && data.nome_produto) {
        data.sku = generateSkuFromName(data.nome_produto, url);
      }
    }

    // Method 5: Enhanced brand extraction
    if (!data.marca) {
      const brandSelectors = [
        'meta[property="product:brand"]',
        '.brand', '.product-brand', '.manufacturer',
        '[data-brand]', '.brand-name'
      ];
      
      for (const selector of brandSelectors) {
        const element = $(selector);
        if (element.length) {
          const brandValue = element.attr('content') || element.text().trim();
          if (brandValue && brandValue.length > 0) {
            data.marca = brandValue;
            break;
          }
        }
      }
      
      // Try to extract brand from site name if still not found
      if (!data.marca) {
        const siteName = $('meta[property="og:site_name"]').attr('content');
        if (siteName) {
          data.marca = siteName;
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

    console.log('Scraped data:', data);
    return data;
    
  } catch (error) {
    console.error('Error scraping product data:', error);
    throw new Error(`Failed to scrape product data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function extractPrice(priceText: string): number {
  if (!priceText) return 0;
  
  // Remove all non-numeric characters except dots and commas
  const cleaned = priceText.replace(/[^\d,.]/g, '');
  
  // Handle different price formats
  if (cleaned.includes(',') && cleaned.includes('.')) {
    // Format like 1.234,56 or 1,234.56
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    
    if (lastComma > lastDot) {
      // Format: 1.234,56
      return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
    } else {
      // Format: 1,234.56
      return parseFloat(cleaned.replace(/,/g, ''));
    }
  } else if (cleaned.includes(',')) {
    // Check if comma is decimal separator (has 2 digits after)
    const parts = cleaned.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      return parseFloat(cleaned.replace(',', '.'));
    } else {
      // Comma is thousands separator
      return parseFloat(cleaned.replace(/,/g, ''));
    }
  } else {
    // Only dots or no separators
    return parseFloat(cleaned);
  }
}

function generateSkuFromName(name: string, url: string): string {
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