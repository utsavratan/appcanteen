import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogOut, Clock, CheckCircle, ChefHat, Flame, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { fetchOrders, fetchOrderItems, updateOrder, fetchMenuItems, addAuditLog, subscribeToOrders } from '@/lib/db';
import { supabase } from '@/integrations/supabase/client';
import { clearRole, getRole } from '@/lib/session';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/lib/types';
import type { Order, OrderItem, MenuItem, OrderStatus } from '@/lib/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const ChefDashboard = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
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
      const activeOrders = ords.filter(o => ['paid', 'preparing', 'ready', 'awaiting_verification', 'pending_payment'].includes(o.status));
      activeOrders.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      setOrders(activeOrders);
      setMenuItems(items);

      const itemsMap: Record<string, OrderItem[]> = {};
      await Promise.all(activeOrders.map(async (o) => {
        const items = await fetchOrderItems(o.id);
        itemsMap[o.id] = items;
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

  const handleLogout = () => { clearRole(); navigate('/login'); };

  return (
    <div className="min-h-screen bg-background gradient-mesh pb-8">
      <div className="sticky top-0 z-40 glass-strong shadow-glass">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-secondary flex items-center justify-center">
              <ChefHat className="w-4 h-4 text-secondary-foreground" />
            </div>
            <h1 className="text-lg font-bold text-foreground">Kitchen</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}><LogOut className="w-4 h-4" /></Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-4">
        <Tabs defaultValue="orders">
          <TabsList className="w-full glass mb-4">
            <TabsTrigger value="orders" className="flex-1">Orders ({orders.length})</TabsTrigger>
            <TabsTrigger value="items" className="flex-1">Menu Items</TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            {loading ? (
              <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>
            ) : orders.length === 0 ? (
              <div className="text-center py-16">
                <span className="text-5xl block mb-3">👨‍🍳</span>
                <p className="text-muted-foreground">No active orders</p>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((order, i) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="glass shadow-glass rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-bold text-lg text-foreground">#{order.token_number}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" /> {getTimeSince(order.created_at)}
                          <span className="font-medium">• {order.payment_mode?.toUpperCase()}</span>
                        </div>
                      </div>
                      <Badge className={`${ORDER_STATUS_COLORS[order.status]} border-0 text-[10px]`}>
                        {ORDER_STATUS_LABELS[order.status]}
                      </Badge>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-3 mb-3 space-y-1">
                      {(orderItemsMap[order.id] || []).map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-foreground">{item.quantity}× {item.item_name}</span>
                          <span className="text-muted-foreground">₹{item.total}</span>
                        </div>
                      ))}
                      <div className="border-t border-border pt-1 mt-1 flex justify-between font-bold text-sm text-foreground">
                        <span>Total</span><span>₹{order.grand_total}</span>
                      </div>
                    </div>

                    {order.transaction_id && (
                      <p className="text-xs text-muted-foreground mb-2">TXN: <span className="font-mono">{order.transaction_id}</span></p>
                    )}

                    <div className="flex gap-2">
                      {getStatusActions(order).map((action) => (
                        <Button
                          key={action.status}
                          size="sm"
                          className={`flex-1 ${action.variant} text-primary-foreground border-0 rounded-lg text-xs`}
                          onClick={() => handleStatusUpdate(order.id, action.status)}
                        >
                          {action.label}
                        </Button>
                      ))}
                      {order.status !== 'completed' && order.status !== 'cancelled' && (
                        <Button size="sm" variant="outline" className="rounded-lg text-xs text-destructive" onClick={() => handleStatusUpdate(order.id, 'cancelled')}>
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
                <div key={item.id} className="glass shadow-glass rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted">
                      {item.image_url ? <img src={item.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-lg">🍽️</div>}
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className={item.item_type === 'veg' || item.item_type === 'beverages' ? 'veg-indicator' : 'nonveg-indicator'} style={{ width: 14, height: 14 }} />
                        <p className="font-semibold text-sm text-foreground">{item.name}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">Stock: {item.stock_quantity}</p>
                    </div>
                  </div>
                  <Switch checked={item.is_available} onCheckedChange={() => toggleItemAvailability(item)} />
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ChefDashboard;
