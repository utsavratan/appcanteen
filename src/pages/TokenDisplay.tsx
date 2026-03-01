import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { subscribeToOrders, fetchOrders } from '@/lib/db';
import { supabase } from '@/integrations/supabase/client';
import type { Order } from '@/lib/types';

const TokenDisplay = () => {
  const [preparingOrders, setPreparingOrders] = useState<Order[]>([]);
  const [readyOrders, setReadyOrders] = useState<Order[]>([]);

  useEffect(() => {
    loadOrders();
    const channel = subscribeToOrders(() => loadOrders());
    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadOrders = async () => {
    const orders = await fetchOrders();
    setPreparingOrders(orders.filter(o => o.status === 'preparing'));
    setReadyOrders(orders.filter(o => o.status === 'ready'));
  };

  return (
    <div className="min-h-screen bg-background gradient-mesh p-6 flex flex-col">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-foreground">🍽️ Canteen Token Display</h1>
        <p className="text-muted-foreground mt-1">Live order status</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
        {/* Preparing */}
        <div className="glass-strong shadow-glass-lg rounded-2xl p-6">
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            🔥 Preparing
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <AnimatePresence mode="popLayout">
              {preparingOrders.map(order => (
                <motion.div
                  key={order.id}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="gradient-primary text-primary-foreground rounded-xl p-4 text-center shadow-glow"
                >
                  <span className="text-3xl font-extrabold">#{order.token_number}</span>
                </motion.div>
              ))}
            </AnimatePresence>
            {preparingOrders.length === 0 && (
              <p className="text-muted-foreground col-span-3 text-center py-8">No orders preparing</p>
            )}
          </div>
        </div>

        {/* Ready */}
        <div className="glass-strong shadow-glass-lg rounded-2xl p-6">
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            ✅ Ready for Pickup
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <AnimatePresence mode="popLayout">
              {readyOrders.map(order => (
                <motion.div
                  key={order.id}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="gradient-secondary text-secondary-foreground rounded-xl p-4 text-center shadow-glow"
                >
                  <span className="text-3xl font-extrabold">#{order.token_number}</span>
                </motion.div>
              ))}
            </AnimatePresence>
            {readyOrders.length === 0 && (
              <p className="text-muted-foreground col-span-3 text-center py-8">No orders ready</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TokenDisplay;
