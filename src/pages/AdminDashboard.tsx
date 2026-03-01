import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogOut, Shield, Plus, Pencil, Trash2, Check, X, Upload, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { fetchMenuItems, createMenuItem, updateMenuItem, deleteMenuItem, fetchOrders, fetchOrderItems, updateOrder, fetchCategories, fetchCoupons, fetchSettings, updateSetting, uploadMenuImage, addAuditLog, subscribeToOrders } from '@/lib/db';
import { supabase } from '@/integrations/supabase/client';
import { clearRole, getRole } from '@/lib/session';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/lib/types';
import type { Order, OrderItem, MenuItem, Category, Coupon, OrderStatus } from '@/lib/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

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
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-accent flex items-center justify-center">
              <Shield className="w-4 h-4 text-accent-foreground" />
            </div>
            <h1 className="text-lg font-bold text-foreground">Admin</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}><LogOut className="w-4 h-4" /></Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full glass mb-4 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="menu" className="text-xs">Menu</TabsTrigger>
            <TabsTrigger value="orders" className="text-xs">Orders</TabsTrigger>
            <TabsTrigger value="verify" className="text-xs">Verify</TabsTrigger>
            <TabsTrigger value="coupons" className="text-xs">Coupons</TabsTrigger>
            <TabsTrigger value="settings" className="text-xs">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="menu"><MenuTab /></TabsContent>
          <TabsContent value="orders"><OrdersTab /></TabsContent>
          <TabsContent value="verify"><VerifyTab /></TabsContent>
          <TabsContent value="coupons"><CouponsTab /></TabsContent>
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
    const [menuItems, cats] = await Promise.all([fetchMenuItems(), fetchCategories()]);
    setItems(menuItems);
    setCategories(cats);
    setLoading(false);
  };

  const resetForm = () => {
    setForm({ name: '', description: '', price: '', category_id: '', item_type: 'veg', preparation_time_mins: '15', stock_quantity: '100', tags: '', is_trending: false, is_recommended: false });
    setImageFile(null);
    setImagePreview(null);
    setEditingItem(null);
  };

  const openEdit = (item: MenuItem) => {
    setEditingItem(item);
    setForm({
      name: item.name, description: item.description || '', price: String(item.price),
      category_id: item.category_id || '', item_type: item.item_type,
      preparation_time_mins: String(item.preparation_time_mins), stock_quantity: String(item.stock_quantity),
      tags: item.tags?.join(', ') || '', is_trending: item.is_trending, is_recommended: item.is_recommended,
    });
    setImagePreview(item.image_url);
    setShowForm(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    if (!form.name || !form.price) { toast.error('Name and price are required'); return; }
    setSaving(true);
    try {
      let imageUrl = editingItem?.image_url || null;
      if (imageFile) {
        imageUrl = await uploadMenuImage(imageFile);
      }

      const itemData = {
        name: form.name,
        description: form.description || null,
        price: parseFloat(form.price),
        category_id: form.category_id || null,
        item_type: form.item_type,
        preparation_time_mins: parseInt(form.preparation_time_mins) || 15,
        stock_quantity: parseInt(form.stock_quantity) || 100,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        image_url: imageUrl,
        is_trending: form.is_trending,
        is_recommended: form.is_recommended,
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

      await loadData();
      setShowForm(false);
      resetForm();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save item');
    }
    setSaving(false);
  };

  const handleDelete = async (item: MenuItem) => {
    if (!confirm(`Delete "${item.name}"?`)) return;
    try {
      await deleteMenuItem(item.id);
      await addAuditLog('menu_item_deleted', 'admin', { item_id: item.id, name: item.name });
      toast.success('Item deleted');
      loadData();
    } catch { toast.error('Failed to delete'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-foreground">Menu Items ({items.length})</h2>
        <Button size="sm" className="gradient-primary text-primary-foreground border-0 rounded-lg" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Add Item
        </Button>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="glass shadow-glass rounded-xl p-3 flex items-center gap-3">
            <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
              {item.image_url ? <img src={item.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl">🍽️</div>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className={item.item_type === 'veg' || item.item_type === 'beverages' ? 'veg-indicator' : 'nonveg-indicator'} style={{ width: 14, height: 14 }} />
                <p className="font-semibold text-sm text-foreground truncate">{item.name}</p>
              </div>
              <p className="text-xs text-muted-foreground">₹{item.price} • Stock: {item.stock_quantity} • {item.preparation_time_mins}min</p>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant={item.is_available ? 'default' : 'secondary'} className="text-[9px]">{item.is_available ? 'Active' : 'Off'}</Badge>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(item)}><Pencil className="w-3 h-3" /></Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(item)}><Trash2 className="w-3 h-3" /></Button>
            </div>
          </div>
        ))}
        {items.length === 0 && !loading && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-4xl mb-2">📋</p>
            <p>No menu items yet. Add your first item!</p>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); resetForm(); } }}>
        <DialogContent className="glass-strong max-w-md max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Item' : 'Add New Item'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* Image Upload */}
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Image</label>
              <div className="relative">
                {imagePreview ? (
                  <div className="relative w-full h-40 rounded-xl overflow-hidden bg-muted">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <label className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition cursor-pointer">
                      <span className="text-white text-sm font-medium">Change Image</span>
                      <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                    </label>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 rounded-xl border-2 border-dashed border-border hover:border-primary transition cursor-pointer bg-muted/30">
                    <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                    <span className="text-xs text-muted-foreground">Upload Image</span>
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  </label>
                )}
              </div>
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
              <SelectContent>
                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Prep time (min)" type="number" value={form.preparation_time_mins} onChange={(e) => setForm(f => ({ ...f, preparation_time_mins: e.target.value }))} className="rounded-xl" />
              <Input placeholder="Stock qty" type="number" value={form.stock_quantity} onChange={(e) => setForm(f => ({ ...f, stock_quantity: e.target.value }))} className="rounded-xl" />
            </div>
            <Input placeholder="Tags (comma-separated)" value={form.tags} onChange={(e) => setForm(f => ({ ...f, tags: e.target.value }))} className="rounded-xl" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Trending</span>
              <Switch checked={form.is_trending} onCheckedChange={(v) => setForm(f => ({ ...f, is_trending: v }))} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Recommended</span>
              <Switch checked={form.is_recommended} onCheckedChange={(v) => setForm(f => ({ ...f, is_recommended: v }))} />
            </div>
            <Button className="w-full gradient-primary text-primary-foreground border-0 rounded-xl h-11" onClick={handleSave} disabled={saving}>
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

  const loadOrders = async () => {
    const data = await fetchOrders();
    setOrders(data);
    setLoading(false);
  };

  const handleStatus = async (id: string, status: OrderStatus) => {
    await updateOrder(id, { status, ...(status === 'completed' ? { completed_at: new Date().toISOString() } : {}) });
    await addAuditLog(`order_${status}`, 'admin', { order_id: id });
    toast.success(`Order updated`);
    loadOrders();
  };

  const filtered = statusFilter === 'all' ? orders : orders.filter(o => o.status === statusFilter);

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-4">
        {['all', 'pending_payment', 'awaiting_verification', 'paid', 'preparing', 'ready', 'completed', 'cancelled'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${statusFilter === s ? 'gradient-primary text-primary-foreground' : 'glass text-foreground'}`}>
            {s === 'all' ? 'All' : ORDER_STATUS_LABELS[s as OrderStatus]}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {filtered.map(order => (
          <div key={order.id} className="glass shadow-glass rounded-xl p-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-foreground">#{order.token_number}</span>
                <span className="text-xs text-muted-foreground ml-2">{new Date(order.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <Badge className={`${ORDER_STATUS_COLORS[order.status]} border-0 text-[10px]`}>{ORDER_STATUS_LABELS[order.status]}</Badge>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm font-semibold text-foreground">₹{order.grand_total} • {order.payment_mode?.toUpperCase()}</span>
              <div className="flex gap-1">
                {order.status === 'preparing' && (
                  <Button size="sm" className="text-xs h-7 gradient-secondary text-secondary-foreground border-0 rounded-lg" onClick={() => handleStatus(order.id, 'ready')}>
                    Ready
                  </Button>
                )}
                {order.status === 'ready' && (
                  <Button size="sm" className="text-xs h-7 gradient-primary text-primary-foreground border-0 rounded-lg" onClick={() => handleStatus(order.id, 'completed')}>
                    Complete
                  </Button>
                )}
                <Button size="sm" variant="outline" className="text-xs h-7 rounded-lg" onClick={() => window.open(`/bill/${order.id}`, '_blank')}>Bill</Button>
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

  const loadPending = async () => {
    const data = await fetchOrders({ status: 'awaiting_verification' });
    setOrders(data);
  };

  const handleVerify = async (id: string, approve: boolean) => {
    await updateOrder(id, { status: approve ? 'paid' : 'cancelled' });
    await addAuditLog(approve ? 'payment_verified' : 'payment_rejected', 'admin', { order_id: id });
    toast.success(approve ? 'Payment verified!' : 'Payment rejected');
    loadPending();
  };

  return (
    <div>
      <h2 className="text-lg font-bold text-foreground mb-4">UPI Transaction Verification</h2>
      {orders.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-4xl mb-2">✅</p>
          <p>No pending verifications</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => (
            <div key={order.id} className="glass shadow-glass rounded-xl p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-bold text-foreground">#{order.token_number}</p>
                  <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString()}</p>
                </div>
                <span className="font-bold text-primary">₹{order.grand_total}</span>
              </div>
              <div className="bg-muted/50 rounded-lg p-2 mb-3">
                <p className="text-xs text-muted-foreground">Transaction ID</p>
                <p className="font-mono font-semibold text-foreground text-sm">{order.transaction_id || 'N/A'}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 gradient-secondary text-secondary-foreground border-0 rounded-lg" onClick={() => handleVerify(order.id, true)}>
                  <Check className="w-3 h-3 mr-1" /> Approve
                </Button>
                <Button size="sm" variant="outline" className="flex-1 rounded-lg text-destructive" onClick={() => handleVerify(order.id, false)}>
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
        code: form.code.toUpperCase(),
        description: form.description || null,
        discount_type: form.discount_type,
        discount_value: parseFloat(form.discount_value),
        min_order_amount: parseFloat(form.min_order_amount) || 0,
        max_discount: form.max_discount ? parseFloat(form.max_discount) : null,
        usage_limit: form.usage_limit ? parseInt(form.usage_limit) : null,
      });
      toast.success('Coupon created!');
      setShowForm(false);
      fetchCoupons().then(setCoupons);
    } catch { toast.error('Failed to create'); }
  };

  const toggleCoupon = async (id: string, isActive: boolean) => {
    await db.from('coupons').update({ is_active: !isActive }).eq('id', id);
    fetchCoupons().then(setCoupons);
  };

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h2 className="text-lg font-bold text-foreground">Coupons</h2>
        <Button size="sm" className="gradient-primary text-primary-foreground border-0 rounded-lg" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-1" /> Add
        </Button>
      </div>
      <div className="space-y-2">
        {coupons.map(c => (
          <div key={c.id} className="glass shadow-glass rounded-xl p-3 flex items-center justify-between">
            <div>
              <p className="font-mono font-bold text-foreground">{c.code}</p>
              <p className="text-xs text-muted-foreground">{c.discount_type === 'percentage' ? `${c.discount_value}% off` : `₹${c.discount_value} off`} • Used: {c.used_count}{c.usage_limit ? `/${c.usage_limit}` : ''}</p>
            </div>
            <Switch checked={c.is_active} onCheckedChange={() => toggleCoupon(c.id, c.is_active)} />
          </div>
        ))}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="glass-strong max-w-sm rounded-2xl">
          <DialogHeader><DialogTitle>New Coupon</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Code (e.g. SAVE20)" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} className="rounded-xl font-mono" />
            <Input placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="rounded-xl" />
            <Select value={form.discount_type} onValueChange={v => setForm(f => ({ ...f, discount_type: v }))}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Percentage</SelectItem>
                <SelectItem value="fixed">Fixed Amount</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Discount value" type="number" value={form.discount_value} onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))} className="rounded-xl" />
            <Input placeholder="Min order amount" type="number" value={form.min_order_amount} onChange={e => setForm(f => ({ ...f, min_order_amount: e.target.value }))} className="rounded-xl" />
            <Button className="w-full gradient-primary text-primary-foreground border-0 rounded-xl" onClick={handleSave}>Create Coupon</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ============ SETTINGS TAB ============ */
const SettingsTab = () => {
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings().then(s => { setSettings(s); setLoading(false); });
  }, []);

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
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-foreground mb-4">App Settings</h2>
      {[
        { key: 'gst_enabled', label: 'GST Enabled', type: 'toggle' },
        { key: 'gst_rate', label: 'GST Rate (%)', type: 'number' },
        { key: 'convenience_fee_enabled', label: 'Convenience Fee', type: 'toggle' },
        { key: 'convenience_fee', label: 'Fee Amount (₹)', type: 'number' },
        { key: 'surge_pricing_enabled', label: 'Surge Pricing', type: 'toggle' },
        { key: 'surge_pricing_multiplier', label: 'Surge Multiplier', type: 'number' },
        { key: 'min_order_amount', label: 'Min Order Amount (₹)', type: 'number' },
      ].map(s => (
        <div key={s.key} className="glass shadow-glass rounded-xl p-3 flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">{s.label}</span>
          {s.type === 'toggle' ? (
            <Switch checked={boolVal(s.key)} onCheckedChange={() => toggle(s.key)} />
          ) : (
            <Input
              type="number"
              className="w-20 rounded-lg text-right text-sm h-8"
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
