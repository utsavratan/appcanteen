
-- ============================================
-- CANTEEN MANAGEMENT SYSTEM - COMPLETE SCHEMA
-- ============================================

-- ENUMS
CREATE TYPE public.item_category AS ENUM ('veg', 'non_veg', 'beverages', 'snacks', 'meals');
CREATE TYPE public.order_status AS ENUM ('pending_payment', 'awaiting_verification', 'paid', 'preparing', 'ready', 'completed', 'cancelled', 'refunded');
CREATE TYPE public.payment_mode AS ENUM ('cash', 'upi');

-- ============================================
-- CATEGORIES
-- ============================================
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories are publicly readable" ON public.categories FOR SELECT USING (true);

-- ============================================
-- MENU ITEMS
-- ============================================
CREATE TABLE public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  item_type public.item_category NOT NULL DEFAULT 'veg',
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  is_trending BOOLEAN DEFAULT false,
  is_recommended BOOLEAN DEFAULT false,
  stock_quantity INT DEFAULT 100,
  low_stock_threshold INT DEFAULT 10,
  preparation_time_mins INT DEFAULT 15,
  tags TEXT[] DEFAULT '{}',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Menu items are publicly readable" ON public.menu_items FOR SELECT USING (true);

-- ============================================
-- CUSTOMERS (session-based, no auth required)
-- ============================================
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL UNIQUE,
  name TEXT,
  mobile TEXT,
  loyalty_points INT DEFAULT 0,
  wallet_balance NUMERIC(10,2) DEFAULT 0,
  favorite_items UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers can read own data" ON public.customers FOR SELECT USING (true);
CREATE POLICY "Customers can insert" ON public.customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Customers can update own data" ON public.customers FOR UPDATE USING (true);

-- ============================================
-- COUPONS
-- ============================================
CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  min_order_amount NUMERIC(10,2) DEFAULT 0,
  max_discount NUMERIC(10,2),
  usage_limit INT,
  used_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coupons are publicly readable" ON public.coupons FOR SELECT USING (true);

-- ============================================
-- ORDERS
-- ============================================
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_number SERIAL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  status public.order_status NOT NULL DEFAULT 'pending_payment',
  payment_mode public.payment_mode,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(10,2) DEFAULT 0,
  discount_amount NUMERIC(10,2) DEFAULT 0,
  convenience_fee NUMERIC(10,2) DEFAULT 0,
  grand_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  coupon_code TEXT,
  transaction_id TEXT,
  payment_screenshot_url TEXT,
  pickup_time TIMESTAMPTZ,
  notes TEXT,
  gst_enabled BOOLEAN DEFAULT false,
  loyalty_points_used INT DEFAULT 0,
  loyalty_points_earned INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Orders are publicly readable" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Orders can be inserted" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Orders can be updated" ON public.orders FOR UPDATE USING (true);

-- ============================================
-- ORDER ITEMS
-- ============================================
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  item_price NUMERIC(10,2) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Order items are publicly readable" ON public.order_items FOR SELECT USING (true);
CREATE POLICY "Order items can be inserted" ON public.order_items FOR INSERT WITH CHECK (true);

-- ============================================
-- BANNERS
-- ============================================
CREATE TABLE public.banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  image_url TEXT NOT NULL,
  link_url TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Banners are publicly readable" ON public.banners FOR SELECT USING (true);

-- ============================================
-- ANNOUNCEMENTS
-- ============================================
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  priority INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Announcements are publicly readable" ON public.announcements FOR SELECT USING (true);

-- ============================================
-- AUDIT LOGS
-- ============================================
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  actor_role TEXT NOT NULL DEFAULT 'system',
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Audit logs are publicly readable" ON public.audit_logs FOR SELECT USING (true);
CREATE POLICY "Audit logs can be inserted" ON public.audit_logs FOR INSERT WITH CHECK (true);

-- ============================================
-- APP SETTINGS (key-value store for toggles)
-- ============================================
CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Settings are publicly readable" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "Settings can be updated" ON public.app_settings FOR UPDATE USING (true);
CREATE POLICY "Settings can be inserted" ON public.app_settings FOR INSERT WITH CHECK (true);

-- Insert default settings
INSERT INTO public.app_settings (key, value) VALUES
  ('gst_enabled', 'false'),
  ('gst_rate', '5'),
  ('convenience_fee', '5'),
  ('convenience_fee_enabled', 'false'),
  ('min_order_amount', '0'),
  ('surge_pricing_enabled', 'false'),
  ('surge_pricing_multiplier', '1.5'),
  ('upi_id', '"hiya05@fam"');

-- ============================================
-- SEED DEFAULT CATEGORIES
-- ============================================
INSERT INTO public.categories (name, slug, icon, sort_order) VALUES
  ('Veg', 'veg', '🥬', 1),
  ('Non-Veg', 'non-veg', '🍗', 2),
  ('Beverages', 'beverages', '☕', 3),
  ('Snacks', 'snacks', '🍿', 4),
  ('Meals', 'meals', '🍱', 5);

-- ============================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON public.menu_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- AUTO-DISABLE MENU ITEM WHEN STOCK ENDS
-- ============================================
CREATE OR REPLACE FUNCTION public.check_stock_availability()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stock_quantity <= 0 THEN
    NEW.is_available = false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER check_menu_item_stock BEFORE UPDATE ON public.menu_items FOR EACH ROW EXECUTE FUNCTION public.check_stock_availability();

-- ============================================
-- STORAGE BUCKET FOR MENU IMAGES
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('menu-images', 'menu-images', true);

-- Storage RLS: Anyone can read
CREATE POLICY "Menu images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'menu-images');

-- Storage RLS: Anyone can upload (chef/admin will upload via UI)
CREATE POLICY "Anyone can upload menu images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'menu-images');

-- Storage RLS: Anyone can update menu images
CREATE POLICY "Anyone can update menu images" ON storage.objects FOR UPDATE USING (bucket_id = 'menu-images');

-- Storage RLS: Anyone can delete menu images
CREATE POLICY "Anyone can delete menu images" ON storage.objects FOR DELETE USING (bucket_id = 'menu-images');

-- ============================================
-- STORAGE BUCKET FOR PAYMENT SCREENSHOTS
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-screenshots', 'payment-screenshots', true);

CREATE POLICY "Payment screenshots are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'payment-screenshots');
CREATE POLICY "Anyone can upload payment screenshots" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'payment-screenshots');

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX idx_menu_items_category ON public.menu_items(category_id);
CREATE INDEX idx_menu_items_type ON public.menu_items(item_type);
CREATE INDEX idx_menu_items_available ON public.menu_items(is_available);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_customer ON public.orders(customer_id);
CREATE INDEX idx_orders_created ON public.orders(created_at DESC);
CREATE INDEX idx_order_items_order ON public.order_items(order_id);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);
