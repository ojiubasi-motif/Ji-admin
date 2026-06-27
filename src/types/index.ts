export interface Category {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface FabricCategory {
  id: string;
  name: string;
  slug: string;
  fabrics?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface Fabric {
  id: string;
  color_name: string;
  color_code: string | null;
  image_url: string;
  unit: 'yard' | 'trouser-length' | 'ft' | 'roll' | 'pack';
  yards_per_unit: number;
  price_modifier: number;
  in_stock: boolean;
  stock_level: number | null;
  is_active: boolean;
  fabric_category_id: string;
  fabric_category_name: string;
  created_at: string;
  updated_at: string;
}

export interface StyleOption {
  name: string;
  options: string[];
}

export interface SeoMeta {
  title: string;
  description: string;
  keywords: string[];
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  base_price: number;
  production_days: number;
  gender: 'men' | 'women' | 'unisex' | 'kids';
  occasion: 'social-events-celebrations' | 'casual' | 'corporate' | 'burial' | 'wedding';
  style_options: StyleOption[];
  default_style: string | null;
  seo_meta: SeoMeta | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  categories?: Category[];
  fabrics?: Fabric[];
}

export type Page = 'dashboard' | 'products' | 'fabrics' | 'categories' | 'profile' | 'orders';

export const GENDER_OPTIONS = ['men', 'women', 'unisex', 'kids'] as const;
export const OCCASION_OPTIONS = [
  'social-events-celebrations',
  'casual',
  'corporate',
  'burial',
  'wedding',
] as const;
export const UNIT_OPTIONS = ['yard', 'trouser-length', 'ft', 'roll', 'pack'] as const;
