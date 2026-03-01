import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, ChefHat, Shield, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { setRole, STAFF_PASSWORD } from '@/lib/session';
import BottomNav from '@/components/canteen/BottomNav';

const Login = () => {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<'chef' | 'admin' | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = () => {
    if (password === STAFF_PASSWORD) {
      setRole(selectedRole!);
      toast.success(`Logged in as ${selectedRole}`);
      navigate(selectedRole === 'chef' ? '/chef' : '/admin');
    } else {
      toast.error('Incorrect password');
    }
  };

  return (
    <div className="min-h-screen bg-background gradient-mesh flex items-center justify-center px-4 pb-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong shadow-glass-lg rounded-2xl p-6 max-w-sm w-full"
      >
        {!selectedRole ? (
          <>
            <div className="text-center mb-6">
              <Lock className="w-10 h-10 text-primary mx-auto mb-2" />
              <h2 className="text-xl font-bold text-foreground">Staff Login</h2>
              <p className="text-xs text-muted-foreground mt-1">Select your role to continue</p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => setSelectedRole('chef')}
                className="w-full p-4 rounded-xl border-2 border-border hover:border-primary transition-all flex items-center gap-3"
              >
                <div className="w-12 h-12 rounded-xl gradient-secondary flex items-center justify-center">
                  <ChefHat className="w-6 h-6 text-secondary-foreground" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-foreground">Chef</p>
                  <p className="text-xs text-muted-foreground">Kitchen & order management</p>
                </div>
              </button>
              <button
                onClick={() => setSelectedRole('admin')}
                className="w-full p-4 rounded-xl border-2 border-border hover:border-primary transition-all flex items-center gap-3"
              >
                <div className="w-12 h-12 rounded-xl gradient-accent flex items-center justify-center">
                  <Shield className="w-6 h-6 text-accent-foreground" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-foreground">Admin</p>
                  <p className="text-xs text-muted-foreground">Full system control</p>
                </div>
              </button>
            </div>
          </>
        ) : (
          <>
            <button onClick={() => { setSelectedRole(null); setPassword(''); }} className="flex items-center gap-1 text-sm text-muted-foreground mb-4 hover:text-foreground">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <div className="text-center mb-6">
              <div className={`w-14 h-14 rounded-xl mx-auto mb-3 flex items-center justify-center ${selectedRole === 'chef' ? 'gradient-secondary' : 'gradient-accent'}`}>
                {selectedRole === 'chef' ? <ChefHat className="w-7 h-7 text-secondary-foreground" /> : <Shield className="w-7 h-7 text-accent-foreground" />}
              </div>
              <h2 className="text-xl font-bold text-foreground capitalize">{selectedRole} Login</h2>
            </div>
            <div className="space-y-4">
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  className="rounded-xl pr-10 h-11 text-center text-lg tracking-widest"
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Button className="w-full gradient-primary text-primary-foreground border-0 rounded-xl h-11 font-semibold" onClick={handleLogin}>
                Login
              </Button>
            </div>
          </>
        )}
      </motion.div>
      <BottomNav />
    </div>
  );
};

export default Login;
