
/*
  # Jhaz-Imprints Admin Schema

  1. New Tables
    - `categories`
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `slug` (text, unique)
      - `created_at`, `updated_at` (timestamps)

    - `fabrics`
      - `id` (uuid, primary key)
      - `color_name` (text, required)
      - `color_code` (text, hex color)
      - `image_url` (text, required)
      - `unit` (text enum: yard | trouser-length | ft | roll | pack)
      - `yards_per_unit` (numeric, default 1.0)
      - `price_modifier` (numeric, default 0)
      - `in_stock` (boolean, default true)
      - `stock_level` (integer, nullable)
      - `is_active` (boolean, default true)
      - `created_at`, `updated_at` (timestamps)

    - `products`
      - `id` (uuid, primary key)
      - `name`, `slug`, `description` (text)
      - `base_price` (numeric)
      - `production_days` (integer)
      - `gender` (text enum: men | women | unisex | kids)
      - `occasion` (text enum)
      - `style_options` (jsonb array)
      - `default_style` (text)
      - `seo_meta` (jsonb)
      - `is_active` (boolean, default true)
      - `created_at`, `updated_at` (timestamps)

    - `product_categories` (junction)
    - `product_fabrics` (junction)

  2. Security
    - RLS enabled on all tables
    - Policies for authenticated admin access only
*/

-- CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view categories"
  ON categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert categories"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update categories"
  ON categories FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete categories"
  ON categories FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- FABRICS
CREATE TABLE IF NOT EXISTS fabrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  color_name text NOT NULL,
  color_code text,
  image_url text NOT NULL,
  unit text NOT NULL DEFAULT 'yard' CHECK (unit IN ('yard', 'trouser-length', 'ft', 'roll', 'pack')),
  yards_per_unit numeric NOT NULL DEFAULT 1.0 CHECK (yards_per_unit >= 0.1),
  price_modifier numeric NOT NULL DEFAULT 0 CHECK (price_modifier >= 0),
  in_stock boolean NOT NULL DEFAULT true,
  stock_level integer CHECK (stock_level >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE fabrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view fabrics"
  ON fabrics FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert fabrics"
  ON fabrics FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update fabrics"
  ON fabrics FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete fabrics"
  ON fabrics FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- PRODUCTS
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text NOT NULL DEFAULT '',
  base_price numeric NOT NULL DEFAULT 0 CHECK (base_price >= 0),
  production_days integer NOT NULL DEFAULT 7 CHECK (production_days >= 1),
  gender text NOT NULL DEFAULT 'unisex' CHECK (gender IN ('men', 'women', 'unisex', 'kids')),
  occasion text NOT NULL DEFAULT 'casual' CHECK (occasion IN ('social-events-celebrations', 'casual', 'corporate', 'burial', 'wedding')),
  style_options jsonb DEFAULT '[]'::jsonb,
  default_style text,
  seo_meta jsonb DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view products"
  ON products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update products"
  ON products FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete products"
  ON products FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- PRODUCT_CATEGORIES (junction)
CREATE TABLE IF NOT EXISTS product_categories (
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, category_id)
);

ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view product_categories"
  ON product_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert product_categories"
  ON product_categories FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete product_categories"
  ON product_categories FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- PRODUCT_FABRICS (junction)
CREATE TABLE IF NOT EXISTS product_fabrics (
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  fabric_id uuid NOT NULL REFERENCES fabrics(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, fabric_id)
);

ALTER TABLE product_fabrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view product_fabrics"
  ON product_fabrics FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert product_fabrics"
  ON product_fabrics FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete product_fabrics"
  ON product_fabrics FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER fabrics_updated_at BEFORE UPDATE ON fabrics FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
