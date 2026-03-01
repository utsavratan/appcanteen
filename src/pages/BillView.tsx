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

  useEffect(() => {
    if (!id) return;
    Promise.all([
      db.from('orders').select('*').eq('id', id).single(),
      db.from('order_items').select('*').eq('order_id', id),
    ]).then(([orderRes, itemsRes]) => {
      if (orderRes.data) setOrder(orderRes.data);
      if (itemsRes.data) setItems(itemsRes.data);
    });
  }, [id]);

  if (!order) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;

  const trackingUrl = `${window.location.origin}/order/${order.id}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(trackingUrl)}`;

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Print Controls */}
      <div className="no-print flex items-center gap-2 mb-4 max-w-md mx-auto">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></Button>
        <h1 className="flex-1 text-lg font-bold text-foreground">Bill</h1>
        <Button size="sm" className="gradient-primary text-primary-foreground border-0 rounded-lg" onClick={() => window.print()}>
          <Printer className="w-4 h-4 mr-1" /> Print
        </Button>
      </div>

      {/* Bill Content */}
      <div className="max-w-md mx-auto bg-card rounded-2xl shadow-glass-lg overflow-hidden print:shadow-none print:rounded-none">
        {/* Header */}
        <div className="gradient-primary p-6 text-center text-primary-foreground print:bg-gray-800 print:text-white">
          <h2 className="text-2xl font-extrabold tracking-tight">🍽️ CANTEEN</h2>
          <p className="text-sm opacity-80 mt-1">Fresh Food • Fast Service</p>
        </div>

        {/* Decorative separator */}
        <div className="h-1 bg-gradient-to-r from-canteen-teal via-primary to-canteen-amber" />

        <div className="p-5">
          {/* Order Info */}
          <div className="flex justify-between text-sm mb-4">
            <div>
              <p className="text-muted-foreground">Order ID</p>
              <p className="font-mono font-bold text-foreground text-xs">{order.id.slice(0, 8)}</p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground">Token</p>
              <p className="font-bold text-foreground text-xl">#{order.token_number}</p>
            </div>
          </div>

          <div className="flex justify-between text-xs text-muted-foreground mb-4">
            <span>{new Date(order.created_at).toLocaleString('en-IN')}</span>
            <span>{ORDER_STATUS_LABELS[order.status]}</span>
          </div>

          {/* Separator */}
          <div className="border-t-2 border-dashed border-border my-3" />

          {/* Items Table */}
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-xs">
                <th className="text-left py-1">Item</th>
                <th className="text-center py-1">Qty</th>
                <th className="text-right py-1">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-border/50">
                  <td className="py-2 text-foreground">{item.item_name}</td>
                  <td className="py-2 text-center text-muted-foreground">{item.quantity}</td>
                  <td className="py-2 text-right font-medium text-foreground">₹{item.total}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Separator */}
          <div className="border-t-2 border-dashed border-border my-3" />

          {/* Totals */}
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>₹{order.subtotal}</span></div>
            {order.discount_amount > 0 && (
              <div className="flex justify-between text-canteen-veg"><span>Discount</span><span>-₹{order.discount_amount}</span></div>
            )}
            {order.tax_amount > 0 && (
              <div className="flex justify-between text-muted-foreground"><span>Tax{order.gst_enabled ? ' (GST)' : ''}</span><span>₹{order.tax_amount}</span></div>
            )}
            {order.convenience_fee > 0 && (
              <div className="flex justify-between text-muted-foreground"><span>Conv. Fee</span><span>₹{order.convenience_fee}</span></div>
            )}
            <div className="h-1 gradient-primary rounded-full my-2" />
            <div className="flex justify-between font-bold text-lg text-foreground">
              <span>Grand Total</span>
              <span>₹{order.grand_total}</span>
            </div>
          </div>

          {/* Payment Info */}
          <div className="mt-4 bg-muted/50 rounded-lg p-3 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment Mode</span>
              <span className="font-semibold text-foreground uppercase">{order.payment_mode}</span>
            </div>
            {order.transaction_id && (
              <div className="flex justify-between mt-1">
                <span className="text-muted-foreground">Transaction ID</span>
                <span className="font-mono text-foreground">{order.transaction_id}</span>
              </div>
            )}
            {order.coupon_code && (
              <div className="flex justify-between mt-1">
                <span className="text-muted-foreground">Coupon</span>
                <span className="font-mono text-foreground">{order.coupon_code}</span>
              </div>
            )}
          </div>

          {/* QR Code */}
          <div className="mt-4 text-center">
            <img src={qrUrl} alt="Track Order QR" className="w-20 h-20 mx-auto" />
            <p className="text-[10px] text-muted-foreground mt-1">Scan to track your order</p>
          </div>

          {/* Footer */}
          <div className="mt-4 text-center border-t border-border pt-3">
            <p className="text-sm font-semibold text-foreground">Thank you for your order! 🙏</p>
            <p className="text-[10px] text-muted-foreground mt-1">Visit again • Canteen Management System</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillView;
