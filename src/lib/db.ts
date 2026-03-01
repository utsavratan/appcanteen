import { supabase } from '@/integrations/supabase/client';
import type { MenuItem, Category, Order, OrderItem, Coupon, Banner, Announcement, AppSetting, AuditLog, Customer } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export const fetchCategories = async (): Promise<Category[]> => {
  const { data, error } = await db.from('categories').select('*').eq('is_active', true).order('sort_order');
  if (error) throw error;
  return data || [];
};

export const fetchMenuItems = async (): Promise<MenuItem[]> => {
  const { data, error } = await db.from('menu_items').select('*').order('sort_order');
  if (error) throw error;
  return data || [];
};

export const fetchAvailableMenuItems = async (): Promise<MenuItem[]> => {
  const { data, error } = await db.from('menu_items').select('*').eq('is_available', true).order('sort_order');
  if (error) throw error;
  return data || [];
};

export const createMenuItem = async (item: Partial<MenuItem>) => {
  const { data, error } = await db.from('menu_items').insert(item).select().single();
  if (error) throw error;
  return data;
};

export const updateMenuItem = async (id: string, updates: Partial<MenuItem>) => {
  const { data, error } = await db.from('menu_items').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
};

export const deleteMenuItem = async (id: string) => {
  const { error } = await db.from('menu_items').delete().eq('id', id);
  if (error) throw error;
};

export const fetchOrders = async (filters?: { status?: string; date?: string }): Promise<Order[]> => {
  let query = db.from('orders').select('*').order('created_at', { ascending: false });
  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.date) {
    const start = new Date(filters.date);
    const end = new Date(filters.date);
    end.setDate(end.getDate() + 1);
    query = query.gte('created_at', start.toISOString()).lt('created_at', end.toISOString());
  }
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

export const fetchOrderItems = async (orderId: string): Promise<OrderItem[]> => {
  const { data, error } = await db.from('order_items').select('*').eq('order_id', orderId);
  if (error) throw error;
  return data || [];
};

export const createOrder = async (order: Partial<Order>): Promise<Order> => {
  const { data, error } = await db.from('orders').insert(order).select().single();
  if (error) throw error;
  return data;
};

export const createOrderItems = async (items: Partial<OrderItem>[]) => {
  const { error } = await db.from('order_items').insert(items);
  if (error) throw error;
};

export const updateOrder = async (id: string, updates: Partial<Order>) => {
  const { data, error } = await db.from('orders').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
};

export const fetchCoupons = async (): Promise<Coupon[]> => {
  const { data, error } = await db.from('coupons').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const validateCoupon = async (code: string, subtotal: number): Promise<Coupon | null> => {
  const { data, error } = await db.from('coupons').select('*').eq('code', code.toUpperCase()).eq('is_active', true).single();
  if (error || !data) return null;
  const coupon = data as Coupon;
  if (coupon.min_order_amount && subtotal < coupon.min_order_amount) return null;
  if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) return null;
  if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) return null;
  return coupon;
};

export const fetchBanners = async (): Promise<Banner[]> => {
  const { data, error } = await db.from('banners').select('*').eq('is_active', true).order('sort_order');
  if (error) throw error;
  return data || [];
};

export const fetchAnnouncements = async (): Promise<Announcement[]> => {
  const { data, error } = await db.from('announcements').select('*').eq('is_active', true).order('priority', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const fetchSettings = async (): Promise<Record<string, unknown>> => {
  const { data, error } = await db.from('app_settings').select('*');
  if (error) throw error;
  const settings: Record<string, unknown> = {};
  (data || []).forEach((s: AppSetting) => { settings[s.key] = s.value; });
  return settings;
};

export const updateSetting = async (key: string, value: unknown) => {
  const { error } = await db.from('app_settings').upsert({ key, value });
  if (error) throw error;
};

export const getOrCreateCustomer = async (sessionId: string, name?: string, mobile?: string): Promise<Customer> => {
  const { data: existing } = await db.from('customers').select('*').eq('session_id', sessionId).single();
  if (existing) {
    if (name || mobile) {
      const updates: Partial<Customer> = {};
      if (name) updates.name = name;
      if (mobile) updates.mobile = mobile;
      const { data: updated } = await db.from('customers').update(updates).eq('id', existing.id).select().single();
      return updated || existing;
    }
    return existing;
  }
  const { data: created, error } = await db.from('customers').insert({ session_id: sessionId, name: name || null, mobile: mobile || null }).select().single();
  if (error) throw error;
  return created;
};

export const addAuditLog = async (action: string, actorRole: string, details: Record<string, unknown> = {}) => {
  await db.from('audit_logs').insert({ action, actor_role: actorRole, details });
};

export const fetchAuditLogs = async (): Promise<AuditLog[]> => {
  const { data, error } = await db.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100);
  if (error) throw error;
  return data || [];
};

export const uploadMenuImage = async (file: File): Promise<string> => {
  const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
  const { error } = await supabase.storage.from('menu-images').upload(fileName, file);
  if (error) throw error;
  const { data: urlData } = supabase.storage.from('menu-images').getPublicUrl(fileName);
  return urlData.publicUrl;
};

export const subscribeToOrders = (callback: (payload: unknown) => void) => {
  return db
    .channel('orders-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, callback)
    .subscribe();
};

export { supabase };
