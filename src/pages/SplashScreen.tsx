import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';

const SplashScreen = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => {
      navigate(user ? '/menu' : '/auth');
    }, 2500);
    return () => clearTimeout(timer);
  }, [navigate, user, loading]);

  return (
    <motion.div
      className="min-h-screen flex flex-col items-center justify-center gradient-primary relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute top-20 left-10 w-32 h-32 rounded-full bg-white/20 blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-40 h-40 rounded-full bg-white/15 blur-3xl animate-float" style={{ animationDelay: '1s' }} />

      <motion.div
        initial={{ scale: 0.3, opacity: 0, rotateY: 180 }}
        animate={{ scale: 1, opacity: 1, rotateY: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="text-7xl mb-4"
        style={{ perspective: 1000 }}
      >
        🍽️
      </motion.div>

      <motion.h1
        className="text-5xl font-extrabold text-primary-foreground tracking-tight"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        Canteen
      </motion.h1>

      <motion.p
        className="text-primary-foreground/80 text-lg mt-2 font-light"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        Fresh food, fast service
      </motion.p>

      <motion.div
        className="mt-12 flex gap-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-primary-foreground/70"
            animate={{ scale: [1, 1.4, 1] }}
            transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
          />
        ))}
      </motion.div>

      <motion.button
        onClick={() => navigate(user ? '/menu' : '/auth')}
        className="absolute bottom-12 text-primary-foreground/60 text-sm underline underline-offset-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
      >
        Tap to skip
      </motion.button>
    </motion.div>
  );
};

export default SplashScreen;
