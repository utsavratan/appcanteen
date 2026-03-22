import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus, Trash2, ArrowRight, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCartStore } from '@/lib/cart-store';
import { validateCoupon, fetchSettings } from '@/lib/db';
import { toast } from 'sonner';
import BottomNav from '@/components/canteen/BottomNav';
import type { Coupon } from '@/lib/types';

const Cart = () => {
  const navigate = useNavigate();
  const { items, updateQuantity, removeItem, clearCart, getSubtotal } = useCartStore();
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  useEffect(() => {
    fetchSettings().then(setSettings).catch(console.error);
  }, []);

  const subtotal = getSubtotal();
  const gstEnabled = settings.gst_enabled === true || settings.gst_enabled === 'true';
  const gstRate = Number(settings.gst_rate || 5);
  const convFeeEnabled = settings.convenience_fee_enabled === true || settings.convenience_fee_enabled === 'true';
  const convFee = convFeeEnabled ? Number(settings.convenience_fee || 5) : 0;

  const discount = useMemo(() => {
    if (!appliedCoupon) return 0;
    let d = appliedCoupon.discount_type === 'percentage'
      ? (subtotal * appliedCoupon.discount_value) / 100
      : appliedCoupon.discount_value;
    if (appliedCoupon.max_discount && d > appliedCoupon.max_discount) d = appliedCoupon.max_discount;
    return Math.round(d * 100) / 100;
  }, [appliedCoupon, subtotal]);

  const taxableAmount = subtotal - discount;
  const tax = gstEnabled ? Math.round(taxableAmount * gstRate) / 100 : 0;
  const grandTotal = Math.max(0, taxableAmount + tax + convFee);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setApplyingCoupon(true);
    try {
      const coupon = await validateCoupon(couponCode, subtotal);
      if (coupon) {
        setAppliedCoupon(coupon);
        toast.success(`Coupon "${coupon.code}" applied!`);
      } else {
        toast.error('Invalid or expired coupon');
      }
    } catch {
      toast.error('Failed to validate coupon');
    }
    setApplyingCoupon(false);
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background gradient-mesh flex flex-col items-center justify-center pb-24 px-4">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
          <span className="text-6xl block mb-4">🛒</span>
          <h2 className="text-xl font-bold text-foreground mb-2">Your cart is empty</h2>
          <p className="text-sm text-muted-foreground mb-6">Add some delicious items from our menu</p>
          <Button className="gradient-primary text-primary-foreground border-0 rounded-xl" onClick={() => navigate('/menu')}>
            Browse Menu
          </Button>
        </motion.div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background gradient-mesh pb-48">
      <div className="sticky top-0 z-40 glass-strong shadow-glass">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-foreground">Your Cart</h1>
            <Button variant="ghost" size="sm" onClick={clearCart} className="text-destructive text-xs">
              <Trash2 className="w-3 h-3 mr-1" /> Clear
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-3">
        <AnimatePresence mode="popLayout">
          {items.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="glass shadow-glass rounded-xl p-3 flex items-center gap-3"
            >
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-1">
                  <span className={item.item_type === 'veg' || item.item_type === 'beverages' ? 'veg-indicator' : 'nonveg-indicator'} />
                  <h3 className="font-semibold text-sm text-foreground truncate">{item.name}</h3>
                </div>
                <p className="text-sm font-bold text-foreground mt-1">₹{item.price * item.quantity}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="icon" variant="outline" className="h-7 w-7 rounded-lg" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                  <Minus className="w-3 h-3" />
                </Button>
                <span className="font-bold text-sm w-5 text-center">{item.quantity}</span>
                <Button size="icon" className="h-7 w-7 rounded-lg gradient-primary text-primary-foreground border-0" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Coupon */}
        <div className="glass shadow-glass rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Have a coupon?</span>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Enter code"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              className="rounded-xl text-sm h-9"
              disabled={!!appliedCoupon}
            />
            {appliedCoupon ? (
              <Button variant="outline" size="sm" className="rounded-xl" onClick={() => { setAppliedCoupon(null); setCouponCode(''); }}>
                Remove
              </Button>
            ) : (
              <Button size="sm" className="rounded-xl gradient-secondary text-secondary-foreground border-0" onClick={handleApplyCoupon} disabled={applyingCoupon}>
                Apply
              </Button>
            )}
          </div>
          {appliedCoupon && (
            <p className="text-xs text-canteen-veg mt-2 font-medium">✓ Coupon applied! You save ₹{discount}</p>
          )}
        </div>
      </div>

      {/* Price Breakdown - Fixed Bottom */}
      <div className="fixed bottom-16 left-0 right-0 z-40">
        <div className="max-w-2xl mx-auto px-4">
          <div className="glass-strong shadow-glass-lg rounded-2xl p-4">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-canteen-veg">
                  <span>Discount</span>
                  <span>-₹{discount.toFixed(2)}</span>
                </div>
              )}
              {gstEnabled && (
                <div className="flex justify-between text-muted-foreground">
                  <span>GST ({gstRate}%)</span>
                  <span>₹{tax.toFixed(2)}</span>
                </div>
              )}
              {convFeeEnabled && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Convenience Fee</span>
                  <span>₹{convFee.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-border pt-1.5 flex justify-between font-bold text-foreground">
                <span>Grand Total</span>
                <span className="text-primary">₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>
            <Button
              className="w-full mt-3 gradient-primary text-primary-foreground border-0 rounded-xl h-11 font-semibold"
              onClick={() => navigate('/checkout', { state: { subtotal, discount, tax, convFee, grandTotal, couponCode: appliedCoupon?.code } })}
            >
              Proceed to Checkout <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Cart;
