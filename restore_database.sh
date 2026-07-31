#!/bin/bash

# ============================================
# Script de Restauração do Banco de Dados
# Chupa K Bra - Sistema de Monitoramento de Preços
# ============================================

echo "============================================"
echo "  Restauração do Banco de Dados"
echo "  Chupa K Bra - Grupo Vellore"
echo "============================================"
echo ""

# Verificar se DATABASE_URL está definida
if [ -z "$DATABASE_URL" ]; then
    echo "ERRO: DATABASE_URL não está definida!"
    echo "Por favor, crie um banco de dados PostgreSQL no Replit primeiro."
    exit 1
fi

echo "1. Verificando conexão com o banco de dados..."
psql $DATABASE_URL -c "SELECT 1" > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "ERRO: Não foi possível conectar ao banco de dados!"
    exit 1
fi
echo "   ✓ Conexão estabelecida"
echo ""

echo "2. Criando estrutura do banco de dados (Drizzle push)..."
npm run db:push
if [ $? -ne 0 ]; then
    echo "AVISO: db:push falhou, tentando com --force..."
    npm run db:push --force
fi
echo "   ✓ Estrutura criada"
echo ""

echo "3. Preparando para importação de dados..."
echo "   Desabilitando triggers temporariamente..."
psql $DATABASE_URL -c "SET session_replication_role = 'replica';" 2>/dev/null
echo ""

echo "4. Importando dados do backup..."
if [ -f "database_data.sql" ]; then
    psql $DATABASE_URL < database_data.sql
    echo "   ✓ Dados importados de database_data.sql"
else
    echo "   AVISO: database_data.sql não encontrado"
fi
echo ""

echo "5. Reabilitando triggers..."
psql $DATABASE_URL -c "SET session_replication_role = 'origin';" 2>/dev/null
echo ""

echo "6. Verificando contagem de registros..."
echo ""
psql $DATABASE_URL -c "
SELECT 'products' as tabela, COUNT(*) as registros FROM products
UNION ALL SELECT 'users', COUNT(*) FROM users
UNION ALL SELECT 'clients', COUNT(*) FROM clients
UNION ALL SELECT 'prices', COUNT(*) FROM prices
UNION ALL SELECT 'price_history', COUNT(*) FROM price_history
UNION ALL SELECT 'price_monitoring_history', COUNT(*) FROM price_monitoring_history
ORDER BY tabela;
"

echo ""
echo "============================================"
echo "  Restauração concluída!"
echo "============================================"
echo ""
echo "Próximos passos:"
echo "  1. Execute: npm run dev"
echo "  2. Acesse a aplicação no navegador"
echo "  3. Faça login para testar"
echo ""
