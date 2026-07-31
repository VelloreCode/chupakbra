const { scrapeProductData } = require('./server/scraper-v2.ts');

async function testAmazonScraper() {
  try {
    console.log('Testing Amazon scraper for product: https://www.amazon.com.br/dp/B07VTJ9H7P');
    
    const result = await scrapeProductData('https://www.amazon.com.br/dp/B07VTJ9H7P');
    
    console.log('Scraping result:');
    console.log('Name:', result.nome_produto);
    console.log('Price:', result.valor_principal);
    console.log('Brand:', result.marca);
    console.log('SKU:', result.sku);
    console.log('Success:', result.success);
    console.log('Method:', result.method);
    
    if (result.error) {
      console.log('Error:', result.error);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testAmazonScraper();