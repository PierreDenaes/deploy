-- Migration pour ajouter la table OpenFoodFacts locale
CREATE TABLE IF NOT EXISTS openfoodfacts_products (
  id SERIAL PRIMARY KEY,
  barcode VARCHAR(50) UNIQUE NOT NULL,
  product_name TEXT NOT NULL,
  brands TEXT,
  categories TEXT,
  energy_100g DECIMAL(8,2) DEFAULT 0,
  proteins_100g DECIMAL(8,2) DEFAULT 0,
  carbohydrates_100g DECIMAL(8,2) DEFAULT 0,
  fat_100g DECIMAL(8,2) DEFAULT 0,
  fiber_100g DECIMAL(8,2) DEFAULT 0,
  sodium_100g DECIMAL(8,2) DEFAULT 0,
  countries TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour optimiser les recherches
CREATE INDEX IF NOT EXISTS idx_openfoodfacts_product_name ON openfoodfacts_products USING gin(to_tsvector('french', product_name));
CREATE INDEX IF NOT EXISTS idx_openfoodfacts_brands ON openfoodfacts_products USING gin(to_tsvector('french', brands));
CREATE INDEX IF NOT EXISTS idx_openfoodfacts_barcode ON openfoodfacts_products(barcode);
CREATE INDEX IF NOT EXISTS idx_openfoodfacts_proteins ON openfoodfacts_products(proteins_100g) WHERE proteins_100g > 0;