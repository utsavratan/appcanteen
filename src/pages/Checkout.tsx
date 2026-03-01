import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CreditCard, Banknote, ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useCartStore } from '@/lib/cart-store';
import { createOrder, createOrderItems, getOrCreateCustomer, addAuditLog } from '@/lib/db';
import { getSessionId, getCustomerId, setCustomerId } from '@/lib/session';

const Checkout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { subtotal = 0, discount = 0, tax = 0, convFee = 0, grandTotal = 0, couponCode } = (location.state as any) || {};
  const { items, clearCart } = useCartStore();
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi'>('cash');
  const [transactionId, setTransactionId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState<{ id: string; token: number } | null>(null);

  const upiId = 'hiya05@fam';
  const upiLink = `upi://pay?pa=${upiId}&pn=Canteen&am=${grandTotal.toFixed(2)}&cu=INR&tn=Canteen+Order`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiLink)}`;

  const handlePlaceOrder = async () => {
    if (paymentMode === 'upi' && !transactionId.trim()) {
      toast.error('Please enter your UPI Transaction ID');
      return;
    }
    if (transactionId.trim() && transactionId.trim().length < 6) {
      toast.error('Transaction ID must be at least 6 characters');
      return;
    }
    if (items.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    setSubmitting(true);
    try {
      const sessionId = getSessionId();
      let customerId = getCustomerId();
      if (!customerId) {
        const customer = await getOrCreateCustomer(sessionId);
        customerId = customer.id;
        setCustomerId(customerId);
      }

      const order = await createOrder({
        customer_id: customerId,
        status: paymentMode === 'cash' ? 'pending_payment' : 'awaiting_verification',
        payment_mode: paymentMode,
        subtotal,
        tax_amount: tax,
        discount_amount: discount,
        convenience_fee: convFee,
        grand_total: grandTotal,
        coupon_code: couponCode || null,
        transaction_id: paymentMode === 'upi' ? transactionId.trim() : null,
      });

      await createOrderItems(
        items.map((item) => ({
          order_id: order.id,
          menu_item_id: item.id,
          item_name: item.name,
          item_price: item.price,
          quantity: item.quantity,
          total: item.price * item.quantity,
        }))
      );

      await addAuditLog('order_placed', 'customer', { order_id: order.id, payment_mode: paymentMode, grand_total: grandTotal });

      setOrderPlaced({ id: order.id, token: order.token_number });
      clearCart();
      toast.success('Order placed successfully!');
    } catch (e) {
      console.error(e);
      toast.error('Failed to place order. Please try again.');
    }
    setSubmitting(false);
  };

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-background gradient-mesh flex items-center justify-center px-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass-strong shadow-glass-lg rounded-2xl p-8 max-w-sm w-full text-center"
        >
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }}>
            <CheckCircle className="w-16 h-16 text-canteen-veg mx-auto" />
          </motion.div>
          <h2 className="text-2xl font-bold text-foreground mt-4">Order Placed!</h2>
          <div className="gradient-primary text-primary-foreground rounded-xl p-4 mt-4">
            <p className="text-sm font-medium">Your Token Number</p>
            <p className="text-4xl font-extrabold">#{orderPlaced.token}</p>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            {paymentMode === 'upi' ? 'Your payment is being verified' : 'Please pay at the counter'}
          </p>
          <div className="flex gap-2 mt-6">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => navigate(`/order/${orderPlaced.id}`)}>
              Track Order
            </Button>
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => navigate(`/bill/${orderPlaced.id}`)}>
              View Bill
            </Button>
          </div>
          <Button className="w-full mt-2 gradient-primary text-primary-foreground border-0 rounded-xl" onClick={() => navigate('/menu')}>
            Back to Menu
          </Button>
        </motion.div>
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
          <h1 className="text-xl font-bold text-foreground">Checkout</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-4">
        {/* Order Summary */}
        <div className="glass shadow-glass rounded-xl p-4">
          <h3 className="font-semibold text-sm text-foreground mb-3">Order Summary</h3>
          {items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm py-1">
              <span className="text-muted-foreground">{item.name} × {item.quantity}</span>
              <span className="text-foreground font-medium">₹{(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          <div className="border-t border-border mt-2 pt-2 space-y-1 text-sm">
            <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
            {discount > 0 && <div className="flex justify-between text-canteen-veg"><span>Discount</span><span>-₹{discount.toFixed(2)}</span></div>}
            {tax > 0 && <div className="flex justify-between text-muted-foreground"><span>Tax</span><span>₹{tax.toFixed(2)}</span></div>}
            {convFee > 0 && <div className="flex justify-between text-muted-foreground"><span>Conv. Fee</span><span>₹{convFee.toFixed(2)}</span></div>}
            <div className="flex justify-between font-bold text-foreground border-t border-border pt-1">
              <span>Total</span><span className="text-primary">₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payment Mode */}
        <div className="glass shadow-glass rounded-xl p-4">
          <h3 className="font-semibold text-sm text-foreground mb-3">Payment Method</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setPaymentMode('cash')}
              className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                paymentMode === 'cash' ? 'border-primary bg-primary/10' : 'border-border'
              }`}
            >
              <Banknote className={`w-6 h-6 ${paymentMode === 'cash' ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className={`text-sm font-semibold ${paymentMode === 'cash' ? 'text-primary' : 'text-muted-foreground'}`}>Cash</span>
            </button>
            <button
              onClick={() => setPaymentMode('upi')}
              className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                paymentMode === 'upi' ? 'border-primary bg-primary/10' : 'border-border'
              }`}
            >
              <CreditCard className={`w-6 h-6 ${paymentMode === 'upi' ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className={`text-sm font-semibold ${paymentMode === 'upi' ? 'text-primary' : 'text-muted-foreground'}`}>UPI</span>
            </button>
          </div>
        </div>

        {/* UPI Section */}
        {paymentMode === 'upi' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass shadow-glass rounded-xl p-4 text-center">
            <h3 className="font-semibold text-sm text-foreground mb-3">Scan & Pay ₹{grandTotal.toFixed(2)}</h3>
            <div className="bg-card rounded-xl p-4 inline-block shadow-glass">
              <img src={qrUrl} alt="UPI QR Code" className="w-[200px] h-[200px] mx-auto" />
            </div>
            <p className="text-xs text-muted-foreground mt-3">UPI ID: <span className="font-mono font-semibold text-foreground">{upiId}</span></p>
            <div className="mt-4">
              <label className="text-sm font-medium text-foreground block mb-2 text-left">Transaction ID *</label>
              <Input
                placeholder="Enter UPI Transaction ID"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                className="rounded-xl text-center font-mono"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Enter the transaction ID from your UPI app after payment</p>
            </div>
          </motion.div>
        )}

        <Button
          className="w-full gradient-primary text-primary-foreground border-0 rounded-xl h-12 font-semibold text-base"
          onClick={handlePlaceOrder}
          disabled={submitting}
        >
          {submitting ? 'Placing Order...' : `Place Order — ₹${grandTotal.toFixed(2)}`}
        </Button>
      </div>
    </div>
  );
};

export default Checkout;
