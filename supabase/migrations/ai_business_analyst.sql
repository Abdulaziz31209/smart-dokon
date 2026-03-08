-- =====================================================
-- AI Business Analyst uchun yangi jadvallar
-- Supabase SQL Editor da ishga tushiring
-- =====================================================

-- 1. AI Chat foydalanish statistikasi (kunlik limit)
CREATE TABLE IF NOT EXISTS ai_chat_usage (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- 2. AI Chat tarixi
CREATE TABLE IF NOT EXISTS ai_chat_history (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  response TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. AI Notifications (eslatmalar) - agar mavjud bo'lmasa
-- Eslatma: notifications jadvali ehtimol oldindan mavjud
-- Agar yo'q bo'lsa, quyidagini ishga tushing:

/*
CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  type VARCHAR(50) DEFAULT 'info', -- info, warning, success, error, ai_analysis
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
*/

-- 4. Indexlar (tezlik uchun)
CREATE INDEX IF NOT EXISTS idx_ai_chat_usage_user_date ON ai_chat_usage(user_id, date);
CREATE INDEX IF NOT EXISTS idx_ai_chat_history_user_created ON ai_chat_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read, created_at DESC);

-- 5. Funksiya: AI chat limitini olish
CREATE OR REPLACE FUNCTION get_ai_chat_remaining(user_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  today_date DATE := CURRENT_DATE;
  current_count INTEGER;
  max_limit INTEGER := 15; -- Kunlik limit
BEGIN
  SELECT message_count INTO current_count
  FROM ai_chat_usage
  WHERE user_id = user_id_param AND date = today_date;
  
  IF current_count IS NULL THEN
    RETURN max_limit;
  END IF;
  
  RETURN GREATEST(0, max_limit - current_count);
END;
$$ LANGUAGE plpgsql;

-- 6. Funksiya: AI eslatmalar olish
CREATE OR REPLACE FUNCTION get_ai_notifications(user_id_param UUID, limit_param INTEGER DEFAULT 10)
RETURNS TABLE (
  id BIGINT,
  title VARCHAR(255),
  message TEXT,
  type VARCHAR(50),
  is_read BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.id,
    n.title,
    n.message,
    n.type,
    n.is_read,
    n.created_at
  FROM notifications n
  WHERE n.user_id = user_id_param
  ORDER BY n.created_at DESC
  LIMIT limit_param;
END;
$$ LANGUAGE plpgsql;

-- 7. Funksiya: Oylik solishtirma tahlil
CREATE OR REPLACE FUNCTION get_monthly_comparison(user_id_param UUID)
RETURNS TABLE (
  current_month_revenue BIGINT,
  last_month_revenue BIGINT,
  change_percentage DECIMAL(10,2),
  trend VARCHAR(20)
) AS $$
DECLARE
  current_month INTEGER;
  last_month INTEGER;
  current_year INTEGER;
  current_revenue BIGINT := 0;
  last_revenue BIGINT := 0;
BEGIN
  current_month := EXTRACT(MONTH FROM NOW());
  last_month := CASE 
    WHEN current_month = 1 THEN 12 
    ELSE current_month - 1 
  END;
  current_year := EXTRACT(YEAR FROM NOW());

  -- Joriy oy sotuvlari
  SELECT COALESCE(SUM(total_amount), 0) INTO current_revenue
  FROM sales
  WHERE user_id = user_id_param
    AND EXTRACT(MONTH FROM created_at) = current_month
    AND EXTRACT(YEAR FROM created_at) = current_year;

  -- O'tgan oy sotuvlari
  SELECT COALESCE(SUM(total_amount), 0) INTO last_revenue
  FROM sales
  WHERE user_id = user_id_param
    AND EXTRACT(MONTH FROM created_at) = last_month
    AND EXTRACT(YEAR FROM created_at) = 
      CASE WHEN last_month = 12 THEN current_year - 1 ELSE current_year END;

  RETURN QUERY
  SELECT 
    current_revenue,
    last_revenue,
    CASE 
      WHEN last_revenue > 0 THEN ROUND(((current_revenue - last_revenue)::DECIMAL / last_revenue) * 100, 2)
      ELSE 0 
    END,
    CASE 
      WHEN current_revenue > last_revenue THEN 'osish'
      WHEN current_revenue < last_revenue THEN 'pasayish'
      ELSE 'o\'zgarishsiz'
    END;
END;
$$ LANGUAGE plpgsql;

-- 8. Funksiya: Xodimlar samaradorligi
CREATE OR REPLACE FUNCTION get_employee_performance(user_id_param UUID, month_offset INTEGER DEFAULT 0)
RETURNS TABLE (
  employee_id UUID,
  employee_name VARCHAR(255),
  total_sales BIGINT,
  salary BIGINT,
  performance_ratio DECIMAL(10,2),
  suggestion VARCHAR(100)
) AS $$
DECLARE
  target_month INTEGER;
  target_year INTEGER;
BEGIN
  target_month := EXTRACT(MONTH FROM NOW()) + month_offset;
  target_year := EXTRACT(YEAR FROM NOW());
  
  WHILE target_month > 12 LOOP
    target_month := target_month - 12;
  END LOOP;
  WHILE target_month < 1 LOOP
    target_month := target_month + 12;
  END LOOP;

  RETURN QUERY
  SELECT 
    e.id,
    e.name,
    COALESCE(SUM(s.total_amount), 0) as total_sales,
    e.salary,
    CASE 
      WHEN e.salary > 0 THEN ROUND((SUM(s.total_amount)::DECIMAL / e.salary), 2)
      ELSE 0
    END as performance_ratio,
    CASE 
      WHEN SUM(s.total_amount) > e.salary * 5 THEN 'Bonus berish'
      WHEN SUM(s.total_amount) > e.salary * 3 THEN 'Yaxshi'
      WHEN SUM(s.total_amount) > e.salary THEN 'Norma'
      ELSE 'Rivojlantirish kerak'
    END as suggestion
  FROM employees e
  LEFT JOIN sales s ON s.employee_id = e.id 
    AND EXTRACT(MONTH FROM s.created_at) = target_month
    AND EXTRACT(YEAR FROM s.created_at) = target_year
  WHERE e.user_id = user_id_param
  GROUP BY e.id, e.name, e.salary;
END;
$$ LANGUAGE plpgsql;

-- 9. Funksiya: Eng ko'p sotilgan tovarlar
CREATE OR REPLACE FUNCTION get_top_products(user_id_param UUID, limit_param INTEGER DEFAULT 10)
RETURNS TABLE (
  product_name VARCHAR(255),
  total_quantity BIGINT,
  total_revenue BIGINT,
  profit_percentage DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.name,
    COALESCE(SUM(si.quantity), 0) as total_quantity,
    COALESCE(SUM(si.total_price), 0) as total_revenue,
    CASE 
      WHEN p.cost_price > 0 THEN ROUND(((p.selling_price - p.cost_price)::DECIMAL / p.cost_price) * 100, 2)
      ELSE 0
    END as profit_percentage
  FROM products p
  LEFT JOIN sale_items si ON si.product_id = p.id
  WHERE p.user_id = user_id_param
  GROUP BY p.id, p.name, p.cost_price, p.selling_price
  ORDER BY total_revenue DESC
  LIMIT limit_param;
END;
$$ LANGUAGE plpgsql;

-- 10. Funksiya: AI ga so'rov yuborish (biznes tahlili uchun)
CREATE OR REPLACE FUNCTION request_ai_analysis(
  user_id_param UUID,
  product_name_param TEXT,
  cost_price_param DECIMAL,
  selling_price_param DECIMAL
)
RETURNS TEXT AS $$
DECLARE
  profit DECIMAL;
  profit_percentage DECIMAL;
  result TEXT;
BEGIN
  -- Foyda hisoblash
  profit := selling_price_param - cost_price_param;
  profit_percentage := (profit / cost_price_param) * 100;
  
  result := 'Tovar: ' || product_name_param || E'\n';
  result := result || 'Tannarx: ' || cost_price_param || E'\n';
  result := result || 'Sotuv narxi: ' || selling_price_param || E'\n';
  result := result || 'Foyda: ' || profit || ' (' || ROUND(profit_percentage, 2) || '%)';
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- RLS (Row Level Security) sozlamalari
-- =====================================================

-- AI Chat Usage uchun RLS
ALTER TABLE ai_chat_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ai_chat_usage" 
ON ai_chat_usage FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ai_chat_usage" 
ON ai_chat_usage FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ai_chat_usage" 
ON ai_chat_usage FOR UPDATE 
USING (auth.uid() = user_id);

-- AI Chat History uchun RLS
ALTER TABLE ai_chat_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ai_chat_history" 
ON ai_chat_history FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ai_chat_history" 
ON ai_chat_history FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Notifications uchun RLS (agar mavjud bo'lmasa)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" 
ON notifications FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own notifications" ON notifications;
CREATE POLICY "Users can insert own notifications" 
ON notifications FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" 
ON notifications FOR UPDATE 
USING (auth.uid() = user_id);

-- =====================================================
-- Tugatish
-- =====================================================
COMMENT ON TABLE ai_chat_usage IS 'AI chat kunlik foydalanish statistikasi';
COMMENT ON TABLE ai_chat_history IS 'AI chat suhbat tarixi';
COMMENT ON FUNCTION get_ai_chat_remaining IS 'Foydalanuvchining qolgan kunlik limitini oladi';
COMMENT ON FUNCTION get_monthly_comparison IS 'Oylik sotuvlar solishtirmasi';
COMMENT ON FUNCTION get_employee_performance IS 'Xodimlar samaradorligi tahlili';
