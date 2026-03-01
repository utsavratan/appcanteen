import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Minus, Star, Clock, TrendingUp, Flame, Sun, Moon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import BottomNav from '@/components/canteen/BottomNav';
import { fetchAvailableMenuItems, fetchCategories, fetchAnnouncements, getOrCreateCustomer } from '@/lib/db';
import { useCartStore } from '@/lib/cart-store';
import { getSessionId, isOnboarded, setOnboarded, setCustomerId } from '@/lib/session';
import type { MenuItem, Category, Announcement } from '@/lib/types';

const CustomerMenu = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [darkMode, setDarkMode] = useState(document.documentElement.classList.contains('dark'));
  const { addItem, items: cartItems, updateQuantity } = useCartStore();

  useEffect(() => {
    loadData();
    if (!isOnboarded()) setShowOnboarding(true);
  }, []);

  const loadData = async () => {
    try {
      const [menuItems, cats, anns] = await Promise.all([
        fetchAvailableMenuItems(),
        fetchCategories(),
        fetchAnnouncements(),
      ]);
      setItems(menuItems);
      setCategories(cats);
      setAnnouncements(anns);
    } catch (e) {
      console.error('Failed to load data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOnboardingSubmit = async () => {
    const sessionId = getSessionId();
    try {
      const customer = await getOrCreateCustomer(sessionId, name || undefined, mobile || undefined);
      setCustomerId(customer.id);
    } catch (e) {
      console.error(e);
    }
    setOnboarded();
    setShowOnboarding(false);
  };

  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark');
    setDarkMode(!darkMode);
  };

  const filtered = useMemo(() => {
    let result = items;
    if (activeCategory !== 'all') {
      result = result.filter((i) => i.category_id === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.description?.toLowerCase().includes(q) ||
          i.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }
    return result;
  }, [items, activeCategory, search]);

  const trendingItems = useMemo(() => items.filter((i) => i.is_trending), [items]);
  const recommendedItems = useMemo(() => items.filter((i) => i.is_recommended), [items]);

  const getCartQty = (id: string) => cartItems.find((c) => c.id === id)?.quantity || 0;

  const getStockLabel = (item: MenuItem) => {
    if (item.stock_quantity <= 0) return { label: 'Out of Stock', color: 'bg-destructive/20 text-destructive' };
    if (item.stock_quantity <= item.low_stock_threshold) return { label: 'Low Stock', color: 'bg-canteen-amber/20 text-canteen-amber' };
    return null;
  };

  const renderItemCard = (item: MenuItem) => {
    const qty = getCartQty(item.id);
    const stock = getStockLabel(item);
    const isOOS = item.stock_quantity <= 0;

    return (
      <motion.div
        key={item.id}
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`glass shadow-glass rounded-xl overflow-hidden ${isOOS ? 'opacity-60' : ''}`}
      >
        <div className="relative aspect-[4/3] bg-muted overflow-hidden">
          {item.image_url ? (
            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-muted to-muted/50">🍽️</div>
          )}
          <div className="absolute top-2 left-2 flex gap-1">
            <span className={item.item_type === 'veg' || item.item_type === 'beverages' ? 'veg-indicator' : 'nonveg-indicator'} />
          </div>
          {stock && (
            <span className={`absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded-full ${stock.color}`}>
              {stock.label}
            </span>
          )}
          {item.is_trending && (
            <span className="absolute bottom-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/90 text-primary-foreground flex items-center gap-1">
              <Flame className="w-3 h-3" /> Trending
            </span>
          )}
        </div>
        <div className="p-3">
          <h3 className="font-semibold text-sm text-foreground line-clamp-1">{item.name}</h3>
          {item.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
          )}
          <div className="flex items-center justify-between mt-2">
            <span className="font-bold text-foreground">₹{item.price}</span>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {item.preparation_time_mins}m
            </div>
          </div>
          <div className="mt-2">
            {isOOS ? (
              <Button disabled size="sm" className="w-full text-xs h-8">Out of Stock</Button>
            ) : qty === 0 ? (
              <Button
                size="sm"
                className="w-full text-xs h-8 gradient-primary text-primary-foreground border-0"
                onClick={() => addItem({ id: item.id, name: item.name, price: item.price, image_url: item.image_url, item_type: item.item_type })}
              >
                <Plus className="w-3 h-3 mr-1" /> Add
              </Button>
            ) : (
              <div className="flex items-center justify-center gap-3 h-8">
                <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQuantity(item.id, qty - 1)}>
                  <Minus className="w-3 h-3" />
                </Button>
                <span className="font-bold text-sm w-6 text-center">{qty}</span>
                <Button size="icon" className="h-7 w-7 gradient-primary text-primary-foreground border-0" onClick={() => updateQuantity(item.id, qty + 1)}>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-background gradient-mesh pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 glass-strong shadow-glass">
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold text-foreground">Canteen</h1>
              <p className="text-xs text-muted-foreground">What would you like today?</p>
            </div>
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full">
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search menu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 rounded-xl bg-muted/50 border-0 focus-visible:ring-primary"
            />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4">
        {/* Announcements */}
        {announcements.length > 0 && (
          <div className="mb-4 space-y-2">
            {announcements.slice(0, 2).map((a) => (
              <div key={a.id} className="glass rounded-xl p-3 flex items-start gap-2 border-l-4 border-primary">
                <span className="text-lg">📢</span>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">{a.title}</h4>
                  <p className="text-xs text-muted-foreground">{a.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-3">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              activeCategory === 'all' ? 'gradient-primary text-primary-foreground shadow-glow' : 'glass text-foreground'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                activeCategory === cat.id ? 'gradient-primary text-primary-foreground shadow-glow' : 'glass text-foreground'
              }`}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 mt-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-xl overflow-hidden glass">
                <Skeleton className="aspect-[4/3]" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-8 w-full rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Trending */}
            {activeCategory === 'all' && trendingItems.length > 0 && !search && (
              <div className="mt-4">
                <h2 className="text-sm font-bold text-foreground flex items-center gap-1 mb-3">
                  <TrendingUp className="w-4 h-4 text-primary" /> Trending Now
                </h2>
                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                  {trendingItems.map((item) => (
                    <div key={item.id} className="min-w-[160px] max-w-[160px]">{renderItemCard(item)}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended */}
            {activeCategory === 'all' && recommendedItems.length > 0 && !search && (
              <div className="mt-6">
                <h2 className="text-sm font-bold text-foreground flex items-center gap-1 mb-3">
                  <Star className="w-4 h-4 text-canteen-amber" /> Recommended
                </h2>
                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                  {recommendedItems.map((item) => (
                    <div key={item.id} className="min-w-[160px] max-w-[160px]">{renderItemCard(item)}</div>
                  ))}
                </div>
              </div>
            )}

            {/* All Items Grid */}
            <div className="mt-6">
              <h2 className="text-sm font-bold text-foreground mb-3">
                {activeCategory === 'all' ? 'Full Menu' : categories.find((c) => c.id === activeCategory)?.name || 'Menu'}
              </h2>
              <AnimatePresence mode="popLayout">
                <div className="grid grid-cols-2 gap-3">
                  {filtered.map(renderItemCard)}
                </div>
              </AnimatePresence>
              {filtered.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-4xl mb-2">🔍</p>
                  <p className="text-sm">No items found</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Onboarding Dialog */}
      <Dialog open={showOnboarding} onOpenChange={setShowOnboarding}>
        <DialogContent className="glass-strong max-w-sm mx-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">Welcome to Canteen! 🎉</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground text-center">Tell us about yourself (optional)</p>
            <Input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl" />
            <Input placeholder="Mobile number" value={mobile} onChange={(e) => setMobile(e.target.value)} className="rounded-xl" type="tel" />
            <Button className="w-full gradient-primary text-primary-foreground border-0 rounded-xl h-11" onClick={handleOnboardingSubmit}>
              Let's Go! 🚀
            </Button>
            <button onClick={() => { setOnboarded(); setShowOnboarding(false); }} className="w-full text-xs text-muted-foreground underline">
              Skip for now
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default CustomerMenu;
