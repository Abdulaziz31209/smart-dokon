-- ============================================================
-- Smart-Dokon RLS Policies Fix
-- Bu fayl barcha RLS siyosatlarini to'g'rilaydi
-- ============================================================

-- Avval mavjud policies va triggerlarni tozalash
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.handle_sale_stock_change();
DROP FUNCTION IF EXISTS auth.current_user_id();
DROP FUNCTION IF EXISTS apply_rls_to_table(text);

-- ============================================================
-- 1. PROFILES TABLE - Auto-create profile on signup
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Faqat yangi foydalanuvchi uchun profil yaratamiz
  INSERT INTO public.profiles (id, username, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || LEFT(NEW.id::TEXT, 8)),
    NEW.raw_user_meta_data->>'full_name'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- 2. RLS POLICIES - To'g'ri auth.uid() ishlatish
-- ============================================================

-- Products table
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own products." ON public.products;

CREATE POLICY "Users can manage their own products." ON public.products
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Employees table
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own employees." ON public.employees;

CREATE POLICY "Users can manage their own employees." ON public.employees
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Sales table
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own sales." ON public.sales;

CREATE POLICY "Users can manage their own sales." ON public.sales
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Sale Items table - based on parent sale
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own sale items." ON public.sale_items;

CREATE POLICY "Users can manage their own sale items." ON public.sale_items
  FOR ALL
  USING (
    auth.uid() = (
      SELECT user_id FROM public.sales WHERE id = sale_items.sale_id
    )
  )
  WITH CHECK (
    auth.uid() = (
      SELECT user_id FROM public.sales WHERE id = sale_items.sale_id
    )
  );

-- Categories table
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own categories." ON public.categories;

CREATE POLICY "Users can manage their own categories." ON public.categories
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Customers table
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own customers." ON public.customers;

CREATE POLICY "Users can manage their own customers." ON public.customers
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Inventory Logs table
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own inventory logs." ON public.inventory_logs;

CREATE POLICY "Users can manage their own inventory logs." ON public.inventory_logs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Expenses table
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own expenses." ON public.expenses;

CREATE POLICY "Users can manage their own expenses." ON public.expenses
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Debts table
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own debts." ON public.debts;

CREATE POLICY "Users can manage their own debts." ON public.debts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 3. PROFILES - Maxsus policy (o'z profilini ko'rish va yangilash)
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Hamma o'z profilini ko'radi
DROP POLICY IF EXISTS "Users can view own profile." ON public.profiles;
CREATE POLICY "Users can view own profile." ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Hamma o'z profilini yangilaydi
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
CREATE POLICY "Users can update own profile." ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- 4. Sale stock change function (to'g'rilang)
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_sale_stock_change()
RETURNS TRIGGER AS $$
DECLARE
  new_stock_level int;
  v_user_id uuid;
BEGIN
  -- Sale dan user_id ni olamiz
  SELECT user_id INTO v_user_id 
  FROM public.sales 
  WHERE id = NEW.sale_id;

  -- Mahsulot zaxirasini kamaytiramiz
  UPDATE public.products
  SET stock = stock - NEW.quantity
  WHERE id = NEW.product_id
  RETURNING stock INTO new_stock_level;

  -- Inventory log yaratamiz
  INSERT INTO public.inventory_logs (user_id, product_id, sale_item_id, change, new_stock, type, reason)
  VALUES (v_user_id, NEW.product_id, NEW.id, -NEW.quantity, new_stock_level, 'stock_out', 'Sale');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger ni qayta yaratamiz
DROP TRIGGER IF EXISTS on_sale_item_insert ON public.sale_items;
CREATE TRIGGER on_sale_item_insert
  AFTER INSERT ON public.sale_items
  FOR EACH ROW EXECUTE PROCEDURE public.handle_sale_stock_change();

-- ============================================================
-- 5. GRANT permissions (to'liq access)
-- ============================================================

GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.products TO authenticated;
GRANT ALL ON public.categories TO authenticated;
GRANT ALL ON public.employees TO authenticated;
GRANT ALL ON public.customers TO authenticated;
GRANT ALL ON public.sales TO authenticated;
GRANT ALL ON public.sale_items TO authenticated;
GRANT ALL ON public.inventory_logs TO authenticated;
GRANT ALL ON public.expenses TO authenticated;
GRANT ALL ON public.debts TO authenticated;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================
-- 6. Indexes (performance uchun)
-- ============================================================

-- Mavjud indexlarni tekshirish va qo'shish
CREATE INDEX IF NOT EXISTS idx_products_user_id ON public.products(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON public.employees(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON public.sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_user_id_date ON public.sales(user_id, sale_date);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON public.customers(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_user_id ON public.inventory_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_debts_user_id ON public.debts(user_id);

DO $$
BEGIN
  RAISE NOTICE 'RLS policies muvaffaqiyatli yangilandi!';
END $$;
