import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogOut, Clock, ChefHat, Flame, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { fetchOrders, fetchOrderItems, updateOrder, fetchMenuItems, addAuditLog, subscribeToOrders } from '@/lib/db';
import { supabase } from '@/integrations/supabase/client';
import { clearRole, getRole } from '@/lib/session';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/lib/types';
import type { Order, OrderItem, MenuItem, OrderStatus } from '@/lib/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const CHART_COLORS = ['hsl(24, 95%, 53%)', 'hsl(173, 58%, 39%)', 'hsl(348, 83%, 52%)', 'hsl(38, 92%, 50%)', 'hsl(262, 83%, 58%)', 'hsl(142, 71%, 45%)'];

const ChefDashboard = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [orderItemsMap, setOrderItemsMap] = useState<Record<string, OrderItem[]>>({});
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (getRole() !== 'chef') { navigate('/login'); return; }
    loadData();
    const channel = subscribeToOrders(() => loadData());
    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadData = async () => {
    try {
      const [ords, items] = await Promise.all([fetchOrders(), fetchMenuItems()]);
      setAllOrders(ords);
      const activeOrders = ords.filter(o => ['paid', 'preparing', 'ready', 'awaiting_verification', 'pending_payment'].includes(o.status));
      activeOrders.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      setOrders(activeOrders);
      setMenuItems(items);
      const itemsMap: Record<string, OrderItem[]> = {};
      await Promise.all(activeOrders.map(async (o) => {
        const oItems = await fetchOrderItems(o.id);
        itemsMap[o.id] = oItems;
      }));
      setOrderItemsMap(itemsMap);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleStatusUpdate = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const updates: Partial<Order> = { status: newStatus };
      if (newStatus === 'completed') updates.completed_at = new Date().toISOString();
      await updateOrder(orderId, updates);
      await addAuditLog(`order_${newStatus}`, 'chef', { order_id: orderId });
      toast.success(`Order marked as ${ORDER_STATUS_LABELS[newStatus]}`);
      loadData();
    } catch { toast.error('Failed to update'); }
  };

  const toggleItemAvailability = async (item: MenuItem) => {
    try {
      await db.from('menu_items').update({ is_available: !item.is_available }).eq('id', item.id);
      toast.success(`${item.name} ${!item.is_available ? 'enabled' : 'disabled'}`);
      setMenuItems(prev => prev.map(i => i.id === item.id ? { ...i, is_available: !i.is_available } : i));
    } catch { toast.error('Failed to toggle'); }
  };

  const getTimeSince = (date: string) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  const getStatusActions = (order: Order) => {
    const actions: { label: string; status: OrderStatus; variant: string }[] = [];
    switch (order.status) {
      case 'pending_payment':
        actions.push({ label: 'Mark Paid (Cash)', status: 'paid', variant: 'gradient-secondary' });
        break;
      case 'awaiting_verification':
        actions.push({ label: 'Mark Paid', status: 'paid', variant: 'gradient-secondary' });
        break;
      case 'paid':
        actions.push({ label: 'Start Preparing', status: 'preparing', variant: 'gradient-primary' });
        break;
      case 'preparing':
        actions.push({ label: 'Mark Ready', status: 'ready', variant: 'gradient-secondary' });
        break;
      case 'ready':
        actions.push({ label: 'Complete', status: 'completed', variant: 'gradient-primary' });
        break;
    }
    return actions;
  };

  // Analytics data
  const getItemFrequency = () => {
    const freq: Record<string, number> = {};
    Object.values(orderItemsMap).flat().forEach(item => {
      freq[item.item_name] = (freq[item.item_name] || 0) + item.quantity;
    });
    // Also scan completed orders
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name: name.length > 12 ? name.slice(0, 12) + '…' : name, count }));
  };

  const getPeakTimeData = () => {
    const hourCounts: Record<number, number> = {};
    allOrders.forEach(o => {
      const h = new Date(o.created_at).getHours();
      hourCounts[h] = (hourCounts[h] || 0) + 1;
    });
    return Array.from({ length: 24 }, (_, h) => ({
      hour: `${h.toString().padStart(2, '0')}:00`,
      orders: hourCounts[h] || 0,
    })).filter(d => d.orders > 0);
  };

  const getStatusDistribution = () => {
    const counts: Record<string, number> = {};
    allOrders.forEach(o => {
      counts[o.status] = (counts[o.status] || 0) + 1;
    });
    return Object.entries(counts).map(([status, value]) => ({
      name: ORDER_STATUS_LABELS[status as OrderStatus] || status,
      value,
    }));
  };

  const handleLogout = () => { clearRole(); navigate('/login'); };

  return (
    <div className="min-h-screen bg-background gradient-mesh pb-8">
      <div className="sticky top-0 z-40 glass-strong shadow-glass">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl gradient-secondary flex items-center justify-center shadow-glow-teal">
              <ChefHat className="w-5 h-5 text-secondary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-foreground">Kitchen</h1>
              <p className="text-[10px] text-muted-foreground">{orders.length} active orders</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="rounded-xl"><LogOut className="w-4 h-4" /></Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-4">
        <Tabs defaultValue="orders">
          <TabsList className="w-full glass mb-4 rounded-2xl h-12">
            <TabsTrigger value="orders" className="flex-1 rounded-xl font-bold">
              <Flame className="w-4 h-4 mr-1" /> Orders ({orders.length})
            </TabsTrigger>
            <TabsTrigger value="items" className="flex-1 rounded-xl font-bold">Menu Items</TabsTrigger>
            <TabsTrigger value="analytics" className="flex-1 rounded-xl font-bold">
              <BarChart3 className="w-4 h-4 mr-1" /> Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            {loading ? (
              <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}</div>
            ) : orders.length === 0 ? (
              <div className="text-center py-16">
                <span className="text-6xl block mb-3">👨‍🍳</span>
                <p className="text-muted-foreground font-medium">No active orders</p>
                <p className="text-xs text-muted-foreground mt-1">Orders will appear here in real-time</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {orders.map((order, i) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="glass-card shadow-glass rounded-2xl p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-black text-xl text-foreground">#{order.token_number}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <Clock className="w-3 h-3" /> {getTimeSince(order.created_at)}
                          <span className="font-bold">• {order.payment_mode?.toUpperCase()}</span>
                        </div>
                      </div>
                      <Badge className={`${ORDER_STATUS_COLORS[order.status]} border-0 text-[10px] font-bold`}>
                        {ORDER_STATUS_LABELS[order.status]}
                      </Badge>
                    </div>

                    <div className="bg-muted/50 rounded-xl p-3 mb-3 space-y-1">
                      {(orderItemsMap[order.id] || []).map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-foreground font-medium">{item.quantity}× {item.item_name}</span>
                          <span className="text-muted-foreground">₹{item.total}</span>
                        </div>
                      ))}
                      <div className="border-t border-border pt-1 mt-1 flex justify-between font-black text-sm text-foreground">
                        <span>Total</span><span className="text-primary">₹{order.grand_total}</span>
                      </div>
                    </div>

                    {order.transaction_id && (
                      <p className="text-xs text-muted-foreground mb-2">TXN: <span className="font-mono font-bold">{order.transaction_id}</span></p>
                    )}

                    <div className="flex gap-2">
                      {getStatusActions(order).map((action) => (
                        <Button
                          key={action.status}
                          size="sm"
                          className={`flex-1 ${action.variant} text-primary-foreground border-0 rounded-xl text-xs font-bold`}
                          onClick={() => handleStatusUpdate(order.id, action.status)}
                        >
                          {action.label}
                        </Button>
                      ))}
                      {order.status !== 'completed' && order.status !== 'cancelled' && (
                        <Button size="sm" variant="outline" className="rounded-xl text-xs text-destructive font-bold" onClick={() => handleStatusUpdate(order.id, 'cancelled')}>
                          Cancel
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="items">
            <div className="space-y-2">
              {menuItems.map((item) => (
                <div key={item.id} className="glass-card shadow-glass rounded-2xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-muted">
                      {item.image_url ? <img src={item.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-lg">🍽️</div>}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={item.item_type === 'veg' || item.item_type === 'beverages' ? 'veg-indicator' : 'nonveg-indicator'} style={{ width: 14, height: 14 }} />
                        <p className="font-bold text-sm text-foreground">{item.name}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">₹{item.price} • Stock: {item.stock_quantity}</p>
                    </div>
                  </div>
                  <Switch checked={item.is_available} onCheckedChange={() => toggleItemAvailability(item)} />
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="space-y-4">
              {/* Most Ordered Items */}
              <div className="glass-card shadow-glass rounded-2xl p-4">
                <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-primary" /> Most Ordered Items
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getItemFrequency()} layout="vertical" margin={{ left: 0, right: 16 }}>
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(24, 95%, 53%)" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Peak Time */}
              <div className="glass-card shadow-glass rounded-2xl p-4">
                <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-canteen-teal" /> Peak Hours
                </h3>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getPeakTimeData()} margin={{ left: -10, right: 10 }}>
                      <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="orders" fill="hsl(173, 58%, 39%)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Status Distribution */}
              <div className="glass-card shadow-glass rounded-2xl p-4">
                <h3 className="font-bold text-foreground mb-3">Order Status Distribution</h3>
                <div className="h-52 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={getStatusDistribution()} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                        {getStatusDistribution().map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ChefDashboard;
