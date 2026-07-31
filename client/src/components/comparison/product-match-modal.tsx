import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Calendar, DollarSign, Store } from "lucide-react";
import { Product, Price, Client } from "@shared/schema";

interface ProductMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  matchingPrices: Array<Price & { client: Client }>;
}

export default function ProductMatchModal({
  isOpen,
  onClose,
  product,
  matchingPrices
}: ProductMatchModalProps) {
  const basePrice = parseFloat(product.basePrice);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {product.name}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                SKU: {product.sku} | Preço Base: R$ {basePrice.toFixed(2)}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Produto Principal */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Produto Principal (Nosso Cadastro)
            </h3>
            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {product.name}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {product.description}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="secondary">SKU: {product.sku}</Badge>
                      {product.brandSku && (
                        <Badge variant="outline">Brand SKU: {product.brandSku}</Badge>
                      )}
                      {product.matchGroup && (
                        <Badge variant="outline">Grupo: {product.matchGroup}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-orange-600">
                      R$ {basePrice.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Preço Base
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* Produtos dos Clientes */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Produtos dos Clientes ({matchingPrices.length})
            </h3>
            
            {matchingPrices.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="text-gray-400 dark:text-gray-600">
                    <Store className="h-12 w-12 mx-auto mb-3" />
                    <p className="text-lg font-medium">Nenhum produto encontrado</p>
                    <p className="text-sm">
                      Não há produtos de clientes que fazem match com este produto.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {matchingPrices.map((priceData) => {
                  const clientPrice = parseFloat(priceData.price);
                  const difference = clientPrice - basePrice;
                  const percentageDiff = ((difference / basePrice) * 100);
                  
                  return (
                    <Card key={`${priceData.clientId}-${priceData.id}`} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                                <Store className="h-4 w-4 text-blue-600" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold text-gray-900 dark:text-white">
                                    {priceData.client.name}
                                  </h4>
                                  {/* Competitor Badge */}
                                  {(priceData.product?.isCompetitor || 
                                    priceData.client.name.toLowerCase().includes('concorrent') || 
                                    priceData.client.name.toLowerCase().includes('competitor')) && (
                                    <Badge className="bg-red-500 text-white text-xs">
                                      Concorrente
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {product.name}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>
                                  Atualizado em {new Date(priceData.lastUpdated || priceData.createdAt || new Date()).toLocaleDateString('pt-BR')}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                              R$ {clientPrice.toFixed(2)}
                            </p>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant={difference < 0 ? "default" : "destructive"}
                                className={difference < 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                              >
                                {difference >= 0 ? '+' : ''}R$ {difference.toFixed(2)}
                              </Badge>
                              <span className={`text-sm ${difference < 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {percentageDiff >= 0 ? '+' : ''}{percentageDiff.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}