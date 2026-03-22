import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, Phone, LogOut, Heart, Coins, Wallet, Sun, Moon, Lock, ChefHat, Shield, Settings, Edit2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { setRole, STAFF_PASSWORD } from '@/lib/session';
import BottomNav from '@/components/canteen/BottomNav';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, profile, signOut, updateProfile, loading } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [darkMode, setDarkMode] = useState(document.documentElement.classList.contains('dark'));
  const [showStaffLogin, setShowStaffLogin] = useState(false);
  const [staffRole, setStaffRole] = useState<'chef' | 'admin' | null>(null);
  const [staffPassword, setStaffPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setMobile(profile.mobile || '');
    }
  }, [profile]);

  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark');
    setDarkMode(!darkMode);
    localStorage.setItem('theme', !darkMode ? 'dark' : 'light');
  };

  const handleSaveProfile = async () => {
    await updateProfile({ name, mobile: mobile || null });
    setEditing(false);
    toast.success('Profile updated!');
  };

  const handleStaffLogin = () => {
    if (staffPassword === STAFF_PASSWORD) {
      setRole(staffRole!);
      toast.success(`Logged in as ${staffRole}`);
      navigate(staffRole === 'chef' ? '/chef' : '/admin');
    } else {
      toast.error('Incorrect password');
    }
  };

  const handleLogout = async () => {
    await signOut();
    toast.success('Signed out');
    navigate('/');
  };

  if (!user && !loading) {
    return (
      <div className="min-h-screen bg-background gradient-mesh flex flex-col items-center justify-center pb-24 px-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
          <div className="text-6xl mb-4">👤</div>
          <h2 className="text-xl font-bold text-foreground mb-2">Sign in to view your profile</h2>
          <p className="text-sm text-muted-foreground mb-6">Track orders, earn rewards & more</p>
          <Button className="gradient-primary text-primary-foreground border-0 rounded-xl" onClick={() => navigate('/auth')}>
            Sign In / Sign Up
          </Button>
        </motion.div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background gradient-mesh pb-24">
      <div className="sticky top-0 z-40 glass-strong shadow-glass">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Profile & Settings</h1>
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full glass">
            {darkMode ? <Sun className="w-5 h-5 text-canteen-amber" /> : <Moon className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        {/* Profile Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card shadow-glass rounded-2xl p-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
              <User className="w-8 h-8 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-black text-foreground">{profile?.name || 'User'}</h2>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Mail className="w-3 h-3" /> {user?.email}
              </p>
            </div>
            <Button size="icon" variant="ghost" className="rounded-xl" onClick={() => setEditing(!editing)}>
              <Edit2 className="w-4 h-4" />
            </Button>
          </div>

          {editing && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="space-y-3 pt-3 border-t border-border">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="pl-10 rounded-xl" />
              </div>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="Mobile number" className="pl-10 rounded-xl" type="tel" />
              </div>
              <Button size="sm" className="gradient-primary text-primary-foreground border-0 rounded-xl font-bold" onClick={handleSaveProfile}>
                <Save className="w-4 h-4 mr-1" /> Save Changes
              </Button>
            </motion.div>
          )}
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card shadow-glass rounded-2xl p-4 text-center">
            <Coins className="w-5 h-5 text-canteen-amber mx-auto mb-1" />
            <p className="text-lg font-black text-foreground">{profile?.loyalty_points || 0}</p>
            <p className="text-[10px] text-muted-foreground font-bold">Points</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card shadow-glass rounded-2xl p-4 text-center">
            <Wallet className="w-5 h-5 text-canteen-teal mx-auto mb-1" />
            <p className="text-lg font-black text-foreground">₹{profile?.wallet_balance || 0}</p>
            <p className="text-[10px] text-muted-foreground font-bold">Wallet</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card shadow-glass rounded-2xl p-4 text-center">
            <Heart className="w-5 h-5 text-accent mx-auto mb-1" />
            <p className="text-lg font-black text-foreground">{profile?.favorite_items?.length || 0}</p>
            <p className="text-[10px] text-muted-foreground font-bold">Favorites</p>
          </motion.div>
        </div>

        {/* Settings */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass-card shadow-glass rounded-2xl p-4">
          <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
            <Settings className="w-4 h-4 text-primary" /> Settings
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground font-medium">Dark Mode</span>
              <Switch checked={darkMode} onCheckedChange={toggleTheme} />
            </div>
          </div>
        </motion.div>

        {/* Logout */}
        <Button variant="outline" className="w-full rounded-xl text-destructive font-bold" onClick={handleLogout}>
          <LogOut className="w-4 h-4 mr-2" /> Sign Out
        </Button>
      </div>

      <BottomNav />
    </div>
  );
};

export default ProfilePage;
