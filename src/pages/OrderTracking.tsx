import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import type { Order, OrderItem, OrderStatus } from '@/lib/types';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/lib/types';

const STEPS: OrderStatus[] = ['pending_payment', 'paid', 'preparing', 'ready', 'completed'];

const OrderTracking = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  useEffect(() => {
    if (!id) return;
    const loadOrder = async () => {
      const [orderRes, itemsRes] = await Promise.all([
        db.from('orders').select('*').eq('id', id).single(),
        db.from('order_items').select('*').eq('order_id', id),
      ]);
      if (orderRes.data) setOrder(orderRes.data);
      if (itemsRes.data) setItems(itemsRes.data);
      setLoading(false);
    };
    loadOrder();

    const channel = db
      .channel(`order-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}` }, (payload: any) => {
        setOrder(payload.new);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  const currentStepIndex = order ? STEPS.indexOf(order.status as OrderStatus) : -1;
  const displaySteps = order?.status === 'awaiting_verification' ? ['awaiting_verification', ...STEPS.slice(1)] as OrderStatus[] : STEPS;

  if (loading) {
    return (
      <div className="min-h-screen bg-background gradient-mesh p-4">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-40 w-full rounded-xl mb-4" />
        <Skeleton className="h-60 w-full rounded-xl" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background gradient-mesh flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-2">🔍</p>
          <p className="text-muted-foreground">Order not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/menu')}>Go to Menu</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background gradient-mesh pb-8">
      <div className="sticky top-0 z-40 glass-strong shadow-glass">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Order #{order.token_number}</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-4">
        {/* Token */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="gradient-primary rounded-2xl p-6 text-center text-primary-foreground shadow-glow"
        >
          <p className="text-sm font-medium opacity-80">Token Number</p>
          <p className="text-5xl font-extrabold mt-1">#{order.token_number}</p>
          <span className={`inline-block mt-3 px-3 py-1 rounded-full text-xs font-semibold bg-white/20`}>
            {ORDER_STATUS_LABELS[order.status]}
          </span>
        </motion.div>

        {/* Progress */}
        {order.status !== 'cancelled' && order.status !== 'refunded' && (
          <div className="glass shadow-glass rounded-xl p-4">
            <h3 className="text-sm font-semibold text-foreground mb-4">Order Progress</h3>
            <div className="flex items-center justify-between relative">
              <div className="absolute top-3 left-6 right-6 h-0.5 bg-muted">
                <div
                  className="h-full gradient-primary transition-all duration-500"
                  style={{ width: `${Math.max(0, (currentStepIndex / (displaySteps.length - 1)) * 100)}%` }}
                />
              </div>
              {displaySteps.map((step, i) => {
                const isActive = i <= currentStepIndex;
                return (
                  <div key={step} className="relative z-10 flex flex-col items-center">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                      isActive ? 'gradient-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}>
                      {i + 1}
                    </div>
                    <span className={`text-[9px] mt-1 font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {ORDER_STATUS_LABELS[step]?.split(' ')[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Items */}
        <div className="glass shadow-glass rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Items</h3>
          {items.map((item) => (
            <div key={item.id} className="flex justify-between py-1.5 text-sm">
              <span className="text-muted-foreground">{item.item_name} × {item.quantity}</span>
              <span className="text-foreground font-medium">₹{item.total}</span>
            </div>
          ))}
          <div className="border-t border-border mt-2 pt-2 flex justify-between font-bold text-foreground">
            <span>Total</span>
            <span className="text-primary">₹{order.grand_total}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={() => navigate(`/bill/${order.id}`)}>
            <Receipt className="w-4 h-4 mr-2" /> View Bill
          </Button>
          <Button className="flex-1 rounded-xl gradient-primary text-primary-foreground border-0" onClick={() => navigate('/menu')}>
            Order More
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OrderTracking;
