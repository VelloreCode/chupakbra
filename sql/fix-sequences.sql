-- Reajusta todas as sequências de id para depois do maior valor existente.
--
-- Quando um dump é restaurado, as linhas entram com id explícito, mas a
-- sequência associada continua no valor antigo. O próximo INSERT normal pede
-- nextval(), recebe um id que já existe e falha com:
--
--   duplicate key value violates unique constraint "<tabela>_pkey"
--
-- O sintoma engana: parece bug de código gravando duas vezes, quando na
-- verdade é estado do banco herdado da restauração. Rodar isto depois de todo
-- restore evita o problema.
--
-- É seguro e idempotente: nunca apaga nem altera dado, só move o contador.
-- Rodar em banco ocioso, para não competir com inserts em andamento.

DO $$
DECLARE
  r      RECORD;
  maxid  BIGINT;
  ajustadas INT := 0;
BEGIN
  FOR r IN
    SELECT c.relname AS tabela,
           a.attname AS coluna,
           pg_get_serial_sequence(c.relname, a.attname) AS seq
      FROM pg_class c
      JOIN pg_attribute a ON a.attrelid = c.oid
     WHERE c.relkind = 'r'
       AND c.relnamespace = 'public'::regnamespace
       AND pg_get_serial_sequence(c.relname, a.attname) IS NOT NULL
     ORDER BY c.relname
  LOOP
    EXECUTE format('SELECT COALESCE(MAX(%I), 0) FROM %I', r.coluna, r.tabela)
       INTO maxid;

    -- is_called = false em tabela vazia faz o próximo id ser 1, e não 2.
    PERFORM setval(r.seq, GREATEST(maxid, 1), maxid > 0);

    ajustadas := ajustadas + 1;
    RAISE NOTICE 'Sequência % ajustada (maior id = %)', r.seq, maxid;
  END LOOP;

  RAISE NOTICE '% sequência(s) verificadas.', ajustadas;
END $$;

-- Conferência: estado final de cada sequência.
-- last_value deve ser >= o maior id da tabela correspondente.
SELECT sequencename AS sequencia, last_value AS valor_atual
  FROM pg_sequences
 WHERE schemaname = 'public'
 ORDER BY sequencename;
