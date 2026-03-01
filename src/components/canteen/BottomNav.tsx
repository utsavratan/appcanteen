import { useNavigate, useLocation } from 'react-router-dom';
import { Home, ShoppingCart, ClipboardList, User } from 'lucide-react';
import { useCartStore } from '@/lib/cart-store';
import { motion } from 'framer-motion';

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const itemCount = useCartStore((s) => s.getItemCount());

  const tabs = [
    { path: '/menu', icon: Home, label: 'Menu' },
    { path: '/cart', icon: ShoppingCart, label: 'Cart', badge: itemCount },
    { path: '/history', icon: ClipboardList, label: 'Orders' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 no-print">
      <div className="glass-strong shadow-glass-lg border-t border-border/50 px-2 pb-safe">
        <div className="flex items-center justify-around max-w-lg mx-auto">
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.path;
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className="relative flex flex-col items-center py-2.5 px-4 transition-colors"
              >
                {isActive && (
                  <motion.div
                    layoutId="bottomNavIndicator"
                    className="absolute -top-0.5 w-8 h-1 rounded-full gradient-primary"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <tab.icon
                  className={`w-5 h-5 transition-colors ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`}
                />
                <span
                  className={`text-[10px] mt-1 font-medium ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {tab.label}
                </span>
                {tab.badge ? (
                  <span className="absolute -top-0.5 right-2 w-4 h-4 rounded-full gradient-primary text-[9px] text-primary-foreground flex items-center justify-center font-bold">
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BottomNav;
