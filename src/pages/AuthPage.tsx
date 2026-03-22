import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

const AuthPage = () => {
  const navigate = useNavigate();
  const { signUp, signIn } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) { toast.error('Please fill all fields'); return; }
    if (!isLogin && !name) { toast.error('Please enter your name'); return; }
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) { toast.error(error.message); setLoading(false); return; }
        toast.success('Welcome back!');
      } else {
        const { error } = await signUp(email, password, name);
        if (error) { toast.error(error.message); setLoading(false); return; }
        toast.success('Account created! Welcome!');
      }
      navigate('/menu');
    } catch {
      toast.error('Something went wrong');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background gradient-mesh flex items-center justify-center px-4">
      {/* Decorative */}
      <div className="absolute top-20 left-10 w-40 h-40 rounded-full bg-primary/10 blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-48 h-48 rounded-full bg-secondary/10 blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="glass-strong shadow-glass-lg rounded-3xl p-8 max-w-sm w-full relative overflow-hidden"
      >
        {/* Top accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-secondary to-accent" />

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="text-5xl text-center mb-2"
        >
          🍽️
        </motion.div>

        <h1 className="text-2xl font-black text-foreground text-center">
          {isLogin ? 'Welcome Back' : 'Join Canteen'}
        </h1>
        <p className="text-xs text-muted-foreground text-center mt-1 mb-6">
          {isLogin ? 'Sign in to continue ordering' : 'Create your account to get started'}
        </p>

        <AnimatePresence mode="wait">
          <motion.div
            key={isLogin ? 'login' : 'signup'}
            initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isLogin ? 20 : -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            {!isLogin && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10 h-12 rounded-2xl bg-muted/50 border-0 text-sm"
                />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-12 rounded-2xl bg-muted/50 border-0 text-sm"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                className="pl-10 pr-10 h-12 rounded-2xl bg-muted/50 border-0 text-sm"
              />
              <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>

        <Button
          className="w-full mt-5 gradient-primary text-primary-foreground border-0 rounded-2xl h-12 font-bold text-base shadow-glow"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full" />
          ) : (
            <>{isLogin ? 'Sign In' : 'Create Account'} <ArrowRight className="w-4 h-4 ml-2" /></>
          )}
        </Button>

        <div className="mt-5 text-center">
          <button onClick={() => setIsLogin(!isLogin)} className="text-sm text-muted-foreground hover:text-primary transition-colors">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <span className="font-bold text-primary">{isLogin ? 'Sign Up' : 'Sign In'}</span>
          </button>
        </div>

        <div className="mt-4 pt-4 border-t border-border/50 text-center">
          <button onClick={() => navigate('/menu')} className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors">
            Continue as guest
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthPage;
