import { ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Info, AlertTriangle } from "lucide-react";

interface PriceVariation {
  client: string;
  price: number;
  percentage: number;
  isHighest?: boolean;
  isLowest?: boolean;
}

interface PriceTooltipProps {
  children: ReactNode;
  basePrice: number;
  variations: PriceVariation[];
  productName: string;
  averagePrice?: number;
  marketPosition?: "competitive" | "high" | "low";
}

export function PriceTooltip({
  children,
  basePrice,
  variations,
  productName,
  averagePrice,
  marketPosition = "competitive"
}: PriceTooltipProps) {
  const formatPrice = (price: number) => `R$ ${price.toFixed(2)}`;
  const formatPercentage = (percentage: number) => `${percentage > 0 ? '+' : ''}${percentage.toFixed(1)}%`;

  const getVariationIcon = (percentage: number) => {
    if (percentage > 0) return <TrendingUp className="h-3 w-3 text-red-500" />;
    if (percentage < 0) return <TrendingDown className="h-3 w-3 text-green-500" />;
    return <Info className="h-3 w-3 text-blue-500" />;
  };

  const getMarketPositionInfo = () => {
    switch (marketPosition) {
      case "competitive":
        return {
          color: "bg-green-100 text-green-800",
          text: "Preço competitivo no mercado"
        };
      case "high":
        return {
          color: "bg-red-100 text-red-800", 
          text: "Preço acima da média do mercado"
        };
      case "low":
        return {
          color: "bg-blue-100 text-blue-800",
          text: "Preço abaixo da média do mercado"
        };
      default:
        return {
          color: "bg-gray-100 text-gray-800",
          text: "Posição no mercado indefinida"
        };
    }
  };

  const positionInfo = getMarketPositionInfo();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent className="w-80 p-4">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <h4 className="font-semibold text-sm">Análise de Preços</h4>
            </div>
            
            {/* Product name */}
            <p className="text-xs text-gray-600 font-medium">{productName}</p>
            
            {/* Base price and average */}
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs text-gray-500">Preço base</p>
                <p className="font-bold text-lg">{formatPrice(basePrice)}</p>
              </div>
              {averagePrice && (
                <div className="text-right">
                  <p className="text-xs text-gray-500">Média do mercado</p>
                  <p className="font-semibold">{formatPrice(averagePrice)}</p>
                </div>
              )}
            </div>

            {/* Market position */}
            <Badge className={`${positionInfo.color} text-xs`}>
              {positionInfo.text}
            </Badge>

            {/* Price variations */}
            {variations.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-700">Comparação com concorrentes:</p>
                <div className="space-y-1">
                  {variations.map((variation, index) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1">
                        {getVariationIcon(variation.percentage)}
                        <span className="font-medium">{variation.client}</span>
                        {variation.isLowest && (
                          <Badge variant="secondary" className="text-xs px-1 py-0">
                            Menor
                          </Badge>
                        )}
                        {variation.isHighest && (
                          <Badge variant="destructive" className="text-xs px-1 py-0">
                            Maior
                          </Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatPrice(variation.price)}</div>
                        <div className={`text-xs ${
                          variation.percentage > 0 ? 'text-red-600' : 
                          variation.percentage < 0 ? 'text-green-600' : 'text-gray-500'
                        }`}>
                          {formatPercentage(variation.percentage)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Insights */}
            <div className="border-t pt-2">
              <p className="text-xs text-gray-600">
                {variations.length > 0 ? (
                  `Variação de ${formatPercentage(Math.min(...variations.map(v => v.percentage)))} a ${formatPercentage(Math.max(...variations.map(v => v.percentage)))}`
                ) : (
                  "Nenhum dado de comparação disponível"
                )}
              </p>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}