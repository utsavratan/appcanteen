import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogOut, Shield, Plus, Pencil, Trash2, Check, X, Upload, Download, Megaphone, Image, FileText, BarChart3, Settings, ShoppingBag, CreditCard, Tag, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import {
  fetchMenuItems, createMenuItem, updateMenuItem, deleteMenuItem,
  fetchOrders, fetchOrderItems, updateOrder, fetchCategories, fetchAllCategories,
  fetchCoupons, deleteCoupon, fetchSettings, updateSetting, uploadMenuImage,
  addAuditLog, fetchAuditLogs, subscribeToOrders,
  fetchBanners, createBanner, updateBanner, deleteBanner,
  fetchAllAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement,
} from '@/lib/db';
import { supabase } from '@/integrations/supabase/client';
import { clearRole, getRole } from '@/lib/session';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/lib/types';
import type { Order, OrderItem, MenuItem, Category, Coupon, OrderStatus, Banner, Announcement, AuditLog } from '@/lib/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const CHART_COLORS = ['hsl(24, 95%, 53%)', 'hsl(173, 58%, 39%)', 'hsl(348, 83%, 52%)', 'hsl(38, 92%, 50%)', 'hsl(262, 83%, 58%)', 'hsl(142, 71%, 45%)'];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('menu');

  useEffect(() => {
    if (getRole() !== 'admin') { navigate('/login'); return; }
  }, []);

  const handleLogout = () => { clearRole(); navigate('/login'); };

  return (
    <div className="min-h-screen bg-background gradient-mesh pb-8">
      <div className="sticky top-0 z-40 glass-strong shadow-glass">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl gradient-accent flex items-center justify-center">
              <Shield className="w-5 h-5 text-accent-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-foreground">Admin Panel</h1>
              <p className="text-[10px] text-muted-foreground">Canteen Management</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="rounded-xl"><LogOut className="w-4 h-4" /></Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full glass mb-4 flex-wrap h-auto gap-1 p-1.5 rounded-2xl">
            <TabsTrigger value="menu" className="text-xs rounded-xl font-bold gap-1"><ShoppingBag className="w-3 h-3" /> Menu</TabsTrigger>
            <TabsTrigger value="orders" className="text-xs rounded-xl font-bold gap-1"><FileText className="w-3 h-3" /> Orders</TabsTrigger>
            <TabsTrigger value="verify" className="text-xs rounded-xl font-bold gap-1"><CreditCard className="w-3 h-3" /> Verify</TabsTrigger>
            <TabsTrigger value="coupons" className="text-xs rounded-xl font-bold gap-1"><Tag className="w-3 h-3" /> Coupons</TabsTrigger>
            <TabsTrigger value="banners" className="text-xs rounded-xl font-bold gap-1"><Image className="w-3 h-3" /> Banners</TabsTrigger>
            <TabsTrigger value="announce" className="text-xs rounded-xl font-bold gap-1"><Megaphone className="w-3 h-3" /> Announce</TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs rounded-xl font-bold gap-1"><BarChart3 className="w-3 h-3" /> Analytics</TabsTrigger>
            <TabsTrigger value="logs" className="text-xs rounded-xl font-bold gap-1"><Activity className="w-3 h-3" /> Logs</TabsTrigger>
            <TabsTrigger value="settings" className="text-xs rounded-xl font-bold gap-1"><Settings className="w-3 h-3" /> Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="menu"><MenuTab /></TabsContent>
          <TabsContent value="orders"><OrdersTab /></TabsContent>
          <TabsContent value="verify"><VerifyTab /></TabsContent>
          <TabsContent value="coupons"><CouponsTab /></TabsContent>
          <TabsContent value="banners"><BannersTab /></TabsContent>
          <TabsContent value="announce"><AnnouncementsTab /></TabsContent>
          <TabsContent value="analytics"><AnalyticsTab /></TabsContent>
          <TabsContent value="logs"><AuditLogsTab /></TabsContent>
          <TabsContent value="settings"><SettingsTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

/* ============ MENU TAB ============ */
const MenuTab = () => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', description: '', price: '', category_id: '', item_type: 'veg' as MenuItem['item_type'],
    preparation_time_mins: '15', stock_quantity: '100', tags: '', is_trending: false, is_recommended: false,
  });

  useEffect(() => { loadData(); }, []);
  const loadData = async () => {
    const [menuItems, cats] = await Promise.all([fetchMenuItems(), fetchAllCategories()]);
    setItems(menuItems); setCategories(cats); setLoading(false);
  };

  const resetForm = () => {
    setForm({ name: '', description: '', price: '', category_id: '', item_type: 'veg', preparation_time_mins: '15', stock_quantity: '100', tags: '', is_trending: false, is_recommended: false });
    setImageFile(null); setImagePreview(null); setEditingItem(null);
  };

  const openEdit = (item: MenuItem) => {
    setEditingItem(item);
    setForm({ name: item.name, description: item.description || '', price: String(item.price), category_id: item.category_id || '', item_type: item.item_type, preparation_time_mins: String(item.preparation_time_mins), stock_quantity: String(item.stock_quantity), tags: item.tags?.join(', ') || '', is_trending: item.is_trending, is_recommended: item.is_recommended });
    setImagePreview(item.image_url); setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.price) { toast.error('Name and price required'); return; }
    setSaving(true);
    try {
      let imageUrl = editingItem?.image_url || null;
      if (imageFile) imageUrl = await uploadMenuImage(imageFile);
      const itemData = {
        name: form.name, description: form.description || null, price: parseFloat(form.price),
        category_id: form.category_id || null, item_type: form.item_type,
        preparation_time_mins: parseInt(form.preparation_time_mins) || 15, stock_quantity: parseInt(form.stock_quantity) || 100,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean), image_url: imageUrl,
        is_trending: form.is_trending, is_recommended: form.is_recommended,
      };
      if (editingItem) {
        await updateMenuItem(editingItem.id, itemData);
        await addAuditLog('menu_item_updated', 'admin', { item_id: editingItem.id, name: form.name });
        toast.success('Item updated!');
      } else {
        await createMenuItem(itemData);
        await addAuditLog('menu_item_created', 'admin', { name: form.name });
        toast.success('Item added!');
      }
      await loadData(); setShowForm(false); resetForm();
    } catch (e: any) { toast.error(e?.message || 'Failed to save'); }
    setSaving(false);
  };

  const handleDelete = async (item: MenuItem) => {
    if (!confirm(`Delete "${item.name}"?`)) return;
    try {
      await deleteMenuItem(item.id);
      await addAuditLog('menu_item_deleted', 'admin', { item_id: item.id, name: item.name });
      toast.success('Deleted'); loadData();
    } catch { toast.error('Failed'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-extrabold text-foreground">Menu Items ({items.length})</h2>
        <Button size="sm" className="gradient-primary text-primary-foreground border-0 rounded-xl font-bold" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Add Item
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {items.map((item) => (
          <div key={item.id} className="glass-card shadow-glass rounded-2xl p-3 flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-muted flex-shrink-0">
              {item.image_url ? <img src={item.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl">🍽️</div>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className={item.item_type === 'veg' || item.item_type === 'beverages' ? 'veg-indicator' : 'nonveg-indicator'} style={{ width: 14, height: 14 }} />
                <p className="font-bold text-sm text-foreground truncate">{item.name}</p>
              </div>
              <p className="text-xs text-muted-foreground">₹{item.price} • Stock: {item.stock_quantity} • {item.preparation_time_mins}min</p>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant={item.is_available ? 'default' : 'secondary'} className="text-[9px] font-bold">{item.is_available ? 'Active' : 'Off'}</Badge>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(item)}><Pencil className="w-3 h-3" /></Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(item)}><Trash2 className="w-3 h-3" /></Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); resetForm(); } }}>
        <DialogContent className="glass-strong max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border-0">
          <DialogHeader><DialogTitle className="font-extrabold">{editingItem ? 'Edit Item' : 'Add New Item'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              {imagePreview ? (
                <div className="relative w-full h-40 rounded-2xl overflow-hidden bg-muted">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <label className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition cursor-pointer">
                    <span className="text-white text-sm font-bold">Change</span>
                    <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setImageFile(f); setImagePreview(URL.createObjectURL(f)); } }} className="hidden" />
                  </label>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 rounded-2xl border-2 border-dashed border-border hover:border-primary transition cursor-pointer bg-muted/30">
                  <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground font-medium">Upload Image</span>
                  <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setImageFile(f); setImagePreview(URL.createObjectURL(f)); } }} className="hidden" />
                </label>
              )}
            </div>
            <Input placeholder="Item name *" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className="rounded-xl" />
            <Textarea placeholder="Description" value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} className="rounded-xl" rows={2} />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Price *" type="number" value={form.price} onChange={(e) => setForm(f => ({ ...f, price: e.target.value }))} className="rounded-xl" />
              <Select value={form.item_type} onValueChange={(v) => setForm(f => ({ ...f, item_type: v as MenuItem['item_type'] }))}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="veg">🟢 Veg</SelectItem>
                  <SelectItem value="non_veg">🔴 Non-Veg</SelectItem>
                  <SelectItem value="beverages">☕ Beverages</SelectItem>
                  <SelectItem value="snacks">🍿 Snacks</SelectItem>
                  <SelectItem value="meals">🍱 Meals</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Select value={form.category_id} onValueChange={(v) => setForm(f => ({ ...f, category_id: v }))}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>)}</SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Prep time (min)" type="number" value={form.preparation_time_mins} onChange={(e) => setForm(f => ({ ...f, preparation_time_mins: e.target.value }))} className="rounded-xl" />
              <Input placeholder="Stock qty" type="number" value={form.stock_quantity} onChange={(e) => setForm(f => ({ ...f, stock_quantity: e.target.value }))} className="rounded-xl" />
            </div>
            <Input placeholder="Tags (comma-separated)" value={form.tags} onChange={(e) => setForm(f => ({ ...f, tags: e.target.value }))} className="rounded-xl" />
            <div className="flex items-center justify-between"><span className="text-sm text-foreground font-medium">Trending</span><Switch checked={form.is_trending} onCheckedChange={(v) => setForm(f => ({ ...f, is_trending: v }))} /></div>
            <div className="flex items-center justify-between"><span className="text-sm text-foreground font-medium">Recommended</span><Switch checked={form.is_recommended} onCheckedChange={(v) => setForm(f => ({ ...f, is_recommended: v }))} /></div>
            <Button className="w-full gradient-primary text-primary-foreground border-0 rounded-xl h-11 font-bold" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editingItem ? 'Update Item' : 'Add Item'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ============ ORDERS TAB ============ */
