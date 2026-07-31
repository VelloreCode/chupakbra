import { useMemo } from "react";

interface PriceData {
  id: number;
  price: string;
  client: {
    id: number;
    name: string;
  };
}

interface PriceAnalysis {
  variations: Array<{
    client: string;
    price: number;
    percentage: number;
    isHighest?: boolean;
    isLowest?: boolean;
  }>;
  averagePrice: number;
  marketPosition: "competitive" | "high" | "low";
  priceRange: {
    min: number;
    max: number;
    spread: number;
  };
}

export function usePriceAnalysis(
  basePrice: number,
  competitorPrices: PriceData[]
): PriceAnalysis {
  return useMemo(() => {
    if (!competitorPrices || competitorPrices.length === 0) {
      return {
        variations: [],
        averagePrice: basePrice,
        marketPosition: "competitive" as const,
        priceRange: {
          min: basePrice,
          max: basePrice,
          spread: 0
        }
      };
    }

    // Convert prices to numbers and create variations
    const numericPrices = competitorPrices.map(p => parseFloat(p.price));
    const allPrices = [...numericPrices, basePrice];
    
    // Calculate statistics
    const minPrice = Math.min(...numericPrices);
    const maxPrice = Math.max(...numericPrices);
    const averagePrice = numericPrices.reduce((sum, price) => sum + price, 0) / numericPrices.length;
    
    // Create variations with percentage differences
    const variations = competitorPrices.map(priceData => {
      const price = parseFloat(priceData.price);
      const percentage = ((price - basePrice) / basePrice) * 100;
      
      return {
        client: priceData.client.name,
        price,
        percentage,
        isHighest: price === maxPrice && numericPrices.length > 1,
        isLowest: price === minPrice && numericPrices.length > 1
      };
    });

    // Determine market position
    let marketPosition: "competitive" | "high" | "low" = "competitive";
    const positionThreshold = 0.1; // 10% threshold
    
    if (basePrice > averagePrice * (1 + positionThreshold)) {
      marketPosition = "high";
    } else if (basePrice < averagePrice * (1 - positionThreshold)) {
      marketPosition = "low";
    }

    return {
      variations: variations.sort((a, b) => a.price - b.price),
      averagePrice,
      marketPosition,
      priceRange: {
        min: minPrice,
        max: maxPrice,
        spread: maxPrice - minPrice
      }
    };
  }, [basePrice, competitorPrices]);
}