import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import type { Order, OrderItem } from '@/lib/types';
import { ORDER_STATUS_LABELS } from '@/lib/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const BillView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      db.from('orders').select('*').eq('id', id).single(),
      db.from('order_items').select('*').eq('order_id', id),
    ]).then(async ([orderRes, itemsRes]: any[]) => {
      if (orderRes.data) {
        setOrder(orderRes.data);
        // Fetch user name from profiles if user_id exists
        if (orderRes.data.user_id) {
          const { data: profile } = await db.from('profiles').select('name').eq('id', orderRes.data.user_id).single();
          if (profile?.name) setUserName(profile.name);
        }
      }
      if (itemsRes.data) setItems(itemsRes.data);
    });
  }, [id]);

  if (!order) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-12 h-12 rounded-full gradient-primary mx-auto mb-3 animate-pulse" />
        <p className="text-muted-foreground text-sm">Loading bill...</p>
      </div>
    </div>
  );

  const trackingUrl = `${window.location.origin}/order/${order.id}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(trackingUrl)}&bgcolor=ffffff&color=1a1a1a`;
  const orderDate = new Date(order.created_at);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="no-print flex items-center gap-2 mb-4 max-w-md mx-auto">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="flex-1 text-lg font-extrabold text-foreground">Bill</h1>
        <Button size="sm" className="gradient-primary text-primary-foreground border-0 rounded-xl font-bold" onClick={() => window.print()}>
          <Printer className="w-4 h-4 mr-1" /> Print
        </Button>
      </div>

      <div className="max-w-md mx-auto bg-card rounded-3xl shadow-glass-lg overflow-hidden print:shadow-none print:rounded-none print:max-w-full">
        <div className="gradient-primary p-8 text-center text-primary-foreground relative overflow-hidden print-colors">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-canteen-teal via-canteen-amber to-canteen-purple" />
          <div className="relative z-10">
            <div className="text-4xl mb-2">🍽️</div>
            <h2 className="text-3xl font-black tracking-tight">CANTEEN</h2>
            <p className="text-sm opacity-80 mt-1 font-medium">Fresh Food • Fast Service</p>
          </div>
          <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full bg-white/10" />
          <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-white/10" />
        </div>

        <div className="h-1.5 bg-gradient-to-r from-canteen-teal via-primary to-canteen-amber print-colors" />

        <div className="p-6">
          {/* Customer Name */}
          {userName && (
            <div className="text-center mb-4">
              <p className="text-xs text-muted-foreground">Bill for</p>
              <p className="text-lg font-black text-foreground">{userName}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-muted/50 rounded-2xl p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Order ID</p>
              <p className="font-mono font-black text-foreground text-xs mt-1">{order.id.slice(0, 8).toUpperCase()}</p>
            </div>
            <div className="gradient-primary rounded-2xl p-3 text-center print-colors">
              <p className="text-[10px] text-primary-foreground/80 uppercase tracking-wider font-bold">Token</p>
              <p className="font-black text-primary-foreground text-2xl mt-0.5">#{order.token_number}</p>
            </div>
          </div>

          <div className="flex justify-between text-xs text-muted-foreground mb-5 px-1">
            <span className="font-medium">{orderDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} • {orderDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
            <span className="font-bold text-foreground">{ORDER_STATUS_LABELS[order.status]}</span>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
            <span className="text-xs text-muted-foreground font-bold">ITEMS</span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
          </div>

          <div className="space-y-0">
            {items.map((item, i) => (
              <div key={item.id} className={`flex items-center justify-between py-2.5 ${i < items.length - 1 ? 'border-b border-border/50' : ''}`}>
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground">{item.item_name}</p>
                  <p className="text-xs text-muted-foreground">{item.quantity} × ₹{item.item_price}</p>
                </div>
                <p className="font-black text-foreground text-sm">₹{item.total}</p>
              </div>
            ))}
          </div>

          <div className="my-4 border-t-2 border-dashed border-border" />

          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="font-semibold">₹{order.subtotal}</span>
            </div>
            {order.discount_amount > 0 && (
              <div className="flex justify-between text-canteen-veg">
                <span className="font-medium">Discount</span>
                <span className="font-bold">-₹{order.discount_amount}</span>
              </div>
            )}
            {order.tax_amount > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Tax{order.gst_enabled ? ' (GST)' : ''}</span>
                <span className="font-semibold">₹{order.tax_amount}</span>
              </div>
            )}
            {order.convenience_fee > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Convenience Fee</span>
                <span className="font-semibold">₹{order.convenience_fee}</span>
              </div>
            )}

            <div className="gradient-primary rounded-2xl p-4 mt-3 flex justify-between items-center print-colors">
              <span className="font-black text-primary-foreground text-lg">Grand Total</span>
              <span className="font-black text-primary-foreground text-2xl">₹{order.grand_total}</span>
            </div>
          </div>

          <div className="mt-5 gradient-secondary rounded-2xl p-4 text-secondary-foreground print-colors">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold opacity-80">Payment</span>
              <span className="font-black uppercase text-sm">{order.payment_mode}</span>
            </div>
            {order.transaction_id && (
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs font-bold opacity-80">TXN ID</span>
                <span className="font-mono font-bold text-sm">{order.transaction_id}</span>
              </div>
            )}
            {order.coupon_code && (
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs font-bold opacity-80">Coupon</span>
                <span className="font-mono font-bold text-sm">{order.coupon_code}</span>
              </div>
            )}
          </div>

          <div className="mt-5 text-center">
            <div className="inline-block bg-card rounded-2xl p-3 shadow-glass">
              <img src={qrUrl} alt="Track Order QR" className="w-24 h-24 mx-auto" />
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 font-medium">Scan to track your order</p>
          </div>

          <div className="mt-5 text-center border-t border-border pt-4">
            <div className="text-2xl mb-1">🙏</div>
            <p className="text-sm font-black text-foreground">Thank you{userName ? `, ${userName}` : ''}!</p>
            <p className="text-[10px] text-muted-foreground mt-1 font-medium">Visit again • Canteen Management System</p>
            <div className="mt-3 h-1 rounded-full bg-gradient-to-r from-primary via-canteen-teal to-canteen-amber print-colors" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillView;