const OrdersTab = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadOrders();
    const channel = subscribeToOrders(() => loadOrders());
    return () => { supabase.removeChannel(channel); };
  }, []);
  const loadOrders = async () => { const data = await fetchOrders(); setOrders(data); setLoading(false); };

  const handleStatus = async (id: string, status: OrderStatus) => {
    await updateOrder(id, { status, ...(status === 'completed' ? { completed_at: new Date().toISOString() } : {}) });
    await addAuditLog(`order_${status}`, 'admin', { order_id: id });
    toast.success(`Order updated`); loadOrders();
  };

  const exportCSV = () => {
    const filtered = statusFilter === 'all' ? orders : orders.filter(o => o.status === statusFilter);
    const headers = ['Token', 'Status', 'Payment', 'Subtotal', 'Tax', 'Discount', 'Total', 'Date', 'Transaction ID'];
    const rows = filtered.map(o => [o.token_number, o.status, o.payment_mode || '', o.subtotal, o.tax_amount, o.discount_amount, o.grand_total, new Date(o.created_at).toLocaleString(), o.transaction_id || '']);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported!');
  };

  const filtered = statusFilter === 'all' ? orders : orders.filter(o => o.status === statusFilter);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-extrabold text-foreground">Orders ({filtered.length})</h2>
        <Button size="sm" variant="outline" className="rounded-xl text-xs font-bold" onClick={exportCSV}>
          <Download className="w-3 h-3 mr-1" /> Export CSV
        </Button>
      </div>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-4">
        {['all', 'pending_payment', 'awaiting_verification', 'paid', 'preparing', 'ready', 'completed', 'cancelled'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap ${statusFilter === s ? 'gradient-primary text-primary-foreground' : 'glass text-foreground'}`}>
            {s === 'all' ? 'All' : ORDER_STATUS_LABELS[s as OrderStatus]}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {filtered.map(order => (
          <div key={order.id} className="glass-card shadow-glass rounded-2xl p-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-black text-foreground">#{order.token_number}</span>
                <span className="text-xs text-muted-foreground ml-2">{new Date(order.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <Badge className={`${ORDER_STATUS_COLORS[order.status]} border-0 text-[10px] font-bold`}>{ORDER_STATUS_LABELS[order.status]}</Badge>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm font-bold text-foreground">₹{order.grand_total} • {order.payment_mode?.toUpperCase()}</span>
              <div className="flex gap-1">
                {order.status === 'preparing' && <Button size="sm" className="text-xs h-7 gradient-secondary text-secondary-foreground border-0 rounded-xl font-bold" onClick={() => handleStatus(order.id, 'ready')}>Ready</Button>}
                {order.status === 'ready' && <Button size="sm" className="text-xs h-7 gradient-primary text-primary-foreground border-0 rounded-xl font-bold" onClick={() => handleStatus(order.id, 'completed')}>Complete</Button>}
                <Button size="sm" variant="outline" className="text-xs h-7 rounded-xl font-bold" onClick={() => window.open(`/bill/${order.id}`, '_blank')}>Bill</Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ============ VERIFY TAB ============ */
const VerifyTab = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  useEffect(() => { loadPending(); }, []);
  const loadPending = async () => { const data = await fetchOrders({ status: 'awaiting_verification' }); setOrders(data); };

  const handleVerify = async (id: string, approve: boolean) => {
    await updateOrder(id, { status: approve ? 'paid' : 'cancelled' });
    await addAuditLog(approve ? 'payment_verified' : 'payment_rejected', 'admin', { order_id: id });
    toast.success(approve ? 'Payment verified!' : 'Payment rejected'); loadPending();
  };

  return (
    <div>
      <h2 className="text-lg font-extrabold text-foreground mb-4">UPI Transaction Verification</h2>
      {orders.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground"><p className="text-5xl mb-2">✅</p><p className="font-medium">No pending verifications</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {orders.map(order => (
            <div key={order.id} className="glass-card shadow-glass rounded-2xl p-4">
              <div className="flex justify-between items-start mb-2">
                <div><p className="font-black text-foreground">#{order.token_number}</p><p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString()}</p></div>
                <span className="font-black text-primary text-lg">₹{order.grand_total}</span>
              </div>
              <div className="bg-muted/50 rounded-xl p-3 mb-3">
                <p className="text-xs text-muted-foreground font-bold">Transaction ID</p>
                <p className="font-mono font-black text-foreground text-base mt-0.5">{order.transaction_id || 'N/A'}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 gradient-secondary text-secondary-foreground border-0 rounded-xl font-bold" onClick={() => handleVerify(order.id, true)}>
                  <Check className="w-3 h-3 mr-1" /> Approve
                </Button>
                <Button size="sm" variant="outline" className="flex-1 rounded-xl text-destructive font-bold" onClick={() => handleVerify(order.id, false)}>
                  <X className="w-3 h-3 mr-1" /> Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ============ COUPONS TAB ============ */
const CouponsTab = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: '', description: '', discount_type: 'percentage', discount_value: '', min_order_amount: '0', max_discount: '', usage_limit: '' });

  useEffect(() => { fetchCoupons().then(setCoupons); }, []);

  const handleSave = async () => {
    if (!form.code || !form.discount_value) { toast.error('Code and discount required'); return; }
    try {
      await db.from('coupons').insert({
        code: form.code.toUpperCase(), description: form.description || null, discount_type: form.discount_type,
        discount_value: parseFloat(form.discount_value), min_order_amount: parseFloat(form.min_order_amount) || 0,
        max_discount: form.max_discount ? parseFloat(form.max_discount) : null, usage_limit: form.usage_limit ? parseInt(form.usage_limit) : null,
      });
      await addAuditLog('coupon_created', 'admin', { code: form.code });
      toast.success('Coupon created!'); setShowForm(false); fetchCoupons().then(setCoupons);
    } catch { toast.error('Failed'); }
  };

  const toggleCoupon = async (id: string, isActive: boolean) => {
    await db.from('coupons').update({ is_active: !isActive }).eq('id', id);
    fetchCoupons().then(setCoupons);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this coupon?')) return;
    await deleteCoupon(id); toast.success('Deleted'); fetchCoupons().then(setCoupons);
  };

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h2 className="text-lg font-extrabold text-foreground">Coupons ({coupons.length})</h2>
        <Button size="sm" className="gradient-primary text-primary-foreground border-0 rounded-xl font-bold" onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1" /> Add</Button>
      </div>
      <div className="space-y-2">
        {coupons.map(c => (
          <div key={c.id} className="glass-card shadow-glass rounded-2xl p-3 flex items-center justify-between">
            <div>
              <p className="font-mono font-black text-foreground">{c.code}</p>
              <p className="text-xs text-muted-foreground">{c.discount_type === 'percentage' ? `${c.discount_value}% off` : `₹${c.discount_value} off`} • Used: {c.used_count}{c.usage_limit ? `/${c.usage_limit}` : ''}</p>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={c.is_active} onCheckedChange={() => toggleCoupon(c.id, c.is_active)} />
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(c.id)}><Trash2 className="w-3 h-3" /></Button>
            </div>
          </div>
        ))}
      </div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="glass-strong max-w-sm rounded-3xl border-0">
          <DialogHeader><DialogTitle className="font-extrabold">New Coupon</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Code (e.g. SAVE20)" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} className="rounded-xl font-mono" />
            <Input placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="rounded-xl" />
            <Select value={form.discount_type} onValueChange={v => setForm(f => ({ ...f, discount_type: v }))}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="percentage">Percentage</SelectItem><SelectItem value="fixed">Fixed Amount</SelectItem></SelectContent>
            </Select>
            <Input placeholder="Discount value" type="number" value={form.discount_value} onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))} className="rounded-xl" />
            <Input placeholder="Min order amount" type="number" value={form.min_order_amount} onChange={e => setForm(f => ({ ...f, min_order_amount: e.target.value }))} className="rounded-xl" />
            <Button className="w-full gradient-primary text-primary-foreground border-0 rounded-xl font-bold" onClick={handleSave}>Create Coupon</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ============ BANNERS TAB ============ */
const BannersTab = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', image_url: '', link_url: '' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchBanners().then(setBanners); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      let imageUrl = form.image_url;
      if (imageFile) imageUrl = await uploadMenuImage(imageFile);
      if (!imageUrl) { toast.error('Image required'); setSaving(false); return; }
      await createBanner({ title: form.title || null, image_url: imageUrl, link_url: form.link_url || null });
      await addAuditLog('banner_created', 'admin', { title: form.title });
      toast.success('Banner added!'); setShowForm(false); setForm({ title: '', image_url: '', link_url: '' }); setImageFile(null);
      fetchBanners().then(setBanners);
    } catch { toast.error('Failed'); }
    setSaving(false);
  };

  const handleToggle = async (b: Banner) => {
    await updateBanner(b.id, { is_active: !b.is_active }); fetchBanners().then(setBanners);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete banner?')) return;
    await deleteBanner(id); toast.success('Deleted'); fetchBanners().then(setBanners);
  };

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h2 className="text-lg font-extrabold text-foreground">Banners ({banners.length})</h2>
        <Button size="sm" className="gradient-primary text-primary-foreground border-0 rounded-xl font-bold" onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1" /> Add</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {banners.map(b => (
          <div key={b.id} className="glass-card shadow-glass rounded-2xl overflow-hidden">
            <img src={b.image_url} alt={b.title || ''} className="w-full h-32 object-cover" />
            <div className="p-3 flex items-center justify-between">
              <div><p className="font-bold text-sm text-foreground">{b.title || 'Untitled'}</p><p className="text-xs text-muted-foreground">{b.is_active ? 'Active' : 'Inactive'}</p></div>
              <div className="flex items-center gap-1">
                <Switch checked={b.is_active} onCheckedChange={() => handleToggle(b)} />
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(b.id)}><Trash2 className="w-3 h-3" /></Button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="glass-strong max-w-sm rounded-3xl border-0">
          <DialogHeader><DialogTitle className="font-extrabold">Add Banner</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Banner title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="rounded-xl" />
            <label className="flex flex-col items-center justify-center w-full h-32 rounded-2xl border-2 border-dashed border-border hover:border-primary transition cursor-pointer bg-muted/30">
              {imageFile ? <span className="text-sm text-foreground font-bold">{imageFile.name}</span> : <><Upload className="w-6 h-6 text-muted-foreground mb-1" /><span className="text-xs text-muted-foreground">Upload Banner Image</span></>}
              <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} className="hidden" />
            </label>
            <Input placeholder="Link URL (optional)" value={form.link_url} onChange={e => setForm(f => ({ ...f, link_url: e.target.value }))} className="rounded-xl" />
            <Button className="w-full gradient-primary text-primary-foreground border-0 rounded-xl font-bold" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Add Banner'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ============ ANNOUNCEMENTS TAB ============ */
const AnnouncementsTab = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', message: '', priority: '0' });

  useEffect(() => { fetchAllAnnouncements().then(setAnnouncements); }, []);

  const handleSave = async () => {
    if (!form.title || !form.message) { toast.error('Title and message required'); return; }
    await createAnnouncement({ title: form.title, message: form.message, priority: parseInt(form.priority) || 0 });
    await addAuditLog('announcement_created', 'admin', { title: form.title });
    toast.success('Announcement broadcast!'); setShowForm(false); setForm({ title: '', message: '', priority: '0' });
    fetchAllAnnouncements().then(setAnnouncements);
  };

  const handleToggle = async (a: Announcement) => {
    await updateAnnouncement(a.id, { is_active: !a.is_active }); fetchAllAnnouncements().then(setAnnouncements);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete?')) return;
    await deleteAnnouncement(id); toast.success('Deleted'); fetchAllAnnouncements().then(setAnnouncements);
  };

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h2 className="text-lg font-extrabold text-foreground">Announcements ({announcements.length})</h2>
        <Button size="sm" className="gradient-primary text-primary-foreground border-0 rounded-xl font-bold" onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1" /> Broadcast</Button>
      </div>
      <div className="space-y-2">
        {announcements.map(a => (
          <div key={a.id} className="glass-card shadow-glass rounded-2xl p-3 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0 mt-0.5">
              <Megaphone className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-foreground">{a.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.message}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Priority: {a.priority} • {a.is_active ? '🟢 Active' : '⚪ Inactive'}</p>
            </div>
            <div className="flex items-center gap-1">
              <Switch checked={a.is_active} onCheckedChange={() => handleToggle(a)} />
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(a.id)}><Trash2 className="w-3 h-3" /></Button>
            </div>
          </div>
        ))}
      </div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="glass-strong max-w-sm rounded-3xl border-0">
          <DialogHeader><DialogTitle className="font-extrabold">New Announcement</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="rounded-xl" />
            <Textarea placeholder="Message" value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} className="rounded-xl" rows={3} />
            <Input placeholder="Priority (0-10)" type="number" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className="rounded-xl" />
            <Button className="w-full gradient-primary text-primary-foreground border-0 rounded-xl font-bold" onClick={handleSave}>Broadcast 📢</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ============ ANALYTICS TAB ============ */
const AnalyticsTab = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  useEffect(() => { fetchOrders().then(setOrders); }, []);

  const getRevenueData = () => {
    const grouped: Record<string, number> = {};
    orders.filter(o => ['paid', 'preparing', 'ready', 'completed'].includes(o.status)).forEach(o => {
      const d = new Date(o.created_at);
      let key: string;
      if (period === 'daily') key = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      else if (period === 'weekly') { const week = Math.ceil(d.getDate() / 7); key = `W${week} ${d.toLocaleDateString('en-IN', { month: 'short' })}`; }
      else key = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      grouped[key] = (grouped[key] || 0) + Number(o.grand_total);
    });
    return Object.entries(grouped).slice(-12).map(([date, revenue]) => ({ date, revenue: Math.round(revenue) }));
  };

  const getPaymentSplit = () => {
    const cash = orders.filter(o => o.payment_mode === 'cash').length;
    const upi = orders.filter(o => o.payment_mode === 'upi').length;
    return [{ name: 'Cash', value: cash }, { name: 'UPI', value: upi }].filter(d => d.value > 0);
  };

  const totalRevenue = orders.filter(o => ['paid', 'preparing', 'ready', 'completed'].includes(o.status)).reduce((s, o) => s + Number(o.grand_total), 0);
  const totalOrders = orders.length;
  const avgOrderValue = totalOrders ? Math.round(totalRevenue / totalOrders) : 0;

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card shadow-glass rounded-2xl p-4 text-center">
          <p className="text-xs text-muted-foreground font-bold">Revenue</p>
          <p className="text-xl font-black text-primary mt-1">₹{totalRevenue.toLocaleString()}</p>
        </div>
        <div className="glass-card shadow-glass rounded-2xl p-4 text-center">
          <p className="text-xs text-muted-foreground font-bold">Orders</p>
          <p className="text-xl font-black text-foreground mt-1">{totalOrders}</p>
        </div>
        <div className="glass-card shadow-glass rounded-2xl p-4 text-center">
          <p className="text-xs text-muted-foreground font-bold">Avg Value</p>
          <p className="text-xl font-black text-canteen-teal mt-1">₹{avgOrderValue}</p>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="glass-card shadow-glass rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-foreground">Revenue Trend</h3>
          <div className="flex gap-1">
            {(['daily', 'weekly', 'monthly'] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${period === p ? 'gradient-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={getRevenueData()} margin={{ left: -10, right: 10 }}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="revenue" stroke="hsl(24, 95%, 53%)" strokeWidth={2.5} dot={{ fill: 'hsl(24, 95%, 53%)', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Payment Split */}
      <div className="glass-card shadow-glass rounded-2xl p-4">
        <h3 className="font-bold text-foreground mb-3">Payment Mode Split</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={getPaymentSplit()} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`}>
                {getPaymentSplit().map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

/* ============ AUDIT LOGS TAB ============ */
const AuditLogsTab = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAuditLogs(200).then(l => { setLogs(l); setLoading(false); }); }, []);

  const exportCSV = () => {
    const headers = ['Date', 'Action', 'Role', 'Details'];
    const rows = logs.map(l => [new Date(l.created_at).toLocaleString(), l.action, l.actor_role, JSON.stringify(l.details)]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Logs exported!');
  };

  const getRoleColor = (role: string) => {
    if (role === 'admin') return 'gradient-accent';
    if (role === 'chef') return 'gradient-secondary';
    return 'gradient-primary';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-extrabold text-foreground">Audit Logs ({logs.length})</h2>
        <Button size="sm" variant="outline" className="rounded-xl text-xs font-bold" onClick={exportCSV}>
          <Download className="w-3 h-3 mr-1" /> Export
        </Button>
      </div>
      <div className="space-y-1.5">
        {logs.map(log => (
          <div key={log.id} className="glass-card rounded-xl p-3 flex items-start gap-3">
            <div className={`w-7 h-7 rounded-lg ${getRoleColor(log.actor_role)} flex items-center justify-center flex-shrink-0`}>
              <Activity className="w-3 h-3 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-foreground">{log.action.replace(/_/g, ' ')}</p>
                <Badge variant="secondary" className="text-[9px] font-bold">{log.actor_role}</Badge>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(log.created_at).toLocaleString('en-IN')}</p>
              {log.details && Object.keys(log.details).length > 0 && (
                <p className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate">{JSON.stringify(log.details)}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ============ SETTINGS TAB ============ */
const SettingsTab = () => {
  const [settings, setSettings] = useState<Record<string, unknown>>({});

  useEffect(() => { fetchSettings().then(setSettings); }, []);

  const toggle = async (key: string) => {
    const current = settings[key] === true || settings[key] === 'true';
    await updateSetting(key, !current);
    setSettings(s => ({ ...s, [key]: !current }));
    toast.success(`${key.replace(/_/g, ' ')} ${!current ? 'enabled' : 'disabled'}`);
  };

  const updateValue = async (key: string, value: string) => {
    await updateSetting(key, value);
    setSettings(s => ({ ...s, [key]: value }));
    toast.success('Updated');
  };

  const boolVal = (key: string) => settings[key] === true || settings[key] === 'true';

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-extrabold text-foreground mb-4">App Settings</h2>
      {[
        { key: 'gst_enabled', label: 'GST Enabled', type: 'toggle', icon: '🏛️' },
        { key: 'gst_rate', label: 'GST Rate (%)', type: 'number', icon: '📊' },
        { key: 'convenience_fee_enabled', label: 'Convenience Fee', type: 'toggle', icon: '💰' },
        { key: 'convenience_fee', label: 'Fee Amount (₹)', type: 'number', icon: '💵' },
        { key: 'surge_pricing_enabled', label: 'Surge Pricing', type: 'toggle', icon: '⚡' },
        { key: 'surge_pricing_multiplier', label: 'Surge Multiplier', type: 'number', icon: '📈' },
        { key: 'min_order_amount', label: 'Min Order Amount (₹)', type: 'number', icon: '🎯' },
      ].map(s => (
        <div key={s.key} className="glass-card shadow-glass rounded-2xl p-3 flex items-center justify-between">
          <span className="text-sm font-bold text-foreground">{s.icon} {s.label}</span>
          {s.type === 'toggle' ? (
            <Switch checked={boolVal(s.key)} onCheckedChange={() => toggle(s.key)} />
          ) : (
            <Input
              type="number" className="w-20 rounded-xl text-right text-sm h-8 font-bold"
              value={String(settings[s.key] || '')}
              onBlur={(e) => updateValue(s.key, e.target.value)}
              onChange={(e) => setSettings(prev => ({ ...prev, [s.key]: e.target.value }))}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default AdminDashboard;
