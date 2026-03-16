-- Barcode Support for POS Scanner
-- Run in Supabase SQL Editor

-- Add barcode column (text, nullable initially)
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS barcode text UNIQUE;

-- Add product_metadata for API data (image_url, description etc.)
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS product_metadata jsonb DEFAULT '{}'::jsonb;

-- Fast lookup index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_barcode 
ON public.products(barcode) 
WHERE barcode IS NOT NULL;

-- Update trigger (optional, for future)
-- RLS already user_id filtered

DO $$ BEGIN 
  RAISE NOTICE 'Barcode support added successfully. Test: UPDATE products SET barcode = ''3017620422003'' WHERE id = (SELECT id FROM products LIMIT 1);'; 
END $$;

COMMENT ON COLUMN public.products.barcode IS 'Unique product barcode for POS scanner';
COMMENT ON COLUMN public.products.product_metadata IS 'External API data: {image_url, description, nutrition}';

