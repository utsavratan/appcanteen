
-- Allow public insert/update/delete on banners
CREATE POLICY "Banners can be inserted" ON public.banners FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Banners can be updated" ON public.banners FOR UPDATE TO public USING (true);
CREATE POLICY "Banners can be deleted" ON public.banners FOR DELETE TO public USING (true);

-- Allow public insert/update/delete on announcements
CREATE POLICY "Announcements can be inserted" ON public.announcements FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Announcements can be updated" ON public.announcements FOR UPDATE TO public USING (true);
CREATE POLICY "Announcements can be deleted" ON public.announcements FOR DELETE TO public USING (true);

-- Allow public insert/update/delete on coupons
CREATE POLICY "Coupons can be inserted" ON public.coupons FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Coupons can be updated" ON public.coupons FOR UPDATE TO public USING (true);
CREATE POLICY "Coupons can be deleted" ON public.coupons FOR DELETE TO public USING (true);

-- Allow public insert/update/delete on categories
CREATE POLICY "Categories can be inserted" ON public.categories FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Categories can be updated" ON public.categories FOR UPDATE TO public USING (true);
CREATE POLICY "Categories can be deleted" ON public.categories FOR DELETE TO public USING (true);

-- Allow public insert/update/delete on menu_items
CREATE POLICY "Menu items can be inserted" ON public.menu_items FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Menu items can be updated" ON public.menu_items FOR UPDATE TO public USING (true);
CREATE POLICY "Menu items can be deleted" ON public.menu_items FOR DELETE TO public USING (true);
