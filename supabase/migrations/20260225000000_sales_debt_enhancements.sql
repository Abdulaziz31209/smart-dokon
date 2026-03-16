-- Sales & Debt Enhancements for Smart-Dokon
-- Add payment_status, customer_details. Optimize for long-term analytics.
-- Run in Supabase SQL Editor

-- Add missing columns if not exist
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'paid' CHECK (payment_status IN ('paid', 'unpaid'));

ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS customer_details jsonb DEFAULT '{}'::jsonb 
COMMENT 'Additional customer info: {"name": string, "phone": string}';

-- Normalize payment_method to 'cash'|'debt' for task
ALTER TABLE public.sales 
ALTER COLUMN payment_method TYPE text 
USING CASE 
  WHEN payment_method IN ('Naqd', 'Karta', 'Payme', 'Cash') THEN 'cash' 
  WHEN payment_method IN ('Qarz', 'Debt', 'Nasiya') THEN 'debt' 
  ELSE payment_method 
END;

-- Indexes for millions rows performance + date filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sales_user_date ON public.sales(user_id, sale_date DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sales_payment ON public.sales(payment_method, payment_status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sales_employee ON public.sales(employee_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sales_customer ON public.sales(customer_id);

-- Update trigger/function if needed for new fields (stock still same)
-- RLS already covers sales table

-- View for Sales History (optimized query)
CREATE OR REPLACE VIEW public.sales_history AS 
SELECT 
  s.id, 
  s.sale_date as date, 
  p.name as item, 
  si.quantity as qty, 
  s.total_price as total, 
  e.full_name as employee, 
  s.payment_method as payment_type, 
  s.payment_status as status,
  s.customer_details,
  c.full_name as customer_name
FROM public.sales s
LEFT JOIN public.employees e ON s.employee_id = e.id
LEFT JOIN public.customers c ON s.customer_id = c.id
LEFT JOIN public.sale_items si ON si.sale_id = s.id
LEFT JOIN public.products p ON si.product_id = p.id
ORDER BY s.sale_date DESC;

COMMENT ON VIEW public.sales_history IS 'Optimized view for sales analytics with date filtering';

-- RLS for view (inherit from sales)
GRANT SELECT ON public.sales_history TO authenticated;

DO $$ BEGIN RAISE NOTICE 'Sales enhancements applied successfully'; END $$;

