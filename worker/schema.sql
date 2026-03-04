-- ==========================================
-- SCHEMA DO BANCO DE DADOS D1
-- ==========================================

-- Tabela de Convidados
CREATE TABLE IF NOT EXISTS guests (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK(status IN ('pendente', 'confirmado', 'nao_vem', 'pago')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tabela de Compras e Contratações
CREATE TABLE IF NOT EXISTS shopping_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price REAL NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'compra' CHECK(category IN ('compra', 'contratacao')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
