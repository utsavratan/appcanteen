import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Minus, Star, Clock, TrendingUp, Flame, Sun, Moon, Megaphone } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import BottomNav from '@/components/canteen/BottomNav';
import { fetchAvailableMenuItems, fetchCategories, fetchAnnouncements, fetchActiveBanners } from '@/lib/db';
import { useCartStore } from '@/lib/cart-store';
import { useAuth } from '@/hooks/useAuth';
import type { MenuItem, Category, Announcement, Banner } from '@/lib/types';

const CustomerMenu = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [darkMode, setDarkMode] = useState(document.documentElement.classList.contains('dark'));
  const { addItem, items: cartItems, updateQuantity } = useCartStore();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [menuItems, cats, anns, bans] = await Promise.all([
        fetchAvailableMenuItems(),
        fetchCategories(),
        fetchAnnouncements(),
        fetchActiveBanners(),
      ]);
      setItems(menuItems);
      setCategories(cats);
      setAnnouncements(anns);
      setBanners(bans);
    } catch (e) {
      console.error('Failed to load data:', e);
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark');
    setDarkMode(!darkMode);
    localStorage.setItem('theme', !darkMode ? 'dark' : 'light');
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

  const renderItemCard = (item: MenuItem, wide = false) => {
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
        className={`glass-card shadow-glass rounded-2xl overflow-hidden ${isOOS ? 'opacity-60 pointer-events-none' : ''}`}
      >
        <div className={`relative ${wide ? 'aspect-[16/10]' : 'aspect-[4/3]'} bg-muted overflow-hidden`}>
          {item.image_url ? (
            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover transition-transform duration-300 hover:scale-105" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-muted to-muted/50">🍽️</div>
          )}
          <div className="absolute top-2 left-2 flex gap-1">
            <span className={item.item_type === 'veg' || item.item_type === 'beverages' ? 'veg-indicator' : 'nonveg-indicator'} />
          </div>
          {stock && (
            <span className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${stock.color} backdrop-blur-sm`}>
              {stock.label}
            </span>
          )}
          {item.is_trending && (
            <span className="absolute bottom-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/90 text-primary-foreground flex items-center gap-1 backdrop-blur-sm">
              <Flame className="w-3 h-3" /> Trending
            </span>
          )}
        </div>
        <div className="p-3">
          <h3 className="font-bold text-sm text-foreground line-clamp-1">{item.name}</h3>
          {item.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
          )}
          <div className="flex items-center justify-between mt-2">
            <span className="font-extrabold text-foreground text-base">₹{item.price}</span>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {item.preparation_time_mins}m
            </div>
          </div>
          <div className="mt-2.5">
            {isOOS ? (
              <Button disabled size="sm" className="w-full text-xs h-8 rounded-xl">Out of Stock</Button>
            ) : qty === 0 ? (
              <Button
                size="sm"
                className="w-full text-xs h-9 gradient-primary text-primary-foreground border-0 rounded-xl font-bold shadow-glow"
                onClick={() => addItem({ id: item.id, name: item.name, price: item.price, image_url: item.image_url, item_type: item.item_type })}
              >
                <Plus className="w-3 h-3 mr-1" /> Add to Cart
              </Button>
            ) : (
              <div className="flex items-center justify-center gap-3 h-9 glass rounded-xl px-2">
                <Button size="icon" variant="outline" className="h-7 w-7 rounded-lg" onClick={() => updateQuantity(item.id, qty - 1)}>
                  <Minus className="w-3 h-3" />
                </Button>
                <span className="font-extrabold text-sm w-6 text-center text-foreground">{qty}</span>
                <Button size="icon" className="h-7 w-7 rounded-lg gradient-primary text-primary-foreground border-0" onClick={() => updateQuantity(item.id, qty + 1)}>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  const renderMarqueeCard = (item: MenuItem) => {
    const qty = getCartQty(item.id);
    const isOOS = item.stock_quantity <= 0;
    return (
      <div key={item.id} className="w-[265px] flex-shrink-0 glass-card shadow-glass rounded-2xl overflow-hidden">
        <div className="relative h-36 bg-muted overflow-hidden">
          {item.image_url ? (
            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-muted to-muted/50">🍽️</div>
          )}
          <div className="absolute top-2 left-2">
            <span className={item.item_type === 'veg' || item.item_type === 'beverages' ? 'veg-indicator' : 'nonveg-indicator'} />
          </div>
          <span className="absolute bottom-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/90 text-primary-foreground flex items-center gap-1 backdrop-blur-sm">
            <Flame className="w-3 h-3" /> Trending
          </span>
        </div>
        <div className="p-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-foreground line-clamp-1 flex-1">{item.name}</h3>
            <span className="font-extrabold text-primary ml-2">₹{item.price}</span>
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />{item.preparation_time_mins}m
          </div>
          <div className="mt-2">
            {isOOS ? (
              <Button disabled size="sm" className="w-full text-xs h-8 rounded-xl">Sold Out</Button>
            ) : qty === 0 ? (
              <Button size="sm" className="w-full text-xs h-8 gradient-primary text-primary-foreground border-0 rounded-xl font-bold"
                onClick={() => addItem({ id: item.id, name: item.name, price: item.price, image_url: item.image_url, item_type: item.item_type })}>
                <Plus className="w-3 h-3 mr-1" /> Add
              </Button>
            ) : (
              <div className="flex items-center justify-center gap-2 h-8">
                <Button size="icon" variant="outline" className="h-6 w-6 rounded-md" onClick={() => updateQuantity(item.id, qty - 1)}><Minus className="w-3 h-3" /></Button>
                <span className="font-bold text-sm w-5 text-center">{qty}</span>
                <Button size="icon" className="h-6 w-6 rounded-md gradient-primary text-primary-foreground border-0" onClick={() => updateQuantity(item.id, qty + 1)}><Plus className="w-3 h-3" /></Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const marqueeRow = trendingItems.length > 0 ? [...trendingItems, ...trendingItems] : [];

  return (
    <div className="min-h-screen bg-background gradient-mesh pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 glass-strong shadow-glass">
        <div className="max-w-3xl mx-auto px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-2xl font-extrabold text-foreground tracking-tight">🍽️ Canteen</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {profile?.name ? `Hey ${profile.name}! 👋` : 'Fresh food, fast service'}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full glass">
              {darkMode ? <Sun className="w-5 h-5 text-canteen-amber" /> : <Moon className="w-5 h-5" />}
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search dishes, snacks, drinks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-11 rounded-2xl bg-muted/50 border-0 focus-visible:ring-primary text-sm"
            />
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-4">
        {/* Banners */}
        {banners.length > 0 && (
          <div className="mb-4 flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            {banners.map((b) => (
              <div key={b.id} className="min-w-[280px] md:min-w-[350px] rounded-2xl overflow-hidden shadow-glass flex-shrink-0">
                <img src={b.image_url} alt={b.title || 'Banner'} className="w-full h-36 md:h-44 object-cover" />
              </div>
            ))}
          </div>
        )}

        {/* Announcements */}
        {announcements.length > 0 && (
          <div className="mb-4 space-y-2">
            {announcements.slice(0, 2).map((a) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-card rounded-2xl p-3.5 flex items-start gap-3 border-l-4 border-primary"
              >
                <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
                  <Megaphone className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">{a.title}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{a.message}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-3">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
              activeCategory === 'all' ? 'gradient-primary text-primary-foreground shadow-glow' : 'glass text-foreground hover:shadow-glass'
            }`}
          >
            🍴 All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-5 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
                activeCategory === cat.id ? 'gradient-primary text-primary-foreground shadow-glow' : 'glass text-foreground hover:shadow-glass'
              }`}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden glass">
                <Skeleton className="aspect-[4/3]" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-9 w-full rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Trending - Infinite Marquee */}
            {activeCategory === 'all' && trendingItems.length > 0 && !search && (
              <div className="mt-5">
                <h2 className="text-base font-extrabold text-foreground flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-primary-foreground" />
                  </div>
                  Trending Now 🔥
                </h2>
                <div className="overflow-hidden rounded-2xl">
                  <div className="overflow-hidden mb-3">
                    <div className="flex gap-3 w-max animate-marquee-left">
                      {marqueeRow.map((item, i) => (
                        <div key={`r1-${item.id}-${i}`}>{renderMarqueeCard(item)}</div>
                      ))}
                    </div>
                  </div>
                  {trendingItems.length > 1 && (
                    <div className="overflow-hidden">
                      <div className="flex gap-3 w-max animate-marquee-right">
                        {[...marqueeRow].reverse().map((item, i) => (
                          <div key={`r2-${item.id}-${i}`}>{renderMarqueeCard(item)}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Recommended */}
            {activeCategory === 'all' && recommendedItems.length > 0 && !search && (
              <div className="mt-6">
                <h2 className="text-base font-extrabold text-foreground flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg gradient-secondary flex items-center justify-center">
                    <Star className="w-4 h-4 text-secondary-foreground" />
                  </div>
                  Chef's Picks ⭐
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {recommendedItems.map((item) => renderItemCard(item, true))}
                </div>
              </div>
            )}

            {/* All Items Grid */}
            <div className="mt-6">
              <h2 className="text-base font-extrabold text-foreground mb-3">
                {activeCategory === 'all' ? '📋 Full Menu' : `${categories.find((c) => c.id === activeCategory)?.icon || ''} ${categories.find((c) => c.id === activeCategory)?.name || 'Menu'}`}
              </h2>
              <AnimatePresence mode="popLayout">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {filtered.map((item) => renderItemCard(item))}
                </div>
              </AnimatePresence>
              {filtered.length === 0 && (
                <div className="text-center py-16 text-muted-foreground">
                  <p className="text-5xl mb-3">🔍</p>
                  <p className="font-medium">No items found</p>
                  <p className="text-xs mt-1">Try a different search or category</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default CustomerMenu;
