import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useCartStore } from '@/lib/cart-store';
import { getCustomerId } from '@/lib/session';
import { fetchOrderItems } from '@/lib/db';
import { supabase } from '@/integrations/supabase/client';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/lib/types';
import type { Order, OrderItem } from '@/lib/types';
import { toast } from 'sonner';
import BottomNav from '@/components/canteen/BottomNav';

const OrderHistory = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const addItem = useCartStore((s) => s.addItem);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  useEffect(() => {
    const loadOrders = async () => {
      const customerId = getCustomerId();
      if (!customerId) { setLoading(false); return; }
      const { data } = await db.from('orders').select('*').eq('customer_id', customerId).order('created_at', { ascending: false });
      setOrders(data || []);
      setLoading(false);
    };
    loadOrders();
  }, []);

  const handleReorder = async (orderId: string) => {
    try {
      const items = await fetchOrderItems(orderId);
      items.forEach((item: OrderItem) => {
        addItem({ id: item.menu_item_id || item.id, name: item.item_name, price: item.item_price, image_url: null, item_type: 'veg' });
      });
      toast.success('Items added to cart!');
      navigate('/cart');
    } catch {
      toast.error('Failed to reorder');
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-background gradient-mesh pb-24">
      <div className="sticky top-0 z-40 glass-strong shadow-glass">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-foreground">Order History</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-3">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))
        ) : orders.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-5xl block mb-3">📋</span>
            <p className="text-muted-foreground">No orders yet</p>
            <Button className="mt-4 gradient-primary text-primary-foreground border-0 rounded-xl" onClick={() => navigate('/menu')}>
              Start Ordering
            </Button>
          </div>
        ) : (
          orders.map((order, i) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass shadow-glass rounded-xl p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-foreground">#{order.token_number}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
                </div>
                <Badge className={`${ORDER_STATUS_COLORS[order.status]} border-0 text-[10px]`}>
                  {ORDER_STATUS_LABELS[order.status]}
                </Badge>
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="font-bold text-foreground">₹{order.grand_total}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="rounded-lg text-xs h-7" onClick={() => navigate(`/order/${order.id}`)}>
                    Track
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-lg text-xs h-7" onClick={() => navigate(`/bill/${order.id}`)}>
                    Bill
                  </Button>
                  <Button size="sm" className="rounded-lg text-xs h-7 gradient-primary text-primary-foreground border-0" onClick={() => handleReorder(order.id)}>
                    <RotateCcw className="w-3 h-3 mr-1" /> Reorder
                  </Button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default OrderHistory;
