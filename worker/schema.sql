-- ==========================================
-- SCHEMA DO BANCO DE DADOS D1
-- ==========================================

-- Tabela de Convidados
CREATE TABLE IF NOT EXISTS guests (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  family TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pendente' CHECK(status IN ('pendente', 'confirmado', 'nao_vem', 'pago_parcial', 'pago_total')),
  observations TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tabela de Pagamentos dos Convidados
CREATE TABLE IF NOT EXISTS guest_payments (
  id TEXT PRIMARY KEY,
  guest_id TEXT NOT NULL,
  amount REAL NOT NULL,
  payment_date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE CASCADE
);

-- Tabela de Configurações (chaves de API, etc)
CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Tabela de Compras e Contratações
CREATE TABLE IF NOT EXISTS shopping_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price REAL NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'compra' CHECK(category IN ('compra', 'contratacao')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
